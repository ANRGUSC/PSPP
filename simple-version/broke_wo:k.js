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

//Required for transactions
var express = require('express');
var router = express.Router();
const Web3 = require('web3');
const keys = require('./config/keys');

const web3 = new Web3(new Web3.providers.HttpProvider(keys.HTTP_SERVER));
web3.eth.net.isListening().then(console.log);

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

    var topic = packet.topic
    var price = getPrice(topic)
    var currency =  getCurrency(topic)
    var subs = listOfSubs(packet.topic)
    
    //The new topics are added to the topics array
    //The known topics we keep counting messages, once we have been delivered k messages
    //then we charge to the subscribers

    if (IsItNew(packet.topic)){
      topics[i] = topic
  
    console.log(`${topics[i]} added`)
    i++
    }else{   

      const startCallback = Date.now();
      if(!chargeSubs(subs, client, topic.toString(), parseInt(price), currency)){
        console.log("There are no subscribers")
      }      
        while (Date.now() - startCallback < 100) {
        // do nothing
      }
    
    console.log(`The price is: ${price} and the currency is: ${currency}`)
    console.log(`List of subscribers to ${packet.topic} topic`,subs)

  }
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
  var status = true
  var fee = price*(brokerFee+1)
  var balanceA;
  var balanceB;
  
  //For now we're using ethereum 

  if(arrayOfSubs.length > 0){
  try{
  for (var k=0; k<arrayOfSubs.length; k++){
   const web3 = new Web3(new Web3.providers.HttpProvider(keys.HTTP_SERVER));
   web3.eth.net.isListening().then(console.log);
  //Withdraw the payment (Transaction and fee) from the subs
  console.log("This is the account of the pub: ",pub.id)
  const account = web3.eth.accounts.privateKeyToAccount(pub.id);
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;
  bal(account.address).then(function(result){
  //console.log(web3.utils.fromWei(result , 'ether'));
  balanceA = web3.utils.fromWei(result , 'ether');
  });

  console.log("This is the account of the sub: ",arrayOfSubs[k] )
  const account2 = web3.eth.accounts.privateKeyToAccount(arrayOfSubs[k]);
  web3.eth.accounts.wallet.add(account2);
  bal(account2.address).then(function(result){
  //console.log(web3.utils.fromWei(result , 'ether'));
  balanceB = web3.utils.fromWei(result , 'ether');
  });

  
web3.eth.sendTransaction({
  from: account2.address ,
  to: account.address,
  value: fee,
  gas: 30000
}).then(function(res){
  console.log(res);
});
}
}catch(error){
console.log ("This is the error: ",error)
}
 
  //Charge the fee to the broker  
  //We need an accounnt for the broker in order to send the transfer
}
  return status
}

function bal(address) {
  let balance = web3.eth.getBalance(address);
  //console.log(`The balance of ${address} is ${balance}`)
  return balance;
}






