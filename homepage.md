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

```contributionGraph
title: 文件数热力图
graphType: default
dateRangeValue: 1
dateRangeType: LATEST_YEAR
startOfWeek: "0"
showCellRuleIndicators: true
titleStyle:
  textAlign: left
  fontSize: 17px
  fontWeight: normal
dataSource:
  type: PAGE
  value: ""
  dateField:
    type: FILE_MTIME
  filters: []
fillTheScreen: false
enableMainContainerShadow: true
cellStyleRules:
  - id: default_b
    color: "#9be9a8"
    min: 1
    max: 2
  - id: default_c
    color: "#40c463"
    min: 2
    max: 5
  - id: default_d
    color: "#30a14e"
    min: 5
    max: 10
  - id: default_e
    color: "#216e39"
    min: 10
    max: 999
cellStyle:
  minWidth: 12px
  minHeight: 12px

```


```dataviewjs
// === Contribution Graph 版字数热力图（试看；不好看删掉本块即可回退）===
const jsonString = await app.vault.adapter.read(".obsidian/vault-stats.json");
const history = JSON.parse(jsonString).history;
const data = Object.entries(history).map(([date, v]) => ({
    date,
    value: (v && v.words) || 0,
}));

const year = new Date().getFullYear();
const box = this.container.createEl("div");

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
});
```

