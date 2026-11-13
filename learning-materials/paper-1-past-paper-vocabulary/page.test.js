import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const sheetJs = fs.readFileSync(new URL("./sheet.js", import.meta.url), "utf8");
const explainJs = fs.readFileSync(new URL("../explain.js", import.meta.url), "utf8");
const hub = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const SPEC = [
  {
    "year": "2025",
    "theme": "Mixed review",
    "lead": "Use any clue that helps: contrast, example, result, restatement, or inference.",
    "rows": [
      {
        "chip": "resilient",
        "pos": "adj.",
        "def": "able to recover from difficulty",
        "zh": "有韌性的",
        "example": "The team was <strong>resilient</strong>: after a poor first half, they changed their plan and finished strongly."
      },
      {
        "chip": "compromise",
        "pos": "n.",
        "def": "an agreement in which each side gives something up",
        "zh": "折衷／妥協",
        "example": "They reached a <strong>compromise</strong>: the fair would be shorter, but every class would still have a stall."
      },
      {
        "chip": "feasible",
        "pos": "adj.",
        "def": "possible and practical",
        "zh": "可行的",
        "example": "A weekday visit is not <strong>feasible</strong>, because the museum opens after school hours only on Saturday."
      },
      {
        "chip": "escalate",
        "pos": "v.",
        "def": "to become more serious, or to make something more serious",
        "zh": "升級／加劇",
        "example": "A small disagreement can <strong>escalate</strong> in a group chat if nobody steps in early."
      },
      {
        "chip": "advocate",
        "pos": "v.",
        "def": "to support something publicly",
        "zh": "主張／倡議",
        "example": "Several students <strong>advocate</strong> a longer lunch break, and they have written to the council about it."
      }
    ]
  },
  {
    "year": "2024",
    "theme": "Judgement words",
    "lead": "Writers often judge an idea as strong or weak. Use the reason in the same sentence to confirm the word.",
    "rows": [
      {
        "chip": "flawed",
        "pos": "adj.",
        "def": "having mistakes or weaknesses",
        "zh": "有缺陷的",
        "example": "The plan was <strong>flawed</strong>: it looked neat on paper, but nobody had checked whether the hall was free."
      },
      {
        "chip": "compelling",
        "pos": "adj.",
        "def": "convincing and hard to ignore",
        "zh": "有說服力的",
        "example": "She made a <strong>compelling</strong> case for a later start, with clear figures and calm examples."
      },
      {
        "chip": "dubious",
        "pos": "adj.",
        "def": "doubtful; probably not reliable",
        "zh": "可疑的",
        "example": "The article made some <strong>dubious</strong> claims, with no source given for the most striking figure."
      },
      {
        "chip": "constructive",
        "pos": "adj.",
        "def": "helpful; meant to improve something",
        "zh": "建設性的",
        "example": "The comments were <strong>constructive</strong>: they pointed out what to change and how to change it."
      },
      {
        "chip": "superficial",
        "pos": "adj.",
        "def": "only on the surface; not thorough",
        "zh": "表面的／膚淺的",
        "example": "A <strong>superficial</strong> reading will miss the contrast in paragraph 3; slow down for the turn at however."
      }
    ]
  },
  {
    "year": "2023",
    "theme": "How much, and how far",
    "lead": "These words limit or widen a statement. Read the example that follows before you settle on a meaning.",
    "rows": [
      {
        "chip": "predominantly",
        "pos": "adv.",
        "def": "mainly; mostly",
        "zh": "主要地",
        "example": "The audience was <strong>predominantly</strong> students, with only a handful of parents at the back."
      },
      {
        "chip": "merely",
        "pos": "adv.",
        "def": "only; nothing more than",
        "zh": "只不過",
        "example": "The notice was <strong>merely</strong> a reminder, not a new rule."
      },
      {
        "chip": "sparse",
        "pos": "adj.",
        "def": "few and spread out; not much of it",
        "zh": "稀疏的",
        "example": "Shade was <strong>sparse</strong> along the new path, so the teacher told the class to bring a hat."
      },
      {
        "chip": "ample",
        "pos": "adj.",
        "def": "more than enough",
        "zh": "充足的",
        "example": "There was <strong>ample</strong> time to reread Part B before the end of the paper."
      },
      {
        "chip": "solely",
        "pos": "adv.",
        "def": "only; for one purpose or reason",
        "zh": "僅僅／只限於",
        "example": "The room is <strong>solely</strong> for music practice; please do not eat there."
      }
    ]
  },
  {
    "year": "2022",
    "theme": "Inference",
    "lead": "Sometimes no phrase restates the word. Use the details in the sentence to infer the meaning.",
    "rows": [
      {
        "chip": "grim",
        "pos": "adj.",
        "def": "very serious and unpleasant",
        "zh": "嚴峻的／令人沮喪的",
        "example": "The first paragraph painted a <strong>grim</strong> picture of the river: dead fish, a sharp smell, and no one willing to walk along the bank."
      },
      {
        "chip": "strained",
        "pos": "adj.",
        "def": "under pressure; not relaxed",
        "zh": "緊張的",
        "example": "After the argument, their conversation was <strong>strained</strong>; they spoke only when they had to."
      },
      {
        "chip": "lukewarm",
        "pos": "adj.",
        "def": "not very keen or interested",
        "zh": "反應冷淡的",
        "example": "The proposal received a <strong>lukewarm</strong> response: a few polite nods, but no one volunteered."
      },
      {
        "chip": "hasty",
        "pos": "adj.",
        "def": "done too quickly",
        "zh": "倉促的",
        "example": "It was a <strong>hasty</strong> decision to cancel the match after two drops of rain; the court was dry ten minutes later."
      },
      {
        "chip": "grudging",
        "pos": "adj.",
        "def": "given unwillingly",
        "zh": "勉強的",
        "example": "He offered a <strong>grudging</strong> apology, with no eye contact and a half-finished sentence."
      }
    ]
  },
  {
    "year": "2021",
    "theme": "Words that go together",
    "lead": "Some verbs have typical partners. Learn the whole phrase, then use the rest of the sentence to confirm the meaning.",
    "rows": [
      {
        "chip": "pose a threat",
        "pos": "phrase",
        "def": "to present or create a risk",
        "zh": "構成威脅",
        "example": "Abandoned bicycles can <strong>pose a threat</strong> to people walking through the back lane."
      },
      {
        "chip": "play a role",
        "pos": "phrase",
        "def": "to have a part or function in something",
        "zh": "發揮作用",
        "example": "Parent volunteers <strong>play a key role</strong> in the reading week."
      },
      {
        "chip": "raise awareness",
        "pos": "phrase",
        "def": "to help more people know about or notice something",
        "zh": "提高意識",
        "example": "The poster campaign aimed to <strong>raise awareness</strong> of heatstroke on sports day."
      },
      {
        "chip": "take into account",
        "pos": "phrase",
        "def": "to consider something when you decide",
        "zh": "考慮到",
        "example": "When choosing a venue, <strong>take into account</strong> the time needed to travel back to school."
      },
      {
        "chip": "reach a consensus",
        "pos": "phrase",
        "def": "to arrive at an agreement that everyone can accept",
        "zh": "達成共識",
        "example": "After a long discussion, the committee managed to <strong>reach a consensus</strong> on the theme."
      }
    ]
  },
  {
    "year": "2020",
    "theme": "Formal and informal",
    "lead": "In Paper 1, a more formal word often appears in reports, notices and official letters. Use 譯 for the everyday Chinese meaning.",
    "rows": [
      {
        "chip": "commence",
        "pos": "v.",
        "def": "to start (formal)",
        "zh": "開始（較正式）",
        "example": "The briefing will <strong>commence</strong> at 8:15 a.m. sharp."
      },
      {
        "chip": "obtain",
        "pos": "v.",
        "def": "to get (formal)",
        "zh": "取得（較正式）",
        "example": "Students must <strong>obtain</strong> a parent’s signature before the trip."
      },
      {
        "chip": "reside",
        "pos": "v.",
        "def": "to live (formal)",
        "zh": "居住（較正式）",
        "example": "Applicants should <strong>reside</strong> in the district, or have a close family member who does."
      },
      {
        "chip": "cease",
        "pos": "v.",
        "def": "to stop (formal)",
        "zh": "停止（較正式）",
        "example": "Please <strong>cease</strong> talking when the exam paper is being given out."
      },
      {
        "chip": "request",
        "pos": "v.",
        "def": "to ask someone to do something (formal)",
        "zh": "要求／請求（較正式）",
        "example": "Visitors are <strong>requested</strong> to sign in at the general office."
      }
    ]
  },
  {
    "year": "2019",
    "theme": "Degree and limitation",
    "lead": "Words of degree tell you *how much*. Compare them with the figure or example in the same sentence.",
    "rows": [
      {
        "chip": "marginally",
        "pos": "adv.",
        "def": "only slightly",
        "zh": "只是輕微地",
        "example": "Scores improved only <strong>marginally</strong>, from 62 to 63, so the teacher did not treat it as a big jump."
      },
      {
        "chip": "substantially",
        "pos": "adv.",
        "def": "by a large amount",
        "zh": "大幅度地",
        "example": "After the extra clinics, attendance rose <strong>substantially</strong>, and the hall was nearly full."
      },
      {
        "chip": "negligible",
        "pos": "adj.",
        "def": "so small that it can be ignored",
        "zh": "微不足道的",
        "example": "The difference in price was <strong>negligible</strong> — only two dollars — so most students chose the closer shop."
      },
      {
        "chip": "drastic",
        "pos": "adj.",
        "def": "extreme and sudden",
        "zh": "激烈的／大幅度的",
        "example": "Closing the cycle track overnight would be a <strong>drastic</strong> step; a short trial at weekends would be milder."
      },
      {
        "chip": "relatively",
        "pos": "adv.",
        "def": "in comparison with something else",
        "zh": "相對地",
        "example": "The second passage is <strong>relatively</strong> short, but the questions are denser than those in Part A."
      }
    ]
  },
  {
    "year": "2018",
    "theme": "Reference in the sentence",
    "lead": "*This*, *these*, *such* and a following clause often point back to the word and show what it stands for.",
    "rows": [
      {
        "chip": "initiative",
        "pos": "n.",
        "def": "a new plan or action taken to deal with something",
        "zh": "新措施／倡議",
        "example": "The class started a food-waste <strong>initiative</strong>: this scheme asked every group to weigh leftovers after lunch."
      },
      {
        "chip": "phenomenon",
        "pos": "n.",
        "def": "something that happens and can be observed",
        "zh": "現象",
        "example": "Queueing overnight for a concert ticket is a familiar <strong>phenomenon</strong>; this behaviour appears every time a popular singer announces a show."
      },
      {
        "chip": "setback",
        "pos": "n.",
        "def": "a problem that delays progress",
        "zh": "挫折／阻礙",
        "example": "A burst pipe in the hall was a serious <strong>setback</strong>, and this delay forced the drama club to move the dress rehearsal."
      },
      {
        "chip": "claim",
        "pos": "n.",
        "def": "a statement presented as true",
        "zh": "說法／聲稱",
        "example": "The article made a bold <strong>claim</strong>: that one new line would cut travel time in half. Readers were asked to judge this statement against the figures."
      },
      {
        "chip": "measure",
        "pos": "n.",
        "def": "an action taken to deal with a problem",
        "zh": "措施",
        "example": "The canteen introduced two new <strong>measures</strong>, including a tray-return point and a water refill station, to cut disposable cup use."
      }
    ]
  },
  {
    "year": "2017",
    "theme": "Tone and attitude",
    "lead": "The words around a description often show how the writer feels. Use that tone to pin down the word.",
    "rows": [
      {
        "chip": "sarcastic",
        "pos": "adj.",
        "def": "saying the opposite of what you mean, in order to mock",
        "zh": "諷刺的",
        "example": "When he called the 200-word essay a light warm-up, his tone was <strong>sarcastic</strong>, not kind."
      },
      {
        "chip": "sympathetic",
        "pos": "adj.",
        "def": "showing that you understand someone’s feelings",
        "zh": "體諒的／有同情心的",
        "example": "The counsellor was <strong>sympathetic</strong> when the student explained why the homework was late, and helped her make a new plan."
      },
      {
        "chip": "dismissive",
        "pos": "adj.",
        "def": "showing that you think something is not worth attention",
        "zh": "不屑的／輕視的",
        "example": "The review was <strong>dismissive</strong> of the film, waving it away as just another sequel."
      },
      {
        "chip": "optimistic",
        "pos": "adj.",
        "def": "hopeful about the future",
        "zh": "樂觀的",
        "example": "Despite the tight deadline, the team stayed <strong>optimistic</strong> and believed the display would be ready."
      },
      {
        "chip": "sceptical",
        "pos": "adj.",
        "def": "doubtful; not easily convinced",
        "zh": "懷疑的",
        "example": "Several parents were <strong>sceptical</strong> about the new app until they had seen how it actually worked."
      }
    ]
  },
  {
    "year": "2016",
    "theme": "Word parts",
    "lead": "Break a long word into parts. A prefix or suffix often carries a reliable meaning (*un-* = not, *over-* = too much, *bi-* = two).",
    "rows": [
      {
        "chip": "unpredictable",
        "pos": "adj.",
        "def": "not able to be predicted; changeable",
        "zh": "難以預測的",
        "example": "The weather this week has been <strong>unpredictable</strong>: sunshine at dawn, then a sudden storm by recess."
      },
      {
        "chip": "overestimate",
        "pos": "v.",
        "def": "to guess that something is larger or easier than it really is",
        "zh": "高估",
        "example": "Do not <strong>overestimate</strong> how much you can revise in one evening; a short, focused plan works better."
      },
      {
        "chip": "bilingual",
        "pos": "adj.",
        "def": "using, or able to use, two languages",
        "zh": "雙語的",
        "example": "The notice is <strong>bilingual</strong>, with English and Chinese side by side."
      },
      {
        "chip": "irreversible",
        "pos": "adj.",
        "def": "cannot be undone",
        "zh": "不可逆轉的",
        "example": "Leaving the ice pack off too long may cause <strong>irreversible</strong> damage to the specimen, so the lab assistant sealed it at once."
      },
      {
        "chip": "underestimate",
        "pos": "v.",
        "def": "to guess that something is smaller or less important than it really is",
        "zh": "低估",
        "example": "Never <strong>underestimate</strong> a short reading passage; a few careful marks can still change your grade."
      }
    ]
  },
  {
    "year": "2015",
    "theme": "Restatement clues",
    "lead": "Writers often restate a word with *in other words*, *that is*, *namely*, a dash, or a second clause that means the same thing.",
    "rows": [
      {
        "chip": "predicament",
        "pos": "n.",
        "def": "a difficult situation",
        "zh": "困境",
        "example": "The hikers were in a <strong>predicament</strong> — in other words, they were stuck on the trail with no phone signal."
      },
      {
        "chip": "compact",
        "pos": "adj.",
        "def": "small and neatly arranged",
        "zh": "小巧的／緊湊的",
        "example": "The new study desk is <strong>compact</strong>; that is, it takes up very little space in a small bedroom."
      },
      {
        "chip": "conventional",
        "pos": "adj.",
        "def": "usual; traditional",
        "zh": "傳統的／慣常的",
        "example": "She ignored the <strong>conventional</strong> advice, namely that you should start with a safe topic, and wrote about a less familiar issue instead."
      },
      {
        "chip": "vital",
        "pos": "adj.",
        "def": "extremely important",
        "zh": "極為重要的",
        "example": "Clear instructions are <strong>vital</strong> — they are essential if every group is to finish on time."
      },
      {
        "chip": "compile",
        "pos": "v.",
        "def": "to collect and put together",
        "zh": "彙編／整理",
        "example": "Students had to <strong>compile</strong> a list of sources, that is, gather the articles and arrange them in one document."
      }
    ]
  },
  {
    "year": "2014",
    "theme": "Cause and effect",
    "lead": "Look for *because*, *so*, *as a result* and similar links. They often show what the word does, or what it leads to.",
    "rows": [
      {
        "chip": "trigger",
        "pos": "v.",
        "def": "to cause something to start",
        "zh": "觸發／引發",
        "example": "A single unkind comment online can <strong>trigger</strong> a wave of complaints, so the teacher asked the class to pause before posting."
      },
      {
        "chip": "deteriorate",
        "pos": "v.",
        "def": "to become worse",
        "zh": "惡化",
        "example": "The path <strong>deteriorated</strong> after weeks of heavy rain, and several students slipped on the way to the back gate."
      },
      {
        "chip": "incentive",
        "pos": "n.",
        "def": "something that encourages you to do something",
        "zh": "激勵／誘因",
        "example": "The school offered a small <strong>incentive</strong> for returning library books on time, and overdue rates fell as a result."
      },
      {
        "chip": "undermine",
        "pos": "v.",
        "def": "to weaken something, often slowly",
        "zh": "削弱",
        "example": "Constant last-minute changes can <strong>undermine</strong> students’ confidence, because they no longer trust the plan."
      },
      {
        "chip": "boost",
        "pos": "v.",
        "def": "to increase or improve",
        "zh": "提升／增強",
        "example": "Extra rehearsal time helped <strong>boost</strong> the choir’s confidence, so the concert went more smoothly."
      }
    ]
  },
  {
    "year": "2013",
    "theme": "Example clues",
    "lead": "Words such as *such as*, *for instance*, *including* and *along with* often introduce examples that explain the word.",
    "rows": [
      {
        "chip": "amenities",
        "pos": "n.",
        "def": "useful facilities in a place",
        "zh": "設施／便利設施",
        "example": "The new estate offers plenty of <strong>amenities</strong>, such as a library, a clinic and a covered playground."
      },
      {
        "chip": "staple",
        "pos": "n.",
        "def": "a main or basic food",
        "zh": "主食",
        "example": "Rice is still a <strong>staple</strong> in many Hong Kong households, along with other everyday foods such as noodles and bread."
      },
      {
        "chip": "appliances",
        "pos": "n.",
        "def": "machines for everyday household tasks",
        "zh": "家電／用具",
        "example": "Please unplug small <strong>appliances</strong>, for instance the kettle and the toaster, before the lab is locked."
      },
      {
        "chip": "vocation",
        "pos": "n.",
        "def": "a type of work you are suited to, or a career path",
        "zh": "職業／志業",
        "example": "The talk introduced several <strong>vocations</strong>, including nursing, teaching and social work."
      },
      {
        "chip": "commodities",
        "pos": "n.",
        "def": "goods that are bought and sold",
        "zh": "商品",
        "example": "The report listed everyday <strong>commodities</strong> such as cooking oil, rice and canned fish."
      }
    ]
  },
  {
    "year": "2012",
    "theme": "Contrast clues",
    "lead": "When a sentence turns with *but*, *however*, *although* or *unlike*, the word often means the opposite of what comes on the other side.",
    "rows": [
      {
        "chip": "reluctant",
        "pos": "adj.",
        "def": "unwilling, or slow to agree",
        "zh": "不情願／不願意",
        "example": "The committee was <strong>reluctant</strong> to shorten the lunch break, but the principal insisted the afternoon lessons had to start earlier."
      },
      {
        "chip": "scarce",
        "pos": "adj.",
        "def": "in short supply; hard to find",
        "zh": "稀少／缺乏",
        "example": "Unlike last September, when the shops were full, bottled water was <strong>scarce</strong> after the typhoon."
      },
      {
        "chip": "adverse",
        "pos": "adj.",
        "def": "harmful; unfavourable",
        "zh": "不利的／有害的",
        "example": "The new timetable had an <strong>adverse</strong> effect on after-school training, unlike the old one, which left a clear hour for practice."
      },
      {
        "chip": "obsolete",
        "pos": "adj.",
        "def": "out of date; no longer used",
        "zh": "過時的",
        "example": "The computer room still has a few <strong>obsolete</strong> desktops, but most classes now use the newer laptops."
      },
      {
        "chip": "drawback",
        "pos": "n.",
        "def": "a disadvantage",
        "zh": "缺點",
        "example": "The harbour cruise is popular; the main <strong>drawback</strong>, however, is the long queue at the pier."
      }
    ]
  }
];

