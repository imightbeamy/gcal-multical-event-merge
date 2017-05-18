var enabled = true;

chrome.browserAction.onClicked.addListener(function(tab) {
  enabled = !enabled;
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.update(tabs[0].id, {url: tabs[0].url});
  });
  chrome.browserAction.setIcon({path: enabled ? "icon.png" : "icon-disabled.png"});
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      sendResponse({enabled: enabled});
});