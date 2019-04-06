const aedes = require("aedes")({
    persistence: new require("aedes-persistence")()
  });
  const server = require("net").createServer(aedes.handle);
  const port = 1883;

  var httpServer = require('http').createServer()
  var ws = require('websocket-stream')
  var wsPort = 8888

  const {
    authorizePublish,
    authorizeSubscribe,
    addTopic 
  } = require("aedes-authorization-plugin");
   
  // add topics and authorizer functionality (promises supported, too)
 
  server.listen(port, function() {
    console.log("server listening on port", port);
  });
  
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
      console.log(`${packet.topic} added`)

      addTopic(packet.topic, (client, sub) => {
        return true;
      });
      aedes.authorizePublish = authorizePublish;
    }
  })
  
  aedes.on('subscribe', function (sub, client) {
    if (client) {
      console.log('subscribe from client', sub, client.id)
      addTopic(sub.topic, (client, sub) => {
        if (sub.userId === "1") {
          console.log("true",sub.userId )
          console.log("client", client)
          return true; // allowed!
        } else {
          console.log("false",sub )
          console.log("client", client.id)
          console.log("packet", sub.params.topic)
          return false; // not allowed!
        }
      });
      aedes.authorizeSubscribe = authorizeSubscribe;
    }
  })
  
  aedes.on('client', function (client) {
    console.log('new client', client.id)
  })