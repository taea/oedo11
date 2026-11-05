// kani.show の pixel.js（window.PX）でドット絵の長屋とカニを組む。

const PX = () => window.PX;

export function crabSvg(kind, label) {
  const px = PX();
  if (!px) return '';
  if (px.SPECIES[kind]) return px.crab(kind, label);
  if (px.ICONS[kind]) return px.icon(kind, label);
  return px.crab('sawagani', label);
}

// 地図の幅と高さ（viewBox の単位）を測る
function mapSize(kind) {
  const px = PX();
  const map = px.SPECIES[kind]?.map || px.ICONS[kind] || px.SPECIES.sawagani.map;
  return { w: Math.max(...map.map((r) => r.length)), h: map.length };
}

// rooms: [{name, crab}]。opts.active: 灯りをともす部屋の番号。opts.everyone: 全部屋にカニを置く
export function buildNagaya(rooms, opts = {}) {
  const px = PX();
  const wrap = document.createElement('div');
  wrap.className = 'nagaya';
  if (!px || rooms.length === 0) return wrap;

  const g = px.nagaya(rooms, { label: opts.label });
  wrap.innerHTML = g.svg;
  wrap.style.aspectRatio = `${g.width} / ${g.height}`;
  wrap.style.setProperty('--nw', String(g.width));

  const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;

  rooms.forEach((room, i) => {
    const x = g.offset + i * g.roomWidth;

    // 看板の文字
    const sign = document.createElement('span');
    sign.className = 'nagaya-sign';
    sign.textContent = room.name;
    sign.style.left = pct(x + 6, g.width);
    sign.style.width = pct(g.roomWidth - 12, g.width);
    sign.style.top = pct(g.signY - 1.5, g.height);
    sign.style.height = pct(3, g.height);
    if (i === opts.active) sign.classList.add('active');
    wrap.appendChild(sign);

    // 灯り（障子が光る）
    if (i === opts.active) {
      const glow = document.createElement('span');
      glow.className = 'nagaya-glow';
      glow.style.left = pct(x + 9, g.width);
      glow.style.width = pct(16, g.width);
      glow.style.top = pct(g.groundY - 15, g.height);
      glow.style.height = pct(15, g.height);
      wrap.appendChild(glow);
    }

    // カニ
    if (room.crab && (opts.everyone || i === opts.active)) {
      const { w, h } = mapSize(room.crab);
      const c = document.createElement('span');
      c.className = `nagaya-crab${i === opts.active ? ' active' : ''}`;
      c.innerHTML = crabSvg(room.crab, room.name);
      const cx = x + g.roomWidth / 2 - w / 2;
      c.style.left = pct(cx, g.width);
      c.style.width = pct(w, g.width);
      c.style.top = pct(g.groundY - h, g.height);
      c.style.height = pct(h, g.height);
      c.style.setProperty('--i', String(i));
      wrap.appendChild(c);
    }
  });
  return wrap;
}
