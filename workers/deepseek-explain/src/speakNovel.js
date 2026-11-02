/**
 * Say It Louder SpeakNovel judge.
 * Equivalent to the game's game-master prompt: score the target grammar,
 * then pick a branch. A vague or off-pattern line must not take a Golden
 * or success branch. Ask and Explain prompts stay in their own files.
 */

export const SPEAKNOVEL_SYSTEM_PROMPT = `You are the game master and character actor for Say It Louder, an ESL speaking visual novel for Hong Kong secondary students.

Judge the student's spoken line against the target grammar and the branches in the user message.

Rules:
- Choose exactly one chosen_target_node. It must be a targetNode id copied from the branches. Do not invent ids.
- Set used_target_grammar to true only if the line uses the target grammar item, a target pattern, or the target keywords in a meaningful way. Filler, a bare apology, or a line that ignores the pattern is false.
- grammar_score is an integer from 1 to 5: 1 means the target grammar was missed or too vague, 5 means it was clear and natural.
- If used_target_grammar is false, or the line is too vague, do not choose a Golden ending or a success branch. Prefer a retry or clarification branch, then a fail or chaos branch.
- character_reaction is one or two sentences in the current speaker's voice, answering the student's exact words. No stage directions, labels, or teaching.
- teacher_tip is exactly one encouraging sentence in British English about the target grammar. Name the pattern or a keyword to try next (British spellings: apologise, practise). Do not give a score, a rubric, or a translation. Do not write Chinese.
- Reply with one JSON object only. No markdown fences and no extra text.

{"chosen_target_node":"exact_targetNode_id","used_target_grammar":false,"grammar_score":1,"character_reaction":"Sorry is not enough.","teacher_tip":"Add Allow me to and name one fix you will make."}`;

export const SPEAKNOVEL_TASK = "Apply the grammar gate, then return only the JSON object.";

const FILLER = {
  a: 1, an: 1, the: 1, to: 1, of: 1, and: 1, or: 1, if: 1, in: 1, on: 1, for: 1,
  with: 1, me: 1, you: 1, your: 1, my: 1, i: 1, am: 1, is: 1, it: 1, so: 1, just: 1,
  very: 1, really: 1, that: 1, this: 1, please: 1, um: 1, uh: 1, er: 1, erm: 1,
  oops: 1, ok: 1, okay: 1, hello: 1, hi: 1, hey: 1, yeah: 1, yes: 1, no: 1,
  thanks: 1, thank: 1, about: 1, im: 1,
};

const LIMITS = {
  episode: 64,
  nodeKey: 64,
  transcript: 800,
  speaker: 120,
  defaultLine: 500,
  goalHint: 400,
  item: 200,
  pattern: 240,
  keyword: 80,
  condition: 500,
  label: 180,
  kind: 24,
  targetNode: 64,
  patterns: 6,
  keywords: 20,
  branches: 12,
};

export function isSpeakNovelMode(data) {
  return !!(
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof data.mode === "string" &&
    data.mode.trim().toLowerCase() === "speaknovel"
  );
}

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function asLimitedString(value, max) {
  if (typeof value !== "string") return { ok: false, empty: true };
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return { ok: true, value: "" };
  if (trimmed.length > max) return { ok: false, empty: false };
  return { ok: true, value: trimmed };
}

function idOk(value) {
  return /^[A-Za-z0-9_.-]{1,64}$/.test(value);
}

function contentWords(text) {
  const parts = norm(text).match(/[a-z]{3,}/g) || [];
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (!FILLER[parts[i]]) out.push(parts[i]);
  }
  return out;
}

function isApologyKeyword(keyword) {
  return /sorry|apologis|pardon/.test(keyword);
}

function withoutPhrase(text, phrase) {
  return text.split(phrase).join(" ");
}

function patternUsed(text, patterns) {
  if (!Array.isArray(patterns)) return false;
  for (let i = 0; i < patterns.length; i++) {
    const words = contentWords(String(patterns[i] || "").replace(/_+/g, " "));
    let hits = 0;
    const seen = {};
    for (let j = 0; j < words.length; j++) {
      if (seen[words[j]] || isApologyKeyword(words[j])) continue;
      seen[words[j]] = true;
      if (text.indexOf(words[j]) !== -1) hits += 1;
    }
    if (hits >= 2) return true;
  }
  return false;
}

