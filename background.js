var timers = {};

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.websites) {
    var websites = changes.websites.newValue;
    websites.forEach(function(website) {
      if (website.enabled) {
        createAlarm(website.url, website.interval);
      } else {
        removeAlarm(website.url);
      }
    });
  }
});

function createAlarm(website, interval) {
  chrome.alarms.create(website, {
    periodInMinutes: parseInt(interval, 10)
  });
}

function removeAlarm(website) {
  chrome.alarms.clear(website);
}

chrome.alarms.onAlarm.addListener(function(alarm) {
  refreshWebsite(alarm.name);
});

function refreshWebsite(website) {
  chrome.tabs.query({ url: website }, function(tabs) {
    if (tabs.length > 0) {
      chrome.tabs.reload(tabs[0].id, {}, function() {
        logEvent('Website refreshed: ' + website, 'lightgreen');
      });
    } else {
      chrome.tabs.create({ url: website }, function(tab) {
        logEvent('Website refreshed: ' + website, 'lightgreen');
      });
    }
  });
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'startTimer') {
    var website = message.website;
    var interval = message.interval;
    startTimer(website, interval);
  } else if (message.action === 'stopTimer') {
    var website = message.website;
    stopTimer(website);
  }
});

function startTimer(website, interval) {
  if (timers[website]) {
    clearInterval(timers[website]);
  }
  var timeLeft = interval * 60;
  timers[website] = setInterval(function() {
    updateTimerDisplay(website, timeLeft);
    timeLeft--;
    if (timeLeft < 0) {
      refreshWebsite(website);
      timeLeft = interval * 60;
    }
  }, 1000);
}

function stopTimer(website) {
  if (timers[website]) {
    clearInterval(timers[website]);
    delete timers[website];
  }
}

function updateTimerDisplay(website, timeLeft) {
  chrome.storage.sync.get(['websites', 'secondsEnabled'], function(data) {
    var websites = data.websites || [];
    var secondsEnabled = data.secondsEnabled || false;
    var index = websites.findIndex(function(item) {
      return item.url === website;
    });
    if (index !== -1) {
      var timerText = secondsEnabled ? formatTime(timeLeft, true) : formatTime(timeLeft, false);
      websites[index].timerText = timerText;
      chrome.storage.sync.set({ websites: websites }, function() {
        chrome.runtime.sendMessage({ action: 'updateTimerText', website: website, timerText: timerText });
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.get(['websites', 'timerEnabled'], function(data) {
    var websites = data.websites || [];
    var timerEnabled = data.timerEnabled || false;
    websites.forEach(function(website) {
      if (website.enabled && timerEnabled) {
        var interval = parseInt(website.interval, 10);
        startTimer(website.url, interval);
      }
    });
  });
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.timerEnabled) {
    var timerEnabled = changes.timerEnabled.newValue;
    chrome.storage.sync.get('websites', function(data) {
      var websites = data.websites || [];
      websites.forEach(function(website) {
        if (website.enabled && timerEnabled) {
          var interval = parseInt(website.interval, 10);
          startTimer(website.url, interval);
        } else {
          stopTimer(website.url);
        }
      });
    });
  }
});

// ... existing code ...

function logEvent(event, backgroundColor) {
  var timestamp = new Date().toISOString();
  var logEntry = {
    timestamp: timestamp,
    event: event,
    backgroundColor: backgroundColor || 'default'
  };
  chrome.storage.local.get('logs', function(data) {
    var logs = data.logs || [];
    logs.push(logEntry);
    chrome.storage.local.set({ logs: logs }, function() {
      chrome.runtime.sendMessage({ action: 'updateLogs' });
    });
  });
}

// ... existing code ...

// Format time in MM:SS format or MM format
function formatTime(seconds, includeSeconds) {
  var minutes = Math.floor(seconds / 60);
  var remainingSeconds = seconds % 60;
  if (includeSeconds) {
    return pad(minutes) + ':' + pad(remainingSeconds);
  } else {
    return minutes + ' min';
  }
}

// Pad single digit numbers with leading zero
function pad(num) {
  return num < 10 ? '0' + num : num;
}
