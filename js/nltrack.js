/*! NeuLion QoS JavaScript Tracking Library v1.0 | 2017-03-09 */
(function() {

    var nltrack = window.nltrack = window.nltrack || {};

    var util = initUtils();

    var __settings__ = {
    	    receiverURL : "",
    	    commonParams : {},
    	    videoHBIntervalSec : 30
    };

    function settings(){
    	if (arguments.length == 1){
    		var key = arguments[0];
    		return __settings__[key];
    	}
    	else{
    		var key = arguments[0];
    		var value = arguments[1];
    		__settings__[key] = value;
    	}
    }

    /* Message Types */
    var APP_EVENT = "APP_EVENT",
        VIDEO_HB = "VIDEO_HB",
        VIDEO_STOP = "VIDEO_STOP",
        VIDEO_ERROR = "VIDEO_ERROR",
    	VIDEO_EVENT = "VIDEO_EVENT";

    /*
	 * The validation rule in each function contains:
	 *
	 * 1) precondition which indicates the prerequisites of the invocation of
	 * the method.
	 *
	 * 2) paramFields lists all the acceptable properties in paramObject, and
	 * the check rules
	 *
	 * 3) customFieldCheck list the custom validation function referenced by the
	 * paramFields
	 */
    nltrack.init = function(paramObj) {

        var validationRule = {
            paramFields: ["appVersion|required", "siteID|required",
                "networkType|callback_checkAcceptableNetworkType",
                "deviceType", "appType", "clientID", "userID",
                "userType","productID",
                "playerVersion", "receiverURL|required",
                "vHBInterval|integer|greater_than[29]",
                "xuID|callback_checkIsArray", "custom|callback_checkIsArray"
            ],
            customFieldCheck: {
                checkAcceptableNetworkType: checkAcceptableNetworkType,
                checkAcceptableUserType: checkAcceptableUserType,
                checkIsArray: checkIsArray
            }
        };
        var isValid = check(validationRule, paramObj);
        if (!isValid) {
        	return;
        }

        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);

        // clear current settings

        settings("commonParams", getDefaultCommonParams());

        settings("receiverURL", filteredParam["receiverURL"]);

        if (!!filteredParam["vHBInterval"]) {
        	settings("videoHBIntervalSec", filteredParam["vHBInterval"]);
        }

        var extClientID = filteredParam["clientID"];
        if (!!extClientID){
        	saveClientIDInCookie(extClientID);
        }

        var userID = filteredParam["userID"];
        if(!!userID){
        	var encodedUserID = encryptUserID(userID);
        	saveUserIDInCookie(encodedUserID);
        }

        util.extendNonUndefined(settings("commonParams"), util.omit(filteredParam, ["receiverURL", "vHBInterval", "userID"]));



    };

    nltrack.reInit = function(paramObj) {
    	var validationRule = {
                paramFields: [
                    "networkType|callback_checkAcceptableNetworkType",
                    "userID",
                    "userType",
                    "xuID|callback_checkIsArray",
                    "custom|callback_checkIsArray"
                ],
                customFieldCheck: {
                    checkAcceptableNetworkType: checkAcceptableNetworkType,
                    checkAcceptableUserType: checkAcceptableUserType,
                    checkIsArray: checkIsArray
                }
            };
        var isValid = check(validationRule, paramObj);
        if (!isValid) {
            return;
        }
        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);
        var userID = filteredParam["userID"];
        if(!!userID){
        	var encodedUserID = encryptUserID(userID);
        	saveUserIDInCookie(encodedUserID);
        }
        if(("userID" in paramObj) && !userID){
        	this.onLogout();
        }

        util.extendNonUndefined(settings("commonParams"), util.omit(filteredParam, ["userID"]));
    };

    nltrack.getClientID = function(){
    	return getClientID();
    };

    nltrack.onPageOpen = function(paramObj) {
        var validationRule = {
            paramFields: ["name|required"]
        };

        var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

        var msgParams = {};
        msgParams.eventName = "APP_ENTER_PAGE";
        msgParams.eventCatPage = paramObj.name;

        on(APP_EVENT, msgParams);
    };

    nltrack.onAccountCreation = function(){
        on(APP_EVENT, {eventName : "REGISTER_SUCCESS"});
    };

    nltrack.onLogin = function(paramObj) {
        var validationRule = {
            paramFields: ["userID|required", "userType"],
            customFieldCheck: {
            	checkAcceptableUserType: checkAcceptableUserType
            }
        };

        var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);

        var encodedUserID = encryptUserID(paramObj.userID);
        // save userID in session cookie
        saveUserIDInCookie(encodedUserID);

		util.extendNonUndefined(settings("commonParams"), util.omit(filteredParam, ["userID"]));

        var msgParams = {};
        msgParams.eventName = "LOGIN_SUCCESS";

        on(APP_EVENT, msgParams);
    };


    nltrack.onLogout = function() {
        /*
		 * clear the userID in session cookie
		 */
        util.cookie("userID","",{expires:-1});
        /*
         * clear the userType
         */
        settings("commonParams").userType = "";

    };

    nltrack.onPurchaseSelection = function(paramObj) {
    	var validationRule = {
                paramFields: ["sku|required", "name|required", "ppv|required|boolean",
                              "price|required|decimal", "currency|required"]
            };

    	var isValid = check(validationRule, paramObj);
    	if (!isValid) {
    		return;
    	}

    	var msgParams = {};
    	msgParams.eventName = "PURCHASE_SELECTION";
    	msgParams.eventCatSku = paramObj.sku;
    	msgParams.eventCatName = paramObj.name;
    	msgParams.eventCatPpv = paramObj.ppv;
    	msgParams.eventCatPrice = paramObj.price;
    	msgParams.eventCatCurrency = paramObj.currency;

    	on(APP_EVENT, msgParams);
    };

    nltrack.onPurchaseConfirmation = function(paramObj) {
    	var validationRule = {
    			paramFields: ["sku|required", "name|required", "ppv|required|boolean",
    			              "currency|required",
    			              "orderTotal|required|decimal", "orderID|required"]
    	};

    	var isValid = check(validationRule, paramObj);

    	if(!isValid){
    		return;
    	}

    	var msgParams = {};
    	msgParams.eventName = "PURCHASE_CONFIRMATION";
    	msgParams.eventValue = Math.round(paramObj.orderTotal*100,0);//magnified by 100, because qos server only accept integer for eventValue parameter.
    	msgParams.eventCatSku = paramObj.sku;
    	msgParams.eventCatName = paramObj.name;
    	msgParams.eventCatPpv = paramObj.ppv;
    	msgParams.eventCatCurrency = paramObj.currency;
    	msgParams.eventCatOrderId = paramObj.orderID;

    	on(APP_EVENT, msgParams);
    };


    nltrack.onPurchaseBilling = function(paramObj) {
    	var validationRule = {
                paramFields: ["sku|required", "name|required", "ppv|required|boolean",
                              "price|required|decimal", "currency|required"]
            };

    	var isValid = check(validationRule, paramObj);

    	if(!isValid){
    		return;
    	}

    	var msgParams = {};
    	msgParams.eventName = "PURCHASE_BILLING";
    	msgParams.eventCatSku = paramObj.sku;
    	msgParams.eventCatName = paramObj.name;
    	msgParams.eventCatPpv = paramObj.ppv;
    	msgParams.eventCatPrice = paramObj.price;
    	msgParams.eventCatCurrency = paramObj.currency;

    	on(APP_EVENT, msgParams);
    };


    nltrack.createVideoTracker = function(paramObj) {
        var validationRule = {
            paramFields: ["playerVersion","productID"]
        };

        check(validationRule, paramObj);
        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);

        var playerVersionForThisPlayer = settings("commonParams").playerVersion;
    	if (!!filteredParam.playerVersion){
    		playerVersionForThisPlayer = filteredParam.playerVersion;
    	}

    	var productIDForThisPlayer = filteredParam.productID;
    	if (!productIDForThisPlayer){
    		productIDForThisPlayer = settings("commonParams").productID;
    	}

        var videoTracker = createVideoTracker(playerVersionForThisPlayer,productIDForThisPlayer);
        return videoTracker;
    };


    nltrack.onError = function(paramObj) {
        var validationRule = {
            paramFields: ["errorType|required", "errorMsg|required"]
        };

        var isValid = check(validationRule, paramObj);

    	if(!isValid){
    		return;
    	}

    	var msgParams = {};
    	msgParams.eventName = paramObj.errorType;
    	msgParams.eventCatErrorMsg = paramObj.errorMsg;

    	on(APP_EVENT, msgParams);
    };

    nltrack.onEvent = function(paramObj) {
        var validationRule = {
            paramFields: ["name|required", "value|integer",]
        }

        var isValid = check(validationRule, paramObj);

    	if(!isValid){
    		return;
    	}
    	paramObj.eventName = paramObj.name;
    	paramObj.eventValue = paramObj.value;
    	var msgParam = util.omit(paramObj, ["name", "value"]);
        on(APP_EVENT, msgParam);
    };


    function getDefaultCommonParams() {
        return {
            convention: "1.0",
            clientID: getClientID(),
            sessionID: getSessionID(),
            appType: util.getAppType(),
            deviceType: util.getAppType(),
            os: util.getOS(),
            browser: util.BrowserDetect.browser + " " + util.BrowserDetect.version,
            mode: 1,
            userType: "",
            xuID: [],
            custom: []
        };
    }

    function currentUTC() {
        return (new Date()).getTime();
    }

    function currentUnixTime() {
        return Math.round(currentUTC() / 1000);
    }

    function getClientID() {
        var clientID = util.cookie("clientID");
        /*
		 * If cannot get clientID from cookie, generated a new one, and set to
		 * cookie, and never expires.
		 */
        if (!clientID) {
            /*
			 * The clientID pattern is similar to google's utma variable
			 */
            clientID = Math.floor(1000000000 * Math.random()) + "." + currentUnixTime();
            saveClientIDInCookie(clientID);
        }
        return clientID;
    }

    function saveClientIDInCookie(clientID){
    	util.cookie("clientID", clientID, {
            expires: 1000 // clientID expires after 1000 days
        });
    }

    function saveUserIDInCookie(userID){
    	util.cookie("userID", userID);
    }



    function getSessionID() {
        var sessionID = util.cookie("sessionID");
        /*
		 * sessionID is a session cookie, it will expire when the browser
		 * closes. The multi tabs in a browser will share the same sessionID
		 */
        if (!sessionID) {
            sessionID = currentUnixTime();
            util.cookie("sessionID", sessionID);
        }
        return sessionID + '';
    }

    function checkAcceptable(acceptedValues, value) {
        if (!!value && util.indexOf(acceptedValues, value.toLowerCase()) >= 0) {
            return true;
        } else {
            return false;
        }
    }

    function checkAcceptableNetworkType(value) {
        return checkAcceptable(["wifi", "carrier", "landline"], value);
    }

    function checkAcceptableUserType(value) {
    	return checkAcceptable(["registered", "subscriber", "freetrial"], value);
    }

    function checkIsArray(value) {
      return Object.prototype.toString.call(value) === '[object Array]';
    }

    function check(validationRule,paramObj) {
        var precondition = validationRule.precondition;
        var paramFields = validationRule.paramFields;
        var customFieldCheck = validationRule.customFieldCheck;
        var validator = !!paramFields ? new util.JSONParamValidator(paramFields) : null;
        if (!!customFieldCheck) {
            for (var checkFuncName in customFieldCheck) {
                var checkFunc = customFieldCheck[checkFuncName];
                if (typeof checkFunc === "function") {
                    validator.registerCallback(checkFuncName, checkFunc).setMessage(checkFuncName, checkFuncName + " error.");
                }
            }
        }

        if (typeof precondition === "function") {
            var preconditionCheckResult = precondition.apply(this, arguments);
            if (!preconditionCheckResult) {
                return false;
            }
        }

        if (!paramObj){
        	paramObj = {};
        }
        if (validator && !validator.validate(paramObj)) {
            return false;
        }

        return true;

    }

    function filterParamObj(paramFields, paramObj) {
        var newParam = {};
        if (!paramObj){
        	return newParam;
        }
        for (var i in paramFields) {
            var fieldRule = paramFields[i];
            var nameRules = fieldRule.split("|");
            var name = nameRules.shift();
            newParam[name] = paramObj[name];
        }
        return newParam;
    }


    /*
	 * encrypt user ID
	 */
    function encryptUserID(orgionUserID) {
    	var encryptedUserID = "";
    	if (!orgionUserID) {
    		return "";
    	}
    	else{
    		var strLength = orgionUserID.length;
    		encryptedUserID += fromCharToHexString(orgionUserID.charAt(0), 0);
    		for(var i = 1; i < strLength; ++i){
    			encryptedUserID += "-" + fromCharToHexString(orgionUserID.charAt(i), i);
    		}
    	}
    	return encryptedUserID;
    }

    function fromCharToHexString(character, indexOfCharacter) {
    	var hexString = "";
    	var asciiOfC = character.charCodeAt();// get the ascii code of
												// character
    	var transformedCode = asciiOfC - 13
    						+ indexOfCharacter
    						+ (indexOfCharacter % 3);
    	hexString = transformedCode.toString(16);// transform to hex string
    	return hexString;
    }

    /*
	 * When test mode, the ajax function and reducedKeyMapper are changed.
	 */
    if (!util.isEmpty(window.nltrack) && !!window.nltrack.testMode) {
        this.mockajax = window.nltrack.mockajax = {};
        util.ajax = function(options) {
            console.log("********Start Mock AJAX Output********");
            console.log(options.data);
            console.log(util.param(options.data));
            console.log("********End Mock AJAX Output********");
            mockajax.data = options.data;
            mockajax.postBody = util.param(options.data);
        };
        reducedKeyMapper = {};
    }


    function generateViewID() {
        return currentUTC();
    }


    function on(eventType, msgParams) {
        var msg = {
            messageType: eventType
        };
        if (!msgParams){
        	msgParams = {};
        }
        util.extendNonUndefined(msg, settings("commonParams"));

        var userID = util.cookie("userID");
        if(!!userID){
        	msg.userID = userID;
        }

        if (!!msgParams) {
            util.extendNonUndefined(msg, msgParams);
        }
        send(msg, VIDEO_HB !== eventType);
    }


    function send(postEntity, retry) {


        if(!!window.ActiveXObject || "ActiveXObject" in window)
        {
        	var iframeName = "frame"+currentUnixTime();
        	var iframe = initIFrame(iframeName);
        	var form = createForm(iframeName);
        	iframe.onload = function(){
        		try{
	        	document.body.removeChild(form);
	        	document.body.removeChild(iframe);
        		}catch(ex){

        		}
        	};
        	sendPostFormMessage(postEntity, form);

        }
        else
        {
        	var data = util.param(postEntity);
        	if (!!window.nltrack.testMode) {
        		data = postEntity;
        	}
        	util.ajax({
	          url: settings("receiverURL"),
	          data: data, // Use JSON format for the request body
	          type: 'POST',
	          success: function(data, textStatus, jqXHR) {},
	          error: function(jqXHR, textStatus, errorThrown) {}
	      });
        }
    }

    function initIFrame(iframeName) {
    	// create the hidden postFormTarget iframe
    	// use the hidden iframe to avoid reloading page problem after form submit
    	// use the form submit to avoid the crossdomain post request problem
    	var iframe;
        try { // for I.E.
            iframe= document.createElement('<iframe name="'+iframeName+'">');
        } catch (ex) { //for other browsers, an exception will be thrown
            iframe = document.createElement('iframe');
            // set the iframe name to be linked for the post form
        	iframe.name = iframeName;
        }

    	// set the display style as none for the hidden usage
        iframe.style.display = "none";
    	// append the iframe element
    	document.body.appendChild(iframe);

    	return iframe;

    }

    function createForm(iframeName){
    	// create the form for the post usage
    	var postForm = document.createElement("form");
    	// set the action for the serverUrl
    	postForm.action = settings("receiverURL");
    	// set the post method
    	postForm.method = "post";
    	// set the target as the hidden iframe to fix the reload issue
    	postForm.target = iframeName;
    	// hide the actual form object
    	postForm.style.display = "none";
    	// append the post form on the body
    	document.body.appendChild(postForm);
    	// return the post form
    	return postForm;
    }

    function sendPostFormMessage(message, form) {
    	for(var key in message){
    		var messageInput = document.createElement("input");
    		messageInput.type = "hidden";
    		messageInput.name = key;
    		messageInput.value = message[key];
    		form.appendChild(messageInput);
    	}
    	form.submit();
    }

    function createVideoTracker(playerVersion, productID) {
        var videoTracker = new VideoTracker(playerVersion, productID);
        return videoTracker;
    }

    function VideoTracker(playerVersion, productID) {
        this.player = playerVersion;
        this.productID = productID;
        this.ad = {};
    }

    VideoTracker.prototype.onVideoOpen = function(paramObj) {
        var validationRule = {
        		paramFields : ["type", "id|integer", "extid", "gt|integer", "gs|integer", "st|numeric", "dur|numeric", "trailer|boolean", "audio|boolean", "cam|integer",
        		               "audioChannel", "streamDescription|required", "streamURL|required",
        		               "streamLength|required|integer", "gameDate", "homeTeam", "awayTeam", "vs|integer",
        		               "epgShowTime|valid_time", "epgShowName"]
        };

        var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);


        var view = new View();
        util.extendNonUndefined(view, util.extendNonUndefined(filteredParam,{player:this.player,productID:this.productID}));

        view.open();

        if (!!this.view) {
            this.view.stopPlaying();
        }
        this.view = view;


        // Send EVENT_CAT_METADATA event
        var msgParams = {
        		eventCatName:'content',
        		eventCatKey:this.getContentId(filteredParam.type,filteredParam.id,filteredParam.extid),
        		eventCatMetadata:util.stringify({
	        		type: filteredParam.type,
	                id: filteredParam.id,
	                extid : filteredParam.extid,
	                gt: filteredParam.gt,
	                gs: filteredParam.gs,
	                st: filteredParam.st,
	                dur: filteredParam.dur,
	                contentName: filteredParam.streamDescription,
	                contentLength: filteredParam.streamLength,
	                gameDate: filteredParam.gameDate,
	                homeTeam: filteredParam.homeTeam,
	                awayTeam: filteredParam.awayTeam,
	                vs: filteredParam.vs,
	                epgShowTime: filteredParam.epgShowTime,
	                epgShowName: filteredParam.epgShowName
                })
        };

    	msgParams.eventName = "EVENT_CAT_METADATA";

    	msgParams.productID = this.productID;
    	on(APP_EVENT, msgParams);



    };


    VideoTracker.prototype.isVideoOpened = function(){
    	if (!this.view){
    		if (typeof window.nltrack.callbackError === "function") {
                window.nltrack.callbackError("Please call onVideoOpen before other onVideoXXX methods. " +
                		"After calling onVideoStop, the video is closed, then onVideoXXX methods are not allowed to invoke. " +
                		"To replay the video or play other video, please call onVideoOpen first.");
            }
    		return false;
    	}
    	return true;
    }

    VideoTracker.prototype.onVideoStart = function() {
    	if (!this.isVideoOpened()){
    		return;
    	}
    	if (this.view.timer != 0){
    		if (typeof window.nltrack.callbackError === "function") {
                window.nltrack.callbackError("The video started playing. Please don't call onVideoStart again.");
            }
    		return;
    	}

    	// Send VIDEO_START event
        var msgParams = {
        		eventCatContentId:this.getContentId(this.view.type,this.view.id,this.view.extid),
        		eventName : "VIDEO_START"
        };
        msgParams.productID = this.productID;
    	on(APP_EVENT, msgParams);

    	// start heartbeat
    	this.view.startPlaying();
    };

    VideoTracker.prototype.onVideoStatusChange = function(paramObj) {
    	if (!this.isVideoOpened()){
    		return;
    	}

    	var validationRule = {paramFields : ["currentPlayPosition|required|integer",
            "newDropFrameCount|integer", "bitrate|integer",
            "newTraffic", "audioChannel", "isAdaptive",
            "windowMode|required", "bufferTime", "bandwidth",
            "vs|integer", "epgShowTime|valid_time", "epgShowName"
        ]};

    	var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);

        var view = this.view;
        view.playTime = filteredParam.currentPlayPosition;
        if(!!filteredParam.newDropFrameCount){
        	view.dropFrameCount += filteredParam.newDropFrameCount;
        }
        if (!!filteredParam.bitrate) {
        	view.bitrate = filteredParam.bitrate;
        }
        if (!!filteredParam.newTraffic) {
	        for (var k in filteredParam.newTraffic) {
	            var newTraffic = filteredParam.newTraffic[k];
	            var cdnName = newTraffic.cdnName;
	            if (!view.cdnsDelta[cdnName]) {
	                view.cdnsDelta[cdnName] = 0;
	            }
	            if (!view.cdnsBytesloaded[cdnName]) {
	                view.cdnsBytesloaded[cdnName] = 0;
	            }
	            view.cdnsBytesloaded[cdnName] += newTraffic.bytes;
	            view.cdnsDelta[cdnName] += newTraffic.bytes;
	        }
        }
        if (!!filteredParam.audioChannel) {
        	view.audioChannel = filteredParam.audioChannel;
        }
        if (!!filteredParam.isAdaptive) {
        	view.switchMethod = filteredParam.isAdaptive?0:1;
        }
        if (!!filteredParam.windowMode) {
        	view.windowMode = filteredParam.windowMode;
        }
        if (!!filteredParam.bufferTime) {
        	view.bufferTime += filteredParam.bufferTime;
        }
        if (!!filteredParam.bandwidth) {
        	view.bandwidth = filteredParam.bandwidth;
        }
        if (!!filteredParam.vs) {
        	view.vs = filteredParam.vs;
        }
        if (!!filteredParam.epgShowTime) {
        	view.epgShowTime = filteredParam.epgShowTime;
        }
        if (!!filteredParam.epgShowName) {
        	view.epgShowName = filteredParam.epgShowName;
        }
    };

    VideoTracker.prototype.onVideoStop = function() {
    	if (!this.isVideoOpened()){
    		return;
    	}

    	this.view.stopPlaying();
    	this.view = null;
    };

    VideoTracker.prototype.onVideoPause = function() {
    	if (!this.isVideoOpened()){
    		return;
    	}

    	this.view.pausePlaying();
    };

    VideoTracker.prototype.onVideoResume = function() {
    	if (!this.isVideoOpened()){
    		return;
    	}

    	this.view.resumePlaying();
    };

    VideoTracker.prototype.onVideoError = function(paramObj) {
    	if (!this.isVideoOpened()){
    		return;
    	}

    	var validationRule = {
    			paramFields : ["errorCode|required|integer", "errorMsg"]
    	};
    	var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);
        this.view.goError(filteredParam);
    };

    VideoTracker.prototype.onVideoMilestone = function(paramObj) {
    	if (!this.isVideoOpened()){
    		return;
    	}

    	var validationRule = {
    			paramFields : ["percentage|required|integer"]
    	};
    	var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

        var filteredParam = filterParamObj(validationRule.paramFields, paramObj);
        this.view.onVideoMilestone(filteredParam);
    };


    VideoTracker.prototype.onADStart = function(paramObj) {
    	var validationRule = {
    			paramFields : ["adType|required", "type|required","id","extid","gt"]
    	};
    	var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

    	this.ad.startUnixTime = currentUnixTime();

    	var msgParams = {};
    	msgParams.eventName = "AD_START";
    	msgParams.eventCatAdType = paramObj.adType;
    	var contentId = this.getContentId(paramObj.type,paramObj.id,paramObj.extid);
    	msgParams.eventCatContentId = contentId;
    	msgParams.productID = this.productID;
    	on(APP_EVENT, msgParams);

    };

    VideoTracker.prototype.getContentId = function() {
    	var contentId = "";
    	util.each(arguments, function(arg, index, list) {
    		contentId = contentId+(!!arg?arg:"");
    		if (index < list.length-1){
    			contentId = contentId+":";
    		}
        });
    	return contentId;
    }

    VideoTracker.prototype.onADStop = function(paramObj) {
    	var validationRule = {
    			paramFields : ["adType|required", "type|required","id","extid","gt"]
    	};
    	var isValid = check(validationRule, paramObj);

        if (!isValid) {
        	return;
        }

    	var duration = 0;
    	if (this.ad.startUnixTime>0){
    		duration = currentUnixTime() - this.ad.startUnixTime;
    	}

    	var msgParams = {};
    	msgParams.eventName = "AD_STOP";
    	msgParams.eventValue = duration;
    	msgParams.eventCatAdType = paramObj.adType;
    	var contentId = this.getContentId(paramObj.type,paramObj.id,paramObj.extid);
    	msgParams.eventCatContentId = contentId;
    	msgParams.productID = this.productID;
    	on(APP_EVENT, msgParams);
    	this.ad = {};
    };

    function View() {
        this.viewID = generateViewID();
        this.timer = 0;
        this.currentMsgID = 0;
        this.bufferTime = 0;
        this.cdnsDelta = {};
        this.cdnsBytesloaded = {};
        this.dropFrameCount = 0;
        this.windowMode = "normal";
        this.playTime = 0;
        this.bandwidth = 0;
        this.bitrate = 0;
        this.switchMethod = 1; // non-adpative at default
        this.startupTime = 0;
        this.lastHBUnixTime = 0;
        this.sentMilestonePercentages = [];

    };

    View.prototype.open = function() {
        this.openUTC = currentUTC();
    };

    View.prototype.startPlaying = function() {
    	this.startupTime = currentUTC() - this.openUTC;
    	this.startHeartbeat();

    };
    View.prototype.pausePlaying = function() {
        clearTimeout(this.timer);
        this.timer = 0;
    };
    View.prototype.resumePlaying = function() {
        this.startHeartbeat();
    };
    View.prototype.stopPlaying = function() {
        clearTimeout(this.timer);
        this.timer = 0;
        this.sendMsg(VIDEO_STOP, this.getViewParams());
    };
    View.prototype.goError = function(params) {
        this.sendMsg(VIDEO_ERROR, util.extendNonUndefined(this.getViewParams(), params));
    };


    View.prototype.startHeartbeat = function() {
	    this.sendHeartbeat();
        var self = this;
        clearTimeout(this.timer);
        this.timer = setInterval(function() {
            self.sendHeartbeat();
        }, settings("videoHBIntervalSec") * 1000);
    };

    View.prototype.sendHeartbeat = function() {
    	var unixTime = currentUnixTime();
	    if (unixTime-this.lastHBUnixTime>=settings("videoHBIntervalSec")){
	        this.sendMsg(VIDEO_HB, this.getViewParams());
	        this.clearIntervalVars();
	        this.lastHBUnixTime = unixTime;
	    }
    };

    View.prototype.onVideoMilestone = function(params) {
    	if (util.contains(this.sentMilestonePercentages,params.percentage)){
    		return;
    	}
    	var videoEventParams = {eventName:"PERCENTAGE", eventValue:params.percentage};
    	this.sendMsg(VIDEO_EVENT, util.extendNonUndefined(this.getViewParams(), videoEventParams));
    	this.sentMilestonePercentages.push(params.percentage);
    }

    View.prototype.clearIntervalVars = function() {
    	this.cdnsDelta = {};
    	for (var cdnName in this.cdnsBytesloaded){
    		this.cdnsDelta[cdnName]=0;
    	}

        this.buffers = [];
        this.dropFrameCount = 0;
        this.bufferTime = 0;
    };

    View.prototype.sendMsg = function(type, videoParams) {
    	videoParams.productID = this.productID;
        on(type, videoParams);
    };

    View.prototype.getViewParams = function() {

        var viewParams = {
            viewID: this.viewID,
            msgID: this.currentMsgID++,
            ppType: this.type,
            ppId: this.id,
            ppExtid : this.extid,
            ppGt: this.gt,
            ppGs: this.gs,
            ppSt: this.st,
            ppDur: this.dur,
            ppTrailer: this.trailer,
            ppAudio: this.audio,
            ppCam: this.cam,

            audioChannel: this.audioChannel,
            streamDescription: this.streamDescription,
            streamURL: this.streamURL,
            streamLength: this.streamLength,

            gameDate: this.gameDate,
            homeTeam: this.homeTeam,
            awayTeam: this.awayTeam,

            player: this.player,

            windowMode: this.windowMode,

            playTime: this.playTime,

            bandwidth: this.bandwidth,

            bitrate: this.bitrate,
            switchMethod: this.switchMethod,

            dropFrameCount: this.dropFrameCount,
            bufferTime: this.bufferTime,
            startupTime: this.startupTime,

            vs: this.vs,

            epgShowTime: this.epgShowTime,
            epgShowName: this.epgShowName,

            updateInterval:settings("videoHBIntervalSec")

        };

        if (util.keys(this.cdnsBytesloaded).length>0){
        	viewParams.cdnName = util.keys(this.cdnsBytesloaded);
        	viewParams.bytesLoaded = util.values(this.cdnsBytesloaded);
        	viewParams.bytesLoadedDelta = util.values(this.cdnsDelta);
        }

        return viewParams;
    };

    /**
	 * Util starts
	 */
    function initUtils() {
        var util = {};
        var document = window.document;
        var breaker = {},
            key,
            name,
            scriptTypeRE = /^(?:text|application)\/javascript/i,
            xmlTypeRE = /^(?:text|application)\/xml/i,
            jsonType = 'application/json',
            htmlType = 'text/html',
            blankRE = /^\s*$/,
            empty = function() {};

        var trimLeft = /^\s+/;
        var trimRight = /\s+$/;

        function ajaxSuccess(data, xhr, settings, deferred) {
            var context = settings.context,
                status = 'success';
            settings.success.call(context, data, status, xhr);
        }

        function ajaxError(error, type, xhr, settings, deferred) {
            var context = settings.context;
            settings.error.call(context, xhr, type, error);
        }

        function mimeToDataType(mime) {
            if (mime) mime = mime.split(';', 2)[0];
            return mime && (mime == htmlType ? 'html' :
                mime == jsonType ? 'json' :
                scriptTypeRE.test(mime) ? 'script' :
                xmlTypeRE.test(mime) && 'xml') || 'text';
        };

        util.trim = String.prototype.trim ? function(text) {
                return text == null ? "" : String.prototype.trim.call(text);
            } :
            // Otherwise use our own trimming functionality
            function(text) {
                return text == null ? "" : text.toString().replace(trimLeft, "")
                    .replace(trimRight, "");
            };
        util.isEmpty = function(obj) {
            for (var name in obj) {
                return false;
            }
            return true;
        };
        util.omit = function(obj) {
            var copy = {};
            var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
            for (var key in obj) {
                if (!util.contains(keys, key))
                    copy[key] = obj[key];
            }
            return copy;
        };


        util.identity = function(value) {
            return value;
        };

        util.each = function(obj, iterator, context) {
            if (obj == null) return obj;
            if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
                obj.forEach(iterator, context);
            } else if (obj.length === +obj.length) {
                for (var i = 0, length = obj.length; i < length; i++) {
                    if (iterator.call(context, obj[i], i, obj) === breaker) return;
                }
            } else {
                var keys = util.keys(obj);
                for (var i = 0, length = keys.length; i < length; i++) {
                    if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
                }
            }
            return obj;
        };

        util.any = function(obj, predicate, context) {
            predicate || (predicate = util.identity);
            var result = false;
            if (obj == null) return result;
            if (Array.prototype.some && obj.some === Array.prototype.some) return obj.some(predicate, context);
            util.each(obj, function(value, index, list) {
                if (result || (result = predicate.call(context, value, index, list))) return breaker;
            });
            return !!result;
        };

        util.contains = util.include = function(obj, target) {
            if (obj == null)
                return false;
            if (Array.prototype.indexOf && obj.indexOf === Array.prototype.indexOf)
                return obj.indexOf(target) != -1;
            return util.any(obj, function(value) {
                return value === target;
            });
        };

        util.pick = function(obj) {
            var copy = {};
            var keys = Array.prototype.concat.call(Array.prototype.slice.call(arguments, 1));
            util.each(keys, function(key) {
                if (key in obj) copy[key] = obj[key];
            });
            return copy;
        };
        util.extend = function(obj) {
            util.each(Array.prototype.slice.call(arguments, 1), function(source) {
                if (source) {
                    for (var prop in source) {
                        obj[prop] = source[prop];
                    }
                }
            });
            return obj;
        };
        util.extendNonUndefined = function(obj) {
            util.each(Array.prototype.slice.call(arguments, 1), function(source) {
                if (source) {
                    for (var prop in source) {
                        if (typeof source[prop] !== "undefined") {
                            obj[prop] = source[prop];
                        }
                    }
                }
            });
            return obj;
        };
        util.indexOf = function(array, item) {
            if (array == null)
                return -1;
            var i = 0,
                length = array.length;
            if (Array.prototype.indexOf && array.indexOf === Array.prototype.indexOf)
                return array.indexOf(item);
            for (; i < length; i++)
                if (array[i] === item)
                    return i;
            return -1;
        };
        util.isObject = function(obj) {
            return obj === Object(obj);
        };
        util.keys = function(obj) {
            if (!util.isObject(obj))
                return [];
            if (Object.keys)
                return Object.keys(obj);
            var keys = [];
            for (var key in obj)
                if (hasOwnProperty.call(obj, key))
                    keys.push(key);
            return keys;
        };
        util.values = function(obj) {
            var keys = util.keys(obj);
            var length = keys.length;
            var values = new Array(length);
            for (var i = 0; i < length; i++) {
                values[i] = obj[keys[i]];
            }
            return values;
        };
        util.cookie = function(key, value, options) {
            var days, time, result, decode;

            // A key and value were given. Set cookie.
            if (arguments.length > 1 && String(value) !== "[object Object]") {
                // Enforce object
                options = util.extend({}, options);

                if (value === null || value === undefined)
                    options.expires = -1;

                if (typeof options.expires === 'number') {
                    days = (options.expires * 24 * 60 * 60 * 1000);
                    time = options.expires = new Date();

                    time.setTime(time.getTime() + days);
                }

                value = String(value);

                return (document.cookie = [
                    encodeURIComponent(key),
                    '=',
                    options.raw ? value : encodeURIComponent(value),
                    options.expires ? '; expires=' + options.expires.toUTCString() : '',
                    options.path ? '; path=' + options.path : '',
                    options.domain ? '; domain=' + options.domain : '',
                    options.secure ? '; secure' : ''
                ].join(''));
            }

            // Key and possibly options given, get cookie
            options = value || {};

            decode = options.raw ? function(s) {
                return s;
            } : decodeURIComponent;

            return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)')
                .exec(document.cookie)) ? decode(result[1]) : null;
        };



        util.param = function(obj) {
            var result = [];
            for (var key in obj) {
                result.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
            }
            return result.join('&').replace(/%20/g, '+')
        };

        util.ajaxSettings = {
            // Default type of request
            type: 'GET',
            // Callback that is executed before request
            beforeSend: empty,
            // Callback that is executed if the request succeeds
            success: empty,
            // Callback that is executed the the server drops error
            error: empty,
            // Callback that is executed on request complete (both:
            // error and success)
            complete: empty,
            // The context for the callbacks
            context: null,
            // Whether to trigger "global" Ajax events
            global: true,
            // Transport
            xhr: function() {
                return new window.XMLHttpRequest();
            },
            // MIME types mapping
            // IIS returns Javascript as "application/x-javascript"
            accepts: {
                script: 'text/javascript, application/javascript, application/x-javascript',
                json: jsonType,
                xml: 'application/xml, text/xml',
                html: htmlType,
                text: 'text/plain'
            },
            // Whether the request is to another domain
            crossDomain: false,
            // Default timeout
            timeout: 0,
            // Whether data should be serialized to string
            processData: true,
            // Whether the browser should be allowed to cache GET
            // responses
            cache: true
        };

        util.ajax = function(options) {
            var settings = util.extend({}, options || {}),
                deferred = util.Deferred && util.Deferred();
            for (key in util.ajaxSettings)
                if (settings[key] === undefined) settings[key] = util.ajaxSettings[key];

                // ajaxStart(settings)

            if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
                RegExp.$2 != window.location.host;

            if (!settings.url) settings.url = window.location.toString();

            if (settings.cache === false) settings.url = appendQuery(settings.url, '_=' + Date.now());

            var dataType = settings.dataType,
                hasPlaceholder = /\?.+=\?/.test(settings.url);
            if (dataType == 'jsonp' || hasPlaceholder) {
                if (!hasPlaceholder)
                    settings.url = appendQuery(settings.url,
                        settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?');
                return util.ajaxJSONP(settings, deferred);
            }

            var mime = settings.accepts[dataType],
                headers = {},
                setHeader = function(name, value) {
                    headers[name.toLowerCase()] = [name, value];
                },
                protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
                xhr = settings.xhr(),
                nativeSetHeader = xhr.setRequestHeader,
                abortTimeout;

            if (deferred) deferred.promise(xhr);

            if (!settings.crossDomain) setHeader('X-Requested-With', 'XMLHttpRequest');
            setHeader('Accept', mime || '*/*');
            if (mime = settings.mimeType || mime) {
                if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0];
                xhr.overrideMimeType && xhr.overrideMimeType(mime);
            }
            if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
                setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded');

            if (settings.headers)
                for (name in settings.headers) setHeader(name, settings.headers[name]);
            xhr.setRequestHeader = setHeader;

            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    xhr.onreadystatechange = empty;
                    clearTimeout(abortTimeout);
                    var result, error = false;
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
                        dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'));
                        result = xhr.responseText;

                        try {
                            // http://perfectionkills.com/global-eval-what-are-the-options/
                            if (dataType == 'script')(1, eval)(result);
                            else if (dataType == 'xml') result = xhr.responseXML;
                            else if (dataType == 'json') result = blankRE.test(result) ? null : util.parseJSON(result);
                        } catch (e) {
                            console.log("onreadystatechange error");
                            error = e;
                        }

                        if (error) ajaxError(error, 'parsererror', xhr, settings, deferred);
                        else ajaxSuccess(result, xhr, settings, deferred);
                    } else {
                        ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred);
                    }
                }
            };

            if (settings.xhrFields)
                for (name in settings.xhrFields) xhr[name] = settings.xhrFields[name];

            var async = 'async' in settings ? settings.async : true;
            xhr.open(settings.type, settings.url, async, settings.username, settings.password);

            for (name in headers) nativeSetHeader.apply(xhr, headers[name]);

            if (settings.timeout > 0) abortTimeout = setTimeout(function() {
                xhr.onreadystatechange = empty;
                xhr.abort();
                ajaxError(null, 'timeout', xhr, settings, deferred);
            }, settings.timeout);

            // avoid sending empty string (#319)
            xhr.send(settings.data ? settings.data : null);
            return xhr;

        };

        util.stringify = function(value, replacer, space){
        	if (typeof JSON === "undefined") {
                meta = {    // table of character substitutions
                    '\b': '\\b',
                    '\t': '\\t',
                    '\n': '\\n',
                    '\f': '\\f',
                    '\r': '\\r',
                    '"': '\\"',
                    '\\': '\\\\'
                };
                    var i;
                    gap = '';
                    indent = '';
                    if (typeof space === 'number') {
                        for (i = 0; i < space; i += 1) {
                            indent += ' ';
                        }
                    } else if (typeof space === 'string') {
                        indent = space;
                    }
                    rep = replacer;
                    if (replacer && typeof replacer !== 'function' &&
                            (typeof replacer !== 'object' ||
                            typeof replacer.length !== 'number')) {
                        throw new Error('JSON.stringify');
                    }
                    return str('', {'': value});
        	}
        	else{
        		return JSON.stringify(value, replacer, space);
        	}
       }

        function str(key, holder) {
        	        var i,          // The loop counter.
        	            k,          // The member key.
        	            v,          // The member value.
        	            length,
        	            mind = gap,
        	            partial,
        	            value = holder[key];
        	        if (value && typeof value === 'object' &&
        	                typeof value.toJSON === 'function') {
        	            value = value.toJSON(key);
        	        }
        	        if (typeof rep === 'function') {
        	            value = rep.call(holder, key, value);
        	        }
        	        switch (typeof value) {
        	        case 'string':
        	            return quote(value);

        	        case 'number':
        	            return isFinite(value)
        	                ? String(value)
        	                : 'null';
        	        case 'boolean':
        	        case 'null':
        	            return String(value);
        	        case 'object':
        	            if (!value) {
        	                return 'null';
        	            }
        	            gap += indent;
        	            partial = [];
        	            if (Object.prototype.toString.apply(value) === '[object Array]') {
        	                length = value.length;
        	                for (i = 0; i < length; i += 1) {
        	                    partial[i] = str(i, value) || 'null';
        	                }
        	                v = partial.length === 0
        	                    ? '[]'
        	                    : gap
        	                        ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
        	                        : '[' + partial.join(',') + ']';
        	                gap = mind;
        	                return v;
        	            }
        	            if (rep && typeof rep === 'object') {
        	                length = rep.length;
        	                for (i = 0; i < length; i += 1) {
        	                    if (typeof rep[i] === 'string') {
        	                        k = rep[i];
        	                        v = str(k, value);
        	                        if (v) {
        	                            partial.push(quote(k) + (
        	                                gap
        	                                    ? ': '
        	                                    : ':'
        	                            ) + v);
        	                        }
        	                    }
        	                }
        	            } else {
        	                for (k in value) {
        	                    if (Object.prototype.hasOwnProperty.call(value, k)) {
        	                        v = str(k, value);
        	                        if (v) {
        	                            partial.push(quote(k) + (
        	                                gap
        	                                    ? ': '
        	                                    : ':'
        	                            ) + v);
        	                        }
        	                    }
        	                }
        	            }
        	            v = partial.length === 0
        	                ? '{}'
        	                : gap
        	                    ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
        	                    : '{' + partial.join(',') + '}';
        	            gap = mind;
        	            return v;
        	        }
        }

        var rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

        function quote(string) {
        	        rx_escapable.lastIndex = 0;
        	        return rx_escapable.test(string)
        	            ? '"' + string.replace(rx_escapable, function (a) {
        	                var c = meta[a];
        	                return typeof c === 'string'
        	                    ? c
        	                    : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        	            }) + '"'
        	            : '"' + string + '"';
        }

        // Embedded JSON Param Validator
        (function() {
            var defaults = {
                messages: {
                    required: 'The %s field is required.',
                    matches: 'The %s field does not match the %s field.',
                    "default": 'The %s field is still set to default, please change.',
                    valid_email: 'The %s field must contain a valid email address.',
                    valid_emails: 'The %s field must contain all valid email addresses.',
                    min_length: 'The %s field must be at least %s characters in length.',
                    max_length: 'The %s field must not exceed %s characters in length.',
                    exact_length: 'The %s field must be exactly %s characters in length.',
                    greater_than: 'The %s field must contain a number greater than %s.',
                    less_than: 'The %s field must contain a number less than %s.',
                    alpha: 'The %s field must only contain alphabetical characters.',
                    alpha_numeric: 'The %s field must only contain alpha-numeric characters.',
                    alpha_dash: 'The %s field must only contain alpha-numeric characters, underscores, and dashes.',
                    numeric: 'The %s field must contain only numbers.',
                    integer: 'The %s field must contain an integer.',
                    decimal: 'The %s field must contain a decimal number.',
                    is_natural: 'The %s field must contain only positive numbers.',
                    is_natural_no_zero: 'The %s field must contain a number greater than zero.',
                    valid_ip: 'The %s field must contain a valid IP.',
                    valid_url: 'The %s field must contain a valid URL.',
                    valid_time: 'The %s field must contain a time string like yyyy-MM-dd HH:mm'
                },
                callback: function(errors) {

                }
            };

            /*
			 * Define the regular expressions that will be used
			 */

            var ruleRegex = /^(.+?)\[(.+)\]$/,
                numericRegex = /^[0-9]+$/,
                integerRegex = /^\-?[0-9]+$/,
                decimalRegex = /^\-?[0-9]*\.?[0-9]+$/,
                emailRegex = /^[a-zA-Z0-9.!#$%&amp;'*+\-\/=?\^_`{|}~\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*$/,
                alphaRegex = /^[a-z]+$/i,
                alphaNumericRegex = /^[a-z0-9]+$/i,
                alphaDashRegex = /^[a-z0-9_\-]+$/i,
                naturalRegex = /^[0-9]+$/i,
                naturalNoZeroRegex = /^[1-9][0-9]*$/i,
                ipRegex = /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})$/i,
                base64Regex = /[^a-zA-Z0-9\/\+=]/i,
                numericDashRegex = /^[\d\-\s]+$/,
                timeRegex = /^((((19|[2-9]\d)\d{2})[\/\.-](0[13578]|1[02])[\/\.-](0[1-9]|[12]\d|3[01])\s(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]))|(((19|[2-9]\d)\d{2})[\/\.-](0[13456789]|1[012])[\/\.-](0[1-9]|[12]\d|30)\s(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]))|(((19|[2-9]\d)\d{2})[\/\.-](02)[\/\.-](0[1-9]|1\d|2[0-8])\s(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]))|(((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|((16|[2468][048]|[3579][26])00))[\/\.-](02)[\/\.-](29)\s(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])))$/,
                urlRegex = /^((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/;

            var JSONParamValidator = function(fields) {
                this.errors = [];
                this.fields = {};
                this.messages = {};
                this.handlers = {};

                for (var i = 0, fieldLength = fields.length; i < fieldLength; i++) {
                    var field = fields[i];
                    var nameRules = field.split("|");
                    var name = nameRules.shift();
                    field = {
                        name: name,
                        rules: nameRules
                    };
                    // If passed in incorrectly, we need to skip the field.
                    if ((!field.name && !field.names) || !field.rules) {
                        continue;
                    }

                    /*
					 * Build the master fields array that has all the
					 * information needed to validate
					 */

                    if (field.names) {
                        for (var j = 0; j < field.names.length; j++) {
                            this._addField(field, field.names[j]);
                        }
                    } else {
                        this._addField(field, field.name);
                    }
                }
            };

            /*
			 * @public Sets a custom message for one of the rules
			 */

            JSONParamValidator.prototype.setMessage = function(rule, message) {
                this.messages[rule] = message;

                // return this for chaining
                return this;
            };

            /*
			 * @public Registers a callback for a custom rule (i.e.
			 * callback_username_check)
			 */

            JSONParamValidator.prototype.registerCallback = function(name,
                handler) {
                if (name && typeof name === 'string' && handler && typeof handler === 'function') {
                    this.handlers[name] = handler;
                }

                // return this for chaining
                return this;
            };

            /*
			 * @private Determines if a form dom node was passed in or just a
			 * string representing the form name
			 */

            JSONParamValidator.prototype._formByNameOrNode = function(
                formNameOrNode) {
                return (typeof formNameOrNode === 'object') ? formNameOrNode : document.forms[formNameOrNode];
            };

            /*
			 * @private Adds a file to the master fields array
			 */

            JSONParamValidator.prototype._addField = function(field, nameValue) {
                this.fields[nameValue] = {
                    name: nameValue,
                    display: field.display || nameValue,
                    rules: field.rules,
                    id: null,
                    type: null,
                    value: null,
                    checked: null
                };
            };

            /*
			 * @private Runs the validation when the form is submitted.
			 */

            JSONParamValidator.prototype.validate = function(paramObj) {
                this.errors = [];

                for (var key in this.fields) {
                    if (this.fields.hasOwnProperty(key)) {
                        var field = this.fields[key] || {};
                        field.value = paramObj[field.name];
                        this._validateField(field);
                    }
                }

                if (typeof this.callback === 'function') {
                    this.callback(this.errors, evt);
                }

                if (this.errors.length > 0) {
                    if (typeof window.nltrack.callbackError === "function") {
                        window.nltrack.callbackError(this.errors);
                    }
                    return false;
                }

                return true;
            };

            /*
			 * @private Looks at the fields value and evaluates it against the
			 * given rules
			 */

            JSONParamValidator.prototype._validateField = function(field) {
                var rules = field.rules, // .split('|'),
                    indexOfRequired = rules.join("|").indexOf('required'),
                    isEmpty = (field.value === '' || field.value === undefined);

                /*
				 * Run through the rules and execute the validation methods as
				 * needed
				 */

                for (var i = 0, ruleLength = rules.length; i < ruleLength; i++) {
                    var method = rules[i],
                        param = null,
                        failed = false,
                        parts = ruleRegex
                        .exec(method);

                    /*
					 * If this field is not required and the value is empty,
					 * continue on to the next rule unless it's a callback. This
					 * ensures that a callback will always be called but other
					 * rules will be skipped.
					 */

                    if (indexOfRequired === -1 && method.indexOf('!callback_') === -1 && isEmpty) {
                        continue;
                    }

                    /*
					 * If the rule has a parameter (i.e. matches[param]) split
					 * it out
					 */

                    if (parts) {
                        method = parts[1];
                        param = parts[2];
                    }

                    if (method.charAt(0) === '!') {
                        method = method.substring(1, method.length);
                    }

                    /*
					 * If the hook is defined, run it to find any validation
					 * errors
					 */

                    if (typeof this._hooks[method] === 'function') {
                        if (!this._hooks[method].apply(this, [field, param])) {
                            failed = true;
                        }
                    } else if (method.substring(0, 9) === 'callback_') {
                        // Custom method. Execute the handler if it was
                        // registered
                        method = method.substring(9, method.length);

                        if (typeof this.handlers[method] === 'function') {
                            if (this.handlers[method].apply(this, [
                                    field.value, param
                                ]) === false) {
                                failed = true;
                            }
                        }
                    }

                    /*
					 * If the hook failed, add a message to the errors array
					 */

                    if (failed) {
                        // Make sure we have a message for this rule
                        var source = this.messages[method] || defaults.messages[method],
                            message = 'An error has occurred with the ' + field.display + ' field.';

                        if (source) {
                            message = source.replace('%s', field.display);

                            if (param) {
                                message = message
                                    .replace(
                                        '%s', (this.fields[param]) ? this.fields[param].display : param);
                            }
                        }

                        this.errors.push({
                            id: field.id,
                            name: field.name,
                            message: message,
                            rule: method
                        });
                        break;
                    }
                }
            };

            /*
			 * @private Object containing all of the validation hooks
			 */

            JSONParamValidator.prototype._hooks = {
                required: function(field) {
                    if (typeof field.value === "Number") {
                        return true;
                    }
                    if (typeof field.value === "undefined" || field.value === null || util.trim(field.value).length < 1) {
                        return false;
                    } else {
                        return true;
                    }
                },

                "default": function(field, defaultName) {
                    return field.value !== defaultName;
                },

                matches: function(field, matchName) {
                    var el = this.form[matchName];

                    if (el) {
                        return field.value === el.value;
                    }

                    return false;
                },

                valid_email: function(field) {
                    return emailRegex.test(field.value);
                },

                valid_emails: function(field) {
                    var result = field.value.split(",");

                    for (var i = 0; i < result.length; i++) {
                        if (!emailRegex.test(result[i])) {
                            return false;
                        }
                    }

                    return true;
                },

                min_length: function(field, length) {
                    if (!numericRegex.test(length)) {
                        return false;
                    }

                    return (field.value.length >= parseInt(length, 10));
                },

                max_length: function(field, length) {
                    if (!numericRegex.test(length)) {
                        return false;
                    }

                    return (field.value.length <= parseInt(length, 10));
                },

                exact_length: function(field, length) {
                    if (!numericRegex.test(length)) {
                        return false;
                    }

                    return (field.value.length === parseInt(length, 10));
                },

                greater_than: function(field, param) {
                    if (!decimalRegex.test(field.value)) {
                        return false;
                    }

                    return (parseFloat(field.value) > parseFloat(param));
                },

                less_than: function(field, param) {
                    if (!decimalRegex.test(field.value)) {
                        return false;
                    }

                    return (parseFloat(field.value) < parseFloat(param));
                },

                alpha: function(field) {
                    return (alphaRegex.test(field.value));
                },

                alpha_numeric: function(field) {
                    return (alphaNumericRegex.test(field.value));
                },

                alpha_dash: function(field) {
                    return (alphaDashRegex.test(field.value));
                },

                numeric: function(field) {
                    return (numericRegex.test(field.value));
                },

                integer: function(field) {
                    return (integerRegex.test(field.value));
                },

                decimal: function(field) {
                    return (decimalRegex.test(field.value));
                },

                is_natural: function(field) {
                    return (naturalRegex.test(field.value));
                },

                is_natural_no_zero: function(field) {
                    return (naturalNoZeroRegex.test(field.value));
                },

                valid_ip: function(field) {
                    return (ipRegex.test(field.value));
                },

                valid_url: function(field) {
                    return (urlRegex.test(field.value));
                },

                valid_time: function(field) {
                	return (timeRegex.test(field.value));
                }
            };
            util.JSONParamValidator = JSONParamValidator;
        })();

        util.getAppType = function() {
            // prefetch the device type and append the "_html"
            // the user agent for browser testing.
            var userAgent = navigator.userAgent;

            var deviceType;

            var isIphone = (/iPhone/i).test(userAgent);
            var isIpad = (/iPad/i).test(userAgent);
            var isIpod = (/iPod/i).test(userAgent);
            var isIos = isIphone || isIpad || isIpod;
            var isAndroid = (/Android/i).test(userAgent);
            var isAndroidPhone;
            var isAndroidPad;
            if (isAndroid) {
                // As a solution for mobile sites, our Android engineers
                // recommend to specifically
                // detect “mobile” in the User-Agent string as well as
                // “android.”
                isAndroidPhone = (/Mobile/i).test(userAgent);
                if (!isAndroidPhone) isAndroidPad = true;
            }

            var isChromecast = (/CrKey/i).test(userAgent);


            if (isIos) {
                if (isIphone) {
                    deviceType = "iphone_html";
                } else if (isIpad) {
                    deviceType = "ipad_html";
                } else if (isIpod) {
                    // hotfix for the Qos service definition
                    deviceType = "ipodtouch_html";
                }
            } else if (isAndroid) {
                if (isAndroidPhone) {
                    deviceType = "android_phone_html";
                } else if (isAndroidPad) {
                    deviceType = "android_pad_html";
                }
            } else if (isChromecast){
            	deviceType = "chromecast";
            } else {
                deviceType = "desktop";
            }
            return deviceType;
        };

        util.getOS = function() {
            // prefetch the device type and append the "_html"
            // the user agent for browser testing.
            var userAgent = navigator.userAgent;


            var os;

            var isIphone = (/iPhone/i).test(userAgent);
            var isIpad = (/iPad/i).test(userAgent);
            var isIpod = (/iPod/i).test(userAgent);
            var isIos = isIphone || isIpad || isIpod;
            var isAndroid = (/Android/i).test(userAgent);
            var isAndroidPhone;
            var isAndroidPad;

            var isWin = (/win/i).test(navigator.platform);
            var isMac = (/Mac/i).test(navigator.platform);
            if (isAndroid) {
                // As a solution for mobile sites, our Android engineers
                // recommend to specifically
                // detect “mobile” in the User-Agent string as well as
                // “android.”
                isAndroidPhone = (/Mobile/i).test(userAgent);
                if (!isAndroidPhone) isAndroidPad = true;
            }

            if (isIos) {
                os = "iOS";
                var match = userAgent.match(/OS [4-9]_\d[_\d]*/);
                if (match) {
                    os = os + " " + match[0].substring(3);
                }
            } else if (isAndroid) {
                os = "Android";
                var match = userAgent.match(/Android\s([0-9\.]*)/);
                if (match) {
                    os = os + " " + match[1];
                }
            } else if (isWin) {
                os = "Windows";
                var isWin2K = userAgent.indexOf("Windows NT 5.0") > -1 || userAgent.indexOf("Windows 2000") > -1;
                if (isWin2K) {
                    os = "Windows 2000";
                }
                var isWinXP = userAgent.indexOf("Windows NT 5.1") > -1 || userAgent.indexOf("Windows XP") > -1;
                if (isWinXP) {
                    os = "Windows XP";
                }
                var isWin2003 = userAgent.indexOf("Windows NT 5.2") > -1 || userAgent.indexOf("Windows 2003") > -1;
                if (isWin2003) {
                    os = "Windows 2003";
                }
                var isWinVista = userAgent.indexOf("Windows NT 6.0") > -1 || userAgent.indexOf("Windows Vista") > -1;
                if (isWinVista) {
                    os = "Windows Vista";
                }
                var isWin7 = userAgent.indexOf("Windows NT 6.1") > -1 || userAgent.indexOf("Windows 7") > -1;
                if (isWin7) {
                    os = "Windows 7";
                }
                var isWin8 = userAgent.indexOf("Windows NT 6.2") > -1 || userAgent.indexOf("Windows 8") > -1;
                if (isWin8) {
                    os = "Windows 8";
                }

            } else if (isMac) {
                os = "Mac";
            } else {
                os = "Unknown";
            }
            return os;
        };

        util.BrowserDetect = {
            init: function() {
                this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
                this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) || "an unknown version";
                this.OS = this.searchString(this.dataOS) || "an unknown OS";
            },
            searchString: function(data) {
                for (var i = 0; i < data.length; i++) {
                    var dataString = data[i].string;
                    var dataProp = data[i].prop;
                    this.versionSearchString = data[i].versionSearch || data[i].identity;
                    if (dataString) {
                        if (dataString.indexOf(data[i].subString) != -1){
                        	if(data[i].subString === "Gecko" && (!!window.ActiveXObject || "ActiveXObject" in window)){//for IE 11
                        		return "Explorer";
                        	}
                        	else{
                        		return data[i].identity;
                        	}
                        }
                    } else if (dataProp)
                        return data[i].identity;
                }
            },
            searchVersion: function(dataString) {
                var index = dataString.indexOf(this.versionSearchString);
                if (index == -1) return;
                return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
            },
            dataBrowser: [{
                string: navigator.userAgent,
                subString: "Chrome",
                identity: "Chrome"
            }, {
                string: navigator.userAgent,
                subString: "OmniWeb",
                versionSearch: "OmniWeb/",
                identity: "OmniWeb"
            }, {
                string: navigator.vendor,
                subString: "Apple",
                identity: "Safari",
                versionSearch: "Version"
            }, {
                prop: window.opera,
                identity: "Opera",
                versionSearch: "Version"
            }, {
                string: navigator.vendor,
                subString: "iCab",
                identity: "iCab"
            }, {
                string: navigator.vendor,
                subString: "KDE",
                identity: "Konqueror"
            }, {
                string: navigator.userAgent,
                subString: "Firefox",
                identity: "Firefox"
            }, {
                string: navigator.vendor,
                subString: "Camino",
                identity: "Camino"
            }, { // for newer Netscapes (6+)
                string: navigator.userAgent,
                subString: "Netscape",
                identity: "Netscape"
            }, {
                string: navigator.userAgent,
                subString: "MSIE",
                identity: "Explorer",
                versionSearch: "MSIE"
            }, {
                string: navigator.userAgent,
                subString: "Gecko",
                identity: "Mozilla",
                versionSearch: "rv"
            }, { // for older Netscapes (4-)
                string: navigator.userAgent,
                subString: "Mozilla",
                identity: "Netscape",
                versionSearch: "Mozilla"
            }],
            dataOS: [{
                string: navigator.platform,
                subString: "Win",
                identity: "Windows"
            }, {
                string: navigator.platform,
                subString: "Mac",
                identity: "Mac"
            }, {
                string: navigator.userAgent,
                subString: "iPhone",
                identity: "iPhone/iPod"
            }, {
                string: navigator.platform,
                subString: "Linux",
                identity: "Linux"
            }]

        };

        util.BrowserDetect.init();

        return util;

    };
    /**
	 * Util ends
	 */

})();
