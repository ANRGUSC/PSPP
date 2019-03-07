const mqtt = require('mqtt');
var topic = "Topic1%1%anycurrency"; var topic1 = "Hola-1"; var topic2 = "Hola-2"
var address1 = 'XSNKYZR9AXVYOFYEZCDZLYHVHMWFRAJRRPSNRIURHGSSYRIAWGDQEITFLSQTFXGKPBZJW9UXZNNPPELKC'
var address2 = 'LMMKZDFYA999ZKEICKWHENCRYEKSNWUCYZZJJCSZKWGYUTLQ9QFKPJCNA9RSHUDVCIPWAZVWDEEYRYYAB'

var client = mqtt.connect('mqtt://localhost', {
         clientId: address1,
         clean: false,
     })

//Three messages, one publisher, one topic
const userMessagePerSecond = 1;
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
         clean: false
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
        clientId: `subs-2`,
        clean: false
    })

    subs1.on('connect', function () {
       subs1.subscribe(topic);
       console.log(`user subs-2 subscribed to group topic ${topic}`)
       subs1.subscribe(topic1);
       console.log(`user subs-2 subscribed to group topic ${topic1}`)
    })

var  subs2 = mqtt.connect('mqtt://localhost', {
        clientId: `subs-3`,
        clean: false
    })

    subs2.on('connect', function () {
       subs2.subscribe(topic1);
       console.log(`user subs-3 subscribed to group topic ${topic1}`)
    })

function getId(){
    //IOTA 
const iotaLibrary = require('@iota/core')

const iota = iotaLibrary.composeAPI({
  provider: 'https://nodes.devnet.thetangle.org:443'
})

const seed =
  'HELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORL9E'
  
  iota
  .getNewAddress(seed, { index: 0, total: 1 })
  .then(address => {
    console.log('Your address is: ' + address)
    console.log('Paste this address into https://faucet.devnet.iota.org')
    return address
  })
  .catch(err => {
    console.log(err)
  })

}