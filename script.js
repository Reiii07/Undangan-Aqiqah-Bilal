// ===== Database ucapan (Firebase Firestore) =====
// Isi dua nilai ini setelah membuat proyek Firebase. Kalau dikosongkan, ucapan dikirim lewat WhatsApp saja.
const FB = { projectId: "", apiKey: "" };
const fbAktif = Boolean(FB.projectId && FB.apiKey);
const dasarDB = `https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents`;

// 1. Nama tamu dari link: index.html?to=Budi%20Santoso
const nama = new URLSearchParams(location.search).get("to");
if (nama) document.getElementById("nama-tamu").textContent = nama;

// 2. Tombol "Buka Undangan"
const cover = document.getElementById("cover");
const isi = document.getElementById("isi");
const btn = document.getElementById("btn-buka");
btn.addEventListener("click", () => {
  btn.disabled = true;
  cover.classList.add("membuka");                      // cover memudar dan hiasan naik

  // Putar musik latar secara otomatis saat tombol dibuka
  const musik = document.getElementById("musik-latar");
  if (musik) {
    musik.play().catch(error => {
      console.log("Autoplay dicegah browser:", error);
    });
  }

  setTimeout(() => {                                   // setelah animasi selesai, tampilkan isi
    cover.hidden = true;
    isi.hidden = false;
    document.body.classList.remove("terkunci");
    window.scrollTo(0, 0);
  }, 900);
});

// 3. Hitung mundur (WITA = UTC+8)
const target = new Date("2026-11-18T09:00:00+08:00").getTime();
const el = id => document.getElementById(id);
function hitung() {
  const selisih = target - Date.now();
  if (selisih <= 0) {
    ["hari", "jam", "menit", "detik"].forEach(i => (el(i).textContent = "0"));
    el("pesan-hitung").textContent = "Acara sedang atau sudah berlangsung. Terima kasih atas doanya.";
    return;
  }
  el("hari").textContent = Math.floor(selisih / 86400000);
  el("jam").textContent = Math.floor((selisih % 86400000) / 3600000);
  el("menit").textContent = Math.floor((selisih % 3600000) / 60000);
  el("detik").textContent = Math.floor((selisih % 60000) / 1000);
}
hitung();
setInterval(hitung, 1000);

// 4. Kirim ucapan: ke database kalau aktif, kalau tidak lewat WhatsApp
const form = document.getElementById("form-ucapan");
const status = el("status-ucapan");
const daftar = el("daftar-ucapan");
if (fbAktif) form.querySelector("button[type=submit]").textContent = "Kirim Ucapan";
else el("wishes").hidden = true;

form.addEventListener("submit", async e => {
  e.preventDefault();
  const d = { nama: form.nama.value.trim(), hadir: form.hadir.value, ucapan: form.ucapan.value.trim() };
  if (!fbAktif) {
    const pesan = "Assalamu'alaikum, saya " + d.nama + ".\nKehadiran: " + d.hadir + "\nUcapan dan doa: " + d.ucapan;
    window.open("https://wa.me/6281343876571?text=" + encodeURIComponent(pesan), "_blank");
    return;
  }
  const tombol = form.querySelector("button[type=submit]");
  tombol.disabled = true;
  status.textContent = "Mengirim...";
  try {
    const r = await fetch(`${dasarDB}/ucapan?key=${FB.apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: {
        nama: { stringValue: d.nama }, hadir: { stringValue: d.hadir },
        ucapan: { stringValue: d.ucapan }, waktu: { timestampValue: new Date().toISOString() } } })
    });
    if (!r.ok) throw new Error(r.status);
    tampilUcapan(d, true);
    form.reset();
    status.textContent = "Terima kasih, ucapan dan doa Anda sudah terkirim.";
  } catch {
    status.textContent = "Ucapan belum terkirim. Silakan coba lagi.";
  }
  tombol.disabled = false;
});

function tampilUcapan(d, diAwal) {
  daftar.querySelector(".kosong")?.remove();
  const item = document.createElement("article");
  item.className = "ucapan-item";
  const kepala = document.createElement("div");
  kepala.className = "kepala";
  const nama = document.createElement("strong");
  nama.textContent = d.nama;                       // textContent: aman dari kode berbahaya
  const lencana = document.createElement("span");
  lencana.className = "lencana";
  lencana.textContent = d.hadir;
  kepala.append(nama, lencana);
  const isiUcapan = document.createElement("p");
  isiUcapan.textContent = d.ucapan;
  item.append(kepala, isiUcapan);
  diAwal ? daftar.prepend(item) : daftar.append(item);
}

async function muatUcapan() {
  try {
    const r = await fetch(`${dasarDB}:runQuery?key=${FB.apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: "ucapan" }],
        orderBy: [{ field: { fieldPath: "waktu" }, direction: "DESCENDING" }], limit: 40 } })
    });
    const data = await r.json();
    daftar.innerHTML = '<p class="kosong">Belum ada ucapan. Jadilah yang pertama.</p>';
    data.filter(x => x.document).reverse().forEach(x => {
      const f = x.document.fields;
      tampilUcapan({ nama: f.nama?.stringValue || "", hadir: f.hadir?.stringValue || "", ucapan: f.ucapan?.stringValue || "" }, true);
    });
  } catch {
    daftar.innerHTML = '<p class="kosong">Ucapan belum dapat dimuat.</p>';
  }
}
if (fbAktif) muatUcapan();

