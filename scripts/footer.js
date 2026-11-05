// フッターの長屋: 章ごとの部屋が並び、今いる部屋の暖簾が赤くなってカニが立つ。

import { crabSvg } from './nagaya.js';

const HIDE_ON = new Set(['cover', 'chapter', 'end', 'cover-all']);

export function buildFooter(fm) {
  const rooms = fm.rooms || [];
  const el = document.createElement('footer');
  el.className = 'deck-footer';

  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  brand.innerHTML = `${crabSvg('sawagani')}<span>${fm.footer || 'カニ省の長屋'}</span>`;
  el.appendChild(brand);

  const street = document.createElement('ol');
  street.className = 'footer-rooms';
  const roomEls = rooms.map((room) => {
    const li = document.createElement('li');
    li.className = 'footer-room';
    li.innerHTML = `<span class="noren" aria-hidden="true"><i></i><i></i><i></i></span>` +
      `<span class="room-crab">${crabSvg(room.crab || 'sawagani')}</span>` +
      `<span class="room-name">${room.name}</span>`;
    street.appendChild(li);
    return li;
  });
  el.appendChild(street);

  const page = document.createElement('div');
  page.className = 'footer-page';
  el.appendChild(page);

  function update({ index, total, slide }) {
    const chapter = slide.dataset.chapter;
    const active = rooms.findIndex((r) => r.name === chapter);
    roomEls.forEach((li, k) => {
      li.classList.toggle('active', k === active);
      li.classList.toggle('visited', active >= 0 && k < active);
    });
    page.textContent = `${index + 1} / ${total}`;
    el.hidden = HIDE_ON.has(slide.dataset.layout);
    slide.classList.toggle('has-footer', !el.hidden);
  }
  return { el, update };
}
