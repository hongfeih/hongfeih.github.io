var fs = require('fs');

function sbrM3u8(url) {
  return /(\/hls\/.+)\/(.+(_\d+)\.(m3u8))(.*)/i.exec(url) != null;
}

function isM3u8(url) {
  return /(\/hls\/.+)\/.+\.(m3u8)(.*)/i.exec(url) != null;
}

function isMPD(url) {
  return /(\/dash\/.+)\/.+\.(mpd)(.*)/i.exec(url) != null;
}

// SBR stream
class PlaylistUnit {
  constructor(url, type, config, mbr, logger) {
    this.url = url;
    this.type = type;
    this.number = 0;
    this.mbr = mbr;
    this.config = config;
    this.playlist = isM3u8(this.url) || isMPD(this.url);
    this.lastPlaylist = null;
    this.logger = logger;
  }

  destroy() {
    this.url = null;
    this.type = '';
    this.number = 0;
    this.mbr = false;
    this.config = {
      align: 2,
      start: 0
    };
    this.playlist = false;
    this.lastPlaylist = null;
    this.logger = null;
  }

  getDashPlaylistName(number) {
    var name = '';
    if (this.url) {
      var match = /(\/dash\/.+\/.+)\.(mpd|webvtt|m4s|jpg)/i.exec(this.url);
      if (match) {
        var next = '.' + match[1] + '.' + match[2];
        if (!this.playlist) {
          // MBR or segment
          try {
            fs.accessSync(next, fs.constants.R_OK);
            name = next;
          } catch (err) {
            this.logger.error('Cannot load url=%s', next);
          }
        } else {
          var index = (number == -1) ? this.config.start : number;
          next = '.' + match[1] + '_' + this.getPadding(index + 1) + (index + 1) + '.' + match[2];
          try {
            fs.accessSync(next, fs.constants.R_OK);
            name = next;
            this.number = index + 1;
            this.lastPlaylist = name;
          } catch (err) {
            if (this.lastPlaylist) {
              name = this.lastPlaylist;
            }
            this.logger.error('Cannot load url=%s, index=%d. Return last=%s', next, index, this.lastPlaylist);
          }
        }
        this.logger.debug('get file=%s, url=%s, number=%d', name, this.url, this.number);
      }
    }
    return this.absName_(name);
  }

  getHlsPlaylistName(number) {
    var name = '';
    if (this.url) {
      var match = /(\/hls\/.+\/.+)\.(m3u8|webvtt|ts|aac|jpg)/i.exec(this.url);
      if (match) {
        var next = '.' + match[1] + '.' + match[2];
        if (this.mbr || !this.playlist) {
          // MBR or segment
          try {
            fs.accessSync(next, fs.constants.R_OK);
            name = next;
          } catch (err) {
            this.logger.error('Cannot load url=%s', next);
          }
        } else {
          var index = (number == -1) ? this.config.start : number;
          next = '.' + match[1] + '_' + this.getPadding(index + 1) + (index + 1) + '.' + match[2];
          try {
            fs.accessSync(next, fs.constants.R_OK);
            name = next;
            this.number = index + 1;
            this.lastPlaylist = name;
          } catch (err) {
            if (this.lastPlaylist) {
              name = this.lastPlaylist;
            }
            this.logger.error('Cannot load url=%s, index=%d. Return last=%s', name, index, this.lastPlaylist);
          }
        }
        this.logger.debug('get file=%s, url=%s, number=%d', name, this.url, this.number);
      }
    }
    return this.absName_(name);
  }

  getPlaylistName(number) {
    var name = '';
    if (this.type === 'hls') {
      name = this.getHlsPlaylistName(number);
    } else if (this.type === 'dash') {
      name = this.getDashPlaylistName(number);
    }
    return name;
  }

  absName_(name) {
    var absName = '';
    if (name) {
      var match = /\.(.+)/.exec(name);
      if (match) {
        absName = __dirname + match[1];
      }
    }
    return absName;
  }

  getPlaylistContent(number) {
    var buffer = null;
    var absName = this.getPlaylistName(number);
    if (absName != '') {
      buffer = fs.readFileSync(absName);
    }
    return buffer;
  }

