#!/usr/bin/env node
var shell = require('shelljs');

var args = process.argv.splice(process.execArgv.length + 2);
if(typeof args[0]=="string" && args[0]=="install" ){
  // create user-group in linux
  console.log((''+shell.exec(
    'sudo groupadd -g 174 node-ws-pubsub',
    { silent:true }
  ).stdout).replace(/^\s+|\s+$/ig,''));

  // create user in linux
  console.log((''+shell.exec(
    'sudo useradd -g 174 -u 174 -m -d /etc/node-ws-pubsub -s /bin/bash node-ws-pubsub',
    { silent:true }
  ).stdout).replace(/^\s+|\s+$/ig,''));

  // create application folder
  console.log((''+shell.exec(
    'sudo mkdir -p /opt/node-ws-pubsub',
    { silent:true }
  ).stdout).replace(/^\s+|\s+$/ig,''));

  var projectFolder= (""+__dirname).replace(/\/[^\/]+$/,"");

  // copy systemd file
  console.log((''+shell.exec(
    'sudo cp '+projectFolder+'/scripts/node-ws-pubsub.service /etc/systemd/system',
    { silent:true }
  ).stdout).replace(/^\s+|\s+$/ig,''));

  // enable systemd
  console.log((''+shell.exec(
    'sudo systemctl enable node-ws-pubsub.service',
    { silent:true }
  ).stdout).replace(/^\s+|\s+$/ig,''));

  // start the service automatically
  console.log((''+shell.exec(
    'sudo systemctl start node-ws-pubsub.service',
    { silent:true }
  ).stdout).replace(/^\s+|\s+$/ig,''));

} else if(typeof args[0]=="string" && args[0]=="start" ){
  //start script
  var app=require('../lib/pubsub');
  app.listen(3000);

}else if(typeof args[0]=="string" && args[0]=="stop" ){

  //start stop
  console.log((''+shell.exec(
    'kill -9 $(cat /dev/shm/node-ws-pubsub.pid)',
    { silent:true }
  ).stdout).replace(/^\s+|\s+$/ig,''));

}
