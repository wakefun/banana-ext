(function() {
  if (!location.href.includes('vertex-ai/studio')) return;

  const notified = new Set();
  let settingsAutomationDone = false;

  const DEFAULT_SETTINGS = {
    output: '图片和文字',
    aspectRatio: '1:1',
    resolution: '1k',
    format: 'png',
    portrait: '允许（所有年龄段）',
    allowSearch: false
  };

  const SETTING_OPTIONS = [
    { key: 'output', options: ['图片和文字', '图片'] },
    { key: 'aspectRatio', options: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] },
    { key: 'resolution', options: ['1k', '2k', '4k'] },
    { key: 'format', options: ['png', 'jpeg'] },
    { key: 'portrait', options: ['允许（所有年龄段）', '允许（仅限成人）', '不允许'] }
  ];

  const PANEL_OPEN_BTN = 'button[aria-label="收起面板"]';
  const PANEL_CLOSE_BTN = 'button[aria-label="展开面板"]';
  const SELECT_TRIGGER = 'div.cfc-select-value';
  const SELECT_OPTIONS = '.mdc-list-item__primary-text';
  const GROUNDING_TOGGLE = 'button[role="switch"][name="groundingGoogleSearch"]';

  function getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, items => {
        resolve(chrome.runtime.lastError ? { ...DEFAULT_SETTINGS } : { ...DEFAULT_SETTINGS, ...items });
      });
    });
  }

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

  function getSelectionIndex(options, value) {
    const index = options.indexOf(value);
    return index === -1 ? 0 : index;
  }

  async function runSettingsAutomation() {
    if (settingsAutomationDone) return;
    if (!document.body) return;

    const panelToggle = await waitFor(() => document.querySelector(PANEL_CLOSE_BTN) || document.querySelector(PANEL_OPEN_BTN), 10000);
    if (!panelToggle) return;

    if (panelToggle.matches(PANEL_CLOSE_BTN)) {
      panelToggle.click();
      if (!await waitFor(() => document.querySelector(PANEL_OPEN_BTN), 3000)) return;
    }

    const triggers = await waitFor(() => {
      const els = document.querySelectorAll(SELECT_TRIGGER);
      return els.length >= SETTING_OPTIONS.length ? els : null;
    }, 5000);
    if (!triggers) return;

    settingsAutomationDone = true;

    const settings = await getSettings();
    const selections = SETTING_OPTIONS.map(setting => getSelectionIndex(setting.options, settings[setting.key]));

    for (let i = 0; i < selections.length && i < triggers.length; i++) {
      triggers[i].click();
      await waitFor(() => document.querySelector(SELECT_OPTIONS), 2000);

      const options = document.querySelectorAll(SELECT_OPTIONS);
      if (options[selections[i]]) options[selections[i]].click();
      else document.body.click();

      await waitFor(() => !document.querySelector(SELECT_OPTIONS), 2000);
    }

    const toggle = await waitFor(() => document.querySelector(GROUNDING_TOGGLE), 2000);
    if (toggle) {
      const isOn = toggle.getAttribute('aria-checked') === 'true';
      if (settings.allowSearch !== isOn) toggle.click();
    }

    const closeBtn = document.querySelector(PANEL_OPEN_BTN);
    if (closeBtn) closeBtn.click();
  }

  function automate() {
    document.querySelectorAll('input.mdc-checkbox__native-control').forEach(cb => {
      if (!cb.checked) cb.click();
    });
    document.querySelectorAll('span.mdc-button__label').forEach(label => {
      if (label.textContent.includes('同意')) {
        const btn = label.closest('button');
        if (btn && !btn.disabled) btn.click();
      }
    });
    document.querySelectorAll('div.ft-message-bar, ai-llm-user-onboarding-banner').forEach(el => el.remove());
    document.querySelectorAll('.prompt-input-container').forEach(el => el.style.padding = '10px 0 80px 0');
  }

  function checkImages() {
    document.querySelectorAll('.generated-image__img').forEach(img => {
      const src = img.src || img.dataset.src || img.getAttribute('src');
      if (src && !notified.has(src)) {
        notified.add(src);
        chrome.runtime.sendMessage({ type: 'IMAGE_GENERATED' });
      }
    });
  }

  new MutationObserver(() => { automate(); checkImages(); runSettingsAutomation(); })
    .observe(document.body, { childList: true, subtree: true });

  setTimeout(() => { automate(); checkImages(); runSettingsAutomation(); }, 1000);
})();
