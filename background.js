// 默认支持的网站列表
const DEFAULT_SITES = [
  'chatgpt.com',
  'gemini.google.com',
  'grok.x.ai',
  'deepseek.com',
  'www.deepseek.com',
  'chat.deepseek.com',
  'doubao.com',
  'www.doubao.com',
  'linux.do',
  'idcflare.com'
];

// 注册 content scripts
async function registerContentScripts(sites) {
  // 先注销已有的动态脚本
  try {
    await chrome.scripting.unregisterContentScripts({ ids: ['banana-button'] });
  } catch (e) {}

  if (!sites || sites.length === 0) return;

  const matches = sites.map(site => `https://${site}/*`);
  await chrome.scripting.registerContentScripts([{
    id: 'banana-button',
    matches: matches,
    js: ['content_button.js'],
    runAt: 'document_end'
  }]);
}

// 初始化：加载设置并注册脚本
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get('customSites');
  const sites = data.customSites || DEFAULT_SITES;
  await registerContentScripts(sites);
});

// 启动时也注册
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.sync.get('customSites');
  const sites = data.customSites || DEFAULT_SITES;
  await registerContentScripts(sites);
});

// 通知ID与窗口ID的映射
const notificationToWindow = new Map();
const NOTIFICATION_WINDOW_KEY = 'notificationToWindow';

// 保存通知与窗口的映射关系
function setNotificationWindowInfo(notifId, windowId, tabId) {
  const info = { windowId, tabId };
  notificationToWindow.set(notifId, info);
  chrome.storage.session.get(NOTIFICATION_WINDOW_KEY, (items) => {
    const mapping = items[NOTIFICATION_WINDOW_KEY] || {};
    mapping[notifId] = info;
    chrome.storage.session.set({ [NOTIFICATION_WINDOW_KEY]: mapping });
  });
}

// 获取通知对应的窗口信息
function getNotificationWindowInfo(notifId, cb) {
  if (notificationToWindow.has(notifId)) {
    cb(notificationToWindow.get(notifId));
    return;
  }
  chrome.storage.session.get(NOTIFICATION_WINDOW_KEY, (items) => {
    const mapping = items[NOTIFICATION_WINDOW_KEY] || {};
    const info = mapping[notifId];
    if (info !== undefined) {
      notificationToWindow.set(notifId, info);
    }
    cb(info);
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
  if (msg.type === 'UPDATE_SITES') {
    // 更新网站列表后重新注册脚本
    registerContentScripts(msg.sites);
  }
  if (msg.type === 'OPEN_BANANA_CONSOLE') {
    createBananaWindow();
  }
  if (msg.type === 'HIDE_WINDOW') {
    // 最小化当前窗口
    if (sender.tab && typeof sender.tab.windowId === 'number') {
      chrome.windows.update(sender.tab.windowId, { state: 'minimized' });
    }
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
      setNotificationWindowInfo(notifId, sender.tab.windowId, sender.tab.id);
    }
  }
  if (msg.type === 'IMAGE_ERROR') {
    // 生成失败通知
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const notifId = `err-${Date.now()}`;
    chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: 'icons/banana-48.png',
      title: `生成失败 ${time}`,
      message: msg.message || '图片生成失败',
      priority: 2
    });
    if (sender.tab && typeof sender.tab.windowId === 'number') {
      setNotificationWindowInfo(notifId, sender.tab.windowId, sender.tab.id);
    }
  }
});

// 点击通知时聚焦对应窗口
chrome.notifications.onClicked.addListener((notifId) => {
  getNotificationWindowInfo(notifId, (info) => {
    let done = false;
    const finalize = () => {
      if (done) return;
      done = true;
      clearNotificationWindowId(notifId);
    };
    if (!info || typeof info.windowId !== 'number') {
      createBananaWindow();
      finalize();
      return;
    }
    chrome.windows.update(info.windowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        if (typeof info.tabId === 'number') {
          chrome.tabs.get(info.tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
              createBananaWindow();
              finalize();
              return;
            }
            chrome.windows.update(tab.windowId, { focused: true }, () => {
              chrome.tabs.update(info.tabId, { active: true });
              finalize();
            });
          });
          return;
        }
        createBananaWindow();
        finalize();
        return;
      }
      if (typeof info.tabId === 'number') {
        chrome.tabs.update(info.tabId, { active: true });
      }
      finalize();
    });
  });
});

// 创建 Banana 窗口
function createBananaWindow() {
  // 检查无痕窗口权限
  chrome.extension.isAllowedIncognitoAccess((allowed) => {
    if (!allowed) {
      // 没有无痕权限，提示用户
      chrome.notifications.create('incognito-permission', {
        type: 'basic',
        iconUrl: 'icons/banana-48.png',
        title: '需要无痕窗口权限',
        message: '请在扩展设置中启用"在无痕模式下允许"',
        priority: 2
      });
      return;
    }
    // 有权限，创建无痕窗口
    chrome.system.display.getInfo((displays) => {
      const primary = displays.find(d => d.isPrimary) || displays[0];
      const workArea = primary.workArea;
      const width = 500;
      const left = Math.max(workArea.left, workArea.left + workArea.width - width);
      chrome.windows.create({
        url: 'https://console.cloud.google.com/vertex-ai/studio/multimodal;mode=prompt?model=gemini-3-pro-image-preview',
        incognito: true,
        width,
        height: workArea.height,
        left,
        top: workArea.top
      });
    });
  });
}
