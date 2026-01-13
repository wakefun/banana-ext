const listEl = document.getElementById('site-list');
const inputEl = document.getElementById('new-site');
const addBtn = document.getElementById('add-btn');
const saveBtn = document.getElementById('save-btn');

let sites = [];
let savedSites = [];
let newlyAdded = new Set();

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 通知 background 恢复隐藏的香蕉按钮
  chrome.runtime.sendMessage({ type: 'POPUP_OPENED' });

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

// 标准化站点输入
function normalizeSiteInput(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/\/.*$/, '');
}

// 验证域名格式
function isValidDomain(value) {
  if (!value || value.length > 253) return false;
  if (value.includes('..')) return false;
  const host = value.endsWith('.') ? value.slice(0, -1) : value;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  return labels.every(label => (
    label.length > 0 &&
    label.length <= 63 &&
    /^[a-z0-9-]+$/i.test(label) &&
    !label.startsWith('-') &&
    !label.endsWith('-')
  ));
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
  const val = normalizeSiteInput(inputEl.value);
  if (!val) return;
  if (!isValidDomain(val)) {
    sendNotification('无效域名', '请输入有效域名，例如 example.com');
    return;
  }
  if (!sites.includes(val)) {
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

  // 先请求新增网站的权限（用户可能拒绝）
  if (addedSites.length > 0) {
    // 权限请求前存储待保存的站点和请求的 origins（防止 popup 关闭后丢失）
    const pendingOrigins = addedSites.map(s => `https://${s}/*`);
    await chrome.storage.session.set({ pendingSites: sites, pendingOrigins });
    try {
      const ok = await chrome.permissions.request({ origins: pendingOrigins });
      // 清除待保存状态（popup 未关闭时由 popup 处理保存）
      await chrome.storage.session.remove(['pendingSites', 'pendingOrigins']);
      if (!ok) {
        // 用户拒绝权限，从列表中移除这些站点
        addedSites.forEach(site => {
          newlyAdded.delete(site);
          const idx = sites.indexOf(site);
          if (idx !== -1) sites.splice(idx, 1);
        });
        permissionErrors.push('新增权限被拒绝');
        renderList();
        updateSaveBtn();
      }
    } catch (e) {
      await chrome.storage.session.remove(['pendingSites', 'pendingOrigins']);
      // 权限请求失败，从列表中移除这些站点
      addedSites.forEach(site => {
        newlyAdded.delete(site);
        const idx = sites.indexOf(site);
        if (idx !== -1) sites.splice(idx, 1);
      });
      permissionErrors.push('新增权限失败');
      renderList();
      updateSaveBtn();
    }
  }

  // 移除被删除网站的权限（先移除权限，成功后再保存）
  if (removedSites.length > 0) {
    try {
      const ok = await chrome.permissions.remove({ origins: removedSites.map(s => `https://${s}/*`) });
      if (!ok) {
        permissionErrors.push('移除权限被拒绝');
        renderList();
        updateSaveBtn();
        return;
      }
    } catch (e) {
      permissionErrors.push('移除权限失败');
      renderList();
      updateSaveBtn();
      return;
    }
  }

  // 权限处理完成后保存设置（后台通过 storage.onChanged 监听变化，自动重新注册脚本）
  await chrome.storage.sync.set({ customSites: sites });

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
