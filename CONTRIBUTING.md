# Contributing

请务必阅读以下要求，并遵照执行。

## 必须拥有萌娘百科账号

如果你没有萌娘百科账号，我们无法接受你的代码贡献，请[注册](https://zh.moegirl.org.cn/Special:MoeAuth)一个萌娘百科账号。

## 检查邮件映射表

请在第一次提交你的代码贡献前，或每次当你修改了邮箱后，检查[邮件映射表](.mailmap)里关于你的萌娘百科用户名与你的邮箱地址的映射关系是否正确，若不正确，请参考邮件映射表的注释修改之。

## 使用 Conventional Commits（约定式提交）

请使用 [Conventional Commits（约定式提交）](https://www.conventionalcommits.org/)来注明你的各项 commit 的内容，我们建议使用 VSCode 的 [Conventional Commits](https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits) 扩展。

## 新建小工具后检查配置

请在新建小工具后，在小工具文件夹下创建一个 `definition.yaml`，并遵照 VSCode 编辑器指示（如果使用的不是 VSCode，那么请参照[对应的 json schemas](.vscode/json-schemas/gadget-definition.yaml)）。

也不要忘记在 [`src/gadgets/Gadgets-definition-list.yaml`](src/gadgets/Gadgets-definition-list.yaml) 里指定其位置。

## packages/ 目录下的本地构建小工具

部分小工具的源码位于 [`packages/`](packages/) 目录（如 [packages/Navigation_popups](packages/Navigation_popups)），构建产物写入 `src/gadgets/<包名>/` 下的对应文件。对这类小工具：

- 修改请在 `packages/<包名>/` 的源码内进行，**不要手改 `src/gadgets/` 下的产物**；
- 在仓库根目录执行 `npm run package:build` 重新构建产物（postCommit CI 亦会自动构建并在有差异时提交）；
- 在仓库根目录执行 `npm run package:test` 运行该包的构建幂等检查、部署链门禁与单元测试；
- 依赖、lint 与构建配置统一由仓库根目录管理，包内不设独立 package.json；详见各包内的 README。

## 提交问题

我们建议在[萌娘百科技术实现讨论版](https://zh.moegirl.org.cn/%E8%90%8C%E5%A8%98%E7%99%BE%E7%A7%91_talk:%E8%AE%A8%E8%AE%BA%E7%89%88/%E6%8A%80%E6%9C%AF%E5%AE%9E%E7%8E%B0)讨论相关问题，或是提交 Pull Request 以解决问题。当然也可以通过 issue 讨论。

## 自动化相关

如果需要添加自动化生成的内容，可添加到对应自动化工具的目标列表后，工具会自己处理（记得遵循[§ 新建小工具后检查配置](#新建小工具后检查配置)一节）。
