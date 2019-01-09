const https = require('https')

function _post (hostname, path, postData, callback) {
  const body = JSON.stringify(postData)

  const options = {
    hostname,
    path,
    port: 443,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }

  const req = https.request(options, res => {
    let data = ''
    res.setEncoding('utf8')
    res.on('data', chunk => {
      data += chunk
    })
    res.on('end', () => {
      callback(data)
    })
  })

  req.write(body)
  req.end()
}

module.exports = {
  getUserList: function (accessToken, callback) {
    https.get(
      `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}`,
      response => {
        let data = ''
        response.setEncoding('utf8')
        response.on('data', chunk => (data += chunk))
        response.on('end', () => {
          callback(JSON.parse(data).data.openid)
        })
      }
    )
  },
  getAccessToken: function (appid, secret, callback) {
    https.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`,
      response => {
        let data = ''
        response.setEncoding('utf8')
        response.on('data', chunk => (data += chunk))
        response.on('end', () => {
          callback(JSON.parse(data))
          //   cache.set('access_token', obj['access_token'], obj['expires_in'])
          //   res.send(obj['access_token'])
        })
      }
    )
  },
  sendTemplateMessage: function (openid, data, accessToken, callback) {
    const body = JSON.stringify({
      touser: openid,
      template_id: 'D_4uE0bHln_IKx1UMGmkHj2LrpGlBU99XLju05jOrgE',
      data: {
        info: {
          value: data.info,
          color: '#173177'
        },
        temp: {
          value: data.temp,
          color: '#173177'
        },
        humi: {
          value: data.humi,
          color: '#173177'
        },
        light: {
          value: data.light,
          color: '#173177'
        },
        pm25: {
          value: data.pm25,
          color: '#173177'
        },
        distance: {
          value: data.distance,
          color: '#173177'
        }
      }
    })

    const options = {
      hostname: 'api.weixin.qq.com',
      path: `/cgi-bin/message/template/send?access_token=${accessToken}`,
      port: 443,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }

    const req = https.request(options, res => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => {
        data += chunk
      })
      res.on('end', () => {
        callback(data)
      })
    })

    req.write(body)
    req.end()
  },
  sendTemplateMessageToAll: function (data, accessToken, callback) {
    let sendTemplateMessage = this.sendTemplateMessage.bind(this)
    this.getUserList(accessToken, function (userList) {
      userList.forEach(user => {
        let openid = user
        sendTemplateMessage(openid, data, accessToken, data => {})
      })
    })
  },
  updateMenu: function (data, accessToken, callback) {
    _post(
      'api.weixin.qq.com',
      `/cgi-bin/menu/create?access_token=${accessToken}`,
      data,
      callback
    )
  }
}
