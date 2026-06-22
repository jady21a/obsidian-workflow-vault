---
project: d2.演示项目
sub-project: 子项目-演示task
type: sub-project
seq: 1
date: 2026-05-14
completion:
mood:
status:
  - 进行中
tags:
  - task
详情:
check:
try:
- 日期: 2026-05-14
  完成度: 5
  心情: b
  做了什么/没做的话为什么/想法: 分心看视频了
- 日期: 2026-05-14
  完成度: 10
  心情: a
  做了什么/没做的话为什么/想法: 完成了
---


> [!note] 这是一个子任务示例
> 它靠 frontmatter 的 `project` 字段自动归到所属项目；`try` 记录每次尝试的过程。

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


> [!tip] 👉 轮到你
> 给你自己的项目加一个真实任务，用 `cmd+.` 记一条 try——任务的过程就开始留痕了。

