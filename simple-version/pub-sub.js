const mqtt = require('mqtt');
var topic = "Topic1%10000000000000000%anycurrency"; var topic1 = "Hola-1"; var topic2 = "Hola-2"
var address1 = '0xE8B03DE7D420DB4164D02D143548E81CB8D2F898E38E9A0629AD47ED89770AF8'
var address2 = '0xC89ADA337DCDD9D9D092D582104064554DDC3A835B0D164B82E304F0DFC5F0FC'

var client = mqtt.connect('mqtt://localhost', {
         clientId: address1,
         clean: false,
         username:'weAreTheChampions',
         password:'yesWeAre'
     })

//Three messages, one publisher, one topic
const userMessagePerSecond = 0.3;
const userMessageInterval = 1000 / userMessagePerSecond;
var messageNumber = 1;

client.on('connect', function(){
    setInterval(function(){
        var message = `${messageNumber}th message`;
        client.publish(topic, message, {
            qos: 0,
            retain: false
        })
        messageNumber++
    }, userMessageInterval)     
})


var  subs = mqtt.connect('mqtt://localhost', {
         clientId: address2,
         clean: false,
         
     })

     subs.on('connect', function () {
        subs.subscribe(topic);
        console.log(`user subs-1 subscribed to group topic ${topic}`)
     })

     subs.on('packetreceive', function(packetreceive){
         console.log('This is the topic: ',packetreceive.topic)
     })

var bal = 10;
var  subs1 = mqtt.connect('mqtt://localhost', {
        clientId: 'hola',
        clean: false
    })

    subs1.on('connect', function () {
       subs1.subscribe(topic1);
       console.log(`user subs-2 subscribed to group topic ${topic}`)
       subs1.subscribe(topic1);
       console.log(`user subs-2 subscribed to group topic ${topic1}`)
    })

var  subs2 = mqtt.connect('mqtt://localhost', {
        clientId: 'address2',
        clean: false
    })

    subs2.on('connect', function () {
       subs2.subscribe(topic1);
       console.log(`user subs-3 subscribed to group topic ${topic1}`)
    })
