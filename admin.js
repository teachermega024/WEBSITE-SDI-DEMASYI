/* CMS SDI Dewi Masyithoh - panel admin */
'use strict';
const TYPES = { berita: 'Berita', pengumuman: 'Pengumuman', galeri: 'Galeri', guru: 'Guru & Staf', prestasi: 'Prestasi' };
let current = 'berita';
let records = [];
let currentImage = '';
let previewUrl = '';
const $ = selector => document.querySelector(selector);

async function api(path, options = {}) {
  const response = await fetch('/api/' + path, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Permintaan gagal (${response.status})`);
  return data;
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(selector, text) { const el = $(selector); if (el) el.textContent = text || ''; }
function preview(src) {
  const img = $('#preview');
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
  if (!src) { img.hidden = true; img.removeAttribute('src'); return; }
  img.src = src; img.hidden = false;
}

function init() {
  const nav = $('#navigation');
  nav.innerHTML = Object.entries(TYPES).map(([key, title]) => `<button type="button" class="nav-btn" data-type="${key}">${esc(title)}</button>`).join('');
  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-type]');
    if (button) load(button.dataset.type);
  });
  $('#loginForm').addEventListener('submit', login);
  $('#logoutBtn').addEventListener('click', async () => {
    try { await api('logout', { method: 'POST' }); location.reload(); }
    catch (error) { alert(error.message); }
  });
  $('#addBtn').addEventListener('click', () => edit());
  $('#closeBtn').addEventListener('click', () => $('#editor').close());
  $('#cancelBtn').addEventListener('click', () => $('#editor').close());
  $('#editorForm').addEventListener('submit', save);
  $('#search').addEventListener('input', render);
  $('#items').addEventListener('click', async event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const item = records.find(row => row.id === button.dataset.id); if (!item) return;
    if (button.dataset.action === 'edit') return edit(item);
    if (button.dataset.action === 'delete' && confirm(`Hapus "${item.title}"?`)) {
      try { await api(`content/${current}/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); await load(current); }
      catch (error) { alert(error.message); }
    }
  });
  $('#imageFile').addEventListener('change', () => {
    const file = $('#imageFile').files[0];
    if (!file) { preview(currentImage); return; }
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      message('#editorMessage', 'Pilih foto JPG, PNG, WEBP, atau GIF.'); $('#imageFile').value = ''; return;
    }
    if (file.size > 4 * 1024 * 1024) {
      message('#editorMessage', 'Ukuran foto maksimal 4 MB.'); $('#imageFile').value = ''; return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file); $('#preview').src = previewUrl; $('#preview').hidden = false; message('#editorMessage','');
  });
  api('me').then(data => { if (data.authenticated) showDashboard(); }).catch(() => {});
}

async function login(event) {
  event.preventDefault(); message('#loginMessage', 'Memeriksa login...');
  const form = event.currentTarget;
  try {
    await api('login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    message('#loginMessage',''); showDashboard();
  } catch (error) { message('#loginMessage', error.message); }
}
function showDashboard() { $('#loginView').hidden = true; $('#dashboard').hidden = false; load(current); }
async function load(type) {
  current = type; $('#pageTitle').textContent = 'Kelola ' + TYPES[type];
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.type === type));
  message('#message', 'Memuat konten...');
  try { records = await api('content/' + type); message('#message',''); render(); }
  catch (error) { records = []; render(); message('#message', error.message); }
}
function render() {
  const query = ($('#search').value || '').toLocaleLowerCase('id');
  const rows = records.filter(item => String(item.title || '').toLocaleLowerCase('id').includes(query));
  $('#items').innerHTML = rows.length ? rows.map(item => `
    <div class="item">
      ${item.image ? `<img class="thumb" src="${esc(item.image)}" alt="Foto ${esc(item.title)}" onerror="this.style.visibility='hidden'">` : '<div class="thumb" aria-label="Belum ada foto"></div>'}
      <div class="details"><h3>${esc(item.title)}</h3><small>${esc(item.category || TYPES[current])} · ${esc(item.date)}</small></div>
      <span class="status ${item.published ? '' : 'draft'}">${item.published ? 'Terbit' : 'Draft'}</span>
      <button type="button" class="secondary" data-action="edit" data-id="${esc(item.id)}">Edit</button>
      <button type="button" class="danger" data-action="delete" data-id="${esc(item.id)}">Hapus</button>
    </div>`).join('') : '<div class="empty">Belum ada konten. Klik “Tambah Konten” untuk memulai.</div>';
}
function edit(item) {
  const form = $('#editorForm'); form.reset();
  form.elements.id.value = item?.id || ''; form.elements.title.value = item?.title || '';
  form.elements.category.value = item?.category || ''; form.elements.date.value = item?.date || new Date().toLocaleDateString('en-CA');
  form.elements.description.value = item?.description || ''; form.elements.content.value = item?.content || '';
  form.elements.published.checked = item?.published ?? true; currentImage = item?.image || '';
  preview(currentImage); message('#editorMessage',''); $('#editorTitle').textContent = (item ? 'Edit ' : 'Tambah ') + TYPES[current];
  $('#editor').showModal();
}
async function uploadImage(file) {
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Pilih foto JPG, PNG, WEBP, atau GIF.');
  if (file.size > 4 * 1024 * 1024) throw new Error('Ukuran foto maksimal 4 MB.');
  const body = new FormData(); body.append('image', file);
  const result = await api('upload', { method: 'POST', body });
  if (!result.url || !result.url.startsWith('/uploads/')) throw new Error('Server tidak mengembalikan alamat foto yang valid.');
  return result.url;
}
async function save(event) {
  event.preventDefault(); const form = event.currentTarget; const button = $('#saveBtn');
  button.disabled = true; const oldText = button.textContent; button.textContent = 'Menyimpan...'; message('#editorMessage','');
  try {
    let image = currentImage; const file = $('#imageFile').files[0];
    if (file) image = await uploadImage(file);
    if (image) {
      const check = await fetch(image, { cache: 'no-store' });
      if (!check.ok) throw new Error(`Foto diunggah tetapi tidak dapat dibuka (HTTP ${check.status}).`);
      const contentType = check.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) throw new Error('Alamat foto tidak mengarah ke file gambar.');
    }
    const item = { id: form.elements.id.value || undefined, title: form.elements.title.value.trim(), category: form.elements.category.value.trim(), date: form.elements.date.value, description: form.elements.description.value.trim(), content: form.elements.content.value.trim(), published: form.elements.published.checked, image: image || '' };
    await api('content/' + current, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(item) });
    $('#editor').close(); await load(current);
    alert(image ? 'Konten dan foto berhasil disimpan. Refresh halaman website untuk melihat hasilnya.' : 'Konten tersimpan. Belum ada foto yang dipilih.');
  } catch (error) { message('#editorMessage', error.message); }
  finally { button.disabled = false; button.textContent = oldText; }
}
init();
