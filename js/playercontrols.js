var Handler = (function () {
  var i = 1,
    listeners = {};

  return {
    addEventListener: function (element, event, handler, capture) {
      element.addEventListener(event, handler, capture);
      listeners[i] = {
        element: element,
        event: event,
        handler: handler,
        capture: capture
      };
      return i++;
    },
    removeEventListener: function (id) {
      if (id in listeners) {
        var h = listeners[id];
        h.element.removeEventListener(h.event, h.handler, h.capture);
        delete listeners[id];
      }
    }
  };
}());

function PlayerControls(player, template) {
  this.isSeeking_ = false;
  this.seekRange_ = { start: 0, end: 0 };
  this.player_ = player;
  this.isLive_ = false;
  this.isUserActive_ = false;
  this.optionDrop = null;
  this.textTracks_ = null;
  this._activeTextTrack = -1;
  this._init(template);

  var ua_result = new UAParser().getResult();
  this.browserName = ua_result.browser.name.toLowerCase();
}

PlayerControls.prototype.destroy = function () {
  this.reset();

  //remove event handlers
  this.handlers_.forEach(function (handler) {
    Handler.removeEventListener(handler);
  });
}

PlayerControls.prototype.reset = function () {
  this.controls.currentTime.innerText = '0:00';
  this.controls.totalTime.innerText = '0:00';
  this.controls.seekBar.value = 0;
  this.isLive_ = false;
  this._isPlaying = false;
  this.seekRange_ = { start: 0, end: 0 };

  // remove existing options div
  if (this.optionDrop != undefined && this.optionDrop != null) {
    document.getElementsByClassName('sd-player__video-controls')[0].removeChild(this.optionDrop);
    this.optionDrop = null;
  }

  this.textTracks_ = null;
  this.controls.closedCaptionsOnButton.style.display = 'none';
  this.controls.closedCaptionsOffButton.style.display = 'none';
}

