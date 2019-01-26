const express = require('express')
const case1MqttClient = require('./lib/case1mqtt')

const app = express()

const HOSTNAME = '0.0.0.0' // ip或域名
const PORT = 8888 // 端口

/**
 * [实验一__获取开发板上传的信息并切换成MQTT协议转发到OneLink]
 */
app.get('/case1upload', function (req, res) {
  const queryObj = req.query
  const content = JSON.stringify({
    LIGHT: Number(queryObj.light)
  })

  res.send(content)
  case1MqttClient.pub1(content)
})

app.get('/case1uploadSD', function (req, res) {
  const queryObj = req.query
  const content2 = JSON.stringify({
    Ev: queryObj.ev
  })

  res.send(content2)
  case1MqttClient.pub2(content2)
})


app.listen(PORT, HOSTNAME, function () {
  console.log(`server started on http://${HOSTNAME}:${PORT}`)
})