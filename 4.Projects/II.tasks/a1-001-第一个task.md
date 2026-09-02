---
project: a1.第一个项目
sub-project: 子项目-第一个task
type:  sub-project
seq: 001
date: 2026-06-26
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
  .filter(b => b && (b.日期 || b["做了什么/没做的话为什么/想法"]))
  .map(b => [b.日期 ?? "", b.完成度 ?? "", b.心情 ?? "", b["做了什么/没做的话为什么/想法"] ?? ""]);

if (rows.length > 0) {
  dv.table(["日期", "完成度", "心情", "内容"], rows);
}
```


## 任务列表


## 记录