PlayerControls.prototype._init = function (template) {
  this.videoContainer = template;

  this.controls = {};
  this.controls.playButton = template.querySelector('.sd-player__play-button');
  this.controls.pauseButton = template.querySelector('.sd-player__pause-button');
  this.controls.seekBar = template.querySelector('.sd-player__seek-bar');
  this.controls.muteButton = template.querySelector('.sd-player__mute-button');
  this.controls.unmuteButton = template.querySelector('.sd-player__unmute-button');
  this.controls.volumeBar = template.querySelector('.sd-player__volume-bar');
  this.controls.fullscreenButton = template.querySelector('.sd-player__fullscreen-button');
  this.controls.skipBackButton = template.querySelector('.sd-player__skip-back-button');
  this.controls.skipForwardButton = template.querySelector('.sd-player__skip-forward-button');
  this.controls.goLiveButton = template.querySelector('.sd-player__go-live-button');
  this.controls.closedCaptionsOnButton = template.querySelector('.sd-player__closed-captions-on-button');
  this.controls.closedCaptionsOffButton = template.querySelector('.sd-player__closed-captions-off-button');
  this.controls.optionsButton = template.querySelector('.sd-player__options-button');
  this.controls.bufferingSpinner = template.querySelector('.sd-player__buffering-spinner');
  this.controls.currentTime = template.querySelector('.sd-player__current-time');
  this.controls.totalTime = template.querySelector('.sd-player__total-time');

  var inactivityTimeout;

  var resetDelay = function resetDelay() {
    if (!this.isUserActive_) {
      this.isUserActive_ = true;
      this.videoContainer.classList.remove('user-inactive');
    }

    clearTimeout(inactivityTimeout);

    inactivityTimeout = setTimeout(function () {
      this.videoContainer.classList.add('user-inactive');
      this.isUserActive_ = false;
      // this.optionDrop.style.display = 'none';
    }.bind(this), 2000);
  }.bind(this);
  this.handlers_ = [];
  this.handlers_.push(Handler.addEventListener(this.videoContainer, 'mousemove', resetDelay.bind(this)));

  //this.handlers_.push(Handler.addEventListener(this.videoContainer, 'dblclick', fullscreen));

  // skip back
  function skipBack() {
    if (!this.player_) {
      return;
    }
    var set_time = this.player_.currentTime - 30;
    this.controls.seekBar.value = set_time;
    this.player_.currentTime = set_time;
    this.updateTimeAndSeekRange_();
  }
  this.handlers_.push(Handler.addEventListener(this.controls.skipBackButton, 'click', skipBack.bind(this)));

  // skip forward
  function skipForward() {
    if (!this.player_) {
      return;
    }
    var set_time = this.player_.currentTime + 30;
    this.controls.seekBar.value = set_time;
    this.player_.currentTime = set_time;
    this.updateTimeAndSeekRange_();
  }
  this.handlers_.push(Handler.addEventListener(this.controls.skipForwardButton, 'click', skipForward.bind(this)));

  this.handlers_.push(Handler.addEventListener(this.controls.goLiveButton, 'click', function () {
    this.player_.gotoLive();
  }.bind(this)));

  // subtitle on
  this.handlers_.push(Handler.addEventListener(this.controls.closedCaptionsOnButton, 'click', function () {
    if (this._activeTextTrack !== -1) {
      this.player_.hideAllTextTracks();
    }

    this.controls.closedCaptionsOnButton.style.display = 'none';
    this.controls.closedCaptionsOffButton.style.display = 'block';
  }.bind(this)));

  // subtitle off
  this.handlers_.push(Handler.addEventListener(this.controls.closedCaptionsOffButton, 'click', function () {
    var textTracks = this.player_.textTracks();
    if (this._activeTextTrack !== -1) {
      var textTracks = this.player_.textTracks();
      this.player_.selectTrack(textTracks[this._activeTextTrack]);
    }

    this.controls.closedCaptionsOnButton.style.display = 'block';
    this.controls.closedCaptionsOffButton.style.display = 'none';
  }.bind(this)));

  // play
  this.handlers_.push(Handler.addEventListener(this.controls.playButton, 'click', function () {
    if (!this.player_) {
      return;
    }
    this.player_.play();
  }.bind(this)));

  // pause
  this.handlers_.push(Handler.addEventListener(this.controls.pauseButton, 'click', function () {
    this.player_.pause();
  }.bind(this)));

  // seek
  var seekTimeoutId = null;
  this.handlers_.push(Handler.addEventListener(this.controls.seekBar, 'mousedown', function () {
    this.isSeeking_ = true;
  }.bind(this)));

  // IE doesn't support input event, so use change event instead
  ['input', 'change'].forEach(function (event) {
    this.handlers_.push(Handler.addEventListener(this.controls.seekBar, event, function () {
      // Collect input events and seek when things have been stable for 100ms.
      if (seekTimeoutId) {
        clearTimeout(seekTimeoutId);
        seekTimeoutId = null;

        // Update the UI right away.
        this.updateTimeAndSeekRange_();
      }
      seekTimeoutId = setTimeout(function () {
        seekTimeoutId = null;
        // force seek time is keep with thumbnail time.
        this.player_.currentTime = this._thumbnailSeekTime == null ?
          parseFloat(this.controls.seekBar.value).toFixed(2) : this._thumbnailSeekTime;
      }.bind(this), 10);
    }.bind(this)));
  }.bind(this));

  this.handlers_.push(Handler.addEventListener(this.controls.seekBar, "mousemove", function (event) {
    document.getElementById("sd_player_seek_thumbnail").style.display = "block";
    if (this.player_) {
      var streams = this.player_.getThumbnailStreams();
      if (streams == undefined || streams.length <= 0)
        return;

      var seekBar = document.getElementById('sd_player_seek_bar');
      var pos = getOffset(seekBar);


      var value = -1;

      var leftPos = pos.left;
      var timeButton = document.getElementById('sd-player__current-time_id');
      var timeButtonPos = getOffset(timeButton);
      if (document.fullscreenElement && this.browserName.search("chrome") != -1) {
        var fullElementPos = getOffset(document.fullscreenElement);
        leftPos = (timeButtonPos.left - fullElementPos.left) + timeButtonPos.width +
          timeButton.style.marginLeft;
      }
      value = parseInt(seekBar.min) + (event.clientX - leftPos) * (parseInt(seekBar.max)
        - parseInt(seekBar.min)) / seekBar.offsetWidth;
      if (value > seekBar.max) value = seekBar.max;
      if (value < seekBar.min) value = seekBar.min;
      seekBar.thumbnailSeekPos = value;
      //
      this.ThumbnailPos = document.fullscreenElement ?
        (event.clientX - timeButtonPos.width - timeButton.style.marginLeft)
        : (event.clientX - pos.left);

      var id = streams[0].id;
      this.player_.getThumbnailStreamImages(id, value, thumbnailsCb.bind(this));
    }
  }.bind(this)));

  this.handlers_.push(Handler.addEventListener(this.controls.seekBar, "mouseout", function (event) {
    // document.getElementById("sd_player_seek_thumbnail").style.display = "none";
    var div = document.getElementById("sd_player_seek_thumbnail");
    var list = div.getElementsByTagName("thumbnailImage");
    if (list.length > 0) {
      div.removeChild(list[0]);
    }
  }));

  function thumbnailsCb(thumbnails) {
    var requestTime = thumbnails.requestTime;
    var images = thumbnails.images;
    var checkImage = false;
    if (images.length > 0) {
      var index = 0;
      for (var i = 0; i < images.length; i++) {
        if (requestTime >= images[i].startTime && requestTime < images[i].endTime) {
          index = i;
          checkImage = true;
          break;
        }
      }
      if (checkImage === true) {
        index += 1;
        if (index >= images.length) {
          index = images.length - 1;
        }
      } else {
        //console.log('!!! Not find the image with time. Use difference calc');
        var differenceMax = Number.MAX_SAFE_INTEGER;
        for (var i = 0; i < images.length; i++) {
          var difference = Math.pow(requestTime - images[i].startTime, 2) +
            Math.pow(requestTime - images[i].endTime, 2);
          if (differenceMax > difference) {
            differenceMax = difference;
            index = i;
          }
        }
      }

      this._thumbnailSeekTime = images[index].startTime;
      drawSprite(images[index].url, images[index].topX,
        images[index].topY, images[index].width, images[index].height, this.ThumbnailPos);
    }
  };

  function drawSprite(pic_url, x, y, w, h, ThumbnailPos) {
    var div = document.getElementById("sd_player_seek_thumbnail");
    var list = div.getElementsByTagName("thumbnailImage");
    if (list.length > 0) {
      div.removeChild(list[0]);
    }
    div.style.paddingTop = (150 - h) + 'px';
    var img = document.createElement("thumbnailImage");
    if (document.fullscreenElement) {
      img.style.marginLeft = ThumbnailPos - 34 + 'px';
    } else {
      img.style.marginLeft = ThumbnailPos + 'px';
    }
    img.style.paddingLeft = w + 'px';
    img.style.paddingBottom = h - 16 + 'px';
    img.style.background = 'url(' + pic_url + ') ';
    img.style.zIndex = 4;
    img.style.backgroundPosition = '-' + x + 'px -' + y + 'px';
    div.appendChild(img);
  };

  this.handlers_.push(Handler.addEventListener(this.controls.seekBar, 'mouseup', function () {
    this.isSeeking_ = false;
  }.bind(this)));

  // initialize seek bar with 0
  this.controls.seekBar.value = 0;

  // mute/unmute
  this.handlers_.push(Handler.addEventListener(this.controls.muteButton, 'click', function () {
    this.player_.muted = true;
  }.bind(this)));
  this.handlers_.push(Handler.addEventListener(this.controls.unmuteButton, 'click', function () {
    this.player_.muted = false;
  }.bind(this)));

  // volume
  // IE doesn't support input event, so use change event instead
  ['input', 'change'].forEach(function (event) {
    this.handlers_.push(Handler.addEventListener(this.controls.volumeBar, event, function () {
      this.player_.volume = this.controls.volumeBar.value;
      this.player_.muted = false;
    }.bind(this)));
  }.bind(this));

  // initialize volume display with a fake event
  this.handlers_.push(Handler.addEventListener(this.player_, AdaptivePlayer.EventType.VolumeChange, function (e) {
    this.onVolumeChange();
  }.bind(this)));

  this.onVolumeChange();

  // current time & seek bar updates
  this.handlers_.push(Handler.addEventListener(this.player_, AdaptivePlayer.EventType.TimeUpdate, function (e) {
    //if (!this.isLive_) {
    this.updateTimeAndSeekRange_();
    //}
  }.bind(this)));

  // initialize volume display with a fake event
  this.handlers_.push(Handler.addEventListener(this.player_, AdaptivePlayer.EventType.StateChange, function (event) {
    this.onBuffering(event);
  }.bind(this)));

  this.handlers_.push(Handler.addEventListener(this.player_, AdaptivePlayer.EventType.PlayStart, function (event) {
    this.configure();
  }.bind(this)));

  this.handlers_.push(Handler.addEventListener(this.player_, AdaptivePlayer.EventType.TrackChange, function (event) {
    console.log('Get TrackChange event: ' + event.details.type);
    if (event.details.type == AdaptivePlayer.Kind.TEXT)
      this.configure();
  }.bind(this)));

  //if (this.isLive_) {
  this.handlers_.push(Handler.addEventListener(this.player_, AdaptivePlayer.EventType.SeekRangeChange, function (e) {
    this.seekRange_ = e.details;
  }.bind(this)));
  //}

  // play/pause when pressing spacebar
  // TODO: unbind all the bound events
  this.handlers_.push(Handler.addEventListener(document, 'keyup', function (event) {
    if (event.keyCode === 32) { // SPACE
      if (this._isPlaying) {
        this.player_.pause();
      } else {
        this.player_.play();
      }
    } else if (event.keyCode === 37) { // LEFT ARROW
      skipBack();
    } else if (event.keyCode === 39) { // RIGHT ARROW
      skipForward();
    }
  }.bind(this)));

  // options
  this.handlers_.push(Handler.addEventListener(this.controls.optionsButton, 'click', function () {
    if (this.optionDrop.style.display == 'none' || this.optionDrop.style.display == '') {
      this.optionDrop.style.display = 'block';
    } else {
      this.optionDrop.style.display = 'none';
    }
  }.bind(this)));

  // fullscreen
  this.handlers_.push(Handler.addEventListener(this.controls.fullscreenButton, 'click', function () {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    } else if (document.msFullscreenElement) {
      document.msExitFullscreen();
    } else if (document.mozFullScreenElement) {
      document.mozCancelFullScreen();
    } else {
      if (this.videoContainer.requestFullscreen) {
        this.videoContainer.requestFullscreen();
      } else if (this.videoContainer.webkitRequestFullScreen) {
        this.videoContainer.webkitRequestFullScreen();
      } else if (this.videoContainer.mozRequestFullScreen) {
        this.videoContainer.mozRequestFullScreen();
      } else {
        this.videoContainer.msRequestFullscreen();
      }
    }
  }.bind(this)));

  // fullscreen updates
  this.handlers_.push(Handler.addEventListener(document, 'fullscreenchange', function () {
    var className = 'full-screen';

    if (document.fullscreenElement) {
      this.videoContainer.classList.add(className);
    } else {
      this.videoContainer.classList.remove(className);
    }
  }.bind(this)));
}

