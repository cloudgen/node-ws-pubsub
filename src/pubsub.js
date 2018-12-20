var app = new(require('./express-ws'))().app;
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var npid = require('./util/pid')
const emptyGif = new Buffer.alloc(
  43,"R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64"
);
try {
  let pidName=['/dev/shm/ws-notification.pid'].join('');
  if (fs.existsSync(pidName)){
    fs.unlinkSync(pidName);
  }
  var pidFile = npid.create(pidName);
  pidFile.removeOnExit()
} catch (err) {
  console.log( "error",err );
}

global.channelList={};
global.channelSession={};
global.channelMap={};
global.messageReceived=0;

function publicate(targetChannelName,msg,excludeSession){
  if(typeof global.channelList[targetChannelName]!="undefined"){
    var sendCount=0;
    for(var k=0;k<global.channelList[targetChannelName].length;k++){
      if(typeof global.channelList[targetChannelName][k]!="undefined" &&
         global.channelList[targetChannelName][k].readyState!=3
      ){
        if(typeof global.channelList[targetChannelName][k].sessionToken!="undefined" &&
        global.channelList[targetChannelName][k].sessionToken!=excludeSession){
          global.channelList[targetChannelName][k].send(msg);
          console.log("index: "+k)
          console.log("token:"+global.channelList[targetChannelName][k].sessionToken)
        }
      }else {
        if(typeof global.channelList[targetChannelName][k]!="undefined" &&
          typeof global.channelList[targetChannelName][k].sessionToken != "undefined"
        ){
          var session=global.channelList[targetChannelName][k].sessionToken;
          if(typeof global.channelMap[targetChannelName][session] != "undefined"){
            delete global.channelMap[targetChannelName][session];
          }
          if(typeof global.channelSession[session] != "undefined"){
            delete global.channelSession[session];
          }
        }
        if(typeof global.channelList[targetChannelName][k]!="undefined"){
          delete global.channelList[targetChannelName][k];
        }
      }
    }
  }
}

