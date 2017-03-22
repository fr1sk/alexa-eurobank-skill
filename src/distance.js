function toRadians(deg){
    return deg*Math.PI/180;
}

module.exports=function(done){
	var request=require("sync-request");
	var obj={};
  var lat=38.041023;
  var long=23.762058;
	var res=request('get','http://api.beyondhackathon.com/info/atms');
	var body=JSON.parse(res.getBody());
	body.reduce(function(acc,value){
    var R = 6371e3; // metres
    var fi1 = toRadians(value.latitude);//.toRadians();
    var fi2 = toRadians(lat);
    var deltaFi = toRadians(lat-value.latitude);//.toRadians();
    var deltaLambda = toRadians(long-value.longitude);//.toRadians();
    var a = Math.sin(deltaFi/2) * Math.sin(deltaFi/2) +
            Math.cos(fi1) * Math.cos(fi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    if(acc > d) {
      obj = value;
      obj.distance=d;
			return d;
		}
		return acc;
	},Number.MAX_VALUE);
	return done(null,obj);
};
