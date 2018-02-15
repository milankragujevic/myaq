const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql')
const querybuilder = require('node-querybuilder')
const defaults = require('defaults')
const bodyParser = require('body-parser')

/// TODO: Implement authentication using `passport`

const TABLE_TYPES = 'types'
const TABLE_JOBS = 'jobs'
const DEBUG = true

const configFile = path.join(__dirname, 'config.json')

if(!fs.existsSync(configFile)) {
  console.error('Please create config.json (from config.template.json) and restart the app!')
  process.exit(0)
}

const config = JSON.parse(fs.readFileSync(configFile))
const qb = querybuilder.QueryBuilder({
  host: config.server,
  user: config.username,
  password: config.password,
  database: config.database
}, 'mysql', 'single')

const error = (res, message, code = 'undefined', errorDetails = 'undefined') => {
  let data = {
    status: false,
    error: message
  }
  if(code != 'undefined') {
    data['errorCode'] = code.toString()
  }
  if(DEBUG) {
    data['details'] = errorDetails
    data['debug'] = 1
  }
  res.status(500).json(data).end()
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())

app.use(express.static(path.join(__dirname, 'layout')))

app.get('/api/v1', (req, res, next) => {
  res.json({
    name: 'MYAQ API',
    version: 'v1'
  })
})

app.get('/api/v1/job-types', (req, res) => {
  qb.get(TABLE_TYPES, (err, qbRes) => {
    if (err) {
      if(DEBUG) { console.error(err) }
      return error(res, 'Database error occurred!', 10006, err)
    }
    let results = []
    for(let i in qbRes) {
      let item = qbRes[i]
      item.fields = JSON.parse(item.fields)
      results.push(item)
    }
    res.json({
      success: true,
      results: results
    })
  })
})

app.get('/api/v1/job-types/:typeId', (req, res) => {
  qb.where({id: req.params.typeId}).get(TABLE_TYPES, (err, qbRes) => {
    if (err) {
      if(DEBUG) { console.error(err) }
      return error(res, 'Database error occurred!', 10008)
    }
    if(qbRes.length < 1) {
      return error(res, 'Item not found!', 10009)
    }
    let item = qbRes[0]
    item.fields = JSON.parse(item.fields)
    res.json({
      success: true,
      result: item
    })
  })
})

app.delete('/api/v1/job-types/:typeId', (req, res) => {
  qb.delete(TABLE_TYPES, { id: req.params.typeId }, (err, qbRes) => {
    if (err) {
      if(DEBUG) { console.error(err) }
      return error(res, 'Database error occurred!', 10007, err)
    }
    qb.where({id: req.params.typeId}).get(TABLE_TYPES, (err, qbRes) => {
      if (err) {
        if(DEBUG) { console.error(err) }
        return error(res, 'Database error occurred!', 10016)
      }
      res.json({
        success: true
      })
    })
  })
})

app.post('/api/v1/job-types/create', (req, res) => {
  let params = req.body
  if(typeof params.name === 'undefined') {
    return error(res, `Name can't be undefined!`, 10001)
  }
  if(typeof params.fields === 'undefined') {
    return error(res, `Fields can't be undefined!`, 10002)
  }
  if(params.name.length < 1) {
    return error(res, `Name can't be empty!`, 10003)
  }
  if(params.fields.length < 1) {
    return error(res, `Fields can't be empty!`, 10004)
  }
  let name = params.name
  let fields = params.fields.split(',')
  let fields_json = JSON.stringify(fields)
  qb.insert(TABLE_TYPES, {name: name, fields: fields_json}, (err, qbRes) => {
      if (err) {
        if(DEBUG) { console.error(err) }
        return error(res, 'Database error occurred!', 10005, err)
      }
      res.send({
        success: true,
        id: qbRes.insertId
      })
  })
})

app.post('/api/v1/job-types/:typeId', (req, res) => {
  let id = req.params.typeId
  let params = req.body
  delete params['id']
  if(params.fields && params.fields.length > 0) {
    let fields = params.fields.split(',')
    let fields_json = JSON.stringify(fields)
    params.fields = fields_json
  }
  qb.set(params).update(TABLE_TYPES, {id: id}, (err, qbRes) => {
      if (err) {
        if(DEBUG) { console.error(err) }
        return error(res, 'Database error occurred!', 10029, err)
      }
      res.send({
        success: true
      })
  })
})

