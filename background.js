// 加载共享配置
importScripts('shared_config.js');

// 注册 content scripts
async function registerContentScripts(sites) {
  // 先注销已有的动态脚本
  try {
    await chrome.scripting.unregisterContentScripts({ ids: ['banana-button'] });
  } catch (e) {}

  if (!sites || sites.length === 0) return;

  const matches = sites.map(site => `https://${site}/*`);
  try {
    await chrome.scripting.registerContentScripts([{
      id: 'banana-button',
      matches: matches,
      js: ['shared_config.js', 'content_button.js'],
      runAt: 'document_end'
    }]);
  } catch (e) {
    console.warn('registerContentScripts failed', e);
    chrome.notifications.create('script-registration-failed', {
      type: 'basic',
      iconUrl: 'icons/banana-48.png',
      title: '脚本注册失败',
      message: '权限不足，部分站点无法注入按钮',
      priority: 2
    });
  }
}

// 从 storage 加载站点并注册脚本
async function loadAndRegisterScripts() {
  const data = await chrome.storage.sync.get('customSites');
  const sites = data.customSites || DEFAULT_SITES;
  await registerContentScripts(sites);
}

// 初始化：加载设置并注册脚本
chrome.runtime.onInstalled.addListener(loadAndRegisterScripts);

// 启动时也注册
chrome.runtime.onStartup.addListener(loadAndRegisterScripts);

// 监听权限变化，权限授予后重新注册脚本
chrome.permissions.onAdded.addListener(async (addedPermissions) => {
  // 检查是否有待保存的站点（popup 关闭时未能保存）
  const data = await chrome.storage.session.get(['pendingSites', 'pendingOrigins']);
  if (data.pendingSites && data.pendingOrigins) {
    // 验证添加的权限是否包含请求的 origins
    const addedOrigins = addedPermissions.origins || [];
    const requestedOrigins = data.pendingOrigins;
    const allGranted = requestedOrigins.every(o => addedOrigins.includes(o));
    if (allGranted) {
      await chrome.storage.sync.set({ customSites: data.pendingSites });
      await chrome.storage.session.remove(['pendingSites', 'pendingOrigins']);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/banana-48.png',
        title: '设置已保存',
        message: '请刷新目标网页后生效',
        priority: 2
      });
    }
  }
  loadAndRegisterScripts();
});

// 监听 storage 变化，站点列表更新后重新注册脚本
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.customSites) {
    loadAndRegisterScripts();
  }
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

// 根据窗口ID清除所有相关通知映射
function clearNotificationsByWindowId(windowId) {
  const removedIds = [];
  for (const [notifId, info] of notificationToWindow.entries()) {
    if (info && info.windowId === windowId) {
      notificationToWindow.delete(notifId);
      removedIds.push(notifId);
    }
  }
  // 同时清理 session storage（处理 service worker 重启的情况）
  chrome.storage.session.get(NOTIFICATION_WINDOW_KEY, (items) => {
    const mapping = items[NOTIFICATION_WINDOW_KEY];
    if (!mapping) return;
    const nextMapping = { ...mapping };
    let changed = false;
    for (const [notifId, info] of Object.entries(nextMapping)) {
      if (info && info.windowId === windowId) {
        delete nextMapping[notifId];
        changed = true;
      }
    }
    if (changed) chrome.storage.session.set({ [NOTIFICATION_WINDOW_KEY]: nextMapping });
  });
}

// 监听窗口关闭事件，清理通知映射
chrome.windows.onRemoved.addListener((windowId) => {
  clearNotificationsByWindowId(windowId);
});

// 监听消息
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'OPEN_BANANA_CONSOLE') {
    createBananaWindow();
  }
  if (msg.type === 'POPUP_OPENED') {
    // 广播消息到所有标签页，恢复隐藏的香蕉按钮
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BUTTON' }).catch(() => {});
        }
      }
    });
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
  // 只处理图片生成相关的通知（img- 或 err- 前缀）
  if (!notifId.startsWith('img-') && !notifId.startsWith('err-')) {
    return;
  }
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
    const incognito = Boolean(allowed);
    if (!incognito) {
      // 没有无痕权限，提示用户并改用普通窗口
      chrome.notifications.create('incognito-permission', {
        type: 'basic',
        iconUrl: 'icons/banana-48.png',
        title: '无痕权限未启用',
        message: '已改为在普通窗口打开',
        priority: 2
      });
    }
    // 创建窗口（根据权限决定是否无痕）
    chrome.system.display.getInfo((displays) => {
      const primary = displays.find(d => d.isPrimary) || displays[0];
      const workArea = primary.workArea;
      const width = 500;
      const left = Math.max(workArea.left, workArea.left + workArea.width - width);
      chrome.windows.create({
        url: 'https://console.cloud.google.com/vertex-ai/studio/multimodal;mode=prompt?model=gemini-3-pro-image-preview',
        incognito,
        width,
        height: workArea.height,
        left,
        top: workArea.top
      });
    });
  });
}
