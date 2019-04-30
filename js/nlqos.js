//var logger = console.log;
var logger = function(){};
var specailLogger = logger;//console.log;
function NLQos()
{
	this.clientID = null;
	var m_videoTrackerMap = {};

	this.initialized = false;

	this.initialize = function(config)
	{
		if(!NLQosTracker.initialized)
		{
			NLQosTracker.initialized = true;

			window.nltrack.init(config);
			window.nltrack.callbackError = this.errorHandler;
			this.clientID = nltrack.getClientID();
		}
	};

	this.reInit = function(config)
	{
		var params = {};
		if(config.networkType != null)
			params.networkType = config.networkType;
		if(config.uid!=null)
		{
			params.userID = config.uid;
			if(config.userType!=null)
				params.userType = config.userType;
		}

		window.nltrack.reInit(params);
	}

	this.createVideoTracker = function(config)
	{
		var old;
		if(old = m_videoTrackerMap[config.playerId]){
			old.onVideoStop();
			old = null;
		}

		var t = new NLQosVideoTracker(config);
		m_videoTrackerMap[config.playerId] = t;

		return t;
	};

	this.getVideoTracker = function(playerId)
	{
		if(m_videoTrackerMap!=null)
		{
			var t = m_videoTrackerMap[playerId];
			if(t!=null)
				return t;
			else
				return null;
		}
		else
			return null;
	};

	this.errorHandler = function(msg)
	{
		logger("[Error]:",msg);
	};

	this.trackError = function(err)
	{
		if(nltrack && err)
		{
			var error = {};
			error.errorType = err.type;
			error.errorMsg = err.description;

			try {
				nltrack.onError(error);
			}
			catch(err){}
		}
	};
}

