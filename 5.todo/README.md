---
tags:
  - meta
---

# ✅ 5.todo — 每日任务 · 周复盘

「执行与回顾」区。每天用日记式的笔记记录目标与复盘,带日期的任务集中到 `scheduled/` 由 Dataview 自动聚合到当天;每周再用「周复盘」skill 把一周的记录 + git 时间线放在一起做结构化复盘。和 `4.Projects`(管项目)的区别:那边是「项目维度」,这里是「时间维度」。

**子目录**
- `0_view/` —— 总览视图(看板式入口,不手写内容,全靠 Dataview/Tasks 聚合)
- `date/` —— 每日任务笔记,一天一篇(`date` 字段 + 今日目标/复盘/记录)
- `scheduled/` —— 存放带 `[scheduled:: 日期]` 的任务,每日笔记的「scheduled」区块会按当天日期自动把到期任务拉出来
- `prompt/` —— 「周复盘」skill 用的提示词(见下)
- `weeks/` —— 周复盘产物,一周一篇(`YYYY-WXX.md`,如 `2026-W21`),由 skill 生成并写入 `until` 字段供下周衔接

**两个入口页**
- [[5.todo/0_view/todo list|todo list]] —— 项目与任务总览看板(重要/主要/暂缓任务分组)
- [[5.todo/0_view/回顾本周|回顾本周]] —— 本周已完成 + 本周按标签分组的修改清单

**周复盘的三份提示词**(`prompt/`,被 [[12.skills/周复盘/SKILL|周复盘 skill]] 调用)
- [[5.todo/prompt/周复盘流程|周复盘流程]] —— 唯一权威流程(单一真相),skill 只指向它、不复述
- [[5.todo/prompt/周复盘prompt-稳定|周复盘prompt-稳定]] —— 评估框架 / 输出结构 / 风格 / UPDATE 块格式
- [[5.todo/prompt/周复盘prompt-成长|周复盘prompt-成长]] —— 盲区清单 + 历史模式日志(背景上下文,由脚本维护)

**新建方式**
- 每日笔记:用 Periodic Notes / Calendar 点日期自动生成,套模板 [[10.Template/todo/daily|daily 模板]](字段已对接 Dataview)。
- 周复盘:对 Claude 说「周复盘」/「复盘 5.14-5.21」即触发 skill,自动读 `date/` + git、生成到 `weeks/`。
- scheduled 任务:直接写在 `scheduled/` 的文件里,加 `[scheduled:: 2026-05-31]`,到那天会出现在当天笔记。

**这里现在有**
- [[5.todo/date/2026-06-21|2026-06-21]] —— 每日笔记示例(今日目标 / scheduled / 复盘结构)
- [[5.todo/scheduled/schedule-task|schedule-task]] —— scheduled 任务示例
- [[5.todo/0_view/todo list|todo list]]、[[5.todo/0_view/回顾本周|回顾本周]] —— 两个总览视图
