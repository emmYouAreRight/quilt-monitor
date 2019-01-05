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
    // 点击自定义菜单 -> 获取信息
    if (MsgType === 'event' && Event === 'click' && EventKey === 'get_info') {
      let text = JSON.stringify(QUILT_DATA)
      content = `<xml><ToUserName><![CDATA[${FromUserName}]]></ToUserName><FromUserName><![CDATA[${ToUserName}]]></FromUserName><CreateTime>${CreateTime}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${text}]]></Content></xml>`
    }
    res.send(req.rawBody)
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
    https.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${
        CONFIG.appid
      }&secret=${CONFIG.secret}`,
      response => {
        let data = ''
        response.setEncoding('utf8')
        response.on('data', chunk => (data += chunk))
        response.on('end', () => {
          let obj = JSON.parse(data)
          cache.set('access_token', obj['access_token'], obj['expires_in'])
          res.send(obj['access_token'])
        })
      }
    )
  } else {
    res.send(cache.get('access_token'))
  }
})

app.listen(PORT, HOSTNAME, function () {
  console.log(`server started on http://${HOSTNAME}:${PORT}`)
})
