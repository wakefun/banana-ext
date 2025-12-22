# Banana AI Launcher

Chrome 扩展，在主流 AI 聊天网站快速启动 Vertex AI Studio 图片生成。

## 功能

- 在 ChatGPT、Gemini、Grok、DeepSeek、豆包等网站显示悬浮香蕉按钮
- 点击按钮打开无痕窗口访问 Vertex AI Studio
- 自动勾选同意 checkbox 并点击确认按钮
- 图片生成完成时发送系统通知（带时间戳）
- 点击通知聚焦对应窗口

## 安装

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目文件夹
4. 在扩展详情页启用「在无痕模式下启用」

## 文件结构

```
├── manifest.json          # 扩展配置
├── background.js          # 后台服务
├── content_button.js      # 悬浮按钮脚本
├── content_automation.js  # 页面自动化脚本
└── icons/                 # 图标文件
```
