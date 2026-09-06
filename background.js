// Minimal service worker. All the real-time sync logic lives in the content
// scripts (see content_scripts/sync-core.js for why). This just handles
// first-install setup.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});