// 5. Tombol salin (nomor DANA dan alamat kado)
function pasangSalin(idTombol, idTeks, label) {
  const tombol = el(idTombol);
  tombol.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(el(idTeks).textContent.trim());
      tombol.textContent = "Tersalin";
    } catch {
      tombol.textContent = "Salin manual ya";
    }
    setTimeout(() => (tombol.textContent = label), 2000);
  });
}
pasangSalin("btn-salin", "nomor-dana", "Salin Nomor");
pasangSalin("btn-salin-alamat", "alamat-kado", "Salin Alamat");

// 6. Kilau emas melayang di latar
const latar = document.querySelector(".latar-buram");
for (let i = 0; i < 34; i++) {
  const k = document.createElement("span");
  k.className = "kilau";
  k.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;--u:${2 + Math.random() * 4}px;--t:${4 + Math.random() * 5}s;--d:${-Math.random() * 8}s`;
  latar.appendChild(k);
}

// 6b. Hiasan daun di sisi tiap bagian dan pemisah bintang-bulan
document.querySelectorAll("#isi section").forEach((s, i) => {
  s.insertAdjacentHTML("beforeend", '<svg class="sudut a" aria-hidden="true"><use href="#daun"/></svg><svg class="sudut b" aria-hidden="true"><use href="#daun"/></svg>');
});

// 7. Muncul pelan saat di-scroll
const target2 = document.querySelectorAll("#isi section > *:not(.sudut), #isi > .sela, footer > *");
const pengamat = new IntersectionObserver((daftar) => {
  daftar.forEach(e => { if (e.isIntersecting) { e.target.classList.add("tampil"); pengamat.unobserve(e.target); } });
}, { threshold: 0.15 });
target2.forEach((el, i) => {
  el.classList.add("muncul");
  el.style.setProperty("--tunda", `${(i % 4) * 0.12}s`);
  pengamat.observe(el);
});

// 8. Angka detik "mengetuk" tiap berganti
setInterval(() => {
  const d = el("detik");
  d.classList.remove("ganti"); void d.offsetWidth; d.classList.add("ganti");
}, 1000);

// 9. Our Gallery: satu foto per geser (geser jari, tombol panah, titik, dan otomatis)
window.addEventListener("load", () => {
  const slides = el("slides");
  const fotos = [...slides.querySelectorAll("img")];
  if (!fotos.length) { el("galeri").hidden = true; return; }
  const titik = el("titik");
  let aktif = 0, terlihat = false, otomatis = null;

  function tandai() { [...titik.children].forEach((b, i) => b.classList.toggle("on", i === aktif)); }
  function ke(i) {
    aktif = (i + fotos.length) % fotos.length;
    slides.scrollTo({ left: aktif * slides.clientWidth, behavior: "smooth" });
    tandai();
  }
  fotos.forEach((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Foto " + (i + 1));
    b.addEventListener("click", () => { berhenti(); ke(i); });
    titik.appendChild(b);
  });
  slides.addEventListener("scroll", () => {
    const n = Math.round(slides.scrollLeft / slides.clientWidth);
    if (n !== aktif) { aktif = n; tandai(); }
  }, { passive: true });
  el("sebelum").addEventListener("click", () => { berhenti(); ke(aktif - 1); });
  el("sesudah").addEventListener("click", () => { berhenti(); ke(aktif + 1); });
  if (fotos.length === 1) { el("sebelum").hidden = el("sesudah").hidden = titik.hidden = true; }
  tandai();

  // ganti foto otomatis tiap 4 detik, hanya saat galeri terlihat, berhenti kalau tamu menggeser sendiri
  function berhenti() { clearInterval(otomatis); otomatis = null; }
  slides.addEventListener("pointerdown", berhenti);
  if (fotos.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    new IntersectionObserver(e => { terlihat = e[0].isIntersecting; }).observe(slides);
    otomatis = setInterval(() => { if (terlihat) ke(aktif + 1); }, 4000);
  }
});

// 10. Foto latar: mencari latar.jpeg/.jpg/.png/.webp di folder yang sama dengan index.html, lalu di folder foto/
(function cariLatar(i) {
  const calon = [];
  ["", "foto/"].forEach(f => ["jpeg", "jpg", "png", "webp"].forEach(e  => calon.push(f + "latar." + e)));
  if (i >= calon.length) { console.warn("Foto latar tidak ditemukan. Simpan sebagai latar.jpeg di folder yang sama dengan index.html"); return; }
  const gambar = new Image();
  gambar.onload = () => {
    document.documentElement.style.setProperty("--foto", 'url("' + calon[i] + '")');
    document.body.classList.add("ada-foto");
  };
  gambar.onerror = () => cariLatar(i + 1);
  gambar.src = calon[i];
})(0);