const mqtt = require('mqtt')

const config = require('../case1config')

const { SERVER_NAME, USERNAME, CLIENT_NAME, PASSWORD, PUB_TOPIC, CLIENT_NAME2, PUB_EVENT_TOPIC2 } = config

const client = mqtt.connect(
  SERVER_NAME,
  {
    username: USERNAME,
    password: PASSWORD,
    clientId: CLIENT_NAME
  }
)

const client2 = mqtt.connect(
  SERVER_NAME,
  {
    username: USERNAME,
    password: PASSWORD,
    clientId: CLIENT_NAME2
  }
)

module.exports = {
  __client: client,
  pub1: content => {
    console.log(`${Date()} mqtt: ${PUB_TOPIC} => ${content}`)
    client.publish(PUB_TOPIC, content)
  },

  __client2: client2,
  pub2: content2 => {
    console.log(`${Date()} mqtt: ${PUB_EVENT_TOPIC2} => ${content2}`)
    client2.publish(PUB_EVENT_TOPIC2, content2)
  }
}
