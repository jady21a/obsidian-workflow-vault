---
cssclasses:
  - cards
---


## 正在观看
```dataviewjs
const pages = dv.pages('"2.Read/douban" or "2.Read/media-DB"')
    .where(p => p.state && String(p.state).includes("正在观看"))
    .sort(p => p["添加时间"], 'desc');

function renderCover(cover) {
    if (!cover) return "";
    const s = String(cover);
    if (s.startsWith("http://") || s.startsWith("https://")) return `<img src="${s}" width="100"/>`;
    const file = app.vault.getAbstractFileByPath(s);
    if (file) return `<img src="${app.vault.getResourcePath(file)}" width="100"/>`;
    const m = s.match(/\[\[(.+?)(\|.*)?\]\]/);
    if (m) { const f = app.metadataCache.getFirstLinkpathDest(m[1], ""); if (f) return `<img src="${app.vault.getResourcePath(f)}" width="100"/>`; }
    return s;
}

dv.table(
["list","封面","star","score","myRate","originalTitle","aliases","genre","datePublished","director","state","country"],
    pages.map(p => [
    p.file.link, 
    renderCover(p["封面"]),
    "star:"+p.scoreStar, 
    "score:"+p.score, 
    "myRate:"+p.myRate, 
    "originalTitle:"+p.originalTitle, 
    "aliases:"+p.aliases, 
    "genre:"+p.genre, 
    "datePublished:"+p.datePublished, 
    "director:"+p.director, 
    "state:"+p.state, 
    "country:"+p.country]));
```



## 待看
```dataviewjs
const pages = dv.pages('"2.Read/douban" or "2.Read/media-DB"')
    .where(p => p.state && String(p.state).includes("待看"))
    .sort(p => p["添加时间"], 'desc');

function renderCover(cover) {
    if (!cover) return "";
    const s = String(cover);
    if (s.startsWith("http://") || s.startsWith("https://")) return `<img src="${s}" width="100"/>`;
    const file = app.vault.getAbstractFileByPath(s);
    if (file) return `<img src="${app.vault.getResourcePath(file)}" width="100"/>`;
    const m = s.match(/\[\[(.+?)(\|.*)?\]\]/);
    if (m) { const f = app.metadataCache.getFirstLinkpathDest(m[1], ""); if (f) return `<img src="${app.vault.getResourcePath(f)}" width="100"/>`; }
    return s;
}

dv.table(
["list","封面","star","score","myRate","originalTitle","aliases","genre","datePublished","director","state","country"],
    pages.map(p => [
    p.file.link, 
    renderCover(p["封面"]),
    "star:"+p.scoreStar, 
    "score:"+p.score, 
    "myRate:"+p.myRate, 
    "originalTitle:"+p.originalTitle, 
    "aliases:"+p.aliases, 
    "genre:"+p.genre, 
    "datePublished:"+p.datePublished, 
    "director:"+p.director, 
    "state:"+p.state, 
    "country:"+p.country]));
```






## 已看
```dataviewjs
const pages = dv.pages('"2.Read/douban" or "2.Read/media-DB"')
    .where(p => p.state && String(p.state).includes("已看") && p.file.tags.includes("#movies"))
    .sort(p => p["添加时间"], 'desc');

function renderCover(cover) {
    if (!cover) return "";
    const s = String(cover);
    if (s.startsWith("http://") || s.startsWith("https://")) return `<img src="${s}" width="100"/>`;
    const file = app.vault.getAbstractFileByPath(s);
    if (file) return `<img src="${app.vault.getResourcePath(file)}" width="100"/>`;
    const m = s.match(/\[\[(.+?)(\|.*)?\]\]/);
    if (m) { const f = app.metadataCache.getFirstLinkpathDest(m[1], ""); if (f) return `<img src="${app.vault.getResourcePath(f)}" width="100"/>`; }
    return s;
}

dv.table(
["list","封面","star","score","myRate","originalTitle","aliases","genre","datePublished","director","state","country"],
    pages.map(p => [
    p.file.link, 
    renderCover(p["封面"]),
    "star:"+p.scoreStar, 
    "score:"+p.score, 
    "myRate:"+p.myRate, 
    "originalTitle:"+p.originalTitle, 
    "aliases:"+p.aliases, 
    "genre:"+p.genre, 
    "datePublished:"+p.datePublished, 
    "director:"+p.director, 
    "state:"+p.state, 
    "country:"+p.country]));
```