/** True when the line uses the node's keywords or patterns in more than a vague fragment. */
export function usedTargetGrammar(transcript, targetGrammar) {
  const text = norm(transcript);
  if (!text || !targetGrammar || typeof targetGrammar !== "object") return false;
  const raw = Array.isArray(targetGrammar.keywords) ? targetGrammar.keywords : [];
  const matched = [];
  for (let i = 0; i < raw.length; i++) {
    const keyword = norm(raw[i]);
    if (keyword.length < 2) continue;
    if (text.indexOf(keyword) !== -1) matched.push(keyword);
  }
  const solid = [];
  for (let i = 0; i < matched.length; i++) {
    if (!isApologyKeyword(matched[i])) solid.push(matched[i]);
  }
  if (solid.length >= 2) return true;
  if (solid.length === 1) {
    return contentWords(withoutPhrase(text, solid[0])).length >= 1;
  }
  if (raw.length === 0) return patternUsed(text, targetGrammar.patterns);
  return false;
}

function readStringList(value, itemMax, listMax) {
  if (value == null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false };
  if (value.length > listMax) return { ok: false };
  const out = [];
  for (let i = 0; i < value.length; i++) {
    const item = asLimitedString(value[i], itemMax);
    if (!item.ok) return { ok: false };
    if (item.value) out.push(item.value);
  }
  return { ok: true, value: out };
}

function readTargetGrammar(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false };
  const item = asLimitedString(value.item == null ? "" : value.item, LIMITS.item);
  const patterns = readStringList(value.patterns, LIMITS.pattern, LIMITS.patterns);
  const keywords = readStringList(value.keywords, LIMITS.keyword, LIMITS.keywords);
  if (!item.ok || !patterns.ok || !keywords.ok) return { ok: false };
  return {
    ok: true,
    value: {
      item: item.value,
      patterns: patterns.value,
      keywords: keywords.value,
    },
  };
}

function readBranches(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > LIMITS.branches) {
    return { ok: false, empty: !Array.isArray(value) || value.length === 0 };
  }
  const out = [];
  const seen = {};
  for (let i = 0; i < value.length; i++) {
    const branch = value[i];
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) return { ok: false, empty: false };
    const targetNode = asLimitedString(branch.targetNode == null ? "" : branch.targetNode, LIMITS.targetNode);
    const condition = asLimitedString(branch.condition == null ? "" : branch.condition, LIMITS.condition);
    const label = asLimitedString(branch.label == null ? "" : branch.label, LIMITS.label);
    const kind = asLimitedString(branch.kind == null ? "" : branch.kind, LIMITS.kind);
    if (!targetNode.ok || !condition.ok || !label.ok || !kind.ok) return { ok: false, empty: false };
    if (!targetNode.value || !idOk(targetNode.value) || seen[targetNode.value]) return { ok: false, empty: false };
    seen[targetNode.value] = true;
    const clean = { targetNode: targetNode.value };
    if (condition.value) clean.condition = condition.value;
    if (label.value) clean.label = label.value;
    if (kind.value) clean.kind = kind.value;
    out.push(clean);
  }
  return { ok: true, value: out };
}

export function readSpeakNovelFields(data) {
  const episode = asLimitedString(data.episode == null ? "" : data.episode, LIMITS.episode);
  const nodeKey = asLimitedString(data.nodeKey == null ? "" : data.nodeKey, LIMITS.nodeKey);
  const transcript = asLimitedString(data.transcript == null ? "" : data.transcript, LIMITS.transcript);
  const checked = [episode, nodeKey, transcript];
  for (let i = 0; i < checked.length; i++) {
    if (!checked[i].ok) return { mode: "speaknovel", error: "field" };
  }
  if (!episode.value || !idOk(episode.value) || !nodeKey.value || !idOk(nodeKey.value) || !transcript.value) {
    return { mode: "speaknovel", error: "required" };
  }
  const node = data.node;
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return { mode: "speaknovel", error: "required" };
  }
  const speaker = asLimitedString(node.speaker == null ? "" : node.speaker, LIMITS.speaker);
  const defaultLine = asLimitedString(node.defaultLine == null ? "" : node.defaultLine, LIMITS.defaultLine);
  const goalHint = asLimitedString(node.goalHint == null ? "" : node.goalHint, LIMITS.goalHint);
  if (!speaker.ok || !defaultLine.ok || !goalHint.ok) return { mode: "speaknovel", error: "field" };
  if (!speaker.value || !defaultLine.value) return { mode: "speaknovel", error: "required" };
  const grammar = readTargetGrammar(node.targetGrammar);
  if (!grammar.ok) return { mode: "speaknovel", error: "field" };
  const branches = readBranches(node.branches);
  if (!branches.ok) {
    return { mode: "speaknovel", error: branches.empty ? "required" : "field" };
  }
  return {
    mode: "speaknovel",
    fields: {
      episode: episode.value,
      nodeKey: nodeKey.value,
      transcript: transcript.value,
      speaker: speaker.value,
      defaultLine: defaultLine.value,
      goalHint: goalHint.value,
      targetGrammar: grammar.value,
      branches: branches.value,
    },
  };
}

