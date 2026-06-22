<%*
const projectName = await tp.system.prompt("请输入项目名称");
// 取消或留空则删除刚创建的文档
if (!projectName) {
  await app.vault.trash(tp.config.target_file, true);
  return;
}
const safeProjectName = projectName.replace(/[\\\\/:*?\"<>|]/g, "-").trim();
await tp.file.move("4.Projects/I.projects/" + safeProjectName);
-%>
---
project: <% projectName %>
type: main-project
priority: high
status:
  - 进行中
tags:
  - project
description: 简介描述
start-date: <% tp.date.now("YYYY-MM-DD") %>
end-date:
---

# <% projectName %>
## task执行表
```dataview
TABLE
  completion as "完成度",
  mood as "心情",
  date as "日期",
  详情 as "详情"
FROM "4.Projects/II.tasks"
WHERE project = "<% projectName %>"
SORT seq DESC
```

## 任务

### 未完成任务
```dataview
TASK
FROM "4.Projects/I.projects/<% projectName %>"
WHERE !completed
```
### 主要任务

### 暂缓任务


## 统计

### 进度统计
```dataviewjs
const tasks = dv.pages('"4.Projects/II.tasks"')
  .where(p => p.project === "<% projectName %>");

const total = tasks.length;
const avgCompletion = tasks.array()
  .reduce((sum, t) => sum + (t.completion || 0), 0) / total;

dv.paragraph(`
**总任务数**: ${total}  
**平均完成度**: ${avgCompletion.toFixed(1)}/10  
**本周任务**: ${tasks.where(t => {
  const weekAgo = dv.date('now').minus({days: 7});
  return t.date >= weekAgo;
}).length}
`);
```
