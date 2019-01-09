const express = require('express')
const request = require('request') // http请求模块
const fs = require('fs') // 文件系统模块
const path = require('path') // 文件路径模块
const sha1 = require('node-sha1') // 加密模块
const urlencode = require('urlencode') // URL编译模块
const https = require('https')
const xml2json = require('xml2json')

const mqttClient = require('./lib/mqtt')
const cache = require('./lib/cache')
const quilt = require('./lib/quilt')
const wx = require('./lib/wx')

const HOSTNAME = '0.0.0.0' // ip或域名
const PORT = 5050 // 端口

/**
 * [设置验证微信接口配置参数]
 */
const CONFIG = require('./config.json')
const QUILT_DATA = {
  light: [],
  humi: [],
  temp: [],
  pm25: [],
  distance: []
}
const QUILT_INFO = {
  curr: ''
}
const QUILT_STATUS = {
  isOn: true
}

const app = express()

/**
 * [开启跨域便于接口访问]
 */
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*') // 访问控制允许来源：所有
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  ) // 访问控制允许报头 X-Requested-With: xhr请求
  res.header('Access-Control-Allow-Metheds', 'PUT, POST, GET, DELETE, OPTIONS') // 访问控制允许方法
  res.header('X-Powered-By', 'nodejs') // 自定义头信息，表示服务端用nodejs
  res.header('Content-Type', 'application/json;charset=utf-8')
  next()
})

/**
 * [验证微信接口配置信息]
 */
app.get('/', function (req, res) {
  const token = CONFIG.token // 获取配置的token
  const signature = req.query.signature // 获取微信发送请求参数signature
  const nonce = req.query.nonce // 获取微信发送请求参数nonce
  const timestamp = req.query.timestamp // 获取微信发送请求参数timestamp

  const str = [token, timestamp, nonce].sort().join('') // 排序token、timestamp、nonce后转换为组合字符串
  const sha = sha1(str) // 加密组合字符串

  // 如果加密组合结果等于微信的请求参数signature，验证通过
  if (sha === signature) {
    const echostr = req.query.echostr // 获取微信请求参数echostr
    res.send(echostr + '') // 正常返回请求参数echostr
  } else {
    res.send('验证失败')
  }
})

app.post('/', function (req, res) {
  req.rawBody = '' // 添加接收变量
  req.setEncoding('utf8')
  req.on('data', function (chunk) {
    req.rawBody += chunk
  })
  req.on('end', function () {
    let wxEventData = JSON.parse(xml2json.toJson(req.rawBody)).xml
    // 开始公众号逻辑
    let {
      ToUserName,
      FromUserName,
      CreateTime,
      MsgType,
      Event,
      EventKey
    } = wxEventData
    let content = ''
    let text = ''
    // 菜单点击事件
    if (MsgType === 'event') {
      if (Event === 'CLICK') {
        if (EventKey === 'get_info') {
          let { light, humi, pm25, distance, temp } = QUILT_DATA
          light = quilt.getLight(light)
          humi = quilt.getHumi(humi)
          pm25 = quilt.getPm25(pm25)
          distance = quilt.getDistance(distance)
          temp = quilt.getTemp(temp)

          let info = quilt.getInfo(QUILT_DATA)

          if (QUILT_STATUS.isOn) {
            let hasData = false
            for (let key in QUILT_DATA) {
              hasData = hasData || QUILT_DATA[key].length > 0
            }

            text = hasData
              ? `当前被子环境\n---------\n温度：${temp} °C\n湿度：${humi} %\n光照：${light} lux\nPM2.5：${pm25} μg/m3\n\n离杆距离：${distance} cm\n\nTips\n---------\n${info ||
                  '您的被子一切正常'}`
              : '数据正在采集中...'
          } else {
            text = '被子检测尚未开启，暂无数据'
          }
        } else if (EventKey === 'turn_on') {
          QUILT_STATUS.isOn = true
          console.log(`Event: 开闭消息 开启被子检测`)
          text = '被子监测已开启'
        } else if (EventKey === 'turn_off') {
          QUILT_STATUS.isOn = false
          text = '被子检测已关闭'
          console.log(`Event: 开闭消息 关闭被子检测`)
          for (let key in QUILT_DATA) {
            QUILT_DATA[key] = []
          }
          console.log(`Event: 开闭消息 QUILT_DATA已重置`)
          const content = JSON.stringify({
            LIGHT: 0,
            TEMP: 0,
            HUMI: 0,
            DISTANCE: 0,
            PM25: 0
          })
          console.log(`Event: 开闭消息 推送MQTT消息`)
          mqttClient.pub(content)
        }
      }
    } else {
      text = xml2json.toJson(req.rawBody)
    }
    content = `<xml><ToUserName><![CDATA[${FromUserName}]]></ToUserName><FromUserName><![CDATA[${ToUserName}]]></FromUserName><CreateTime>${CreateTime}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${text}]]></Content></xml>`
    res.send(content)
  })
})

