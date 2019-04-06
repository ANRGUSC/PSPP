
# PSPP - Proof of concept

This is the development of the proof of concept of PSPP (PUBLISH-SUBSCRIBER-PRICE-PROTOCOL). PSPP integrates payment to publish-subscriber model. 

### Prerequisites

AEDES broker 
	For more details go to https://github.com/mcollina/aedes

MQTT client
	For more details go to https://www.npmjs.com/package/mqtt

Web3 
	For more details go to https://www.npmjs.com/package/web3/v/0.20.7
```
npm install aedes --save
npm i mqtt
npm install web3@0.20.7
```

### Installing

After installing the prerequisites copy the files broke_w:k.js, broke_wo:k.js, broker.js and pub-sub.js inside Aedes folder.

## Running the tests

1. Verify the port 1883 is free. If not, kill the process.

```
sudo lsof -nP -i4TCP:1883| grep LISTEN 
```

2. Open two terminals: one for the broker (localhost server) and one for the client (localhost publisher and subscriber) and run the scripts. First, run the broker, and then run the client.

```
node broker.js 
```

```
node pub-sub.js 
```

## Deployment

By default, the MQTT client sends one message per second. This can be changed directly in the pub-sub.js file. 
By default, the broker fee is 10% of the topic's price.

broker.js contains the AEDES broker.
broke_wo:k.js contains case for K parameter = 1.
broke_w:k.js contains case for K parameter = 10.

## Authors

* Gowri S. Ramachandran gsramach@usc.edu
* Sharon. L.G. Contreras sladrond@usc.edu
* Bhaskar Krishnamachari bkrishna@usc.edu 


## Acknowledgments

* Center for Cyber-Physical Systems and the Internet of Things

## License

This project is licensed under a permissive license - please see LICENSE.md for details
