---
目标完成度:
锻炼:
阅读:
语言:
睡觉习惯:
date: <% tp.file.title %>
---
<%*
const MAX_DAYS = 30;
const baseDate = moment(tp.file.title, "YYYY-MM-DD", true).isValid()
    ? moment(tp.file.title, "YYYY-MM-DD")
    : moment();
let tomorrowGoals = "";
let pastGoalsBlock = "";
let carriedForwardBlock = "";
let foundDate = null;
let daysAgo = 0;

function getSection(content, heading) {
    const match = content.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |\\n---|\\n#[^#]|$)`));
    return match ? match[1].trim() : "";
}

function getUncheckedTasks(block) {
    return block
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => /^- \[ \] .+/.test(line))
        .join('\n');
}

function getTomorrowGoals(block) {
    return block
        .split('\n')
        .filter(line => !/^-\s*\[\s*\]\s*$/.test(line.trim()) && line.trim() !== '-' && line.trim() !== '- ')
        .filter(line => !/^-\s*\[[xX]\]/.test(line.trim()))
        .join('\n')
        .trim();
}

function dedupeLines(lines) {
    return lines
        .filter(line => line.trim())
        .filter((line, index, arr) => arr.findIndex(item => item.trim() === line.trim()) === index);
}

for (let i = 1; i <= MAX_DAYS; i++) {
    const targetDate = baseDate.clone().subtract(i, 'days').format('YYYY-MM-DD');
    const targetPath = `5.todo/date/${targetDate}.md`;
    const targetFile = app.vault.getAbstractFileByPath(targetPath);

    if (!targetFile) continue;

    // Read the note source directly so Templater doesn't recursively execute nested templates.
    const content = await app.vault.read(targetFile);
    const candidateTomorrowGoals = getTomorrowGoals(getSection(content, "明日目标"));

    const tomorrowLines = new Set(
        candidateTomorrowGoals
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
    );

    const candidatePastGoalsBlock = dedupeLines([
        ...getUncheckedTasks(getSection(content, "今日目标")).split('\n'),
        ...getUncheckedTasks(getSection(content, "往日目标")).split('\n'),
    ])
        .filter(line => !tomorrowLines.has(line.trim()))
        .join('\n');

    const candidateCarriedForwardBlock = dedupeLines([
        ...getUncheckedTasks(getSection(content, "今日记录")).split('\n'),
        ...getUncheckedTasks(getSection(content, "延续目标")).split('\n'),
    ])
        .filter(line => !tomorrowLines.has(line.trim()))
        .join('\n');

    if (candidateTomorrowGoals || candidatePastGoalsBlock || candidateCarriedForwardBlock) {
        tomorrowGoals = candidateTomorrowGoals;
        pastGoalsBlock = candidatePastGoalsBlock;
        carriedForwardBlock = candidateCarriedForwardBlock;
        foundDate = targetDate;
        daysAgo = i;
        break;
    }
}

const todayGoals = tomorrowGoals || "- [ ] ";
const carriedBlock = carriedForwardBlock ? carriedForwardBlock : "(无延续任务)";
const pastGoals = pastGoalsBlock ? pastGoalsBlock : "(无往日目标)";
const sourcePrefix = foundDate && daysAgo > 1
    ? `> [!note] 来自 ${foundDate}(${daysAgo} 天前)\n\n`
    : "";
-%>
## 今日目标
<% todayGoals %>

## 往日目标
<% sourcePrefix + pastGoals %>

## scheduled
```dataviewjs
const date = dv.date(dv.current().file.name);
if (date) {
  const scheduledTasks = dv.pages().file.tasks
    .where(t => !t.completed && t.scheduled && t.scheduled <= date)
    .sort(t => t.scheduled, 'asc');

  const todayTasks = scheduledTasks.where(t => t.scheduled.equals(date));
  const carriedTasks = scheduledTasks.where(t => t.scheduled < date);

  if (todayTasks.length > 0) {
    dv.taskList(todayTasks, false);
  }

  if (carriedTasks.length > 0) {
    dv.taskList(carriedTasks, false);
  }

  if (todayTasks.length === 0 && carriedTasks.length === 0) {
    dv.paragraph("(无 scheduled 任务)");
  }
}

```

## 延续目标
<% sourcePrefix + carriedBlock %>

## 今日复盘
- 做了什么:
- 没做的话为什么:
- 今日亮点:
- 想法/反思/心情:

## 明日目标
- [ ] 
 
## 今日记录
