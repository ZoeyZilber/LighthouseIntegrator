chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getToken") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError });
      } else {
        sendResponse({ token });
      }
    });
    return true;
  }
});
