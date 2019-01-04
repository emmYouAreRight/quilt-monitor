const express = require('express')
const request = require('request') // http请求模块
const fs = require('fs') // 文件系统模块
const path = require('path') // 文件路径模块
const sha1 = require('node-sha1') // 加密模块
const urlencode = require('urlencode') // URL编译模块

const HOSTNAME = '127.0.0.1' // ip或域名
const PORT = 8080 // 端口

/**
 * [设置验证微信接口配置参数]
 */

const CONFIG = require('./config.json')

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

app.listen(PORT, HOSTNAME, function () {
  console.log(`server started on http://${HOSTNAME}:${PORT}`)
})
