---
cssclasses:
  - homepage-dashboard
---

## 快捷操作
```dataviewjs
const actions = [
  { label: "今日笔记", shortLabel: "今日笔记", command: "periodic-notes:open-daily-note", variant: "accent", row: "top" },
  { label: "本周总结", shortLabel: "本周总结", command: "periodic-notes:open-weekly-note", variant: "muted", row: "top" },
  { label: "新建 Task", shortLabel: "Task", command: "templater-obsidian:create-10.Template/projects/task - template.md", variant: "dark", row: "bottom" },
  { label: "新建 Project", shortLabel: "Project", command: "templater-obsidian:create-10.Template/projects/project- template.md", variant: "dark", row: "bottom" },
  { label: "New Book", shortLabel: "Book", command: "obsidian-book-search-plugin:open-book-search-modal", variant: "dark", row: "bottom" },
  { label: "New Movie", shortLabel: "Movie", command: "obsidian-media-db-plugin:open-media-db-search-modal-with-movie", variant: "dark", row: "bottom" },
];

// 命令不存在时(改了模板名/路径、插件没开)给出提示，而不是点了没反应
const runCommand = (action) => {
  const ok = app.commands.executeCommandById(action.command);
  if (!ok) {
    new Notice(`命令未找到，请检查：${action.command}`);
  }
};

const wrap = dv.el("div", "", { cls: "hp-quick-launch" });
const topRow = wrap.createEl("div", { cls: "hp-quick-actions hp-quick-actions-top" });
const bottomRow = wrap.createEl("div", { cls: "hp-quick-links" });

for (const action of actions) {
  if (action.row === "top") {
    const button = topRow.createEl("button", {
      text: action.label,
      cls: `hp-quick-action hp-quick-action-${action.variant}`,
    });
    button.type = "button";
    button.setAttr("aria-label", action.label);
    button.addEventListener("click", () => runCommand(action));
  } else {
    const link = bottomRow.createEl("button", {
      text: action.shortLabel,
      cls: "hp-quick-link",
    });
    link.type = "button";
    link.setAttr("aria-label", action.label);
    link.addEventListener("click", () => runCommand(action));
  }
}
```

## 快速导航
> [!multi-column]
>
>> [!tip]+  阅读
>>  ### #mcl/list-card
>> - [[bases图书馆.base]]
>> - [[bases影视库.base]]
>> - [[书架]]
>> - [[观影库]]
>
>> [!summary]+ 项目
>>  ### #mcl/list-card
>> - [[d2.演示项目]]
>
>> [!warning]+  备忘
>>  ### #mcl/list-card
>> - [[示例-快捷键]]
>
>> [!todo]+  Todo
>>  ### #mcl/list-card
>> - [[todo list|todo list]]
>> - [[回顾本周]]
>> - [[schedule-task]]
>> - [[0-fleeting]]


## 常用项目
> [!multi-column]
>
>> [!info]+ Projects
>>  ### #mcl/list-card
>> - [[项目总览]]
>> - [[task总览]]
>
>> [!note]+ 最近笔记
>> ```dataview
>> LIST FROM "1.Rough" OR "2.Read" OR "3.learn" OR "4.Projects" OR "5.todo" OR "12.skills" OR "JC-open"
>> SORT file.ctime DESC
>> LIMIT 5
>> ```
>
>> [!todo]+  今日任务
>> ```tasks
>> not done
>> scheduled on today
>> path includes 5.todo
>> description regex matches /\S/
>> ```

## 常用模板
> [!multi-column]
>
>> [!summary]+ 项目模板
>>  ### #mcl/list-card
>> - [[project- template|project模板]]
>> - [[10.Template/projects/task - template|task模板]]
>> - [[10.Template/projects/try|try模板]]
>
>> [!todo]+ 计划模板
>>  ### #mcl/list-card
>> - [[10.Template/todo/daily|Daily]]
>> - [[10.Template/todo/weekly|Weekly]]
>
>> [!tip]+ 书影模板
>>  ### #mcl/list-card
>> - [[book-ch]]
>> - [[book-en]]
>> - [[movie-ch|影视记录]]
>
>> [!info]+ 记录模板
>>  ### #mcl/list-card
>> - [[阅读记录模板]]



## 热力图

