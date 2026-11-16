const el = id => document.getElementById(id);

// Mode ringan: otomatis untuk HP berspesifikasi sangat rendah atau hemat data.
// Tes manual: tambahkan ?ringan=1 di link. Matikan paksa: ?ringan=0
const paksa = new URLSearchParams(location.search).get("ringan");
const lemah = (navigator.deviceMemory && navigator.deviceMemory <= 2) || navigator.hardwareConcurrency <= 2 || (navigator.connection && navigator.connection.saveData);
const ringan = paksa === "1" || (paksa !== "0" && Boolean(lemah));
if (ringan) document.body.classList.add("ringan");

// 1. Nama tamu dari link: index.html?to=Nama
const namaTamu = new URLSearchParams(window.location.search).get("to");
if (namaTamu) el("nama-tamu").textContent = namaTamu;

// 2. Musik
const musik = el("musik-latar");
const tombolMusik = el("tombol-musik");
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
    }).catch(error => console.log("Autoplay dicegah:", error));
  }
}
if (tombolMusik) tombolMusik.addEventListener("click", toggleMusik);

// Musik berhenti otomatis saat tab disembunyikan
window.addEventListener("visibilitychange", () => {
  if (document.hidden && musik && sedangDiputar) {
    musik.pause();
    sedangDiputar = false;
    if (tombolMusik) tombolMusik.textContent = "🔇";
  }
});

// 3. Tombol "Buka Undangan" (efek amplop dan putar musik)
const cover = el("cover");
const isi = el("isi");
const btn = el("btn-buka");

btn.addEventListener("click", () => {
  btn.disabled = true;
  cover.classList.add("membuka");

  if (musik) {
    musik.play().then(() => {
      sedangDiputar = true;
      tombolMusik.textContent = "🔊";
    }).catch(error => console.log("Autoplay dicegah browser:", error));
  }

  setTimeout(() => {
    cover.hidden = true;
    isi.hidden = false;
    document.body.classList.remove("terkunci");
    window.scrollTo(0, 0);
  }, 800);
});

// 4. Hitung mundur (WITA = UTC+8)
const target = new Date("2026-11-18T09:00:00+08:00").getTime();
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

// 5. Kirim ucapan lewat WhatsApp
const form = el("form-ucapan");
const status = el("status-ucapan");
form.addEventListener("submit", e => {
  e.preventDefault();
  const pesan = "Assalamu'alaikum, saya " + form.nama.value.trim() +
    ".\nKehadiran: " + form.hadir.value + "\nUcapan: " + form.ucapan.value.trim();
  window.open("https://wa.me/6281343876571?text=" + encodeURIComponent(pesan), "_blank");
  status.textContent = "WhatsApp terbuka. Tekan kirim di sana untuk menyampaikan ucapan Anda.";
  form.reset();
});

// 6. Tombol salin
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

