// スライドJSON → DOM。
// レイアウト: default / big / shot / chapter / cover / 2column / cover-all / end

import { marked } from '../vendor/marked.esm.js';
import { buildNagaya, crabSvg } from './nagaya.js';

marked.use({ gfm: true, breaks: false });

export function renderDeck(deckEl, slides, frontmatter) {
  deckEl.innerHTML = '';
  const rooms = frontmatter.rooms || [];
  for (let i = 0; i < slides.length; i++) {
    const section = renderSlide(slides[i], frontmatter, rooms);
    section.dataset.index = String(i);
    if (slides[i].chapter) section.dataset.chapter = slides[i].chapter;
    for (const c of slides[i].classes || []) section.classList.add(c);
    section.dataset.steps = String(countSteps(section));
    deckEl.appendChild(section);
  }
  for (const a of deckEl.querySelectorAll('a[href^="http"]')) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  for (const img of deckEl.querySelectorAll('img')) {
    img.loading = 'eager';
    img.decoding = 'async';
    img.removeAttribute('width');
  }
}

function renderSlide(slide, fm, rooms) {
  const layout = slide.layout || 'default';
  const section = document.createElement('section');
  section.className = `slide layout-${layout}`;
  section.dataset.layout = layout;
  section.dataset.headingLevel = String(slide.headingLevel || 0);

  const renderers = {
    cover: renderCover,
    chapter: renderChapter,
    shot: renderShot,
    big: renderBig,
    '2column': render2Column,
    'cover-all': renderCoverAll,
    end: renderEnd,
  };
  (renderers[layout] || renderDefault)(section, slide, fm, rooms);
  return section;
}

// ---- 共通 -----------------------------------------------------------------
function mdToFragment(md) {
  const tpl = document.createElement('template');
  tpl.innerHTML = marked.parse(md || '');
  return tpl.content;
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function buildHeading(slide) {
  if (!slide.heading) return null;
  const h = el(slide.headingLevel === 2 ? 'h2' : 'h1');
  h.innerHTML = marked.parseInline(slide.heading);
  return h;
}

function buildEyebrow(slide) {
  if (!slide.chapter) return null;
  return el('p', 'eyebrow', slide.chapter);
}

function appendChildren(target, fragment) {
  while (fragment.firstChild) target.appendChild(fragment.firstChild);
}

// 画像（と、画像だけを包む <p>）をフラグメントから全部抜き出す
function takeImages(fragment) {
  const imgs = Array.from(fragment.querySelectorAll('img'));
  for (const img of imgs) {
    let node = img;
    while (
      node.parentNode && node.parentNode !== fragment &&
      node.parentNode.tagName === 'P' && node.parentNode.textContent.trim() === '' &&
      node.parentNode.querySelectorAll('img').length === 1
    ) node = node.parentNode;
    node.remove();
  }
  // 画像を抜いた後に空になった <p> を掃除
  for (const p of fragment.querySelectorAll('p')) {
    if (!p.textContent.trim() && !p.querySelector('img,svg,code')) p.remove();
  }
  return imgs;
}

function hasContent(fragment) {
  for (const n of fragment.childNodes) {
    if (n.nodeType === 1) return true;
    if (n.nodeType === 3 && n.textContent.trim()) return true;
  }
  return false;
}

// <!-- pause --> の目印から先を step にする。base はすでにある段数
function applyPauses(container, base = 0) {
  let step = base;
  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === 1 && node.classList.contains('pause-marker')) {
      step++;
      node.remove();
      continue;
    }
    if (step > base && node.nodeType === 1) {
      node.classList.add('step');
      node.dataset.step = String(step);
    }
  }
  return step;
}

function countSteps(section) {
  let max = 0;
  for (const s of section.querySelectorAll('[data-step]')) {
    max = Math.max(max, parseInt(s.dataset.step, 10) || 0);
  }
  return max;
}

function buildContent(fragment) {
  const content = el('div', 'content');
  appendChildren(content, fragment);
  applyPauses(content);
  return content;
}

// ---- default -------------------------------------------------------------
function renderDefault(section, slide) {
  const head = el('header', 'slide-head');
  const eyebrow = buildEyebrow(slide);
  if (eyebrow) head.appendChild(eyebrow);
  const heading = buildHeading(slide);
  if (heading) head.appendChild(heading);
  section.appendChild(head);

  const fragment = mdToFragment(slide.bodyMarkdown);
  if (!hasContent(fragment)) {
    section.classList.add('section-divider');
    return;
  }
  section.appendChild(buildContent(fragment));
}