/**
 * Called by the application to set the buffering state.
 * @param {boolean} bufferingState
 */

PlayerControls.prototype.onBuffering = function (event) {
  var bufferingState = 'none';

  if (event.details.newState === AdaptivePlayer.State.PAUSED) {
    this._isPlaying = false;
    if (!this.isSeeking_) {
      this.controls.pauseButton.style.display = 'none';
      this.controls.playButton.style.display = 'block';
    }
  } else if (event.details.newState === AdaptivePlayer.State.STARTPLAY) {
    this._isPlaying = true;
    this.controls.playButton.style.display = 'none';
    this.controls.pauseButton.style.display = 'block';
  }

  if (event.details.newState === AdaptivePlayer.State.PLAYING)
    bufferingState = 'none';
  else if (event.details.newState === AdaptivePlayer.State.SEEKING || event.details.newState === AdaptivePlayer.State.BUFFERING)
    bufferingState = 'none';
  this.controls.bufferingSpinner.style.display = bufferingState;
}

PlayerControls.prototype.onVolumeChange = function () {
  if (this.player_.muted) {
    this.controls.muteButton.style.display = 'none';
    this.controls.unmuteButton.style.display = 'block';
  } else {
    this.controls.unmuteButton.style.display = 'none';
    this.controls.muteButton.style.display = 'block';
  }

  this.controls.volumeBar.value = this.player_.muted ? 0 : this.player_.volume;

  var gradient = ['to right'];
  gradient.push('rgba(255, 255, 255, 1)  ' + this.controls.volumeBar.value * 100 + '%'); // volume level
  gradient.push('rgba(255, 255, 255, 0.4)  ' + this.controls.volumeBar.value * 100 + '%'); //min volume
  gradient.push('rgba(255, 255, 255, 0.4)  100%'); //max volume
  this.controls.volumeBar.style.background = 'linear-gradient(' + gradient.join(',') + ')';
}

