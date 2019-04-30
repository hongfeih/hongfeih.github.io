var pad = function (n, width, z) {
  z = z || '0';
  width = width || 2;
  n = n.toString();
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};
var pad2 = function (num) {
  return (num < 10) ? ('0' + num) : num;
};
var formatDuration = function (seconds, withMS) {
  var hh = pad2(Math.floor(seconds / 3600));
  var mm = pad2(Math.floor(seconds / 60 - hh * 60));
  var ss = pad2(Math.floor(seconds % 60));

  var result = hh + ":" + mm + ":" + ss;
  if (withMS) {
    result += '.' + pad(parseInt((seconds * 1000) % 1000), 3);
  }
  return result;
};

function parse_query_string(query) {
  var vars = query.split("&");
  var query_string = {};
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = decodeURIComponent(pair[1]);
      // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
      query_string[pair[0]] = arr;
      // If third or later entry with this name
    } else {
      query_string[pair[0]].push(decodeURIComponent(pair[1]));
    }
  }
  return query_string;
}

var query_string = (window.location.search != '') ? window.location.search.substring(1) : window.location.hash.substring(1);
var parsed_qs = parse_query_string(query_string);

/*
if(!!parsed_qs.uncompiled) {
  $.getMultiScripts([
    "shaka-player/third_party/closure/goog/base.js",
    "shaka-player/dist/deps.js",
    "shaka-player/shaka-player.uncompiled.js",
    "neulion/uncompiled.extend.js",
    "hls.js/hls.js",
    "js/uncompiled.js"
  ], '').done(function () {
    console.log("loaded uncompiled libraries.");
  });
}
*/

var myApp = angular.module('myApp', ['ui.bootstrap', 'ngCookies']);
var ua_result = new UAParser().getResult();
var browserName = ua_result.browser.name;
var browserVersion = ua_result.browser.version;
var os = ua_result.os.name + ' ' + ua_result.os.version;

var video = document.getElementById('video_main');
var player = new AdaptivePlayer(video);
player.setLogLevel(AdaptivePlayer.LogLevel.DEBUG);

// set h/w limitation
//player.setMaxHardwareResolution(720, 480);

window.player = window.mainPlayer = player;
var playcontrols_div = document.getElementsByClassName('sd-player__video-container')[0];
window.playerControls = new PlayerControls(player, playcontrols_div);

window.childPlayers = []; //for 4-views

var rewindTimer;
var rewindRate = 1.0;
function resetRewind() {
  var seekBar = document.getElementById('sd_player_seek_bar');
  if (seekBar != null) seekBar.thumbnailSeekPos = null;
  clearInterval(rewindTimer);
  rewindRate = 1.0;
}
function saveSettings($scope, $cookies) {
  var app_cookie = {};

  app_cookie.appServer = $scope.ui.appServer;
  app_cookie.provider = $scope.ui.provider;
  app_cookie.programId = $scope.ui.programId;
  app_cookie.username = $scope.ui.username;
  app_cookie.password = $scope.ui.password;
  app_cookie.licenseServer_PR = $scope.ui.licenseServer_PR;
  app_cookie.licenseServer_WV = $scope.ui.licenseServer_WV;
  app_cookie.licenseServer_FP = $scope.ui.licenseServer_FP;
  app_cookie.certUrl = $scope.ui.certUrl;

  $cookies.putObject('appProps', app_cookie);
}

function retrieveSettings($scope, $cookies) {
  var app_cookie = $cookies.getObject('appProps');
  if (!app_cookie) {
    app_cookie = {};
  }

  $scope.ui.appServer = app_cookie['appServer'] ? app_cookie['appServer'] : 'http://neuvideo.neulion.net.cn/';
  if (app_cookie['provider']) {
    $scope.ui.provider = app_cookie['provider'];
  } else {
    if ($scope.ui.browser.indexOf('Safari') >= 0) {
      $scope.ui.provider = 'kylintv';
    } else {
      $scope.ui.provider = 'neulion';
    }
    $scope.ui.provider = 'drm_videos';
  }

  $scope.ui.programId = app_cookie['programId'] ? app_cookie['programId'] : '10001';
  $scope.ui.username = app_cookie['username'] ? app_cookie['username'] : 'jia.xu@neulion.com.cn';
  $scope.ui.password = app_cookie['password'] ? app_cookie['password'] : 'neu123';
  $scope.ui.licenseServer_PR = app_cookie['licenseServer_PR'] ? app_cookie['licenseServer_PR'] : 'https://staging-lic2playready.sd-ngp.net/standard-licensing/rightsmanager.asmx';
  $scope.ui.licenseServer_WV = app_cookie['licenseServer_WV'] ? app_cookie['licenseServer_WV'] : 'https://staging-lic2widevine.sd-ngp.net/proxy';
  $scope.ui.licenseServer_FP = app_cookie['licenseServer_FP'] ? app_cookie['licenseServer_FP'] : 'https://staging-lic2fairplay.sd-ngp.net/licensing';
  $scope.ui.certUrl = app_cookie['certUrl'] ? app_cookie['certUrl'] : 'https://staging-lic2fairplay.sd-ngp.net/licensing';
}

