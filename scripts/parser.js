// Markdown → スライドJSON への変換。
// claude-code-as-a-friend のパーサーを土台に、メタコメントとステップ送りを足したもの。
//
// スライド区切り: 行頭 `# h1` / `## h2` / 独立行 `---`
// メタコメント（行単位）:
//   <!-- layout: shot -->      レイアウト指定
//   <!-- chapter: 秘書 -->     章（フッターの長屋の部屋）。以降のスライドに引き継がれる
//   <!-- crab: kogani -->      章扉などに出すカニの種類（pixel.js の SPECIES）
//   <!-- class: foo bar -->    スライドに足す class
//   <!-- pause -->             ここで一旦止める（以降は次のキー送りで出る）

import yaml from '../vendor/js-yaml.mjs';

const FENCE = /^\s*```/;
const H1_LINE = /^#\s+(.+?)\s*$/;
const H2_LINE = /^##\s+(.+?)\s*$/;
const SEP_LINE = /^\s*(---+|--)\s*$/;
const META_LINE = /^[ \t]*<!--[-\s]*(layout|chapter|crab|class)\s*:\s*(.+?)[-\s]*-->[ \t]*$/i;
const PAUSE_LINE = /^[ \t]*<!--[-\s]*pause[-\s]*-->[ \t]*$/i;

export const PAUSE_MARKER = '<div class="pause-marker"></div>';

const LAYOUT_TYPO_MAP = {
  '2colmun': '2column',
  '2-column': '2column',
  'twocolumn': '2column',
};
const VALID_LAYOUTS = new Set([
  'default', 'cover', 'cover-all', '2column', 'end', 'shot', 'chapter', 'big',
]);

export function parseMarkdown(text) {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const { frontmatter, body } = splitFrontmatter(normalized);
  const slides = splitSlides(body);
  // 章は前のスライドから引き継ぐ
  let chapter = null;
  for (const s of slides) {
    if (s.chapter) chapter = s.chapter;
    else s.chapter = chapter;
  }
  return { frontmatter, slides };
}

function splitFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text };
  const re = /\n---\s*\n/;
  const match = re.exec(text.slice(4));
  if (!match) return { frontmatter: {}, body: text };
  const fmText = text.slice(4, 4 + match.index);
  const body = text.slice(4 + match.index + match[0].length);
  let frontmatter = {};
  try {
    frontmatter = yaml.load(preprocessFrontmatter(fmText)) || {};
  } catch (e) {
    console.warn('[slides] Failed to parse frontmatter as YAML:', e);
  }
  return { frontmatter, body };
}

// `#000000` や `@xxx` の値を自動でクオートする（YAML の落とし穴よけ）
function preprocessFrontmatter(text) {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*[\w-]+\s*:\s*)(\S.*?)\s*$/);
      if (!m) return line;
      const [, prefix, value] = m;
      if (/^['"\[\{]/.test(value)) return line;
      if (/^[#@]/.test(value)) return prefix + JSON.stringify(value);
      return line;
    })
    .join('\n');
}

function splitSlides(body) {
  const lines = body.split('\n');
  const slides = [];
  let current = createEmptySlide();
  let inFence = false;

  const pushIfMeaningful = () => {
    finalizeSlide(current);
    if (current.heading || current.bodyMarkdown.length > 0 || current.layoutExplicit) {
      slides.push(current);
    }
  };

  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      current.lines.push(line);
      continue;
    }
    if (!inFence) {
      if (SEP_LINE.test(line)) {
        pushIfMeaningful();
        current = createEmptySlide();
        continue;
      }
      const h1 = line.match(H1_LINE);
      const h2 = !h1 && line.match(H2_LINE);
      if (h1 || h2) {
        pushIfMeaningful();
        current = createEmptySlide();
        current.heading = (h1 || h2)[1];
        current.headingLevel = h1 ? 1 : 2;
        continue;
      }
      const meta = line.match(META_LINE);
      if (meta) {
        applyMeta(current, meta[1].toLowerCase(), meta[2].trim());
        continue;
      }
      if (PAUSE_LINE.test(line)) {
        current.lines.push('', PAUSE_MARKER, '');
        continue;
      }
    }
    current.lines.push(line);
  }
  pushIfMeaningful();
  return slides;
}

function applyMeta(slide, key, value) {
  if (key === 'layout') {
    let layout = value.toLowerCase();
    if (LAYOUT_TYPO_MAP[layout]) layout = LAYOUT_TYPO_MAP[layout];
    if (!VALID_LAYOUTS.has(layout)) {
      console.warn(`[slides] Unknown layout "${value}", falling back to default.`);
      layout = 'default';
    }
    slide.layout = layout;
    slide.layoutExplicit = true;
  } else if (key === 'chapter') {
    slide.chapter = value;
  } else if (key === 'crab') {
    slide.crab = value;
  } else if (key === 'class') {
    slide.classes.push(...value.split(/\s+/));
  }
}

function createEmptySlide() {
  return {
    heading: null,
    headingLevel: null,
    layout: 'default',
    layoutExplicit: false,
    chapter: null,
    crab: null,
    classes: [],
    lines: [],
    bodyMarkdown: '',
  };
}

function finalizeSlide(slide) {
  slide.bodyMarkdown = (slide.lines || []).join('\n').replace(/^\s+|\s+$/g, '');
  delete slide.lines;
}
