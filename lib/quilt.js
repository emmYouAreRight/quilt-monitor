module.exports = {
  getInfo: function (data) {
    var avalight = this.getLight(data.light)
    var avahumi = this.getHumi(data.humi)
    var avapm25 = this.getPm25(data.pm25)
    var avadis = this.getDistance(data.distance)
    var disVariance = this.getDisVariance(data.distance)
    var message = new Array()
    var i = 0

    if (avalight < 1000) {
      // 应该为10^3
      message[i] = '现在的光照值小于晒被子所适宜的光照度，建议您尽快收被子'
      i++
    }

    if (avahumi > 50) {
      // 应该为60
      message[i] = '现在的湿度过大，易使被子超时，建议您尽快收被子'
      i++
    }

    if (avapm25 > 100 && avapm25 < 200) {
      message[i] = '现在空气轻度或中度污染，建议您收被子'
      i++
    } else if (avapm25 > 200) {
      message[i] = '现在空气处于重度或严重污染，为了您的健康，请务必收被子'
      i++
    }

    if (avadis > 200) {
      message[i] = '您的被子可能掉地上了，请去查看被子是否安然无恙'
      i++
    }

    if (getDisVariance > 200) {
      message[i] = '检测到现在风可能有点猖狂，建议您收被子'
      i++
    }
    return message
  },
  getLight: function (data) {
    var light_num = 0
    var light_sum = 0
    for (var x = 0; x < data.length; x++) {
      light_num++
      light_sum += data[x]
    }
    return light_sum / light_num
  },
  getTemp: function (data) {
    var temp_num = 0
    var temp_sum = 0
    for (var x = 0; x < data.length; x++) {
      if (data[x] < 50 && data[x] > 0) {
        temp_num++
        temp_sum += data[x]
      }
    }
    return temp_sum / temp_num
  },
  getHumi: function (data) {
    var humi_num = 0
    var humi_sum = 0
    for (var x = 0; x < data.length; x++) {
      if (data[x] < 90 && data[x] > 20) {
        humi_num++
        humi_sum += data[x]
      }
    }
    return humi_sum / humi_num
  },
  getPm25: function (data) {
    var pm25_num = 0
    var pm25_sum = 0
    for (var x = 0; x < data.length; x++) {
      if (data[x] < 999 && data[x] > 0) {
        pm25_num++
        pm25_sum += data[x]
      }
    }
    return pm25_sum / pm25_num
  },
  getDistance: function (data) {
    var distance_num = 0
    var distance_sum = 0
    for (var x = 0; x < data.length; x++) {
      distance_num++
      distance_sum += data[x]
    }
    return distance_sum / distance_num
  },
  getDisVariance: function (data) {
    var avadis = this.getDistance(data)
    var variance_sum = 0
    for (var i = data.length - 1; i >= 0; i--) {
      var diff = data[i] - avadis
      variance_sum += diff * diff
    }
    return variance_sum / data.length
  }
}
