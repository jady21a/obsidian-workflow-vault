

# 📚 这是一个「打开即用」的 Obsidian 模板库

这个仓库复刻了我 **all-in** 主仓库的目录结构，去掉了私人内容，每个功能区约保留 **1 篇示例 + 配套模板**。它能帮你省去从零搭目录、配路径的麻烦，降低 Obsidian 初期的上手门槛，也可以作为参考，照着在自己的笔记库里搭一套。

> [!tip] 第一次打开
> 1. 安装并启用社区插件（见下方「依赖插件」）。
> 2.  [[homepage]] 是主页仪表盘。
> 3. 把每个区里的「示例」笔记替换成你自己的内容即可。

## 🗂 目录结构总览

| 目录              | 用途                          | 说明文档                         |
| --------------- | --------------------------- | ---------------------------- |
| `1.Rough`       | 速记 / Inbox，未整理的灵感           | [[1.Rough/README\|说明]]       |
| `2.Read`        | 读书观影笔记（书 / 电影 / 剧集 / 数据库视图） | [[2.Read/README\|说明]]        |
| `3.learn`       | 学习笔记（语言 / AI / 讨论）          | [[3.learn/README\|说明]]       |
| `4.Projects`    | 长周期项目管理（项目 / 任务 / 仪表盘）      | [[4.Projects/README\|说明]]    |
| `5.todo`        | 每日 / 每周待办与复盘                | [[5.todo/README\|说明]]        |
| `6.personal`    | 个人日记 / 想法 等私域笔记             | [[6.personal/README\|说明]]    |
| `9.备忘`          | 不需要完全记住的速查笔记区               | [[9.备忘/README\|说明]]          |
| `10.Template`   | 所有 Templater 模板             | [[10.Template/README\|说明]]   |
| `11.Excalidraw` | 手绘 / 白板图                    | [[11.Excalidraw/README\|说明]] |
| `12.skills`     | Claude / AI 工作流技能包          | [[12.skills/README\|说明]]     |

注: 7、8是个人工作学习笔记区,这里留空以便使用时根据自己的需求新建文件夹

## 🔌 依赖插件（开箱即用所需）

本仓库已内置大部分我经常使用的插件（位于 `.obsidian/plugins/`）

**核心必需**（缺了对应页面会失效）

- **Dataview** — 表格 / 列表 / 统计视图，全库 160+ 处依赖（项目仪表盘、书架、观影库、统计）
- **Templater** — 模板引擎，新建项目 / 任务自动套模板（`10.Template/` 下的 `project- template`、`task - template` 等）
- **Tasks** — 任务查询（首页「今日任务」等）
- **Periodic Notes** + **Calendar** — 每日 / 每周笔记
- **Homepage** — 把 [[homepage]] 设为启动主页
- **Iconize (icon-folder)** — 目录的彩色图标
- **Contribution Graph** — 首页「热力图」。⚠️ 本库对其打了一个小补丁：点击文件列表区域之外的地方时，自动关闭已展开的文件列表（基于原版 v0.10.0，Apache-2.0，改动详见插件目录 `MODIFICATIONS.md`）

**书籍电影插件**（书 / 影录入工作流，用到再装并各自配置 API）
- **Book Search** — 搜书名自动抓书籍信息(首页「New Book」)
- **Media DB** — 搜片名自动抓影视信息(首页「New Movie」，需填 OMDb Key)
- **豆瓣** — 豆瓣条目抓取(book / movie / teleplay)
- **Bases**（核心插件，默认开启）— `2.Read/bases书架.base` 卡片视图

> 三者模板已就绪（`10.Template/book&movie/`），不装也能手动填写字段, 但是一键导入更快。


**其他插件**（体验增强 / 个人偏好，不影响示例运行，在「设置 → 第三方插件」中按需启用）

- **Excalidraw** / **Mindmap NextGen** — 手绘白板 / 思维导图
- **Quiet Outline** — 大纲增强
- **Recent Files** / **Remember Cursor Position** — 最近文件 / 记住上次光标位置
- **Mousewheel Image Zoom** — 滚轮缩放图片
- **QuickAdd** / **Shortcuts Extender** — 快捷捕获 / 快捷键扩展
- **Open in New Tab** — 链接默认在新标签打开
- **Title Serial Number** — 标题自动编号
- **Clear Unused Images** — 清理无引用的图片

**自研插件**（按需启用）

- **Learning System**（`learning-system`）— 间隔复习相关的插件，已上架社区插件,但是后面想增加mindmap功能,目前仍在持续完善中
- **Paste Optimizer**（`jz-paste-optimizer`）— 优化粘贴：自动去除列表多余空行、清理从 Apple Books 复制来的版权信息
- **Inline Task Edit Icon**（`inline-task-edit`）— 在任务行尾显示可点的 📅,点击弹出日期选择器,直接修改该行的 `[scheduled:: …]` 日期写回(不用打开完整编辑窗)。默认只在 `5.todo/scheduled/` 下生效
- **Easy Delete Image**（`easy-delete-image`）— 删图更省事:在笔记里单击一张图片(图片会高亮),再按 `Delete` / `Backspace`,就会把对应的图片引用整行从正文里删掉,省去手动在文本里找那一行选中删。可与上面的 **Clear Unused Images** 搭配:先删引用,再清理无引用的图片文件


## 🎨 主题与 CSS 片段

主题：**Minimal**。

