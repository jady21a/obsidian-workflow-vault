<%*
// 1. 输入类型
const type = await tp.system.prompt("task分类", "");
// 取消则删除刚创建的文档
if (type === null) {
  await app.vault.trash(tp.config.target_file, true);
  return;
}

// 自动匹配同名 project
let matchedProject = "";
const projectFiles = app.vault.getFiles()
  .filter(f => f.path.startsWith("4.Projects/I.projects/"));

for (const f of projectFiles) {
  const meta = app.metadataCache.getFileCache(f)?.frontmatter;
  if (meta?.project?.startsWith(type)) {
    matchedProject = f.basename;
    break;
  }
}

// 2. 扫描 Projects/ 计算当前 type 的最大序号
const existing = app.vault.getFiles()
  .filter(f => f.path.startsWith("4.Projects/II.tasks") && f.name.startsWith(type + "-"));

let maxNum = 0;
for (const f of existing) {
  const m = f.name.match(new RegExp(`^${type}-(\\d+)-`));
  if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
}
const seq = String(maxNum + 1).padStart(3, "0");

// 3. 输入短标题
const shortTitle = await tp.system.prompt("标题 (short-title)");
// 取消则删除刚创建的文档
if (shortTitle === null) {
  await app.vault.trash(tp.config.target_file, true);
  return;
}

// 4. 组合文件名并移动
const filename = `${type}-${seq}-${shortTitle}`;
await tp.file.move("4.Projects/II.tasks/" + filename);
-%>
---
project: <% matchedProject %>
sub-project: 子项目-<% shortTitle %>
type:  sub-project
seq: <% seq %>
date: <% tp.date.now("YYYY-MM-DD") %>
completion: 
mood: 
status:
  - 进行中
tags:
  - task
详情:
check:
try:
---


## try

```dataviewjs
const rows = (dv.current().try || [])
  .filter(b => b && b["做了什么/没做的话为什么/想法"]?.trim())
  .map(b => [b.日期, b.完成度, b.心情, b["做了什么/没做的话为什么/想法"]]);

if (rows.length > 0) {
  dv.table(["日期", "完成度", "心情", "内容"], rows);
}
```


## 任务列表


## 记录

