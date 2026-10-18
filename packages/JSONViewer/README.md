# JSONViewer

[萌娘百科](https://zh.moegirl.org.cn/) [JSONViewer](https://zh.moegirl.org.cn/MediaWiki:Gadget-JSONViewer.js) 小工具（`Gadget-JSONViewer`）的源码包。源码为 TypeScript / TSX（`src/`），经 **esbuild** 打包为单文件产物，直接写入 [`src/gadgets/JSONViewer/`](../../src/gadgets/JSONViewer/)（wiki 部署读取该位置），由 postCommit CI 自动重建并提交。

> [!WARNING]
> **产物是编译生成的，请勿手改。**
> 源码（`src/**/*.ts(x)`）→ 根目录 `npm run package:build` → `src/gadgets/JSONViewer/`，一切修改在源码进行，产物由 CI 自动重建。

## 功能

- 将站内 JSON 页面与标题含 `json` 的纯文本页面替换为可折叠、带主题的交互式 JSON 树视图。
- 支持暗色主题自动探测与跟随切换。
- 支持用户设定全局变量改变主题。

## 配置接口

其他脚本或用户 JS 通过全局变量配置本工具：

```js
window.jsonViewerTheme = 'default' | 'a11y' | 'github' | 'vscode' | 'atom' | 'winter-is-coming'; // 主题，默认 vscode
window.jsonViewerDark = true; // 强制暗色模式；false 或不设则按皮肤自动探测并跟随切换
```

本工具在加载时会为这些属性安装响应式访问器，并在赋值发生时重新渲染，因此无需关心用户 `common.js` 与小工具之间的脚本加载顺序。

## 目录结构

```text
src/
├── index.tsx           # 入口：jQuery-ready 后按内容模型/标题识别 JSON 页面并挂载视图
├── JSONViewer.tsx      # 视图组件：订阅配置与皮肤暗色状态，渲染 react18-json-view
├── config.ts           # window 配置项的响应式存储（useSyncExternalStore 数据源）
├── theme.ts            # 皮肤暗色探测与订阅（moeskin color-mode / vector-2022 clientpref 类）
├── source.ts           # 页面源码获取与 diff/oldid 参数解析
├── index.css           # 本工具自有的布局样式
└── env.d.ts            # CSS 副作用导入与构建期常量 __DEV__ 的声明
tests/                  # vitest（jsdom），覆盖 config / theme / source
scripts/build.js        # esbuild 构建（发布 / --watch dev / --check-idempotent 幂等）
```

## 构建

依赖统一由仓库根目录管理，本包不设独立 package.json：

- `npm run package:build` —— 构建产物并写入 `src/gadgets/JSONViewer/`；
- `npm run package:test` —— 构建幂等检查与单元测试（`--check` 模式）；
- `node packages/JSONViewer/scripts/build.js --watch` —— dev watch：产出未压缩 + inline sourcemap 的单文件（CSS 以 `<style>` 注入打包进 JS）到 `packages/JSONViewer/dist/dev/`（已被 `.gitignore` 的 `dist` 覆盖），改动即时重建；`__DEV__` 取 true，入口里为 safemode 调试写的 `mw.loader.using` 分支被保留，便于脱离依赖声明单独调试。
