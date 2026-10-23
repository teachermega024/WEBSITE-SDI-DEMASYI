/* =====================================================
   PENGATURAN SEKOLAH - isi di sini, semua halaman ikut terisi.
   Kosongkan ("") jika belum ada. Ikon sosial media yang
   kosong otomatis disembunyikan.
   ===================================================== */
const SITE_CONFIG = {
    whatsapp:  "",   // format internasional tanpa +, contoh: "6281234567890"
    phone:     "",   // contoh: "(0341) 123456"
    email:     "",   // contoh: "info@sdidewimasyithoh.sch.id"
    address:   "",   // alamat lengkap (jika kosong, tetap tampil alamat umum)
    hours:     "",   // contoh: "Senin-Jumat, 07.00-14.00 WIB"
    facebook:  "",   // URL lengkap, contoh: "https://facebook.com/namaakun"
    instagram: "",
    youtube:   "",
    mapsEmbed: ""    // URL dari Google Maps > Bagikan > Sematkan peta (isi src iframe)
};

document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("navbar");
    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const navMenu = document.getElementById("navMenu");

    // Mobile menu
    if (mobileMenuButton && navMenu) {
        mobileMenuButton.addEventListener("click", () => {
            navMenu.classList.toggle("open");
            const icon = mobileMenuButton.querySelector("i");
            const opened = navMenu.classList.contains("open");
            icon.classList.toggle("fa-bars", !opened);
            icon.classList.toggle("fa-xmark", opened);
            mobileMenuButton.setAttribute("aria-expanded", String(opened));
            mobileMenuButton.setAttribute("aria-label", opened ? "Tutup menu" : "Buka menu");
        });

        navMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navMenu.classList.remove("open");
                const icon = mobileMenuButton.querySelector("i");
                icon.classList.remove("fa-xmark");
                icon.classList.add("fa-bars");
            });
        });
    }

    // Navbar shadow
    const updateNavbar = () => {
        navbar?.classList.toggle("scrolled", window.scrollY > 50);
    };
    window.addEventListener("scroll", updateNavbar);
    updateNavbar();

    // Hero slider
    const slides = [...document.querySelectorAll(".hero-slide")];
    const dotsContainer = document.getElementById("sliderDots");
    const prev = document.getElementById("sliderPrev");
    const next = document.getElementById("sliderNext");
    let current = 0;
    let interval;

    if (slides.length && dotsContainer) {
        slides.forEach((_, i) => {
            const dot = document.createElement("button");
            dot.className = "slider-dot" + (i === 0 ? " active" : "");
            dot.setAttribute("aria-label", `Buka slide ${i + 1}`);
            dot.addEventListener("click", () => {
                showSlide(i);
                restartSlider();
            });
            dotsContainer.appendChild(dot);
        });

        const dots = [...dotsContainer.querySelectorAll(".slider-dot")];

        function showSlide(index) {
            current = (index + slides.length) % slides.length;
            slides.forEach((slide, i) => slide.classList.toggle("active", i === current));
            dots.forEach((dot, i) => dot.classList.toggle("active", i === current));
        }

        const startSlider = () => {
            clearInterval(interval);
            interval = setInterval(() => showSlide(current + 1), 6000);
        };
        const restartSlider = startSlider;

        prev?.addEventListener("click", () => { showSlide(current - 1); restartSlider(); });
        next?.addEventListener("click", () => { showSlide(current + 1); restartSlider(); });

        const hero = document.querySelector(".hero");
        hero?.addEventListener("mouseenter", () => clearInterval(interval));
        hero?.addEventListener("mouseleave", startSlider);
        startSlider();
    }

    // Counter
    let countersStarted = false;
    const counters = [...document.querySelectorAll("[data-target]")];

    function runCounters() {
        if (countersStarted || !counters.length) return;
        const stats = document.querySelector(".stats-section");
        if (!stats) return;

        if (stats.getBoundingClientRect().top < window.innerHeight - 100) {
            countersStarted = true;
            counters.forEach(counter => {
                const target = Number(counter.dataset.target);
                let value = 0;
                const step = Math.max(1, Math.ceil(target / 60));
                const timer = setInterval(() => {
                    value += step;
                    if (value >= target) {
                        value = target;
                        clearInterval(timer);
                    }
                    counter.textContent = value;
                }, 25);
            });
        }
    }
    window.addEventListener("scroll", runCounters);
    runCounters();

    // Penanda menu aktif berdasarkan halaman yang sedang dibuka
    (function markActivePage() {
        const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
        document.querySelectorAll(".nav-menu > .nav-link, .nav-menu > .btn-nav, .dropdown-menu a").forEach(link => {
            const href = (link.getAttribute("href") || "").toLowerCase();
            if (!href || href.includes("#")) return;
            if (href !== page) return;
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
            const dropdown = link.closest(".dropdown");
            dropdown?.querySelector(".dropdown-button")?.classList.add("active");
        });
    })();

    // Dropdown: klik/ketuk (mobile & layar sentuh), hover tetap untuk desktop
    const touchLike = () => window.matchMedia("(max-width:850px), (hover: none)").matches;
    const dropdowns = [...document.querySelectorAll(".dropdown")];
    const closeDropdowns = except => dropdowns.forEach(d => {
        if (d === except) return;
        d.classList.remove("open");
        d.querySelector(".dropdown-button")?.setAttribute("aria-expanded", "false");
    });

    dropdowns.forEach(d => {
        const btn = d.querySelector(".dropdown-button");
        btn?.addEventListener("click", e => {
            if (!touchLike()) return;
            e.stopPropagation();
            const willOpen = !d.classList.contains("open");
            closeDropdowns(d);
            d.classList.toggle("open", willOpen);
            btn.setAttribute("aria-expanded", String(willOpen));
        });
    });
    document.addEventListener("click", e => {
        if (!e.target.closest(".dropdown")) closeDropdowns();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeDropdowns();
    });
    window.addEventListener("resize", () => { if (!touchLike()) closeDropdowns(); });

    // ===== Pengaturan sekolah (SITE_CONFIG) =====
    const cfg = SITE_CONFIG;
    const waNumber = String(cfg.whatsapp || "").replace(/\D/g, "");
    const localPhone = n => (n.startsWith("62") ? "0" + n.slice(2) : n);

    // Ikon sosial media: pasang URL, atau sembunyikan jika belum diisi
    const socialUrls = {
        "Facebook": cfg.facebook,
        "Instagram": cfg.instagram,
        "YouTube": cfg.youtube,
        "WhatsApp": waNumber ? `https://wa.me/${waNumber}` : ""
    };
    document.querySelectorAll(".topbar-right a, .social-links a").forEach(a => {
        const key = a.getAttribute("aria-label");
        if (!(key in socialUrls)) return;
        const url = socialUrls[key];
        if (url) {
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
        } else {
            a.hidden = true;
        }
    });

    // Teks kontak (alamat, telepon, email, WhatsApp, jam layanan)
    document.querySelectorAll("[data-site]").forEach(el => {
        const key = el.dataset.site;
        let text = "", href = "";
        if (key === "phone" && cfg.phone) { text = cfg.phone; href = "tel:" + cfg.phone.replace(/[^\d+]/g, ""); }
        else if (key === "email" && cfg.email) { text = cfg.email; href = "mailto:" + cfg.email; }
        else if (key === "whatsapp" && waNumber) { text = localPhone(waNumber); href = `https://wa.me/${waNumber}`; }
        else if (key === "address" && cfg.address) { text = cfg.address; }
        else if (key === "hours" && cfg.hours) { text = cfg.hours; }
        if (!text) return;
        if (href) {
            const link = document.createElement("a");
            link.href = href;
            link.textContent = text;
            if (key === "whatsapp") { link.target = "_blank"; link.rel = "noopener noreferrer"; }
            el.textContent = "";
            el.appendChild(link);
        } else {
            el.textContent = text;
        }
    });

    // Tombol "Chat WhatsApp"
    document.querySelectorAll("a[data-wa-link]").forEach(a => {
        if (!waNumber) { a.hidden = true; return; }
        const text = a.dataset.waText ? "?text=" + encodeURIComponent(a.dataset.waText) : "";
        a.href = `https://wa.me/${waNumber}${text}`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
    });

    // Peta Google Maps
    const mapBox = document.querySelector(".map-placeholder");
    if (mapBox && cfg.mapsEmbed) {
        const frame = document.createElement("iframe");
        frame.className = "map-frame";
        frame.src = cfg.mapsEmbed;
        frame.loading = "lazy";
        frame.title = "Lokasi SDI Dewi Masyithoh di Google Maps";
        frame.referrerPolicy = "no-referrer-when-downgrade";
        frame.allowFullscreen = true;
        mapBox.replaceWith(frame);
    }

    // Formulir yang dikirim lewat WhatsApp
    document.querySelectorAll("form[data-wa-form]").forEach(form => {
        const errorBox = form.querySelector(".form-error");
        form.addEventListener("invalid", () => form.classList.add("was-validated"), true);
        form.addEventListener("submit", event => {
            event.preventDefault();
            if (errorBox) errorBox.hidden = true;

            if (!waNumber) {
                if (errorBox) {
                    errorBox.textContent = "Nomor WhatsApp sekolah belum diisi di SITE_CONFIG (script.js), jadi pesan belum bisa dikirim.";
                    errorBox.hidden = false;
                }
                return;
            }

            const lines = [form.dataset.waIntro || "Assalamu'alaikum, saya ingin bertanya kepada SDI Dewi Masyithoh.", ""];
            form.querySelectorAll("[name]").forEach(field => {
                let value = (field.value || "").trim();
                if (!value) return;
                if (field.type === "date") {
                    const date = new Date(value + "T00:00:00");
                    if (!isNaN(date)) {
                        value = date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
                    }
                }
                lines.push(`${field.dataset.label || field.name}: ${value}`);
            });
            lines.push("", "Terima kasih.");

            window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
        });
    });

    // Tautan placeholder "#" tidak melompat ke atas halaman
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener("click", e => e.preventDefault());
    });

    // Smooth anchor scroll
    document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(link => {
        link.addEventListener("click", event => {
            const id = link.getAttribute("href");
            if (!id || id === "#") return;
            const target = document.querySelector(id);
            if (!target) return;
            event.preventDefault();
            const offset = navbar ? navbar.offsetHeight : 0;
            window.scrollTo({ top: target.offsetTop - offset, behavior: "smooth" });
        });
    });

    // Back to top
    const backToTop = document.getElementById("backToTop");
    window.addEventListener("scroll", () => {
        backToTop?.classList.toggle("show", window.scrollY > 500);
    });
    backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // Gallery lightbox
    document.querySelectorAll(".gallery-item").forEach(item => {
        item.addEventListener("click", () => {
            const image = item.querySelector("img");
            if (!image) return;

            const lightbox = document.createElement("div");
            lightbox.className = "lightbox";
            lightbox.innerHTML = `
                <button class="lightbox-close" aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
                <img src="${image.src}" alt="${image.alt}">
            `;
            Object.assign(lightbox.style, {
                position: "fixed", inset: "0", zIndex: "9999", display: "flex",
                alignItems: "center", justifyContent: "center", padding: "30px",
                background: "rgba(5,30,16,.94)", opacity: "0", transition: "opacity .25s ease"
            });
            const img = lightbox.querySelector("img");
            Object.assign(img.style, {
                maxWidth: "100%", maxHeight: "90vh", width: "auto", borderRadius: "12px"
            });
            const close = lightbox.querySelector(".lightbox-close");
            Object.assign(close.style, {
                position: "absolute", top: "20px", right: "25px", width: "45px", height: "45px",
                border: "0", borderRadius: "50%", background: "#fff", color: "#12351f", fontSize: "18px"
            });

            document.body.appendChild(lightbox);
            requestAnimationFrame(() => lightbox.style.opacity = "1");

            const remove = () => {
                lightbox.style.opacity = "0";
                setTimeout(() => lightbox.remove(), 250);
            };
            close.addEventListener("click", remove);
            lightbox.addEventListener("click", e => { if (e.target === lightbox) remove(); });
            document.addEventListener("keydown", function esc(e) {
                if (e.key === "Escape") {
                    remove();
                    document.removeEventListener("keydown", esc);
                }
            });
        });
    });

    // Current year
    const currentYear = document.getElementById("currentYear");
    if (currentYear) currentYear.textContent = new Date().getFullYear();
});
