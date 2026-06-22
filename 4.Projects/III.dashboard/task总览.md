# 任务明细与统计


```dataviewjs
// ===== 公共 helper(本文件内只定义一次)=====
const MOOD = {
  a: { score: 4, emoji: "😊", label: "非常好" },
  b: { score: 3, emoji: "🙂", label: "良好" },
  c: { score: 2, emoji: "😐", label: "一般" },
  d: { score: 1, emoji: "😔", label: "不佳" },
};
const moodKey = (m) => { m = Array.isArray(m) ? m[0] : m; return m ? String(m).toLowerCase() : null; };
const moodLabel = (m) => { const k = moodKey(m); return k && MOOD[k] ? `${MOOD[k].emoji} ${k.toUpperCase()}` : "未知"; };
const ms = (d) => {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  if (typeof d.toMillis === "function") return d.toMillis(); // luxon DateTime
  if (d instanceof Date) return d.getTime();
  const x = dv.date(String(d));
  return x ? x.toMillis() : 0;
};

// 把一个 page 的 try[] 展开成记录数组;try 为空时回退页面字段(唯一一处提取逻辑)
function records(page) {
  const valid = (page.try || []).filter((b) => b != null);
  if (valid.length) {
    return valid.map((b) => ({
      page, project: page.project, sub: page["sub-project"],
      date: b.日期, completion: b.完成度, mood: b.心情,
      content: b["做了什么/没做的话为什么/想法"],
    }));
  }
  return [{
    page, project: page.project, sub: page["sub-project"],
    date: page.date, completion: page.completion, mood: page.mood, content: page.详情,
  }];
}
// 每个 task 的"最新一条"
const latest = (page) => records(page).sort((a, b) => ms(a.date) - ms(b.date)).at(-1);

// ===================== ① task 详情 =====================
dv.header(2, "task 详情");

const detailPages = dv.pages('"4.Projects/II.tasks"')
  .where((p) => p.project && (p.try?.length || p.date || p.completion || p.mood || p.详情));

const groups = detailPages.map((page) => {
  const recs = records(page).sort((a, b) => ms(a.date) - ms(b.date)); // 组内按日期升序
  const rows = recs.map((r, i) => [
    i === 0 ? r.page.file.link : "",
    i === 0 ? (r.project ? dv.fileLink(r.project) : "无") : "",
    r.date, r.completion, r.mood, r.content,
  ]);
  const latestMs = recs.length ? ms(recs[recs.length - 1].date) : 0;
  return { latestMs, rows };
}).array();

groups.sort((a, b) => b.latestMs - a.latestMs); // 组间按最新日期降序
dv.table(["task", "项目", "日期", "完成度", "心情", "内容"], groups.flatMap((g) => g.rows));

// ===================== ② 总体统计 =====================
dv.header(2, "总体统计");

const statPages = dv.pages('"4.Projects/II.tasks"').where((p) => p.project);
const allRecs = statPages.flatMap(records).array();
const lasts = statPages.map((p) => {
  const r = latest(p);
  return { project: p.project, completion: r?.completion || 0 };
}).array();

const totalTasks = statPages.length;
const totalRecords = allRecs.length;
const avgLast = totalTasks > 0
  ? (lasts.reduce((s, r) => s + (r.completion || 0), 0) / totalTasks).toFixed(2) : "0.00";

dv.paragraph(`**总任务数:** ${totalTasks} 个`);
dv.paragraph(`**总记录数:** ${totalRecords} 条`);
dv.paragraph(`**各任务最后一次平均完成度:** ${avgLast}`);
dv.paragraph("---");

// 完成度分布(基于各任务最后一次)
dv.header(4, "完成度分布(基于各任务最后一次记录)");
const compStats = {};
lasts.forEach((r) => { const c = r.completion || 0; compStats[c] = (compStats[c] || 0) + 1; });
dv.table(["完成度", "任务数", "占比", "可视化"],
  Object.entries(compStats).sort((a, b) => Number(a[0]) - Number(b[0])).map(([lvl, n]) => [
    `完成度 ${lvl}`, n, `${(n / totalTasks * 100).toFixed(1)}%`, "█".repeat(Math.round(n / totalTasks * 20)),
  ]));

// 心情分布(所有记录)
dv.header(4, "心情分布(所有记录)");
const moodStats = {};
allRecs.forEach((r) => { const m = moodLabel(r.mood); moodStats[m] = (moodStats[m] || 0) + 1; });
dv.table(["心情", "次数", "占比", "可视化"],
  Object.entries(moodStats).sort((a, b) => b[1] - a[1]).map(([m, n]) => [
    m, n, `${(n / totalRecords * 100).toFixed(1)}%`, "█".repeat(Math.round(n / totalRecords * 20)),
  ]));

// 按项目统计(基于各任务最后一次完成度)
dv.header(4, "按项目统计(基于各任务最后一次完成度)");
const projStats = {};
lasts.forEach((r) => {
  const p = r.project || "未分类";
  if (!projStats[p]) projStats[p] = { count: 0, total: 0 };
  projStats[p].count++; projStats[p].total += (r.completion || 0);
});
dv.table(["项目", "任务数", "平均完成度"],
  Object.entries(projStats).map(([p, s]) => [dv.fileLink(p), s.count, (s.total / s.count).toFixed(2)]));
```
