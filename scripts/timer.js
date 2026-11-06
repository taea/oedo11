// 発表用のカウントダウンタイマー（右上の小さい札）。
//   t … スタート / 一時停止（最初の t で札が出る）
//   r … 20:00 に戻す（止まった状態）
// 残り5分で黄、1分で赤、0 を過ぎたら +m:ss で超過を数える。
// リロードしても続きから数えられるよう sessionStorage に覚えておく（使えなければ覚えないだけ）。

const KEY = 'oedo11-timer';

export function initTimer(deckEl, minutes = 20) {
  const total = minutes * 60 * 1000;
  const el = document.createElement('div');
  el.className = 'deck-timer';
  el.setAttribute('aria-hidden', 'true');
  deckEl.appendChild(el);

  // elapsed: 止めた時点までに経った ms / startedAt: 動いてる時の起点
  let state = load() || { shown: false, running: false, elapsed: 0, startedAt: 0 };

  const elapsedNow = () => state.elapsed + (state.running ? Date.now() - state.startedAt : 0);

  function render() {
    el.hidden = !state.shown;
    if (!state.shown) return;
    const left = total - elapsedNow();
    const over = left < 0;
    const sec = over ? Math.floor(-left / 1000) : Math.ceil(left / 1000);
    const mm = Math.floor(sec / 60);
    const ss = String(sec % 60).padStart(2, '0');
    el.textContent = `${over ? '+' : ''}${mm}:${ss}`;
    el.dataset.state = !state.running ? 'paused' : over ? 'over' : left <= 60_000 ? 'red' : left <= 300_000 ? 'warn' : 'run';
  }

  function toggle() {
    if (state.running) {
      state.elapsed = elapsedNow();
      state.running = false;
    } else {
      state.shown = true;
      state.running = true;
      state.startedAt = Date.now();
    }
    save(state);
    render();
  }

  function reset() {
    state = { shown: state.shown, running: false, elapsed: 0, startedAt: 0 };
    save(state);
    render();
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); toggle(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); reset(); }
  });

  render();
  setInterval(render, 250);
}

function load() {
  try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
}
function save(state) {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 覚えられなくても動く */ }
}