function NLQosVideoTracker(config)
{
	var m_player = config.playerId;
	var m_videoTracker = null;
	var m_heartBeatMsg = null;
	var m_videoOpened = false;
	var m_count = 0;

	m_videoTracker = nltrack.createVideoTracker(config);

	document.addEventListener('nlvideoopen',onVideoOpen);
	document.addEventListener('nlvideostart',nlTrackVideoStart);
	document.addEventListener('nlvideocomplete',nlTrackVideoEnd);
	document.addEventListener('nlvideostate', nlTrackVideoState);
	document.addEventListener('nlvideoerror',nlTrackVideoError);
	document.addEventListener('nlvideostatus',nlTrackVideoStatus);
	document.addEventListener('nlTrackVideoTimeUpdate',nlTrackVideoTimeUpdate);

	function onVideoOpen(event)
	{
		var data = nlGetData(event);
		if(isValidInstance(data) && !m_videoOpened){
			try
			{
				m_videoTracker.onVideoOpen(data);
        		m_heartBeatMsg = null;
				m_videoOpened = true;
			}
			catch(err){}
		}
	}
	var m_contentStarted = false;
	function nlTrackVideoStart(event)
	{
		var data = nlGetData(event);
		if(isValidInstance(data))
		{
			m_heartBeatMsg = null;
			setHeartBeatMsg(data);
		}
		if(!m_contentStarted)
		{
			m_contentStarted = true;
			try {
				m_videoTracker.onVideoStart();
			}
			catch(err){}
		}
	}

	function nlTrackVideoEnd(event)
	{
		m_videoOpened = false;
		m_heartBeatMsg = null;
		m_contentStarted  = false;

		try
		{
			if(m_videoTracker)
				m_videoTracker.onVideoStop();
		}
		catch(err){}
	}

	function nlTrackVideoState(event)
	{
		var data = nlGetData(event);
		if(m_videoTracker && m_videoOpened)
		{
			switch(data.newState)
			{
				case "playing":
					try {
						m_videoTracker.onVideoResume();
					}
					catch(err){}
					break;
				case "paused":
					try {
						m_videoTracker.onVideoPause();
					}
					catch(err){}
					break;
				default:
					break;
			}
		}
	}

	function nlTrackVideoError(event)
	{
		var data = nlGetData(event);
		var error = data.error;
		try
		{
			if(m_videoTracker)
			{
				onVideoOpen(event);
				m_videoTracker.onVideoError(error);
			}
		}
		catch(err){}
	}


	function nlTrackVideoTimeUpdate(event)
	{
		nlTrackVideoStatus(event);

		// for nlTrackVideoPercent;
		var data = nlGetData(event);
		var milestones = [10,20,30,40,50,60,70,80,90];
		var milestonesMap = milestones.map(function (item) {
			return {milestones: item, playing: false};
		});
		if(!data.isLive && data.duration > 0 && data.duration != Infinity)
		{
			var ms = Math.round(data.currentTime/data.duration * 100);
			milestonesMap.forEach(function (item) {
				if(item.milestones === ms && !item.playing){
					nlTrackVideoPercent(item);
					item.playing = true;
				}
				if(item.milestones != ms)
					item.playing = false;
			})
		}
	};

	function nlTrackVideoPercent(milestones)
	{
		var param = {percentage:milestones};
		try
		{
			if(m_videoTracker)
				m_videoTracker.onVideoMilestone(param);
		}
		catch(err){}
	}


	function nlTrackVideoStatus(event)
	{
		m_count = ++m_count % 10;
		if(m_count != 0)
			return;
		var data = nlGetData(event);
		if(isValidInstance(data))
		{
			var hb = $.extend(true, {}, getHeartBeatMsg());
/*
			currentPlayPosition  currentTime: '',
 			newDropFrameCount droppedFrameCount
			bitrate
			newTraffic bytesLoaded: [{host: 'undefined', bytes: 0}],
			isAdaptive isLive
			windowMode
			bufferTime bufferingTime
			bandwidth
			vs isLive

			streamLength  duration)
			m_heartBeatMsg.streamLength = ((data.duration === Infinity) ||  (!data.duration) || (typeof (data.duration) !=  'number')) ? -1 : Math.round(data.duration);
			m_heartBeatMsg.vs = data.isLive ? 1 : 3;

*/

			for(var property in data){
				if(!data.hasOwnProperty(property))
					continue;
				switch(property)
				{
					case 'duration':
                        var value = parseInt(data.duration);
                        if(!isNaN(value))
                            hb.streamLength = value;
                        break;
					case 'isLive':
						hb.vs = !!data.isLive ? 1 : 2;
						break;
					case  'currentTime':
						var value = parseInt(data.currentTime);
						if(!isNaN(value))
							hb.currentPlayPosition = value;
						break;

					case 'isAutoSwitch':
						hb.isAdaptive = !!data.isAutoSwitch;
						break;

					case "windowMode":
						var value = parseInt(data.windowMode);
						if(!isNaN(value))
							hb.windowMode = value;
						break;

					case "bitrate":
						var value = parseInt(data.bitrate);
						if(!isNaN(value))
							hb.bitrate = value;
						break;

					case "bandwidth":
						var value = parseInt(data.bandwidth);
						if(!isNaN(value))
							hb.bandwidth = value;
						break;

					case "droppedFrameCount":
						logger('qosTrace: droppedFrameCount: ' + hb.newDropFrameCount +"->"+ data.droppedFrameCount );
						var value = parseInt(data.droppedFrameCount);
						if(!isNaN(value) && value - hb.newDropFrameCount > 0)
							hb.newDropFrameCount = value - hb.newDropFrameCount;
						else
							hb.newDropFrameCount = 0;
						logger('qosTrace: droppedFrameCount final: ' + hb.newDropFrameCount);
						break;
	/*
	 newTraffic : [ {
	 cdnName : "cdn1",
	 bytes : 102940
	 }, {
	 cdnName : "cdn2",
	 bytes : 132940
	 } ],
	 [{host: 'undefined', bytes: 0}],
	 */
					case "bytesLoaded":
						if(hb.newTraffic && hb.newTraffic.length > 0 && data.bytesLoaded && data.bytesLoaded.length > 0)
                        	specailLogger('qosTrace: bytesLoaded: ' + JSON.stringify(hb.newTraffic[0]) +"->"+ JSON.stringify(data.bytesLoaded[0]) );
						var bytesLoaded = data.bytesLoaded;
						if(!bytesLoaded || bytesLoaded.length === 0){
							if (hb && hb.newTraffic) {
								hb.newTraffic.forEach(function (item) {
									item.bytes = 0;
								});
								break;
							}
						}
						var newTraffic = [];
						bytesLoaded.forEach(function (newItem) {
							if (hb.newTraffic) {
								var findItem = hb.newTraffic.filter(function (oldItem) {
									return oldItem.cdnName === newItem.cdnName;
								})[0];
							}
							if(findItem !== undefined && newItem.cdnName === findItem.cdnName){
								if(newItem.bytes - findItem.bytes > 0)
									newTraffic.push({'cdnName': newItem.cdnName, 'bytes': newItem.bytes - findItem.bytes});
							} else {
								newTraffic.push({'cdnName': newItem.cdnName, 'bytes': newItem.bytes});
							}
						});
						if(newTraffic.length > 0)
							hb.newTraffic = newTraffic;
						else
							hb.newTraffic.forEach(function (item) {
								item.bytes = 0;
							});
                        specailLogger('qosTrace: bytesLoaded final: ' + JSON.stringify(hb.newTraffic[0]));
						break;

					case "bufferingTime":
						logger('qosTrace: bufferingTime: ' + hb.bufferTime +"->"+ data.bufferingTime );
						var value = Math.round(data.bufferingTime);
						if(!isNaN(value) && value > 0 && value - hb.bufferTime > 0)
							hb.bufferTime = value - hb.bufferTime;
						else
							hb.bufferTime = 0;
						logger('qosTrace: bufferingTime final: ' + hb.bufferTime);
						break;
				}
			}

			try
			{
				if(m_videoTracker)
				{
					m_videoTracker.onVideoStatusChange(hb);
					//clearVideoStatusParams();
					setHeartBeatMsg(data);
				}
			}
			catch(err){}
		}

	}

	function clearVideoStatusParams()
	{
		var hb = getHeartBeatMsg();

		if(hb)
		{
			if(hb.bitrate != null)
				delete hb.bitrate;

			if(hb.bandwidth != null)
				delete hb.bandwidth;

			if(hb.newTraffic != null)
				delete hb.newTraffic;
		}
	}

	/*
	*
	*
	 currentPlayPosition
	 newDropFrameCount
	 bitrate
	 newTraffic
	 isAdaptive
	 windowMode
	 bufferTime
	 bandwidth
	 vs

	 * */
	function setHeartBeatMsg(data)
	{
        m_heartBeatMsg = {};
		if(data)
		{
			m_heartBeatMsg.type = 'video';
			m_heartBeatMsg.id = 1234567;
			m_heartBeatMsg.type = 'video';

			m_heartBeatMsg.currentPlayPosition = Math.round(data.currentTime);
			m_heartBeatMsg.streamURL = data.url;
			m_heartBeatMsg.streamLength = ((data.duration === Infinity) ||  (!data.duration) || (typeof (data.duration) !=  'number')) ? -1 : Math.round(data.duration);
			m_heartBeatMsg.streamDescription = 'neulion h5 player test';

			if(data.isAudio)
				m_heartBeatMsg.audio = true;

			m_heartBeatMsg.vs = data.isLive ? 1 : 3;

			m_heartBeatMsg.isAdaptive = data.isAutoSwitch;

			m_heartBeatMsg.bitrate = Math.round(data.bitrate);
			m_heartBeatMsg.bandwidth = Math.round(data.bandwidth);
			if(data.bufferingTime && data.bufferingTime > 0)
				m_heartBeatMsg.bufferTime = Math.round(data.bufferingTime);
			m_heartBeatMsg.newTraffic = $.extend(true, [], data.bytesLoaded);
			m_heartBeatMsg.newDropFrameCount = Math.round(data.droppedFrameCount);

			if(data.windowMode)
				m_heartBeatMsg.windowMode = data.windowMode;
			else
				m_heartBeatMsg.windowMode = "normal";
		}
	}

	function getHeartBeatMsg()
	{
		return m_heartBeatMsg;
	}

	function isValidInstance(data)
	{
		if(data)
			return data.htmlid == m_player;
		else
			return false;
	}

	function nlGetData(event)
	{
		if(event!=null)
		{
			var data = event.detail.data;
			return data;
		}
		else
			return null;
	}
	return m_videoTracker;
}

function nlTriggerEvent(eventName, htmlId, playerStats)
{
	playerStats.htmlid = htmlId;
	var element = document.getElementById(htmlId);
	if(element && document.createEvent)
	{
		var event = document.createEvent("CustomEvent");
		event.initCustomEvent(eventName, true, true,{'data':playerStats});
		event.eventName = eventName;

		try
		{
			element.dispatchEvent(event);
		}
		catch(err){};
	}
}

var NLQosTracker = new NLQos();
if(typeof require != 'undefined')
	define(NLQosTracker);