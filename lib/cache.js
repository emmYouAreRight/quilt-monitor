const _cacheMap = {}

module.exports = {
  get: function (key) {
    return this.isExpired(key) ? null : _cacheMap[key].value
  },
  set: function (key, value, expires) {
    _cacheMap[key] = {
      value,
      expireTime: Date.now() + expires * 1000
    }
    return _cacheMap[key]
  },
  isExpired: function (key) {
    if (key in _cacheMap) {
      return _cacheMap[key].expireTime < Date.now()
    } else {
      return true
    }
  }
}