// ---- big: 一言をでかく ---------------------------------------------------
function renderBig(section, slide) {
  const eyebrow = buildEyebrow(slide);
  if (eyebrow) section.appendChild(eyebrow);
  const heading = buildHeading(slide);
  if (heading) section.appendChild(heading);
  section.appendChild(buildContent(mdToFragment(slide.bodyMarkdown)));
}

// ---- shot: スクショをバーン → 次のキーで幕がかかって詳細 --------------------
function renderShot(section, slide) {
  const fragment = mdToFragment(slide.bodyMarkdown);
  // QR（img.qr）はスクショとは別扱いで、右脇に小さく置く
  const qrs = Array.from(fragment.querySelectorAll('img.qr'));
  for (const qr of qrs) {
    const p = qr.closest('p');
    qr.remove();
    if (p && !p.textContent.trim() && !p.querySelector('img')) p.remove();
  }
  const imgs = takeImages(fragment);

  // class: side の時は、引用（>）をスクショの右脇の添え書きにする（幕は掛けない）
  const sideNotes = (slide.classes || []).includes('side')
    ? Array.from(fragment.children).filter((n) => n.tagName === 'BLOCKQUOTE')
    : [];
  for (const q of sideNotes) q.remove();

  const stage = el('div', 'shot-stage');
  stage.dataset.count = String(imgs.length);
  const frames = sideNotes.length ? el('div', 'shot-frames') : stage;
  for (const img of imgs) {
    const frame = el('figure', 'shot-frame');
    frame.appendChild(img);
    frames.appendChild(frame);
  }
  if (sideNotes.length) {
    stage.appendChild(frames);
    const aside = el('aside', 'shot-side');
    for (const q of sideNotes) appendChildren(aside, q);
    stage.appendChild(aside);
  }
  if (qrs.length) {
    const box = el('div', 'shot-qr');
    for (const qr of qrs) box.appendChild(qr);
    stage.appendChild(box);
  }
  section.appendChild(stage);

  // 本文が短い1段落だけなら、幕は掛けずに札の添え書きにする
  const elems = Array.from(fragment.children);
  const captionOnly = elems.length === 1 && elems[0].tagName === 'P' && elems[0].textContent.length <= 60;

  if (slide.heading || captionOnly) {
    const label = el('div', 'shot-label');
    const eyebrow = buildEyebrow(slide);
    if (eyebrow) label.appendChild(eyebrow);
    const heading = buildHeading(slide);
    if (heading) label.appendChild(heading);
    if (captionOnly) {
      const cap = elems[0];
      cap.className = 'shot-caption';
      label.appendChild(cap);
    }
    section.insertBefore(label, stage);
  }

  if (!captionOnly && hasContent(fragment)) {
    const overlay = el('div', 'shot-overlay step');
    overlay.dataset.step = '1';
    const panel = el('div', 'shot-panel');
    const heading = buildHeading(slide);
    if (heading) panel.appendChild(heading);
    const content = el('div', 'content');
    appendChildren(content, fragment);
    applyPauses(content, 1);
    panel.appendChild(content);
    overlay.appendChild(panel);
    section.appendChild(overlay);
  }
}

// ---- chapter: 章扉（夕焼けの長屋に、その部屋のカニが立つ） ------------------
function renderChapter(section, slide, fm, rooms) {
  const sky = el('div', 'sky');
  sky.appendChild(starField(36, slide.heading || ''));
  section.appendChild(sky);

  const idx = rooms.findIndex((r) => r.name === slide.chapter);
  const text = el('div', 'chapter-text');
  if (idx >= 0) text.appendChild(el('p', 'eyebrow', `其の${kanjiNum(idx + 1)} ・ ${rooms[idx].name}`));
  const heading = buildHeading(slide);
  if (heading) text.appendChild(heading);
  const fragment = mdToFragment(slide.bodyMarkdown);
  if (hasContent(fragment)) {
    const lede = el('div', 'lede');
    appendChildren(lede, fragment);
    text.appendChild(lede);
  }
  section.appendChild(text);

  const nagaya = buildNagaya(rooms, { active: idx, label: 'カニ省の長屋' });
  nagaya.classList.add('chapter-nagaya');
  section.appendChild(nagaya);
}

