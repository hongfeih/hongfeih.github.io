var express = require('express');
var cookieParser = require('cookie-parser');
var fs = require("fs");
var log4js = require("log4js");
const {PlayManager, PlayUnit} = require("./play_units_mgr");

var app = express();
app.use(cookieParser());

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
    app: { type: 'file', filename: 'sServer.log' }
  },
  categories: {
    default: { appenders: ['out', 'app'], level: 'trace' }
  }
});
var logger = log4js.getLogger("custom_appender");

app.get('/', function (req, res) {
	res.status(404).end();
})

var playMgr = new PlayManager(logger);
/*
*	Directory:
*		|------- HLS --- sub-directory --- mbr.m3u8/sbr.m3u8
*		|
*	  |------- DASH --- sub-directory --- mbr.mpd
**/
app.get('*/hls/*/*(.m3u8|.webvtt|.ts|.aac|.jpg)*', function (req, res) {
	// 1. get url and parse. get suffix, user id.
	// 2. get cookie, parse user id, request number
	// 3. read file in directory, write cookie and response

  var targetName = '';
  var resCookie = '';
  var originalUrl = req.originalUrl;
  var urlInfo = playMgr.parseHlsUrl(originalUrl);
  var mime = '';
  var rejectCode = 404;
  if (urlInfo.valid) {
    var mbr = (urlInfo.ssPlayId != null);
    var ssPlayId = mbr ? urlInfo.ssPlayId : req.cookies.ssPlayId;
    if (ssPlayId) {
      var fullUrl = urlInfo.path + '/' + urlInfo.fileFullName;
      var playUnit = playMgr.getPlayUnit(ssPlayId, 'hls', fullUrl, mbr);
      if (playUnit) {
        var number = -1;
        if (req.cookies.ssCookie) {
          number = playUnit.getUrlNumber(req.cookies.ssCookie, fullUrl, mbr);
        }
        targetName = playUnit.getResponseFileName(fullUrl, number);
        if (targetName) {
          resCookie = playUnit.getSSCookie();
          mime = playUnit.getMimeType(urlInfo.type);
        }
      }
    } else {
	  rejectCode = 403;
      logger.debug('No ssPlayId. Reject.');
    }
  }
  if (targetName) {
    var options = {
      headers: {
        'Access-Control-Allow-Origin': req.headers.origin,
        'Content-Type': mime,
        'Date': Date.now().toString(),
        'Cache-Control': 'no-cache',
        //'Access-Control-Expose-Headers': ['ssCookie', 'ssPlayId'],
        //'ssPlayId': playUnit.getId(),
        //'ssCookie': resCookie
        'Access-Control-Allow-Credentials': 'true'
      }
    };
    res.cookie('ssPlayId', playUnit.getId());
    res.cookie('ssCookie', resCookie);
    res.sendFile(targetName, options, function(err) {
      if (err) {
        logger.debug('Send file ' + targetName + 'failed');
      }
    });
    
  } else {
    logger.debug('reject %d. url=%s', rejectCode, originalUrl);
    res.status(rejectCode).end();
  }
})

// express regex(https://forbeslindesay.github.io/express-route-tester/)
app.get('*/dash/*/*(.mpd|.webvtt|.m4s|.jpg)*', function (req, res) {
	// 1. get url and parse. get suffix, user id.
	// 2. get cookie, parse user id, request number
	// 3. read file in directory, write cookie and response

  var targetName = '';
  var resCookie = '';
  var originalUrl = req.originalUrl;
  var urlInfo = playMgr.parseDashUrl(originalUrl);
  var mime = '';
  var rejectCode = 404;
  logger.debug('Request: url=%s', req.originalUrl);
  if (urlInfo.valid) {
    var ssPlayId = urlInfo.ssPlayId ? urlInfo.ssPlayId : req.cookies.ssPlayId;
    var mbr = (playMgr.existPlayUnit(ssPlayId) == null);
    if (ssPlayId) {
      var fullUrl = urlInfo.path + '/' + urlInfo.fileFullName;
      var playUnit = playMgr.getPlayUnit(ssPlayId, 'dash', fullUrl, mbr);
      if (playUnit) {
        var number = -1;
        if (req.cookies.ssCookie && !mbr) {
          number = playUnit.getUrlNumber(req.cookies.ssCookie, fullUrl, mbr);
        }
        targetName = playUnit.getResponseFileName(fullUrl, number);
        if (targetName) {
          resCookie = playUnit.getSSCookie();
          mime = playUnit.getMimeType(urlInfo.type);
        }
      }
    } else {
      rejectCode = 403;
      logger.debug('No ssPlayId. Reject.');
    }
  }
  if (targetName) {
    var options = {
      headers: {
        'Access-Control-Allow-Origin': req.headers.origin,
        'Content-Type': mime,
        'Date': Date.now().toString(),
        'Cache-Control': 'no-cache',
        //'Access-Control-Expose-Headers': ['ssCookie', 'ssPlayId'],
        //'ssPlayId': playUnit.getId(),
        //'ssCookie': resCookie
        'Access-Control-Allow-Credentials': 'true'
      }
    };
    res.cookie('ssPlayId', playUnit.getId());
    res.cookie('ssCookie', resCookie);
    res.sendFile(targetName, options, function(err) {
      if (err) {
        logger.debug('Send file ' + targetName + 'failed');
      }
    });
    
  } else {
    logger.debug('reject %d. url=%s', rejectCode, originalUrl);
    res.status(rejectCode).end();
  }
})

var server = app.listen(8583, function () {
  var host = server.address().address
  var port = server.address().port

  logger.debug("Family=%s", server.address().family);
  logger.debug("Server http://%s:%s", host, port)

})
