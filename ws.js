/**
 * ws server instance
 */

const tag = "ws";

const { WebSocketServer } = require('ws');

const config = require('./config.json');

const server = new WebSocketServer({
    port: config.ws.port
});

server.on('listening', () => {
    console.log(tag, `监听于: ${config.ws.port}`);
})

module.exports = server;