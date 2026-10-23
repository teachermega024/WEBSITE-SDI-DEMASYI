/* Sinkronisasi CMS dengan halaman publik. Website harus dibuka melalui http://localhost:3000, bukan file:// atau Live Server. */
(() => {
  const config = {
    berita: ['.news-grid'],
    pengumuman: ['.announcement-list'],
    galeri: ['.gallery-grid'],
    guru: ['.staff-grid'],
    prestasi: ['.achievement-grid']
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validImage = s => typeof s === 'string' && /^\/uploads\/[a-zA-Z0-9._-]+$/.test(s) ? s : '';
  const date = d => { const v = new Date(`${d || ''}T12:00:00`); return Number.isNaN(v.getTime()) ? '' : v.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}); };
  const cards = {
    berita: x => `<article class="news-card"><div class="news-image">${validImage(x.image) ? `<img loading="lazy" src="${validImage(x.image)}" alt="${esc(x.title)}" onerror="this.style.display='none'">` : ''}<span class="news-category">${esc(x.category || 'SEKOLAH')}</span></div><div class="news-body"><div class="news-meta">${date(x.date)}</div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>${x.content ? `<button type="button" class="cms-read" data-id="${esc(x.id)}">Baca Selengkapnya →</button>` : ''}</div></article>`,
    pengumuman: x => `<article class="cms-announcement"><div class="announcement-date"><b>${esc(new Date(`${x.date}T12:00:00`).getDate() || '')}</b><span>${esc(new Date(`${x.date}T12:00:00`).toLocaleDateString('id-ID',{month:'short'}))}</span></div><div><span class="section-label">${esc(x.category || 'UMUM')}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></div></article>`,
    galeri: x => `<div class="gallery-item">${validImage(x.image) ? `<img loading="lazy" src="${validImage(x.image)}" alt="${esc(x.title)}">` : ''}<div class="gallery-overlay"><span>${esc(x.title)}</span></div></div>`,
    guru: x => `<article class="staff-card"><div class="staff-avatar">${validImage(x.image) ? `<img loading="lazy" src="${validImage(x.image)}" alt="${esc(x.title)}">` : '<i class="fa-solid fa-user-tie"></i>'}</div><span>${esc(x.category || 'Guru')}</span><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></article>`,
    prestasi: x => `<article class="achievement-card"><div class="achievement-icon"><i class="fa-solid fa-trophy"></i></div><div class="achievement-date">${esc((x.date || '').slice(0,4))}</div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>${validImage(x.image) ? `<img class="cms-achievement-image" loading="lazy" src="${validImage(x.image)}" alt="${esc(x.title)}">` : ''}</article>`
  };
  async function renderType(type) {
    const container = document.querySelector(config[type][0]);
    if (!container) return;
    const response = await fetch('/api/content/' + type, { cache: 'no-store' });
    if (!response.ok) throw new Error('Server tidak tersedia');
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) return;
    container.innerHTML = rows.map(cards[type]).join('');
    container.addEventListener('click', event => {
      const button = event.target.closest('.cms-read'); if (!button) return;
      const item = rows.find(row => row.id === button.dataset.id); if (!item) return;
      const dialog = document.createElement('dialog'); dialog.className = 'cms-dialog';
      const title = document.createElement('h2'); title.textContent = item.title;
      const close = document.createElement('button'); close.className = 'cms-close'; close.textContent = '×'; close.setAttribute('aria-label','Tutup');
      const body = document.createElement('p'); body.style.whiteSpace = 'pre-wrap'; body.textContent = item.content || '';
      dialog.append(close,title,body); document.body.append(dialog);
      close.onclick = () => dialog.close(); dialog.onclose = () => dialog.remove(); dialog.showModal();
    });
  }
  const path = location.pathname.toLowerCase();
  const type = Object.keys(config).find(t => path.endsWith('/' + t + '.html'));
  if (type) {
    renderType(type).catch(error => console.warn('CMS tidak tersambung. Buka website melalui server Node.js:', error.message));
  } else if (path === '/' || path.endsWith('/index.html')) {
    // Sinkronkan juga bagian berita, galeri, dan prestasi di halaman beranda.
    ['berita', 'galeri', 'prestasi'].forEach(t => renderType(t).catch(error => console.warn('CMS:', error.message)));
  }
})();
