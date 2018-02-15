feather.replace()

let root = null;
let useHash = true; // Defaults to: false
let hash = '#!'; // Defaults to: '#'
let router = new Navigo(root, useHash, hash);

jQuery.each( [ "put", "delete" ], function( i, method ) {
  jQuery[ method ] = function( url, data, callback, type ) {
    if ( jQuery.isFunction( data ) ) {
      type = type || callback
      callback = data
      data = undefined
    }

    return jQuery.ajax({
      url: url,
      type: method,
      dataType: type,
      data: data,
      success: callback
    })
  }
})

const view = (template, data, target, callback = false) => {
  $.get('/templates/' + template + '.html', (template) => {
    let output = Mustache.render(template, data);
    $(target).html(output)
    feather.replace()
    if(callback) {
      callback(true)
    }
  }).fail(() => { if(callback) { callback(false) } })
}

const loading = () => $('main').html('Loading data...')

const notFound = () => {
  $('.link--generic-menu.active').removeClass('active')
  view('not-found', {}, 'main')
}

router.on(() => {
  window.location.href = '#!jobs/all'
})

router.on('jobs/create', (params, query) => {
  loading()
  $('.link--generic-menu.active').removeClass('active')
  $('#link--create-job').addClass('active')
  $.get('/api/v1/job-types', (data) => {
    view('choose-type', {types: data.results}, 'main', () => {
      $('#nextButton--choose-type').click(() => {
        let typeId = $('#jobType--choose-type').val()
        window.location.href = '#!/jobs/create/' + encodeURIComponent(typeId)
      })
    })
  })
})

router.on('jobs/delete/:id', (params, query) => {
  loading()
  let id = params.id
  $('.link--generic-menu.active').removeClass('active')
  $.delete('/api/v1/jobs/' + encodeURIComponent(id), (response) => {
    if(response.success) {
      window.location.href = '#!jobs/all'
    }
  })
})

router.on('jobs/create/:type', (params, query) => {
  loading()
  let type = params.type
  $('.link--generic-menu.active').removeClass('active')
  $('#link--create-job').addClass('active')
  $.get('/api/v1/job-types', (data) => {
    let jobType = {}
    data.results.forEach((_type) => {
      if(_type.id == type) {
        jobType = _type
      }
    })
    if(jobType === {}) {
      return notFound()
    }
    console.log(jobType)
    view('create-job', {type: jobType}, 'main', () => {
      $('#button--create-job').click(() => {
        let data = {}
        $('.fields--create-job').each(function() {
          let key = $(this).attr('data-key')
          let value = $(this).val()
          data[key] = value
        })
        console.log(data)
        $.post('/api/v1/jobs/create', { type: type, data: JSON.stringify(data) }, (response) => {
          if(response.success) {
            window.location.href = '#!jobs/all'
          }
        })
      })
    })
  })
})

router.on('jobs/:filter', (params, query) => {
  loading()
  let filter = params.filter
  let statusFilter = ''
  let pageTitle = 'Jobs'
  if(filter == 'all') {
    statusFilter = ''
    pageTitle = 'All jobs'
  }
  if(filter == 'running') {
    statusFilter = 'RUNNING'
    pageTitle = 'Running jobs'
  }
  if(filter == 'failed') {
    statusFilter = 'FAILED'
    pageTitle = 'Failed jobs'
  }
  if(filter == 'waiting') {
    statusFilter = 'WAITING'
    pageTitle = 'Waiting jobs'
  }
  if(filter == 'finished') {
    statusFilter = 'FINISHED'
    pageTitle = 'Finished jobs'
  }
  $('.link--generic-menu.active').removeClass('active')
  $('#link--' + filter + '-jobs').addClass('active')
  $.get('/api/v1/jobs?status=' + statusFilter, (data) => {
    if(data.success) {
      let results = data.results
      results.forEach((result, i) => {
        results[i]['data_json'] = JSON.stringify(result.data)
      })
      view('list-jobs', {results: results, title: pageTitle}, 'main')
    }
  })
})

