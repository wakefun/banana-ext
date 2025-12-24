(function() {
  // 仅在 Vertex AI Studio 页面执行
  if (!location.href.includes('vertex-ai/studio')) return;

  // 已通知的图片集合，防止重复通知
  const notified = new Set();
  // 设置自动化是否已完成
  let settingsAutomationDone = false;

  // 默认设置
  const DEFAULT_SETTINGS = {
    output: '图片和文字',
    aspectRatio: '1:1',
    resolution: '1k',
    format: 'png',
    portrait: '允许（所有年龄段）',
    allowSearch: false
  };

  // 设置选项配置
  const SETTING_OPTIONS = [
    { key: 'output', options: ['图片和文字', '图片'] },
    { key: 'aspectRatio', options: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] },
    { key: 'resolution', options: ['1k', '2k', '4k'] },
    { key: 'format', options: ['png', 'jpeg'] },
    { key: 'portrait', options: ['允许（所有年龄段）', '允许（仅限成人）', '不允许'] }
  ];

  // 页面元素选择器
  const PANEL_OPEN_BTN = 'button[aria-label="收起面板"]';
  const PANEL_CLOSE_BTN = 'button[aria-label="展开面板"]';
  const SELECT_TRIGGER = 'div.cfc-select-value';
  const SELECT_OPTIONS = '.mdc-list-item__primary-text';
  const GROUNDING_TOGGLE = 'button[role="switch"][name="groundingGoogleSearch"]';

  // 获取设置
  function getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, items => {
        resolve(chrome.runtime.lastError ? { ...DEFAULT_SETTINGS } : { ...DEFAULT_SETTINGS, ...items });
      });
    });
  }

  // 等待元素出现
  function waitFor(predicate, timeoutMs = 2000) {
    const result = predicate();
    if (result) return Promise.resolve(result);
    return new Promise(resolve => {
      let done = false;
      const finish = v => { if (!done) { done = true; ob?.disconnect(); clearTimeout(t); resolve(v); } };
      const t = setTimeout(() => finish(null), timeoutMs);
      const ob = new MutationObserver(() => { const r = predicate(); if (r) finish(r); });
      ob.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  }

  // 获取选项索引
  function getSelectionIndex(options, value) {
    const index = options.indexOf(value);
    return index === -1 ? 0 : index;
  }

  // 执行设置自动化
  async function runSettingsAutomation() {
    if (settingsAutomationDone || !document.body) return;

    // 等待面板按钮出现
    const panelToggle = await waitFor(() => document.querySelector(PANEL_CLOSE_BTN) || document.querySelector(PANEL_OPEN_BTN), 10000);
    if (!panelToggle) return;

    // 如果面板关闭，先打开
    if (panelToggle.matches(PANEL_CLOSE_BTN)) {
      panelToggle.click();
      if (!await waitFor(() => document.querySelector(PANEL_OPEN_BTN), 3000)) return;
    }

    // 等待下拉框出现
    const triggers = await waitFor(() => {
      const els = document.querySelectorAll(SELECT_TRIGGER);
      return els.length >= SETTING_OPTIONS.length ? els : null;
    }, 5000);
    if (!triggers) return;

    settingsAutomationDone = true;

    // 获取用户设置并计算选项索引
    const settings = await getSettings();
    const selections = SETTING_OPTIONS.map(setting => getSelectionIndex(setting.options, settings[setting.key]));

    // 依次设置每个下拉框
    for (let i = 0; i < selections.length && i < triggers.length; i++) {
      triggers[i].click();
      await waitFor(() => document.querySelector(SELECT_OPTIONS), 2000);

      const options = document.querySelectorAll(SELECT_OPTIONS);
      if (options[selections[i]]) options[selections[i]].click();
      else document.body.click();

      await waitFor(() => !document.querySelector(SELECT_OPTIONS), 2000);
    }

    // 设置搜索开关
    const toggle = await waitFor(() => document.querySelector(GROUNDING_TOGGLE), 2000);
    if (toggle) {
      const isOn = toggle.getAttribute('aria-checked') === 'true';
      if (settings.allowSearch !== isOn) toggle.click();
    }

    // 关闭面板
    const closeBtn = document.querySelector(PANEL_OPEN_BTN);
    if (closeBtn) closeBtn.click();
  }

  // 页面自动化：勾选复选框、点击同意按钮、移除干扰元素
  function automate() {
    // 自动勾选复选框
    document.querySelectorAll('input.mdc-checkbox__native-control').forEach(cb => {
      if (!cb.checked) cb.click();
    });
    // 自动点击同意按钮
    document.querySelectorAll('span.mdc-button__label').forEach(label => {
      if (label.textContent.includes('同意')) {
        const btn = label.closest('button');
        if (btn && !btn.disabled) btn.click();
      }
    });
    // 移除干扰元素
    document.querySelectorAll('div.ft-message-bar, ai-llm-user-onboarding-banner').forEach(el => el.remove());
    // 调整输入框容器样式
    document.querySelectorAll('.prompt-input-container').forEach(el => el.style.padding = '10px 0 80px 0');
  }

  // 检查图片生成并发送通知
  function checkImages() {
    document.querySelectorAll('.generated-image__img').forEach(img => {
      const src = img.src || img.dataset.src || img.getAttribute('src');
      if (src && !notified.has(src)) {
        notified.add(src);
        chrome.runtime.sendMessage({ type: 'IMAGE_GENERATED' });
      }
    });
  }

  // 启动观察器
  function startObservers() {
    if (!document.body) return;
    new MutationObserver(() => { automate(); checkImages(); runSettingsAutomation(); })
      .observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { automate(); checkImages(); runSettingsAutomation(); }, 1000);
  }

  // 确保 DOM 就绪后启动
  if (document.body) {
    startObservers();
  } else {
    document.addEventListener('DOMContentLoaded', startObservers, { once: true });
  }
})();
