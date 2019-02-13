const mqtt = require('mqtt');
const userMessagePerSecond = 10;
const userMessageInterval = 1000 / userMessagePerSecond;
var userId = 1
var topic = "Hola"

const client = mqtt.connect('mqtt://localhost', {
        clientId: `hi-${userId}`,
        clean: false
    })

    client.on('connect', function () {
      console.log(`user ${userId} connected`);
      client.subscribe(topic);
      console.log(`user ${userId} subscribed to group topic ${topic}`);

      var messageNumber = 1;
      setInterval(function () {
          const message = `from ${userId} - ${messageNumber}th message`;
          userClient.publish(topic, message, {
              qos: 0
          });
          messageNumber++;
      }, userMessageInterval);

  });