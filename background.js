const notificationToWindow = new Map();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'OPEN_BANANA_CONSOLE') {
    createBananaWindow();
  }
  if (msg.type === 'IMAGE_GENERATED') {
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const notifId = `img-${Date.now()}`;
    chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: 'icons/banana-48.png',
      title: `图片已生成 ${time}`,
      message: 'Vertex AI Studio 图片生成完成',
      priority: 2
    });
    if (sender.tab && sender.tab.windowId) {
      notificationToWindow.set(notifId, sender.tab.windowId);
    }
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  const windowId = notificationToWindow.get(notifId);
  if (windowId) {
    chrome.windows.update(windowId, { focused: true });
    notificationToWindow.delete(notifId);
  }
});

function createBananaWindow() {
  chrome.system.display.getInfo((displays) => {
    const primary = displays.find(d => d.isPrimary) || displays[0];
    const width = 500;
    const left = primary.workArea.width - width;
    chrome.windows.create({
      url: 'https://console.cloud.google.com/vertex-ai/studio/multimodal;mode=prompt?model=gemini-3-pro-image-preview',
      incognito: true,
      width: width,
      height: primary.workArea.height,
      left: left,
      top: 0
    });
  });
}
