---
tags:
  - meta
---

# 🎯 4.Projects — 项目 · 任务

「长周期项目管理」区。用三层结构管理项目:一级项目 → 子任务 → 总览仪表盘。子任务靠 frontmatter 的 `project` 字段关联到父项目,Dataview 自动把任务汇总进项目页和总览,不用手动维护链接。

**子目录**
- `I.projects/` —— 一级项目,每个项目一篇(`type: main-project`、`tags: project`)
- `II.tasks/` —— 子任务,新建后按 `project` 字段自动显示在对应项目里(`type: sub-project`、`tags: task`)
- `III.dashboard/` —— 项目与任务的总览图

**命名规律**(决定排序与归属)
- 项目:`d2.演示项目` —— 优先级前缀编号 + 项目名
- 子任务:`d2-001-演示task` —— 项目编号 + 序号 + 任务名,frontmatter 里 `project: d2.演示项目` 指回父项目

**总览入口**
- [[4.Projects/III.dashboard/项目总览|项目总览]] —— 所有项目的状态 / 优先级 / 进度
- [[4.Projects/III.dashboard/task总览|任务总览]] —— 任务明细、心情与完成度统计

**新建方式**
- 用 Templater 调模板生成:[[project- template|项目模板]]、[[10.Template/projects/task - template|task模板]](字段已对接 Dataview)。

**这里现在有**
- [[4.Projects/I.projects/d2.演示项目|d2.演示项目]] —— 一级项目示例
- [[4.Projects/II.tasks/d2-001-演示task|d2-001-演示task]] —— 子任务示例