// 7. Kilau emas latar
const latar = document.querySelector(".latar-buram");
for (let i = 0; i < (ringan ? 0 : 8); i++) {
  const k = document.createElement("span");
  k.className = "kilau";
  k.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;--u:${2 + Math.random() * 2}px;--t:${6 + Math.random() * 4}s;--d:${-Math.random() * 8}s`;
  latar.appendChild(k);
}

// 8. Interaksi peta (ketuk dulu supaya halaman tidak ikut tergeser)
const petaBox = document.querySelector(".peta");
if (petaBox) petaBox.addEventListener("click", () => petaBox.classList.add("aktif"));

// 9. Efek scroll: muncul tiap bagian masuk layar, dan diulang setiap kali di-scroll lagi
const seksiList = document.querySelectorAll("#isi section, #isi footer");
const gayaAnimasi = ["muncul-up", "muncul-zoom", "muncul-left", "muncul-right"];
const kurangiGerak = matchMedia("(prefers-reduced-motion: reduce)").matches;

seksiList.forEach((s, index) => {
  s.classList.add(gayaAnimasi[index % gayaAnimasi.length]);
  [...s.children].forEach((anak, i) => anak.style.setProperty("--i", i));   // urutan muncul isi bagian
  // dua bunga yang mekar di sudut bagian
  s.insertAdjacentHTML("beforeend",
    '<svg class="bunga-sudut a" aria-hidden="true"><use href="#bunga"/></svg>' +
    '<svg class="bunga-sudut b" aria-hidden="true"><use href="#bunga"/></svg>');
});

const pengamat = new IntersectionObserver(daftar => {
  daftar.forEach(e => {
    if (e.intersectionRatio >= 0.12) e.target.classList.add("tampil");
    else if (e.intersectionRatio === 0) e.target.classList.remove("tampil");   // keluar layar: siap diputar lagi
  });
}, { threshold: [0, 0.12] });
seksiList.forEach(s => pengamat.observe(s));

// 9b. Bunga dan kelopak jatuh setiap kali halaman di-scroll
const hujan = document.createElement("div");
hujan.className = "hujan";
document.body.appendChild(hujan);
const warnaBunga = ["#f29e88", "#e58aa0", "#f6c7b0", "#e8c07a", "#f4a9b8"];
let posisiTerakhir = 0, jarakScroll = 0;

function jatuhkan() {
  if (hujan.children.length > 16) return;
  const item = document.createElement("span");
  const bunga = Math.random() < 0.55;
  item.className = "jatuh " + (bunga ? "bunga" : "kelopak");
  item.style.cssText =
    `left:${Math.random() * 100}%;--u:${16 + Math.random() * 20}px;--t:${7 + Math.random() * 4}s;` +
    `--x:${Math.random() * 140 - 70}px;--w:${warnaBunga[Math.floor(Math.random() * warnaBunga.length)]}`;
  if (bunga) item.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#bunga"/></svg>';
  item.addEventListener("animationend", () => item.remove());
  hujan.appendChild(item);
}
window.addEventListener("scroll", () => {
  if (kurangiGerak || ringan || isi.hidden) return;
  jarakScroll += Math.abs(window.scrollY - posisiTerakhir);
  posisiTerakhir = window.scrollY;
  if (jarakScroll > 140) { jarakScroll = 0; jatuhkan(); }
}, { passive: true });

// 9c. Ketuk di mana saja: bunga kecil mekar dan kelopaknya memercik
document.addEventListener("pointerdown", e => {
  if (kurangiGerak || ringan || isi.hidden || hujan.children.length > 40) return;
  if (e.target.closest("button, a, input, textarea, label, .slider")) return;
  const warna = () => warnaBunga[Math.floor(Math.random() * warnaBunga.length)];
  const bunga = document.createElement("span");
  bunga.className = "tap-bunga";
  bunga.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--w:${warna()}`;
  bunga.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#bunga"/></svg>';
  bunga.addEventListener("animationend", () => bunga.remove());
  hujan.appendChild(bunga);
  for (let i = 0; i < 6; i++) {
    const sudut = (Math.PI * 2 / 6) * i + Math.random() * 0.6;
    const jarak = 34 + Math.random() * 30;
    const k = document.createElement("span");
    k.className = "cipratan";
    k.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${Math.cos(sudut) * jarak}px;--dy:${Math.sin(sudut) * jarak}px;--w:${warna()}`;
    k.addEventListener("animationend", () => k.remove());
    hujan.appendChild(k);
  }
});

// 10. Detik "mengetuk" tiap berganti
setInterval(() => {
  const d = el("detik");
  if (d) { d.classList.remove("ganti"); void d.offsetWidth; d.classList.add("ganti"); }
}, 1000);

// 11. Galeri: satu foto per geser, berganti otomatis, dengan thumbnail, penghitung, dan garis waktu
window.addEventListener("load", () => {
  const slides = el("slides");
  if (!slides) return;
  const fotos = [...slides.querySelectorAll("img")];
  if (!fotos.length) { el("galeri").hidden = true; return; }

  const slider = slides.parentElement;
  const thumbs = el("titik");
  const btnPrev = el("sebelum"), btnNext = el("sesudah");
  const DURASI = 4000;                        // ganti foto tiap 4 detik
  const nol = n => String(n).padStart(2, "0");
  let aktif = 0, terlihat = false, jalan = !kurangiGerak && fotos.length > 1;
  let timer = null, idle = null, pindah = false;

  thumbs.classList.add("thumbs");
  const hitungFoto = document.createElement("span");
  hitungFoto.className = "hitung-foto";
  slider.append(hitungFoto);
  const progres = document.createElement("div");
  progres.className = "progres";
  progres.innerHTML = "<i></i>";
  slider.after(progres);
  ["a", "b", "c"].forEach(k => slider.insertAdjacentHTML("beforeend", '<svg class="kerlip ' + k + '" aria-hidden="true"><use href="#bintang"/></svg>'));

  function tandai() {
    [...thumbs.children].forEach((b, i) => b.classList.toggle("on", i === aktif));
    hitungFoto.textContent = nol(aktif + 1) + " / " + nol(fotos.length);
  }
  function mulaiProgres() {
    const bar = progres.firstElementChild;
    bar.style.animation = "none"; void bar.offsetWidth;
    if (jalan) { progres.classList.remove("jeda"); bar.style.animation = "progres " + DURASI + "ms linear forwards"; }
    else progres.classList.add("jeda");
  }
  function ke(i) {
    const lama = aktif;
    aktif = (i + fotos.length) % fotos.length;
    const balikAwal = lama === fotos.length - 1 && aktif === 0 && i >= fotos.length;
    pindah = true; setTimeout(() => (pindah = false), 800);
    slides.scrollTo({ left: aktif * slides.clientWidth, behavior: balikAwal ? "instant" : "smooth" });
    tandai(); mulaiProgres();
  }
  function jadwal() {
    clearTimeout(timer);
    if (!jalan) return;
    timer = setTimeout(() => { if (terlihat) ke(aktif + 1); jadwal(); }, DURASI);
  }
  function berhenti() {                       // tamu menyentuh galeri: otomatis berhenti, lanjut lagi setelah 8 detik
    jalan = false; clearTimeout(timer); clearTimeout(idle); mulaiProgres();
    if (fotos.length > 1 && !kurangiGerak) idle = setTimeout(() => { jalan = true; mulaiProgres(); jadwal(); }, 8000);
  }

  fotos.forEach((f, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Foto " + (i + 1));
    const kecil = document.createElement("img");
    kecil.src = f.src; kecil.alt = "";
    b.appendChild(kecil);
    b.addEventListener("click", () => { berhenti(); ke(i); });
    thumbs.appendChild(b);
  });
  slides.addEventListener("scroll", () => {
    if (pindah) return;
    const n = Math.round(slides.scrollLeft / slides.clientWidth);
    if (n !== aktif) { aktif = n; tandai(); }
  }, { passive: true });
  slides.addEventListener("pointerdown", berhenti);
  btnPrev.addEventListener("click", () => { berhenti(); ke(aktif - 1); });
  btnNext.addEventListener("click", () => { berhenti(); ke(aktif + 1); });

  if (fotos.length === 1) btnPrev.hidden = btnNext.hidden = thumbs.hidden = hitungFoto.hidden = progres.hidden = true;
  tandai(); mulaiProgres();

  // otomatis hanya jalan saat galeri terlihat di layar
  new IntersectionObserver(e => {
    terlihat = e[0].isIntersecting;
    if (terlihat) { mulaiProgres(); jadwal(); } else clearTimeout(timer);
  }, { threshold: 0.4 }).observe(slides);
});