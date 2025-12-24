(function() {
  // 防止重复注入
  if (document.getElementById('banana-float-btn')) return;

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
    { key: 'output', label: '输出', options: ['图片和文字', '图片'] },
    { key: 'aspectRatio', label: '宽高比', options: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] },
    { key: 'resolution', label: '输出分辨率', options: ['1k', '2k', '4k'] },
    { key: 'format', label: '输出格式', options: ['png', 'jpeg'] },
    { key: 'portrait', label: '人像生成', options: ['允许（所有年龄段）', '允许（仅限成人）', '不允许'] }
  ];

  // 面板样式 - 3D面包科幻风
  const PANEL_STYLES = `
    #banana-settings-overlay {
      --bread-bg: #c5d4a0;
      --bread-shadow-light: #dbe8c4;
      --bread-shadow-dark: #a3b580;
      --banana-yellow: #FFE135;
      --banana-yellow-dark: #FFD000;
      --banana-glow: rgba(255, 225, 53, 0.25);
      --text-color: #5d5d48;
      position: fixed;
      bottom: 100px;
      right: 20px;
      z-index: 2147483647;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }
    #banana-settings-overlay.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .banana-panel {
      width: 320px;
      background-color: var(--bread-bg);
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.1'/%3E%3C/svg%3E");
      border-radius: 30px;
      padding: 25px;
      box-sizing: border-box;
      box-shadow: 20px 20px 60px var(--bread-shadow-dark), -20px -20px 60px var(--bread-shadow-light), inset 0 0 0 2px rgba(255, 255, 255, 0.3);
      position: relative;
      overflow: visible;
    }
    .banana-panel::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, transparent 45%, rgba(255, 225, 53, 0.03) 50%, transparent 55%);
      animation: hologram-swipe 8s infinite linear;
      pointer-events: none;
    }
    @keyframes hologram-swipe {
      0% { transform: rotate(0deg) translateY(-20%); }
      100% { transform: rotate(0deg) translateY(20%); }
    }
    .panel-header {
      text-align: center;
      margin-bottom: 25px;
      position: relative;
    }
    .panel-title {
      font-size: 1.2rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: transparent;
      position: relative;
      display: inline-block;
    }
    .panel-title::before,
    .panel-title::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      color: #000;
    }
    .panel-title::before {
      clip-path: polygon(0 0, 100% 0, 100% 45%, 0 55%);
      transform: translate(-1px, -1px);
    }
    .panel-title::after {
      clip-path: polygon(0 55%, 100% 45%, 100% 100%, 0 100%);
      transform: translate(1px, 1px);
    }
    .setting-item {
      margin-bottom: 18px;
      position: relative;
    }
    .setting-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 8px;
      padding-left: 5px;
    }
    .custom-select {
      position: relative;
      width: 100%;
      font-size: 0.9rem;
      color: var(--text-color);
      user-select: none;
    }
    .select-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 15px;
      border-radius: 15px;
      background: var(--bread-bg);
      cursor: pointer;
      font-weight: 600;
      box-shadow: inset 6px 6px 12px var(--bread-shadow-dark), inset -6px -6px 12px var(--bread-shadow-light);
      transition: all 0.2s;
    }
    .select-trigger:hover {
      color: var(--banana-yellow-dark);
    }
    .select-trigger::after {
      content: '▼';
      font-size: 0.7em;
      color: var(--banana-yellow-dark);
      transition: transform 0.3s;
    }
    .custom-select.open .select-trigger::after {
      transform: rotate(180deg);
    }
    .select-options {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      right: 0;
      background: var(--bread-bg);
      border-radius: 15px;
      z-index: 100;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
      box-shadow: 10px 10px 20px var(--bread-shadow-dark), -10px -10px 20px var(--bread-shadow-light);
      max-height: 200px;
      overflow-y: auto;
    }
    .custom-select.open .select-options {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    .custom-option {
      padding: 10px 15px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      border-bottom: 1px solid rgba(0,0,0,0.03);
    }
    .custom-option:last-child {
      border-bottom: none;
    }
    .custom-option:hover {
      background: rgba(255, 225, 53, 0.15);
      color: #bfa117;
      padding-left: 20px;
    }
    .custom-option.selected {
      background: var(--banana-yellow);
      color: #5d5448;
      box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.4);
    }
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
    }
    .toggle-switch {
      position: relative;
      width: 60px;
      height: 30px;
      appearance: none;
      background: var(--bread-bg);
      border-radius: 30px;
      box-shadow: inset 4px 4px 8px var(--bread-shadow-dark), inset -4px -4px 8px var(--bread-shadow-light);
      cursor: pointer;
      transition: all 0.3s;
    }
    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(145deg, #ffffff, #e6e6e6);
      box-shadow: 2px 2px 5px var(--bread-shadow-dark), -1px -1px 3px var(--bread-shadow-light);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
    }
    .toggle-switch:checked {
      box-shadow: inset 4px 4px 8px rgba(255, 208, 0, 0.2), inset -4px -4px 8px #ffffff;
    }
    .toggle-switch:checked::after {
      left: 33px;
      background: var(--banana-yellow);
      box-shadow: 0 0 5px var(--banana-yellow), 0 0 10px var(--banana-glow);
    }
    .confirm-btn {
      width: 100%;
      margin-top: 25px;
      padding: 15px;
      border: none;
      border-radius: 20px;
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 1px;
      cursor: pointer;
      background: linear-gradient(145deg, #FFF090, var(--banana-yellow-dark));
      color: #5d5448;
      box-shadow: 8px 8px 16px var(--bread-shadow-dark), -8px -8px 16px var(--bread-shadow-light);
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .confirm-btn:active {
      transform: scale(0.96);
      box-shadow: inset 4px 4px 8px rgba(0,0,0,0.1), inset -4px -4px 8px rgba(255,255,255,0.2);
    }
    .confirm-btn::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      transition: 0.5s;
    }
    .confirm-btn:hover::after {
      left: 100%;
    }
  `;

  // 注入样式
  function injectStyles() {
    if (document.getElementById('banana-panel-styles')) return;
    const style = document.createElement('style');
    style.id = 'banana-panel-styles';
    style.textContent = PANEL_STYLES;
    document.head.appendChild(style);
  }

  // 获取设置
  function getSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, items => {
        resolve(chrome.runtime.lastError ? { ...DEFAULT_SETTINGS } : { ...DEFAULT_SETTINGS, ...items });
      });
    });
  }

  // 保存设置
  function saveSettings(settings) {
    return new Promise(resolve => chrome.storage.sync.set(settings, resolve));
  }

  // 创建自定义选择框
  function createCustomSelect({ key, label, options }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item';

    const labelEl = document.createElement('label');
    labelEl.className = 'setting-label';
    labelEl.textContent = label;

    const selectContainer = document.createElement('div');
    selectContainer.className = 'custom-select';
    selectContainer.dataset.settingKey = key;

    const trigger = document.createElement('div');
    trigger.className = 'select-trigger';
    trigger.textContent = options[0];

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'select-options';

    options.forEach((opt, idx) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'custom-option' + (idx === 0 ? ' selected' : '');
      optionEl.dataset.value = opt;
      optionEl.textContent = opt;
      optionEl.addEventListener('click', (e) => {
        e.stopPropagation();
        trigger.textContent = opt;
        optionsContainer.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
        optionEl.classList.add('selected');
        selectContainer.classList.remove('open');
      });
      optionsContainer.appendChild(optionEl);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // 关闭其他打开的选择框
      document.querySelectorAll('.custom-select.open').forEach(s => {
        if (s !== selectContainer) s.classList.remove('open');
      });
      selectContainer.classList.toggle('open');
    });

    selectContainer.appendChild(trigger);
    selectContainer.appendChild(optionsContainer);
    wrapper.appendChild(labelEl);
    wrapper.appendChild(selectContainer);
    return wrapper;
  }

  // 创建开关行
  function createToggleRow() {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item toggle-row';

    const label = document.createElement('span');
    label.className = 'setting-label';
    label.style.marginBottom = '0';
    label.textContent = '是否允许搜索';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'toggle-switch';
    toggle.dataset.settingKey = 'allowSearch';

    wrapper.appendChild(label);
    wrapper.appendChild(toggle);
    return wrapper;
  }

  // 创建设置面板
  function createPanel() {
    const overlay = document.createElement('div');
    overlay.id = 'banana-settings-overlay';

    const panel = document.createElement('div');
    panel.className = 'banana-panel';

    // 标题
    const header = document.createElement('div');
    header.className = 'panel-header';
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '大香蕉助手';
    title.dataset.text = '大香蕉助手';
    header.appendChild(title);
    panel.appendChild(header);

    // 设置内容
    const content = document.createElement('div');
    content.id = 'settings-content';
    SETTING_OPTIONS.forEach(setting => content.appendChild(createCustomSelect(setting)));
    content.appendChild(createToggleRow());
    panel.appendChild(content);

    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-btn';
    confirmBtn.textContent = '确认';
    confirmBtn.addEventListener('click', async () => {
      const settings = collectSettings(overlay);
      await saveSettings(settings);
      overlay.classList.remove('visible');
      chrome.runtime.sendMessage({ type: 'OPEN_BANANA_CONSOLE' });
    });
    panel.appendChild(confirmBtn);

    overlay.appendChild(panel);

    // 点击外部关闭下拉框
    document.addEventListener('click', (e) => {
      if (!overlay.contains(e.target)) {
        overlay.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
      }
    });

    return overlay;
  }

  // 加载设置到面板
  async function loadSettings(overlay) {
    const settings = await getSettings();
    overlay.querySelectorAll('.custom-select[data-setting-key]').forEach(select => {
      const key = select.dataset.settingKey;
      const value = settings[key];
      if (value !== undefined) {
        const trigger = select.querySelector('.select-trigger');
        trigger.textContent = value;
        select.querySelectorAll('.custom-option').forEach(opt => {
          opt.classList.toggle('selected', opt.dataset.value === value);
        });
      }
    });
    const toggle = overlay.querySelector('input[data-setting-key="allowSearch"]');
    if (toggle) toggle.checked = Boolean(settings.allowSearch);
  }

  // 收集面板设置
  function collectSettings(overlay) {
    const settings = { ...DEFAULT_SETTINGS };
    overlay.querySelectorAll('.custom-select[data-setting-key]').forEach(select => {
      const key = select.dataset.settingKey;
      const selected = select.querySelector('.custom-option.selected');
      if (selected) settings[key] = selected.dataset.value;
    });
    const toggle = overlay.querySelector('input[data-setting-key="allowSearch"]');
    if (toggle) settings.allowSearch = toggle.checked;
    return settings;
  }

  // 初始化
  function init() {
    if (!document.body) return;
    injectStyles();

    // 创建悬浮按钮
    const btn = document.createElement('div');
    btn.id = 'banana-float-btn';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#fff;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:2147483647;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s';

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/banana.svg');
    img.style.cssText = 'width:40px;height:40px';
    btn.appendChild(img);

    const panel = createPanel();

    btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    btn.onclick = async () => {
      const isOpen = panel.classList.contains('visible');
      if (isOpen) {
        panel.classList.remove('visible');
      } else {
        await loadSettings(panel);
        panel.classList.add('visible');
      }
    };

    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  // 确保 DOM 就绪后初始化
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
