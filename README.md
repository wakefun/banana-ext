# Banana AI Launcher

Chrome 扩展，在主流 AI 聊天网站快速启动 Vertex AI Studio 图片生成。

## 功能

- 在 ChatGPT、Gemini、Grok、DeepSeek、豆包、linux.do、idcflare.com 等网站显示悬浮香蕉按钮
- 点击按钮弹出设置面板，可配置输出格式、分辨率、宽高比、人像生成等参数
- 确认后打开无痕窗口访问 Vertex AI Studio，自动应用用户设置
- 自动勾选同意 checkbox 并点击确认按钮
- 图片生成时自动最小化窗口，完成后发送系统通知（带时间戳）
- 点击通知聚焦对应窗口
- 支持自定义网站列表（通过扩展弹出窗口管理）

## 安装

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目文件夹
4. 在扩展详情页启用「在无痕模式下启用」

## 使用说明

1. 访问支持的 AI 聊天网站，右下角会出现悬浮香蕉按钮
2. 点击按钮打开设置面板，配置图片生成参数
3. 点击「确认」按钮，自动打开 Vertex AI Studio 无痕窗口
4. 在 Vertex AI Studio 中输入提示词生成图片
5. 图片生成完成后会收到系统通知，点击通知可聚焦对应窗口

## 设置选项

| 设置项 | 可选值 |
|--------|--------|
| 输出 | 图片和文字、图片 |
| 宽高比 | 1:1、3:2、2:3、3:4、4:3、4:5、5:4、9:16、16:9、21:9 |
| 输出分辨率 | 1k、2k、4k |
| 输出格式 | png、jpeg |
| 人像生成 | 允许（所有年龄段）、允许（仅限成人）、不允许 |
| 是否允许搜索 | 开/关 |

## 文件结构

```
├── manifest.json          # 扩展配置
├── background.js          # 后台服务（窗口管理、通知处理）
├── content_button.js      # 悬浮按钮和设置面板脚本
├── content_automation.js  # Vertex AI Studio 页面自动化脚本
├── popup.html             # 扩展弹出窗口页面
├── popup.js               # 弹出窗口逻辑（网站管理）
├── popup.css              # 弹出窗口样式
└── icons/                 # 图标文件
    ├── banana.svg
    ├── banana-16.png
    ├── banana-48.png
    └── banana-128.png
```
