'use strict'

var aedes = require('aedes/aedes')()
var server = require('net').createServer(aedes.handle)
var httpServer = require('http').createServer()
var ws = require('websocket-stream')
var port = 1883
var wsPort = 8888
var topics = []
var clientsId = []
var brokerFee = 0.1;
var i=0
var j=0

//IOTA 
const iotaLibrary = require('@iota/core')
const Converter = require('@iota/converter');

const iota = iotaLibrary.composeAPI({
  provider: 'https://nodes.devnet.thetangle.org:443'
})

const seed =
  'GZOAAHPHJWO9TMRFLWJSNANNNUIIXYVQERUCXMGIGGCYMFGPE9FMYSWBMNGJSAARCBZCGQSZWUNT9MEZV'

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
    var  topic = packet.topic
    var price = getPrice(topic)
    var currency =  getCurrency(topic)

    //The new topics are added to the topics array
    if (IsItNew(packet.topic)){
    topics[i] = topic
    console.log(`${packet.topic} added`)
    i++
    }

    //Charge from the subscriptors using IOTA
    chargeSubs(listOfSubs(packet.topic), client, topic.toString(), price, currency)

    console.log(`The price is: ${price} and the currency is: ${currency}`)
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
  //console.log("client", client)
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

function getPrice(topic){
  var str = topic. split(/[%]/)
  var res =  "No price"
  if (str.length > 1)  res = str[1]

return res
}

function getCurrency(topic){
  var str = topic. split(/[%]/)
  var res =  "No currency"
  if (str.length > 2)  res = str[2]

return res
}

function chargeSubs(arrayOfSubs, pub, topic, price, currency){
  var status = false
  var price_fee = price*(1+brokerFee)
 // var message = Converter.asciiToTrytes(topic);
 //For now we're not using the currency 

 //Check balance
 iota
  .getBalances([pub.id], 100)
  .then(({ balances }) => {
    console.log("This is the balance of publisher",balances)
  })
  .catch(err => {
    console.error(err)
  })

  //Withdraw the payment (Transaction and fee) from the subs
  
  const main = async () => {
  const transfers = [
    {
      value: price_fee,
      address: pub.id,
      tag: 'MYMAGIC'
    }
  ]
  console.log(`Sending ${price_fee} to ${pub.id}`)

  try {
    // Construct bundle and convert to trytes
    const trytes = await iota.prepareTransfers(seed, transfers)
    // Send bundle to node.
    const response = await iota.sendTrytes(trytes, 3, 9)

    console.log('Completed TXs')
    response.map(tx => console.log(tx))
  } catch (e) {
    console.log(e)
  }
  }

  main()

  //Charge the payment to the publisher

  //Charge the fee to the broker  

  return status
}

