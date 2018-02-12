const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql')

const configFile = path.join(__dirname, 'config.json')

if(!fs.existsSync(configFile)) {
  console.error('Please create config.json (from config.template.json) and restart the app!')
  process.exit(0)
}

let config = JSON.parse(fs.readFileSync(configFile))
var connection = mysql.createConnection({
  host: config.server,
  user: config.username,
  password: config.password,
  database: config.database
})

connection.connect()

app.get('/', (req, res) => {
  
})

app.listen(3000, () => console.log('Example app listening on port 3000!'))