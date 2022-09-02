# MoegirlPediaInterfaceCodes

萌娘百科界面代码库

[![Linter test](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/Linter%20test.yml/badge.svg)](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/actions/workflows/Linter%20test.yml)

欢迎来到萌娘百科界面代码库，本仓库由[萌娘百科界面管理员](https://zh.moegirl.org.cn/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91:%E7%95%8C%E9%9D%A2%E7%AE%A1%E7%90%86%E5%91%98) [团队](https://zh.moegirl.org.cn/Special:Listusers/interface-admin)维护，旨在以自动化的方式减轻维护界面代码的复杂度。

目前只有萌娘百科的界面管理员拥有本仓库的读写权限，但我们欢迎以方式。

## 仓库架构

- `.github` 文件夹用以保存 GitHub Dependabot 和 GitHub Actions 所需配置文件，其中：
    - `.github/workflows/Linter test.yml` 用以使用 [eslint](https://eslint.org/) 和 [stylelint](https://stylelint.io/) 保存代码测试流程，该流程成功完成时会触发[机器人](https://zh.moegirl.org.cn/User:AnnAngela-dbot) [编译流程](#编译流程)；
    - `.github/workflows/postCommit.yml` 用以保存自动化流程，包含自动配置 Conventional Commits（约定式提交）所需 scope（作用域）信息、自动导入来自 npm 和指定页面的代码和自动补全小工具列表。
- `.vscode/settings.json` 用来保存 Conventional Commits（约定式提交）所需 scope（作用域）信息；
- `scripts` 文件夹用以保存流程所需代码，其中：
    - `scripts/browserify.js` 用来通过 [browserify](https://browserify.org/) 库导入来自 npm 的代码，其目标在 `scripts/browserifyTargets.js` 中定义；
    - `scripts/prefetch.js` 用来导入来自指定页面的代码，其目标在 `scripts/prefetchTargets.js` 中定义；
    - `scripts/conventionalCommitsScopesGenerator.js` 用来自动配置 Conventional Commits（约定式提交）所需 scope（作用域）信息；
    - `scripts/gadgetsDefinitionGenerator.js` 用来自动补全小工具列表，当发现新增小工具时，该代码会自动将对应小工具插入到 `src/gadgets/Gadgets-definition-list.json` 的响应列表的末尾；
- 自动化工具的配置文件：
    - `.eslintrc` 配置 eslint，由于所有 Javascript 代码都需经过编译，故其 `parserOptions.ecmaVersion` 被指定为 `latest` 以便充分利用最新标准；
    - `.stylelintrc.json` 配置 stylelint；
    - `.browserslistrc` 配置 [autoprifixer](https://github.com/postcss/autoprefixer) 所使用的 [browserslist](https://github.com/browserslist/browserslist)，目前暂定锚定为 [`defaults`](https://github.com/browserslist/browserslist#full-list) 的基础上添加 `Chrome >= 70` 以适应萌百用户群体；
    - `install.sh` 检测到当前环境为 [GitHub Codespaces](https://github.com/features/codespaces) 时自动配置最新的 Node.js LTS 和 npm 版本；
- 代码部分：
    - `src/gadgets` 以文件夹形式保存小工具，每一个文件夹都是一个小工具，里面包含以下内容：
        - `definition.json` 保存小工具配置，包括依赖项、所需权限等，以 `_` 开头的是其他配置，如小工具所在的章节等；
        - `.eslintrc` 用以阻止 eslint 在某些文件上进行检查，常见于来自 npm 和指定页面的代码；
        - `*.js` 和 `*.css` 为小工具代码，文件名为萌娘百科上对应页面的页面名；
    - `src/groups` 以文件夹形式保存用户组级别代码，每一个文件夹都对应一个用户组，里面包含 `*.js` 和 `*.css` 等代码，文件名为萌娘百科上对应页面的页面名；
    - `src/global` 保存全站代码，里面包含 `*.js` 和 `*.css` 等代码，文件名为萌娘百科上对应页面的页面名。

## 自动化流程

- 每天 00:00 UTC 时会自动触发一次 postCommit CI，这是为了执行 `scripts/prefetch.js` 以自动更新来自指定页面的代码；
- 每提交一次 commit（包括提交 pull request 和在 pull request 里提交新的 commit），postCommit CI 也会触发，这是为了执行所有任务以确保内容是最新的；
- 每向 master 分支提交一次 commit，会自动触发一次 Linter test，这是为了确保最终合并到萌百的代码不会犯能被检查出来的问题。

## 参与维护

首先，由于需要确保（虽然永远也不可能出现的）将小工具迁移到 Gadget 名字空间的情况的兼容性，文件名对应了萌娘百科上对应页面的页面名，从而包含了 `:`，而这导致了本仓库无法在 Windows 上克隆。

所以我们建议你通过以下方式参与维护：

- 使用 [Linux on Windows with WSL](https://docs.microsoft.com/en-us/windows/wsl/install)；
- 使用 Linux 类系统（可以是远程服务器等）；
- 使用 [GitHub Codespaces](https://github.com/features/codespaces)（对个人用户免费）。

其次，我们建议你使用 [Visual Studio Code](https://code.visualstudio.com/)，本仓库专为 VSCode 配置。我们也建议你搭配以下 VSCode 扩展以优化体验：
- [Conventional Commits（约定式提交）](https://www.conventionalcommits.org/)：[Conventional Commits](https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits)  扩展；
- [eslint](https://eslint.org/)：[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) 扩展；
- [stylelint](https://stylelint.io/)：[Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint) 扩展。

然后，很重要的一点，务必阅读并遵守 [CONTRIBUTING.md](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/blob/master/CONTRIBUTING.md)。