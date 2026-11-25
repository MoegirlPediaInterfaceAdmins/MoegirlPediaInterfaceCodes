<template>
    <div
        class="cal-dock"
        :class="{
            'is-collapsed': !isOpen,
            'is-busy': isBusy,
            'is-bottom-left': prefs.position === 'bottom-left',
        }"
    >
        <div
            v-if="isOpen"
            class="cal-resize-handle"
            :title="uls('上下拖拽调整高度', '上下拖曳調整高度')"
            @mousedown="startResize"
        ></div>

        <div class="cal-head">
            <a class="cal-head-title" href="#" @click.prevent="toggleOpen">
                <span>Cat-a-lot</span>
                <span v-if="hasSelection" class="cal-chip cal-chip--notice">{{ selectedTitles.length }}</span>
            </a>
            <div class="cal-head-actions">
                <cdx-button
                    v-if="isOpen"
                    size="small"
                    weight="quiet"
                    type="button"
                    :disabled="isBusy"
                    :aria-label="uls('设置', '設置')"
                    :title="uls('设置', '設置')"
                    @click="openSettings"
                >
                    <cdx-icon :icon="icons.settings" size="small"></cdx-icon>
                </cdx-button>
                <cdx-button
                    size="small"
                    weight="quiet"
                    type="button"
                    :aria-label="isOpen ? uls('收起', '收起') : uls('展开', '展開')"
                    :title="isOpen ? uls('收起', '收起') : uls('展开', '展開')"
                    @click="toggleOpen"
                >
                    <cdx-icon :icon="isOpen ? icons.collapse : icons.expand" size="small"></cdx-icon>
                </cdx-button>
            </div>
        </div>

        <div v-if="isOpen" class="cal-body" :style="{ '--cal-panel-height': `${panelHeight}px` }">
            <div class="cal-status-row">
                <cdx-info-chip :status="permissionChipStatus">{{ permissionChipText }}</cdx-info-chip>
                <span class="cal-hint">{{ selectedCountText }}</span>
            </div>

            <div v-if="isRunning" class="cal-progress">
                <div class="cal-status-row">
                    <span class="cal-hint">
                        {{ uls("正在编辑：", "正在編輯：") }}{{ currentEditingTitle }}
                    </span>
                    <span class="cal-hint">{{ progressDone }} / {{ progressTotal }}</span>
                </div>
                <cdx-progress-bar aria-label="Cat-a-lot progress"></cdx-progress-bar>
                <cdx-button size="small" action="destructive" type="button" @click="stopBatch">
                    {{ uls("停止", "停止") }}
                </cdx-button>
            </div>

            <div class="cal-cat-list">
                <div v-if="isLoadingCats" class="cal-hint cal-list-hint">
                    {{ uls("正在加载分类…", "正在加載分類…") }}
                </div>
                <table v-else class="cal-cat-table">
                    <tbody>
                        <tr v-if="catNotFound">
                            <td colspan="3" class="cal-hint cal-list-hint cal-list-hint--strong">
                                {{ uls(
                                    "找不到分类（分类页尚未创建，仍可直接对其执行操作）。",
                                    "找不到分類（分類頁尚未建立，仍可直接對其執行操作）。",
                                ) }}
                            </td>
                        </tr>
                        <tr v-for="parent in parentCats" :key="`p-${parent}`">
                            <td class="cal-cat-dir">↑</td>
                            <td class="cal-cat-name">
                                <a href="#" @click.prevent="navigateCategory(parent)">{{ parent }}</a>
                            </td>
                            <td class="cal-cat-acts">
                                <a
                                    v-if="pageCategoryName"
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('copy', parent)"
                                >{{ uls("复制", "複製") }}</a>
                                <a
                                    v-if="pageCategoryName"
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('move', parent)"
                                >{{ uls("移动", "移動") }}</a>
                                <a
                                    v-else
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('add', parent)"
                                >{{ uls("增加", "增加") }}</a>
                            </td>
                        </tr>
                        <tr v-if="currentCategory">
                            <td class="cal-cat-dir">•</td>
                            <td class="cal-cat-name cal-cat-name--current">{{ currentCategory }}</td>
                            <td class="cal-cat-acts">
                                <a
                                    v-if="pageCategoryName && canActOnCurrentCategory"
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('copy', currentCategory)"
                                >{{ uls("复制", "複製") }}</a>
                                <a
                                    v-if="pageCategoryName && canActOnCurrentCategory"
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('move', currentCategory)"
                                >{{ uls("移动", "移動") }}</a>
                                <a
                                    v-if="!pageCategoryName"
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('add', currentCategory)"
                                >{{ uls("增加", "增加") }}</a>
                            </td>
                        </tr>
                        <tr v-for="sub in subCats" :key="`s-${sub}`">
                            <td class="cal-cat-dir">↓</td>
                            <td class="cal-cat-name">
                                <a href="#" @click.prevent="navigateCategory(sub)">{{ sub }}</a>
                            </td>
                            <td class="cal-cat-acts">
                                <a
                                    v-if="pageCategoryName"
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('copy', sub)"
                                >{{ uls("复制", "複製") }}</a>
                                <a
                                    v-if="pageCategoryName"
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('move', sub)"
                                >{{ uls("移动", "移動") }}</a>
                                <a
                                    v-else
                                    class="cal-cat-act-link"
                                    href="#"
                                    @click.prevent="runBatch('add', sub)"
                                >{{ uls("增加", "增加") }}</a>
                            </td>
                        </tr>
                        <tr v-if="!canFetchCategoryMembers && currentCategory">
                            <td colspan="3" class="cal-hint cal-list-hint">
                                {{ uls(
                                    "提示：仅维护姬及以上用户组可拉取子分类列表，您仍可直接输入目标分类进行操作。",
                                    "提示：僅維護姬及以上用戶組可拉取子分類列表，您仍可直接輸入目標分類進行操作。",
                                ) }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="cal-input-wrap">
                <ul v-if="suggestions.length > 0" class="cal-suggestions">
                    <li
                        v-for="(item, idx) in suggestions"
                        :key="item"
                        :class="{ 'is-active': idx === activeSuggestionIdx }"
                        @mousedown.prevent="pickSuggestion(item)"
                    >{{ item }}</li>
                </ul>
                <cdx-text-input
                    v-model="searchInput"
                    :disabled="isBusy"
                    :placeholder="uls('输入分类名称并按回车查找…', '輸入分類名稱並按 Enter 查找…')"
                    @input="onSearchInput"
                    @keydown="onSearchKeydown"
                ></cdx-text-input>
            </div>

            <div class="cal-quick-actions">
                <div class="cal-selections">
                    <span>{{ uls("选择：", "選擇：") }}</span>
                    <a href="#" @click.prevent="toggleAllSelected(true)">{{ uls("全部", "全部") }}</a>
                    <span>•</span>
                    <a href="#" @click.prevent="toggleAllSelected(false)">{{ uls("无", "無") }}</a>
                </div>
                <div class="cal-quick-buttons">
                    <cdx-button
                        v-if="cleanInputCategory && pageCategoryName"
                        size="small"
                        type="button"
                        :disabled="isBusy"
                        @click="runBatch('copy', cleanInputCategory)"
                    >{{ uls("复制到输入分类", "複製到輸入分類") }}</cdx-button>
                    <cdx-button
                        v-if="cleanInputCategory && pageCategoryName"
                        size="small"
                        action="progressive"
                        type="button"
                        :disabled="isBusy"
                        @click="runBatch('move', cleanInputCategory)"
                    >{{ uls("移动到输入分类", "移動到輸入分類") }}</cdx-button>
                    <cdx-button
                        v-if="cleanInputCategory && !pageCategoryName"
                        size="small"
                        action="progressive"
                        type="button"
                        :disabled="isBusy"
                        @click="runBatch('add', cleanInputCategory)"
                    >{{ uls("加入输入分类", "加入輸入分類") }}</cdx-button>
                    <cdx-button
                        v-if="pageCategoryName"
                        size="small"
                        action="destructive"
                        type="button"
                        :disabled="isBusy"
                        @click="runBatch('remove')"
                    >{{ uls("从此分类移除", "從此分類移除") }}</cdx-button>
                </div>
            </div>
        </div>

        <cdx-dialog
            :open="prefsOpen"
            :title="uls('Cat-a-lot 设置', 'Cat-a-lot 設置')"
            :use-close-button="true"
            :primary-action="prefsPrimaryAction"
            :default-action="prefsDefaultAction"
            @primary="savePrefsFromDialog"
            @default="closePrefsDialog"
            @update:open="onPrefsDialogOpenChange"
        >
            <div class="cal-prefs-grid">
                <cdx-field>
                    <template #label>{{ uls("监视列表选项", "監視列表選項") }}</template>
                    <cdx-select v-model:selected="prefsDraft.watchlist" :menu-items="watchlistOptions"></cdx-select>
                </cdx-field>
                <cdx-checkbox v-model="prefsDraft.minor">
                    {{ uls("将编辑标记为小修改", "將編輯標記為小修改") }}
                </cdx-checkbox>
                <cdx-checkbox v-model="prefsDraft.editpages">
                    {{ uls("允许对非文件页面与子分类进行分类操作", "允許對非文件頁面與子分類進行分類操作") }}
                </cdx-checkbox>
                <cdx-field>
                    <template #label>{{ uls("最多显示的子分类数量", "最多顯示的子分類數量") }}</template>
                    <cdx-text-input v-model="subcatCountInput" input-type="number"></cdx-text-input>
                </cdx-field>
            </div>
        </cdx-dialog>

        <cdx-dialog
            :open="confirmDialog.open"
            :title="confirmDialog.title"
            :use-close-button="true"
            :primary-action="confirmPrimaryAction"
            :default-action="confirmDefaultAction"
            @primary="resolveConfirmDialog('primary')"
            @default="resolveConfirmDialog('cancel')"
            @update:open="onConfirmDialogOpenChange"
        >
            <p class="cal-dialog-text">{{ confirmDialog.message }}</p>
            <template v-if="confirmDialog.extraLabel" #footer>
                <div class="cal-dialog-actions">
                    <cdx-button
                        action="progressive"
                        weight="primary"
                        type="button"
                        @click="resolveConfirmDialog('extra')"
                    >{{ confirmDialog.extraLabel }}</cdx-button>
                    <cdx-button
                        action="default"
                        weight="normal"
                        type="button"
                        @click="resolveConfirmDialog('primary')"
                    >{{ confirmPrimaryAction.label }}</cdx-button>
                    <cdx-button
                        action="default"
                        weight="normal"
                        type="button"
                        @click="resolveConfirmDialog('cancel')"
                    >{{ uls("取消", "取消") }}</cdx-button>
                </div>
            </template>
        </cdx-dialog>

        <cdx-dialog
            :open="resultDialog.open"
            :title="resultDialog.title"
            :use-close-button="true"
            :primary-action="resultPrimaryAction"
            @primary="onResultDialogOpenChange(false)"
            @update:open="onResultDialogOpenChange"
        >
            <p class="cal-dialog-text">{{ resultDialog.summaryText }}</p>
            <div v-if="resultDialog.skippedAlready.length">
                <strong>{{ uls("已在目标分类中：", "已在目標分類中：") }}</strong>
                <ul class="cal-result-list">
                    <li v-for="title in resultDialog.skippedAlready" :key="title">{{ title }}</li>
                </ul>
            </div>
            <div v-if="resultDialog.skippedNotFound.length">
                <strong>{{ uls("未找到原分类：", "未找到原分類：") }}</strong>
                <ul class="cal-result-list">
                    <li v-for="title in resultDialog.skippedNotFound" :key="title">{{ title }}</li>
                </ul>
            </div>
            <div v-if="resultDialog.skippedServer.length">
                <strong>{{ uls("编辑失败：", "編輯失敗：") }}</strong>
                <ul class="cal-result-list">
                    <li v-for="title in resultDialog.skippedServer" :key="title">{{ title }}</li>
                </ul>
            </div>
        </cdx-dialog>
    </div>
</template>

<script lang="ts">
import { component } from "./app.ts";

export default component;
</script>
