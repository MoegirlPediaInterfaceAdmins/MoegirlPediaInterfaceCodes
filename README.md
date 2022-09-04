# MoegirlPediaInterfaceCodes

萌娘百科界面代码库

[![Linter test](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/Linter%20test.yml/badge.svg)](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/Linter%20test.yml)

欢迎来到萌娘百科界面代码库，本仓库由[萌娘百科界面管理员](https://zh.moegirl.org.cn/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91:%E7%95%8C%E9%9D%A2%E7%AE%A1%E7%90%86%E5%91%98)所组成的[团队](https://github.com/MoegirlPediaInterfaceAdmins)维护，旨在以自动化的方式减轻维护界面代码的复杂度。

目前只有[萌娘百科的界面管理员](https://zh.moegirl.org.cn/Special:Listusers/interface-admin)可以拥有本仓库的读写权限，如果你是萌娘百科的界面管理员但没有权限，你可以向 U:AnnAngela 获取本仓库的读写权限；不过如果你尚不是界面管理员，我们也欢迎你以[下列方式](#参与维护)参与到本仓库的维护工作中来。

## 仓库架构

- [`.github`](.github) 文件夹用以保存 GitHub Dependabot 和 GitHub Actions 所需配置文件，其中：
    - [`.github/workflows/Linter test.yml`](.github/workflows/Linter_test.yml) 用以保存使用 [eslint](https://eslint.org/)、[stylelint](https://stylelint.io/) 和 [v8r](https://github.com/chris48s/v8r) 进行代码测试流程，该流程成功完成时会触发[机器人](https://zh.moegirl.org.cn/User:AnnAngela-dbot)的[编译流程](#编译流程)；
    - [`.github/workflows/postCommit.yml`](.github/workflows/postCommit.yml) 用以保存自动化流程，包含自动配置 Conventional Commits（约定式提交）所需 scope（作用域）信息、自动导入来自 npm 和指定页面的代码、自动补全小工具列表和自动生成 polyfill 文件。
- [`.vscode/settings.json`](.vscode/settings.json) 用来保存 Conventional Commits（约定式提交）所需 scope（作用域）信息；
- [`scripts`](scripts) 文件夹用以保存流程所需代码，其中：
    - [`scripts/browserify.js`](scripts/browserify.js) 用来通过 [browserify](https://browserify.org/) 库导入来自 npm 的代码，其目标在 [`scripts/browserifyTargets.js`](scripts/browserifyTargets.js) 中定义；
    - [`scripts/prefetch.js`](scripts/prefetch.js) 用来导入来自指定页面的代码，其目标在 [`scripts/prefetchTargets.js`](scripts/prefetchTargets.js) 中定义；
    - [`scripts/conventionalCommitsScopesGenerator.js`](scripts/conventionalCommitsScopesGenerator.js) 用来自动配置 Conventional Commits（约定式提交）所需 scope（作用域）信息；
    - [`scripts/gadgetsDefinitionGenerator.js`](scripts/gadgetsDefinitionGenerator.js) 用来自动补全小工具列表，当发现新增小工具时，该代码会自动将对应小工具插入到 [`src/gadgets/Gadgets-definition-list.json`](src/gadgets/Gadgets-definition-list.json) 的响应列表的末尾；
    - [`scripts/generatePolyfill.js`](scripts/generatePolyfill.js) 用来自动生成 polyfill 文件，该代码使用了来自《金融时报》的 [polyfill.io](https://polyfill.io/v3/)（[Financial-Times/polyfill-service](https://github.com/Financial-Times/polyfill-service)）和 [Financial-Times/polyfill-library](https://github.com/Financial-Times/polyfill-library)。
- 自动化工具的配置文件：
    - [`.eslintrc`](.eslintrc) 配置 eslint，由于所有 Javascript 代码都需经过编译，故其 `parserOptions.ecmaVersion` 被指定为 `latest` 以便充分利用最新标准；
    - [`.stylelintrc.json`](.stylelintrc.json) 配置 stylelint；
    - [`.browserslistrc`](.browserslistrc) 配置 [autoprifixer](https://github.com/postcss/autoprefixer) 所使用的 [browserslist](https://github.com/browserslist/browserslist)，目前暂定锚定为 [`defaults`](https://github.com/browserslist/browserslist#full-list) 的基础上添加 `Chrome >= 70` 以适应萌百用户群体；
    - [`install.sh`](install.sh) 检测到当前环境为 [GitHub Codespaces](https://github.com/features/codespaces) 时自动配置最新的 Node.js LTS 和 npm 版本；
- 代码部分：
    - [`src/gadgets`](src/gadgets) 以文件夹形式保存小工具，每一个文件夹都是一个小工具，里面包含以下内容：
        - `definition.json` 保存小工具配置，包括依赖项、所需权限等，以 `_` 开头的键值对是其他配置，如小工具所在的章节等；
        - `.eslintrc` （可选）用以阻止 eslint 在某些文件上进行检查，常见于来自 npm 和指定页面的代码；
        - `*.js` 和 `*.css` 为小工具代码，文件名为萌娘百科上对应页面的页面名；
    - [`src/groups`](src/groups) 以文件夹形式保存用户组级别代码，每一个文件夹都对应一个用户组，里面包含 `*.js` 和 `*.css` 等代码，文件名为萌娘百科上对应页面的页面名；
    - [`src/global`](src/global) 保存全站代码，里面包含 `*.js` 和 `*.css` 等代码，文件名为萌娘百科上对应页面的页面名。

## 自动化流程

- 每天 00:00 UTC（但愿，Github Actions的 cron 延迟真的好高 \_(:з」∠)\_）时会自动触发一次 postCommit CI，这是为了执行 [`scripts/prefetch.js`](scripts/prefetch.js) 以自动更新来自指定页面的代码；
- 每提交一次 commit（包括提交 pull request 和在 pull request 里提交新的 commit），postCommit CI 也会触发，这是为了执行所有任务以确保内容是最新的；
- 每提交一次 commit，会自动触发一次 Linter test，这是为了确保最终合并到萌百的代码不会犯能被检查出来的问题。

## 编译流程

机器人通过以下流程编译代码，然后提交到萌百：

- 执行 `tsc --build --verbose` 以编译 `*.js` 代码；
- 执行 `npx postcss src/**/*.css --no-map --base src/ --use autoprefixer postcss-discard-comments -d dist/ --verbose` 以编译 `*.css` 代码；
- 根据模板生成 `MediaWiki:Gadgets-definition` 页面。

## 参与维护

众人拾柴火焰高，我们欢迎你参与到界面管理工作中来。
### 提出建议、意见

我们欢迎你在[萌娘百科技术实现讨论版](https://zh.moegirl.org.cn/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91_talk:%E8%AE%A8%E8%AE%BA%E7%89%88/%E6%8A%80%E6%9C%AF%E5%AE%9E%E7%8E%B0)提出建议、意见，我们会审慎考虑可行性和成本等因素后作出决定。

### 提交贡献

提交贡献的原因有很多，可能是发现了 typo，可能你写成了一个小工具，不论如何我们都欢迎你来提交贡献。

但首先，最重要的一点是：**务必阅读并遵守 [CONTRIBUTING.md](CONTRIBUTING.md)**，否则你的贡献有可能被拒绝。

其次，由于需要确保（虽然永远也不可能出现的）将小工具迁移到 Gadget 名字空间的情况的兼容性，文件名对应了萌娘百科上对应页面的页面名，从而包含了 `:`，而这导致了本仓库无法在 Windows 上克隆。

所以我们建议你通过以下方式提交贡献：

- 使用 [Linux on Windows with WSL](https://docs.microsoft.com/en-us/windows/wsl/install)；
- 使用 Linux （可以是远程服务器、本地 Docker 容器等）；
- 使用 [GitHub Codespaces](https://github.com/features/codespaces)（对个人用户免费）。

然后，我们建议你使用 [Visual Studio Code](https://code.visualstudio.com/)，本仓库专为 VSCode 配置。我们也建议你搭配以下 VSCode 扩展结合本仓库提供的配置以优化体验：
- [Conventional Commits（约定式提交）](https://www.conventionalcommits.org/)：[Conventional Commits](https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits)  扩展；
- [eslint](https://eslint.org/)：[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) 扩展；
- [stylelint](https://stylelint.io/)：[Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint) 扩展；
- 远程开发：
    - 在 Linux on Windows with WSL 里：[Remote - WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) 扩展；
    - 在运行 Linux 的本地 Docker 容器里：[Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) 扩展；
    - 在运行 Linux 的远程服务器里：[Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh) 扩展和 [Remote - SSH: Editing Configuration Files](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh-edit) 扩展。
