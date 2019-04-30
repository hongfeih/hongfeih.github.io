
var USER_ID = 'unknown';

function setUserId(id) {
  USER_ID = id;
}


function MyLogFunction(args) {
	if (log_to_server/*true*/) {
		try {
			var request = new XMLHttpRequest();
			var msg = "";
			for(i=0;i<args.length;i++)
				msg += args[i] + " ";
			request.open('GET', LOG_SERVER + 'addLog?id=' + USER_ID + '&log=' + Base64.encodeURI(msg));  // `false` makes the request synchronous
			//request.open('GET', `http://172.16.1.169:8582/` + 'addLog?id=' + USER_ID + '&log=' + Base64.encodeURI(msg));  // `false` makes the request synchronous
			request.send(null);
		} catch(e)
		{}
	}
}

var ci, cl, ce, cw, cd, ct;

if(window.console && console.log){
	cl = console.log;
	console.log = function(){
		MyLogFunction(arguments);
		cl.apply(this, arguments)
	}
}

if(window.console && console.warn){
	cw = console.warn;
	console.warn = function(){
		MyLogFunction(arguments);
		cw.apply(this, arguments)
	}
}

if(window.console && console.error){
	ce = console.error;
	console.error = function(){
    MyLogFunction(arguments);
		ce.apply(this, arguments)
	}
}

if(window.console && console.debug){
	cd = console.debug;
	console.debug = function(){
    MyLogFunction(arguments);
		cd.apply(this, arguments)
	}
}

if(window.console && console.info){
	ci = console.info;
	console.info = function(){
    MyLogFunction(arguments);
		ci.apply(this, arguments)
	}
}

if(window.console && console.trace){
	ct = console.trace;
	console.trace = function(){
    MyLogFunction(arguments);
		ct.apply(this, arguments)
	}
}
