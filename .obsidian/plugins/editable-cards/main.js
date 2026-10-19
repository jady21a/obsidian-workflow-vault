var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => EditableCardsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE = "editable-cards";
var EditableCardsView = class extends import_obsidian.BasesView {
  constructor(controller, containerEl) {
    super(controller);
    this.type = VIEW_TYPE;
    this.root = containerEl;
  }
  onDataUpdated() {
    this.render();
  }
  onunload() {
    var _a;
    (_a = this.root) == null ? void 0 : _a.empty();
  }
  render() {
    var _a, _b, _c, _d;
    const el = this.root;
    el.empty();
    el.addClass("ec-root");
    const order = this.config.getOrder();
    const coverProp = this.config.getAsPropertyId("image");
    const groups = (_b = (_a = this.data) == null ? void 0 : _a.groupedData) != null ? _b : [];
    let total = 0;
    for (const group of groups) {
      if (group.hasKey()) {
        el.createDiv({
          cls: "ec-group-header",
          text: (_d = (_c = group.key) == null ? void 0 : _c.toString()) != null ? _d : ""
        });
      }
      const grid = el.createDiv({ cls: "ec-grid" });
      for (const entry of group.entries) {
        this.renderCard(grid, entry, order, coverProp);
        total++;
      }
    }
    if (total === 0) {
      el.createDiv({ cls: "ec-empty", text: "\u6CA1\u6709\u5339\u914D\u7684\u6761\u76EE" });
    }
  }
  renderCard(grid, entry, order, coverProp) {
    var _a, _b;
    const file = entry.file;
    const card = grid.createDiv({ cls: "ec-card" });
    if (coverProp) {
      const src = this.resolveImage(entry, coverProp, file);
      if (src) {
        const img = card.createEl("img", { cls: "ec-cover", attr: { src } });
        img.addEventListener("click", () => this.openFile(file));
      }
    }
    const titleText = (_b = (_a = entry.getValue("file.name")) == null ? void 0 : _a.toString()) != null ? _b : file.basename;
    const title = card.createEl("div", { cls: "ec-title", text: titleText });
    title.addEventListener("click", () => this.openFile(file));
    const fields = card.createDiv({ cls: "ec-fields" });
    for (const propId of order) {
      if (propId === "file.name" || propId === coverProp) continue;
      const row = fields.createDiv({ cls: "ec-row" });
      row.createEl("span", {
        cls: "ec-label",
        text: this.config.getDisplayName(propId)
      });
      const raw = this.displayValue(entry, propId);
      if (propId.startsWith("note.")) {
        const key = propId.slice("note.".length);
        const input = row.createEl("input", {
          cls: "ec-input",
          attr: { value: raw, spellcheck: "false" }
        });
        const commit = async () => {
          if (input.value === raw) return;
          await this.writeBack(file, key, input.value);
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
          } else if (e.key === "Escape") {
            input.value = raw;
            input.blur();
          }
        });
      } else {
        row.createEl("span", { cls: "ec-readonly", text: raw });
      }
    }
  }
  /** 取属性显示值;空值(NullValue.toString() === "null")显示为空 */
  displayValue(entry, propId) {
    const v = entry.getValue(propId);
    if (v == null) return "";
    const s = v.toString();
    return s === "null" ? "" : s;
  }
  /** 写回 frontmatter,保留列表 / 数字类型,避免把 list 属性压成字符串 */
  async writeBack(file, key, value) {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const cur = fm[key];
      const trimmed = value.trim();
      if (Array.isArray(cur)) {
        fm[key] = trimmed === "" ? [] : trimmed.split(",").map((s) => s.trim());
      } else if (typeof cur === "number" && trimmed !== "" && !isNaN(Number(trimmed))) {
        fm[key] = Number(trimmed);
      } else {
        fm[key] = value;
      }
    });
  }
  /** 解析封面属性到可显示的资源 URL */
  resolveImage(entry, coverProp, file) {
    var _a, _b, _c;
    let raw = (_b = (_a = entry.getValue(coverProp)) == null ? void 0 : _a.toString()) != null ? _b : "";
    if (!raw) return null;
    const m = raw.match(/^!?\[\[([^\]|#]+)/);
    if (m) raw = m[1];
    if (/^https?:\/\//.test(raw)) return raw;
    const dest = (_c = this.app.metadataCache.getFirstLinkpathDest(raw, file.path)) != null ? _c : this.app.vault.getAbstractFileByPath(raw);
    if (dest instanceof import_obsidian.TFile) return this.app.vault.getResourcePath(dest);
    return null;
  }
  /** 已在某个标签打开则跳过去,否则在新标签打开 */
  openFile(file) {
    const existing = this.findLeafWithFile(file);
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      this.app.workspace.setActiveLeaf(existing, { focus: true });
      return;
    }
    this.app.workspace.getLeaf("tab").openFile(file);
  }
  findLeafWithFile(file) {
    let found = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      var _a;
      if (found) return;
      const viewFile = (_a = leaf.view) == null ? void 0 : _a.file;
      if (viewFile instanceof import_obsidian.TFile && viewFile.path === file.path) {
        found = leaf;
      }
    });
    return found;
  }
};
var EditableCardsPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerBasesView(VIEW_TYPE, {
      name: "\u53EF\u7F16\u8F91\u5361\u7247",
      icon: "layout-grid",
      factory: (controller, containerEl) => new EditableCardsView(controller, containerEl)
    });
  }
};