// ---- cover ---------------------------------------------------------------
function renderCover(section, slide, fm, rooms) {
  const sky = el('div', 'sky');
  sky.appendChild(starField(60, 'cover'));
  section.appendChild(sky);

  const inner = el('div', 'cover-inner');
  if (fm.kicker) inner.appendChild(el('p', 'cover-kicker', fm.kicker));
  const title = el('h1', 'cover-title');
  title.innerHTML = (fm.title || slide.heading || '').replace(/\n/g, '<br>');
  inner.appendChild(title);
  if (fm.subtitle) inner.appendChild(el('p', 'cover-subtitle', fm.subtitle));

  const meta = el('div', 'cover-meta');
  if (fm.author) {
    const p = el('p', 'cover-author', fm.author);
    if (fm.author_id) p.appendChild(el('span', 'cover-author-id', fm.author_id));
    meta.appendChild(p);
  }
  if (fm.event) {
    const p = el('p', 'cover-event', fm.event);
    if (fm.date) p.appendChild(el('span', 'cover-date', formatDate(fm.date)));
    meta.appendChild(p);
  }
  if (fm.venue) meta.appendChild(el('p', 'cover-venue', fm.venue));
  inner.appendChild(meta);
  section.appendChild(inner);

  const nagaya = buildNagaya(rooms, { active: -1, everyone: true, label: 'カニ省の長屋' });
  nagaya.classList.add('cover-nagaya');
  section.appendChild(nagaya);
}

// ---- 2column: 左に札（カード画像）、右に本文 --------------------------------
function render2Column(section, slide) {
  const fragment = mdToFragment(slide.bodyMarkdown);
  const h3s = Array.from(fragment.children).filter((n) => n.tagName === 'H3');
  if (h3s.length >= 2 && !fragment.querySelector('img')) return render2ColumnB(section, slide, fragment, h3s);
  const imgs = takeImages(fragment);
  const left = el('div', 'two-col-left');
  for (const img of imgs) left.appendChild(img);
  section.appendChild(left);

  const right = el('div', 'two-col-right');
  const eyebrow = buildEyebrow(slide);
  if (eyebrow) right.appendChild(eyebrow);
  const heading = buildHeading(slide);
  if (heading) right.appendChild(heading);
  right.appendChild(buildContent(fragment));
  section.appendChild(right);
}

// パターンB: 見出しの下に、h3 ごとの列を並べる
function render2ColumnB(section, slide, fragment, h3s) {
  section.classList.add('pattern-b');
  const head = el('header', 'slide-head');
  const eyebrow = buildEyebrow(slide);
  if (eyebrow) head.appendChild(eyebrow);
  const heading = buildHeading(slide);
  if (heading) head.appendChild(heading);
  section.appendChild(head);

  const cols = el('div', 'two-col-columns');
  let col = null;
  for (const node of Array.from(fragment.childNodes)) {
    if (h3s.includes(node)) {
      col = el('div', 'two-col-col');
      cols.appendChild(col);
    }
    if (col) col.appendChild(node);
  }
  section.appendChild(cols);
}

// ---- cover-all -----------------------------------------------------------
function renderCoverAll(section, slide) {
  const fragment = mdToFragment(slide.bodyMarkdown);
  const img = fragment.querySelector('img');
  if (img) {
    const bg = el('div', 'cover-all-bg');
    bg.style.backgroundImage = `url("${img.getAttribute('src')}")`;
    section.appendChild(bg);
  }
  for (const fc of fragment.querySelectorAll('figcaption')) {
    const lower = /lower/.test(fc.getAttribute('class') || '');
    section.appendChild(el('div', `cover-all-caption ${lower ? 'lower' : 'upper'}`, fc.textContent));
  }
}

