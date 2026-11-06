// エントリポイント。fetch → parse → render → footer → nav → scale fit

import { parseMarkdown } from './parser.js';
import { renderDeck } from './renderer.js';
import { initNav } from './nav.js';
import { buildFooter } from './footer.js';
import { initTimer } from './timer.js';

const deckEl = document.getElementById('deck');
const loadingEl = document.getElementById('loading');

async function main() {
  try {
    const res = await fetch('index.md', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`index.md が読めねえ: ${res.status} ${res.statusText}`);
    const { frontmatter, slides } = parseMarkdown(await res.text());

    if (frontmatter.title) document.title = String(frontmatter.title).replace(/\n/g, ' ');
    renderDeck(deckEl, slides, frontmatter);
    const footer = buildFooter(frontmatter);
    deckEl.appendChild(footer.el);
    initNav(deckEl, { onChange: footer.update });
    initTimer(deckEl, Number(frontmatter.timer) || 20);
    setupScaleFit(deckEl);

    document.body.classList.add('ready');
    console.log(`[slides] Loaded ${slides.length} slides.`);
  } catch (err) {
    console.error('[slides] Failed to initialize:', err);
    if (loadingEl) loadingEl.textContent = `エラー: ${err.message}`;
  }
}

// 1280×720 をビューポートに合わせて拡縮（claude-code-as-a-friend と同じ方式）
function setupScaleFit(deck) {
  const styles = getComputedStyle(document.documentElement);
  const baseW = parseFloat(styles.getPropertyValue('--base-width')) || 1280;
  const baseH = parseFloat(styles.getPropertyValue('--base-height')) || 720;
  const fit = () => {
    const scale = Math.min(window.innerWidth / baseW, window.innerHeight / baseH);
    deck.style.transform = `scale(${scale})`;
  };
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
}

main();