myApp.controller('AppCtrl', function ($scope, $http, $cookies) {
  $(".draggable").draggable();
  $scope.ui = {};
  $scope.ui.supportedDRMs = [];
  $scope.ui.supportedStreaming = [];
  $scope.ui.playerVersion = AdaptivePlayer.version;
  $scope.ui.coreVersion = AdaptivePlayer.coreVersion;

  $scope.ui.browser = browserName + ' ' + browserVersion;
  $scope.ui.os = os;
  $scope.ui.ctrl = {};
  $scope.ui.ctrl.fourViewsEnable = false;
  $scope.ui.ctrl.isDisplay4Views = false;
  $scope.ui.ctrl.synchronize = false;
  $scope.ui.syncTimeOffset = 0;
  $scope.ui.ctrl.isDisplayPip = true;
  $scope.ui.ctrl.displaySeek = false;
  $scope.ui.ctrl.isDisplay360Views = true;
  $scope.ui.isAutoSwitch = true;
  $scope.ui.id3Event = '';

  $scope.ui.qosEnable = false;
  $scope.ui.qosUrl = 'http://172.16.0.203:8114/receiver-2.5.0/ProxyBean';
  $scope.ui.ctrl.displayQoS = false;

  $scope.ui.startBitrate = undefined;
  $scope.ui.startPosition = undefined;

  $scope.ui.drm_token_server = "http://172.16.0.188:8889/token";
  $scope.ui.drm_client_id = "nba";
  $scope.ui.drm_stream_id = '2C1AC1F2-05E6-4867-AE5A-2329CBBE6DE5';
  $(token_license_server).prop("value", "staging");

  if (parsed_qs) {
    if (parsed_qs.url)
      $scope.ui.ppt = parsed_qs.url;
    if (parsed_qs.cro)
      $scope.ui.cro_token = 'bearer ' + parsed_qs.cro;
    if (parsed_qs.ls)
      $(token_license_server).prop("value", parsed_qs.ls);
    if (parsed_qs.startPosition) 
      $scope.ui.startPosition = parsed_qs.startPosition;
    if (parsed_qs.startBitrate)
      $scope.ui.startBitrate = parsed_qs.startBitrate;
  }
  
  retrieveSettings($scope, $cookies);

  //load test streams
  $http.get('sources.json')
    .then(function (res) {
      $scope.availableStreams = res.data.items;
    });

  $scope.setStream = function (item) {
    $scope.selectedItem = JSON.parse(JSON.stringify(item));
    $scope.ui.ppt = $scope.selectedItem.url;
    if ($scope.selectedItem && $scope.selectedItem.type != undefined) 
      $(token_license_server).prop("value", $scope.selectedItem.type);
    if ($scope.selectedItem && $scope.selectedItem.client != undefined)
      $(token_client).prop("value", $scope.selectedItem.client);
    if ($scope.selectedItem && $scope.selectedItem.eid != undefined)
      $scope.ui.drm_stream_id = $scope.selectedItem.eid;
  };

  // load config
  $http.get('config.json')
    .then(function (res) {
      $scope.playerConfigurations = res.data.PLAYER_CONFIGURATIONS;
      $scope.drmConfigurations = res.data.DRM_LICENSE_SERVERS;
      $scope.drmServers = [];
      for(name in $scope.drmConfigurations) $scope.drmServers.push(name);
      $scope.tokenServers = res.data.TOKEN.SERVERS;
      $scope.tokenClients = res.data.TOKEN.CLIENTS;
      setTimeout(function() {
        if (parsed_qs && parsed_qs.url) {
          $scope.loadVideo();
        }
      }, 500);
    });

  $scope.getDRMToken = function () {
    var request = new XMLHttpRequest();
    request.open('GET', $(token_server).prop("value") + '?ls=' + $(token_license_server).prop("value") + '&client=' + $(token_client).prop("value") + '&eid=' + $scope.ui.drm_stream_id + '&offline=false', true);  // `false` makes the request synchronous
    request.send(null);

    $(drm_token_loading).prop("class", "show pull-right");
    request.onload = function (e) {
      if (this.status == 200 || this.status == 304) {
        $scope.ui.cro_token = request.responseText;
        $('#getTokenModal').modal('hide');
        $(drm_token_loading).prop("class", "hide pull-right");
        $scope.$apply();
      }
    };
  }

  $scope.play = function () {
    resetRewind();
    window.player.play();
  };

  $scope.pause = function () {
    resetRewind();
    window.player.pause();
  };

  $scope.stop = function () {
    resetRewind();
    $scope.ui.id3Event = '';
    window.player.stop();
    window.playerControls.reset();
  };

  $scope.nextFrame = function () {
    resetRewind();
    if (window.player.getState() == "playing")
      window.player.pause();
    window.player.currentTime += (1 / 29.97);
  };

  $scope.lastFrame = function () {
    resetRewind();
    if (window.player.getState() == "playing")
      window.player.pause();
    window.player.currentTime -= (1 / 29.97);
  };

  $scope.stepTo = function () {
    resetRewind();
    if (window.player.getState() == "playing")
      window.player.pause();

    var setpTo = document.getElementById("id-col-sm-6-setpTo");
    var reg = /(\d{0,2}):(\d{0,2}):(\d{0,2})(?:\.(\d{0,2})f(\d{0,2}\.\d{0,2})?)?/;
    var matches = reg.exec(setpTo.value);
    var hh = (matches[1] != undefined) ? Number(matches[1]) : 0;
    var mm = (matches[2] != undefined) ? Number(matches[2]) : 0;
    var ss = (matches[3] != undefined) ? Number(matches[3]) : 0;
    var ff = (matches[4] != undefined) ? Number(matches[4]) : 0;
    var tff = (matches[5] != undefined) ? Number(matches[5]) : 29.97;
    window.player.currentTime = hh * 3600 + mm * 60 + ss + ff / tff;
  };

  $scope.normalPlay = function () {
    resetRewind();
    if (window.player.getState() != "playing") {
      window.player.play();
    }
    window.player.playbackRate = 1;
  };

  $scope.fastForward = function () {
    resetRewind();
    if (window.player.getState() != "playing") {
      window.player.play();
    }
    window.player.playbackRate = window.player.playbackRate > 16 ? 32 : window.player.playbackRate * 2;
  };

  $scope.slowForword = function () {
    resetRewind();
    if (window.player.getState() != "playing") {
      window.player.play();
    }
    window.player.playbackRate = window.player.playbackRate <= 0.125 ? 0.125 : window.player.playbackRate / 2;
  };

  $scope.fastRewind = function () {
    clearInterval(rewindTimer);
    rewindRate = rewindRate > 16 ? 32 : rewindRate * 2;
    if (rewindRate == 1) {
      window.player.play();
      return;
    }

    if (window.player.getState() == "playing")
      window.player.pause();

    rewindTimer = setInterval(function () {
      window.player.currentTime -= rewindRate / 2;
    }, 500);
  };

  $scope.slowRewind = function () {
    clearInterval(rewindTimer);
    rewindRate = rewindRate <= 0.125 ? 0.125 : rewindRate / 2;
    if (rewindRate == 1) {
      window.player.play();
      return;
    }

    if (window.player.getState() == "playing")
      window.player.pause();

    rewindTimer = setInterval(function () {
      window.player.currentTime -= rewindRate / 2;
    }, 500);
  };

  // qos relative start
  $scope.qosConfig = function () {
    return {
      'type': 'video',
      'playerId': 'video_main',
      'id': 12345678,
      'appVersion': AdaptivePlayer.version,
      'siteID': 'nfl',
      'networkType': 'landline',
      'appType': 'desktop',
      'deviceType': 'desktop',
      'productID': 'h5TestPlayer',
      'playerVersion': AdaptivePlayer.coreVersion,
      'receiverURL': $scope.ui.qosUrl,
      'vHBInterval': 30,
      //'xuID' : {},
      //'custom' : {},
      //'userID' : 'logan',
      //'userType' : '',
    }
  };

  $scope.qosStreamConfig = function () {
    var stats = window.player.getStats();
    var required = {
      'streamDescription': 'neulion h5 player test',
      'streamURL': stats.url ? stats.url : $scope.ui.ppt,
      'streamLength': (stats.duration && stats.duration != Infinity) ? Math.round(Number(stats.duration)) : -1,
      'bitrate': stats.bitrate,
      'bandwidth': stats.bandwidth,
      'vs': !!stats.isLive ? 1 : 3,
    };
    return $scope.mergeConfig(required, stats);
  };
  // merge A &  B and return the new object.
  $scope.mergeConfig = function (configA, configB) {
    var ret = {};
    for (var property in configA) {
      if (!configA.hasOwnProperty(property))
        continue;
      ret[property] = configA[property];
    }
    for (property in configB) {
      if (!configB.hasOwnProperty(property))
        continue;
      ret[property] = configB[property];
    }
    return ret;
  };

  [
    { 'name': AdaptivePlayer.EventType.PlayEnd, 'newName': 'nlvideocomplete' },
    { 'name': AdaptivePlayer.EventType.Error, 'newName': 'nlvideoerror' },
    { 'name': AdaptivePlayer.EventType.StateChange, 'newName': 'nlvideostate' }
  ].forEach(function (event) {
    window.player.addEventListener(event.name, function (evt) {
      if (event.newName === 'nlvideoerror') {
        var stats = $scope.mergeConfig($scope.qosConfig(), $scope.qosStreamConfig());
        stats.error = evt.details;
        nlTriggerEvent(event.newName, 'video_main', stats);
      } else {
        nlTriggerEvent(event.newName, 'video_main', evt);
      }
    });
  });

  [
    { 'name': AdaptivePlayer.EventType.PlayStart, 'newName': 'nlvideostart' },
    { 'name': AdaptivePlayer.EventType.VolumeChange, 'newName': 'nlvideostatus' },
    { 'name': AdaptivePlayer.EventType.SeekRangeChange, 'newName': 'nlvideostatus' },
    { 'name': AdaptivePlayer.EventType.TimeUpdate, 'newName': 'nlTrackVideoTimeUpdate' },
  ].forEach(function (event) {
    window.player.addEventListener(event.name, function () {
      nlTriggerEvent(event.newName, 'video_main', $scope.mergeConfig($scope.qosConfig(), $scope.qosStreamConfig()));
    })
  });

  [
    { 'name': 'fullscreenchange', 'newName': 'nlvideostatus' },
    { 'name': "MSFullscreenChange", 'newName': 'nlvideostatus' },
    { 'name': "mozfullscreenchange", 'newName': 'nlvideostatus' },
    { 'name': "webkitfullscreenchange", 'newName': 'nlvideostatus' }
  ].forEach(function (event) {
    $("#video_main").on(event.name, function (e) {
      var stats = $scope.qosStreamConfig();
      if (document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen || document.requestFullscreen || e.type == 'webkitbeginfullscreen')
        stats.windowMode = 'fullscreen';
      else
        stats.windowMode = 'normal';
      nlTriggerEvent(event.newName, 'video_main', stats);
    })
  });

  $scope.triggerQoS = function () {
    if ($scope.ui.qosEnable) {
      var config = $scope.mergeConfig($scope.qosConfig(), $scope.qosStreamConfig());

      NLQosTracker.initialize(config);
      $scope.qosTracker = NLQosTracker.createVideoTracker(config);
      nlTriggerEvent('nlvideoopen', "video_main", config);
    } else {
      if ($scope.qosTracker) {
        $scope.qosTracker = null;
      }
    }
  };

  // qos relative end

  function getDRMParams(type) {
    return {
      widevine: {
        server: $scope.drmConfigurations[type].licenseServer_WV,
      },
      playready: {
        server: $scope.drmConfigurations[type].licenseServer_PR,
      },
      fairplay: {
        server: $scope.drmConfigurations[type].licenseServer_FP,
        serverCertificate: $scope.drmConfigurations[type].certUrl
      },
      params: {
        token: $scope.ui.cro_token
      }
    };
  }
  $scope.playerConfiguration = function () {
    var config = {};
    config = Object.assign({}, $scope.playerConfigurations);
    config.withCredentials = $scope.ui.withCredentials;
    if (($scope.selectedItem && $scope.selectedItem.type != undefined) || ($scope.ui.cro_token != undefined && $scope.ui.cro_token != ""))
      config.drm = getDRMParams($(token_license_server).prop("value"));
    if (parseInt($scope.ui.startBitrate) > 0) {
      config.abr = {};
      config.abr.enabled = false;
      config.abr.startBitrate = parseInt($scope.ui.startBitrate) * 1000;
    }
    
    // config.http = {requestHeaders: {'test1': 'test1', 'test2': 'test2'}, responseCallback: function(data) {console.log('http callback: ' + data.url + ', header: ' + JSON.stringify(data.headers))} };
    return config;
  }

  $scope.playUrlwithVideo = function (video, url) {
    var p = new AdaptivePlayer(video);
    p.configure($scope.playerConfiguration());
    if ($scope.ui.startPosition != undefined)
      p.load(url, parseFloat($scope.ui.startPosition));
    else 
      p.load(url);
    return p;
  }

  $scope.load4Views = function () {
    $("video.small-video").prop("muted", true);
    $("video.small-video").prop("controls", false);

    window.childPlayers.forEach(function (child_player) {
      if (child_player)
        child_player.destroy();
    });
    window.childPlayers = [];

    if ($scope.ui.ctrl.synchronize) {
      $("video.small-video").prop("autoplay", false);
      window.childPlayers.push($scope.playUrlwithVideo(document.getElementById('video_childview1'), $scope.ui.ctrl.smallVideoUrl1));
      //window.childPlayers.push($scope.playUrlwithVideo(document.getElementById('video_childview2'), $scope.ui.ctrl.smallVideoUrl2));
      //window.childPlayers.push($scope.playUrlwithVideo(document.getElementById('video_childview3'), $scope.ui.ctrl.smallVideoUrl3));

      window.player.setSynchronizedViews(window.childPlayers);
    } else {
      window.childPlayers.push($scope.playUrlwithVideo(document.getElementById('video_childview1'), $scope.ui.ctrl.smallVideoUrl1));
      window.childPlayers.push($scope.playUrlwithVideo(document.getElementById('video_childview2'), $scope.ui.ctrl.smallVideoUrl2));
      window.childPlayers.push($scope.playUrlwithVideo(document.getElementById('video_childview3'), $scope.ui.ctrl.smallVideoUrl3));
    }
  };

  $scope.loadPIP = function () {
    //                $scope.ui.ctrl.isDisplayPip = !$scope.ui.ctrl.isDisplayPip;
    //                if(!$scope.ui.ctrl.isDisplayPip)
    //                    return;
    $("#pipVideo").parent().css("display", "inherit");
    $("#pipVideo").prop("src", $scope.ui.ctrl.pipUrl);
    $("#pipVideo").prop("controls", false);
    $("#pipVideo").prop("muted", true);

    if (window.pipPlayer) {
      window.pipPlayer.stop();
      window.pipPlayer = null;
    }

    window.pipPlayer = $scope.playUrlwithVideo(document.getElementById('pipVideo'), $scope.ui.ctrl.pipUrl);
  };

  $scope.closePIP = function (event) {
    $("#pipVideo").parent().css("display", "none");
    if (window.pipPlayer) {
      window.pipPlayer.stop();
      window.pipPlayer = null;
    }
  };

  var tmp_video;
  $scope.switchPIPtoMain = function (isPIP) {
    var main_video = document.getElementById("video_main");
    var mainVideoPaused = main_video.paused;
    var pip_video = document.getElementById("pipVideo");
    var pipVideoPaused = pip_video.paused;
    var mainPos = getOffset(main_video);
    var pipPos = getOffset(pip_video);

    $("#pipVideo").hide();
    $("#video_main").hide();
    //$('#pipVideo').height(mainPos.height);
    //$('#pipVideo').width(mainPos.width);              

    //$('#video_main').height(pipPos.height);
    //$('#video_main').width(pipPos.width); 


    if (isPIP) {
      $(pip_video).effect("puff", { percent: 30/*,className: "ui-effects-transfer"*/ }, 100, function () {
        $(pip_video).css("display", "inherit");
        $(pip_video).prependTo('#video_container');
        pip_video.play();
      });

      $(main_video).effect("puff", { percent: 30/*,className: "ui-effects-transfer"*/ }, 100, function () {
        $(main_video).css("display", "inherit");
        $(main_video).prependTo('#pip_video_container');
        main_video.play();
      });
      video = pip_video;
      window.player = window.pipPlayer;
      main_video.muted = true;
      pip_video.muted = false;
    } else {
      $(pip_video).effect("puff", { percent: 30/*,className: "ui-effects-transfer"*/ }, 100, function () {
        $(pip_video).css("display", "inherit");
        $(pip_video).prependTo('#pip_video_container');
        pip_video.play();
      });

      $(main_video).effect("puff", { percent: 30/*,className: "ui-effects-transfer"*/ }, 100, function () {
        $(main_video).css("display", "inherit");
        $(main_video).prependTo('#video_container');
        main_video.play();
      });
      video = main_video;
      window.player = window.mainPlayer;
      pip_video.muted = true;
      main_video.muted = false;
    }

    $("#pipVideo").show();
    $("#video_main").show();

    // recreate control bar
    if (window.playerControls) {
      window.playerControls.destroy();
      delete window.playerControls;
    }
    window.playerControls = new PlayerControls(window.player, playcontrols_div);
    var allTracks = [];
    allTracks.push(window.player.videoTracks(), window.player.audioTracks(), window.player.textTracks());
    $scope.ui.videoTracks = window.player.videoTracks();

    // configure player control bar
    window.playerControls.configure();

    //if(!mainVideoPaused)
    main_video.play();
    //if(!pipVideoPaused)
    pip_video.play();
  }

  $scope.switchChildtoMain = function (index, isChild, child_video) {
    var main_video = document.getElementById("video_main");
    var mainContainer = main_video.parentNode;
    var child_video = document.getElementById(child_video);
    var childContainer = child_video.parentNode;

    $(child_video).effect("puff", { percent: 30/*,className: "ui-effects-transfer"*/ }, 100, function () {
      $(child_video).css("display", "inherit");
      $(child_video).prependTo($(mainContainer));
      child_video.play();
    });

    $(main_video).effect("puff", { percent: 30/*,className: "ui-effects-transfer"*/ }, 100, function () {
      $(main_video).css("display", "inherit");
      $(main_video).prependTo($(childContainer));
      main_video.play();
    });

    if (mainContainer === document.getElementById("video_container")) {
      video = child_video;
      window.player = window.childPlayers[index];
      child_video.muted = false;
      main_video.muted = true;

    } else {
      video = main_video;
      window.player = window.mainPlayer;
      child_video.muted = true;
      main_video.muted = false;
    }

    // recreate control bar
    if (window.playerControls) {
      window.playerControls.destroy();
      delete window.playerControls;
    }
    window.playerControls = new PlayerControls(video, playcontrols_div, window.player);
    var allTracks = [];
    allTracks.push(window.player.videoTracks(), window.player.audioTracks(), window.player.textTracks());
    $scope.ui.videoTracks = window.player.videoTracks();

    // configure player control bar
    window.playerControls.configure();
  };

  $scope.frameSeek = function () {
    if ($("#btn-group-1").prop("val") == "LF") {
      $scope.lastFrame();
    }
    else if ($("#btn-group-1").prop("val") == "NF") {
      $scope.nextFrame();
    }
  };
  $scope.forwardRewind = function () {
    if ($("#btn-group-2").prop("val") == "FF") {
      $scope.fastForward();
    } else if ($("#btn-group-2").prop("val") == "SF") {
      $scope.slowForword();
    } else if ($("#btn-group-2").prop("val") == "FR") {
      $scope.fastRewind();
    } else if ($("#btn-group-2").prop("val") == "SR") {
      $scope.slowRewind();
    } else if ($("#btn-group-2").prop("val") == "1x") {
      $scope.normalPlay();
    }
  };
  $scope.selectBtnLF = function () {
    $("#btn-group-1").prop("val", "LF");
    $("#btn-group-1").html("Last Frame");
  };
  $scope.selectBtnNF = function () {
    $("#btn-group-1").prop("val", "NF");
    $("#btn-group-1").html("Next Frame");
  };
  $scope.selectBtnFF = function () {
    $("#btn-group-2").prop("val", "FF");
    $("#btn-group-2").html("Fast Forward  2×");
  };
  $scope.selectBtnSF = function () {
    $("#btn-group-2").prop("val", "SF");
    $("#btn-group-2").html("Slow Forward  1/2×");
  };
  $scope.selectBtn1x = function () {
    $("#btn-group-2").prop("val", "1x");
    $("#btn-group-2").html("Normal     1×");
  };
  $scope.selectBtnFR = function () {
    $("#btn-group-2").prop("val", "FR");
    $("#btn-group-2").html("Fast Rewind  2×");
  };
  $scope.selectBtnSR = function () {
    $("#btn-group-2").prop("val", "SR");
    $("#btn-group-2").html("Slow Rewind  1/2×");
  };

  $scope.adaptationchange = function (bool) {
    window.player.setAdaption(bool);
  };
  $scope.selectTrack = function (track) {
    if (track.kind === 'VIDEO') {
      var solution = undefined;
      if (track.width != undefined && track.height != undefined) {
        solution = track.width + 'x' + track.height;
      }
      $("#switchInfoLabel").html('switching to ' + track.id + ': ' + (solution == undefined ? '' : solution) + ' -- ' + track.bandwidth / 1000 + 'KBps');
    }
    window.player.selectTrack(track);
    console.log('select track id: ' + track.id + '[' + track.kind + ']');
    //player.setAdaption($scope.ui.isAutoSwitch);
  };

  $scope.basicLoad = function (event) {
    $scope.ui.error = "";
    resetRewind();
    $scope.loadVideo();
  };

  $scope.load = function (event) {
    resetRewind();
    $scope.ui.error = '';
    $scope.ui.loginResponse = '';
    $scope.ui.accountResponse = '';
    $scope.ui.pptResponse = '';
    $scope.ui.id3Event = '';

    saveSettings($scope, $cookies);

    appLogin($scope, function () {
      appAccount($scope, function (accountResponse) {
        $scope.ui.drmUserId = accountResponse.responseJSON.data.drmUserId;

        appPublishPoint($scope, function (pptResponse) {
          var raw_path = pptResponse.responseJSON.path;
          if (!raw_path) {
            $scope.ui.ppt = 'Empty ppt response.';
            return;
          }

          $scope.ui.ppt = window.atob(raw_path);
          $scope.ui.drmToken = raw_path;

          $scope.$apply();
          $scope.loadVideo();
        });
      });
    });
  };

  $scope.loadVideo = function () {
    $scope.ui.id3Event = '';

    var protocol = null;
    switch ($("#protocol-group").html()) {
      case 'HTTP':
        protocol = AdaptivePlayer.Protocol.HTTP; break;
      case 'DASH':
        protocol = AdaptivePlayer.Protocol.DASH; break;
      case 'HLS':
        protocol = AdaptivePlayer.Protocol.HLS; break;
      default:
        protocol = null; break;
    }
    //window.mainPlayer.stop();
    window.playerControls.reset();
    var config = $scope.playerConfiguration();
    window.mainPlayer.configure(config);

    var params = [];

    if ($scope.ui.startPosition != undefined) {
      window.mainPlayer.load($scope.ui.ppt, parseFloat($scope.ui.startPosition));
      params.push('startPosition=' + $scope.ui.startPosition);
    }
    else 
      window.mainPlayer.load($scope.ui.ppt);

    if (parseInt($scope.ui.startBitrate) > 0) {
      params.push('startBitrate=' + $scope.ui.startBitrate);
    }

    if (window.location.search == '') {
      params.push('url=' + encodeURIComponent($scope.ui.ppt));
      if (config.drm) {
        params.push('ls=' + $(token_license_server).prop("value"));
        params.push('cro=' + config.drm.params.token.split(' ')[1]);
      }
      window.location.hash = params.join('&');
    }
  };

  window.player.addEventListener(AdaptivePlayer.EventType.PlayStart, function () {

  });

  window.player.addEventListener(AdaptivePlayer.EventType.AdEvent, function () {
    var msg = '';
    if (event.ADSTART) {
      msg = JSON.stringify(event.ADSTART);
    }
    if (event.ADEND) {
      msg = JSON.stringify(event.ADEND);
    }
    console.log(msg);
  });

  // TODO:: Need to suppress the update.



  AdaptivePlayer.support(function (support) {
    var needApply = false;
    if (support.drm['com.widevine.alpha']) {
      $scope.ui.supportedDRMs.push('Widevine');
      needApply = true;
    }
    if (support.drm['com.microsoft.playready']) {
      $scope.ui.supportedDRMs.push('PlayReady');
      needApply = true;
    }
    if (support.drm['com.apple.fps.1_0']) {
      $scope.ui.supportedDRMs.push('FairPlay');
      needApply = true;
    }

    var nativeCanPlay = window.player.nativeCanPlay();
    if (nativeCanPlay.m3u8) {
      $scope.ui.supportedStreaming.push('HLS');
      needApply = true;
    }
    if (nativeCanPlay.mpd) {
      $scope.ui.supportedStreaming.push('Dash');
      needApply = true;
    }
    if (needApply) {
      $scope.$apply();
    }
  });

  function onStats() {
    var stats = window.player.getStats();
    $scope.ui.playerCurrentTime = (typeof stats.currentTime === 'number') ? stats.currentTime.toFixed(2) : 0;
    $scope.ui.playerDuration = stats.duration;
    $scope.ui.playerVideoSize = stats.videoWidth + ' x ' + stats.videoHeight;
    $scope.ui.playerSize = video.clientWidth + ' x ' + video.clientHeight;
    $scope.ui.playerVolume = stats.volume.toFixed(2) + ' muted: ' + stats.muted;
    $scope.ui.totalVideoFrames = stats.totalVideoFrames,
      $scope.ui.playerDroppedFrameCount = stats.droppedFrameCount;
    $scope.ui.playerState = window.player.getState();
    $scope.ui.playerReadyState = stats.readyState;
    $scope.ui.bandwidth = stats.bandwidth + ' Kbps';
    $scope.ui.bitrate = stats.bitrate + ' Kbps';
    $scope.ui.switchInfo = stats.switchInfo;
    $scope.ui.isAutoSwitch = stats.isAutoSwitch;
    $scope.ui.bytesLoaded = stats.bytesLoaded;
    $scope.ui.bufferingTime = stats.bufferingTime;
    var strBytesLoaded = '';
    if (stats.bytesLoaded != null) {
      for (var i = 0; i < stats.bytesLoaded.length; i++) {
        strBytesLoaded += JSON.stringify(stats.bytesLoaded[i]);
      }
    }
    $scope.ui.bytesLoaded = strBytesLoaded;
    $scope.ui.livePointOffest = stats.livePointOffest === -1 ? $scope.ui.livePointOffest : stats.livePointOffest.toFixed(2);

    if (stats.buffered) {
      var buffered = stats.buffered;
      var n = buffered.length;
      var arr = [];
      for (var i = 0; i < n; i++) {
        arr.push(
          '[' + formatDuration(buffered.start(i), true) +
          '-' + formatDuration(buffered.end(i), true) +
          ']');
      }

      $scope.ui.playerBuffered = arr.join(' ');
    }

    $scope.$apply();
  }

  window.player.addEventListener(AdaptivePlayer.EventType.ID3Event, function (event) {
    $scope.ui.id3Event += 'start=' + event.start + ', end=' + event.end + ", Data: " + JSON.stringify(event.value.dict) + '\r\n';
  });

  window.player.addEventListener(AdaptivePlayer.EventType.StateChange, function (event) {
    $scope.ui.playerState = event.oldState + '->' + event.newState;
  });

  window.player.addEventListener(AdaptivePlayer.EventType.TrackChange, function (event) {

  });

  var statsTimer = null;
  window.player.addEventListener(AdaptivePlayer.EventType.PlayStart, function (event) {
    if (statsTimer)
      clearInterval(statsTimer);
    statsTimer = setInterval(function () { onStats(); }, 500);
  });

  window.player.addEventListener(AdaptivePlayer.EventType.PlayEnd, function (event) {
    if (statsTimer)
      clearInterval(statsTimer);
  });

  window.player.addEventListener(AdaptivePlayer.EventType.VolumeChange, function (event) {
    $scope.ui.playerVolume = event.volume + ': ' + event.muted;
  });

  window.player.addEventListener(AdaptivePlayer.EventType.ProfileChange, function (event) {
    $scope.ui.playerVideoSize = event.videoWidth + 'x' + event.videoHeight;

    $scope.ui.videoTracks = window.player.videoTracks();
    $("#switchInfoLabel").html("");
    $scope.apply();
  });

  window.player.addEventListener(AdaptivePlayer.EventType.Error, function (e) {
    if (e.message) {
      $scope.ui.error = e.from + ': ' + e.message;
    } else {
      $scope.ui.error = 'error: ' + JSON.stringify(e.details);
    }
    $scope.$apply();
  });

  window.player.addEventListener(AdaptivePlayer.EventType.StreamingEvent, function (event) {
    ;//
  });

  player.addEventListener(AdaptivePlayer.EventType.AdEvent, function (evt) {
    console.log('advertisement type: ' + JSON.stringify(evt.data));
  });

  player.addEventListener(AdaptivePlayer.EventType.PlayEnd, function (evt) {
    console.log('PlayEnd: ' + JSON.stringify(evt.details));
  });
  
  player.addEventListener(AdaptivePlayer.EventType.AutoPlayStatus, function (evt) {
    console.log('AutoPlayStatus: ' + JSON.stringify(evt.details));
  });
});