var addChannel=function(channelName){
  return function(ws,req){
    ws.sessionToken = req.sessionToken;   //For use in publicate function
    ws.on('message',function(msg){
      global.channelSession[req.sessionToken]={
        ip : req.ipaddr,
        channel : req.channelName
      };
      if(typeof global.channelList[channelName]=="undefined"){
        if(typeof global.channelMap[channelName]=="undefined"){
          global.channelMap[channelName]={};
          global.channelMap[channelName][req.sessionToken]=true;
        }
        global.channelList[channelName]=[ws];
      }else{
        if(typeof global.channelMap[channelName]=="undefined"){
          global.channelMap[channelName]={};
          global.channelMap[channelName][req.sessionToken]=true;
          global.channelList[channelName].push(ws);
        } else if(typeof global.channelMap[channelName][req.sessionToken] == "undefined"){
          global.channelMap[channelName][req.sessionToken]=true;
          global.channelList[channelName].push(ws);
        }
      }
      if(msg.replace(/^\s+|\s+$/g,'')!=""){
        console.log('-----');
        console.log("MSG ID: "+ (++global.messageReceived));
        console.log("INCOMING SESSION TOKEN(2): "+req.sessionToken);
        console.log("INCOMING CHANNEL(2): "+req.channelName);
        var targetChannelSplit = channelName.split(/\//g);
        var targetChannelName="";
        for(var j=0;j<targetChannelSplit.length;j++){
          if(targetChannelSplit[j]!=""){
            targetChannelName += "/" + targetChannelSplit[j];
            console.log("Channel: "+targetChannelName);
            publicate(targetChannelName,msg,req.sessionToken);
          }
        }
        if(channelName!="/"){
          console.log("Channel: /");
          publicate("/",msg,req.sessionToken);
        }
        var cnameRegex= new RegExp("^("+targetChannelName+").+$");
        for(var cname in global.channelList){
          var testname=cname.replace(cnameRegex,function(s,t){
            console.log("Channel: "+s);
            publicate(s,msg,req.sessionToken);
          });
        }
      }
      console.log("Active Channel Sessions:");
      console.log(global.channelSession);
    });
  }
}

function deleteSession(sessionToken){
  if(typeof global.sessions[sessionToken]!="undefined"){
    delete global.sessions[sessionToken];
  }
}

function isWebsocket(req,res,next){
  req.isWebsocket = false;
  var channel=(""+req.url).replace(/\/+/g,'/').replace(/\/.websocket(\?.*)?$/g,function(){
    req.isWebsocket = true;
    return '';
  }).replace(/^\//,'');

  if(req.isWebsocket){
    req.channelSplit=channel.split(/\//g);
    req.channelName='/'+req.channelSplit.join('/');
    console.log("INCOMING CHANNEL: "+req.channelName);
  }
  next();
}

function parseCookies(req){
  var cookies = {};
  req.headers.cookie && req.headers.cookie.split(';').forEach(function( cookie ) {
    var parts = cookie.split('=');
    cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
  });
  req.cookies=cookies;
}

function cleanSession(){
  var now = timestamp();
  for(var key in global.sessions){
    if(global.sessions[key].expires<= now){
      deleteSession(key);
    }
  }
}
function parseSessionToken(req){
  var sessionToken=req.url.replace(/^[^?]+\??/,"");
  if(sessionToken==""){
    sessionToken=typeof req.cookies.session=='string' ? req.cookies.session: "";
  }else {
    sessionToken=sessionToken.replace(/session=/,"");
  }
  req.sessionToken = sessionToken;
  console.log("INCOMING SESSION TOKEN: "+req.sessionToken);
  return sessionToken;
}

function checkSession(req){
  var now =  timestamp();
  cleanSession();
  var sessionToken=req.sessionToken;
  return (typeof global.sessions[sessionToken]!="undefined" &&
    global.sessions[sessionToken].channel=='/'+req.channelSplit.join('/') &&
    global.sessions[sessionToken].expires >= now
  );
}

function channelAuth(req,res,next){
  if(req.isWebsocket){
    if(req.channelSplit[0]=="public"){
      next();
    }else {
      parseCookies(req);
      parseSessionToken(req);
      if(checkSession(req)){
        deleteSession(req.sessionToken);
        next();
      }else{
        res.ws.end();
      }
    }
  }else{
    next();
  }
}

function parseChannel(req,res,next){
  if(!req.isWebsocket){
    next();
  }else{
    if(req.channelSplit.join('')==""){
      if(typeof global.channelList["/"]=="undefined"){
        app.ws("/",addChannel("/"));
      }
    } else {
      var channelName="";
      for(var i=0;i<req.channelSplit.length;i++){
        channelName += "/"+req.channelSplit[i];
        if(typeof global.channelList[channelName]=="undefined"){
          app.ws(channelName,addChannel(channelName));
        }
      }
    }
    return next();
  }
}
function timestamp(){
  return parseInt((new Date()).valueOf());
}

function addSession(req){
  var expires = timestamp() + 9000;
  var random = Math.random().toString().replace(/^0/,'');
  var key=""+expires +"."+req.query.channel+ random;
  var encryptedKey = crypto.createHash('sha1').update(key).digest('hex');
  if(typeof global.sessions=="undefined"){
    global.sessions={};
  }
  global.sessions[encryptedKey]={
    expires:expires,
    channel:req.query.channel
  };
  return encryptedKey;
}

function setSession(req,res){
  var encryptedKey = addSession(req);
  res.set('Set-Cookie','session='+encryptedKey+
    '; Expires='+(new Date(global.sessions[encryptedKey].expires)
  ).toUTCString()+'; Path=/; SameSite=Lax; Domain='+req.hostname);
  return encryptedKey;
}

function sendEmptyGif(req,res){
  res.set('Content-Type', 'image/gif');
  res.send(emptyGif);
}
global.ipMap = {
  '127.0.0.1':{
    "ip": "127.0.0.1",
    "hostname": "localhost",
    "city": "N/A",
    "region": "N/A",
    "country": "N/A",
    "loc": "N/A",
    "org": "N/A"
  }
}

function parseIp(req,rew,next){
  var ip=req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if(ip=='::ffff:127.0.0.1'){
    ip='127.0.0.1';
  }
  console.log('-----');
  req.ipaddr=ip;
  console.log('Incoming IP: '+req.ipaddr);
  next();
}

app.use(parseIp);
app.use(isWebsocket);
app.use(channelAuth);
app.use(parseChannel);

app.get('/auth.gif',function(req,res){
  if(typeof req.query.channel=="string"){
    parseCookies(req);
    if(typeof req.cookies !="undefined"  && typeof req.cookies.session=='string'){
      deleteSession(req.cookies.session);
    }
    setSession(req, res);
  }
  sendEmptyGif(req,res)
});

app.get('/auth',function(req,res){
  if(typeof req.query.channel=="string"){
    parseCookies(req);
    if(typeof req.cookies !="undefined"  && typeof req.cookies.session=='string'){
      if(typeof global.sessions=="object" && typeof global.sessions[req.cookies.session]!="undefined"){
        delete global.sessions[req.cookies.session];
      }
    }
    var key=setSession(req, res);
    res.header('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/json');
    res.send('{"status":"ok","session":"'+key+'"}');
  } else {
    res.set('Content-Type', 'application/json');
    res.send('{"status":"error"}');
  }
});
function sendFile(req,res){
  var filePath = path.join(__dirname, '../client/'+req.filename);
  fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
    if (!err) {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data);
      res.end();
    } else {
      console.log(err);
    }
  });
}
function parseClient(req,res){
  var filename;
  if(typeof req.params.id=='undefined'){
    filename="index.html";
  } else {
    filename=req.params.id;
  }
  req.filename=filename;
  sendFile(req,res);
}
function parseJS(req,res){
  req.filename='ws.js';
  sendFile(req,res);
}
app.get('/client/:id',parseClient);
app.get('/client',parseClient);
app.get('/ws.js',parseJS);
module.exports=app;
