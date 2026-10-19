# HotCat 重写语义说明

本文件登记重写版与 legacy 单文件（`src/gadgets/HotCat/Gadget-HotCat.js` @ `79559658`）的**有意偏差**、**保留的怪癖**，以及为通过 TS 严集而关闭的 lint 规则理由。新增偏差必须在此追加条目（描述 / legacy 行为 / 重写版行为 / 用户可见性 / 论据）。

## A. eslint 规则豁免（仅 `packages/HotCat/src/**`）

| 规则 | 理由 |
| --- | --- |
| `@typescript-eslint/prefer-nullish-coalescing` | legacy 的 `a \|\| b` 承担「空串 / 0 也回落」的语义（如 `window.hotcat_list_size \|\| HC.listSize`），换成 `??` 会改变结果。 |
| `@typescript-eslint/prefer-for-of` | 循环体内有 `splice` 与按下标回写（分类列表、建议列表），`for-of` 会在删除元素时错位。 |
| `@typescript-eslint/prefer-optional-chain` | `x && x.y` 是 legacy 的守卫形态，且大量位于赋值右侧（`a = x && x.y`），转 `?.` 会把 `false`/`""` 变成 `undefined`。 |
| `@typescript-eslint/prefer-string-starts-ends-with` | `indexOf(...) === 0`、`substr(0, 1) !== "\n"` 是 legacy 的显式边界判断，语义与 `startsWith` 相同但改写在 3200 行移植里没有收益。 |
| `no-redeclare` | TypeScript 函数重载被 core 规则误判为重复声明。 |
| `@typescript-eslint/no-this-alias` | legacy 在回调里统一用 `const self = this` 捕获 `this`（DOM0 处理器、`setTimeout`）。 |
| `@typescript-eslint/no-deprecated` | `keyCode` / `onkeypress` 是 IME 组合输入判定的既有实现（`IME = 229`），换成 `key` 会改变判定。 |

测试目录（`packages/HotCat/tests/**`）额外关闭 `no-non-null-assertion`（断言后收窄）与 `unbound-method`（`vi.spyOn(obj, "method")`）。

## B. 有意偏差

1. **`closeForm` 的 `this.inputExists`**
   - legacy：`edit.currentExists = this.inputExists;` —— `closeForm` 是普通函数声明，严格模式下 `this` 为 `undefined`，只要存在 `CHANGE_PENDING` 编辑器就抛 `TypeError`。
   - 重写版：`edit.currentExists = edit.inputExists;`。
   - 用户可见性：仅影响「上传页提交前收起表单」这条路径，legacy 在本仓库已知场景下是崩溃的。
   - 论据：明显笔误，按语义修正；不影响普通条目页。

2. **`setState` 的 `parent.insertBefore`**
   - legacy：`parent.insertBefore(make(" | ", true), before);` —— `parent` 解析为浏览器全局 `window.parent`，多行状态（`i + 1 < cats.length`）时抛 `TypeError`。
   - 重写版：`catLine.insertBefore(...)`。
   - 用户可见性：仅上传页恢复「上次分类状态」且状态为多行时；legacy 会崩溃。
   - 论据：同上，按上下文明显意图修正。

3. **删除 IE-only 回退**
   - `evtKill` 的 `cancelBubble` 分支保留（以 `LegacyEvent` 可选成员建模），其余删除：
     - `CategoryEditor` 的 `createTextRange` / `document.selection` 选区回退 → 统一用 `setSelectionRange`；
     - `displayList` 里「无 `document.evaluate` 的 WebKit 用 `innerWidth/Height`」→ 删除；
     - `position()` 的 `offsetTop/offsetLeft` 累加回退 → 统一用 `getBoundingClientRect`；
     - `$.trim` / `$.grep` / `$.inArray` → 原生 `trim` / `filter` / `indexOf`。
   - 用户可见性：无。MW 1.43 支持的浏览器（Chrome/Edge/Firefox/Safari 现代版本）全部具备上述 API。

4. **`LoadTrigger` 删除**
   - legacy：`new LoadTrigger(2)`，两次 `loaded()` 都发生在 `register` 之前，`needed` 恒为 0，`register(really_run)` 同步执行。
   - 重写版：`run()` 直接调用 `reallyRun()`。
   - 用户可见性：无（等价）。

5. **`isOnPage` 删除**
   - legacy 中定义后从未被调用（死代码），重写版不保留。

6. **空值处显式抛错**
   - `findCategoryJson` 里 `mw.Title.newFromText` 返回 null 时显式 `throw new TypeError`（legacy 在下一行 `getPrefixedText` 抛 `TypeError`）；
   - `performChanges` 在 `state.commitForm` 未建立时显式抛错（legacy 读 `commitForm.wpEditToken` 抛 `TypeError`）。
   - 用户可见性：无（两者都是不可达状态，错误类型一致）。

7. **配置值归一化**
   - `initialize` 对 `window.hotcat_*` / `JSconfig.keys` 的值做 `Boolean` / `Number` / 「仅接受字符串」归一（`toBool` / `toText`）。
   - legacy 直接把原值赋给 HC；对非预期类型（对象、数组）的配置，重写版更严格（回落默认值）。
   - 用户可见性：只在用户脚本传入异常类型时有差异；正常布尔/数字/字符串配置行为一致。

8. **`changeCategoryJson` 去掉未使用的 `_is_hidden` 参数**（legacy 该分支不读它）。

9. **`CommitForm` 具名控件建模**
   - `wpDiff` / `wpSave` 建模为可选，与 legacy 的 `if (action)` 守卫一致（隐藏表单里本来就没有 `wpSave`，该分支恒为空操作）。

## C. 保留的 legacy 怪癖（勿修）

- `if (this.lastInput.indexOf(queryKey))`：`indexOf` 返回 0 时为假值，实际语义是「不以 queryKey 开头才 return」；改写成 `startsWith` 会反转行为。
- `changeCategoryWikitext` 删除分类后可能留下一个换行（`text\n[[Category:Foo]]\n` → `text\n`）。
- `setState` 把 `分类|索引` 拆开后把不带 `|` 的索引传给 `CategoryEditor`，构造函数按「长度 > 1 才去掉首字符」处理，导致单字符索引丢失。
- `changes === 1` 时使用 `result.summary`（完整文案），`changes > 1` 才用 `-`/`+`/`±` 短摘要；短摘要用的是 canonical 命名空间（`[[Category:…]]`）而不是本地化的 `[[分类:…]]`。
- `uncat_regexp` 只替换一次（`String.replace` 无 `g` 之外的额外处理），且 `uncat_removed` 在中文下是空串，摘要会出现一个空项。
- `showSuggestions` 的 `this.lastQuery` 缩短判断：只有新查询是旧查询前缀且更短时才丢弃。

## D. 验证记录

- `node .cache/hotcat-differential/differential.mjs`（脚本不入库）：**1406/1406 项一致**（定向语料 506 项 + 伪随机语料 900 项）。
- `node packages/HotCat/scripts/build.js --check-idempotent`：通过（96,557 bytes）。
- `node packages/HotCat/scripts/terser-check.js`：acorn es2020 解析通过；tsc es2020 emit 103,808 bytes → terser 66,674 bytes（输出丢弃）。
- `npx vitest run --root packages/HotCat --coverage`：158 个用例通过；语句 77.30% / 分支 62.01%。
