/**
 * Site Find — one alias index for Ask and the Learning Materials hub.
 * Tess 2026-10-29 (32 entries). Matching uses the hub brain:
 * collapse whitespace, trim, lower-case, then indexOf.
 * Ask ranks exact, then prefix, then substring, and keeps 3 hits.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SiteFind = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var ENTRIES = [
    {
      "title": "English Home",
      "path": "/",
      "aliases": [
        "home",
        "english home",
        "英文主頁",
        "主頁",
        "homepage"
      ]
    },
    {
      "title": "English Learning Materials",
      "path": "learning-materials/",
      "aliases": [
        "learning materials",
        "lm",
        "學習資源",
        "教材",
        "materials hub",
        "lm hub"
      ]
    },
    {
      "title": "Paper 2 - Writing Formats",
      "path": "learning-materials/paper-2-writing-formats/",
      "aliases": [
        "writing formats",
        "paper 2 writing formats",
        "dse writing",
        "dse formats",
        "寫作格式",
        "文體",
        "paper 2 formats",
        "formats hub"
      ]
    },
    {
      "title": "Letter to the Editor",
      "path": "learning-materials/paper-2-exam-skills/letter-to-the-editor/",
      "aliases": [
        "letter to the editor",
        "lte",
        "讀者來函",
        "給編輯的信",
        "editor letter",
        "letter to editor"
      ]
    },
    {
      "title": "Formal Letter / Email",
      "path": "learning-materials/paper-2-exam-skills/formal-letter/",
      "aliases": [
        "formal letter",
        "formal email",
        "投訴信",
        "申請信",
        "正式書信",
        "正式電郵",
        "complaint letter",
        "application letter",
        "enquiry letter",
        "cover letter"
      ]
    },
    {
      "title": "Article",
      "path": "learning-materials/paper-2-exam-skills/article/",
      "aliases": [
        "article",
        "magazine article",
        "文章",
        "雜誌文章"
      ]
    },
    {
      "title": "Blog Entry",
      "path": "learning-materials/paper-2-exam-skills/blog/",
      "aliases": [
        "blog",
        "blog entry",
        "網誌",
        "blog post"
      ]
    },
    {
      "title": "Review",
      "path": "learning-materials/paper-2-exam-skills/review/",
      "aliases": [
        "review",
        "書評",
        "影評",
        "評論",
        "film review",
        "book review"
      ]
    },
    {
      "title": "Proposal",
      "path": "learning-materials/paper-2-exam-skills/proposal/",
      "aliases": [
        "proposal",
        "建議書",
        "計劃書"
      ]
    },
    {
      "title": "Report",
      "path": "learning-materials/paper-2-exam-skills/report/",
      "aliases": [
        "report",
        "報告",
        "school report"
      ]
    },
    {
      "title": "Speech",
      "path": "learning-materials/paper-2-exam-skills/speech/",
      "aliases": [
        "speech",
        "演講辭",
        "演說",
        "assembly speech"
      ]
    },
    {
      "title": "Paper 2 - Exam Skills",
      "path": "learning-materials/paper-2-exam-skills/",
      "aliases": [
        "paper 2 exam skills",
        "p2 exam skills",
        "寫作技巧",
        "paper 2 skills",
        "寫作應試技巧"
      ]
    },
    {
      "title": "Useful Vocabulary",
      "path": "learning-materials/useful-vocabulary/",
      "aliases": [
        "useful vocabulary",
        "vocab",
        "vocabulary",
        "詞彙",
        "有用詞彙",
        "vocab bank"
      ]
    },
    {
      "title": "Cohesion (Linking Words)",
      "path": "learning-materials/useful-vocabulary/#coh-h",
      "aliases": [
        "cohesion",
        "linking words",
        "connectives",
        "銜接",
        "連接詞",
        "cohesion linking words"
      ]
    },
    {
      "title": "Aspects",
      "path": "learning-materials/useful-vocabulary/#aspects-h",
      "aliases": [
        "aspects",
        "aspect",
        "寫作面向",
        "aspects bank"
      ]
    },
    {
      "title": "Tone & Attitude",
      "path": "learning-materials/useful-vocabulary/#tone-h",
      "aliases": [
        "tone",
        "attitude",
        "tone and attitude",
        "tone & attitude",
        "語氣",
        "態度詞"
      ]
    },
    {
      "title": "Topic Banks",
      "path": "learning-materials/useful-vocabulary/#topics-h",
      "aliases": [
        "jobs",
        "hk places",
        "topic banks",
        "職業",
        "香港地方",
        "jobs hk places",
        "environment",
        "health & lifestyle",
        "technology",
        "education",
        "social issues",
        "crime & law",
        "media",
        "culture & leisure",
        "travel & tourism",
        "work & economy",
        "family & relationships",
        "poverty & inequality",
        "climate & energy",
        "consumerism",
        "civic duty",
        "volunteering",
        "mental wellbeing"
      ]
    },
    {
      "title": "Spelling Watchlist",
      "path": "learning-materials/useful-vocabulary/#spell-h",
      "aliases": [
        "spelling",
        "spelling watchlist",
        "拼寫",
        "串法",
        "易錯拼寫"
      ]
    },
    {
      "title": "Formality Pairs",
      "path": "learning-materials/useful-vocabulary/#form-h",
      "aliases": [
        "formality",
        "formality pairs",
        "正式用語",
        "口語對照",
        "formal informal"
      ]
    },
    {
      "title": "Irregular Verbs",
      "path": "learning-materials/useful-vocabulary/#irreg-h",
      "aliases": [
        "irregular verbs",
        "irregular",
        "不規則動詞",
        "verb list"
      ]
    },
    {
      "title": "Sentence Patterns",
      "path": "learning-materials/sentence-patterns/",
      "aliases": [
        "sentence patterns",
        "patterns",
        "句式",
        "sentence frames",
        "sp"
      ]
    },
    {
      "title": "Paper 1 - Exam Skills",
      "path": "learning-materials/paper-1-exam-skills/",
      "aliases": [
        "paper 1 exam skills",
        "p1 exam skills",
        "reading skills",
        "閱讀技巧",
        "paper 1 skills"
      ]
    },
    {
      "title": "True / False / Not Given",
      "path": "learning-materials/paper-1-exam-skills/tfng/",
      "aliases": [
        "tfng",
        "true false not given",
        "t/f/ng",
        "對錯未提及",
        "true false"
      ]
    },
    {
      "title": "Paper 1 - Exam Practice",
      "path": "learning-materials/paper-1-exam-practice/",
      "aliases": [
        "paper 1 exam practice",
        "p1 practice",
        "reading practice",
        "閱讀練習",
        "quest hub",
        "past papers reading"
      ]
    },
    {
      "title": "Paper 4 - Speaking Expressions",
      "path": "learning-materials/paper-4-speaking-expressions/",
      "aliases": [
        "paper 4",
        "speaking expressions",
        "p4 speaking",
        "說話用語",
        "group discussion",
        "individual response",
        "oral"
      ]
    },
    {
      "title": "Grammar",
      "path": "learning-materials/grammar/",
      "aliases": [
        "grammar",
        "junior grammar",
        "文法",
        "初中文法",
        "tenses",
        "時態"
      ]
    },
    {
      "title": "Speech Festival",
      "path": "speech-festival/",
      "aliases": [
        "speech festival",
        "hkssf",
        "朗誦節",
        "speech fest"
      ]
    },
    {
      "title": "Speech Festival Solo Verse Speaking",
      "path": "speech-festival/solo-verse/",
      "aliases": [
        "solo verse",
        "solo verse speaking",
        "個人詩詞朗誦"
      ]
    },
    {
      "title": "S3 Girls · Last Day (U41)",
      "path": "speech-festival/u41/",
      "aliases": [
        "u41",
        "last day",
        "s3 girls last day"
      ]
    },
    {
      "title": "S5 Girls · One Moment in Summer (U47)",
      "path": "speech-festival/u47/",
      "aliases": [
        "u47",
        "one moment in summer",
        "s5 girls one moment"
      ]
    },
    {
      "title": "S3 Boys · Late Home (U66)",
      "path": "speech-festival/u66/",
      "aliases": [
        "u66",
        "late home",
        "s3 boys late home"
      ]
    },
    {
      "title": "What's New",
      "path": "whats-new/",
      "aliases": [
        "whats new",
        "更新",
        "最新消息"
      ]
    }
  ];

  var HUB_BASE = "https://skhhcss-eng.github.io/learning-materials/";

  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function fieldScore(field, q) {
    if (!field || !q) return 0;
    if (field === q) return 100;
    if (field.indexOf(q) === 0) return 70;
    if (field.indexOf(q) !== -1) return 40;
    return 0;
  }

  function score(entry, q) {
    var best = fieldScore(norm(entry.title), q);
    var aliases = entry.aliases || [];
    for (var i = 0; i < aliases.length; i++) {
      var next = fieldScore(norm(aliases[i]), q);
      if (next > best) best = next;
    }
    return best;
  }

  function search(query, limit) {
    var q = norm(query);
    if (!q) return [];
    var cap = typeof limit === "number" ? limit : 3;
    if (cap < 1) return [];
    var scored = [];
    for (var i = 0; i < ENTRIES.length; i++) {
      var value = score(ENTRIES[i], q);
      if (value > 0) scored.push({ index: i, score: value, entry: ENTRIES[i] });
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });
    var out = [];
    for (var j = 0; j < scored.length && out.length < cap; j++) {
      out.push({
        title: scored[j].entry.title,
        path: scored[j].entry.path
      });
    }
    return out;
  }

  function matches(haystack, query) {
    var q = norm(query);
    if (!q) return true;
    return norm(haystack).indexOf(q) !== -1;
  }

  function sitePath(path) {
    var bare = String(path || "").split("#")[0];
    if (!bare || bare === "/") return "/";
    if (bare.charAt(0) !== "/") bare = "/" + bare;
    if (bare.length > 1 && bare.charAt(bare.length - 1) !== "/") bare += "/";
    return bare;
  }

  function hubCardPath(href) {
    var raw = String(href || "").replace(/^\s+|\s+$/g, "");
    if (!raw || raw.charAt(0) === "#" || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return "";
    try {
      var url = new URL(raw, HUB_BASE);
      if (url.hostname !== "skhhcss-eng.github.io") return "";
      return sitePath(url.pathname);
    } catch (e) {
      return "";
    }
  }

  function extraHaystack(href) {
    var card = hubCardPath(href);
    if (!card) return "";
    var bits = [];
    for (var i = 0; i < ENTRIES.length; i++) {
      var entry = sitePath(ENTRIES[i].path);
      var onCard = entry === card || (card !== "/" && entry.indexOf(card) === 0);
      if (!onCard) continue;
      bits.push(ENTRIES[i].title);
      bits.push((ENTRIES[i].aliases || []).join(" "));
    }
    return bits.join(" ");
  }

  function rectsOverlap(a, b) {
    if (!a || !b) return false;
    if (a.width < 2 || a.height < 2 || b.width < 2 || b.height < 2) return false;
    return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
  }

  // Find / Ask jump links are origin-absolute. GitHub Pages serves the site at
  // /. The school LMS serves the same files at /english/. site-find.js (and
  // ask.js) always sit at that site root, so the script URL is the base.
  function baseFromScriptSrc(src) {
    var raw = String(src || "").replace(/^\s+|\s+$/g, "");
    if (!raw) return "";
    var path = raw.split("#")[0].split("?")[0];
    try {
      path = new URL(raw, "https://example.invalid/").pathname;
    } catch (e) {
      var scheme = path.indexOf("://");
      if (scheme !== -1) {
        var slash = path.indexOf("/", scheme + 3);
        path = slash === -1 ? "/" : path.slice(slash);
      }
    }
    path = path.replace(/\/(?:site-find|ask)\.js$/i, "");
    if (!path || path === "/") return "";
    return path.replace(/\/+$/, "");
  }

  function baseFromPathname(pathname) {
    var path = String(pathname || "");
    if (path === "/english" || path.indexOf("/english/") === 0) return "/english";
    return "";
  }

  var SITE_BASE = "";
  try {
    if (typeof document !== "undefined" && document && document.currentScript && document.currentScript.src) {
      SITE_BASE = baseFromScriptSrc(document.currentScript.src);
    } else if (typeof location !== "undefined" && location && typeof location.pathname === "string") {
      SITE_BASE = baseFromPathname(location.pathname);
    }
  } catch (e) {
    SITE_BASE = "";
  }

  function hrefFor(path, base) {
    var root = base == null ? SITE_BASE : String(base);
    root = root.replace(/\/+$/, "");
    if (root === "/") root = "";

    var raw = path == null ? "" : String(path);
    var hash = "";
    var hashAt = raw.indexOf("#");
    if (hashAt !== -1) {
      hash = raw.slice(hashAt);
      raw = raw.slice(0, hashAt);
    }
    if (!raw || raw === "/") return (root ? root + "/" : "/") + hash;
    if (raw.charAt(0) !== "/") raw = "/" + raw;
    if (root && (raw === root || raw.indexOf(root + "/") === 0)) return raw + hash;
    return root + raw + hash;
  }

  return {
    entries: ENTRIES,
    norm: norm,
    matches: matches,
    search: search,
    extraHaystack: extraHaystack,
    hubCardPath: hubCardPath,
    rectsOverlap: rectsOverlap,
    baseFromScriptSrc: baseFromScriptSrc,
    baseFromPathname: baseFromPathname,
    siteBase: function () { return SITE_BASE; },
    hrefFor: hrefFor
  };
});