/**
 * [获取开发板上传的信息并切换成MQTT协议转发到OneLink]
 */
app.get('/upload', function (req, res) {
  const queryObj = req.query
  const content = JSON.stringify({
    LIGHT: Number(queryObj.light),
    TEMP: Number(queryObj.temp),
    HUMI: Number(queryObj.humi),
    DISTANCE: Number(queryObj.RangeInCentimeters),
    PM25: Number(queryObj.pm25)
  })
  if (!QUILT_STATUS.isOn) {
    return res.send('closed')
  }
  res.send(content)
  mqttClient.pub(content)

  // 保存数据
  queryObj.light && QUILT_DATA['light'].unshift(queryObj.light)
  queryObj.temp && QUILT_DATA['temp'].unshift(queryObj.temp)
  queryObj.humi && QUILT_DATA['humi'].unshift(queryObj.humi)
  queryObj.RangeInCentimeters &&
    QUILT_DATA['distance'].unshift(queryObj.RangeInCentimeters)
  queryObj.pm25 && QUILT_DATA['pm25'].unshift(queryObj.pm25)
  QUILT_DATA['light'].length = CONFIG.QUILT_DATA_LENGTH
  QUILT_DATA['temp'].length = CONFIG.QUILT_DATA_LENGTH
  QUILT_DATA['humi'].length = CONFIG.QUILT_DATA_LENGTH
  QUILT_DATA['distance'].length = CONFIG.QUILT_DATA_LENGTH
  QUILT_DATA['pm25'].length = CONFIG.QUILT_DATA_LENGTH

  // 检测数据
  let info = quilt.getInfo(QUILT_DATA)
  // info信息不为空，且info信息与上次不一致时推送消息，且info信息不是curr的子集
  if (info !== '' && QUILT_INFO.curr.indexOf(info) === -1) {
    console.log(`Event: 推送消息 ${info}`)
    QUILT_INFO.curr = info
    let callback = function (accessToken) {
      let { light, humi, pm25, distance, temp } = QUILT_DATA
      light = quilt.getLight(light)
      humi = quilt.getHumi(humi)
      pm25 = quilt.getPm25(pm25)
      distance = quilt.getDistance(distance)
      temp = quilt.getTemp(temp)
      wx.sendTemplateMessageToAll(
        {
          light,
          humi,
          pm25,
          distance,
          temp,
          info
        },
        accessToken,
        function (data) {}
      )
    }
    if (cache.isExpired('access_token')) {
      wx.getAccessToken(CONFIG.appid, CONFIG.secret, function (data) {
        cache.set('access_token', data['access_token'], data['expires_in'])
        let accessToken = cache.get('access_token')
        callback(accessToken)
      })
    } else {
      let accessToken = cache.get('access_token')
      callback(accessToken)
    }
  }
})

/**
 * [Debug:获取缓存的开发板上传的信息]
 */
app.get('/debug/getQuiltData', function (req, res) {
  res.send(QUILT_DATA)
})

/**
 * [Wexin:获取accessToken]
 */