export function buildSpeakNovelUserMessage(fields) {
  return [
    "Episode: " + fields.episode,
    "Node: " + fields.nodeKey,
    "Speaker: " + fields.speaker,
    "Character just said: " + fields.defaultLine,
    "Speaking goal: " + (fields.goalHint || ""),
    "Target grammar: " + JSON.stringify(fields.targetGrammar),
    "Branches: " + JSON.stringify(fields.branches),
    "Student: " + fields.transcript,
    "Task: " + SPEAKNOVEL_TASK,
  ].join("\n");
}

function parseModelJson(text) {
  let raw = String(text || "").trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1));
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function asBool(value) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function clipSentences(text, maxSentences, maxChars) {
  const flat = String(text || "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!flat) return "";
  let count = 0;
  let end = flat.length;
  for (let i = 0; i < flat.length; i++) {
    const ch = flat.charAt(i);
    if (ch === "." || ch === "!" || ch === "?" || ch === "。" || ch === "！" || ch === "？") {
      count += 1;
      if (count >= maxSentences) {
        end = i + 1;
        break;
      }
    }
  }
  let out = flat.slice(0, end).trim();
  if (out.length > maxChars) {
    const sliced = out.slice(0, maxChars);
    const space = sliced.lastIndexOf(" ");
    out = (space > maxChars * 0.6 ? sliced.slice(0, space) : sliced).trim();
  }
  return out;
}

function branchKind(branch) {
  return norm(branch.kind || "");
}

function mentionsGate(text) {
  return text.indexOf("golden") !== -1 || text.indexOf("success") !== -1;
}

function isBlockedSuccess(branch) {
  if (mentionsGate(branchKind(branch))) return true;
  if (mentionsGate(norm(branch.targetNode))) return true;
  return mentionsGate(norm(branch.label || ""));
}

function findKind(branches, kinds) {
  for (let i = 0; i < branches.length; i++) {
    const kind = branchKind(branches[i]);
    if (kinds.indexOf(kind) !== -1) return branches[i];
  }
  return null;
}

function pickBranch(branches, chosenId, blockSuccess) {
  let chosen = null;
  for (let i = 0; i < branches.length; i++) {
    if (branches[i].targetNode === chosenId) {
      chosen = branches[i];
      break;
    }
  }
  if (chosen && (!blockSuccess || !isBlockedSuccess(chosen))) return chosen.targetNode;
  if (!blockSuccess) return branches[0].targetNode;
  const retry = findKind(branches, ["retry", "clarification", "clarify"]);
  if (retry) return retry.targetNode;
  const fail = findKind(branches, ["fail", "chaos"]);
  if (fail) return fail.targetNode;
  for (let i = 0; i < branches.length; i++) {
    if (!isBlockedSuccess(branches[i])) return branches[i].targetNode;
  }
  return branches[0].targetNode;
}

function clampScore(value, used) {
  let score = value;
  if (typeof score === "string" && /^[0-9]$/.test(score.trim())) score = Number(score.trim());
  if (typeof score !== "number" || !Number.isFinite(score)) score = used ? 3 : 1;
  score = Math.round(score);
  if (score < 1) score = 1;
  if (score > 5) score = 5;
  if (!used && score > 2) score = 2;
  return score;
}

/**
 * Shape the model JSON into the fields the game applies.
 * Returns null when the model text is not usable feedback.
 */
export function judgeSpeakNovel(modelText, fields) {
  const data = parseModelJson(modelText);
  if (!data) return null;
  const reaction = clipSentences(data.character_reaction, 2, 360);
  const tip = clipSentences(data.teacher_tip, 1, 240);
  if (!reaction || !tip) return null;
  let modelUsed = asBool(data.used_target_grammar);
  if (modelUsed === null) modelUsed = false;
  const heard = usedTargetGrammar(fields.transcript, fields.targetGrammar);
  const used = modelUsed === true && heard === true;
  const chosen = pickBranch(fields.branches, data.chosen_target_node, !used);
  return {
    chosen_target_node: chosen,
    used_target_grammar: used,
    grammar_score: clampScore(data.grammar_score, used),
    character_reaction: reaction,
    teacher_tip: tip,
  };
}
