# CMS SDI Dewi Masyithoh — paket lokal siap dicoba

## Login admin lokal
- Username: `admin`
- Password awal: `MasyithohAdmin2026!`

Password bawaan ini hanya untuk komputer lokal. Jangan unggah website ke internet dengan password ini. Untuk mengganti password pada sesi terminal PowerShell, jalankan `$env:ADMIN_PASSWORD="PasswordBaruMinimal12Karakter!"` sebelum `npm.cmd start`.

## Cara memasang
1. Ekstrak seluruh ZIP ke folder baru.
2. Buka folder `dewi-masyitoh-cms` di VS Code (folder yang berisi `package.json` dan `server.js`).
3. Terminal → New Terminal.
4. Jalankan `npm.cmd install`.
5. Jalankan `npm.cmd start`. Jika ingin memakai password awal, jangan set `ADMIN_PASSWORD` di terminal.
6. Buka `http://localhost:3000/admin.html` untuk admin dan `http://localhost:3000` untuk website publik.

Jangan buka website memakai `file://` atau Live Server. CMS harus dibuka melalui `http://localhost:3000` agar admin dan website memakai database yang sama. Biarkan terminal server tetap terbuka.

## Cara mengelola
Di panel admin, pilih Berita/Pengumuman/Galeri/Guru/Prestasi, tekan Tambah Konten, isi data, pilih gambar (JPG/PNG/WEBP/GIF maks. 4 MB), centang Publikasikan, lalu Simpan. Refresh halaman publik untuk melihat konten terbaru.

## Data
- Konten: `data/content.json`
- Foto: `uploads/`
- Login: server lokal, sesi akan berakhir setelah 8 jam.

## Catatan penting
Paket ini ditujukan untuk pengembangan lokal. Jangan diekspos ke internet tanpa konfigurasi keamanan tambahan, HTTPS, backup, dan penggantian password awal. Jika pernah terkunci akibat terlalu banyak login, hentikan proses server Node.js yang aktif lalu jalankan kembali.