app.get('/wx/getAccessToken', function (req, res) {
  if (cache.isExpired('access_token')) {
    // http 获取access token
    wx.getAccessToken(CONFIG.appid, CONFIG.secret, function (data) {
      cache.set('access_token', data['access_token'], data['expires_in'])
      res.send(data['access_token'])
    })
  } else {
    res.send(cache.get('access_token'))
  }
})

/**
 * [Wexin:获取关注用户列表]
 */
app.get('/wx/getUserList', function (req, res) {
  if (cache.isExpired('access_token')) {
    wx.getAccessToken(CONFIG.appid, CONFIG.secret, function (data) {
      cache.set('access_token', data['access_token'], data['expires_in'])
      let accessToken = cache.get('access_token')
      wx.getUserList(accessToken, function (data) {
        res.send(data)
      })
    })
  } else {
    let accessToken = cache.get('access_token')
    wx.getUserList(accessToken, function (data) {
      res.send(data)
    })
  }
})

app.get('/wx/sendTemplateMessage', function (req, res) {
  let callback = function (accessToken) {
    let { light, humi, pm25, distance, temp } = QUILT_DATA
    light = quilt.getLight(light)
    humi = quilt.getHumi(humi)
    pm25 = quilt.getPm25(pm25)
    distance = quilt.getDistance(distance)
    temp = quilt.getTemp(temp)
    wx.sendTemplateMessage(
      'oIoLUjqyFlBI8dk8vE9Bh0TRGs_Y',
      {
        light,
        humi,
        pm25,
        distance,
        temp,
        info: 'test'
      },
      accessToken,
      function (data) {
        res.send(data)
      }
    )
  }
  if (cache.isExpired('access_token')) {
    wx.getAccessToken(CONFIG.appid, CONFIG.secret, function (data) {
      cache.set('access_token', data['access_token'], data['expires_in'])
      let accessToken = cache.get('access_token')
      callback(accessToken)
    })
  } else {
    let accessToken = cache.get('access_token')
    callback(accessToken)
  }
})

app.get('/wx/sendTemplateMessageToAll', function (req, res) {
  let callback = function (accessToken) {
    let { light, humi, pm25, distance, temp } = QUILT_DATA
    light = quilt.getLight(light)
    humi = quilt.getHumi(humi)
    pm25 = quilt.getPm25(pm25)
    distance = quilt.getDistance(distance)
    temp = quilt.getTemp(temp)
    wx.sendTemplateMessageToAll(
      {
        light,
        humi,
        pm25,
        distance,
        temp,
        info: Date()
      },
      accessToken,
      function (data) {}
    )
    res.send('ok')
  }
  if (cache.isExpired('access_token')) {
    wx.getAccessToken(CONFIG.appid, CONFIG.secret, function (data) {
      cache.set('access_token', data['access_token'], data['expires_in'])
      let accessToken = cache.get('access_token')
      callback(accessToken)
    })
  } else {
    let accessToken = cache.get('access_token')
    callback(accessToken)
  }
})

app.get('/wx/updateMenu', function (req, res) {
  let callback = function (accessToken) {
    wx.updateMenu(data, accessToken, function (data) {
      res.send(data)
    })
  }

  let data = {
    button: [
      {
        type: 'view',
        name: 'IoT Home',
        url: 'http://ol.tinylink.cn/'
      },
      {
        name: '操作',
        sub_button: [
          {
            type: 'click',
            name: '获取信息',
            key: 'get_info'
          },
          {
            type: 'click',
            name: '开启',
            key: 'turn_on'
          },
          {
            type: 'click',
            name: '关闭',
            key: 'turn_off'
          }
        ]
      }
    ]
  }

  if (cache.isExpired('access_token')) {
    wx.getAccessToken(CONFIG.appid, CONFIG.secret, function (data) {
      cache.set('access_token', data['access_token'], data['expires_in'])
      let accessToken = cache.get('access_token')
      callback(accessToken)
    })
  } else {
    let accessToken = cache.get('access_token')
    callback(accessToken)
  }
})

app.listen(PORT, HOSTNAME, function () {
  console.log(`server started on http://${HOSTNAME}:${PORT}`)
})
