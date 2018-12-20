var http = require('http');
var express = require('express');
var ws = require('./websocket');
var websocketUrl = require('./util/websocket-url');
var addWsMethod = require('./util/add-ws-method');
var app = express();

class ExpressWS {
  constructor(){
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var server = http.createServer(app);
    this.app = app;
    app.listen = function serverListen() {
      var _server;
      return (_server = server).listen.apply(_server, arguments);
    };
    addWsMethod(app);

    if (!options.leaveRouterUntouched) {
      addWsMethod(express.Router);
    }

    var wsOptions = options.wsOptions || {};
    wsOptions.server = server;
    var wsServer = new ws.Server(wsOptions);

    wsServer.on('connection', function (socket, request) {
      if ('upgradeReq' in socket) {
        request = socket.upgradeReq;
      }
      request.ws = socket;
      request.wsHandled = false;
      request.url = websocketUrl(request.url);
      var dummyResponse = new http.ServerResponse(request);

      dummyResponse.writeHead = function writeHead(statusCode) {
        if (statusCode > 200) {
          /* Something in the middleware chain signalled an error. */
          dummyResponse._header = '';
          socket.close();
        }
      };

      app.handle(request, dummyResponse, function () {
        if (!request.wsHandled) {
          socket.close();
        }
      });
    });

  }
}
module.exports = ExpressWS;
