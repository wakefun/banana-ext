# Banana Chrome Extension

## 需求概述

在主流AI聊天界面(chatgpt, gemini, grok, deepseek, 豆包)显示悬浮香蕉按钮，点击后打开无痕窗口访问Vertex AI Studio，自动勾选checkbox并点击同意按钮，监听图片生成并发送系统通知。

## 实现任务

### 1. 项目基础结构

- [x] 创建 `icons/` 目录
- [x] 创建 `manifest.json` (Manifest V3配置)
- [x] 创建 `icons/banana.svg` (黄色香蕉图标)

### 2. 悬浮按钮功能

- [x] 创建 `content_button.js` - 在目标网站注入悬浮香蕉按钮
  - 目标网站: chatgpt.com, gemini.google.com, grok.x.ai, deepseek.com, doubao.com
  - 按钮样式: 固定右下角，圆形白底，内嵌香蕉SVG

### 3. 后台服务

- [x] 创建 `background.js` - Service Worker处理消息
  - 接收按钮点击消息，打开无痕窗口
  - 接收图片生成消息，发送系统通知

### 4. 页面自动化

- [x] 创建 `content_automation.js` - 在Vertex AI Studio页面执行自动化
  - 自动勾选 `input.mdc-checkbox__native-control` checkbox
  - 自动点击包含"同意"文本的按钮
  - 监听 `.generated-image__img` 元素出现，触发通知

### 问题修改

- [x] 无痕窗口宽度500px，100vh，放在右边停靠。
- [x] 监听图片生成并发送通知未生效，请检查原因
- [x] 自动去除页面元素`<div _ngcontent-ng-c383266988="" role="alertdialog" aria-label=""免费试用"对话框" aria-describedby="free-trial-banner-message" class="ft-message-bar ng-star-inserted" jslog="134608;track:generic_click,impression,hover"></div>`
- [x] 拓展图标未设置，直接使用icons/banana.svg可以吗
- [x] 删除元素`<ai-llm-user-onboarding-banner _ngcontent-ng-c251285379="" _nghost-ng-c4115862620="" sandboxuid="0"></ai-llm-user-onboarding-banner>`
- [x] 找到class为`prompt-input-container`的div，padding设置为：`10px 0 80px 0`
- [x] content_button.js未使用icons/banana.svg文件作为图标，代码逻辑有问题。
- [x] 插件被多次点击时，会创建多个窗口，是否支持点击通知消息时自动打开对应通知的窗口，如果可以，请实现，如果不行，给出可能的其他方案供我选择。
- [x] 你的上次修改有问题，我希望插件被多次点击时，会去创建多个窗口，我需要的是，点击通知时，能够打开对应的窗口。
- [x] 提示标题要有时间，便于分辨，格式为 HH:mm
- [x] 按钮点击后弹出一个设置面板，可以设置内容如下，面板UI风格为3D面包科幻风。

    ```js
    settingList = [{
            name: '输出',
            list: ['图片和文字','图片']
        },
        {
            name: '宽高比',
            list: ['1:1','3:2','2:3','3:4','4:3','4:5','5:4','9:16','16:9','21:9']
        },
        {
            name: '输出分辨率',
            list: ['1k','2k','4k']
        },
        {
            name: '输出格式',
            list: ['png','jpeg']
        },
        {
            name: '人像生成',
            list: ['允许（所有年龄段）','允许（仅限成人）','不允许']
        },
        {
            name: '是否允许搜索',
            value: false
        }
        ]
    ```

- [x] 页面加载后自动配置设置面板，部分逻辑处理可以参看`content_automation.test.js`。
  - 等待 loading 完成后，点击 `button[aria-label="展开面板"]` 打开面板
  - 依次点击前5个 `div.cfc-select-value` 触发下拉框
  - 从 `.mdc-list-item__primary-text` 选项中按顺序进行选择，设置的值从上一步中的自定义的设置面板中同步。

- [x] 设置是否允许的按钮为`<button role="switch" type="button" class="mdc-switch mdc-switch--unselected" sandboxuid="0" tabindex="0" id="_0rif_p6ntest-ai-llm-prompt-config-grounding-google-button" name="groundingGoogleSearch" aria-label="用于启用"依托 Google 进行接地"功能的切换开关" aria-describedby="_0rif_label_toggleGoogleSearchGroundingHintId_goog_234216588" aria-checked="false">`，默认为关闭，根据用户的设置自动更新这个按钮的是否点击修改。
- [x] 完成所有设置后点击 `button[aria-label="收起面板"]` 关闭面板
- [x] 设置面板的开关和按钮和banana config的文字背景光，都使用香蕉皮的黄色。select的option不要使用原生的，也用上同样UI风格。
- [x] 设置面板的底色有些淡了，可以加入一点香蕉皮的绿色，不要太绿，然后就是光晕可以适当降低一点点。
- [x] 多个窗口图片生成后会发送多条通知，但是经过测试，发现有时候有些通知点击没反应，请检查并修复问题。
