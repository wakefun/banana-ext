// 通知ID与窗口ID的映射
const notificationToWindow = new Map();
const NOTIFICATION_WINDOW_KEY = 'notificationToWindow';

// 保存通知与窗口的映射关系
function setNotificationWindowId(notifId, windowId) {
  notificationToWindow.set(notifId, windowId);
  chrome.storage.session.get(NOTIFICATION_WINDOW_KEY, (items) => {
    const mapping = items[NOTIFICATION_WINDOW_KEY] || {};
    mapping[notifId] = windowId;
    chrome.storage.session.set({ [NOTIFICATION_WINDOW_KEY]: mapping });
  });
}

// 获取通知对应的窗口ID
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

// 清除通知与窗口的映射关系
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

// 监听消息
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'OPEN_BANANA_CONSOLE') {
    createBananaWindow();
  }
  if (msg.type === 'IMAGE_GENERATED') {
    // 生成带时间戳的通知
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const notifId = `img-${Date.now()}`;
    chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: 'icons/banana-48.png',
      title: `图片已生成 ${time}`,
      message: 'Vertex AI Studio 图片生成完成',
      priority: 2
    });
    // 保存通知与窗口的映射
    if (sender.tab && typeof sender.tab.windowId === 'number') {
      setNotificationWindowId(notifId, sender.tab.windowId);
    }
  }
});

// 点击通知时聚焦对应窗口
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

// 创建 Banana 窗口
function createBananaWindow() {
  chrome.system.display.getInfo((displays) => {
    const primary = displays.find(d => d.isPrimary) || displays[0];
    const workArea = primary.workArea;
    const width = 500;
    const left = Math.max(workArea.left, workArea.left + workArea.width - width);
    chrome.windows.create({
      url: 'https://console.cloud.google.com/vertex-ai/studio/multimodal;mode=prompt?model=gemini-3-pro-image-preview',
      incognito: true,
      width: width,
      height: workArea.height,
      left: left,
      top: workArea.top
    });
  });
}
