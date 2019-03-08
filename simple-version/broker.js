'use strict'

var aedes = require('aedes/aedes')()
var server = require('net').createServer(aedes.handle)
var httpServer = require('http').createServer()
var ws = require('websocket-stream')
var port = 1883
var wsPort = 8888
var topics_count = []
var clientsId = []
var brokerFee = 0.1;
var i=0
var j=0
var maxTrans = 10;

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
    //The known topics we keep counting messages, once we have been delivered maxTrans messages
    //then we charge to the subscribers

    if (IsItNew(packet.topic)){
      topics_count[i] = {topic: topic, subscribers:{}}
  
    console.log(`${topics_count[i]} added`)
    i++
    }else{   
      var index = topics_count.findIndex(
        function isEquals(element) {
          return topic===element['topic']
        })
  
      topics_count[index]['counter'] +=1

      if (topics_count[index]['counter'] == maxTrans){
        if(!chargeSubs(subs, client, topic.toString(), price*maxTrans, currency)){
          console.log("There are no subscribers")
      }

      //incrementCounterAndCharge(topic)

    }

    console.log(`The price is: ${price} and the currency is: ${currency}`)
    console.log(`List of subscribers to ${packet.topic} topic`,subs)

  }
})


aedes.on('subscribe', function (subscriptions, client) {
  if (client) {
    console.log('Subscriptions of',client.id, subscriptions)
    updateList(client, subscriptions)
    console.log("Topics count",topics_count)
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
  while(i<topics_count.length && flag){
    if(topic==topics_count[i]['topic']){
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
  var fee = price*(brokerFee)
  var balanceA;
  var balanceB;
  
  //For now we're using ethereum 

  if(arrayOfSubs.length > 0){
 
  for (var k=0; k<arrayOfSubs.length; k++){
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
  value: price,
  gas: 30000
}).then(function(res){
  console.log(res);
});
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

function updateList(client, subscriptions){
  if(topics_count.length>=1 && subscriptions.length>=1){
  for (var k=0; k<topics_count.length; k++){
      var indexSubs = searchIndex(subscriptions,topics_count[k]['topic'])
      if (indexSubs > -1){
      var indexClient = searchIndex(topics_count[k]['subscribers']['id'],client.id)
      if(indexClient == -1)
      {
        topics_count[k]['subscribers'].push({id: client.id, counter:1})
      }
      }
    }
  }
}

function incrementCounterAndCharge (topic){
  var indexTopic = searchIndex(topics_count,topic,'topic')
  for (var i=0; i<topics_count[indexTopic]['subscribers'].length; i++){
    topics_count[indexTopic]['subscribers']['counter'][i] +=1
    console.log("increment counter", topics_count[indexTopic]['subscribers']['counter'][i])
    if(topics_count[indexTopic]['subscribers']['counter'][i]==maxTrans){
      chargeSubs(topics_count[indexTopic]['subscribers']['id'], client, topic.toString(), price*maxTrans, currency)
    }
  }
}

function searchIndex(array, valueComp, property){
  if (property == ''){
  var index = array.findIndex(
    function isEquals(element) {
      return valueComp===element
    })
  }else{
    var index= array.findIndex(
      function isEquals(element) {
        return valueComp===element[property]
      })
  }
  return index
}