var express = require('express');
var bodyParser = require('body-parser');
var fs = require("fs");
var log4js = require("log4js");
var rawParser = bodyParser.raw({ type: 'application/octet-stream', limit: '50mb'});

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
    app: { type: 'file', filename: 'h5player.log' }
  },
  categories: {
    default: { appenders: ['out', 'app'], level: 'trace' }
  }
});

var app = express();

app.get('/addLog', function (req, res) {
  var log = req.param('log');
  console.log()
  var id = req.param('id');
  var LogFile = log4js.getLogger(id);
  var logText = new Buffer(log, 'base64').toString();
  LogFile.debug(logText);
  res.header("Access-Control-Allow-Origin", "*");
  res.send({ op: 'done' });
})

app.get('/logs', function (req, res) {
/*
  fs.readFile('h5player.log', "utf8", function (err, data) {
    if (err) throw err;
    res.header("Access-Control-Allow-Origin", "*");
    res.send(data);
  });
*/
  res.sendFile(__dirname + '/h5player.log');
})

app.options('/addStreams', function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.send({ op: 'done' });
})

app.post('/addStreams', rawParser, function (req, res) {
  var name = req.param('name');
  console.log(name);
  var type = req.param('type');
  console.log(type);
  fs.open(__dirname + '/' + name + '_' + type + '.mp4', 'w+', (err, fd) => {
	  if (err) throw err;
	  var buf = req.body;
	  fs.write(fd, buf, 0, buf.length, 0, function(err, written, buffer) {
		  if (err) {
			  fs.close(fd, (err) => {
				if (err) throw err;
			  });
			  throw err;
		  }
	  });
	  fs.close(fd, (err) => {
		if (err) throw err;
	  });
  });
  //console.log(req.body);
  res.header("Access-Control-Allow-Origin", "*");
  res.send({ op: 'done' });
})

var server = app.listen(8582, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Log server http://%s:%s", host, port)

})