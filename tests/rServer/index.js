let express = require('express');
let cookieParser = require('cookie-parser');
let fs = require('fs');
let log4js = require('log4js');
let bodyParser = require('body-parser');
let rawParser = bodyParser.raw({ type: 'application/octet-stream', limit: '50mb' });

let app = express();
app.use(cookieParser());

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
    app: { type: 'file', filename: 'rServer.log' }
  },
  categories: {
    default: { appenders: ['out', 'app'], level: 'trace' }
  }
});
let logger = log4js.getLogger('custom_appender');

app.get('/', function (req, res) {
	res.status(404).end();
})

app.post('/upload/*', rawParser, function (req, res) {
  logger.log('url=%s', req.originalUrl);
  let regex = new RegExp('upload/(.*)/(.*\\.(vtt|ts|m3u8|webvtt))');
  let match = regex.exec(req.originalUrl);
  if (match) {
    let path = match[1];
    try {
      fs.accessSync('./upload/' + path, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      fs.mkdirSync('./upload/' + path, { recursive: true });
    }

    fs.writeFile('./' + req.originalUrl, req.body, { flag: 'w+' }, (err) => {
      if (err) throw err;
    });
  }

  res.status(200).end();
})

let server = app.listen(8584, function () {
  let host = server.address().address;
  let port = server.address().port;

  logger.debug('Family=%s', server.address().family);
  logger.debug('Server http://%s:%s', host, port)
})