  getPadding(number) {
    var length = number.toString().length;
    var padding = this.config.align - length;
    if (padding < 0) {
      padding = 0;
    }
    var paddingStr = '';
    for (var index = 0; index < padding; index++) {
      paddingStr = paddingStr + '0';
    }
    return paddingStr;
  }

  makeCookie() {
    var value = '';
    if (this.url) {
      value = this.url + ',' + this.number;
    }
    return value;
  }

  getNumber() {
    return this.number;
  }
}

// MBR stream
class PlayUnit {
  constructor(id, type, mbrUrl, logger) {
    this.id = id;
    this.playlists = [];
    this.lastTime = null;
    this.config = {
      align: 2,
      start: 0
    };
    this.mbrUrl = mbrUrl;
    this.logger = logger;
    this.type = type;

    this.readConfig_();
    this.addPlaylistUnit_(mbrUrl, true);
  }

  destory() {
    this.id = null;
    this.playlists = [];
    this.lastTime = null;
    this.config = {
      align: 2,
      start: 0
    };
    this.mbrUrl = null;
    this.logger = null;
    this.type = '';
  }

  readConfig_() {
    var match = /((\/(?:hls|dash)\/.+)\/.+)\.(m3u8|mpd)/i.exec(this.mbrUrl);
    if (match) {
      this.path = match[2]; 
      try {
        var config = JSON.parse(fs.readFileSync('.' + this.path + '/' + 'param.json'));
        this.config.align = config.align ? config.align : 2;
        this.config.start = config.start ? config.start : 0;
      } catch (err) {
        this.logger.debug('Cannot find param config. url=%s', this.path);
      } 
    } 
  }

  reSet() {
    this.playlists = [];
    this.addPlaylistUnit_(this.mbrUrl, true);
  }

  getId() {
    return this.id;
  }

  addPlaylistUnit_(url, mbr) {
    var playlist = new PlaylistUnit(url, this.type, this.config, mbr, this.logger);
    this.playlists.push(playlist);
    return playlist;
  }


  getPlaylistUnit_(url) {
    var playlist = null;
    for (var i = 0; i < this.playlists.length; i++) {
      if (url === this.playlists[i].url) {
        playlist = this.playlists[i];
        break;
      }
    }
    return playlist;
  }

  getPlaylistName_(url, number) {
    var name = '';
    var playlistUnit = this.getPlaylistUnit_(url);
    if (playlistUnit) {
      name = playlistUnit.getPlaylistName(number);
    }
    return name;
  }

  getPlaylistContent_(url, number) {
    var content = null;
    var playlistUnit = this.getPlaylistUnit_(url);
    if (playlistUnit) {
      content = playlistUnit.getPlaylistContent(number);
    }
    return content;
  }

  getFileName_(url) {
    var name = '';
    if (url) {
      var match = /(\/(?:hls|dash)\/.+\/.+)\.(m4s|webvtt|ts|aac|jpg)/i.exec(url);
      if (match) {
        var next = '.' + match[1] + '.' + match[2];
        try {
          fs.accessSync(next, fs.constants.R_OK);
          name = next;
        } catch (err) {
          this.logger.error('Cannot load file=%s, url=%s', name, url);
        }
        this.logger.debug('get file=%s, url=%s', name, url);
      }
      if (name) {
        var nameMatch = /\.(.+)/.exec(name);
        if (nameMatch) {
          name = __dirname + nameMatch[1];
        }
      }
    }
    return name;
  }

  getFileContent_(url) {
    var buffer = null;
    var absName = this.getFileName_(url);
    if (absName != '') {
      buffer = fs.readFileSync(absName);
    }
    return buffer;
  }

  getResponseFileName(url, number) {
    var name = '';
    if (isM3u8(url) || isMPD(url)) {
      name = this.getPlaylistName_(url, number);
    } else {
      name = this.getFileName_(url);
    }
    return name;
  }

  getResponseFile(url, number) {
    var content = null;
    if (isM3u8(url) || isMPD(url)) {
      content = this.getPlaylistContent_(url, number);
    } else {
      content = this.getFileContent_(url);
    }
    return name;
  }

  getSSCookie() {
    var content = '';
    for (var i = 0; i < this.playlists.length; i++) {
      if (content == '') {
        content = this.playlists[i].makeCookie();
      } else {
        content = content + ',' + this.playlists[i].makeCookie();
      }
    }
    this.logger.debug('getSSCookie: id=%s, mbrurl=%s, cookie=%s', this.id, this.mbrUrl, content);
    content = Buffer.from(content).toString('base64');
    return content;
  }

