---
tags:
  - meta
---

# 🧩 10.Template — Templater 模板

全库所有 **Templater** 模板都放这里。其他区(项目、任务、读书、每日笔记)新建笔记时,字段和结构都来自这里的模板,改模板就能统一改所有新建笔记的样子。

> [!important] 前置设置(换库后必看)
> 这些模板靠 **Templater 插件**生效,装好后确认:
> 设置 → Templater → **Template folder location** 指向 `10.Template`。本库已配好,但如果你把目录搬到别处,要同步改这里,否则所有模板/快捷键都不生效。

**子目录**
- `book&movie/` —— 书籍 / 影视笔记模板(配合 Book Search、Media DB、豆瓣插件)
- `projects/` —— 项目 / 任务模板
- `todo/` —— 每日 / 每周笔记模板

**模板清单**

| 模板 | 用途 | 怎么触发 |
|---|---|---|
| `projects/project- template` | 一级项目(`type: main-project`,字段对接 Dataview) | 在 `4.Projects/I.projects/` 新建笔记**自动套用**;或首页「新建 Project」按钮 / `Cmd+'` |
| `projects/task - template` | 子任务(`type: sub-project`,`project` 字段指回父项目) | 在 `4.Projects/II.tasks/` 新建笔记**自动套用**;或首页「新建 Task」按钮 / `Cmd+,` |
| `projects/try` | 常用小片段,插入到正文 | `Cmd+.` 插入 |
| `todo/daily` | 每日笔记(今日目标 / scheduled / 复盘 / 记录) | Periodic Notes / Calendar 点日期生成;或 `Option+↑` 打开今天 |
| `todo/weekly` | 每周笔记骨架 | Periodic Notes 周笔记 |
| `book&movie/book-ch`、`book-en` | 书籍笔记(中 / 英) | Book Search 搜书名时套用 |
| `book&movie/movie-ch`、`movie-en` | 影视笔记(中 / 英) | Media DB 搜片名时套用 |
| `book&movie/阅读记录模板` | 阅读记录条目 | 手动调用 |

> 通用:任意位置按 `Cmd+T`(从模板新建)可手动选用上面任一模板。

**两种触发方式的区别**
- **文件夹模板(自动)**:已配置 `4.Projects/I.projects` → `project- template`、`4.Projects/II.tasks` → `task - template`。在这两个目录里新建笔记会**自动套对应模板**,不用手动选(设置 → Templater → Folder Templates 可查看 / 修改)。
- **手动 / 插件触发**:其余模板靠 `Cmd+T`、首页按钮或 Book Search / Media DB 等插件调用。

**自定义提示**
- 想改所有新建笔记的字段或结构,直接改这里的模板即可,已存在的旧笔记不受影响。
- 模板里若用到 `<% tp.* %>` 语法,是 Templater 的变量(日期、标题等),改动前可先看 [Templater 文档](https://silentvoid13.github.io/Templater/)。
