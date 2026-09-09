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
  - [`scripts/ci/selectRegistry.js`](scripts/ci/selectRegistry.js) 用来在 `npm run ci` 里测速选出最快的 npm registry 并写入 `.cache/ci-registry`，随后 `npm ci --replace-registry-host=always` 会让 npm 在安装时把 [`package-lock.json`](package-lock.json) 里 `resolved` 对应的 registry 替换为该源（不会改动 lock 文件本身），有助于加快安装速度。
  - [`scripts/minification/terser.js`](scripts/minification/terser.js) 用来使用 [Terser](https://) 对编译后的 JavaScript 代码进行压缩和优化，生成的文件会被放置在 `dist/` 文件夹下。
- 自动化工具的配置文件：
  - [`eslint.config.js`](eslint.config.js) 配置 eslint，由于所有 Javascript 代码都需经过编译，故其 `parserOptions.ecmaVersion` 被指定为 `latest` 以便充分利用最新标准；
  - [`tsconfig.json`](tsconfig.json) 配置 ts，用于编辑器；
  - [`tsconfig.production.json`](tsconfig.production.json) 配置 tsc，用于编译代码；
  - [`.stylelintrc.yaml`](.stylelintrc.yaml) 配置 stylelint；
  - [`.postcssrc.yaml`](.postcssrc.yaml) 配置 postcss；
  - [`.browserslistrc`](.browserslistrc) 配置 [autoprefixer](https://github.com/postcss/autoprefixer) 和 [`scripts/generatePolyfill`](scripts/generatePolyfill/index.js) 所使用的 [browserslist](https://github.com/browserslist/browserslist)，目前暂定锚定为 [`baseline newly available`](https://web.dev/series/baseline-newly-available?hl=zh-cn) 的基础上添加 `last 3 Firefox versions` 和 `Chrome 132`，并排除移动端以适应萌百编辑群体。
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

- `npm run test` 并行执行下列本地检查，任一失败即整体失败：
  - `npm run test:eslint` 用 [ESLint](https://eslint.org/) 检查 [`src`](src) 下的 JavaScript；
  - `npm run test:stylelint` 用 [stylelint](https://stylelint.io/) 检查 [`src`](src) 下的 CSS；
  - `npm run test:v8r` 用 [v8r](https://github.com/chrishrb/v8r) 校验各小工具 `definition.yaml` 是否符合 [JSON Schema](.vscode/json-schemas)；
  - `npm run test:mailmap` 检查本地 git 配置中的邮箱是否已登记在 [`.mailmap`](.mailmap)。
- `npm run lint:scripts` 用 [ESLint](https://eslint.org/) 检查 `npm run test:eslint` 未覆盖的 Node 侧代码（[`scripts`](scripts)、根目录配置文件与 [`.husky`](.husky) 下的 `.mjs`）；检查范围由 [`scripts/modules/lintTargets.js`](scripts/modules/lintTargets.js) 定义，与 [`eslint.config.js`](eslint.config.js) 共用同一份
- `npm run lint:commit-message` / `npm run lint:pr-title` 用 [commitlint](https://commitlint.js.org/) 校验当前 CI 事件中的提交信息 / PR 标题（规则见 [`commitlint.config.mjs`](commitlint.config.mjs)），供 CI 使用；两者均需在 GitHub Actions 中运行，本地直接执行会因缺少事件载荷而直接退出
- `npm run format` 可修正可被自动修正的错误
- `npm run ci` 会测速选出最快的镜像源并让 npm 在安装时使用（不会改动 lock 文件），以加快 `npm ci` 速度
- `npm run build` 手动编译全部（CSS+JS）代码
  - `npm run build:css` 手动编译所有 CSS 代码
  - `npm run build:js` 手动编译所有 JS 代码

`npm run test` 是提交前的快速检查，**不等价于 CI 的完整验证**：CI 还会额外执行 `npm run lint:scripts` 与 [`scripts/postcss/index.js`](scripts/postcss/index.js)（PostCSS 警告）；其中 `.mailmap` 检查在本地只校验当前 git 配置的邮箱，而在 CI 会校验本次推送或 PR 中每个 commit 的作者与提交者邮箱。`npm run test` 与 `npm run lint:scripts` 均不做 TypeScript 类型检查。完整的编译流程不在 GitHub Actions 中执行，而是在提交合并后由机器人完成（见下方[「编译流程」](#编译流程)）。

### 提交前检查（Git hooks）

本仓库使用 [Husky](https://typicode.github.io/husky/) 管理本地 Git hooks，由 `npm install` / `npm run ci` 触发的 `prepare` 脚本自动安装。提交时会自动执行：

- `commit-msg`：用 [commitlint](https://commitlint.js.org/) 校验提交信息符合 [Conventional Commits](https://www.conventionalcommits.org/)（规则见 [`commitlint.config.mjs`](commitlint.config.mjs)）；
- `pre-commit`：检查本地 git 配置的邮箱是否已登记在 [`.mailmap`](.mailmap)；
- `post-merge` / `post-rewrite`：当你执行 `git pull`（包括 `pull --rebase`）且拉取结果修改了 [`package-lock.json`](package-lock.json) 时，自动执行一次 `npm run ci` 以刷新依赖。

如需跳过检查，可用 `git commit --no-verify`，或临时设置 `HUSKY=0`（影响范围更大，会跳过全部 hooks）。请仅在确有必要时使用。

## 自动化流程

- 每周日 23:00 UTC 会自动触发一次 Generate Polyfill CI；
- 每天 00:15 UTC（但愿，Github Actions的 cron 延迟真的好高 \_(:з」∠)\_）会自动触发一次 postCommit CI；
- 每提交一次 commit（包括提交 pull request 和在 pull request 里提交新的 commit），postCommit CI 会触发；
- 当 postCommit CI 检测到新内容时，会自动触发一次 Linter test；
- 每次 push、以及 PR 创建/重开/更新标题时，commit lint CI 会校验提交信息与 PR 标题是否符合 [Conventional Commits](https://www.conventionalcommits.org/)（用于兜底 `git commit --no-verify` 等绕过本地钩子的情况，并保证 squash 合并进入历史的 PR 标题合规）。

## 编译流程

机器人通过以下流程编译代码，然后提交到萌百：

- 执行 `rm -rf dist && npx tsc --project tsconfig.production.json && node scripts/minification/terser.js` 以编译 `*.js` 代码；
- 执行 `npx postcss src/**/*.css --base src/ -d dist/ --verbose` 以编译 `*.css` 代码；
- 根据模板生成 `MediaWiki:Gadgets-definition` 页面。

如需手动唤起机器人，请到 [`post commit CI` workflow](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/postCommit.yaml) 处，选择 `Branch` 为 `master`，手动执行该 workflow。

## 已知问题

目前暂无。

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