  getMimeType(type) {
    var mime = 'application/octet-stream';
    if (type == 'ts') {
      mime = 'video/mp2t';
    } else if (type == 'm3u8' || type == 'm3u') {
      mime = 'application/x-mpegurl';
    } else if (type == 'webvtt') {
      mime = 'text/plain';
    } else if (type == 'jpg') {
      mime = 'image/jpeg';
    }
    return mime;
  }

  parseCookie_(ssCookie) {
    var pairs = [];
    var cookie = Buffer.from(ssCookie, 'base64').toString('utf8');
    if (cookie) {
      var content = cookie.split(',');
      if (content && (content.length % 2 == 0)) {
        for (var i = 0; i < content.length; i+=2) {
          pairs.push({
            path: content[i],
            number: content[i+1]
          });
        }
      }
    }
    return pairs;
  }

  getUrlNumber(ssCookie, url, mbr) {
    var number = -1;
    if (isM3u8(url) || isMPD(url)) {
      if (!mbr || isMPD(url)) {
        var playlistUnit = this.getPlaylistUnit_(url);
        if (playlistUnit == null) {
          this.addPlaylistUnit_(url, false);
        }

        var pairs = this.parseCookie_(ssCookie);
        for (var i = 0; i < pairs.length; i++) {
          if (url == pairs[i].path) {
            number = Number(pairs[i].number);
            break;
          }
        }
      }
      this.logger.debug('getUrlNumber: URL=%s, number=%d', url, number);
    }
    return number;
  }
}

// Manager MBR streams
class PlayManager {
  constructor(logger) {
    this.playUnits = {};
    this.logger = logger;
  }

  destory() {
    this.playUnits = {};
    this.logger = null;
  }

  existPlayUnit(id) {
    return this.playUnits[String(id)];
  }

  getPlayUnit(id, type, url, mbr) {
    var playUnit = this.playUnits[String(id)];
    if (playUnit == null) {
      if ((mbr && type == 'hls') || type == 'dash') {
        playUnit = new PlayUnit(id, type, url, this.logger);
        this.playUnits[id.toString()] = playUnit;
      } else {
        this.logger.debug('No ssplayid in url, ssplayid in cookie. Not deal this m3u8 request.');
      }
    } else {
      if ((type == 'hls' || type == 'dash') && (isM3u8(url) || isMPD(url)) && mbr) {
        if (isM3u8(url) && mbr) {
          playUnit.reSet();
          this.logger.debug('reset play unit. id=%s, url=%s', id, url);
        }
      } else if (type == 'dash' ) {
        // playUnit.reSet();
        // this.logger.debug('reset play unit. id=%s, url=%s', id, url);
      }
    }
    return playUnit;
  }

  delPlayUnit(id) {
    this.playUnits[String(id)] = undefined;
  }

  parseHlsUrl(url) {
    var info = {valid: false};
    var match = /(\/hls\/.+)\/(.+\.(m3u8|webvtt|ts|aac|jpg))(.*)/i.exec(url);
    if (match) {
      info.valid = true;
      info.path = match[1];
      info.fileFullName = match[2];
      info.type = match[3];
      info.param = match[4] ? match[4] : '';
      if (info.param) {
        var matchParam = /.*(\?|&)(ssPlayId=([^&]+)?(&?.*))/i.exec(info.param);
        if (matchParam) {
          info.ssPlayId = matchParam[3];
        }
      }
    }
    return info;
  }

  parseDashUrl(url) {
    var info = {valid: false};
    var match = /(\/dash\/.+)\/(.+\.(mpd|webvtt|m4s|jpg))(.*)/i.exec(url);
    if (match) {
      info.valid = true;
      info.path = match[1];
      info.fileFullName = match[2];
      info.type = match[3];
      info.param = match[4] ? match[4] : '';
      if (info.param) {
        var matchParam = /.*(\?|&)(ssPlayId=([^&]+)?(&?.*))/i.exec(info.param);
        if (matchParam) {
          info.ssPlayId = matchParam[3];
        }
      }
    }
    return info;
  }

}

module.exports = {
  PlayManager,
  PlayUnit
};
