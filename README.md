# MoegirlPediaInterfaceCodes

萌娘百科界面代码库

[![post commit CI](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/postCommit.yaml/badge.svg)](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/postCommit.yaml) [![MoegirlPediaInterfaceAdmins Project](https://img.shields.io/badge/MoegirlPediaInterfaceAdmins-Project-blue?style=flat&logo=github&labelColor=343B42)](https://github.com/orgs/MoegirlPediaInterfaceAdmins/projects/1/views/1)

欢迎来到萌娘百科界面代码库，本仓库由[萌娘百科界面管理员](https://zh.moegirl.org.cn/_?curid=489391)所组成的[团队](https://github.com/MoegirlPediaInterfaceAdmins)维护，旨在以自动化的方式减轻维护界面代码的复杂度。

目前只有[萌娘百科的界面管理员](https://zh.moegirl.org.cn/Special:Listusers/interface-admin)可以拥有本仓库的读写权限，如果你是萌娘百科的界面管理员但没有权限，你可以向 U:AnnAngela 获取本仓库的读写权限；不过如果你尚不是界面管理员，我们也欢迎你以[下列方式](#参与维护)参与到本仓库的维护工作中来。

## 仓库架构

### 仓库文件架构

本仓库包含多组文件用以实现不同用途，详情见下。

<details><summary>仓库架构详情</summary>

- [`.github`](.github) 文件夹用以保存 GitHub Dependabot 和 GitHub Actions 所需配置文件，其中：
  - [`.github/workflows/postCommit.yaml`](.github/workflows/postCommit.yaml) 用以保存自动化流程，包含自动配置 Conventional Commits（约定式提交）所需 scope（作用域）信息、自动导入来自 npm 和指定页面的代码、自动补全小工具列表；
  - [`.github/workflows/generatePolyfill.yaml`](.github/workflows/generatePolyfill.yaml) 用以自动生成 polyfill 文件；
  - [`.github/workflows/auto_assign.yaml`](.github/workflows/auto_assign.yaml) 用以自动对 pull request 和 issue 添加 assignees 和 reviewers（若有）。
- [`.vscode/settings.json`](.vscode/settings.json) 用来保存 Conventional Commits（约定式提交）所需 scope（作用域）信息；
- [`scripts`](scripts) 文件夹用以保存流程所需代码，其中：
  - [`scripts/postCommit/prepareGit.js`](scripts/postCommit/prepareGit.js) 用来准备 Github Actions 上的 git 环境，自动生成 author 和 committer 的相关信息；
  - [`scripts/browserify/index.js`](scripts/browserify/index.js) 用来通过 [browserify](https://browserify.org/) 库导入来自 npm 的代码，其目标在 [`scripts/browserify/targets.yaml`](scripts/browserify/targets.yaml) 中定义；
  - [`scripts/prefetch/index.js`](scripts/prefetch/index.js) 用来导入来自指定页面的代码，其目标在 [`scripts/prefetch/targets.yaml`](scripts/prefetch/targets.yaml) 中定义；
  - [`scripts/generatePolyfill/index.js`](scripts/generatePolyfill/index.js) 用来自动生成 polyfill 文件，该代码使用了 [JakeChampion/polyfill-service 库](https://github.com/JakeChampion/polyfill-service)；
  - [`scripts/generateGadgetsDefinition/index.js`](scripts/generateGadgetsDefinition/index.js) 用来自动补全小工具列表，当发现新增小工具时，该代码会自动将对应小工具插入到 [`src/gadgets/Gadgets-definition-list.yaml`](src/gadgets/Gadgets-definition-list.yaml) 的响应列表的末尾；
  - [`scripts/generateConventionalCommitsScopes/index.js`](scripts/generateConventionalCommitsScopes/index.js) 用来自动配置 Conventional Commits（约定式提交）所需 scope（作用域）信息；
  - [`scripts/postCommit/linguist-generated.js`](scripts/postCommit/linguist-generated.js) 用来自动生成 [`.gitattributes`](.gitattributes) 以告知 Github 如何区分代码是否自动生成；
  - [`scripts/postCommit/push.js`](scripts/postCommit/push.js) 用来推送由 Github Actions 做出的更改；
  - [`scripts/emailmapChecker/index.js`](scripts/emailmapChecker/index.js) 用来检查相关用户是否将其萌娘百科用户名和邮箱地址添加到 [`.mailmap`](.mailmap)，若当前环境为本地则检测 git 配置文件里的邮箱地址，若当前环境为 Github Actions 则检查相关 commits 的邮箱地址。
  - [`scripts/ci/before.js`](scripts/ci/before.js) 和 [`scripts/ci/after.js`](scripts/ci/after.js) 用来在 `npm run ci` 里自动替换 [`package-lock.json`](package-lock.json) 里的 `resolved` 对应的 registry 为你本地设置的 registry，有助于加快安装速度。
  - [`scripts/minification/terser.js`](scripts/minification/terser.js) 用来使用 [Terser](https://) 对编译后的 JavaScript 代码进行压缩和优化，生成的文件会被放置在 `dist/` 文件夹下。
- 自动化工具的配置文件：
  - [`eslint.config.js`](eslint.config.js) 配置 eslint，由于所有 Javascript 代码都需经过编译，故其 `parserOptions.ecmaVersion` 被指定为 `latest` 以便充分利用最新标准；
  - [`tsconfig.json`](tsconfig.json) 配置 ts，用于编辑器；
  - [`tsconfig.production.json`](tsconfig.production.json) 配置 tsc，用于编译代码；
  - [`.stylelintrc.yaml`](.stylelintrc.yaml) 配置 stylelint；
  - [`.postcssrc.yaml`](.postcssrc.yaml) 配置 postcss；
  - [`.browserslistrc`](.browserslistrc) 配置 [autoprefixer](https://github.com/postcss/autoprefixer) 所使用的 [browserslist](https://github.com/browserslist/browserslist)，目前暂定锚定为 [`defaults`](https://github.com/browserslist/browserslist#full-list) 的基础上添加 `Chrome >= 86` 以适应萌百用户群体。
- 代码部分：
  - [`src/gadgets`](src/gadgets) 以文件夹形式保存小工具，每一个文件夹都是一个小工具，里面包含以下内容：
    - `definition.yaml` 保存小工具配置，包括依赖项、所需权限等，以 `_` 开头的键值对是其他配置，如小工具所在的章节等；
    - `definition.{站点代号}.yaml` （可选）保存小工具的站点配置，包括依赖项、所需权限等，在处理对应站点的配置文件时，将会在以覆盖方式合并到上述配置后生成配置文件，如 [`src/gadgets/HotCat/definition.commons.yaml`](src/gadgets/HotCat/definition.commons.yaml)；
    - `.eslintrc.yaml` （可选）用以阻止 eslint 在某些文件上进行检查，常见于来自 npm 和指定页面的代码；
    - `*.js` 和 `*.css` 为小工具代码，文件名为萌娘百科上对应页面的页面名；
  - [`src/groups`](src/groups) 以文件夹形式保存用户组级别代码，每一个文件夹都对应一个子站点，每一个站点文件夹的子文件夹对应一个用户组，里面包含 `*.js` 和 `*.css` 等代码，文件名为萌娘百科上对应页面的页面名；
  - [`src/global`](src/global) 保存全站代码，每一个文件夹都对应一个站点，里面包含 `*.js` 和 `*.css` 等代码，文件名为萌娘百科上对应页面的页面名。

</details>

本仓库支持同时管理多个子站点的代码：

- [小工具部分](src/gadgets)：通过 `definition.yaml` 的 `_sites` 属性指定站点；
  - 小工具的站点设置：通过文件名指定站点，参见上述架构详情的 `definition.{站点代号}.yaml` 部分；
- [用户组代码](src/groups) 和 [全站代码](src/global)：通过文件夹名指定站点。

### 仓库 npm 脚本

本仓库包含下列脚本：

- `npm run test` 方便检测代码错误
- `npm run format` 可修正可被自动修正的错误
- `npm run ci` 可通过临时修改镜像源的方式加快 `npm ci` 速度
- `npm run build` 手动编译全部（CSS+JS）代码
  - `npm run build:css` 手动编译所有 CSS 代码
  - `npm run build:js` 手动编译所有 JS 代码

## 自动化流程

- 每周日 23:00 UTC 会自动触发一次 Generate Polyfill CI；
- 每天 00:15 UTC（但愿，Github Actions的 cron 延迟真的好高 \_(:з」∠)\_）会自动触发一次 postCommit CI；
- 每提交一次 commit（包括提交 pull request 和在 pull request 里提交新的 commit），postCommit CI 会触发；
- 当 postCommit CI 检测到新内容时，会自动触发一次 Linter test。

## 编译流程

机器人通过以下流程编译代码，然后提交到萌百：

- 执行 `rm -rf dist && npx tsc --project tsconfig.production.json && node scripts/minification/terser.js` 以编译 `*.js` 代码；
- 执行 `npx postcss src/**/*.css --base src/ -d dist/ --verbose` 以编译 `*.css` 代码；
- 根据模板生成 `MediaWiki:Gadgets-definition` 页面。

如需手动唤起机器人，请到 [`post commit CI` workflow](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/postCommit.yaml) 处，选择 `Branch` 为 `master`，手动执行该 workflow。

## 已知问题

- ~~[TypeScript 5.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#deprecations-and-default-changes:~:text=and%20setting%20values%3A-,%2D%2Dtarget%3A%20ES3,-%2D%2Dout) 将 `target: ES3` 编译选项[标记为弃用](https://github.com/microsoft/TypeScript/issues/51909#issue-1498969440:~:text=configurations%20as%20deprecated%3A-,target%3A%20ES3,-noImplicitUseStrict)，而萌娘百科目前（2023年3月）使用的 [MediaWiki 1.31.7](https://zh.moegirl.org.cn/Special:%E7%89%88%E6%9C%AC#mw-version-software:~:text=MediaWiki-,1.31.7,-PHP) 存在 bug 无法解析使用保留字作为点号属性名（`foo.return` 会报错），[这在 MediaWiki 1.33 被修复](https://www.mediawiki.org/wiki/MediaWiki_1.33/wmf.19#Core_changes:~:text=Make%20JSMinPlus%20allow%20reserved%20words%20as%20property%20name%20(ES5))。~~

  ~~解决办法：~~

  1. ~~等萌百升级 MediaWiki 系统；或~~（萌百真升级 MediaWiki 了）
  2. ~~找一个支持编译为 ECMAScript 3 版本的编译工具。~~

## 参与维护

众人拾柴火焰高，我们欢迎你参与到界面管理工作中来。

### 提出建议、意见

我们欢迎你在[萌娘百科技术实现讨论版](https://zh.moegirl.org.cn/_?curid=543139)提出建议、意见，我们会审慎考虑可行性和成本等因素后作出决定。

### 提交贡献

提交贡献的原因有很多，可能是发现了 typo，可能你写成了一个小工具，不论如何我们都欢迎你来提交贡献。

但首先，最重要的一点是：**务必阅读并遵守 [CODE OF CONDUCT.md](CODE_OF_CONDUCT.md)**，否则你的贡献有可能被拒绝。

我们建议你使用 [Visual Studio Code](https://code.visualstudio.com/)，本仓库专为 VSCode 配置。我们也建议你搭配以下 VSCode 扩展结合本仓库提供的配置以优化体验：

- [Conventional Commits（约定式提交）](https://www.conventionalcommits.org/)：[Conventional Commits](https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits) 扩展；
- [eslint](https://eslint.org/)：[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) 扩展；
- [stylelint](https://stylelint.io/)：[Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint) 扩展；
- [EditorConfig](https://editorconfig.org/)：[EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) 扩展；
- 远程开发：
  - 在 Linux on Windows with WSL 里：[Remote - WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) 扩展；
  - 在运行 Linux 的本地 Docker 容器里：[Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) 扩展；
  - 在运行 Linux 的本地虚拟机或远程服务器里：[Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh) 扩展和 [Remote - SSH: Editing Configuration Files](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh-edit) 扩展。