PlayerControls.prototype.setLive = function (liveState) {
  this.isLive_ = liveState;
}

PlayerControls.prototype.setTextTracks = function (tracks) {
  this.textTracks_ = tracks;
}

PlayerControls.prototype.updateTimeAndSeekRange_ = function () {
  var showHour;
  var displayTime = this.player_.currentTime;

  if (this.isSeeking_) {
    //seekBar = document.getElementById('seek-bar')
    displayTime = parseFloat(this.controls.seekBar.value);
  }

  // Set |currentTime|.
  if (this.isLive_) {
    this.controls.currentTime.innerText = toDateString(this.seekRange_.start);
    this.controls.totalTime.innerText = toDateString(displayTime);
    this.controls.seekBar.min = parseFloat(this.seekRange_.start);
    this.controls.seekBar.max = parseFloat(this.seekRange_.end);
    this.controls.seekBar.value = displayTime;
  } else {
    showHour = this.player_.duration >= 3600;
    this.controls.currentTime.innerText = buildTimeString_(displayTime, showHour);

    this.controls.seekBar.min = 0;
    this.controls.seekBar.max = this.player_.duration;
    this.controls.seekBar.value = displayTime;

    this.controls.totalTime.innerText = buildTimeString_(this.player_.duration, showHour);
  }

  var gradient = ['to right'];
  var buffered = this.player_.buffered;

  if (buffered.length === 0) {
    gradient.push('red 0%');
  } else {
    // NOTE: the fallback to zero eliminates NaN.
    var bufferStartFraction = buffered.start(0) / this.player_.duration || 0;
    var bufferEndFraction = buffered.end(0) / this.player_.duration || 0;
    var playheadFraction = this.player_.currentTime / this.player_.duration || 0;

    if (this.isLive_) {
      if (this.player_._playerType === AdaptivePlayer.PlayerType.NATIVE) {
        if (this.player_._player._seekEnded === false) {
          return;
        }
        var seekRangeSize = this.seekRange_.end - this.seekRange_.start;
        var playheadDistance = this.player_._player.relTimeToAbsTime(this.player_.currentTime) - this.seekRange_.start;
        bufferStartFraction = 0;
        bufferEndFraction = 0;
        playheadFraction = playheadDistance / seekRangeSize || 0;
        //console.log('updateTimeAndSeekRange_: playheadFraction=', playheadFraction);
      } else {
        var bufferStart = Math.max(buffered.start(0), this.seekRange_.start);
        var bufferEnd = Math.min(buffered.end(0), this.seekRange_.end);
        var seekRangeSize = this.seekRange_.end - this.seekRange_.start;
        var bufferStartDistance = bufferStart - this.seekRange_.start;
        var bufferEndDistance = bufferEnd - this.seekRange_.start;
        var playheadDistance = this.player_.currentTime - this.seekRange_.start;
        bufferStartFraction = bufferStartDistance / seekRangeSize || 0;
        bufferEndFraction = bufferEndDistance / seekRangeSize || 0;
        playheadFraction = playheadDistance / seekRangeSize || 0;
      }
    }

    gradient.push('rgba(255, 255, 255, 1) ' + bufferStartFraction * 100 + '%'); //elapsed time (pre plahead)
    gradient.push('#ccc ' + (bufferStartFraction * 100) + '%');
    gradient.push('#ccc ' + (playheadFraction * 100) + '%');
    gradient.push('#444 ' + (playheadFraction * 100) + '%');
    gradient.push('#444 ' + (bufferEndFraction * 100) + '%');
    gradient.push('rgba(255, 255, 255, .4) ' + bufferEndFraction * 100 + '%'); //yet to be played (post plahead)
  }
  this.controls.seekBar.style.background = 'linear-gradient(' + gradient.join(',') + ')';
}

