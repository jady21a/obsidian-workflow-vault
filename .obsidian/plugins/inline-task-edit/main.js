"use strict";

const { Plugin, MarkdownView } = require("obsidian");
const { ViewPlugin, Decoration, WidgetType } = require("@codemirror/view");
const { RangeSetBuilder } = require("@codemirror/state");

// ===== 配置 =====
// 只在这个路径前缀下的文件显示图标。设为 "" 可对全库生效。
const SCOPE_PREFIX = "5.todo/scheduled/";
// 点击行为: "date" = 弹日期选择器只改 scheduled 日期; "modal" = 打开 Tasks 完整编辑窗
const MODE = "date";
// 要编辑的 dataview 字段名(对应 [scheduled:: YYYY-MM-DD])
const DATE_FIELD = "scheduled";

// 匹配任务行: 缩进 + (-|*|+) + [任意单字符状态] + 空格
const TASK_RE = /^\s*[-*+] \[.\]\s/;
const TASKS_EDIT_COMMAND = "obsidian-tasks-plugin:edit-task";
const ICON = MODE === "date" ? "📅" : "📝";
const LABEL = MODE === "date" ? "编辑日期" : "编辑任务";

// 把一个 CM EditorView 映射回它所属的 MarkdownView(从而拿到 file / editor)
function findMarkdownView(app, cmView) {
  let found = null;
  app.workspace.iterateAllLeaves((leaf) => {
    const v = leaf.view;
    if (v instanceof MarkdownView && v.editor && v.editor.cm === cmView) {
      found = v;
    }
  });
  return found;
}

// 在某一行写入/替换 [field:: YYYY-MM-DD]
function setDateOnLine(view, linePos, value) {
  const line = view.state.doc.lineAt(linePos);
  const re = new RegExp("\\[" + DATE_FIELD + "::\\s*\\d{4}-\\d{2}-\\d{2}\\s*\\]");
  let next;
  if (re.test(line.text)) {
    next = line.text.replace(re, `[${DATE_FIELD}:: ${value}]`);
  } else {
    // 行尾追加(去掉行尾空白后加一个空格)
    next = line.text.replace(/\s*$/, "") + ` [${DATE_FIELD}:: ${value}]`;
  }
  if (next !== line.text) {
    view.dispatch({ changes: { from: line.from, to: line.to, insert: next } });
  }
}

// 弹出原生日期选择器,选完写回该行
function openDatePicker(view, iconEl) {
  const pos = view.posAtDOM(iconEl);
  const line = view.state.doc.lineAt(pos);
  const m = line.text.match(
    new RegExp("\\[" + DATE_FIELD + "::\\s*(\\d{4}-\\d{2}-\\d{2})\\s*\\]")
  );

  const input = document.createElement("input");
  input.type = "date";
  input.value = m ? m[1] : "";
  // 贴近图标但基本不可见
  const rect = iconEl.getBoundingClientRect();
  Object.assign(input.style, {
    position: "fixed",
    left: rect.left + "px",
    top: rect.bottom + "px",
    width: "1px",
    height: "1px",
    opacity: "0",
    border: "none",
    padding: "0",
    zIndex: "9999",
  });
  document.body.appendChild(input);

  let done = false;
  const cleanup = () => {
    if (input.parentElement) input.parentElement.removeChild(input);
  };
  input.addEventListener("change", () => {
    done = true;
    if (input.value) setDateOnLine(view, pos, input.value);
    cleanup();
  });
  input.addEventListener("blur", () => {
    // 给 change 一点时间先触发
    setTimeout(() => { if (!done) cleanup(); }, 150);
  });

  input.focus();
  if (typeof input.showPicker === "function") {
    try { input.showPicker(); } catch (_) { input.click(); }
  } else {
    input.click();
  }
}

class EditIconWidget extends WidgetType {
  constructor(app, lineNumber) {
    super();
    this.app = app;
    this.lineNumber = lineNumber; // 1-based(CM 行号)
  }

  eq(other) {
    return other.lineNumber === this.lineNumber;
  }

  toDOM(view) {
    const a = document.createElement("a");
    a.className = "inline-task-edit-icon";
    a.textContent = ICON;
    a.setAttribute("aria-label", LABEL);
    // 防止点击时编辑器抢焦点 / 移动光标
    a.addEventListener("mousedown", (e) => e.preventDefault());
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (MODE === "date") {
        openDatePicker(view, a);
        return;
      }
      const mdView = findMarkdownView(this.app, view)
        || this.app.workspace.getActiveViewOfType(MarkdownView);
      if (mdView && mdView.editor) {
        mdView.editor.setCursor({ line: this.lineNumber - 1, ch: 0 });
      }
      this.app.commands.executeCommandById(TASKS_EDIT_COMMAND);
    });
    return a;
  }

  ignoreEvent() {
    return false; // 让 click 事件传到我们的处理器
  }
}

function buildDecorations(app, view) {
  const builder = new RangeSetBuilder();
  const file = findMarkdownView(app, view)?.file;
  if (!file || (SCOPE_PREFIX && !file.path.startsWith(SCOPE_PREFIX))) {
    return builder.finish();
  }
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      if (TASK_RE.test(line.text)) {
        builder.add(
          line.to,
          line.to,
          Decoration.widget({
            widget: new EditIconWidget(app, line.number),
            side: 1,
          })
        );
      }
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

function makeEditorExtension(app) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = buildDecorations(app, view);
      }
      update(u) {
        if (u.docChanged || u.viewportChanged || u.selectionSet) {
          this.decorations = buildDecorations(app, u.view);
        }
      }
    },
    { decorations: (v) => v.decorations }
  );
}

class InlineTaskEditPlugin extends Plugin {
  async onload() {
    this.registerEditorExtension(makeEditorExtension(this.app));
  }
}

module.exports = InlineTaskEditPlugin;
