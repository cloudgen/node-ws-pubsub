const WebSocket = require('./util/websocket');

WebSocket.Server = require('./util/websocket-server');
WebSocket.Receiver = require('./util/receiver');
WebSocket.Sender = require('./util/sender');

module.exports = WebSocket;