PlayerControls.prototype.configure = function () {
  // this.reset();

  var textTracks = this.player_.textTracks();
  var audioTracks = this.player_.audioTracks();
  var videoTracks = this.player_.videoTracks();
  this.isLive_ = this.player_.isLive();

  this.controls.goLiveButton.style.display = this.isLive_ ? 'block' : 'none';

  if ((videoTracks && videoTracks.length > 1) || (textTracks && textTracks.length > 0) || (audioTracks && audioTracks.length > 1)) {
    this.controls.optionsButton.style.display = 'block';
  } else {
    this.controls.optionsButton.style.display = 'none';
  }

  // remove existing options div
  if (this.optionDrop != undefined && this.optionDrop != null) {
    document.getElementsByClassName('sd-player__video-controls')[0].removeChild(this.optionDrop);
    this.optionDrop = null;
  }

  this.optionDrop = document.createElement('div');
  this.optionDrop.classList.add('optionDrop');
  this.optionDrop.innerHTML = this._buildOptionsTemplate();
  document.getElementsByClassName('sd-player__video-controls')[0].appendChild(this.optionDrop);

  if (videoTracks.length > 1) {
    this.optionDrop.querySelector('[name=video-options]').addEventListener('change', function (event) {
      var tracks = videoTracks.filter(function (track) {
        return track.id.toString() === (event.target.value);
      });
      if (tracks.length > 0)
        this.player_.selectTrack(tracks[0]);
      else
        this.player_.setAdaption(true);
      this.optionDrop.style.display = 'none';
    }.bind(this));
  }
  if (audioTracks.length > 1) {
    this.optionDrop.querySelector('[name=audio-options]').addEventListener('change', function (event) {
      this.player_.selectTrack(audioTracks.filter(function (track) {
        return track.id.toString() === (event.target.value);
      })[0]);
      this.optionDrop.style.display = 'none';
    }.bind(this));
  }
  if (textTracks.length > 0) {
    this.optionDrop.querySelector('[name=text-options]').addEventListener('change', function (event) {
      if (event.target.value === "off")
        this.player_.hideAllTextTracks();
      else {
        this.player_.selectTrack(textTracks.filter(function (track) {
          return track.id.toString() === (event.target.value);
        })[0]);
        this._activeTextTrack = -1;
        for (var i = textTracks.length - 1; i >= 0; i--) {
          if (textTracks[i].id.toString() === event.target.value.toString()) {
            this._activeTextTrack = i;
            break;
          }
        }
      }
      this.optionDrop.style.display = 'none';
    }.bind(this));
  }
}

