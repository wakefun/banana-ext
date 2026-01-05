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

// 设置选项配置
const SETTING_OPTIONS = [
  { key: 'output', label: '输出', options: ['图片和文字', '图片'] },
  { key: 'aspectRatio', label: '宽高比', options: ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] },
  { key: 'resolution', label: '输出分辨率', options: ['1k', '2k', '4k'] },
  { key: 'format', label: '输出格式', options: ['png', 'jpeg'] },
  { key: 'portrait', label: '人像生成', options: ['允许（所有年龄段）', '允许（仅限成人）', '不允许'] }
];

// 默认设置
const DEFAULT_SETTINGS = {
  output: '图片和文字',
  aspectRatio: '1:1',
  resolution: '1k',
  format: 'png',
  portrait: '允许（所有年龄段）',
  allowSearch: false
};

// 导出到全局（兼容 Service Worker 和普通脚本）
if (typeof self !== 'undefined') {
  self.DEFAULT_SITES = DEFAULT_SITES;
  self.SETTING_OPTIONS = SETTING_OPTIONS;
  self.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}
