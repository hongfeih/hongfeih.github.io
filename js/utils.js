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

function getOffset(el) {
  var _x = 0;
  var _y = 0;
  var _width = el.offsetWidth;
  var _height = el.offsetHeight;
  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
    _x += el.offsetLeft - el.scrollLeft;
    _y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return { top: _y, left: _x, width: _width, height: _height };
}

$.getMultiScripts = function(arr, path) {
  var _arr = $.map(arr, function(scr) {
      return $.getScript( (path||"") + scr );
  });

  _arr.push($.Deferred(function( deferred ){
      $( deferred.resolve );
  }));

  return $.when.apply($, _arr);
}

function toDateString(epoch) {
  var date = new Date(epoch * 1000);
  return (date.getMonth() + 1) + "/" +
    date.getDate() + "/" +
    date.getFullYear() + " " +
    date.getHours() + ":" +
    date.getMinutes() + ":" +
    date.getSeconds()
}

function buildTimeString_(displayTime, showHour) {
  var h = Math.floor(displayTime / 3600);
  var m = Math.floor(displayTime / 60 % 60);
  var s = Math.floor(displayTime % 60);

  if (s < 10) {
    s = '0' + s;
  }

  var text = m + ':' + s;

  if (showHour) {
    if (m < 10) {
      text = '0' + text;
    }
    text = h + ':' + text;
  }
  return text;
}