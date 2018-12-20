const websocketUrlFilter=/\/?(\?.*)/;
function websocketUrl(url) {
  var suffix="";
  return (""+url).replace(websocketUrlFilter,function(s,t){
    if(t){
      suffix=t;
    }
    return "";
  }) +"/.websocket" +suffix;
}
module.exports=websocketUrl;
