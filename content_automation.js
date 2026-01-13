(function() {
  // 仅在 Vertex AI Studio 页面执行
  if (!location.href.includes('vertex-ai/studio')) return;

  // 已通知的图片集合，防止重复通知
  const notified = new Set();
  // 设置自动化是否已完成
  let settingsAutomationDone = false;
  // 是否正在生成图片
  let isGenerating = false;
  // 已通知的错误集合
  const notifiedErrors = new Set();

  // 默认设置
  const DEFAULT_SETTINGS = self.DEFAULT_SETTINGS || {
    output: '图片和文字',
    aspectRatio: '1:1',
    resolution: '1k',
    format: 'png',
    portrait: '允许（所有年龄段）',
    allowSearch: false
  };

  // 设置选项配置
  const SETTING_OPTIONS = self.SETTING_OPTIONS || [
    { key: 'output', label: '输出', options: ['图片和文字', '图片'] },
    { key: 'aspectRatio', label: '宽高比', options: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] },
    { key: 'resolution', label: '输出分辨率', options: ['1k', '2k', '4k'] },
    { key: 'format', label: '输出格式', options: ['png', 'jpeg'] },
    { key: 'portrait', label: '人像生成', options: ['允许（所有年龄段）', '允许（仅限成人）', '不允许'] }
  ];

  // 页面元素选择器（使用图标选择器，避免依赖中文）
  const PANEL_OPEN_ICON = 'svg[data-icon-name="expandAllIcon"]';
  const PANEL_CLOSE_ICON = 'ai-llm-side-panel svg[data-icon-name="closeIcon"]';
  const SELECT_TRIGGER = 'div.cfc-select-value';
  const SELECT_OPTIONS = '.mdc-list-item__primary-text';
  const GROUNDING_TOGGLE = 'button[role="switch"][name="groundingGoogleSearch"]';
  const CONSENT_BUTTON = 'button.mdc-button.mat-mdc-button-base.gmat-mdc-button.mat-primary.mat-mdc-button-disabled-interactive.cm-button.mdc-button--unelevated.mat-mdc-unelevated-button';

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

  // 根据图标选择器获取按钮
  function getPanelButton(iconSelector) {
    const icon = document.querySelector(iconSelector);
    return icon ? icon.closest('button') : null;
  }

  // 执行设置自动化
  async function runSettingsAutomation() {
    if (settingsAutomationDone || !document.body) return;

    // 等待面板按钮出现（使用图标选择器）
    const panelToggle = await waitFor(() => getPanelButton(PANEL_OPEN_ICON) || getPanelButton(PANEL_CLOSE_ICON), 10000);
    if (!panelToggle) return;

    // 如果面板关闭，先打开
    const openBtn = getPanelButton(PANEL_OPEN_ICON);
    if (openBtn) {
      openBtn.click();
      if (!await waitFor(() => getPanelButton(PANEL_CLOSE_ICON), 3000)) return;
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
    const closeBtn = getPanelButton(PANEL_CLOSE_ICON);
    if (closeBtn) closeBtn.click();
  }

  // 页面自动化：勾选复选框、点击同意按钮、移除干扰元素
  function automate() {
    // 自动勾选复选框
    document.querySelectorAll('input.mdc-checkbox__native-control').forEach(cb => {
      if (!cb.checked) cb.click();
    });
    // 自动点击同意按钮（使用类选择器，避免依赖中文）
    const consentBtn = document.querySelector(CONSENT_BUTTON);
    if (consentBtn && !consentBtn.disabled) consentBtn.click();
    // 移除干扰元素
    document.querySelectorAll('div.ft-message-bar, ai-llm-user-onboarding-banner').forEach(el => el.remove());
    // 调整输入框容器样式
    document.querySelectorAll('.prompt-input-container').forEach(el => el.style.padding = '10px 0 80px 0');
  }

  // 倒计时提示相关状态
  let countdownInterval = null;

  // 显示自动隐藏倒计时提示
  function showAutoHideNotification() {
    // 避免重复显示
    if (document.getElementById('banana-autohide-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'banana-autohide-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(145deg, #3a3a3a, #2a2a2a);
      color: #fff;
      padding: 14px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: opacity 0.3s, transform 0.3s;
      border: 1px solid rgba(255, 225, 80, 0.2);
    `;

    let seconds = 3;
    toast.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">🍌</span>
        <span>窗口将在 <strong id="banana-timer-count" style="color:#FFE150;font-size:16px;">${seconds}</strong> 秒后最小化</span>
      </span>
      <button id="banana-cancel-hide" style="
        background: transparent;
        border: 1px solid rgba(255, 225, 80, 0.5);
        color: #FFE150;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
      ">取消</button>
    `;

    document.body.appendChild(toast);

    // 悬停效果
    const cancelBtn = document.getElementById('banana-cancel-hide');
    cancelBtn.onmouseenter = () => {
      cancelBtn.style.background = 'rgba(255, 225, 80, 0.15)';
      cancelBtn.style.borderColor = '#FFE150';
    };
    cancelBtn.onmouseleave = () => {
      cancelBtn.style.background = 'transparent';
      cancelBtn.style.borderColor = 'rgba(255, 225, 80, 0.5)';
    };

    // 倒计时
    countdownInterval = setInterval(() => {
      seconds--;
      const countSpan = document.getElementById('banana-timer-count');
      if (countSpan) countSpan.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => toast.remove(), 300);
        chrome.runtime.sendMessage({ type: 'HIDE_WINDOW' });
      }
    }, 1000);

    // 取消按钮
    cancelBtn.onclick = () => {
      clearInterval(countdownInterval);
      countdownInterval = null;
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    };
  }

  // 检查图片生成状态
  function checkGenerationStatus() {
    // 检测是否正在生成（timer出现）
    const timer = document.querySelector('span.cancel-button__timer');
    if (timer && !isGenerating) {
      isGenerating = true;
      // 显示倒计时提示
      showAutoHideNotification();
    }

    // 检测429限速错误
    const errorEl = document.querySelector('span.prompt-response-text-area--error-color');
    if (errorEl) {
      const pText = errorEl.querySelector('p')?.textContent || '';
      const has429 = pText.includes('error-code-429');
      if (has429 && !notifiedErrors.has('429')) {
        notifiedErrors.add('429');
        chrome.runtime.sendMessage({ type: 'IMAGE_ERROR', message: '请求被限速，请重试' });
      }
      if (!has429) notifiedErrors.delete('429');
    } else {
      // 错误元素消失时也清除标记
      notifiedErrors.delete('429');
    }

    // 仅在生成中状态下检测新图片
    if (isGenerating) {
      document.querySelectorAll('.generated-image__img').forEach(img => {
        // 排除用户消息框中的图片
        if (img.closest('.message-box--user')) return;
        const src = img.src || img.dataset.src || img.getAttribute('src');
        if (src && !notified.has(src)) {
          notified.add(src);
          chrome.runtime.sendMessage({ type: 'IMAGE_GENERATED' });
        }
      });
      // 生成完成后重置状态
      if (!timer) {
        isGenerating = false;
      }
    }
  }

  // 启动观察器
  function startObservers() {
    if (!document.body) return;
    new MutationObserver(() => { automate(); checkGenerationStatus(); runSettingsAutomation(); })
      .observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { automate(); checkGenerationStatus(); runSettingsAutomation(); }, 1000);
  }

  // 确保 DOM 就绪后启动
  if (document.body) {
    startObservers();
  } else {
    document.addEventListener('DOMContentLoaded', startObservers, { once: true });
  }
})();
