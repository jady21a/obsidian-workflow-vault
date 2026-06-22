##  project
[[4.Projects/III.dashboard/项目总览]]
```dataview
TABLE
  status as "状态",
  priority as "优先级",
  start-date as "开始日期",
  end-date as "预计完成",
  description as "描述"
FROM "4.Projects"
WHERE type = "main-project"
SORT file.name ASC
```

---

## 项目todo
### 重要任务
```dataviewjs
const pages = dv.pages('"4.Projects"') .where(p => p.file.tasks.some(t => !t.completed && t.text.includes("#task/重要任务"))) .sort(p => p.file.mtime, 'desc'); for (let page of pages) { dv.taskList( page.file.tasks.where(t => !t.completed && t.text.includes("#task/重要任务")) ); }
```
---
### 主要任务
```dataviewjs
const pages = dv.pages('"4.Projects"')
    .where(p => p.file.tasks.some(t => !t.completed && !t.text.includes("#task/暂缓任务")))
    .sort(p => p.file.mtime, 'desc');

for (let page of pages) {
    dv.taskList(
        page.file.tasks.where(t => !t.completed && !t.text.includes("#task/暂缓任务"))
    );
}
```


---
### 暂缓任务
```dataview
TASK 
FROM "4.Projects" 
WHERE !completed AND contains(tags, "#task/暂缓任务")
GROUP BY file.link 
```


---

# daily todo
## draft todo
```dataview
TASK 
FROM "5.todo/0_view/draft-todo" 
WHERE !completed 
SORT line DESC
```
## date todo

```dataviewjs
// 标准化任务文本，去除完成日期标记
function normalize(text) {
  return text
    .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/completion::\s*[\d-]+/gi, '')
    .trim();
}

const pages = dv.pages('"5.todo/date"');

// 第一轮：收集所有「至少有一个已完成」的标准化文本
const completedTexts = new Set();
for (const page of pages) {
  for (const task of page.file.tasks) {
    if (task.completed) completedTexts.add(normalize(task.text));
  }
}

// 第二轮：展示未完成任务，去掉已完成的 + 跨文件重复的
const seenTexts = new Set();
for (const page of pages) {
  const tasks = page.file.tasks.filter(t => {
    if (t.completed) return false;
    const key = normalize(t.text);
    if (completedTexts.has(key)) return false;
    if (seenTexts.has(key)) return false;
    seenTexts.add(key);
    return true;
  });
  if (tasks.length > 0) {
    dv.header(3, page.file.link);
    dv.taskList(tasks, false);
  }
}
```

## last



