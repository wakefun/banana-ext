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

const listEl = document.getElementById('site-list');
const inputEl = document.getElementById('new-site');
const addBtn = document.getElementById('add-btn');
const saveBtn = document.getElementById('save-btn');

let sites = [];
let savedSites = [];
let newlyAdded = new Set();

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.sync.get('customSites');
  sites = data.customSites || [...DEFAULT_SITES];
  savedSites = [...sites];
  renderList();
  updateSaveBtn();
});

// 检查是否有变化
function hasChanges() {
  if (sites.length !== savedSites.length) return true;
  return sites.some((s, i) => s !== savedSites[i]);
}

// 更新保存按钮状态
function updateSaveBtn() {
  if (hasChanges()) {
    saveBtn.disabled = false;
    saveBtn.classList.remove('disabled');
  } else {
    saveBtn.disabled = true;
    saveBtn.classList.add('disabled');
  }
}

// 发送通知
function sendNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/banana-48.png',
    title,
    message,
    priority: 2
  });
}

// 渲染列表
function renderList() {
  listEl.innerHTML = '';
  sites.forEach((site, i) => {
    const li = document.createElement('li');
    if (newlyAdded.has(site)) {
      li.classList.add('newly-added');
    }
    const span = document.createElement('span');
    span.className = 'site-url';
    span.textContent = site;
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.textContent = '×';
    btn.onclick = () => {
      newlyAdded.delete(site);
      sites.splice(i, 1);
      renderList();
      updateSaveBtn();
    };
    li.appendChild(span);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

// 添加网站
function addSite() {
  let val = inputEl.value.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\/.*$/, '');
  if (val && !sites.includes(val)) {
    sites.unshift(val);
    newlyAdded.add(val);
    inputEl.value = '';
    renderList();
    updateSaveBtn();
  }
}

addBtn.addEventListener('click', addSite);
inputEl.addEventListener('keypress', e => { if (e.key === 'Enter') addSite(); });

// 保存设置
saveBtn.addEventListener('click', async () => {
  if (!hasChanges()) return;

  // 计算被删除的网站（需要移除权限）
  const removedSites = savedSites.filter(s => !sites.includes(s) && !DEFAULT_SITES.includes(s));
  // 计算新增的网站（需要请求权限）
  const addedSites = sites.filter(s => !savedSites.includes(s) && !DEFAULT_SITES.includes(s));
  const permissionErrors = [];

  // 先保存设置（防止popup关闭后丢失状态）
  await chrome.storage.sync.set({ customSites: sites });
  chrome.runtime.sendMessage({ type: 'UPDATE_SITES', sites });

  // 移除被删除网站的权限
  if (removedSites.length > 0) {
    try {
      const ok = await chrome.permissions.remove({ origins: removedSites.map(s => `https://${s}/*`) });
      if (!ok) permissionErrors.push('移除权限被拒绝');
    } catch (e) {
      permissionErrors.push('移除权限失败');
    }
  }

  // 请求新增网站的权限（可能导致popup关闭，但数据已保存）
  if (addedSites.length > 0) {
    try {
      const ok = await chrome.permissions.request({ origins: addedSites.map(s => `https://${s}/*`) });
      if (!ok) permissionErrors.push('新增权限被拒绝');
    } catch (e) {
      permissionErrors.push('新增权限失败');
    }
  }

  // 更新状态
  savedSites = [...sites];
  newlyAdded.clear();
  renderList();
  updateSaveBtn();

  saveBtn.textContent = '已保存!';
  setTimeout(() => { saveBtn.textContent = '保存设置'; }, 500);
  if (permissionErrors.length > 0) {
    sendNotification('权限更新失败', permissionErrors.join('；'));
  } else {
    sendNotification('设置已保存', '请刷新目标网页后生效');
  }
});
