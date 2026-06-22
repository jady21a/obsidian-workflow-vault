<%*
const tfile = app.workspace.getActiveFile();
const content = await app.vault.read(tfile);

const today = tp.date.now("YYYY-MM-DD");
const newEntry = `- 日期: ${today}\n  完成度: \n  心情: \n  做了什么/没做的话为什么/想法: `;

// 匹配 try: 后面跟着的所有列表项（- 开头或2空格缩进的行）
// 空的情况：existing 捕获为空字符串 ""
const tryRegex = /^(try:\n?)((?:(?:- |\s{2,}).*\n?)*)/m;

if (!tryRegex.test(content)) {
  new Notice("❌ 未找到 try: 字段，请检查 frontmatter");
  return;
}

const updated = content.replace(tryRegex, (match, key, existing) => {
  // 空时 existing = ""，直接拼接；非空时确保换行符存在
  const separator = (existing === "" || existing.endsWith("\n")) ? "" : "\n";
  return `${key}${existing}${separator}${newEntry}\n`;
});

await app.vault.modify(tfile, updated);
new Notice("✅ 已追加新的 try 记录");
%>