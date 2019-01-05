const cache = require('../lib/cache')

console.log(cache.get('testKey'))
cache.set('testKey', 'testValue', 3)
console.log(cache.get('testKey'))
setTimeout(function () {
  console.log(cache.get('testKey'))
}, 4 * 1000)