// ---- end: 長屋の前でカニたちが踊る -----------------------------------------
function renderEnd(section, slide, fm, rooms) {
  const sky = el('div', 'sky night');
  sky.appendChild(starField(90, 'end'));
  sky.appendChild(fireworks('hanabi'));
  section.appendChild(sky);

  const text = el('div', 'end-text');
  const heading = buildHeading(slide);
  if (heading) text.appendChild(heading);
  const fragment = mdToFragment(slide.bodyMarkdown);
  // QR は夜空の真ん中に浮かべる（押せば kani.show へ）
  const qrs = Array.from(fragment.querySelectorAll('img.qr'));
  for (const qr of qrs) {
    const p = qr.closest('p');
    qr.remove();
    if (p && !p.textContent.trim() && !p.querySelector('img')) p.remove();
  }
  if (hasContent(fragment)) {
    const lede = el('div', 'lede');
    appendChildren(lede, fragment);
    text.appendChild(lede);
  }
  section.appendChild(text);
  for (const qr of qrs) {
    const a = el('a', 'end-qr');
    a.href = 'https://kani.show/';
    a.appendChild(qr);
    section.appendChild(a);
  }

  const stage = el('div', 'dance-stage');
  stage.appendChild(buildNagaya(rooms, { active: -1, label: 'カニ省の長屋' }));
  section.appendChild(stage);
  const floor = el('div', 'dance-floor');
  const dancers = ['sawagani', 'kogani', 'takaashi', 'zuwai', 'watari', 'asahi', 'manju', 'hiroiya', 'asakan', 'usui', 'chikuwa'];
  dancers.forEach((kind, i) => {
    const d = el('div', `dancer dancer-${kind}`);
    d.style.setProperty('--i', String(i));
    d.innerHTML = crabSvg(kind);
    floor.appendChild(d);
  });
  section.appendChild(floor);
}

// ---- 小道具 ---------------------------------------------------------------
// 文字列から決まる擬似乱数（リロードしても星の位置が変わらない）
function seeded(seedText) {
  let h = 2166136261;
  for (const c of seedText) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function starField(n, seedText) {
  const rnd = seeded(seedText);
  const wrap = el('div', 'stars');
  for (let i = 0; i < n; i++) {
    const s = el('i', 'star');
    s.style.left = `${(rnd() * 100).toFixed(2)}%`;
    s.style.top = `${(rnd() * 62).toFixed(2)}%`;
    s.style.animationDelay = `${(rnd() * 4).toFixed(2)}s`;
    if (rnd() > 0.8) s.classList.add('big');
    wrap.appendChild(s);
  }
  return wrap;
}

// ドット絵の花火。打ち上げ（火の玉が昇る）→ 開く（二重の輪）→ 垂れて消える、を繰り返す
const HANABI_COLORS = [
  ['var(--c-yellow)', 'var(--kani-hot)'],
  ['var(--c-watari-h)', 'var(--shiro)'],
  ['var(--kani-hot)', 'var(--c-yellow)'],
  ['var(--c-manju-h)', 'var(--c-shio)'],
  ['var(--shiro)', 'var(--c-asahi-h)'],
  ['var(--c-shio)', 'var(--c-yellow)'],
];
const HANABI_SPOTS = [
  { x: 14, y: 30, r: 120, d: 0.0 },
  { x: 84, y: 26, r: 140, d: 1.1 },
  { x: 32, y: 14, r: 95, d: 2.3 },
  { x: 66, y: 40, r: 105, d: 3.0 },
  { x: 50, y: 22, r: 150, d: 4.2 },
  { x: 92, y: 52, r: 80, d: 5.1 },
  { x: 7, y: 54, r: 85, d: 5.8 },
];

function fireworks(seedText) {
  const rnd = seeded(seedText);
  const wrap = el('div', 'hanabi');
  HANABI_SPOTS.forEach((spot, k) => {
    const [c1, c2] = HANABI_COLORS[k % HANABI_COLORS.length];
    const burst = el('div', 'hanabi-burst');
    burst.style.left = `${spot.x}%`;
    burst.style.top = `${spot.y}%`;
    burst.style.setProperty('--delay', `${spot.d}s`);
    burst.style.setProperty('--rise', `${Math.round(420 - spot.y * 3)}px`);

    const rocket = el('i', 'hanabi-rocket');
    rocket.style.background = c1;
    burst.appendChild(rocket);

    // 外の輪と内の輪
    [[18, spot.r, c1, 7], [11, spot.r * 0.52, c2, 5]].forEach(([n, r, color, size]) => {
      const tilt = rnd() * Math.PI;
      for (let i = 0; i < n; i++) {
        const a = tilt + (i / n) * Math.PI * 2;
        const p = el('i', 'hanabi-spark');
        p.style.setProperty('--dx', `${Math.round(Math.cos(a) * r)}px`);
        p.style.setProperty('--dy', `${Math.round(Math.sin(a) * r)}px`);
        p.style.setProperty('--sz', `${size}px`);
        p.style.background = color;
        burst.appendChild(p);
      }
    });
    wrap.appendChild(burst);
  });
  return wrap;
}

function kanjiNum(n) {
  return ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n] || String(n);
}

function formatDate(value) {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  }
  return String(value ?? '');
}
