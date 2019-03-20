'use strict'

var aedes = require('aedes/aedes')()
var server = require('net').createServer(aedes.handle)
var httpServer = require('http').createServer()
var ws = require('websocket-stream')
var port = 1883
var wsPort = 8888
var clientsId = []
var j=0


server.listen(port, function () {
  console.log('server listening on port', port)
})

ws.createServer({
  server: httpServer
}, aedes.handle)


httpServer.listen(wsPort, function () {
  console.log('websocket server listening on port', wsPort)
})

aedes.on('clientError', function (client, err) {
  console.log('websocket server listening on port', wsPort)

  console.log('client error', client.id, err.message, err.stack)
})

aedes.on('connectionError', function (client, err) {
  console.log('client error', client, err.message, err.stack)
})

aedes.on('publish', function (packet, client) {
  if (client) {
    console.log(`Message published to ${packet.topic} topic`,)
}
})


aedes.on('subscribe', function (subscriptions, client) {
  if (client) {
    console.log('Subscriptions of',client.id, subscriptions)
    }
})

aedes.on('client', function (client) {
  console.log("New client", client.id)
  clientsId[j] = client.id
  j++

})




