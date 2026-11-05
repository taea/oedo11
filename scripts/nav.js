// ナビゲーション：キー操作・画面端クリック・URLハッシュ同期・ステップ送り・フッター更新
//
// 1枚のスライドの中に「ステップ」（[data-step]）がある時は、
// 次へ → まずステップを1段ずつ出す → 出し切ったら次のスライドへ。
// ハッシュは #12（12枚目）か #12.1（12枚目の1段目まで出した状態）。

export function initNav(deckEl, { onChange } = {}) {
  const slides = Array.from(deckEl.querySelectorAll('.slide'));
  if (slides.length === 0) return null;

  const stepsOf = (i) => parseInt(slides[i].dataset.steps || '0', 10);
  let { index: current, step } = readHash(slides.length, stepsOf);

  function render() {
    slides.forEach((s, k) => s.classList.toggle('active', k === current));
    const slide = slides[current];
    slide.dataset.step = String(step);
    for (const node of slide.querySelectorAll('[data-step]')) {
      node.classList.toggle('shown', parseInt(node.dataset.step, 10) <= step);
    }
    document.body.dataset.activeLayout = slide.dataset.layout || 'default';
    document.body.dataset.navAtStart = current === 0 && step === 0 ? 'true' : 'false';
    document.body.dataset.navAtEnd = current === slides.length - 1 && step >= stepsOf(current) ? 'true' : 'false';
    writeHash(current, step);
    onChange?.({ index: current, step, total: slides.length, slide });
  }

  function go(i, s = 0) {
    current = clamp(i, 0, slides.length - 1);
    step = clamp(s, 0, stepsOf(current));
    render();
  }

  function next() {
    if (step < stepsOf(current)) { step++; render(); return; }
    if (current < slides.length - 1) go(current + 1, 0);
  }
  function prev() {
    if (step > 0) { step--; render(); return; }
    // 前のスライドに戻る時は、出し切った状態で見せる
    if (current > 0) go(current - 1, stepsOf(current - 1));
  }
  // ステップを飛ばして次のスライドへ
  const nextSlide = () => go(current + 1, 0);
  const prevSlide = () => go(current - 1, 0);

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ': case 'Enter':
        e.preventDefault(); e.shiftKey && e.key === ' ' ? prev() : next(); break;
      case 'ArrowLeft': case 'PageUp': case 'Backspace':
        e.preventDefault(); prev(); break;
      case 'ArrowDown':
        e.preventDefault(); nextSlide(); break;
      case 'ArrowUp':
        e.preventDefault(); prevSlide(); break;
      case 'Home':
        e.preventDefault(); go(0); break;
      case 'End':
        e.preventDefault(); go(slides.length - 1, stepsOf(slides.length - 1)); break;
      case 'f': case 'F':
        e.preventDefault(); toggleFullscreen(); break;
    }
  });

  document.getElementById('nav-prev')?.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  document.getElementById('nav-next')?.addEventListener('click', (e) => { e.stopPropagation(); next(); });

  // 画面端クリック（左30%で戻る、右30%で進む）
  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, textarea, select, label')) return;
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    const x = e.clientX, w = window.innerWidth;
    if (x < w * 0.3) prev();
    else if (x > w * 0.7) next();
  });

  // スワイプ
  let touchX = null;
  document.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 40) return;
    dx < 0 ? next() : prev();
  });

  window.addEventListener('hashchange', () => {
    const h = readHash(slides.length, stepsOf);
    if (h.index !== current || h.step !== step) go(h.index, h.step);
  });

  render();
  return { go, next, prev };
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.();
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function readHash(total, stepsOf) {
  const m = location.hash.match(/^#(\d+)(?:\.(\d+))?$/);
  if (!m) return { index: 0, step: 0 };
  const index = clamp(parseInt(m[1], 10) - 1, 0, total - 1);
  const step = m[2] ? clamp(parseInt(m[2], 10), 0, stepsOf(index)) : 0;
  return { index, step };
}

function writeHash(i, s) {
  const target = s > 0 ? `#${i + 1}.${s}` : `#${i + 1}`;
  if (location.hash !== target) history.replaceState(null, '', target);
}