```dataviewjs
// 每天改了几个文件。个数和下方字数热力图点开的明细同源：读索引里的 summary
// (.obsidian/wordheat-index.json，由 .obsidian/scripts/wordheat_index.py 生成，字数热力图那块负责在后台更新)。
// 没有索引(手机端、没装 python3)时退回按文件最后修改时间来数：每个文件只算在它最后一次被改的那天。
const base = app.vault.adapter.basePath;
const idxPath = base + "/.obsidian/wordheat-index.json";
const LABEL = { typed: "自己", ai: "AI", other: "插件等" };

function readSummary() {
    try { return JSON.parse(require("fs").readFileSync(idxPath, "utf8")).summary || null; } catch (e) { return null; }
}

function buildData(summary) {
    const days = {};
    if (summary) {
        for (const [date, g] of Object.entries(summary)) {
            const seen = new Map();
            for (const k of ["typed", "ai", "other"]) {
                for (const p of Object.keys(g[k] || {})) if (!seen.has(p)) seen.set(p, LABEL[k]);
            }
            days[date] = [...seen].map(([p, tag]) => ({ p, tag }));
        }
    } else {
        for (const f of app.vault.getMarkdownFiles()) {
            const d = window.moment(f.stat.mtime).format("YYYY-MM-DD");
            (days[d] = days[d] || []).push({ p: f.path, tag: "" });
        }
    }
    return Object.entries(days).map(([date, files]) => ({
        date,
        value: files.length,
        summary: `${date} · 改了 ${files.length} 个文件`,
        items: files.map(({ p, tag }) => ({
            label: (tag ? `[${tag}] ` : "") + p.replace(/\.md$/, ""),
            value: 1,
            link: { href: p, className: "internal-link" },
        })),
    }));
}

const box = this.container.createEl("div");
let lastMtime = 0;
function render() {
    let mtime = 0;
    try { mtime = require("fs").statSync(idxPath).mtimeMs; } catch (e) {}
    lastMtime = mtime;
    box.empty();
    window.renderContributionGraph(box, {
        title: "文件数热力图",
        data: buildData(readSummary()),
        graphType: "default",
        days: 365,
        startOfWeek: "0",
        showCellRuleIndicators: true,
        enableMainContainerShadow: true,
        titleStyle: { textAlign: "left", fontSize: "17px", fontWeight: "normal" },
        cellStyle: { minWidth: "12px", minHeight: "12px" },
        cellStyleRules: [
            { color: "#9be9a8", min: 1, max: 2 },
            { color: "#40c463", min: 2, max: 5 },
            { color: "#30a14e", min: 5, max: 10 },
            { color: "#216e39", min: 10, max: 999 },
        ],
    });
}
render();
// 索引在后台更新，过一会儿有新版就重画一次
setTimeout(() => {
    try { if (require("fs").statSync(idxPath).mtimeMs !== lastMtime) render(); } catch (e) {}
}, 20000);
```