app.post('/api/v1/jobs/create', (req, res) => {
  let params = req.body
  if(typeof params.type === 'undefined') {
    return error(res, `Type can't be undefined!`, 10019)
  }
  if(typeof params.data === 'undefined') {
    return error(res, `Data can't be undefined!`, 10020)
  }
  if(params.type.length < 1) {
    return error(res, `Type can't be empty!`, 10021)
  }
  if(params.data.length < 1) {
    return error(res, `Data can't be empty!`, 10022)
  }
  let type = params.type
  let data = JSON.parse(params.data)
  qb.where({id: type}).get(TABLE_TYPES, (err, qbRes) => {
    if (err) {
      if(DEBUG) { console.error(err) }
      return error(res, 'Database error occurred!', 10010)
    }
    if(qbRes.length < 1) {
      return error(res, 'Type not found!', 10011)
    }
    let item = qbRes[0]
    item.fields = JSON.parse(item.fields)
    let stop = false
    item.fields.forEach((key) => {
      if(stop) { return }
      if(typeof data[key] === 'undefined') {
        stop = true
        return error(res, `Missing required parameter ${key}`, 10012)
      }
    })
    qb.insert(TABLE_JOBS, {type: type, data: JSON.stringify(data), state: JSON.stringify({}), status: (params.paused ? 'PAUSED' : 'WAITING')}, (err, qbRes) => {
      if (err) {
        if(DEBUG) { console.error(err) }
        return error(res, 'Database error occurred!', 10013, err)
      }
      res.send({
        success: true,
        id: qbRes.insertId
      })
    })
  })
})

app.get('/api/v1/jobs', (req, res) => {
  let whereQuery = {}
  if(req.query.status && req.query.status.length > 0) {
    whereQuery['status'] = req.query.status
  }
  const resultFunction = (err, qbRes) => {
    if (err) {
      if(DEBUG) { console.error(err) }
      return error(res, 'Database error occurred!', 10006, err)
    }
    let results = []
    for(let i in qbRes) {
      let item = qbRes[i]
      if(item.data && item.data.substring(0, 1) == '{') { 
        item.data = JSON.parse(item.data)
      }
      if(item.state && item.state.substring(0, 1) == '{') { 
        item.state = JSON.parse(item.state)
      }
      results.push(item)
    }
    res.json({
      success: true,
      results: results
    })
  }
  if(Object.keys(whereQuery).length > 0) {
    qb.where(whereQuery).get(TABLE_JOBS, resultFunction)
  } else {
    qb.get(TABLE_JOBS, resultFunction)
  }
})

app.get('/api/v1/jobs/:jobId', (req, res) => {
  qb.where({id: req.params.jobId}).get(TABLE_JOBS, (err, qbRes) => {
    if (err) {
      if(DEBUG) { console.error(err) }
      return error(res, 'Database error occurred!', 10014)
    }
    if(qbRes.length < 1) {
      return error(res, 'Item not found!', 10015)
    }
    let item = qbRes[0]
    if(item.data && item.data.substring(0, 1) == '{') { 
      item.data = JSON.parse(item.data)
    }
    if(item.state && item.state.substring(0, 1) == '{') { 
      item.state = JSON.parse(item.state)
    }
    res.json({
      success: true,
      result: item
    })
  })
})

app.delete('/api/v1/jobs/:jobId', (req, res) => {
  qb.delete(TABLE_JOBS, { id: req.params.jobId }, (err, qbRes) => {
    if (err) {
      if(DEBUG) { console.error(err) }
      return error(res, 'Database error occurred!', 10018, err)
    }
    res.json({
      success: true
    })
  })
})

app.post('/api/v1/jobs/:jobId', (req, res) => {
  let id = req.params.jobId
  let params = req.body
  delete params['id']
  if(params.fields && params.fields.length > 0) {
    let fields = params.fields.split(',')
    let fields_json = JSON.stringify(fields)
    params.fields = fields_json
  }
  qb.set(params).update(TABLE_JOBS, {id: id}, (err, qbRes) => {
      if (err) {
        if(DEBUG) { console.error(err) }
        return error(res, 'Database error occurred!', 10026, err)
      }
      res.send({
        success: true
      })
  })
})

if(DEBUG) { console.warn('DEBUG is active!') }

app.listen(3000, () => console.log('Example app listening on port 3000!'))