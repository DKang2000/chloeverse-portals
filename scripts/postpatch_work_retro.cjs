const fs = require("fs");
const path = require("path");

function fail(message) {
  throw new Error(message);
}

function replaceOrInsertById(html, tagName, id, block, insertBeforeRe, failCode) {
  const re = new RegExp(`<${tagName}\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/${tagName}>`, "i");
  if (re.test(html)) {
    return html.replace(re, block);
  }
  const next = html.replace(insertBeforeRe, `${block}\n$&`);
  if (next === html) fail(failCode);
  return next;
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const indexPath = path.join(repoRoot, "public", "work-retro", "index.html");
  if (!fs.existsSync(indexPath)) {
    fail(`POSTPATCH_TARGET_MISSING: ${indexPath}`);
  }

  let html = fs.readFileSync(indexPath, "utf8");

  html = html.replace(
    /\s*<script\b[^>]*id=["']chloe-menu-and-projects-fixes["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    "\n"
  );
  html = html.replace(/Est\?\?e Lauder|Estée Lauder/g, "Estee Lauder");

  if (!html.includes("<!-- chloe-postpatch-v1 -->")) {
    const withMarker = html.replace(
      /<head\b[^>]*>/i,
      (m) => `${m}\n<!-- chloe-postpatch-v1 -->`
    );
    if (withMarker === html) fail("HEAD_OPEN_NOT_FOUND");
    html = withMarker;
  }
  if (!html.includes("<!-- chloe-postpatch-v2-meta -->")) {
    let withV2Marker = html.replace(
      /<!-- chloe-postpatch-v1 -->/i,
      `<!-- chloe-postpatch-v1 -->\n<!-- chloe-postpatch-v2-meta -->`
    );
    if (withV2Marker === html) {
      withV2Marker = html.replace(
        /<head\b[^>]*>/i,
        (m) => `${m}\n<!-- chloe-postpatch-v2-meta -->`
      );
    }
    if (withV2Marker === html) fail("HEAD_OPEN_NOT_FOUND_FOR_V2_MARKER");
    html = withV2Marker;
  }

  const chloeCodeRainScriptV2 = `<script id="chloe-code-rain-script">
(() => {
  const root = document.documentElement;
  if (root.getAttribute("data-chloe-theme") !== "dark") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.getElementById("chloe-code-rain");
  if (!canvas || canvas.__chloeInit) return;
  canvas.__chloeInit = true;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  // chloe-code-rain-density-v4
  // Katakana-heavy + latin like the reference
  const KATA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
  const LATN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const SYM  = "$#@*+-=<>";
  const GLYPHS = (KATA + KATA + LATN + SYM); // bias toward katakana

  const RAIN_FONT_PX = 56;
  const RAIN_COL_SPACING = Math.max(14, Math.floor(RAIN_FONT_PX * 0.78));
  const RAIN_GLOBAL_ALPHA = 0.18;
  const RAIN_HEAD_ALPHA = 0.55;
  const RAIN_TAIL_ALPHA = 0.10;
  const RAIN_SIDE_BIAS = 2.4;
  const RAIN_CENTER_DAMP = 0.55;
  const RAIN_EDGE_BAND = 0.30;
  const RAIN_DENSITY_MULT = 0.67; // ~33% reduction
  const RAIN_DROPS_PER_COL = Math.max(1.0, 1.6 * RAIN_DENSITY_MULT);
  const RAIN_BIG_GLYPH_PROB = 0.10;
  const RAIN_BIG_FONT_MULT = 1.45;
  const RAIN_BIG_ALPHA_MULT = 1.25;

  let w = 0, h = 0, dpr = 1;
  let fontSize = RAIN_FONT_PX;
  let step = RAIN_COL_SPACING;
  let cols = 0;
  let drops = [];
  let active = [];
  let lastT = 0;
  let accum = 0;
  let bandL = 0, bandR = 0;

  const haze = document.createElement("canvas");
  const hctx = haze.getContext("2d", { alpha: true });

  function randChar() {
    return GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function sideWeight(x) {
    const nx = x / Math.max(1, w);
    const distFromCenter = Math.abs(nx - 0.5) / 0.5; // 0 center -> 1 edge
    const edgeWeight = distFromCenter;
    const bandBoost = (nx < RAIN_EDGE_BAND || nx > (1 - RAIN_EDGE_BAND)) ? RAIN_SIDE_BIAS : 1;
    const centerDamp = (nx > (0.5 - 0.18) && nx < (0.5 + 0.18)) ? RAIN_CENTER_DAMP : 1;
    return bandBoost * centerDamp * (0.7 + 0.6 * edgeWeight);
  }

  function makeDrop(yStart) {
    return {
      y: typeof yStart === "number" ? yStart : (Math.random() * h) - h * 0.6,
      v: 0.020 + Math.random() * 0.015,
      len: 14 + ((Math.random() * 14) | 0),
    };
  }

  function seedColumnDrops(xCenter, seeded) {
    if (!seeded) return [];
    const arr = [makeDrop((Math.random() * h) - h * 0.6)];
    const extraChance = Math.max(0, RAIN_DROPS_PER_COL - 1);
    if (Math.random() < Math.min(1, extraChance * Math.min(1.4, sideWeight(xCenter) / 1.8) * RAIN_DENSITY_MULT)) {
      arr.push(makeDrop((Math.random() * h) - h * 1.15));
    }
    return arr;
  }

  function maybeSpawnExtraDrop(list, xCenter) {
    if (!active[Math.max(0, Math.min(active.length - 1, Math.floor(xCenter / Math.max(1, step))))]) return;
    if (list.length >= Math.ceil(RAIN_DROPS_PER_COL)) return;
    const extraChance = Math.max(0, RAIN_DROPS_PER_COL - 1);
    const spawnP = clamp(0.008 * sideWeight(xCenter) * extraChance * RAIN_DENSITY_MULT, 0, 0.06);
    if (Math.random() < spawnP) {
      list.push(makeDrop(-Math.random() * 900));
    }
  }

  function resize() {
    dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centerBand = 0.60;
    const bandW = w * centerBand;
    bandL = (w - bandW) / 2;
    bandR = bandL + bandW;

    fontSize = RAIN_FONT_PX;
    step = RAIN_COL_SPACING;
    ctx.font = \`\${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace\`;
    ctx.textBaseline = "top";

    cols = Math.max(1, Math.ceil((canvas.width / Math.max(1, dpr)) / RAIN_COL_SPACING));

    active = new Array(cols).fill(false).map((_, i) => {
      const x = i * step + step / 2;
      const weight = sideWeight(x);
      let p = (0.22 + 0.52 * (Math.min(1, Math.abs((x - w / 2) / Math.max(1, w / 2))))) * weight;
      p *= RAIN_DENSITY_MULT;
      p = clamp(p, 0.06, 0.98);
      return Math.random() < p;
    });

    drops = new Array(cols).fill(0).map((_, i) => {
      const x = i * step + step / 2;
      return seedColumnDrops(x, active[i]);
    });

    rebuildHaze();
  }

  function rebuildHaze() {
    if (!hctx) return;
    haze.width = w * dpr;
    haze.height = h * dpr;
    haze.style.width = w + "px";
    haze.style.height = h + "px";
    hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hctx.clearRect(0, 0, w, h);
    hctx.font = ctx.font;
    hctx.textBaseline = "top";

    const count = Math.floor((w * h) / (step * step) * 2.8);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const inBand = (x >= bandL && x <= bandR);
      const sideMul = clamp(sideWeight(x), 0.4, 2.6);
      const mul = (inBand ? 0.18 : 1.0) * (0.75 + 0.25 * sideMul);
      const a = (16 + (Math.random() * 22)) * mul;
      hctx.fillStyle = \`rgba(35,140,90,\${clamp(a / 255, 0, 0.22)})\`;
      hctx.fillText(randChar(), x, y);
    }
  }

  function tick(now) {
    if (!lastT) lastT = now;
    const dt = now - lastT;
    lastT = now;

    accum += dt;
    if (accum < 50) { requestAnimationFrame(tick); return; }
    const frameDt = accum;
    accum = 0;

    const dark = parseFloat(getComputedStyle(root).getPropertyValue("--chloe-dark")) || 0;

    ctx.fillStyle = \`rgba(0,0,0,\${0.055 + 0.045 * dark})\`;
    ctx.fillRect(0, 0, w, h);

    if (hctx) {
      ctx.globalAlpha = 0.28 + 0.20 * dark;
      ctx.drawImage(haze, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    const headRGB = [165, 255, 200];
    const tailRGB = [55, 255, 165];

    for (let i = 0; i < cols; i++) {
      if (!active[i]) continue;
      const x = i * step;
      const xCenter = x + step / 2;
      const weight = sideWeight(xCenter);
      const streamMul = clamp(RAIN_GLOBAL_ALPHA * weight, 0, 0.32);
      const headAlphaMul = clamp(RAIN_HEAD_ALPHA * weight, 0, 0.75);
      const tailAlphaMul = clamp(RAIN_TAIL_ALPHA * weight, 0, 0.22);

      const colDrops = drops[i] || (drops[i] = []);
      if (!colDrops.length) {
        colDrops.push(makeDrop(-Math.random() * 800));
      }
      maybeSpawnExtraDrop(colDrops, xCenter);

      for (let n = colDrops.length - 1; n >= 0; n--) {
        const d = colDrops[n];
        d.y += d.v * frameDt;

        if (d.y > h + d.len * step * 0.62 + 120) {
          if (Math.random() < 0.85) {
            d.y = -Math.random() * 800;
            d.v = 0.020 + Math.random() * 0.015;
            d.len = 14 + ((Math.random() * 14) | 0);
          } else {
            colDrops.splice(n, 1);
            continue;
          }
        }

        const inBand = (xCenter >= bandL && xCenter <= bandR);
        const centerMul = inBand ? RAIN_CENTER_DAMP : 1.0;

        for (let k = 0; k < d.len; k++) {
          const y = d.y + k * (step * 0.62);
          if (y < -fontSize || y > h + fontSize) continue;

          const t = (k / Math.max(1, d.len - 1));
          const a = clamp((tailAlphaMul + (0.22 * t)) * centerMul * (0.70 + 0.30 * streamMul), 0, 0.22);
          ctx.shadowBlur = 0;
          const r = Math.round(tailRGB[0] * (0.85 + 0.15 * t));
          const g = tailRGB[1];
          const b = Math.round(tailRGB[2] * (0.85 + 0.15 * t));
          ctx.fillStyle = \`rgba(\${r},\${g},\${b},\${a})\`;
          ctx.fillText(randChar(), x, y);
        }

        const headY = d.y + (d.len - 1) * (step * 0.62);
        ctx.shadowColor = "rgba(120,255,190,0.55)";
        ctx.shadowBlur = 10;
        const bigHead = Math.random() < RAIN_BIG_GLYPH_PROB;
        const baseFont = ctx.font;
        let headAlpha = clamp(headAlphaMul * centerMul, 0, 0.75);
        if (bigHead) {
          headAlpha = clamp(headAlpha * RAIN_BIG_ALPHA_MULT, 0, 0.75);
          ctx.font = \`\${Math.round(RAIN_FONT_PX * RAIN_BIG_FONT_MULT)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace\`;
        }
        ctx.fillStyle = \`rgba(\${headRGB[0]},\${headRGB[1]},\${headRGB[2]},\${headAlpha})\`;
        ctx.fillText(randChar(), x, headY);
        if (bigHead) ctx.font = baseFont;
      }
    }

    requestAnimationFrame(tick);
  }

  resize();
  requestAnimationFrame(tick);
  setInterval(() => { rebuildHaze(); }, 2200);
  window.addEventListener("resize", resize, { passive: true });
})();
</script>`;

  html = html.replace(
    /<script\b[^>]*id=["']chloe-code-rain-script["'][^>]*>[\s\S]*?<\/script>/i,
    chloeCodeRainScriptV2
  );

  const postpatchStyle = `<style id="chloe-postpatch-style">
/* Hide top-left social/icon buttons; keep hamburger button */
nav .menu-btn > div a,
a[href*="linkedin.com"],
a[href*="github.com"],
a[href*="behance.net"],
a[href*="instagram.com"],
a[href*="twitter.com"],
a[href*="x.com"] {
  display: none !important;
}

.chloe-postpatch-gap {
  display: block;
  height: 10px;
}

.chloe-gap {
  display: block !important;
  height: 14px !important;
}
</style>`;
  html = replaceOrInsertById(
    html,
    "style",
    "chloe-postpatch-style",
    postpatchStyle,
    /<\/head>/i,
    "HEAD_CLOSE_NOT_FOUND_FOR_POSTPATCH_STYLE"
  );

  html = html.replace(
    /\s*<script\b[^>]*id=["']chloe-postpatch-script["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    "\n"
  );

  const postpatchScript = `<script id="chloe-postpatch-script">
(() => {
  const onReady = (fn) => (
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", fn)
      : fn()
  );

  const TYPE_SET = new Set(["Contract","Internship","Full-time","Self-employed"]);
  const JOB_OVERRIDES = {
    "Stealth Startup - Founder": { loc: "Remote", ensureTypeAfterLoc: "Full-time" },
    "Adobe - AI Search": { loc: "Los Angeles" },
    "Instagram - Creator": { loc: "World Wide" },
    "Single Origin Studio - CEO": { loc: "Los Angeles" },
    "Outsmart - Product Marketing": { loc: "Los Angeles" },
    "Stealth AI Startup - Head of Growth": { loc: "San Francisco" },
    "Soluna - Product Marketing Intern": { loc: "Los Angeles" },
    "Headspace - Digital Marketing Intern": { loc: "Los Angeles" },
  };
  const LOC_LIKE_RE = /(United States|California|Metropolitan|Area|Hybrid|On-site|Onsite|Remote|Los Angeles|San Francisco|World Wide|Worldwide|,)/i;
  const DATE_RE = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{4}\\s*-\\s*(Present|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{4})/i;

  function normalizeSpaces(t) {
    return String(t || "").replace(/\\s+/g, " ").trim();
  }

  function isDateText(t) {
    return DATE_RE.test(normalizeSpaces(t));
  }

  function findExact(selector, text) {
    return Array.from(document.querySelectorAll(selector)).find((el) => normalizeSpaces(el.textContent) === text) || null;
  }

  function ensureProjectsAnchor() {
    const projectsHeading = Array.from(document.querySelectorAll("main h1, main h2, main h3, main div, main span"))
      .find((el) => normalizeSpaces(el.textContent) === "Projects") || null;
    if (projectsHeading) projectsHeading.id = "projects";
  }

  function rebuildMenu() {
    const menuBody = document.querySelector(".menu-body");
    if (!menuBody) return;

    const firstLink = menuBody.querySelector("a");
    const linkClass = firstLink ? firstLink.className : "";
    while (menuBody.firstChild) menuBody.removeChild(menuBody.firstChild);

    const makeLink = (label, href) => {
      const a = document.createElement("a");
      a.textContent = label;
      a.href = href;
      if (linkClass) a.className = linkClass;
      return a;
    };

    const closeMenu = () => {
      try { if (typeof window.closeMenu === "function") window.closeMenu(); } catch {}
    };

    const home = makeLink("Home", "#home");
    home.addEventListener("click", (e) => {
      e.preventDefault();
      closeMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const projects = makeLink("Projects", "#projects");
    projects.addEventListener("click", (e) => {
      e.preventDefault();
      ensureProjectsAnchor();
      closeMenu();
      const t = document.getElementById("projects");
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const candy = makeLink("Candy Castle", "https://imchloekang.com");
    candy.target = "_blank";
    candy.rel = "noopener noreferrer";
    candy.addEventListener("click", () => closeMenu());

    const chloeverse = makeLink("Chloeverse", "https://chloeverse.io");
    chloeverse.target = "_blank";
    chloeverse.rel = "noopener noreferrer";
    chloeverse.addEventListener("click", () => closeMenu());

    menuBody.append(home, projects, candy, chloeverse);
  }

  function enforceMenuRoutes() {
    const menuRoot = document.querySelector(".menu-body");
    if (!menuRoot) return;
    const closeMenu = () => {
      try { if (typeof window.closeMenu === "function") window.closeMenu(); } catch {}
    };
    const items = Array.from(menuRoot.querySelectorAll("a,button,div,li,span"));
    const byText = (txt) => items.find((el) => normalizeSpaces(el.textContent) === txt) || null;
    const wireInteractive = (el, handler) => {
      if (!el) return;
      if (el.tagName !== "A") {
        el.style.cursor = "pointer";
        el.setAttribute("role", "link");
        if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
      } else {
        el.style.cursor = "pointer";
      }
      if (el.__chloeMenuClickHandler) el.removeEventListener("click", el.__chloeMenuClickHandler, true);
      if (el.__chloeMenuKeyHandler) el.removeEventListener("keydown", el.__chloeMenuKeyHandler, true);

      const keyHandler = (e) => {
        const key = e && (e.key || e.code);
        if (key === "Enter" || key === " " || key === "Spacebar") {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          if (e && typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          handler(e);
        }
      };
      const clickHandler = (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        if (e && typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        handler(e);
      };
      el.__chloeMenuKeyHandler = keyHandler;
      el.__chloeMenuClickHandler = clickHandler;
      el.addEventListener("keydown", keyHandler, true);
      el.addEventListener("click", clickHandler, true);
    };

    const homeEl = byText("Home");
    if (homeEl) {
      if (homeEl.tagName === "A") homeEl.setAttribute("href", "#home");
      wireInteractive(homeEl, () => {
        closeMenu();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    const projectsEl = byText("Projects");
    if (projectsEl) {
      ensureProjectsAnchor();
      if (projectsEl.tagName === "A") projectsEl.setAttribute("href", "#projects");
      wireInteractive(projectsEl, () => {
        ensureProjectsAnchor();
        closeMenu();
        const target = document.getElementById("projects");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    const candyEl = byText("Candy Castle");
    if (candyEl) {
      if (candyEl.tagName === "A") {
        candyEl.setAttribute("href", "https://imchloekang.com");
        candyEl.setAttribute("target", "_blank");
        candyEl.setAttribute("rel", "noopener noreferrer");
      }
      wireInteractive(candyEl, () => {
        closeMenu();
        window.open("https://imchloekang.com", "_blank", "noopener,noreferrer");
      });
    }

    const chloeverseEl = byText("Chloeverse");
    if (chloeverseEl) {
      if (chloeverseEl.tagName === "A") {
        chloeverseEl.setAttribute("href", "https://chloeverse.io");
        chloeverseEl.setAttribute("target", "_blank");
        chloeverseEl.setAttribute("rel", "noopener noreferrer");
      }
      wireInteractive(chloeverseEl, () => {
        closeMenu();
        window.open("https://chloeverse.io", "_blank", "noopener,noreferrer");
      });
    }
  }

  function ensureMenuHotspots() {
    let root = document.getElementById("chloe-menu-hotspots");
    if (!root) {
      root = document.createElement("div");
      root.id = "chloe-menu-hotspots";
      root.setAttribute("aria-hidden", "false");
      root.style.position = "fixed";
      root.style.left = "16px";
      root.style.top = "72px";
      root.style.width = "320px";
      root.style.zIndex = "999999";
      root.style.display = "none";
      root.style.pointerEvents = "none";
      document.body.appendChild(root);
    }

    const closeMenuSafe = () => {
      try { if (typeof window.closeMenu === "function") window.closeMenu(); } catch {}
      hideMenuHotspots();
    };

    const activateOnKey = (e, fn) => {
      const key = e && (e.key || e.code);
      if (key === "Enter" || key === " " || key === "Spacebar") {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        fn();
      }
    };

    const btnDefs = [
      {
        id: "chloe-hotspot-home",
        label: "Home",
        onActivate: () => {
          closeMenuSafe();
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
      {
        id: "chloe-hotspot-projects",
        label: "Projects",
        onActivate: () => {
          ensureProjectsAnchor();
          closeMenuSafe();
          const target = document.getElementById("projects");
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        },
      },
      {
        id: "chloe-hotspot-candy",
        label: "Candy Castle",
        onActivate: () => {
          closeMenuSafe();
          window.open("https://imchloekang.com", "_blank", "noopener,noreferrer");
        },
      },
      {
        id: "chloe-hotspot-chloeverse",
        label: "Chloeverse",
        onActivate: () => {
          closeMenuSafe();
          window.open("https://chloeverse.io", "_blank", "noopener,noreferrer");
        },
      },
    ];

    for (const def of btnDefs) {
      let btn = document.getElementById(def.id);
      if (!btn) {
        btn = document.createElement("button");
        btn.id = def.id;
        btn.type = "button";
        btn.textContent = def.label;
        btn.setAttribute("aria-label", def.label);
        btn.setAttribute("role", "link");
        btn.tabIndex = 0;
        btn.style.display = "block";
        btn.style.width = "100%";
        btn.style.height = "52px";
        btn.style.background = "transparent";
        btn.style.border = "none";
        btn.style.padding = "0";
        btn.style.margin = "0";
        btn.style.opacity = "0";
        btn.style.pointerEvents = "auto";
        btn.style.cursor = "pointer";
        root.appendChild(btn);
      }
      btn.onclick = (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        def.onActivate();
      };
      btn.onkeydown = (e) => activateOnKey(e, def.onActivate);
    }

    positionMenuHotspots();
    return root;
  }

  function positionMenuHotspots() {
    const root = document.getElementById("chloe-menu-hotspots");
    if (!root) return;
    const burger = document.querySelector(".menu-btn > button, .menu-btn .btn, .menu-btn");
    let top = 72;
    let left = 16;
    if (burger && typeof burger.getBoundingClientRect === "function") {
      const r = burger.getBoundingClientRect();
      if (Number.isFinite(r.bottom)) top = Math.round(r.bottom + 10);
      if (Number.isFinite(r.left)) left = Math.max(16, Math.round(r.left));
    }
    root.style.top = String(top) + "px";
    root.style.left = String(left) + "px";
    root.style.width = "320px";
  }

  function showMenuHotspots() {
    const root = ensureMenuHotspots();
    if (!root) return;
    positionMenuHotspots();
    root.style.display = "block";
  }

  function hideMenuHotspots() {
    const root = document.getElementById("chloe-menu-hotspots");
    if (!root) return;
    root.style.display = "none";
  }

  function syncMenuHotspotsVisibility() {
    const nav = document.querySelector("nav");
    const isOpen = !!(nav && nav.classList && nav.classList.contains("active"));
    if (isOpen) showMenuHotspots();
    else hideMenuHotspots();
  }

  function wireMenuHotspotToggles() {
    ensureMenuHotspots();

    if (typeof window.openMenu === "function" && !window.openMenu.__chloeHotspotWrapped) {
      const origOpen = window.openMenu;
      const wrappedOpen = function (...args) {
        const result = origOpen.apply(this, args);
        showMenuHotspots();
        return result;
      };
      wrappedOpen.__chloeHotspotWrapped = true;
      window.openMenu = wrappedOpen;
    }

    if (typeof window.closeMenu === "function" && !window.closeMenu.__chloeHotspotWrapped) {
      const origClose = window.closeMenu;
      const wrappedClose = function (...args) {
        const result = origClose.apply(this, args);
        hideMenuHotspots();
        return result;
      };
      wrappedClose.__chloeHotspotWrapped = true;
      window.closeMenu = wrappedClose;
    }

    if (typeof window.toggleMenu === "function" && !window.toggleMenu.__chloeHotspotWrapped) {
      const origToggle = window.toggleMenu;
      const wrappedToggle = function (...args) {
        const result = origToggle.apply(this, args);
        syncMenuHotspotsVisibility();
        return result;
      };
      wrappedToggle.__chloeHotspotWrapped = true;
      window.toggleMenu = wrappedToggle;
    }

    const burger = document.querySelector(".menu-btn > button, .menu-btn .btn, .menu-btn");
    if (burger && !burger.__chloeHotspotBound) {
      burger.__chloeHotspotBound = true;
      burger.addEventListener("click", () => {
        setTimeout(syncMenuHotspotsVisibility, 0);
      });
    }

    if (!window.__chloeHotspotResizeBound) {
      window.__chloeHotspotResizeBound = true;
      window.addEventListener("resize", () => {
        positionMenuHotspots();
        syncMenuHotspotsVisibility();
      }, { passive: true });
    }

    syncMenuHotspotsVisibility();
  }

  function findJobCardsByTitle(titleText) {
    const titleEl = findExact("main h2, main h3, main div, main span", titleText) || findExact("h2, h3, div, span", titleText);
    if (!titleEl) return null;

    if (titleEl.nextElementSibling && titleEl.nextElementSibling.classList && titleEl.nextElementSibling.classList.contains("chloe-meta")) {
      return titleEl.nextElementSibling;
    }

    let cur = titleEl;
    for (let i = 0; i < 8 && cur; i++) {
      cur = cur.parentElement;
      if (!cur) break;
      if (cur.querySelector && (cur.querySelector(".chloe-date") || Array.from(cur.querySelectorAll("*")).some((el) => isDateText(el.textContent)))) {
        return cur;
      }
    }
    return null;
  }

  function getDateEl(card) {
    if (!card) return null;
    const byClass = card.querySelector ? card.querySelector(".chloe-date") : null;
    if (byClass) return byClass;
    return Array.from(card.querySelectorAll ? card.querySelectorAll("*") : []).find((el) => isDateText(el.textContent)) || null;
  }

  function isGapEl(el) {
    if (!el) return false;
    return !!(
      (el.dataset && (el.dataset.chloeGap === "1" || el.dataset.chloeLoc === "1" || el.dataset.chloeType === "1")) ||
      (el.classList && (el.classList.contains("chloe-gap") || el.classList.contains("chloe-postpatch-gap") || el.classList.contains("chloe-job-gap")))
    );
  }

  function cleanAndSetMeta(card, cfg) {
    if (!card || !cfg || !cfg.loc) return;
    const dateEl = getDateEl(card);
    if (!dateEl) return;

    const allowedTags = new Set(["DIV", "P", "SPAN"]);
    const metaSiblings = [];
    let cur = dateEl.nextElementSibling;
    while (cur) {
      const txt = normalizeSpaces(cur.textContent);
      const isType = TYPE_SET.has(txt);
      const descriptionStart = (!allowedTags.has(cur.tagName)) || (!isType && (txt.includes(".") || txt.includes("|") || txt.length > 90));
      if (descriptionStart) break;
      metaSiblings.push(cur);
      cur = cur.nextElementSibling;
    }
    const descriptionStartEl = cur || null;

    let typeEls = metaSiblings.filter((el) => TYPE_SET.has(normalizeSpaces(el.textContent)));

    for (const el of metaSiblings.slice()) {
      const txt = normalizeSpaces(el.textContent);
      if (!txt) continue;
      if (TYPE_SET.has(txt)) continue;
      if (isGapEl(el)) { el.remove(); continue; }
      if (txt === cfg.loc || LOC_LIKE_RE.test(txt)) {
        el.remove();
      }
    }

    let locEl = dateEl.nextElementSibling;
    while (locEl && isGapEl(locEl)) locEl = locEl.nextElementSibling;
    if (!(locEl && locEl.dataset && locEl.dataset.chloeLoc === "1")) {
      const newLoc = document.createElement("div");
      newLoc.className = "chloe-loc";
      newLoc.setAttribute("data-chloe-loc", "1");
      dateEl.insertAdjacentElement("afterend", newLoc);
      locEl = newLoc;
    }
    locEl.textContent = cfg.loc;

    let typeAnchor = locEl;
    let typeEl = null;

    if (cfg.ensureTypeAfterLoc) {
      let afterLoc = locEl.nextElementSibling;
      while (afterLoc && isGapEl(afterLoc)) afterLoc = afterLoc.nextElementSibling;

      if (afterLoc && TYPE_SET.has(normalizeSpaces(afterLoc.textContent)) && normalizeSpaces(afterLoc.textContent) === cfg.ensureTypeAfterLoc) {
        typeEl = afterLoc;
      } else {
        const existingMatchingType = Array.from(card.children || []).find((el) => el !== locEl && TYPE_SET.has(normalizeSpaces(el.textContent)) && normalizeSpaces(el.textContent) === cfg.ensureTypeAfterLoc);
        if (existingMatchingType) {
          locEl.insertAdjacentElement("afterend", existingMatchingType);
          typeEl = existingMatchingType;
        } else {
          const newType = document.createElement("div");
          newType.className = "chloe-type";
          newType.setAttribute("data-chloe-type", "1");
          newType.textContent = cfg.ensureTypeAfterLoc;
          locEl.insertAdjacentElement("afterend", newType);
          typeEl = newType;
        }
      }
      typeAnchor = typeEl || locEl;
    } else {
      typeEls = Array.from(card.children || []).filter((el) => TYPE_SET.has(normalizeSpaces(el.textContent)));
      if (typeEls.length) {
        typeAnchor = typeEls[typeEls.length - 1];
      }
    }

    // Remove stray gaps between anchor and description start, then ensure one immediate gap.
    let scan = typeAnchor.nextElementSibling;
    while (scan && scan !== descriptionStartEl) {
      const next = scan.nextElementSibling;
      if (isGapEl(scan)) scan.remove();
      scan = next;
    }

    let gapEl = typeAnchor.nextElementSibling;
    if (!(gapEl && gapEl.dataset && gapEl.dataset.chloeGap === "1")) {
      const gap = document.createElement("div");
      gap.className = "chloe-gap";
      gap.setAttribute("data-chloe-gap", "1");
      gap.style.height = "14px";
      gap.style.width = "1px";
      typeAnchor.insertAdjacentElement("afterend", gap);
      gapEl = gap;
    } else {
      gapEl.className = "chloe-gap";
      gapEl.style.height = "14px";
      gapEl.style.width = "1px";
    }
  }

  function applyTaglineFix() {
    const taglineCandidates = [
      "Heres what Ive been up to the past few years!",
      "Here's what Ive been up to the past few years!",
      "Heres what I've been up to the past few years!",
    ];
    const taglineEl = Array.from(document.querySelectorAll("main p, p, div, span"))
      .find((el) => taglineCandidates.includes(normalizeSpaces(el.textContent)));
    if (taglineEl) taglineEl.textContent = "Here's what I've been up to the past few years!";
  }

  let rafToken = 0;
  function applyAllPatches() {
    applyTaglineFix();
    ensureProjectsAnchor();
    rebuildMenu();
    enforceMenuRoutes();
    wireMenuHotspotToggles();
    for (const [title, cfg] of Object.entries(JOB_OVERRIDES)) {
      const card = findJobCardsByTitle(title);
      cleanAndSetMeta(card, cfg);
    }
    console.log("[chloe-postpatch] final-loc-and-founder-type applied");
  }

  function scheduleApply() {
    if (rafToken) return;
    rafToken = requestAnimationFrame(() => {
      rafToken = 0;
      applyAllPatches();
    });
  }

  onReady(() => {
    applyAllPatches();
    setTimeout(applyAllPatches, 200);
    setTimeout(applyAllPatches, 800);

    const observer = new MutationObserver(() => {
      scheduleApply();
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  });
})();
</script>`;

  const withScript = html.replace(/<\/body>/i, `${postpatchScript}\n</body>`);
  if (withScript === html) fail("BODY_CLOSE_NOT_FOUND_FOR_POSTPATCH_SCRIPT");
  html = withScript;

  fs.writeFileSync(indexPath, html, "utf8");

  const finalHtml = fs.readFileSync(indexPath, "utf8");
  if (!finalHtml.includes("<!-- chloe-postpatch-v1 -->")) fail("POSTPATCH_MARKER_MISSING");
  if (!finalHtml.includes("<!-- chloe-postpatch-v2-meta -->")) fail("POSTPATCH_V2_MARKER_MISSING");
  if (finalHtml.includes('<script id="chloe-menu-and-projects-fixes"')) fail("FRAGILE_SCRIPT_STILL_PRESENT");
  if (!finalHtml.includes('id="chloe-postpatch-style"')) fail("POSTPATCH_STYLE_MISSING");
  if (!finalHtml.includes('id="chloe-postpatch-script"')) fail("POSTPATCH_SCRIPT_MISSING");
  if (!finalHtml.includes("Candy Castle")) fail("CANDY_CASTLE_MISSING");
  if (!finalHtml.includes("Chloeverse")) fail("CHLOEVERSE_MISSING");
}

try {
  main();
  console.log("[work:retro:postpatch] applied");
} catch (error) {
  console.error(
    "[work:retro:postpatch] ERROR:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