```dataviewjs
// === Contribution Graph 版字数热力图 ===
// 数据来自 Better Word Count 插件生成的 .obsidian/vault-stats.json（已随本演示库分发）。
// 万一该文件缺失（如被手动删除），静默跳过本块，避免首页弹出报错。
// 悬停看当天字数和改了几个文件；点格子在图下方列出改了哪些文件，分「自己改的」「AI 改的」。
let jsonObject;
try {
    jsonObject = JSON.parse(await app.vault.adapter.read(".obsidian/vault-stats.json"));
} catch (e) {
    return;
}
const history = jsonObject.history || {};

function getYMD(n) {
    const d = new Date(Date.now() + 864e5 * n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const year = new Date().getFullYear();
const box = this.container.createEl("div");

function renderGraph() {
    box.empty();
    const data = Object.entries(history).map(([date, v]) => {
        const value = (v && v.words) || 0;
        const n = groups(date).count;
        return { date, value, summary: `${date} · ${value} 字` + (n ? ` · 改了 ${n} 个文件` : "") };
    });
    window.renderContributionGraph(box, {
        title: "字数热力图",
        data,
        graphType: "default",
        fromDate: `${year}-01-01`,
        toDate: `${year}-12-31`,
        startOfWeek: "0",
        showCellRuleIndicators: true,
        enableMainContainerShadow: true,
        titleStyle: { textAlign: "left", fontSize: "17px", fontWeight: "normal" },
        cellStyle: { minWidth: "12px", minHeight: "12px" },
        cellStyleRules: [
            { color: "#deebf7", min: 1, max: 61 },      // 1–60 字
            { color: "#c6dbef", min: 61, max: 151 },    // 61–150
            { color: "#9ecae1", min: 151, max: 351 },   // 151–350
            { color: "#6baed6", min: 351, max: 651 },   // 351–650
            { color: "#3182bd", min: 651, max: 1501 },  // 651–1500
            { color: "#08519c", min: 1501, max: 9999999 }, // 1500+
        ],
        onCellClick: (cell) => showFiles(cell.date, cell.value),
    });
    // 插件自带的点击活动框只能列一组，用下方自己的面板代替
    const act = box.querySelector(".activity-container");
    if (act) act.style.display = "none";
}

// ---- 点格子看当天改了哪些文件(自己改的 / AI 改的 / 插件等改的) ----
// 明细来自 .obsidian/scripts/wordheat_index.py 生成的索引(说明见脚本开头)。
// 打开主页时先读旧索引，后台增量更新完再换成新的。需要电脑端 + python3。
const panel = this.container.createEl("div");
panel.style.maxWidth = "800px";
panel.style.margin = "4px auto 0";
panel.style.fontSize = "var(--font-ui-small)";

let idx = { days: {} };
let fs = null;
try { fs = require("fs"); } catch (e) { /* 手机端没有 */ }
const base = app.vault.adapter.basePath;
const idxPath = base + "/.obsidian/wordheat-index.json";
function loadIdx() {
    try { idx = JSON.parse(fs.readFileSync(idxPath, "utf8")); } catch (e) { /* 还没建 */ }
}
function pythonCmd() {
    if (process.platform === "darwin") {
        // 没装命令行工具时 /usr/bin/python3 是个会弹安装框的空壳，先认 Homebrew 的
        for (const p of ["/opt/homebrew/bin/python3", "/usr/local/bin/python3"]) if (fs.existsSync(p)) return p;
        const clt = fs.existsSync("/Library/Developer/CommandLineTools/usr/bin/python3") || fs.existsSync("/Applications/Xcode.app");
        return clt ? "/usr/bin/python3" : null;
    }
    return process.platform === "win32" ? "python" : "python3";
}
if (fs) {
    loadIdx();
    const py = pythonCmd();
    if (py) {
        try {
            require("child_process").execFile(py, [base + "/.obsidian/scripts/wordheat_index.py"],
                { timeout: 300000 }, () => { loadIdx(); renderGraph(); });
        } catch (e) {}
    }
}

// 某天的三组明细：[{path, add, del}]，分组由索引脚本的 summary 算好(两张热力图共用)
function groups(date) {
    const s = (idx.summary || {})[date];
    const toList = (o) => Object.entries(o || {}).map(([path, v]) =>
        v ? { path, add: v[0], del: v[1] } : { path, add: null, del: 0 });
    const byBig = (a, b) => ((b.add || 0) + b.del) - ((a.add || 0) + a.del);
    const typed = toList(s && s.typed).sort(byBig);
    const ai = toList(s && s.ai).sort(byBig);
    const other = toList(s && s.other).sort(byBig);
    const count = new Set([...typed, ...ai, ...other].map((f) => f.path)).size;
    return { typed, ai, other, estimated: !!(s && s.estimated), count };
}

// 组标题:新增字数 + 占当天新增的比例 + 文件数。只算新增不算删除;
// 估算日的「自己改的」混进了模板/插件生成的内容,比例前标「约」。
function fileList(title, list, share, note) {
    const added = list.reduce((s, f) => s + Math.max(0, f.add || 0), 0);
    const parts = [title, `${added.toLocaleString()} 字`];
    if (share !== null) parts.push(share);
    const tail = [`${list.length} 个文件`, ...(note ? [note] : [])].join("，");
    const h = panel.createEl("div", { text: `${parts.join(" · ")}(${tail})` });
    h.style.marginTop = "6px";
    h.style.color = "var(--text-muted)";
    if (!list.length) return;
    const ul = panel.createEl("ul");
    ul.style.margin = "2px 0";
    for (const f of list) {
        const li = ul.createEl("li");
        const a = li.createEl("a", { text: f.path.replace(/\.md$/, ""), cls: "internal-link", href: f.path });
        a.addEventListener("click", (e) => {
            e.preventDefault();
            app.workspace.openLinkText(f.path, "", true);
        });
        if (f.add === null) continue; // 今天还没提交的，不知道字数
        const delta = f.add >= 0 ? `+${f.add}` : `${f.add}`;
        const span = li.createEl("span", { text: `  ${delta}` + (f.del ? ` / -${f.del}` : "") });
        span.style.color = "var(--text-muted)";
    }
}

function showFiles(date, words) {
    panel.empty();
    if (!fs) {
        panel.createEl("div", { text: "此设备读不到明细索引(手机端)" });
        return;
    }
    const g = groups(date);
    const head = panel.createEl("div", { text: `${date} · ${words} 字` + (g.count ? ` · 改了 ${g.count} 个文件` : "") });
    head.style.fontWeight = "600";
    if (!g.count) {
        const gitDays = Object.keys(idx.days || {}).filter((d) => idx.days[d].git).sort();
        const firstGit = gitDays[0];
        const why = !firstGit ? "明细索引还没建好，稍后再点"
            : date < firstGit ? `git 从 ${firstGit} 才开始记录，这天之前没有改动明细`
            : "这天没有 git 提交，当天的改动并进了后面某次提交里，分不出是哪天改的";
        panel.createEl("div", { text: why, cls: "setting-item-description" });
        return;
    }
    const addedOf = (l) => l.reduce((s, f) => s + Math.max(0, f.add || 0), 0);
    const mine = addedOf(g.typed), theirs = addedOf(g.ai), rest = addedOf(g.other), total = mine + theirs + rest;
    const share = (n) => total ? `${g.estimated ? "约 " : ""}${Math.round((n * 100) / total)}%` : null;
    fileList("自己改的", g.typed, share(mine), g.estimated ? "按 git 估算，含插件/模板生成" : "");
    fileList("AI 改的", g.ai, share(theirs), "");
    if (g.other.length) fileList("插件/模板/同步改的", g.other, share(rest), "");
}

renderGraph();
```

