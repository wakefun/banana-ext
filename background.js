const notificationToWindow = new Map();
const NOTIFICATION_WINDOW_KEY = 'notificationToWindow';

function setNotificationWindowId(notifId, windowId) {
  notificationToWindow.set(notifId, windowId);
  chrome.storage.session.get(NOTIFICATION_WINDOW_KEY, (items) => {
    const mapping = items[NOTIFICATION_WINDOW_KEY] || {};
    mapping[notifId] = windowId;
    chrome.storage.session.set({ [NOTIFICATION_WINDOW_KEY]: mapping });
  });
}

function getNotificationWindowId(notifId, cb) {
  if (notificationToWindow.has(notifId)) {
    cb(notificationToWindow.get(notifId));
    return;
  }
  chrome.storage.session.get(NOTIFICATION_WINDOW_KEY, (items) => {
    const mapping = items[NOTIFICATION_WINDOW_KEY] || {};
    const windowId = mapping[notifId];
    if (windowId !== undefined) {
      notificationToWindow.set(notifId, windowId);
    }
    cb(windowId);
  });
}

function clearNotificationWindowId(notifId) {
  notificationToWindow.delete(notifId);
  chrome.storage.session.get(NOTIFICATION_WINDOW_KEY, (items) => {
    const mapping = items[NOTIFICATION_WINDOW_KEY];
    if (!mapping || !Object.prototype.hasOwnProperty.call(mapping, notifId)) return;
    const nextMapping = { ...mapping };
    delete nextMapping[notifId];
    chrome.storage.session.set({ [NOTIFICATION_WINDOW_KEY]: nextMapping });
  });
}

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
    if (sender.tab && typeof sender.tab.windowId === 'number') {
      setNotificationWindowId(notifId, sender.tab.windowId);
    }
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  getNotificationWindowId(notifId, (windowId) => {
    const finalize = () => clearNotificationWindowId(notifId);
    if (typeof windowId !== 'number') {
      createBananaWindow();
      finalize();
      return;
    }
    chrome.windows.update(windowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        createBananaWindow();
      }
      finalize();
    });
  });
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
