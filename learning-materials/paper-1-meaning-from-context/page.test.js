import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const sheetJs = fs.readFileSync(new URL("./sheet.js", import.meta.url), "utf8");
const explainJs = fs.readFileSync(new URL("../explain.js", import.meta.url), "utf8");
const hub = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const SPEC = [
  {
    "skill": "contrast-clues",
    "theme": "Contrast clues",
    "lead": "When a sentence turns with *but*, *however*, *although* or *unlike*, the word often means the opposite of what comes on the other side.",
    "rows": [
      {
        "chip": "reluctant",
        "pos": "adj.",
        "zh": "不情願／不願意",
        "example": "The committee was <strong>reluctant</strong> to shorten the lunch break, but the principal insisted the afternoon lessons had to start earlier."
      },
      {
        "chip": "scarce",
        "pos": "adj.",
        "zh": "稀少／缺乏",
        "example": "Unlike last September, when the shops were full, bottled water was <strong>scarce</strong> after the typhoon."
      },
      {
        "chip": "adverse",
        "pos": "adj.",
        "zh": "不利的／有害的",
        "example": "The new timetable had an <strong>adverse</strong> effect on after-school training, unlike the old one, which left a clear hour for practice."
      },
      {
        "chip": "obsolete",
        "pos": "adj.",
        "zh": "過時的",
        "example": "The computer room still has a few <strong>obsolete</strong> desktops, but most classes now use the newer laptops."
      },
      {
        "chip": "drawback",
        "pos": "n.",
        "zh": "缺點",
        "example": "The harbour cruise is popular; the main <strong>drawback</strong>, however, is the long queue at the pier."
      },
      {
        "chip": "eager",
        "pos": "adj.",
        "zh": "熱切的",
        "example": "The juniors were <strong>eager</strong> to start, but the seniors wanted a longer warm-up first."
      },
      {
        "chip": "plentiful",
        "pos": "adj.",
        "zh": "充足的／豐富的",
        "example": "Unlike March, when seats were hard to get, tickets were <strong>plentiful</strong> this time and the hall was not full."
      },
      {
        "chip": "beneficial",
        "pos": "adj.",
        "zh": "有益的",
        "example": "The later start was <strong>beneficial</strong> for students who travel far, unlike the old time, which left them rushing."
      },
      {
        "chip": "current",
        "pos": "adj.",
        "zh": "現行的／最新的",
        "example": "The lab manual is <strong>current</strong>, but the map on the wall is years out of date."
      },
      {
        "chip": "asset",
        "pos": "n.",
        "zh": "有利條件",
        "example": "The covered playground is a real <strong>asset</strong> in the rainy season; the old open court, however, was often unusable."
      },
      {
        "chip": "permanent",
        "pos": "adj.",
        "zh": "永久的",
        "example": "The change to the gate time is <strong>permanent</strong>, unlike last year’s trial, which lasted only a month."
      },
      {
        "chip": "transparent",
        "pos": "adj.",
        "zh": "公開透明的",
        "example": "The marking scheme was <strong>transparent</strong>, unlike last year’s, which left students unsure how points were given."
      },
      {
        "chip": "chaotic",
        "pos": "adj.",
        "zh": "混亂的",
        "example": "The first drill was <strong>chaotic</strong>, but the second ran smoothly once everyone knew the route."
      },
      {
        "chip": "lenient",
        "pos": "adj.",
        "zh": "寬鬆的",
        "example": "The first marker was <strong>lenient</strong>, unlike the second, who took off marks for every small slip."
      },
      {
        "chip": "compulsory",
        "pos": "adj.",
        "zh": "強制的",
        "example": "The training session is <strong>compulsory</strong> for team members; club visitors, however, may stay or leave as they wish."
      },
      {
        "chip": "vague",
        "pos": "adj.",
        "zh": "含糊的",
        "example": "The first instruction was <strong>vague</strong>, but the second one named the exact page and question number."
      },
      {
        "chip": "rural",
        "pos": "adj.",
        "zh": "鄉村的",
        "example": "Her grandparents live in a <strong>rural</strong> village, unlike her own family, who live in a crowded estate in the city."
      },
      {
        "chip": "fragile",
        "pos": "adj.",
        "zh": "易碎的／脆弱的",
        "example": "The old display case is <strong>fragile</strong>, but the new one can take a knock without cracking."
      },
      {
        "chip": "complex",
        "pos": "adj.",
        "zh": "複雜的",
        "example": "The new form looks <strong>complex</strong>, unlike the old one, which asked only for a name and a date."
      },
      {
        "chip": "subtle",
        "pos": "adj.",
        "zh": "含蓄的／不易察覺的",
        "example": "The second hint is more <strong>subtle</strong>, but the first sentence states the view quite openly."
      }
    ]
  },
  {
    "skill": "example-clues",
    "theme": "Example clues",
    "lead": "Words such as *such as*, *for instance*, *including* and *along with* often introduce examples that explain the word.",
    "rows": [
      {
        "chip": "amenities",
        "pos": "n.",
        "zh": "設施／便利設施",
        "example": "The new estate offers plenty of <strong>amenities</strong>, such as a library, a clinic and a covered playground."
      },
      {
        "chip": "staple",
        "pos": "n.",
        "zh": "主食",
        "example": "Rice is still a <strong>staple</strong> in many Hong Kong households, along with other everyday foods such as noodles and bread."
      },
      {
        "chip": "appliances",
        "pos": "n.",
        "zh": "家電／用具",
        "example": "Please unplug small <strong>appliances</strong>, for instance the kettle and the toaster, before the lab is locked."
      },
      {
        "chip": "vocation",
        "pos": "n.",
        "zh": "職業／志業",
        "example": "The talk introduced several <strong>vocations</strong>, including nursing, teaching and social work."
      },
      {
        "chip": "commodities",
        "pos": "n.",
        "zh": "商品",
        "example": "The report listed everyday <strong>commodities</strong> such as cooking oil, rice and canned fish."
      },
      {
        "chip": "ingredients",
        "pos": "n.",
        "zh": "材料",
        "example": "The recipe lists everyday <strong>ingredients</strong>, such as flour, eggs and a little oil."
      },
      {
        "chip": "utensils",
        "pos": "n.",
        "zh": "用具／器皿",
        "example": "Please wash the cooking <strong>utensils</strong>, for instance the pan, the ladle and the chopping board."
      },
      {
        "chip": "beverages",
        "pos": "n.",
        "zh": "飲品",
        "example": "Cold <strong>beverages</strong>, such as water, tea and juice, will be served after the talk."
      },
      {
        "chip": "documents",
        "pos": "n.",
        "zh": "文件",
        "example": "Bring the necessary <strong>documents</strong>, including your identity card and the signed permission slip."
      },
      {
        "chip": "precautions",
        "pos": "n.",
        "zh": "預防措施",
        "example": "The leader listed several <strong>precautions</strong>, including a hat, extra water and a fully charged phone."
      },
      {
        "chip": "institutions",
        "pos": "n.",
        "zh": "機構",
        "example": "The talk introduced public <strong>institutions</strong>, such as hospitals, libraries and community centres."
      },
      {
        "chip": "genres",
        "pos": "n.",
        "zh": "類型／體裁",
        "example": "Students compared two film <strong>genres</strong>, for instance a documentary and a short comedy."
      },
      {
        "chip": "disciplines",
        "pos": "n.",
        "zh": "學科",
        "example": "The fair covered several <strong>disciplines</strong>, such as history, biology and computer science."
      },
      {
        "chip": "specimens",
        "pos": "n.",
        "zh": "標本",
        "example": "The lab displayed several <strong>specimens</strong>, including a leaf, a rock and a preserved insect."
      },
      {
        "chip": "credentials",
        "pos": "n.",
        "zh": "證明文件",
        "example": "Please bring your <strong>credentials</strong>, such as a student card and a competition entry form."
      },
      {
        "chip": "stationery",
        "pos": "n.",
        "zh": "文具",
        "example": "The bag held basic <strong>stationery</strong>, such as pencils, an eraser and a short ruler."
      },
      {
        "chip": "supplies",
        "pos": "n.",
        "zh": "物資／補給",
        "example": "The storeroom keeps emergency <strong>supplies</strong>, including torches, batteries and first-aid kits."
      },
      {
        "chip": "vehicles",
        "pos": "n.",
        "zh": "車輛",
        "example": "Only authorised <strong>vehicles</strong>, such as the school bus and the staff van, may enter the back gate."
      },
      {
        "chip": "instruments",
        "pos": "n.",
        "zh": "樂器",
        "example": "The store cupboard holds several <strong>instruments</strong>, including a keyboard, a violin and two guitars."
      },
      {
        "chip": "criteria",
        "pos": "n.",
        "zh": "準則／標準",
        "example": "The judge explained the <strong>criteria</strong>, including originality, clarity and teamwork."
      }
    ]
  },
  {
    "skill": "cause-and-effect",
    "theme": "Cause and effect",
    "lead": "Look for *because*, *so*, *as a result* and similar links. They often show what the word does, or what it leads to.",
    "rows": [
      {
        "chip": "trigger",
        "pos": "v.",
        "zh": "觸發／引發",
        "example": "A single unkind comment online can <strong>trigger</strong> a wave of complaints, so the teacher asked the class to pause before posting."
      },
      {
        "chip": "deteriorate",
        "pos": "v.",
        "zh": "惡化",
        "example": "The path <strong>deteriorated</strong> after weeks of heavy rain, and several students slipped on the way to the back gate."
      },
      {
        "chip": "incentive",
        "pos": "n.",
        "zh": "激勵／誘因",
        "example": "The school offered a small <strong>incentive</strong> for returning library books on time, and overdue rates fell as a result."
      },
      {
        "chip": "undermine",
        "pos": "v.",
        "zh": "削弱",
        "example": "Constant last-minute changes can <strong>undermine</strong> students’ confidence, because they no longer trust the plan."
      },
      {
        "chip": "boost",
        "pos": "v.",
        "zh": "提升／增強",
        "example": "Extra rehearsal time helped <strong>boost</strong> the choir’s confidence, so the concert went more smoothly."
      },
      {
        "chip": "prompt",
        "pos": "v.",
        "zh": "促使",
        "example": "A short reminder can <strong>prompt</strong> students to return their forms, so the office receives most of them by Friday."
      },
      {
        "chip": "hinder",
        "pos": "v.",
        "zh": "妨礙／阻礙",
        "example": "Heavy rain can <strong>hinder</strong> the after-school buses, so some students arrive home much later than usual."
      },
      {
        "chip": "alleviate",
        "pos": "v.",
        "zh": "減輕／紓緩",
        "example": "Extra fans were installed to <strong>alleviate</strong> the heat in the hall, and the audience felt more comfortable as a result."
      },
      {
        "chip": "aggravate",
        "pos": "v.",
        "zh": "加劇／使惡化",
        "example": "Ignoring a small leak can <strong>aggravate</strong> the damage, because water will spread under the floor."
      },
      {
        "chip": "generate",
        "pos": "v.",
        "zh": "產生",
        "example": "The charity fair can <strong>generate</strong> a useful sum for the fund, so even a small stall is worth running."
      },
      {
        "chip": "prevent",
        "pos": "v.",
        "zh": "防止",
        "example": "A clear label on the wet floor can <strong>prevent</strong> a fall, so the janitor puts one out at once."
      },
      {
        "chip": "enable",
        "pos": "v.",
        "zh": "使能夠",
        "example": "A later start would <strong>enable</strong> more students to eat breakfast, so the council asked for a trial week."
      },
      {
        "chip": "discourage",
        "pos": "v.",
        "zh": "使氣餒",
        "example": "Long queues can <strong>discourage</strong> visitors from trying the stall, so the club added a second serving table."
      },
      {
        "chip": "foster",
        "pos": "v.",
        "zh": "培養／促進",
        "example": "Weekly reading circles can <strong>foster</strong> a habit of talking about books, so more students join the library club."
      },
      {
        "chip": "force",
        "pos": "v.",
        "zh": "迫使",
        "example": "The broken lift <strong>forced</strong> the helpers to carry the boxes up the stairs, so the set-up took longer than planned."
      },
      {
        "chip": "provoke",
        "pos": "v.",
        "zh": "激起",
        "example": "A blunt comment can <strong>provoke</strong> an angry reply, so it is wiser to wait before you post."
      },
      {
        "chip": "restore",
        "pos": "v.",
        "zh": "恢復",
        "example": "The repair work <strong>restored</strong> the path, so students could use the back gate again the next week."
      },
      {
        "chip": "exhaust",
        "pos": "v.",
        "zh": "使筋疲力盡",
        "example": "Three matches in one day can <strong>exhaust</strong> the players, so the coach rotated the team in the final game."
      },
      {
        "chip": "accelerate",
        "pos": "v.",
        "zh": "加快",
        "example": "Extra clinics may <strong>accelerate</strong> progress, because students can clear their questions before the next test."
      },
      {
        "chip": "disrupt",
        "pos": "v.",
        "zh": "擾亂／打斷",
        "example": "A fire drill can <strong>disrupt</strong> a lesson, so teachers usually leave a short buffer before a test."
      }
    ]
  },
  {
    "skill": "restatement-clues",
    "theme": "Restatement clues",
    "lead": "Writers often restate a word with *in other words*, *that is*, *namely*, a dash, or a second clause that means the same thing.",
    "rows": [
      {
        "chip": "predicament",
        "pos": "n.",
        "zh": "困境",
        "example": "The hikers were in a <strong>predicament</strong> — in other words, they were stuck on the trail with no phone signal."
      },
      {
        "chip": "compact",
        "pos": "adj.",
        "zh": "小巧的／緊湊的",
        "example": "The new study desk is <strong>compact</strong>; that is, it takes up very little space in a small bedroom."
      },
      {
        "chip": "conventional",
        "pos": "adj.",
        "zh": "傳統的／慣常的",
        "example": "She ignored the <strong>conventional</strong> advice, namely that you should start with a safe topic, and wrote about a less familiar issue instead."
      },
      {
        "chip": "vital",
        "pos": "adj.",
        "zh": "極為重要的",
        "example": "Clear instructions are <strong>vital</strong> — they are essential if every group is to finish on time."
      },
      {
        "chip": "compile",
        "pos": "v.",
        "zh": "彙編／整理",
        "example": "Students had to <strong>compile</strong> a list of sources, that is, gather the articles and arrange them in one document."
      },
      {
        "chip": "abundant",
        "pos": "adj.",
        "zh": "充足的",
        "example": "Refreshments were <strong>abundant</strong> — in other words, there was more than enough food and drink for every guest."
      },
      {
        "chip": "precise",
        "pos": "adj.",
        "zh": "精確的",
        "example": "Please give a <strong>precise</strong> figure, that is, the exact number of chairs we need, not a rough guess."
      },
      {
        "chip": "genuine",
        "pos": "adj.",
        "zh": "真心的／真正的",
        "example": "Her surprise was <strong>genuine</strong> — she had not been told about the gift in advance."
      },
      {
        "chip": "optional",
        "pos": "adj.",
        "zh": "可選擇的",
        "example": "The museum workshop is <strong>optional</strong>; that is, you may join it, but it is not a required part of the trip."
      },
      {
        "chip": "temporary",
        "pos": "adj.",
        "zh": "暫時的",
        "example": "The classroom change is <strong>temporary</strong> — in other words, you will return to Room 201 after the repairs."
      },
      {
        "chip": "equivalent",
        "pos": "adj.",
        "zh": "等同的",
        "example": "One printed booklet is <strong>equivalent</strong> to the online pack; that is, they contain the same articles in the same order."
      },
      {
        "chip": "flexible",
        "pos": "adj.",
        "zh": "有彈性的",
        "example": "The deadline is <strong>flexible</strong> — in other words, you may hand in the draft a day later if you ask first."
      },
      {
        "chip": "apparent",
        "pos": "adj.",
        "zh": "明顯的／顯而易見的",
        "example": "The reason was <strong>apparent</strong>: it was clear that the late bus had caused the empty first row."
      },
      {
        "chip": "consecutive",
        "pos": "adj.",
        "zh": "連續的",
        "example": "The school won in three <strong>consecutive</strong> years — that is, in 2023, 2024 and 2025, with no gap."
      },
      {
        "chip": "anonymous",
        "pos": "adj.",
        "zh": "匿名的",
        "example": "The feedback was <strong>anonymous</strong>; in other words, no name was written on any of the slips."
      },
      {
        "chip": "redundant",
        "pos": "adj.",
        "zh": "多餘的",
        "example": "The second sentence is <strong>redundant</strong> — it merely repeats the point already made in the first."
      },
      {
        "chip": "vacant",
        "pos": "adj.",
        "zh": "空缺的",
        "example": "The post is still <strong>vacant</strong>; that is, no one has been appointed to the job yet."
      },
      {
        "chip": "identical",
        "pos": "adj.",
        "zh": "完全相同的",
        "example": "The two statements are <strong>identical</strong> — they use the same words in the same order."
      },
      {
        "chip": "gradual",
        "pos": "adj.",
        "zh": "逐漸的",
        "example": "Recovery will be <strong>gradual</strong>; that is, the improvement will come step by step, not all at once."
      },
      {
        "chip": "simultaneous",
        "pos": "adj.",
        "zh": "同時的",
        "example": "The two announcements were <strong>simultaneous</strong>; that is, they were made at the same moment in different halls."
      }
    ]
  },
  {
    "skill": "word-parts",
    "theme": "Word parts",
    "lead": "Break a long word into parts. A prefix or suffix often carries a reliable meaning (*un-* = not, *over-* = too much, *bi-* = two).",
    "rows": [
      {
        "chip": "unpredictable",
        "pos": "adj.",
        "zh": "難以預測的",
        "example": "The weather this week has been <strong>unpredictable</strong>: sunshine at dawn, then a sudden storm by recess."
      },
      {
        "chip": "overestimate",
        "pos": "v.",
        "zh": "高估",
        "example": "Do not <strong>overestimate</strong> how much you can revise in one evening; a short, focused plan works better."
      },
      {
        "chip": "bilingual",
        "pos": "adj.",
        "zh": "雙語的",
        "example": "The notice is <strong>bilingual</strong>, with English and Chinese side by side."
      },
      {
        "chip": "irreversible",
        "pos": "adj.",
        "zh": "不可逆轉的",
        "example": "Leaving the ice pack off too long may cause <strong>irreversible</strong> damage to the specimen, so the lab assistant sealed it at once."
      },
      {
        "chip": "underestimate",
        "pos": "v.",
        "zh": "低估",
        "example": "Never <strong>underestimate</strong> a short reading passage; a few careful marks can still change your grade."
      },
      {
        "chip": "inconvenient",
        "pos": "adj.",
        "zh": "不方便的",
        "example": "An 8 a.m. Saturday rehearsal is <strong>inconvenient</strong> for students who live far from school."
      },
      {
        "chip": "oversimplify",
        "pos": "v.",
        "zh": "過分簡化",
        "example": "Do not <strong>oversimplify</strong> the problem; more than one cause is mentioned in the second paragraph."
      },
      {
        "chip": "misinterpret",
        "pos": "v.",
        "zh": "誤解／曲解",
        "example": "A hurried reading can <strong>misinterpret</strong> the writer’s tone, especially when the last line turns the argument."
      },
      {
        "chip": "reconstruct",
        "pos": "v.",
        "zh": "重建",
        "example": "After the storm, volunteers helped <strong>reconstruct</strong> the damaged fence around the playground."
      },
      {
        "chip": "illogical",
        "pos": "adj.",
        "zh": "不合邏輯的",
        "example": "His plan was <strong>illogical</strong>: he wanted to print the programmes before the names had been confirmed."
      },
      {
        "chip": "interpersonal",
        "pos": "adj.",
        "zh": "人際的",
        "example": "The workshop focused on <strong>interpersonal</strong> skills, such as listening carefully and speaking politely in a group."
      },
      {
        "chip": "multinational",
        "pos": "adj.",
        "zh": "跨國的",
        "example": "She hopes to work for a <strong>multinational</strong> company that has offices in more than one country."
      },
      {
        "chip": "inconsiderate",
        "pos": "adj.",
        "zh": "不體諒的",
        "example": "It was <strong>inconsiderate</strong> to leave the sports bags in the aisle, because other students had no room to pass."
      },
      {
        "chip": "preconception",
        "pos": "n.",
        "zh": "成見／先入為主的看法",
        "example": "Try to set aside any <strong>preconception</strong> about the book before you read the first chapter."
      },
      {
        "chip": "biannual",
        "pos": "adj.",
        "zh": "一年兩次的",
        "example": "The magazine is <strong>biannual</strong>, so a new issue appears twice a year."
      },
      {
        "chip": "overconfident",
        "pos": "adj.",
        "zh": "過分自信的",
        "example": "He was <strong>overconfident</strong> about the quiz and barely revised, so the result was a shock."
      },
      {
        "chip": "imbalance",
        "pos": "n.",
        "zh": "不平衡",
        "example": "An <strong>imbalance</strong> in the timetable left Monday packed and Friday almost empty."
      },
      {
        "chip": "reorganise",
        "pos": "v.",
        "zh": "重新整理／重組",
        "example": "We need to <strong>reorganise</strong> the storeroom so that the sports equipment is easier to find."
      },
      {
        "chip": "disrespectful",
        "pos": "adj.",
        "zh": "不尊重的",
        "example": "It is <strong>disrespectful</strong> to talk over a classmate who is presenting, even if you already know the answer."
      },
      {
        "chip": "underperform",
        "pos": "v.",
        "zh": "發揮低於水準",
        "example": "Several usually strong runners <strong>underperformed</strong> in the heat, and their times were well below last week’s."
      }
    ]
  },
  {
    "skill": "inference",
    "theme": "Inference",
    "lead": "Sometimes no phrase restates the word. Use the details in the sentence to infer the meaning.",
    "rows": [
      {
        "chip": "grim",
        "pos": "adj.",
        "zh": "嚴峻的／令人沮喪的",
        "example": "The first paragraph painted a <strong>grim</strong> picture of the river: dead fish, a sharp smell, and no one willing to walk along the bank."
      },
      {
        "chip": "strained",
        "pos": "adj.",
        "zh": "緊張的",
        "example": "After the argument, their conversation was <strong>strained</strong>; they spoke only when they had to."
      },
      {
        "chip": "lukewarm",
        "pos": "adj.",
        "zh": "反應冷淡的",
        "example": "The proposal received a <strong>lukewarm</strong> response: a few polite nods, but no one volunteered."
      },
      {
        "chip": "hasty",
        "pos": "adj.",
        "zh": "倉促的",
        "example": "It was a <strong>hasty</strong> decision to cancel the match after two drops of rain; the court was dry ten minutes later."
      },
      {
        "chip": "grudging",
        "pos": "adj.",
        "zh": "勉強的",
        "example": "He offered a <strong>grudging</strong> apology, with no eye contact and a half-finished sentence."
      },
      {
        "chip": "barren",
        "pos": "adj.",
        "zh": "貧瘠的／荒蕪的",
        "example": "The hillside was <strong>barren</strong>: no trees, no shade, and only loose stone underfoot."
      },
      {
        "chip": "frantic",
        "pos": "adj.",
        "zh": "忙亂的",
        "example": "Staff were <strong>frantic</strong> before the open day, rushing from the hall to the gate with boxes still unpacked."
      },
      {
        "chip": "weary",
        "pos": "adj.",
        "zh": "疲倦的",
        "example": "After three periods of rehearsal, the dancers looked <strong>weary</strong>; several sat on the floor and no one spoke."
      },
      {
        "chip": "solemn",
        "pos": "adj.",
        "zh": "莊重的／嚴肅的",
        "example": "The hall was <strong>solemn</strong> as the names were read; nobody whispered or reached for a phone."
      },
      {
        "chip": "restless",
        "pos": "adj.",
        "zh": "坐立不安的",
        "example": "The younger pupils grew <strong>restless</strong> during the long speech, shifting in their seats and glancing at the clock."
      },
      {
        "chip": "brisk",
        "pos": "adj.",
        "zh": "乾脆利落的",
        "example": "The teacher’s tone was <strong>brisk</strong>: short instructions, no extra chat, and the class lined up at once."
      },
      {
        "chip": "uneasy",
        "pos": "adj.",
        "zh": "不安的",
        "example": "He looked <strong>uneasy</strong> at the door, checking his bag twice and not stepping in until he was called."
      },
      {
        "chip": "stark",
        "pos": "adj.",
        "zh": "空蕩蕩的／簡陋的",
        "example": "The room was <strong>stark</strong>, with bare walls, one desk and no posters."
      },
      {
        "chip": "muted",
        "pos": "adj.",
        "zh": "低調的",
        "example": "The celebration was <strong>muted</strong>: a short clap, then everyone went quietly back to class."
      },
      {
        "chip": "cluttered",
        "pos": "adj.",
        "zh": "雜亂的",
        "example": "His desk was <strong>cluttered</strong>, with notes, cables and three empty cups covering the keyboard."
      },
      {
        "chip": "deserted",
        "pos": "adj.",
        "zh": "空無一人的",
        "example": "The bus stop was <strong>deserted</strong> at nine, with not a single student left on the bench."
      },
      {
        "chip": "harsh",
        "pos": "adj.",
        "zh": "苛刻的",
        "example": "The teacher’s comment was <strong>harsh</strong>: she listed every fault and offered no word of encouragement."
      },
      {
        "chip": "vibrant",
        "pos": "adj.",
        "zh": "充滿活力的",
        "example": "The street market was <strong>vibrant</strong>, with bright stalls and a crowd moving in every direction."
      },
      {
        "chip": "neglected",
        "pos": "adj.",
        "zh": "疏於打理的",
        "example": "The noticeboard looked <strong>neglected</strong>: faded papers, a torn corner, and dates from last term still pinned up."
      },
      {
        "chip": "rigid",
        "pos": "adj.",
        "zh": "死板的",
        "example": "His schedule was <strong>rigid</strong>; he would not move a single slot, even when the guest speaker arrived late."
      }
    ]
  },
  {
    "skill": "reference-in-the-sentence",
    "theme": "Reference in the sentence",
    "lead": "*This*, *these*, *such* and a following clause often point back to the word and show what it stands for.",
    "rows": [
      {
        "chip": "initiative",
        "pos": "n.",
        "zh": "新措施／倡議",
        "example": "The class started a food-waste <strong>initiative</strong>: this scheme asked every group to weigh leftovers after lunch."
      },
      {
        "chip": "phenomenon",
        "pos": "n.",
        "zh": "現象",
        "example": "Queueing overnight for a concert ticket is a familiar <strong>phenomenon</strong>; this behaviour appears every time a popular singer announces a show."
      },
      {
        "chip": "setback",
        "pos": "n.",
        "zh": "挫折／阻礙",
        "example": "A burst pipe in the hall was a serious <strong>setback</strong>, and this delay forced the drama club to move the dress rehearsal."
      },
      {
        "chip": "claim",
        "pos": "n.",
        "zh": "說法／聲稱",
        "example": "The article made a bold <strong>claim</strong>: that one new line would cut travel time in half. Readers were asked to judge this statement against the figures."
      },
      {
        "chip": "measure",
        "pos": "n.",
        "zh": "措施",
        "example": "The canteen introduced two new <strong>measures</strong>, including a tray-return point and a water refill station, to cut disposable cup use."
      },
      {
        "chip": "campaign",
        "pos": "n.",
        "zh": "運動／活動",
        "example": "The school launched a quiet-corridor <strong>campaign</strong>; this effort asked students to keep their voices down between lessons."
      },
      {
        "chip": "policy",
        "pos": "n.",
        "zh": "政策",
        "example": "A new homework <strong>policy</strong> was introduced, and this rule limited weekday assignments to two subjects."
      },
      {
        "chip": "tendency",
        "pos": "n.",
        "zh": "傾向",
        "example": "There is a growing <strong>tendency</strong> to cycle to school; this trend is clearest among Form 4 students."
      },
      {
        "chip": "obstacle",
        "pos": "n.",
        "zh": "障礙",
        "example": "A locked side gate proved a serious <strong>obstacle</strong>; this barrier forced latecomers to walk all the way to the main entrance."
      },
      {
        "chip": "strategy",
        "pos": "n.",
        "zh": "策略",
        "example": "The team tried a new <strong>strategy</strong>: this plan put the fastest runner last in the relay."
      },
      {
        "chip": "restriction",
        "pos": "n.",
        "zh": "限制",
        "example": "The library placed a <strong>restriction</strong> on group talk, and this limit applied only during exam week."
      },
      {
        "chip": "outcome",
        "pos": "n.",
        "zh": "結果",
        "example": "The trial had a clear <strong>outcome</strong>: this result showed that a later lunch cut queue times by half."
      },
      {
        "chip": "conflict",
        "pos": "n.",
        "zh": "衝突",
        "example": "A <strong>conflict</strong> arose over rehearsal space; this dispute was settled when the two clubs agreed to share the hall."
      },
      {
        "chip": "arrangement",
        "pos": "n.",
        "zh": "安排",
        "example": "A special seating <strong>arrangement</strong> was made for the concert, and this layout kept the choir close to the piano."
      },
      {
        "chip": "allegation",
        "pos": "n.",
        "zh": "指控",
        "example": "The article made an <strong>allegation</strong> about unsafe scaffolding, and this charge was later withdrawn with an apology."
      },
      {
        "chip": "approach",
        "pos": "n.",
        "zh": "方法／做法",
        "example": "The teacher tried a different <strong>approach</strong>; this method began with a short experiment instead of a long explanation."
      },
      {
        "chip": "practice",
        "pos": "n.",
        "zh": "做法／慣例",
        "example": "Leaving bags in the aisle is a risky <strong>practice</strong>; this habit has already caused two falls this term."
      },
      {
        "chip": "priority",
        "pos": "n.",
        "zh": "首要事項",
        "example": "Safety is the first <strong>priority</strong> on the trip; this concern comes before any plan to reach the summit."
      },
      {
        "chip": "contribution",
        "pos": "n.",
        "zh": "貢獻",
        "example": "Her <strong>contribution</strong> was practical: this help took the form of a seating plan for the whole hall."
      },
      {
        "chip": "pattern",
        "pos": "n.",
        "zh": "模式／規律",
        "example": "A clear <strong>pattern</strong> appeared in the results; this regularity showed that most errors came from the last section."
      }
    ]
  },
  {
    "skill": "degree-and-limitation",
    "theme": "Degree and limitation",
    "lead": "Words of degree tell you *how much*. Compare them with the figure or example in the same sentence.",
    "rows": [
      {
        "chip": "marginally",
        "pos": "adv.",
        "zh": "只是輕微地",
        "example": "Scores improved only <strong>marginally</strong>, from 62 to 63, so the teacher did not treat it as a big jump."
      },
      {
        "chip": "substantially",
        "pos": "adv.",
        "zh": "大幅度地",
        "example": "After the extra clinics, attendance rose <strong>substantially</strong>, and the hall was nearly full."
      },
      {
        "chip": "negligible",
        "pos": "adj.",
        "zh": "微不足道的",
        "example": "The difference in price was <strong>negligible</strong> — only two dollars — so most students chose the closer shop."
      },
      {
        "chip": "drastic",
        "pos": "adj.",
        "zh": "激烈的／大幅度的",
        "example": "Closing the cycle track overnight would be a <strong>drastic</strong> step; a short trial at weekends would be milder."
      },
      {
        "chip": "relatively",
        "pos": "adv.",
        "zh": "相對地",
        "example": "The second passage is <strong>relatively</strong> short, but the questions are denser than those in Part A."
      },
      {
        "chip": "considerable",
        "pos": "adj.",
        "zh": "相當大的",
        "example": "There was a <strong>considerable</strong> gap, of almost twenty marks, between the two papers."
      },
      {
        "chip": "excessive",
        "pos": "adj.",
        "zh": "過度的／過高的",
        "example": "A thirty-dollar fee for one photocopy would be <strong>excessive</strong>; the usual charge is two dollars."
      },
      {
        "chip": "modest",
        "pos": "adj.",
        "zh": "不大的／適中的",
        "example": "The prize was <strong>modest</strong> — a book voucher of fifty dollars — but the winner still looked delighted."
      },
      {
        "chip": "immense",
        "pos": "adj.",
        "zh": "巨大的",
        "example": "The library has an <strong>immense</strong> collection, with more than ten thousand titles on the open shelves."
      },
      {
        "chip": "minimal",
        "pos": "adj.",
        "zh": "極小的",
        "example": "The delay was <strong>minimal</strong>, only two minutes, and the train still arrived before eight."
      },
      {
        "chip": "profound",
        "pos": "adj.",
        "zh": "深刻的／重大的",
        "example": "The talk had a <strong>profound</strong> effect on the class; several students changed their project topics afterwards."
      },
      {
        "chip": "widespread",
        "pos": "adj.",
        "zh": "廣泛的",
        "example": "Complaints were <strong>widespread</strong>: every class in Form 4 had sent a similar note."
      },
      {
        "chip": "marked",
        "pos": "adj.",
        "zh": "明顯的",
        "example": "There was a <strong>marked</strong> improvement, from 54 to 71, after the extra reading practice."
      },
      {
        "chip": "sheer",
        "pos": "adj.",
        "zh": "十足的／純粹的",
        "example": "The <strong>sheer</strong> size of the hall, which holds eight hundred people, surprised the first-time visitors."
      },
      {
        "chip": "steep",
        "pos": "adj.",
        "zh": "急劇的",
        "example": "There was a <strong>steep</strong> rise in applications, from 20 last year to more than 90 now."
      },
      {
        "chip": "handful",
        "pos": "n.",
        "zh": "少量",
        "example": "Only a <strong>handful</strong> of tickets remained, fewer than ten, by the end of lunch."
      },
      {
        "chip": "bulk",
        "pos": "n.",
        "zh": "大部分",
        "example": "The <strong>bulk</strong> of the donations, about 80 per cent, came from students already at the school."
      },
      {
        "chip": "peak",
        "pos": "n.",
        "zh": "高峰",
        "example": "Attendance reached a <strong>peak</strong> of 420 in October, then fell back in the colder months."
      },
      {
        "chip": "maximum",
        "pos": "adj.",
        "zh": "最大的",
        "example": "The lift has a <strong>maximum</strong> load of eight people, so larger groups must wait for a second trip."
      },
      {
        "chip": "overall",
        "pos": "adv.",
        "zh": "總體上",
        "example": "Scores were higher <strong>overall</strong>, with the class average up by six marks."
      }
    ]
  },
  {
    "skill": "how-much-and-how-far",
    "theme": "How much, and how far",
    "lead": "These words limit or widen a statement. Read the example that follows before you settle on a meaning.",
    "rows": [
      {
        "chip": "predominantly",
        "pos": "adv.",
        "zh": "主要地",
        "example": "The audience was <strong>predominantly</strong> students, with only a handful of parents at the back."
      },
      {
        "chip": "merely",
        "pos": "adv.",
        "zh": "只不過",
        "example": "The notice was <strong>merely</strong> a reminder, not a new rule."
      },
      {
        "chip": "sparse",
        "pos": "adj.",
        "zh": "稀疏的",
        "example": "Shade was <strong>sparse</strong> along the new path, so the teacher told the class to bring a hat."
      },
      {
        "chip": "ample",
        "pos": "adj.",
        "zh": "充足的",
        "example": "There was <strong>ample</strong> time to reread Part B before the end of the paper."
      },
      {
        "chip": "solely",
        "pos": "adv.",
        "zh": "僅僅／只限於",
        "example": "The room is <strong>solely</strong> for music practice; please do not eat there."
      },
      {
        "chip": "partially",
        "pos": "adv.",
        "zh": "部分地",
        "example": "The hall was only <strong>partially</strong> decorated, with the back wall still bare."
      },
      {
        "chip": "entirely",
        "pos": "adv.",
        "zh": "完全地",
        "example": "The rumour was <strong>entirely</strong> false; not a single date on the notice had been changed."
      },
      {
        "chip": "virtually",
        "pos": "adv.",
        "zh": "幾乎／差不多",
        "example": "The hall was <strong>virtually</strong> full, with only two seats left in the back row."
      },
      {
        "chip": "moderately",
        "pos": "adv.",
        "zh": "適度地",
        "example": "Prices rose only <strong>moderately</strong>, by about three per cent, so the canteen kept the same set meal."
      },
      {
        "chip": "approximately",
        "pos": "adv.",
        "zh": "大約",
        "example": "The museum visit lasts <strong>approximately</strong> two hours, including the short film."
      },
      {
        "chip": "occasionally",
        "pos": "adv.",
        "zh": "偶爾",
        "example": "The ferry is <strong>occasionally</strong> late in a strong wind, but most sailings run on time."
      },
      {
        "chip": "invariably",
        "pos": "adv.",
        "zh": "總是／每次都",
        "example": "He is <strong>invariably</strong> early; the classroom lights are already on when the rest of us arrive."
      },
      {
        "chip": "faintly",
        "pos": "adv.",
        "zh": "微弱地",
        "example": "The announcement was only <strong>faintly</strong> audible at the back, so the teacher repeated it."
      },
      {
        "chip": "extensively",
        "pos": "adv.",
        "zh": "廣泛地",
        "example": "The article was <strong>extensively</strong> revised, with almost every paragraph rewritten."
      },
      {
        "chip": "barely",
        "pos": "adv.",
        "zh": "僅僅／幾乎不",
        "example": "She had <strong>barely</strong> sat down when the bell rang for the next lesson."
      },
      {
        "chip": "overwhelmingly",
        "pos": "adv.",
        "zh": "壓倒性地",
        "example": "The vote was <strong>overwhelmingly</strong> in favour, with 28 for and only two against."
      },
      {
        "chip": "steadily",
        "pos": "adv.",
        "zh": "穩步地",
        "example": "Attendance has risen <strong>steadily</strong>, from 40 in September to nearly 70 now."
      },
      {
        "chip": "noticeably",
        "pos": "adv.",
        "zh": "明顯地",
        "example": "The second recording was <strong>noticeably</strong> clearer, and every word could be heard."
      },
      {
        "chip": "somewhat",
        "pos": "adv.",
        "zh": "有些／稍微",
        "example": "The second draft was <strong>somewhat</strong> clearer, though the ending still needed work."
      },
      {
        "chip": "altogether",
        "pos": "adv.",
        "zh": "總共",
        "example": "The two delays added up to twenty minutes <strong>altogether</strong>, not the hour some students claimed."
      }
    ]
  },
  {
    "skill": "judgement-words",
    "theme": "Judgement words",
    "lead": "Writers often judge an idea as strong or weak. Use the reason in the same sentence to confirm the word.",
    "rows": [
      {
        "chip": "flawed",
        "pos": "adj.",
        "zh": "有缺陷的",
        "example": "The plan was <strong>flawed</strong>: it looked neat on paper, but nobody had checked whether the hall was free."
      },
      {
        "chip": "compelling",
        "pos": "adj.",
        "zh": "有說服力的",
        "example": "She made a <strong>compelling</strong> case for a later start, with clear figures and calm examples."
      },
      {
        "chip": "dubious",
        "pos": "adj.",
        "zh": "可疑的",
        "example": "The article made some <strong>dubious</strong> claims, with no source given for the most striking figure."
      },
      {
        "chip": "constructive",
        "pos": "adj.",
        "zh": "建設性的",
        "example": "The comments were <strong>constructive</strong>: they pointed out what to change and how to change it."
      },
      {
        "chip": "superficial",
        "pos": "adj.",
        "zh": "表面的／膚淺的",
        "example": "A <strong>superficial</strong> reading will miss the contrast in paragraph 3; slow down for the turn at however."
      },
      {
        "chip": "biased",
        "pos": "adj.",
        "zh": "有偏見的／偏頗的",
        "example": "The report was <strong>biased</strong>: it quoted only supporters of the plan and ignored the complaints."
      },
      {
        "chip": "unconvincing",
        "pos": "adj.",
        "zh": "難以令人信服的",
        "example": "His excuse was <strong>unconvincing</strong>, because several classmates had seen him still in the playground."
      },
      {
        "chip": "rigorous",
        "pos": "adj.",
        "zh": "嚴謹的",
        "example": "The marking was <strong>rigorous</strong>: every answer was checked twice against the same list of points."
      },
      {
        "chip": "justified",
        "pos": "adj.",
        "zh": "合理的／有根據的",
        "example": "The late start was <strong>justified</strong>, since the storm warning was still in force at seven."
      },
      {
        "chip": "inadequate",
        "pos": "adj.",
        "zh": "不足的／不夠的",
        "example": "Two bins were <strong>inadequate</strong> for sports day, and rubbish bags were soon left on the ground."
      },
      {
        "chip": "coherent",
        "pos": "adj.",
        "zh": "連貫的／條理分明的",
        "example": "Her argument was <strong>coherent</strong>: each paragraph followed clearly from the one before."
      },
      {
        "chip": "exaggerated",
        "pos": "adj.",
        "zh": "誇大的",
        "example": "The poster made an <strong>exaggerated</strong> claim, promising that one drink would change a student’s whole life."
      },
      {
        "chip": "inconsistent",
        "pos": "adj.",
        "zh": "不一致的",
        "example": "The two witnesses gave <strong>inconsistent</strong> accounts: one mentioned a red bus, the other a minibus."
      },
      {
        "chip": "premature",
        "pos": "adj.",
        "zh": "過早的",
        "example": "It would be <strong>premature</strong> to announce a winner before every ballot has been counted."
      },
      {
        "chip": "valid",
        "pos": "adj.",
        "zh": "有效的／站得住腳的",
        "example": "The complaint was <strong>valid</strong>, because the printed map omitted the closed entrance."
      },
      {
        "chip": "thorough",
        "pos": "adj.",
        "zh": "徹底的／周全的",
        "example": "A <strong>thorough</strong> check of the lab list showed that three items were still missing."
      },
      {
        "chip": "unsound",
        "pos": "adj.",
        "zh": "不合理的／站不住腳的",
        "example": "The advice was <strong>unsound</strong>, as it ignored the school’s own safety rules."
      },
      {
        "chip": "conclusive",
        "pos": "adj.",
        "zh": "確鑿的／決定性的",
        "example": "The video was <strong>conclusive</strong>: it showed the bag being left at the gate, so the argument ended there."
      },
      {
        "chip": "misleading",
        "pos": "adj.",
        "zh": "誤導的",
        "example": "The headline was <strong>misleading</strong>, because the full article described only a trial, not a final decision."
      },
      {
        "chip": "outstanding",
        "pos": "adj.",
        "zh": "出色的",
        "example": "The choir gave an <strong>outstanding</strong> performance, with not a single late entry."
      }
    ]
  },
  {
    "skill": "tone-and-attitude",
    "theme": "Tone and attitude",
    "lead": "The words around a description often show how the writer feels. Use that tone to pin down the word.",
    "rows": [
      {
        "chip": "sarcastic",
        "pos": "adj.",
        "zh": "諷刺的",
        "example": "When he called the 200-word essay a light warm-up, his tone was <strong>sarcastic</strong>, not kind."
      },
      {
        "chip": "sympathetic",
        "pos": "adj.",
        "zh": "體諒的／有同情心的",
        "example": "The counsellor was <strong>sympathetic</strong> when the student explained why the homework was late, and helped her make a new plan."
      },
      {
        "chip": "dismissive",
        "pos": "adj.",
        "zh": "不屑的／輕視的",
        "example": "The review was <strong>dismissive</strong> of the film, waving it away as just another sequel."
      },
      {
        "chip": "optimistic",
        "pos": "adj.",
        "zh": "樂觀的",
        "example": "Despite the tight deadline, the team stayed <strong>optimistic</strong> and believed the display would be ready."
      },
      {
        "chip": "sceptical",
        "pos": "adj.",
        "zh": "懷疑的",
        "example": "Several parents were <strong>sceptical</strong> about the new app until they had seen how it actually worked."
      },
      {
        "chip": "cynical",
        "pos": "adj.",
        "zh": "憤世嫉俗的",
        "example": "He gave a <strong>cynical</strong> smile when the leaflet promised free gifts for everyone, as if he already knew the catch."
      },
      {
        "chip": "enthusiastic",
        "pos": "adj.",
        "zh": "熱心的／熱情的",
        "example": "The class was <strong>enthusiastic</strong> about the outing, and several students stayed behind to help with the packing."
      },
      {
        "chip": "indifferent",
        "pos": "adj.",
        "zh": "漠不關心的",
        "example": "She seemed <strong>indifferent</strong> to the result, shrugging and walking off before the scores were even read."
      },
      {
        "chip": "resentful",
        "pos": "adj.",
        "zh": "憤憤不平的",
        "example": "He was <strong>resentful</strong> about the new seating plan, muttering that he had not been asked for his view."
      },
      {
        "chip": "cautious",
        "pos": "adj.",
        "zh": "謹慎的",
        "example": "The librarian was <strong>cautious</strong> about the new system and tested it with one class before opening it to all."
      },
      {
        "chip": "hostile",
        "pos": "adj.",
        "zh": "敵對的",
        "example": "A few comments online were <strong>hostile</strong>, attacking the organiser rather than discussing the plan."
      },
      {
        "chip": "defensive",
        "pos": "adj.",
        "zh": "防備的／護短的",
        "example": "She became <strong>defensive</strong> when asked about the missing props, and blamed everyone except her own team."
      },
      {
        "chip": "frank",
        "pos": "adj.",
        "zh": "坦率的",
        "example": "The coach was <strong>frank</strong> about the team’s weaknesses, and nobody was left wondering what to improve."
      },
      {
        "chip": "complimentary",
        "pos": "adj.",
        "zh": "讚賞的",
        "example": "The review was <strong>complimentary</strong>, praising the clear plot and the calm performances."
      },
      {
        "chip": "nostalgic",
        "pos": "adj.",
        "zh": "懷舊的",
        "example": "The old photo display made some alumni <strong>nostalgic</strong>, and they lingered over pictures of the old hall."
      },
      {
        "chip": "impatient",
        "pos": "adj.",
        "zh": "不耐煩的",
        "example": "The queue grew <strong>impatient</strong> when the machine jammed, and several people began to complain out loud."
      },
      {
        "chip": "arrogant",
        "pos": "adj.",
        "zh": "傲慢的",
        "example": "His tone was <strong>arrogant</strong>; he talked as if no other idea could possibly be as good as his."
      },
      {
        "chip": "sincere",
        "pos": "adj.",
        "zh": "真誠的",
        "example": "Her apology was <strong>sincere</strong>: she looked at the teammate she had interrupted and did not make the same mistake again."
      },
      {
        "chip": "humble",
        "pos": "adj.",
        "zh": "謙虛的",
        "example": "The winner was <strong>humble</strong> in her speech, giving credit to the whole team rather than to herself."
      },
      {
        "chip": "gloomy",
        "pos": "adj.",
        "zh": "悲觀的",
        "example": "He was <strong>gloomy</strong> about the second half, and kept saying the team had already lost."
      }
    ]
  },
  {
    "skill": "formal-and-informal",
    "theme": "Formal and informal",
    "lead": "In Paper 1, a more formal word often appears in reports, notices and official letters. Use 譯 for the everyday Chinese meaning.",
    "rows": [
      {
        "chip": "commence",
        "pos": "v.",
        "zh": "開始（較正式）",
        "example": "The briefing will <strong>commence</strong> at 8:15 a.m. sharp."
      },
      {
        "chip": "obtain",
        "pos": "v.",
        "zh": "取得（較正式）",
        "example": "Students must <strong>obtain</strong> a parent’s signature before the trip."
      },
      {
        "chip": "reside",
        "pos": "v.",
        "zh": "居住（較正式）",
        "example": "Applicants should <strong>reside</strong> in the district, or have a close family member who does."
      },
      {
        "chip": "cease",
        "pos": "v.",
        "zh": "停止（較正式）",
        "example": "Please <strong>cease</strong> talking when the exam paper is being given out."
      },
      {
        "chip": "request",
        "pos": "v.",
        "zh": "要求／請求（較正式）",
        "example": "Visitors are <strong>requested</strong> to sign in at the general office."
      },
      {
        "chip": "notify",
        "pos": "v.",
        "zh": "通知（較正式）",
        "example": "Parents will be <strong>notified</strong> by email if the match is cancelled."
      },
      {
        "chip": "submit",
        "pos": "v.",
        "zh": "提交（較正式）",
        "example": "Please <strong>submit</strong> the permission slip to the general office by Friday."
      },
      {
        "chip": "postpone",
        "pos": "v.",
        "zh": "延期（較正式）",
        "example": "The concert will be <strong>postponed</strong> until the hall repairs are complete."
      },
      {
        "chip": "terminate",
        "pos": "v.",
        "zh": "終止（較正式）",
        "example": "The trial arrangement will <strong>terminate</strong> at the end of this month."
      },
      {
        "chip": "allocate",
        "pos": "v.",
        "zh": "分配（較正式）",
        "example": "The office will <strong>allocate</strong> lockers according to class number."
      },
      {
        "chip": "proceed",
        "pos": "v.",
        "zh": "繼續進行（較正式）",
        "example": "After the briefing, the tour will <strong>proceed</strong> to the science block."
      },
      {
        "chip": "retain",
        "pos": "v.",
        "zh": "保留（較正式）",
        "example": "Students may <strong>retain</strong> their textbooks over the summer if they have signed the form."
      },
      {
        "chip": "convene",
        "pos": "v.",
        "zh": "召開（較正式）",
        "example": "The committee will <strong>convene</strong> at 4 p.m. in the conference room."
      },
      {
        "chip": "specify",
        "pos": "v.",
        "zh": "指明／註明（較正式）",
        "example": "The notice <strong>specifies</strong> the items students should bring, including a water bottle and a hat."
      },
      {
        "chip": "enquire",
        "pos": "v.",
        "zh": "查詢（較正式）",
        "example": "Visitors should <strong>enquire</strong> at the general office for a visitor badge."
      },
      {
        "chip": "appoint",
        "pos": "v.",
        "zh": "委任（較正式）",
        "example": "The council will <strong>appoint</strong> a new secretary at its next meeting."
      },
      {
        "chip": "ensure",
        "pos": "v.",
        "zh": "確保（較正式）",
        "example": "Staff will <strong>ensure</strong> that all exits remain clear during the drill."
      },
      {
        "chip": "implement",
        "pos": "v.",
        "zh": "實施（較正式）",
        "example": "The school will <strong>implement</strong> the new timetable in January."
      },
      {
        "chip": "require",
        "pos": "v.",
        "zh": "規定／必須（較正式）",
        "example": "All participants are <strong>required</strong> to wear sports shoes on the field."
      },
      {
        "chip": "acknowledge",
        "pos": "v.",
        "zh": "知悉／承認（較正式）",
        "example": "The letter <strong>acknowledged</strong> the parents’ concerns and set out a new pick-up time."
      }
    ]
  },
  {
    "skill": "words-that-go-together",
    "theme": "Words that go together",
    "lead": "Some verbs have typical partners. Learn the whole phrase, then use the rest of the sentence to confirm the meaning.",
    "rows": [
      {
        "chip": "pose a threat",
        "pos": "phrase",
        "zh": "構成威脅",
        "example": "Abandoned bicycles can <strong>pose a threat</strong> to people walking through the back lane."
      },
      {
        "chip": "play a role",
        "pos": "phrase",
        "zh": "發揮作用",
        "example": "Parent volunteers <strong>play a key role</strong> in the reading week."
      },
      {
        "chip": "raise awareness",
        "pos": "phrase",
        "zh": "提高意識",
        "example": "The poster campaign aimed to <strong>raise awareness</strong> of heatstroke on sports day."
      },
      {
        "chip": "take into account",
        "pos": "phrase",
        "zh": "考慮到",
        "example": "When choosing a venue, <strong>take into account</strong> the time needed to travel back to school."
      },
      {
        "chip": "reach a consensus",
        "pos": "phrase",
        "zh": "達成共識",
        "example": "After a long discussion, the committee managed to <strong>reach a consensus</strong> on the theme."
      },
      {
        "chip": "bear in mind",
        "pos": "phrase",
        "zh": "緊記",
        "example": "When you pack for the field trip, <strong>bear in mind</strong> that the trail is steep and shade is limited."
      },
      {
        "chip": "pave the way",
        "pos": "phrase",
        "zh": "為…鋪路",
        "example": "Last year’s trial run helped <strong>pave the way</strong> for a full recycling scheme this term."
      },
      {
        "chip": "shed light on",
        "pos": "phrase",
        "zh": "闡明／揭示",
        "example": "The interview may <strong>shed light on</strong> why so few students signed up for the course."
      },
      {
        "chip": "take pride in",
        "pos": "phrase",
        "zh": "以…為榮",
        "example": "The prefects <strong>take pride in</strong> the garden they planted, and they water it every morning."
      },
      {
        "chip": "draw attention to",
        "pos": "phrase",
        "zh": "使注意",
        "example": "The article <strong>drew attention to</strong> the lack of drinking fountains on the top floor."
      },
      {
        "chip": "keep pace with",
        "pos": "phrase",
        "zh": "跟上",
        "example": "Some readers struggle to <strong>keep pace with</strong> the speaker if the recording is played only once."
      },
      {
        "chip": "run the risk",
        "pos": "phrase",
        "zh": "冒…的風險",
        "example": "If you leave your bag in the corridor, you <strong>run the risk</strong> of someone taking it by mistake."
      },
      {
        "chip": "bring about",
        "pos": "phrase",
        "zh": "引致／帶來",
        "example": "A short change to the timetable can <strong>bring about</strong> longer queues at the canteen."
      },
      {
        "chip": "come to terms with",
        "pos": "phrase",
        "zh": "接受（不如意的事）",
        "example": "It took him a week to <strong>come to terms with</strong> the cancelled trip and start planning a new outing."
      },
      {
        "chip": "set an example",
        "pos": "phrase",
        "zh": "樹立榜樣",
        "example": "Senior students are asked to <strong>set an example</strong> by lining up quietly at the gate."
      },
      {
        "chip": "make a difference",
        "pos": "phrase",
        "zh": "有作用／帶來改變",
        "example": "A few extra chairs in the corridor can <strong>make a difference</strong> when parents arrive for the concert."
      },
      {
        "chip": "put emphasis on",
        "pos": "phrase",
        "zh": "強調",
        "example": "The coach <strong>put emphasis on</strong> safety, and every player had to wear a helmet."
      },
      {
        "chip": "take advantage of",
        "pos": "phrase",
        "zh": "利用",
        "example": "Students can <strong>take advantage of</strong> the early opening and revise in the library before assembly."
      },
      {
        "chip": "hold accountable",
        "pos": "phrase",
        "zh": "要…負責",
        "example": "The notice <strong>held team leaders accountable</strong> for packing away the equipment."
      },
      {
        "chip": "live up to",
        "pos": "phrase",
        "zh": "達到（期望）",
        "example": "The sequel did not <strong>live up to</strong> the excitement promised in the trailer."
      }
    ]
  },
  {
    "skill": "mixed-review",
    "theme": "Mixed review",
    "lead": "Use any clue that helps: contrast, example, result, restatement, or inference.",
    "rows": [
      {
        "chip": "resilient",
        "pos": "adj.",
        "zh": "有韌性的",
        "example": "The team was <strong>resilient</strong>: after a poor first half, they changed their plan and finished strongly."
      },
      {
        "chip": "compromise",
        "pos": "n.",
        "zh": "折衷／妥協",
        "example": "They reached a <strong>compromise</strong>: the fair would be shorter, but every class would still have a stall."
      },
      {
        "chip": "feasible",
        "pos": "adj.",
        "zh": "可行的",
        "example": "A weekday visit is not <strong>feasible</strong>, because the museum opens after school hours only on Saturday."
      },
      {
        "chip": "escalate",
        "pos": "v.",
        "zh": "升級／加劇",
        "example": "A small disagreement can <strong>escalate</strong> in a group chat if nobody steps in early."
      },
      {
        "chip": "advocate",
        "pos": "v.",
        "zh": "主張／倡議",
        "example": "Several students <strong>advocate</strong> a longer lunch break, and they have written to the council about it."
      },
      {
        "chip": "plausible",
        "pos": "adj.",
        "zh": "看似合理的／可信的",
        "example": "The explanation sounded <strong>plausible</strong>; that is, it fitted the signal failure already reported on the news."
      },
      {
        "chip": "versatile",
        "pos": "adj.",
        "zh": "多用途的",
        "example": "A tablet is a <strong>versatile</strong> tool: you can read notes, record a presentation or sketch a diagram on it."
      },
      {
        "chip": "inevitable",
        "pos": "adj.",
        "zh": "不可避免的",
        "example": "With only one microphone and three speakers, a short delay between acts was <strong>inevitable</strong>."
      },
      {
        "chip": "prudent",
        "pos": "adj.",
        "zh": "審慎的",
        "example": "It is <strong>prudent</strong> to check the typhoon signal before you leave, even if the sky still looks clear."
      },
      {
        "chip": "abrupt",
        "pos": "adj.",
        "zh": "突然的／唐突的",
        "example": "The announcement was <strong>abrupt</strong>, unlike the usual gentle reminder at the end of assembly."
      },
      {
        "chip": "tedious",
        "pos": "adj.",
        "zh": "沉悶乏味的",
        "example": "Checking every citation by hand is <strong>tedious</strong> — in other words, it is slow and tiring work."
      },
      {
        "chip": "adjacent",
        "pos": "adj.",
        "zh": "毗鄰的／相鄰的",
        "example": "The staff room is <strong>adjacent</strong> to the library; that is, the two rooms share a wall."
      },
      {
        "chip": "lingering",
        "pos": "adj.",
        "zh": "揮之不去的",
        "example": "A <strong>lingering</strong> smell of paint filled the corridor, hours after the workers had left."
      },
      {
        "chip": "omit",
        "pos": "v.",
        "zh": "遺漏／省略",
        "example": "If you <strong>omit</strong> the last section, your report will feel unfinished, so check the list before you print."
      },
      {
        "chip": "clarify",
        "pos": "v.",
        "zh": "澄清／說明",
        "example": "A short heading can <strong>clarify</strong> the purpose of a paragraph, so readers know what to look for."
      },
      {
        "chip": "accumulate",
        "pos": "v.",
        "zh": "累積",
        "example": "Homework can <strong>accumulate</strong> over a long weekend, so it is wiser to start a little each day."
      },
      {
        "chip": "distinct",
        "pos": "adj.",
        "zh": "明顯不同的",
        "example": "The two songs are <strong>distinct</strong> in style: one is slow and quiet, but the other is fast and loud."
      },
      {
        "chip": "reliable",
        "pos": "adj.",
        "zh": "可靠的",
        "example": "The earlier bus is more <strong>reliable</strong>; the later one, however, was cancelled twice last week."
      },
      {
        "chip": "oppose",
        "pos": "v.",
        "zh": "反對",
        "example": "Several students <strong>oppose</strong> a shorter lunch break, but the council wants more time for afternoon clubs."
      },
      {
        "chip": "illustrate",
        "pos": "v.",
        "zh": "說明／闡明",
        "example": "A simple diagram can <strong>illustrate</strong> the idea, for instance a sketch of the new queue line at the canteen."
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
  const blocks = source.split('<section class="skill-set').slice(1);
  return blocks.map((block) => {
    const skill = attr(block, "data-skill");
    const theme = attr(block, "data-theme");
    const leadMatch = block.match(/<p class="section-lead">([\s\S]*?)<\/p>/);
    if (!leadMatch) throw new Error("lead " + skill);
    const lead = leadMatch[1].replace(/<em>/g, "*").replace(/<\/em>/g, "*");
    const chips = [...block.matchAll(/<li><span class="gloss vocab-example"[\s\S]*?<\/span><\/li>/g)].map((hit) => {
      const item = hit[0];
      const chip = item.match(/aria-controls="exampleSheet">([^<]*)<\/span>/)[1];
      return {
        chip,
        pos: attr(item, "data-pos"),
        zh: attr(item, "data-zh"),
        example: attr(item, "data-example"),
      };
    });
    return { skill, theme, lead, rows: chips, hidden: /\shidden>/.test(block.slice(0, 220)) };
  });
}

test("title, tip, and skill dropdown match the locked page", () => {
  assert.match(html, /<title>Paper 1 - Meaning from Context · Learning Materials · SKH Holy Carpenter Secondary School<\/title>/);
  assert.match(html, /<h1>Paper 1 - Meaning from Context<\/h1>/);
  assert.match(html, /<p class="tip">Practise working out word meaning from context — a key Paper 1 skill\. Tap a word for its part of speech and an example\. Use 譯 for the Chinese meaning\.<\/p>/);
  assert.equal(html.includes("Oxford"), false);
  assert.equal(html.includes("OUP"), false);
  assert.equal(html.includes("PHONE"), false);
  const options = [...html.matchAll(/<option value="([^"]+)">/g)].map((hit) => hit[1]);
  assert.deepEqual(options, SPEC.map((set) => set.skill));
});

test("all 14 skills and 280 chips match Tess's wording", () => {
  const parsed = parsePage(html);
  assert.equal(parsed.length, 14);
  assert.equal(parsed.reduce((n, set) => n + set.rows.length, 0), 280);
  parsed.forEach((set) => assert.equal(set.rows.length, 20));
  assert.equal(parsed[0].hidden, false);
  for (let i = 1; i < parsed.length; i++) assert.equal(parsed[i].hidden, true);
  parsed.forEach((set, index) => {
    const spec = SPEC[index];
    assert.equal(set.skill, spec.skill);
    assert.equal(set.theme, spec.theme);
    assert.equal(set.lead, spec.lead);
    assert.deepEqual(set.rows, spec.rows);
    set.rows.forEach((row) => {
      assert.equal(["n.", "v.", "adj.", "adv.", "phrase"].includes(row.pos), true);
      assert.match(row.example, /<strong>[\s\S]+<\/strong>/);
      assert.equal(row.zh.length > 0, true);
      const marked = [...row.example.matchAll(/<strong>([\s\S]*?)<\/strong>/g)].map((hit) => hit[1].toLowerCase());
      assert.equal(marked.length, 1);
      const head = row.chip.toLowerCase().split(" ")[0];
      const stems = [head];
      // Highlight may inflect the chip: notified, specifies, drew attention to, held … accountable.
      if (head.endsWith("y")) stems.push(head.slice(0, -1) + "i");
      if (head.endsWith("e")) stems.push(head.slice(0, -1));
      if (head === "draw") stems.push("drew");
      if (head === "hold") stems.push("held");
      assert.equal(stems.some((stem) => stem.length >= 3 && marked[0].includes(stem)), true);
    });
  });
  const play = parsed.find((set) => set.skill === "words-that-go-together").rows.find((row) => row.chip === "play a role");
  assert.equal(play.example.includes("<strong>play a key role</strong>"), true);
  const sceptical = parsed.find((set) => set.skill === "tone-and-attitude").rows.find((row) => row.chip === "sceptical");
  assert.equal(sceptical.pos, "adj.");
});

test("sheet shows pos, then example, and keeps Chinese off the popup", () => {
  const sheet = html.slice(html.indexOf('id="exampleSheet"'), html.indexOf('id="bottomDock"'));
  const posAt = sheet.indexOf('id="exampleSheetPos"');
  const textAt = sheet.indexOf('id="exampleSheetText"');
  assert.equal(posAt !== -1 && posAt < textAt, true);
  assert.equal(sheet.includes("exampleSheetDef"), false);
  assert.equal(sheet.includes("example-sheet-def"), false);
  assert.equal(html.includes("data-def"), false);
  assert.equal(sheet.includes("data-zh"), false);
  assert.equal(sheet.includes("example-sheet-zh"), false);
  assert.match(sheetJs, /posEl\.textContent/);
  assert.equal(sheetJs.includes("defEl"), false);
  assert.equal(sheetJs.includes("data-def"), false);
  assert.match(sheetJs, /exampleHtml\(example\)/);
  assert.equal(sheetJs.includes("getAttribute('data-zh')"), false);
  assert.equal(sheetJs.includes('getAttribute("data-zh")'), false);
});

test("Explain posts this page name, and More links to the two locked pages", () => {
  assert.match(explainJs, /Paper 1 - Meaning from Context/);
  assert.match(explainJs, /body\.classList\.contains\("p1-vocab"\)/);
  assert.match(html, /href="\.\.\/paper-1-exam-skills\/">Paper 1 - Exam Skills →/);
  assert.match(html, /href="\.\.\/useful-vocabulary\/">Useful Vocabulary →/);
  assert.match(html, /tools-dock\.js\?v=20261022d/);
  assert.match(html, /id="zhToggle"/);
  assert.match(html, /id="dockFold"[^>]*>🛠/);
});

test("Learning Materials hub card uses the locked title and DSE + Phone pills", () => {
  const start = hub.indexOf('href="paper-1-meaning-from-context/"');
  assert.equal(start !== -1, true);
  const exam = hub.indexOf('href="paper-1-exam-skills/"');
  assert.equal(exam !== -1 && exam < start, true);
  const card = hub.slice(start, hub.indexOf("</a>", start));
  assert.match(card, /<h3>Paper 1 - Meaning from Context<\/h3>/);
  assert.match(card, /badge-dse">DSE</);
  assert.match(card, /badge-phone">Phone</);
  assert.equal(card.includes("PHONE"), false);
  const folder = hub.slice(hub.indexOf('id="sec-dse-p1"'), hub.indexOf('id="sec-dse-p2"'));
  assert.equal(folder.includes('href="paper-1-meaning-from-context/"'), true);
});

test("phone CSS insets the last chip row and More links away from Ask", () => {
  const css = fs.readFileSync(new URL("./page.css", import.meta.url), "utf8");
  assert.match(html, /page\.css\?v=20261114b/);
  assert.match(html, /sheet\.js\?v=20261114b/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /padding-left: calc\(48px \+ env\(safe-area-inset-left, 0px\)\)/);
  assert.match(css, /padding-left: calc\(32px \+ env\(safe-area-inset-left, 0px\)\)/);
  assert.match(css, /padding-right: calc\(44px \+ env\(safe-area-inset-right, 0px\)\)/);
  assert.match(css, /padding-bottom: calc\(72px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});

test("old address redirects to the new path", () => {
  const stub = fs.readFileSync(new URL("../paper-1-past-paper-vocabulary/index.html", import.meta.url), "utf8");
  assert.match(stub, /location\.replace\("\/learning-materials\/paper-1-meaning-from-context\/"\+location\.search\+location\.hash\)/);
  assert.match(stub, /rel="canonical" href="\/learning-materials\/paper-1-meaning-from-context\/"/);
  assert.match(stub, /href="\/learning-materials\/paper-1-meaning-from-context\/">Paper 1 - Meaning from Context</);
});
