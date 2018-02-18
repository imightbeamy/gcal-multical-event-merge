const getSetting = () => new Promise(res => chrome.storage.local.get('disabled', (s) => res(s.disabled)));
const setIcon = (disabled) => chrome.browserAction.setIcon({
  path: disabled ? "icon-disabled.png" : "icon.png"
});

getSetting().then(setIcon);

chrome.browserAction.onClicked.addListener(function(tab) {
  getSetting().then(disabled => {
    const toggled = !disabled;
    chrome.storage.local.set({ 'disabled': toggled });
    setIcon(toggled);
  })
});