已启用的代码片段（`.obsidian/snippets/`）：
- `homepage-columns` — [[homepage]] 仪表盘的多栏分块布局样式（homepage核心样式）
- `MCL Multi Column` — 正文多分栏排版（homepage布局样式）
- `MCL Gallery Cards` — 画廊卡片样式（homepage布局样式）
- `compact-tasks` — 压缩 Tasks 任务列表的行距，列表更紧凑
- `dataview-compact` — 压缩 Dataview 表格的行距
-  `bases-cards-tweak`—Bases 卡片字体 / 行距微调

> 另有 `MCL Wide Views`（宽视图）片段已内置但默认未启用，需要时在「设置 → 外观 → CSS 代码片段」里开启。

## ⌨️ 快捷键

常用自定义键：
- `Cmd+T` 从模板新建
- `Cmd+'` 新建项目
- `Cmd+,` 新建任务
- `cmd+.`——插入try
- `ption+↑`   打开今天日记
完整列表见 [[9.备忘/示例-快捷键]]。


## 结语

这套仓库是我日常在用的笔记系统的「示例版」，不是标准答案，而是一个**能直接跑起来的起点**。

- **别怕改**：目录名、模板字段、Dataview 查询都可以按自己的习惯调整。把每个区的「示例」换成你真正的内容，它才算真正属于你。
- **从小处开始**：不必一次用全所有功能。先用顺手一两个区（比如homepage + 待办），其余的等需要时再启用。
- **遇到问题时**：大多数「页面问题 / 报错」都是插件没启用或路径不对，可以先用obsidian接入ai自查,非常方便; 通过ai也解决不了的话再到评论区提问, 这样解决问题的效率更高。

如果它帮你省下了从零搭建的时间，或你折腾出了更好的用法，欢迎来评论区交流——你的反馈会让下一版更好~

祝你用得顺手 ✨





---

##  内置插件致谢与许可

本仓库为「开箱即用」, 内置了下列**第三方社区插件**（位于 `.obsidian/plugins/`）。它们均归各自作者所有，按其各自的开源协议随本库分发；版权与所有权归原作者。感谢这些插件作者的工作 🙏 如果你长期使用某个插件，欢迎前往其页面 Star / 赞助原作者。

| 插件                                                                 | 作者                                             | 页面                                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------ |
| Templater                                                          | SilentVoid                                     | https://obsidian.md/plugins?id=templater-obsidian                  |
| Dataview                                                           | blacksmithgu                                   | https://obsidian.md/plugins?id=dataview                            |
| Tasks                                                              | Clare Macrae、Ilyas Landikov（原作 Martin Schenck） | https://obsidian.md/plugins?id=obsidian-tasks-plugin               |
| Calendar                                                           | Liam Cain                                      | https://obsidian.md/plugins?id=calendar                            |
| Periodic Notes                                                     | Liam Cain                                      | https://obsidian.md/plugins?id=periodic-notes                      |
| Homepage                                                           | novov                                          | https://obsidian.md/plugins?id=homepage                            |
| Iconize                                                            | Florian Woelki                                 | https://obsidian.md/plugins?id=obsidian-icon-folder                |
| Contribution Graph | vran | https://obsidian.md/plugins?id=contribution-graph |
| Echarts                                                            | windily-cloud & Cuman                          | https://obsidian.md/plugins?id=obsidian-echarts                    |
| Book Search                                                        | anpigon                                        | https://obsidian.md/plugins?id=obsidian-book-search-plugin         |
| Media DB                                                           | Moritz Jung                                    | https://obsidian.md/plugins?id=obsidian-media-db-plugin            |
| Douban（豆瓣）                                                         | Wanxp                                          | https://obsidian.md/plugins?id=obsidian-douban-plugin              |
| Excalidraw                                                         | Zsolt Viczian                                  | https://obsidian.md/plugins?id=obsidian-excalidraw-plugin          |
| Mindmap NextGen                                                    | —                                              | https://obsidian.md/plugins?id=obsidian-mindmap-nextgen            |
| Quiet Outline                                                      | the_tree                                       | https://obsidian.md/plugins?id=obsidian-quiet-outline              |
| Mousewheel Image Zoom                                              | Nico Jeske                                     | https://obsidian.md/plugins?id=mousewheel-image-zoom               |
| QuickAdd                                                           | Christian B. B. Houmann                        | https://obsidian.md/plugins?id=quickadd                            |
| Shortcuts Extender                                                 | —                                              | https://obsidian.md/plugins?id=shortcuts-extender                  |
| Open in New Tab                                                    | Patrick Lee                                    | https://obsidian.md/plugins?id=open-in-new-tab                     |
| Title Serial Number                                                | Domenic                                        | https://obsidian.md/plugins?id=obsidian-title-serial-number-plugin |
| Clear Unused Images                                                | Ozan                                           | https://obsidian.md/plugins?id=oz-clear-unused-images              |
| Recent Files                                                       | Tony Grosinger                                 | https://obsidian.md/plugins?id=recent-files-obsidian               |
| Remember Cursor Position                                           | Dmitry Savosh                                  | https://obsidian.md/plugins?id=remember-cursor-position            |
| Better Word Count                                                  | Luke Leppan                                    | https://obsidian.md/plugins?id=better-word-count                   |

> 各插件的更新请到 Obsidian「设置 → 第三方插件」自行升级；本库内置版本只为开箱即用，不代表最新。





