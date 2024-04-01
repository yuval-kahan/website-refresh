document.addEventListener('DOMContentLoaded', function() {
  var intervalSelect = document.getElementById('interval');
  var websiteInput = document.getElementById('website');
  var addButton = document.getElementById('addWebsite');
  var websiteList = document.getElementById('websiteList');
  var exportButton = document.getElementById('exportConfig');
  var importButton = document.getElementById('importConfig');
  var importInput = document.getElementById('importInput');
  var logsButton = document.getElementById('logsButton');
  var timerToggle = document.getElementById('timerToggle');
  var secondsToggle = document.getElementById('secondsToggle');

  // Get the current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var currentUrl = tabs[0].url;
    websiteInput.value = currentUrl;
  });

  // Load the last selected interval from storage
  chrome.storage.sync.get('selectedInterval', function(data) {
    if (data.selectedInterval) {
      intervalSelect.value = data.selectedInterval;
    }
  });

  // Save the selected interval to storage when it changes
  intervalSelect.addEventListener('change', function() {
    var selectedInterval = intervalSelect.value;
    chrome.storage.sync.set({ selectedInterval: selectedInterval });
    logEvent('Interval changed to ' + selectedInterval + ' minutes');
  });

  // Load websites from storage
  chrome.storage.sync.get('websites', function(data) {
    if (data.websites) {
      data.websites.forEach(function(website) {
        addWebsiteToList(website.url, website.interval, website.enabled);
      });
    }
  });

  // Add website to list
  addButton.addEventListener('click', function() {
    var website = websiteInput.value.trim();
    if (website !== '') {
      var interval = intervalSelect.value;
      addWebsiteToList(website, interval, true);
      saveWebsitesToStorage();
      logEvent('Website added: ' + website);
    }
  });

  // Export configuration
  exportButton.addEventListener('click', function() {
    chrome.storage.sync.get(['selectedInterval', 'websites'], function(data) {
      var configData = JSON.stringify(data, null, 2);
      var blob = new Blob([configData], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'website-refresher-config.json';
      a.click();
      logEvent('Configuration exported');
    });
  });

  // Import configuration
  importButton.addEventListener('click', function() {
    importInput.click();
  });

  importInput.addEventListener('change', function(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var configData = JSON.parse(e.target.result);
      chrome.storage.sync.set(configData, function() {
        location.reload();
        logEvent('Configuration imported');
      });
    };
    reader.readAsText(file);
  });

  // Toggle website refresh
  websiteList.addEventListener('click', function(event) {
    if (event.target.classList.contains('toggle')) {
      var listItem = event.target.closest('.website-item');
      var website = listItem.querySelector('.website-name').dataset.fullUrl;
      var enabled = event.target.classList.contains('disabled');
      event.target.classList.toggle('enabled', enabled);
      event.target.classList.toggle('disabled', !enabled);
      event.target.textContent = enabled ? 'Enable' : 'Disable';
      updateWebsiteInStorage(website, enabled);
      logEvent('Website toggled: ' + website + ' (' + (enabled ? 'Enabled' : 'Disabled') + ')');
      if (enabled) {
        var interval = parseInt(listItem.querySelector('.interval').textContent.trim(), 10);
        startTimer(website, interval);
      } else {
        stopTimer(website);
      }
    }
  });

  // Delete website from list
  websiteList.addEventListener('click', function(event) {
    if (event.target.classList.contains('delete-icon')) {
      var listItem = event.target.closest('.website-item');
      var website = listItem.querySelector('.website-name').dataset.fullUrl;
      listItem.remove();
      removeWebsiteFromStorage(website);
      logEvent('Website deleted: ' + website);
      stopTimer(website);
    }
  });

  // Show full URL on website name click
  websiteList.addEventListener('click', function(event) {
    if (event.target.classList.contains('website-name')) {
      var fullUrl = event.target.dataset.fullUrl;
      event.target.textContent = fullUrl;
    }
  });

  // Hide full URL when clicking anywhere else in the extension
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.website-item')) {
      var websiteNames = websiteList.querySelectorAll('.website-name');
      websiteNames.forEach(function(websiteName) {
        websiteName.textContent = extractDomainName(websiteName.dataset.fullUrl);
      });
    }
  });

  // Toggle timer
  timerToggle.addEventListener('click', function() {
    var isEnabled = timerToggle.classList.contains('disabled');
    timerToggle.classList.toggle('enabled', isEnabled);
    timerToggle.classList.toggle('disabled', !isEnabled);
    timerToggle.textContent = isEnabled ? 'Enabled' : 'Disabled';
    chrome.storage.sync.set({ timerEnabled: isEnabled }, function() {
      if (isEnabled) {
        startAllTimers();
      } else {
        stopAllTimers();
      }
    });
  });

  // Load timer state from storage
  chrome.storage.sync.get('timerEnabled', function(data) {
    var isEnabled = data.timerEnabled || false;
    timerToggle.classList.toggle('enabled', isEnabled);
    timerToggle.classList.toggle('disabled', !isEnabled);
    timerToggle.textContent = isEnabled ? 'Enabled' : 'Disabled';
    if (isEnabled) {
      startAllTimers();
    }
  });

  // Toggle seconds display
  secondsToggle.addEventListener('click', function() {
    var isEnabled = secondsToggle.classList.contains('disabled');
    secondsToggle.classList.toggle('enabled', isEnabled);
    secondsToggle.classList.toggle('disabled', !isEnabled);
    secondsToggle.textContent = isEnabled ? 'Enabled' : 'Disabled';
    chrome.storage.sync.set({ secondsEnabled: isEnabled });
  });

  // Load seconds display state from storage
  chrome.storage.sync.get('secondsEnabled', function(data) {
    var isEnabled = data.secondsEnabled || false;
    secondsToggle.classList.toggle('enabled', isEnabled);
    secondsToggle.classList.toggle('disabled', !isEnabled);
    secondsToggle.textContent = isEnabled ? 'Enabled' : 'Disabled';
  });

  // Function to check if logs exist and show/hide the "Logs" button
  function checkLogsExist() {
    chrome.storage.local.get('logs', function(data) {
      if (data.logs && data.logs.length > 0) {
        logsButton.style.display = 'inline-block';
      } else {
        logsButton.style.display = 'none';
      }
    });
  }

  // Open logs in a new tab when the "Logs" button is clicked
  logsButton.addEventListener('click', function() {
    chrome.storage.local.get('logs', function(data) {
      if (data.logs && data.logs.length > 0) {
        var logsHtml = data.logs.map(function(logEntry) {
          var backgroundColor = logEntry.backgroundColor === 'lightgreen' ? 'lightgreen' : 'transparent';
          return '<div style="background-color: ' + backgroundColor + ';">' + logEntry.timestamp + ' - ' + logEntry.event + '</div>';
        }).join('');
        var logsPage = '<!DOCTYPE html><html><head><title>Logs</title></head><body>' + logsHtml + '</body></html>';
        var logsBlob = new Blob([logsPage], { type: 'text/html' });
        var logsUrl = URL.createObjectURL(logsBlob);
        chrome.tabs.create({ url: logsUrl });
      }
    });
  });

  // Log events and save logs to Chrome storage
  function logEvent(event) {
    var timestamp = new Date().toISOString();
    var logEntry = timestamp + ' - ' + event;
    chrome.storage.local.get('logs', function(data) {
      var logs = data.logs || [];
      logs.push(logEntry);
      chrome.storage.local.set({ logs: logs }, function() {
        checkLogsExist();
      });
    });
  }

  // Save websites to storage
  function saveWebsitesToStorage() {
    var websites = Array.from(websiteList.querySelectorAll('.website-item')).map(function(item) {
      return {
        url: item.querySelector('.website-name').dataset.fullUrl,
        interval: item.querySelector('.interval').textContent.trim(),
        enabled: item.querySelector('.toggle').classList.contains('enabled')
      };
    });
    chrome.storage.sync.set({ websites: websites });
  }

  // Update website in storage
  function updateWebsiteInStorage(website, enabled) {
    chrome.storage.sync.get('websites', function(data) {
      var websites = data.websites || [];
      var index = websites.findIndex(function(item) {
        return item.url === website;
      });
      if (index !== -1) {
        websites[index].enabled = enabled;
        chrome.storage.sync.set({ websites: websites });
      }
    });
  }

  // Remove website from storage
  function removeWebsiteFromStorage(website) {
    chrome.storage.sync.get('websites', function(data) {
      var websites = data.websites || [];
      var index = websites.findIndex(function(item) {
        return item.url === website;
      });
      if (index !== -1) {
        websites.splice(index, 1);
        chrome.storage.sync.set({ websites: websites });
      }
    });
  }

  // Add website to list
  function addWebsiteToList(website, interval, enabled) {
    var li = document.createElement('li');
    li.classList.add('website-item');

    var deleteIcon = document.createElement('img');
    deleteIcon.classList.add('delete-icon');
    deleteIcon.src = 'images/trash-icon.svg';
    deleteIcon.alt = 'Delete';
    li.appendChild(deleteIcon);

    var websiteName = document.createElement('span');
    websiteName.classList.add('website-name');
    websiteName.textContent = extractDomainName(website);
    websiteName.dataset.fullUrl = website;
    li.appendChild(websiteName);

    var intervalSpan = document.createElement('span');
    intervalSpan.classList.add('interval');
    intervalSpan.textContent = ' (' + interval + ' min)';
    li.appendChild(intervalSpan);

    var timerSpan = document.createElement('span');
    timerSpan.classList.add('timer');
    chrome.storage.sync.get(['secondsEnabled', 'websites'], function(data) {
      var secondsEnabled = data.secondsEnabled || false;
      var websites = data.websites || [];
      var websiteData = websites.find(function(item) {
        return item.url === website;
      });
      var timeLeft = websiteData ? websiteData.timeLeft : interval * 60;
      var timerText = secondsEnabled ? formatTime(timeLeft, true) : formatTime(timeLeft, false);
      timerSpan.textContent = 'Next refresh: ' + timerText;
    });
    li.appendChild(timerSpan);

    var toggle = document.createElement('span');
    toggle.classList.add('toggle');
    toggle.classList.add(enabled ? 'enabled' : 'disabled');
    toggle.textContent = enabled ? 'Enable' : 'Disable';
    li.appendChild(toggle);

    websiteList.appendChild(li);

    if (enabled) {
      startTimer(website, interval);
    }
  }

  // Extract domain name from URL
  function extractDomainName(url) {
    var domain = url.replace(/^https?:\/\//, '');
    domain = domain.split('/')[0];
    return domain;
  }

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

  // Start all timers
  function startAllTimers() {
    chrome.storage.sync.get('websites', function(data) {
      var websites = data.websites || [];
      websites.forEach(function(website) {
        if (website.enabled) {
          var interval = parseInt(website.interval, 10);
          startTimer(website.url, interval);
        }
      });
    });
  }

  // Stop all timers
  function stopAllTimers() {
    chrome.storage.sync.get('websites', function(data) {
      var websites = data.websites || [];
      websites.forEach(function(website) {
        stopTimer(website.url);
      });
    });
  }

  // Start timer for a website
  function startTimer(website, interval) {
    chrome.runtime.sendMessage({ action: 'startTimer', website: website, interval: interval });
  }

  // Stop timer for a website
  function stopTimer(website) {
    chrome.runtime.sendMessage({ action: 'stopTimer', website: website });
  }

  // Check if logs exist on page load
  checkLogsExist();

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'updateTimerText') {
      var website = message.website;
      var timerText = message.timerText;
      var websiteItem = websiteList.querySelector('.website-item .website-name[data-full-url="' + website + '"]');
      if (websiteItem) {
        var timerSpan = websiteItem.closest('.website-item').querySelector('.timer');
        timerSpan.textContent = 'Next refresh: ' + timerText;
      }
    }
  });
});