PlayerControls.prototype._buildOptionsTemplate = function () {
  var audioTracks = this.player_.audioTracks();
  var videoTracks = this.player_.videoTracks();
  var textTracks = this.player_.textTracks();

  if (videoTracks && videoTracks.length > 1) {
    var videoOptions = videoTracks.reduce(function (previousValue, currentValue) {
      return previousValue + '\n        <option value="' + currentValue.id + '">' + currentValue.bandwidth + '</option>';
    }.bind(this), '');

    var videoSelect = '<div class="select-container">\n      <label>Quality</label>\n      <select name="video-options"><option value="auto" selected>AUTO</option>' + videoOptions + '</select>\n    </div>';
  } else {
    videoSelect = '';
  }

  if (audioTracks && audioTracks.length > 1) {
    var audioOptions = audioTracks.reduce(function (previousValue, currentValue) {
      return previousValue + '\n        <option value="' + currentValue.id + '" ' + (currentValue.active ? 'selected' : '') + '>' + currentValue.name + '</option>';
    }.bind(this), '');

    var audioSelect = '<div class="select-container">\n      <label>Audio</label>\n      <select name="audio-options">' + audioOptions + '</select>\n    </div>';
  } else {
    audioSelect = '';
  }

  this._activeTextTrack = -1;
  if (textTracks && textTracks.length > 0) {
    var textOptions = textTracks.reduce(function (previousValue, currentValue) {

      return previousValue + '\n        <option value="' + currentValue.id + '" ' + (currentValue.active ? 'selected' : '') + '>' + currentValue.name + '</option>';
    }.bind(this), '');

    var textSelect = '<div class="select-container">\n      <label>Subtitles</label>\n      <select name="text-options"><option value="off">OFF</option>' + textOptions + '</select>\n    </div>';
  } else {
    textSelect = '';
  }

  return '<div class="sd-player__options">' + videoSelect + ' ' + audioSelect + ' ' + textSelect + '</div>';
}