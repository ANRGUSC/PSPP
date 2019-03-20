const mqtt = require('mqtt');
var topic = "Topic1%10000000000000000%ethereum"

var address1 = '0xE8B03DE7D420DB4164D02D143548E81CB8D2F898E38E9A0629AD47ED89770AF8'
var address2 = '0xC89ADA337DCDD9D9D092D582104064554DDC3A835B0D164B82E304F0DFC5F0FC'
var start = new Date()
var executionTime = []
var i=0;

var client = mqtt.connect('mqtt://localhost', {
         clientId: address1,
         clean: false
     })

//Three messages, one publisher, one topic
const userMessagePerSecond = 100;
const userMessageInterval = 1000 / userMessagePerSecond;
var messageNumber = 1;

//Message of 256MB
//var fs = require('fs');
//try {  
    //var message = fs.readFileSync('message.txt', 'utf8');
    //console.log(message);    
//} catch(e) {
    //console.log('Error:', e.stack);
//}

var message = "This is a new message"
client.on('connect', function(){
    setInterval(function(){
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
         console.log("Packet received from: ", packetreceive.topic)
         //console.log("Length of the packet", packetreceive.length)
         console.log('This is the topic: ',packetreceive.topic)
         var end = new Date() - start;
         console.log("Execution time: ", end);
         executionTime[i] = end
         console.log("Execution times: ", executionTime)
         start = new Date()
         i++;

     })