router.on('job-types', (params, query) => {
  loading()
  $('.link--generic-menu.active').removeClass('active')
  $('#link--job-types').addClass('active')
  $.get('/api/v1/job-types', (data) => {
    if(data.success) {
      let results = data.results
      results.forEach((result, i) => {
        results[i]['fields_json'] = JSON.stringify(result.fields)
      })
      view('list-job-types', {results: results}, 'main')
    }
  })
})

router.on('job-types/create', (params, query) => {
  loading()
  $('.link--generic-menu.active').removeClass('active')
  $('#link--create-job-type').addClass('active')
  view('create-job-type', {}, 'main', () => {
    $('#button--create-job-type').click(() => {
      let name = $('#create-job-type--name').val()
      let fields = $('#create-job-type--fields').val()
      fields = fields.replace(/\s+?/g, '')
      $.post('/api/v1/job-types/create', { name: name, fields: fields }, (response) => {
        if(response.success) {
          window.location.href = '#!job-types'
        }
      })
    })
  })
})

router.on('job-types/delete/:id', (params, query) => {
  loading()
  let id = params.id
  $('.link--generic-menu.active').removeClass('active')
  $.delete('/api/v1/job-types/' + encodeURIComponent(id), (response) => {
    if(response.success) {
      window.location.href = '#!job-types'
    }
  })
})

router.on('users', (params, query) => {
  loading()
  $('.link--generic-menu.active').removeClass('active')
  $('#link--users').addClass('active')
  $.get('/api/v1/users', (data) => {
    if(data.success) {
      let results = data.results
      results.forEach((result, i) => {
        results[i]['write_permission_bool'] = result.write_permission ? 'Yes' : 'No'
      })
      view('list-users', {results: results}, 'main')
    }
  })
})

router.on('users/create', (params, query) => {
  loading()
  $('.link--generic-menu.active').removeClass('active')
  $('#link--create-user').addClass('active')
  view('create-user', {}, 'main', () => {
    $('#button--create-user').click(() => {
      let username = $('#create-user--username').val()
      let password = $('#create-user--password').val()
      let write_permission = $('#create-user--write_permission').is(':checked')
      let write_permission_bool = write_permission ? '1' : '0'
      $.post('/api/v1/users/create', { username: username, password: password, write_permission: write_permission_bool }, (response) => {
        if(response.success) {
          window.location.href = '#!users'
        }
      })
    })
  })
})

router.on('users/edit/:id', (params, query) => {
  loading()
  let id = params.id
  $.get('/api/v1/users/' + encodeURIComponent(id), (response) => {
    if(response.success) {
      $('.link--generic-menu.active').removeClass('active')
      view('update-user', {}, 'main', () => {
        $('#update-user--username').val(response.result.username)
        if(response.result.write_permission === '1') {
          $('#update-user--write_permission').attr('checked', '1')
        } else {
          $('#update-user--write_permission').removeAttr('checked')
        }
        $('#button--update-user').click(() => {
          let username = $('#update-user--username').val()
          let password = $('#update-user--password').val()
          let write_permission = $('#update-user--write_permission').is(':checked')
          let write_permission_bool = write_permission ? '1' : '0'
          $.post('/api/v1/users/' + id, { username: username, password: password, write_permission: write_permission_bool }, (response) => {
            if(response.success) {
              window.location.href = '#!users'
            }
          })
        })
      })
    }
  })
})

router.on('users/delete/:id', (params, query) => {
  loading()
  let id = params.id
  $('.link--generic-menu.active').removeClass('active')
  $.delete('/api/v1/users/' + encodeURIComponent(id), (response) => {
    if(response.success) {
      window.location.href = '#!users'
    }
  })
})

router.notFound((query) => {
  notFound()
})

router.resolve()