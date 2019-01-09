const mqttClient = require('../lib/mqtt')

mqttClient.pub(
  JSON.stringify({
    LISTENFLAG: 0
  })
)
