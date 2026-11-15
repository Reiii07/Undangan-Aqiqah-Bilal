// ===== Database ucapan (Firebase Firestore) =====
const FB = { projectId: "", apiKey: "" };
const fbAktif = Boolean(FB.projectId && FB.apiKey);
const dasarDB = `https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents`;

// 1. Penanganan Parameter URL untuk Nama Tamu (?to=...)
const urlParams = new URLSearchParams(window.location.search);
const namaTamu = urlParams.get("to");
if (namaTamu) {
  // decodeURIComponent memastikan spasi (+) atau karakter khusus terbaca normal
  document.getElementById("nama-tamu").textContent = decodeURIComponent(namaTamu);
}

// Variabel Musik & Tombol Musik
const musik = document.getElementById("musik-latar");
const tombolMusik = document.getElementById("tombol-musik");
let sedangDiputar = false;

function toggleMusik() {
  if (!musik) return;
  if (sedangDiputar) {
    musik.pause();
    tombolMusik.textContent = "🔇";
    sedangDiputar = false;
  } else {
    musik.play().then(() => {
      tombolMusik.textContent = "🔊";
      sedangDiputar = true;
    }).catch(error => {
      console.log("Autoplay dicegah:", error);
    });
  }
}

if (tombolMusik) {
  tombolMusik.addEventListener("click", toggleMusik);
}

// 2. Tombol "Buka Undangan" (Efek Buka Amplop & Putar Musik)
const cover = document.getElementById("cover");
const isi = document.getElementById("isi");
const btn = document.getElementById("btn-buka");

btn.addEventListener("click", () => {
  btn.disabled = true;
  cover.classList.add("membuka");                      

  if (musik) {
    musik.play().then(() => {
      sedangDiputar = true;
      tombolMusik.textContent = "🔊";
    }).catch(error => {
      console.log("Autoplay dicegah browser:", error);
    });
  }

  setTimeout(() => {                                   
    cover.hidden = true;
    isi.hidden = false;
    document.body.classList.remove("terkunci");
    window.scrollTo(0, 0);
  }, 800);
});

// Musik berhenti otomatis saat tab disembunyikan
window.addEventListener("visibilitychange", () => {
  if (document.hidden && musik && sedangDiputar) {
    musik.pause();
    sedangDiputar = false;
    if (tombolMusik) tombolMusik.textContent = "🔇";
  }
});

// 3. Hitung mundur (WITA = UTC+8)
const target = new Date("2026-11-18T09:00:00+08:00").getTime();
const el = id => document.getElementById(id);
function hitung() {
  const selisih = target - Date.now();
  if (selisih <= 0) {
    ["hari", "jam", "menit", "detik"].forEach(i => (el(i).textContent = "0"));
    el("pesan-hitung").textContent = "Acara sedang berlangsung.";
    return;
  }
  el("hari").textContent = Math.floor(selisih / 86400000);
  el("jam").textContent = Math.floor((selisih % 86400000) / 3600000);
  el("menit").textContent = Math.floor((selisih % 3600000) / 60000);
  el("detik").textContent = Math.floor((selisih % 60000) / 1000);
}
hitung();
setInterval(hitung, 1000);

// 4. Kirim ucapan
const form = document.getElementById("form-ucapan");
const status = el("status-ucapan");
const daftar = el("daftar-ucapan");
if (fbAktif) form.querySelector("button[type=submit]").textContent = "Kirim Ucapan";
else el("wishes").hidden = true;

form.addEventListener("submit", async e => {
  e.preventDefault();
  const d = { nama: form.nama.value.trim(), hadir: form.hadir.value, ucapan: form.ucapan.value.trim() };
  if (!fbAktif) {
    const pesan = "Assalamu'alaikum, saya " + d.nama + ".\nKehadiran: " + d.hadir + "\nUcapan: " + d.ucapan;
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
    status.textContent = "Terkirim!";
  } catch {
    status.textContent = "Gagal mengirim.";
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
  nama.textContent = d.nama; 
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
        orderBy: [{ field: { fieldPath: "waktu" }, direction: "DESCENDING" }], limit: 30 } })
    });
    const data = await r.json();
    daftar.innerHTML = '<p class="kosong">Belum ada ucapan.</p>';
    data.filter(x => x.document).reverse().forEach(x => {
      const f = x.document.fields;
      tampilUcapan({ nama: f.nama?.stringValue || "", hadir: f.hadir?.stringValue || "", ucapan: f.ucapan?.stringValue || "" }, true);
    });
  } catch {
    daftar.innerHTML = '<p class="kosong">Gagal memuat.</p>';
  }
}
if (fbAktif) muatUcapan();

// 5. Tombol salin
function pasangSalin(idTombol, idTeks, label) {
  const tombol = el(idTombol);
  tombol.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(el(idTeks).textContent.trim());
      tombol.textContent = "Tersalin";
    } catch {
      tombol.textContent = "Gagal";
    }
    setTimeout(() => (tombol.textContent = label), 2000);
  });
}
pasangSalin("btn-salin", "nomor-dana", "Salin Nomor");
pasangSalin("btn-salin-alamat", "alamat-kado", "Salin Alamat");

// 6. Kilau emas latar
const latar = document.querySelector(".latar-buram");
for (let i = 0; i < 8; i++) {
  const k = document.createElement("span");
  k.className = "kilau";
  k.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;--u:${2 + Math.random() * 2}px;--t:${6 + Math.random() * 4}s;--d:${-Math.random() * 8}s`;
  latar.appendChild(k);
}

// 7. Interaksi Peta
const petaBox = document.querySelector(".peta");
if (petaBox) {
  petaBox.addEventListener("click", () => {
    petaBox.classList.add("aktif");
  });
}

// 8. Efek Scroll Reveal Mulus (Diperhalus dengan durasi 1.4s)
const seksiList = document.querySelectorAll("#isi section, #isi footer");
const gayaAnimasi = ["muncul-up", "muncul-zoom", "muncul-left", "muncul-right"];

seksiList.forEach((s, index) => {
  const pilihanGaya = gayaAnimasi[index % gayaAnimasi.length];
  s.classList.add(pilihanGaya);
});

const pengamat = new IntersectionObserver((daftar) => {
  daftar.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("tampil");
    }
  });
}, { threshold: 0.15 });

seksiList.forEach((s) => {
  pengamat.observe(s);
});

// 9. Detik
setInterval(() => {
  const d = el("detik");
  if(d) {
    d.classList.remove("ganti"); void d.offsetWidth; d.classList.add("ganti");
  }
}, 1000);

// 10. Galeri foto slider
window.addEventListener("load", () => {
  const slides = el("slides");
  if(!slides) return;
  const fotos = [...slides.querySelectorAll("img")];
  if (!fotos.length) { el("galeri").hidden = true; return; }
  const titik = el("titik");
  let aktif = 0;

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
    b.addEventListener("click", () => ke(i));
    titik.appendChild(b);
  });
  slides.addEventListener("scroll", () => {
    const n = Math.round(slides.scrollLeft / slides.clientWidth);
    if (n !== aktif) { aktif = n; tandai(); }
  }, { passive: true });
  
  const btnPrev = el("sebelum");
  const btnNext = el("sesudah");
  if(btnPrev) btnPrev.addEventListener("click", () => ke(aktif - 1));
  if(btnNext) btnNext.addEventListener("click", () => ke(aktif + 1));
  
  if (fotos.length === 1 && btnPrev && btnNext && titik) { 
    btnPrev.hidden = btnNext.hidden = titik.hidden = true; 
  }
  tandai();
});