function attr(source, name) {
  const match = source.match(new RegExp(name + '="([^"]*)"'));
  if (!match) throw new Error("missing " + name + " in " + source.slice(0, 80));
  return match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parsePage(source) {
  const blocks = source.split('<section class="year-set').slice(1);
  return blocks.map((block) => {
    const year = attr(block, "data-year");
    const theme = attr(block, "data-theme");
    const leadMatch = block.match(/<p class="section-lead">([\s\S]*?)<\/p>/);
    if (!leadMatch) throw new Error("lead " + year);
    const lead = leadMatch[1].replace(/<em>/g, "*").replace(/<\/em>/g, "*");
    const chips = [...block.matchAll(/<li><span class="gloss vocab-example"[\s\S]*?<\/span><\/li>/g)].map((hit) => {
      const item = hit[0];
      const chip = item.match(/aria-controls="exampleSheet">([^<]*)<\/span>/)[1];
      return {
        chip,
        pos: attr(item, "data-pos"),
        def: attr(item, "data-def"),
        zh: attr(item, "data-zh"),
        example: attr(item, "data-example"),
      };
    });
    return { year, theme, lead, rows: chips, hidden: /\shidden>/.test(block.slice(0, 220)) };
  });
}

test("title, tip, and year dropdown match the locked page", () => {
  assert.match(html, /<title>Paper 1 - Past Paper Vocabulary · Learning Materials · SKH Holy Carpenter Secondary School<\/title>/);
  assert.match(html, /<h1>Paper 1 - Past Paper Vocabulary<\/h1>/);
  assert.match(html, /<p class="tip">Practise working out word meaning from context — a key Paper 1 skill\. Each year is an original practice set, not a list from that year’s exam\. Tap a word for its part of speech, an English definition, and an example\. Use 譯 for the Chinese meaning\.<\/p>/);
  assert.equal(html.includes("Oxford"), false);
  assert.equal(html.includes("OUP"), false);
  assert.equal(html.includes("PHONE"), false);
  const options = [...html.matchAll(/<option value="(\d{4})">/g)].map((hit) => hit[1]);
  assert.deepEqual(options, SPEC.map((year) => year.year));
});

test("all 14 years and 70 chips match Tess's wording", () => {
  const parsed = parsePage(html);
  assert.equal(parsed.length, 14);
  assert.equal(parsed.reduce((n, year) => n + year.rows.length, 0), 70);
  assert.equal(parsed[0].hidden, false);
  for (let i = 1; i < parsed.length; i++) assert.equal(parsed[i].hidden, true);
  parsed.forEach((year, index) => {
    const spec = SPEC[index];
    assert.equal(year.year, spec.year);
    assert.equal(year.theme, spec.year + " — " + spec.theme);
    assert.equal(year.lead, spec.lead);
    assert.deepEqual(year.rows, spec.rows);
    year.rows.forEach((row) => {
      assert.equal(["n.", "v.", "adj.", "adv.", "phrase"].includes(row.pos), true);
      assert.match(row.example, /<strong>[\s\S]+<\/strong>/);
      assert.equal(row.zh.length > 0, true);
      assert.equal(row.def.length > 0, true);
      const marked = [...row.example.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((hit) => hit[1].toLowerCase());
      assert.equal(marked.length, 1);
      assert.equal(marked[0].includes(row.chip.toLowerCase().split(" ")[0]), true);
    });
  });
  const play = parsed.find((year) => year.year === "2021").rows.find((row) => row.chip === "play a role");
  assert.equal(play.example.includes("<strong>play a key role</strong>"), true);
  const sceptical = parsed.find((year) => year.year === "2017").rows.find((row) => row.chip === "sceptical");
  assert.equal(sceptical.pos, "adj.");
  assert.equal(sceptical.def, "doubtful; not easily convinced");
});

test("sheet shows pos, definition, then example, and keeps Chinese off the popup", () => {
  const sheet = html.slice(html.indexOf('id="exampleSheet"'), html.indexOf('id="bottomDock"'));
  const posAt = sheet.indexOf('id="exampleSheetPos"');
  const defAt = sheet.indexOf('id="exampleSheetDef"');
  const textAt = sheet.indexOf('id="exampleSheetText"');
  assert.equal(posAt !== -1 && posAt < defAt && defAt < textAt, true);
  assert.equal(sheet.includes("data-zh"), false);
  assert.equal(sheet.includes("example-sheet-zh"), false);
  assert.match(sheetJs, /posEl\.textContent/);
  assert.match(sheetJs, /defEl\.textContent/);
  assert.match(sheetJs, /exampleHtml\(example\)/);
  assert.equal(sheetJs.includes("getAttribute('data-zh')"), false);
  assert.equal(sheetJs.includes('getAttribute("data-zh")'), false);
});

test("Explain posts this page name, and More links to the two locked pages", () => {
  assert.match(explainJs, /Paper 1 - Past Paper Vocabulary/);
  assert.match(explainJs, /body\.classList\.contains\("p1-vocab"\)/);
  assert.match(html, /href="\.\.\/paper-1-exam-skills\/">Paper 1 - Exam Skills →/);
  assert.match(html, /href="\.\.\/useful-vocabulary\/">Useful Vocabulary →/);
  assert.match(html, /tools-dock\.js\?v=20261022d/);
  assert.match(html, /id="zhToggle"/);
  assert.match(html, /id="dockFold"[^>]*>🛠/);
});

test("Learning Materials hub card uses the locked title and DSE + Phone pills", () => {
  const start = hub.indexOf('href="paper-1-past-paper-vocabulary/"');
  assert.equal(start !== -1, true);
  const exam = hub.indexOf('href="paper-1-exam-skills/"');
  assert.equal(exam !== -1 && exam < start, true);
  const card = hub.slice(start, hub.indexOf("</a>", start));
  assert.match(card, /<h3>Paper 1 - Past Paper Vocabulary<\/h3>/);
  assert.match(card, /badge-dse">DSE</);
  assert.match(card, /badge-phone">Phone</);
  assert.equal(card.includes("PHONE"), false);
  const folder = hub.slice(hub.indexOf('id="sec-dse-p1"'), hub.indexOf('id="sec-dse-p2"'));
  assert.equal(folder.includes('href="paper-1-past-paper-vocabulary/"'), true);
});
