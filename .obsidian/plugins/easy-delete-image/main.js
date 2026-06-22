const { Plugin, MarkdownView } = require("obsidian");

module.exports = class ClickDeleteImage extends Plugin {
  selectedImg = null;

  async onload() {
    const onClick = (evt) => {
      let img = null;
      const t = evt.target;
      if (t instanceof HTMLImageElement) {
        img = t;
      } else if (t instanceof HTMLElement) {
        const wrap = t.closest(".internal-embed, .image-embed");
        if (wrap) img = wrap.querySelector("img");
      }

      if (img && img.closest(".markdown-source-view, .markdown-preview-view, .markdown-reading-view")) {
        if (this.selectedImg && this.selectedImg !== img) {
          this.selectedImg.style.outline = "";
        }
        this.selectedImg = img;
        img.style.outline = "2px solid var(--interactive-accent)";
        img.style.outlineOffset = "2px";
      } else {
        if (this.selectedImg) {
          this.selectedImg.style.outline = "";
          this.selectedImg = null;
        }
      }
    };

    const onKey = (evt) => {
      if (!this.selectedImg) return;
      if (evt.key !== "Delete" && evt.key !== "Backspace") return;

      const img = this.selectedImg;
      const src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";
      let filename = "";
      try {
        filename = decodeURIComponent(src.split("/").pop().split("?")[0]);
      } catch (e) {
        filename = src.split("/").pop().split("?")[0];
      }

      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) return;

      const editor = view.editor;
      const content = editor.getValue();
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const candidates = [filename, alt].filter(Boolean);
      let matchIdx = -1;
      let matchLen = 0;
      for (const name of candidates) {
        const e = esc(name);
        const regex = new RegExp(
          `!\\[\\[[^\\]]*${e}[^\\]]*\\]\\]\\n?|!\\[[^\\]]*\\]\\([^)]*${e}[^)]*\\)\\n?`
        );
        const m = regex.exec(content);
        if (m) {
          matchIdx = m.index;
          matchLen = m[0].length;
          break;
        }
      }

      if (matchIdx < 0) return;

      const from = editor.offsetToPos(matchIdx);
      const to = editor.offsetToPos(matchIdx + matchLen);
      editor.replaceRange("", from, to);
      this.selectedImg.style.outline = "";
      this.selectedImg = null;
      evt.preventDefault();
      evt.stopPropagation();
    };

    this.registerDomEvent(window, "click", onClick, { capture: true });
    this.registerDomEvent(window, "keydown", onKey, { capture: true });
  }

  onunload() {
    if (this.selectedImg) this.selectedImg.style.outline = "";
  }
};
