import { describe, expect, it } from "vitest";
import reconcileDefinitionFiles from "../../generateGadgetsDefinition/reconcileDefinitionFiles.js";

describe("reconcileDefinitionFiles", () => {
    it("目录现状与登记完全一致时原样返回", () => {
        const params = {
            definitionFiles: ["Gadget-Wikiplus.css", "Gadget-Wikiplus.js"],
            files: ["Gadget-Wikiplus.css", "Gadget-Wikiplus.js"],
            gadgetFiles: ["Gadget-Wikiplus.css", "Gadget-Wikiplus.js"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: [],
            unindexedFiles: [],
            definitionFiles: ["Gadget-Wikiplus.css", "Gadget-Wikiplus.js"],
        });
    });

    it("登记条目在全仓库都不存在时列入 unexistFiles 并剔除", () => {
        const params = {
            definitionFiles: ["Gadget-Gone.js"],
            files: [],
            gadgetFiles: ["Gadget-Wikiplus.js"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: ["Gadget-Gone.js"],
            unindexedFiles: [],
            definitionFiles: [],
        });
    });

    it("目录里未登记的文件列入 unindexedFiles 并追加到末尾", () => {
        const params = {
            definitionFiles: ["Gadget-X.js"],
            files: ["Gadget-X.js", "Gadget-X.css"],
            gadgetFiles: ["Gadget-X.js", "Gadget-X.css"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: [],
            unindexedFiles: ["Gadget-X.css"],
            definitionFiles: ["Gadget-X.js", "Gadget-X.css"],
        });
    });

    it("既有条目保持原顺序、未登记文件统一排在后面", () => {
        const params = {
            definitionFiles: ["Gadget-X.css", "Gadget-X.js"],
            files: ["Gadget-X.new.js", "Gadget-X.css", "Gadget-X.js"],
            gadgetFiles: ["Gadget-X.css", "Gadget-X.js", "Gadget-X.new.js"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: [],
            unindexedFiles: ["Gadget-X.new.js"],
            definitionFiles: ["Gadget-X.css", "Gadget-X.js", "Gadget-X.new.js"],
        });
    });

    it("存在性按全仓库 gadgetFiles 判断，其他 gadget 目录的同名文件也算存在", () => {
        const params = {
            definitionFiles: ["Gadget-Other.js"],
            files: ["Gadget-X.js"],
            gadgetFiles: ["Gadget-Other.js", "Gadget-X.js"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: [],
            unindexedFiles: ["Gadget-X.js"],
            definitionFiles: ["Gadget-Other.js", "Gadget-X.js"],
        });
    });

    it("未登记的下划线开头文件列入 unindexedFiles 但不进新列表", () => {
        const params = {
            definitionFiles: ["Gadget-X.js"],
            files: ["Gadget-X.js", "_internal.js"],
            gadgetFiles: ["Gadget-X.js", "_internal.js"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: [],
            unindexedFiles: ["_internal.js"],
            definitionFiles: ["Gadget-X.js"],
        });
    });

    it("仍存在的下划线开头既有条目不进 unexistFiles 但被剔除", () => {
        const params = {
            definitionFiles: ["_private.js", "Gadget-X.js"],
            files: ["_private.js", "Gadget-X.js"],
            gadgetFiles: ["_private.js", "Gadget-X.js"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: [],
            unindexedFiles: [],
            definitionFiles: ["Gadget-X.js"],
        });
    });

    it("jsconfig.json 无论新旧一律剔除", () => {
        const params = {
            definitionFiles: ["Gadget-X.js", "jsconfig.json"],
            files: ["Gadget-X.js", "jsconfig.json"],
            gadgetFiles: ["Gadget-X.js", "jsconfig.json"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: [],
            unindexedFiles: [],
            definitionFiles: ["Gadget-X.js"],
        });
    });

    it("三列表均为空时返回全空结果", () => {
        expect(reconcileDefinitionFiles({ definitionFiles: [], files: [], gadgetFiles: [] })).toEqual({
            unexistFiles: [],
            unindexedFiles: [],
            definitionFiles: [],
        });
    });

    it("混合场景同时产出三类结果", () => {
        const params = {
            definitionFiles: ["Gadget-Gone.js", "Gadget-X.js", "_stale.js"],
            files: ["Gadget-X.js", "Gadget-X.css", "_new.js"],
            gadgetFiles: ["Gadget-X.js", "Gadget-X.css", "_stale.js", "_new.js"],
        };
        expect(reconcileDefinitionFiles(params)).toEqual({
            unexistFiles: ["Gadget-Gone.js"],
            unindexedFiles: ["Gadget-X.css", "_new.js"],
            definitionFiles: ["Gadget-X.js", "Gadget-X.css"],
        });
    });
});
