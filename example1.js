'use strict'

var aedes = require('aedes/aedes')()
var server = require('net').createServer(aedes.handle)
var httpServer = require('http').createServer()
var ws = require('websocket-stream')
var port = 1883
var wsPort = 8888
var topics = []
var clientsId = []
var i=0
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
    console.log('message from client', client.id)
   
    if (IsItNew(packet.topic)){
    topics[i] = packet.topic
    console.log(`${packet.topic} added`)
    i++
    }
    console.log(`List of subscribers to ${packet.topic} topic`,listOfSubs(packet.topic))

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

function listOfSubs(topic){
  var clientsSubs = []
  var j=0
  for (var i=0; i<clientsId.length; i++){
    var curr_subs = aedes.clients[`${clientsId[i]}`]['subscriptions']

    var array_subs = Object.keys(curr_subs);
    if (array_subs.length > 0){
      array_subs.forEach(function(subs_topic){
        if (subs_topic === topic){
          clientsSubs[j] = clientsId[i]
          j++
        }
      })
    }

  }
  return clientsSubs
}

function IsItNew(topic){
  var i=0; var flag = true;
  while(i<topics.length && flag){
    if(topic==topics[i]){
      flag=false;
    }else{
      i++
    }
  }
return flag
}

//Create list of topics 
//Every time we're one 
//When a client wants to subscribe, send the list of subscriptions

