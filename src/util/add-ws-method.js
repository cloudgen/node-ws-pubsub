var wrapMiddleware = require('./wrap-middleware');
const websocketUrl=require('./websocket-url');

function _toConsumableArray(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  } else {
    return Array.from(arr);
  }
}

function addWsMethod(target) {
  if (target.ws === null || target.ws === undefined) {
    target.ws = function addWsRoute(route) {
      for (var _len = arguments.length, middlewares = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        middlewares[_key - 1] = arguments[_key];
      }
      var wrappedMiddlewares = middlewares.map(wrapMiddleware);
      var wsRoute = websocketUrl(route);
      this.get.apply(this, _toConsumableArray([wsRoute].concat(wrappedMiddlewares)));
      return this;
    };
  }
}
module.exports=addWsMethod;
