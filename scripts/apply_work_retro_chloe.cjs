// scripts/apply_work_retro_chloe.cjs
const fs = require("fs");
const path = require("path");
const os = require("os");

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}
function isRetroRepo(dir) {
  return (
    exists(path.join(dir, "package.json")) &&
    exists(path.join(dir, "vite.config.ts")) &&
    exists(path.join(dir, "index.html"))
  );
}
function resolveRetroDir() {
  const repoRoot = path.resolve(__dirname, "..");
  const candidates = [];
  if (process.env.RETRO_WORK_SRC) candidates.push(process.env.RETRO_WORK_SRC);
  candidates.push(path.resolve(repoRoot, "..", "retro-computer-website"));
  candidates.push(path.join(os.homedir(), "Downloads", "retro-computer-website"));
  candidates.push(path.join(os.homedir(), "Documents", "retro-computer-website"));

  for (const c of candidates) {
    const dir = path.resolve(c);
    if (isRetroRepo(dir)) return dir;
  }
  throw new Error(
    `PATCH_FAILED: Could not locate retro-computer-website.\nTried:\n- ${candidates
      .map((c) => path.resolve(c))
      .join("\n- ")}`
  );
}
function rmDirContents(dir) {
  if (!exists(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
    else fs.rmSync(p, { force: true });
  }
}
function writeFileEnsured(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}
function warn(msg) {
  console.log(`[work:retro:apply-chloe] WARN: ${msg}`);
}
function fail(msg) {
  throw new Error(`PATCH_FAILED: ${msg}`);
}

const CHLOE_THEME = (process.env.CHL_OE_THEME || "dark").toLowerCase();

function main() {
  const retroDir = resolveRetroDir();
  const prefix = "[work:retro:apply-chloe]";
  console.log(`${prefix} Using retro repo: ${retroDir}`);

  // 1) terminal title (multi-line; fixes missing words)
  const titleMd = `!(/images/ed-title.png?aspect=2&noflow=true&width=1.33)

## Hi,
# *I'm Chloe*
##  Creator
##  Founder
##  Creative strategist
##  Growth Marketer

### Welcome to CHLO-Linux 1.0 LTS
###  Scroll or type "help" to get started
`;
  writeFileEnsured(
    path.join(retroDir, "src", "file-system", "home", "user", "title", "title.md"),
    titleMd
  );

  // 2) terminal about
  const aboutMd = `# Hi there
Here's what I've been up to the past few years!
`;
  writeFileEnsured(
    path.join(retroDir, "src", "file-system", "home", "user", "about", "about.md"),
    aboutMd
  );

  // 3) terminal projects folder: delete everything else + recreate only these
  const projectsDir = path.join(retroDir, "src", "file-system", "home", "user", "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  rmDirContents(projectsDir);

  const projects = {
    "00-ai-search-adobe.md": `## *AI Search  Adobe*
## Jan 2026 - Present
###  Los Angeles Metropolitan Area  Remote
###  Contract
Search optimization for LLM training & retrieval. Not via an organization on campus.
`,
    "01-creator-instagram.md": `## *Creator  Instagram*
## Jul 2025 - Present
###  Los Angeles, California, United States  Hybrid
###  Self-employed
300K+ followers
250M views
Grew IG from 0 to 140k+ in 3 months
Viral series accumulated 200M views & attention from major news outlets
Worked with Adidas, Adobe, Estée Lauder, OpenAI, Hera, etc.
`,
    "02-product-marketing-outsmart.md": `## *Product Marketing  Outsmart*
## Sep 2025 - Dec 2025
###  Los Angeles, California, United States  Hybrid
###  Contract
Product and growth directly under ex-CMO @ Duolingo, $38M raised, backed by DST Global, Lightspeed, Khosla Ventures, execs from OpenAI & Quora.
`,
    "03-head-of-growth-stealth-ai-startup.md": `## *Head of Growth  Stealth AI Startup*
## Jun 2025 - Sep 2025
###  San Francisco, California, United States  On-site
###  Full-time
Product and growth for B2C fashion tech, backed by execs from Shopify and Pinterest.
`,
    "04-product-marketing-intern-soluna.md": `## *Product Marketing Intern  Soluna*
## Oct 2024 - Jun 2025
###  Los Angeles, California, United States  Remote
###  Internship
Streamlined Solunas GTM, drove 179% increase in revenue in US market.
`,
    "05-digital-marketing-intern-headspace.md": `## *Digital Marketing Intern  Headspace*
## May 2022 - Sep 2023
###  Los Angeles, California, United States  Remote
###  Internship
Tripled Headspaces social media presence in one year, youngest employee to earn an extended contract.
`,
    "06-ceo-single-origin-studio.md": `## *CEO  Single Origin Studio*
## Jun 2023 - Jan 2026
###  Los Angeles, California, United States  Remote
###  Self-employed
Marketing consulting | Previous experience with YC backed startups | Full in house marketing with UGC team management | Scaled brands from 0 to 50k+ users in 2 months | Generated 6 figures of revenue | Worked with pre-seed and early stage
`,
  };

  for (const [name, content] of Object.entries(projects)) {
    writeFileEnsured(path.join(projectsDir, name), content);
  }

  // 4) Patch the SCROLL content inside retro repo index.html (HTML)
  const indexPath = path.join(retroDir, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");

  // Theme toggle on the root html element (default dark).
  html = html.replace(/<html\b([^>]*)>/i, (_match, attrs) => {
    let nextAttrs = attrs.replace(/\sdata-chloe-theme=(["']).*?\1/i, "");
    const themeValue = CHLOE_THEME === "dark" ? "dark" : "light";
    return `<html${nextAttrs} data-chloe-theme="${themeValue}">`;
  });

  // Replace old Ed meta descriptions in <head>.
  html = html.replace(
    /(<meta\b[^>]*\bcontent=")([^"]*My name is Ed Hinrichsen[^"]*)(")/gi,
    `$1Chloe  Creator, Founder, Creative strategist, Growth Marketer.$3`
  );
  html = html.replace(
    /(<meta\b[^>]*\bcontent=")([^"]*My name is Ed[^"]*)(")/gi,
    `$1Chloe  Creator, Founder, Creative strategist, Growth Marketer.$3`
  );

  // Remove/neutralize remaining Ed-specific footer/url references that trip sync guards.
  html = html.replace(/<footer\b[\s\S]*?<\/footer>/i, "");
  html = html.replace(/https:\/\/bsky\.app\/profile\/edh\.dev\/?/gi, "#");
  html = html.replace(/https:\/\/edh\.dev\/icon\/og-img1\.png/gi, "/work-retro/icon/og-img1.png");
  html = html.replace(/https:\/\/edh\.dev\/?/gi, "/work-retro/");
  html = html.replace(/edh\.dev/gi, "chloeverse.local");

  if (CHLOE_THEME === "dark") {
    html = html.replace(
      /(<meta\b[^>]*name=["']theme-color["'][^>]*content=["'])([^"']*)(["'][^>]*>)/i,
      `$1#0F1115$3`
    );
  }

  // Normalize project label widths across all injected job titles and restore large date style.
  const chloeOverridesCss = `    <style id="chloe-overrides">
      .chloe-job-label {
        display: block;
        width: 640px;
        max-width: calc(100% - 32px);
        margin-left: auto;
        margin-right: auto;
        box-sizing: border-box;
      }
      .chloe-date { font-size: 32px; line-height: 1.1; margin: 0; padding: 0; }
      .chloe-job-gap { display: block; height: 12px; }

      :root[data-chloe-theme="dark"] {
        --chloe-bg: #0F1115;
        --chloe-fg: #E8E3DA;
        --chloe-rule: rgba(232,227,218,0.25);
        --chloe-box-bg: #E8E3DA;
        --chloe-box-fg: #15181E;
      }

      :root[data-chloe-theme="dark"] html,
      :root[data-chloe-theme="dark"] body {
        background: var(--chloe-bg) !important;
      }

      :root[data-chloe-theme="dark"] body,
      :root[data-chloe-theme="dark"] main {
        color: var(--chloe-fg) !important;
      }

      /* Invert boxed pixel labels (Hi!/Projects + job title bars) */
      :root[data-chloe-theme="dark"] main h1,
      :root[data-chloe-theme="dark"] main h2 {
        background: var(--chloe-box-bg) !important;
        color: var(--chloe-box-fg) !important;
      }

      /* Meta/description text */
      :root[data-chloe-theme="dark"] .chloe-meta,
      :root[data-chloe-theme="dark"] .chloe-meta div {
        color: var(--chloe-fg) !important;
      }

      /* Dividers */
      :root[data-chloe-theme="dark"] main hr {
        border: 0 !important;
        border-top: 2px solid var(--chloe-rule) !important;
        opacity: 1 !important;
      }

      :root[data-chloe-theme="dark"]{
        --chloe-dark: 0; /* 0..1 */
        --chloe-bg: rgb(79 70 63); /* muddy start */
        --chloe-fg:#E8E3DA;
        --chloe-rule:rgba(232,227,218,0.22);
        --chloe-box-bg:#DDD6CC;
        --chloe-box-fg:#1A1E24;
      }

      /* Dimmer sits above hero/background but BELOW text */
      :root[data-chloe-theme="dark"] #chloe-scroll-dimmer{
        position: fixed;
        inset: 0;
        pointer-events: none;
        background: #0F1115;
        opacity: var(--chloe-dark);
        z-index: 10 !important;
      }

      :root[data-chloe-theme="dark"] #chloe-code-rain{
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 11;
        opacity: calc(0.06 + (0.22 * var(--chloe-dark)));
        mix-blend-mode: screen;
        filter: none;
      }

      /* Ensure main text renders above dimmer */
      :root[data-chloe-theme="dark"] main{
        position: relative;
        z-index: 12 !important;
        background: transparent !important;
      }

      @media (prefers-reduced-motion: reduce){
        :root[data-chloe-theme="dark"] #chloe-code-rain{ display:none !important; }
      }

      /* Keep overall bg muddy at the top; dimmer handles the fade-to-black */
      :root[data-chloe-theme="dark"] html,
      :root[data-chloe-theme="dark"] body,
      :root[data-chloe-theme="dark"] #root{
        background: rgb(79 70 63) !important; /* muddy base */
      }

      /* Disable/dim the big hero background image overlay behind text (causes brown/mud) */
      :root[data-chloe-theme="dark"] main img,
      :root[data-chloe-theme="dark"] main picture,
      :root[data-chloe-theme="dark"] main video {
        opacity: 1;
      }

      /* Target the background hero image specifically (most pages use an <img> with bg / "bg-" in src or a large absolute image) */
      :root[data-chloe-theme="dark"] img[src*="bg"],
      :root[data-chloe-theme="dark"] img[src*="background"],
      :root[data-chloe-theme="dark"] img[alt*="bg"]{
        opacity: calc(0.30 - (0.24 * var(--chloe-dark))) !important;
        filter: saturate(0.15) brightness(calc(0.88 - (0.18 * var(--chloe-dark)))) !important;
      }

      /* Label bars + headings */
      :root[data-chloe-theme="dark"] main h1,
      :root[data-chloe-theme="dark"] main h2 {
        background: var(--chloe-box-bg) !important;
        color: var(--chloe-box-fg) !important;
      }

      /* Ensure meta/description stay warm off-white */
      :root[data-chloe-theme="dark"] .chloe-meta,
      :root[data-chloe-theme="dark"] .chloe-meta div {
        color: var(--chloe-fg) !important;
      }

      /* Divider lines */
      :root[data-chloe-theme="dark"] main hr {
        border-top: 2px solid var(--chloe-rule) !important;
      }
    </style>
`;
  if (/<style\b[^>]*id=["']chloe-overrides["'][^>]*>[\s\S]*?<\/style>/i.test(html)) {
    html = html.replace(
      /<style\b[^>]*id=["']chloe-overrides["'][^>]*>[\s\S]*?<\/style>/i,
      chloeOverridesCss.trimEnd()
    );
  } else if (html.includes(".chloe-job-label")) {
    html = html.replace(
      /<style>\s*\.chloe-job-label[\s\S]*?<\/style>/i,
      chloeOverridesCss.trimEnd()
    );
  } else {
    const headPatched = html.replace(/<\/head>/i, `${chloeOverridesCss}  </head>`);
    if (headPatched === html) fail("HEAD_CLOSE_NOT_FOUND");
    html = headPatched;
  }

  const mainOpenRe = /<main\b[^>]*>/i;
  const mOpen = mainOpenRe.exec(html);
  if (!mOpen) fail("MAIN_TAG_NOT_FOUND");
  const mainOpenIdx = mOpen.index;
  const mainBodyStart = mainOpenIdx + mOpen[0].length;
  const mainCloseIdx = html.toLowerCase().indexOf("</main>", mainBodyStart);
  if (mainCloseIdx === -1) fail("MAIN_CLOSE_NOT_FOUND");

  let mainBody = html.slice(mainBodyStart, mainCloseIdx);

  // Change the first boxed "Hi there" heading in <main> to "Hi!" while preserving wrapper markup/classes.
  let hiHeadingPatched = false;
  mainBody = mainBody.replace(
    /<(h1|div|span)\b([^>]*)>(\s*)Hi(?: there|!)(\s*)<\/\1>/i,
    (_match, tag, attrs, leadingWs, trailingWs) => {
      hiHeadingPatched = true;
      let nextAttrs = attrs;
      if (/\bid\s*=/i.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/\bid\s*=\s*(["']).*?\1/i, `id="chloe-hi"`);
      } else {
        nextAttrs = `${nextAttrs} id="chloe-hi"`;
      }
      return `<${tag}${nextAttrs}>${leadingWs}Hi!${trailingWs}</${tag}>`;
    }
  );
  if (!hiHeadingPatched && !/<(h1|div|span)\b[^>]*\bid=["']chloe-hi["'][^>]*>\s*Hi!\s*<\/\1>/i.test(mainBody)) {
    fail("HI_HEADING_NOT_FOUND_IN_MAIN");
  }

  // Replace the bio block between the first Hi heading and the next Projects heading.
  const hiHeadingRe = /<(h1|div|span)\b[^>]*>\s*Hi(?: there|!)\s*<\/\1>/i;
  const hiMatch = hiHeadingRe.exec(mainBody);
  if (!hiMatch) fail("HI_HEADING_NOT_FOUND_IN_MAIN_AFTER_PATCH");
  const hiHeadingEnd = hiMatch.index + hiMatch[0].length;
  const projectsH1Re = /<h1\b[^>]*>\s*projects\s*<\/h1>/i;
  const projectsAfterHiMatch = projectsH1Re.exec(mainBody.slice(hiHeadingEnd));
  if (!projectsAfterHiMatch) fail("PROJECTS_H1_NOT_FOUND_AFTER_HI_IN_MAIN");

  const projectsH1Idx = hiHeadingEnd + projectsAfterHiMatch.index;
  mainBody =
    mainBody.slice(0, hiHeadingEnd) +
    `\n<p>Here's what I've been up to the past few years!</p>\n<hr />\n` +
    mainBody.slice(projectsH1Idx);

  // Find the Contact heading INSIDE main (if present) so we can replace only the projects area.
  const contactHeadingRe = /<h[1-6][^>]*>\s*contact\s*<\/h[1-6]>/i;
  const cMatch = contactHeadingRe.exec(mainBody);
  const projectsRelEnd = cMatch ? cMatch.index : mainBody.length;

  // Try to find a Projects heading INSIDE main (start replacement there if we can)
  const projectsHeadingRe = /<h[1-6][^>]*>\s*projects\s*<\/h[1-6]>/i;
  const pMatch = projectsHeadingRe.exec(mainBody);
  let projectsRelStart = 0;
  if (pMatch) projectsRelStart = pMatch.index;
  else {
    // fallback: start at first year header (your file has <h3>2023-24</h3>)
    const yearIdx = mainBody.indexOf("<h3>2023-24</h3>");
    if (yearIdx !== -1) projectsRelStart = yearIdx;
    else warn("Projects heading and year marker not found; replacing from start of <main>.");
  }

  const META = 'style="margin:0 auto;width:640px;max-width:calc(100% - 32px);text-align:left;"';

  const newProjectsHtml = `
<h1>Projects</h1>

<hr />

<h2 class="chloe-job-label">Stealth Startup - Founder</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">Feb 2026 - Present</div>
  <div>Remote</div>
  <div>More news soon.</div>
</div>

<hr />

<h2 class="chloe-job-label">Adobe - AI Search</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">Jan 2026 - Present</div>
  <div>Los Angeles Metropolitan Area  Remote</div>
  <div>Contract</div>
  <div>Search optimization for LLM training &amp; retrieval. Not via an organization on campus.</div>
</div>

<hr />

<h2 class="chloe-job-label">Instagram - Creator</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">Jul 2025 - Present</div>
  <div>Los Angeles, California, United States  Hybrid</div>
  <div>Self-employed</div>
  <div>
300K+ followers<br/>
250M views<br/>
Grew IG from 0 to 140k+ in 3 months<br/>
Viral series accumulated 200M views &amp; attention from major news outlets<br/>
Worked with Adidas, Adobe, Est??e Lauder, OpenAI, Hera, etc.
</div>
</div>

<hr />

<h2 class="chloe-job-label">Single Origin Studio - CEO</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">Jun 2023 - Jan 2026</div>
  <div>Los Angeles, California, United States  Remote</div>
  <div>Self-employed</div>
  <div>Marketing consulting | Previous experience with YC backed startups | Full in house marketing with UGC team management | Scaled brands from 0 to 50k+ users in 2 months | Generated 6 figures of revenue | Worked with pre-seed and early stage</div>
</div>

<hr />

<h2 class="chloe-job-label">Outsmart - Product Marketing</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">Sep 2025 - Dec 2025</div>
  <div>Los Angeles, California, United States  Hybrid</div>
  <div>Contract</div>
  <div>Product and growth directly under ex-CMO @ Duolingo, $38M raised, backed by DST Global, Lightspeed, Khosla Ventures, execs from OpenAI &amp; Quora.</div>
</div>

<hr />

<h2 class="chloe-job-label">Stealth AI Startup - Head of Growth</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">Jun 2025 - Sep 2025</div>
  <div>San Francisco, California, United States  On-site</div>
  <div>Full-time</div>
  <div>Product and growth for B2C fashion tech, backed by execs from Shopify and Pinterest.</div>
</div>

<hr />

<h2 class="chloe-job-label">Soluna - Product Marketing Intern</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">Oct 2024 - Jun 2025</div>
  <div>Los Angeles, California, United States  Remote</div>
  <div>Internship</div>
  <div>Streamlined Solunas GTM, drove 179% increase in revenue in US market.</div>
</div>

<hr />

<h2 class="chloe-job-label">Headspace - Digital Marketing Intern</h2>
<div class="chloe-meta" ${META}>
  <div class="chloe-date">May 2022 - Sep 2023</div>
  <div>Los Angeles, California, United States  Remote</div>
  <div>Internship</div>
  <div>Tripled Headspaces social media presence in one year, youngest employee to earn an extended contract.</div>
</div>

<hr />
`;

  let patchedMain =
    mainBody.slice(0, projectsRelStart) +
    newProjectsHtml +
    mainBody.slice(projectsRelEnd);

  // Remove the Contact section entirely (and an immediate preceding divider if present).
  patchedMain = patchedMain.replace(
    /\s*<hr\s*\/?>\s*<h1\b[^>]*>\s*contact\s*<\/h1>[\s\S]*$/i,
    ""
  );
  patchedMain = patchedMain.replace(
    /\s*<h1\b[^>]*>\s*contact\s*<\/h1>[\s\S]*$/i,
    ""
  );

  html = html.slice(0, mainBodyStart) + patchedMain + html.slice(mainCloseIdx);

  if (!/<div\b[^>]*id=["']chloe-scroll-dimmer["'][^>]*>/i.test(html)) {
    const withDimmer = html.replace(
      /<body\b([^>]*)>/i,
      `<body$1>\n<div id="chloe-scroll-dimmer" aria-hidden="true"></div>`
    );
    if (withDimmer === html) fail("BODY_OPEN_NOT_FOUND");
    html = withDimmer;
  }
  // Ensure injection is not duplicated before inserting the signed-off code rain.
  html = html.replace(/\s*<canvas\b[^>]*id=["']chloe-code-rain["'][^>]*><\/canvas>\s*/gi, "\n");
  html = html.replace(
    /\s*<script\b[^>]*id=["']chloe-code-rain-script["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    "\n"
  );

  if (CHLOE_THEME === "dark") {
    let withRainCanvas = html.replace(
      /(<div\b[^>]*id=["']chloe-scroll-dimmer["'][^>]*><\/div>)/i,
      `$1\n<canvas id="chloe-code-rain" aria-hidden="true"></canvas>`
    );
    if (withRainCanvas === html) {
      withRainCanvas = html.replace(
        /<body\b([^>]*)>/i,
        `<body$1>\n<canvas id="chloe-code-rain" aria-hidden="true"></canvas>`
      );
    }
    if (withRainCanvas === html) fail("CODE_RAIN_CANVAS_INSERT_FAILED");
    html = withRainCanvas;
  }

  const chloeRainScript = `<script id="chloe-code-rain-script">
(() => {
  const root = document.documentElement;
  if (root.getAttribute("data-chloe-theme") !== "dark") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.getElementById("chloe-code-rain");
  if (!canvas || canvas.__chloeInit) return;
  canvas.__chloeInit = true;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  // Katakana-heavy + latin like the reference
  const KATA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
  const LATN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const SYM  = "$#@*+-=<>";

  const GLYPHS = (KATA + KATA + LATN + SYM); // bias toward katakana

  // Signed-off big glyph scale
  let w=0, h=0, dpr=1;
  let fontSize = 56;
  let step = 56;
  let cols = 0;
  let drops = [];
  let active = [];
  let lastT = 0;
  let accum = 0;

  // Side-heavy + center-faded band (behind Projects text)
  let bandL = 0, bandR = 0;

  // Background haze (faint glyph field)
  const haze = document.createElement("canvas");
  const hctx = haze.getContext("2d", { alpha: true });

  function randChar(){
    return GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }

  function clamp01(t){ return Math.max(0, Math.min(1, t)); }

  function sideWeight(x){
    // 0 at center, 1 at edges, slightly powered
    const t = Math.min(1, Math.max(0, Math.abs(x - w/2) / (w/2)));
    return Math.pow(t, 1.6);
  }

  function resize(){
    dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr,0,0,dpr,0,0);

    // center band where we fade the rain behind text
    const centerBand = 0.60; // 60% width faded
    const bandW = w * centerBand;
    bandL = (w - bandW) / 2;
    bandR = bandL + bandW;

    ctx.font = \`\${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace\`;
    ctx.textBaseline = "top";

    cols = Math.max(1, Math.floor(w / step));
    drops = new Array(cols).fill(0).map(() => ({
      y: (Math.random() * h) - h * 0.6,
      // slower speeds (px per ms) => ~2035 px/sec
      v: 0.020 + Math.random()*0.015,
      len: 14 + ((Math.random()*14)|0)
    }));

    // activation: less frequent overall, heavier at edges, reduced in center band
    active = new Array(cols).fill(false).map((_, i) => {
      const x = i * step + step/2;
      const edge = sideWeight(x);
      let p = 0.22 + 0.52*edge; // sides heavier
      if (x >= bandL && x <= bandR) p *= 0.35; // center sparser
      p = Math.min(0.92, Math.max(0.06, p));
      return Math.random() < p;
    });

    rebuildHaze();
  }

  function rebuildHaze(){
    if (!hctx) return;
    haze.width = w * dpr;
    haze.height = h * dpr;
    haze.style.width = w + "px";
    haze.style.height = h + "px";
    hctx.setTransform(dpr,0,0,dpr,0,0);
    hctx.clearRect(0,0,w,h);
    hctx.font = ctx.font;
    hctx.textBaseline = "top";

    // faint background glyph field like the reference
    const count = Math.floor((w*h) / (step*step) * 2.2);
    for (let i=0;i<count;i++){
      const x = Math.random()*w;
      const y = Math.random()*h;
      const inBand = (x >= bandL && x <= bandR);
      const mul = inBand ? 0.18 : 1.0;
      const a = (16 + (Math.random()*22)) * mul; // very faint
      hctx.fillStyle = \`rgba(35,140,90,\${a/255})\`;
      hctx.fillText(randChar(), x, y);
    }
    // soften haze slightly
    // (no expensive filters; rely on low alpha + blend)
  }

  function tick(now){
    if (!lastT) lastT = now;
    const dt = now - lastT;
    lastT = now;

    // throttle ~20fps for smoother, slower feel
    accum += dt;
    if (accum < 50) { requestAnimationFrame(tick); return; }
    const frameDt = accum;
    accum = 0;

    const dark = parseFloat(getComputedStyle(root).getPropertyValue("--chloe-dark")) || 0;

    // trail fade (slow build, readable glyphs)
    ctx.fillStyle = \`rgba(0,0,0,\${0.055 + 0.045*dark})\`;
    ctx.fillRect(0,0,w,h);

    // draw faint haze behind streams
    if (hctx) {
      ctx.globalAlpha = 0.28 + 0.20*dark;
      ctx.drawImage(haze, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // stream colors (reference-like)
    const headRGB = [165,255,200];
    const tailRGB = [55,255,165];

    for (let i=0;i<cols;i++){
      if (!active[i]) continue;

      const x = i * step;
      const d = drops[i];

      // advance slowly
      d.y += d.v * frameDt;

      // reset
      if (d.y > h + d.len*step*0.62 + 120){
        d.y = -Math.random()*800;
        d.v = 0.020 + Math.random()*0.015;
        d.len = 14 + ((Math.random()*14)|0);
      }

      const inBand = ((x+step/2) >= bandL && (x+step/2) <= bandR);
      const mul = inBand ? 0.18 : 1.0;

      // Draw tail (dim -> brighter near head)
      for (let k=0;k<d.len;k++){
        const y = d.y + k * (step * 0.62);
        if (y < -fontSize || y > h + fontSize) continue;

        const t = (k / Math.max(1, d.len-1)); // 0..1
        const a = (0.12 + 0.30*t) * mul;      // tail alpha
        ctx.shadowBlur = 0;
        const r = Math.round(tailRGB[0] * (0.85 + 0.15*t));
        const g = tailRGB[1];
        const b = Math.round(tailRGB[2] * (0.85 + 0.15*t));
        ctx.fillStyle = \`rgba(\${r},\${g},\${b},\${a})\`;
        ctx.fillText(randChar(), x, y);
      }

      // Bright head glyph
      const headY = d.y + (d.len-1) * (step * 0.62);
      ctx.shadowColor = "rgba(120,255,190,0.55)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = \`rgba(\${headRGB[0]},\${headRGB[1]},\${headRGB[2]},\${(0.92*mul)})\`;
      ctx.fillText(randChar(), x, headY);
    }

    requestAnimationFrame(tick);
  }

  resize();
  requestAnimationFrame(tick);

  // refresh haze occasionally so it doesn't look frozen
  let hazeTimer = 0;
  setInterval(() => { rebuildHaze(); }, 2200);

  window.addEventListener("resize", resize, { passive:true });
})();
</script>`;
  {
    const bodyPatchedWithRain = html.replace(/<\/body>/i, `${chloeRainScript}\n</body>`);
    if (bodyPatchedWithRain === html) fail("BODY_CLOSE_NOT_FOUND_FOR_RAIN");
    html = bodyPatchedWithRain;
  }

  const chloeScrollToneScript = `<script id="chloe-scroll-tone">
(() => {
  const root = document.documentElement;
  if (root.getAttribute("data-chloe-theme") !== "dark") return;

  function clamp01(t){ return Math.max(0, Math.min(1, t)); }

  function findHi() {
    const byId = document.getElementById("chloe-hi");
    if (byId) return byId;
    const els = Array.from(document.querySelectorAll("main *"));
    return els.find(el => (el.textContent || "").trim() === "Hi!");
  }

  let hiY = null;

  function recomputeHi() {
    const hi = findHi();
    if (!hi) return;
    hiY = hi.getBoundingClientRect().top + window.scrollY;
  }

  function render() {
    if (hiY == null) recomputeHi();
    if (hiY == null) return;

    const start = Math.max(0, hiY - 1600);
    const end   = Math.max(0, hiY - 500);

    const y = window.scrollY;
    const t = clamp01((y - start) / Math.max(1, (end - start)));

    root.style.setProperty("--chloe-dark", t.toFixed(4));
  }

  // Init + listeners
  recomputeHi();
  render();
  window.addEventListener("scroll", render, { passive: true });
  window.addEventListener("resize", () => { recomputeHi(); render(); });
  window.addEventListener("load", () => { recomputeHi(); render(); });
})();
</script>`;
  if (/<script\b[^>]*id=["']chloe-scroll-tone["'][^>]*>[\s\S]*?<\/script>/i.test(html)) {
    html = html.replace(
      /<script\b[^>]*id=["']chloe-scroll-tone["'][^>]*>[\s\S]*?<\/script>/i,
      chloeScrollToneScript
    );
  } else {
    const bodyPatched = html.replace(/<\/body>/i, `${chloeScrollToneScript}\n</body>`);
    if (bodyPatched === html) fail("BODY_CLOSE_NOT_FOUND");
    html = bodyPatched;
  }

  html = html.replace(
    /\s*<script\b[^>]*id=["']chloe-menu-and-projects-fixes["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    "\n"
  );
  const chloeMenuAndProjectsFixesScript = `<script id="chloe-menu-and-projects-fixes">
(() => {
  const onReady = (fn) =>
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", fn)
      : fn();

  const TYPE_SET = new Set(["Contract","Internship","Full-time","Self-employed"]);

  const JOBS = [
    { title: "Adobe - AI Search", date: "Jan 2026 - Present", loc: "Los Angeles" },
    { title: "Instagram - Creator", date: "Jul 2025 - Present", loc: "World Wide" },
    { title: "Single Origin Studio - CEO", date: "Jun 2023 - Jan 2026", loc: "Remote" },
    { title: "Outsmart - Product Marketing", date: "Sep 2025 - Dec 2025", loc: "Los Angeles" },
    { title: "Stealth AI Startup - Head of Growth", date: "Jun 2025 - Sep 2025", loc: "San Francisco" },
    { title: "Soluna - Product Marketing Intern", date: "Oct 2024 - Jun 2025", loc: "Los Angeles" },
    { title: "Headspace - Digital Marketing Intern", date: "May 2022 - Sep 2023", loc: "Los Angeles" },
    // keep founder job intact but do not change its location/date here
    { title: "Stealth Startup - Founder", date: "Feb 2026 - Present", loc: null },
  ];

  const textEq = (a,b) => (a||"").trim() === (b||"").trim();

  const findExactNode = (txt) => {
    const nodes = Array.from(document.querySelectorAll("h1,h2,h3,h4,p,div,span,li,a"));
    return nodes.find(n => textEq(n.textContent, txt)) || null;
  };

  const findJobContainer = (titleEl, titleText) => {
    if (!titleEl) return null;

    const otherTitles = new Set(JOBS.map(j => j.title).filter(t => t !== titleText));
    let cur = titleEl;

    for (let i=0; i<10 && cur; i++){
      const p = cur.parentElement;
      if (!p) break;

      const t = (p.textContent || "");
      // Must contain our title
      if (!t.includes(titleText)) { cur = p; continue; }

      // Reject containers that include other job titles (too big)
      let hasOther = false;
      for (const ot of otherTitles) {
        if (t.includes(ot)) { hasOther = true; break; }
      }
      if (hasOther) { cur = p; continue; }

      // Good container should have at least a date-like line nearby or a type line
      const hasType = Array.from(p.querySelectorAll("p,div,span,li,h3,h4")).some(n => TYPE_SET.has((n.textContent||"").trim()));
      const hasDate = Array.from(p.querySelectorAll("h3,h4,p,div,span")).some(n => /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+20\\d{2}\\s*-\\s*(Present|20\\d{2})/i.test((n.textContent||"").trim()));
      if (hasType || hasDate) return p;

      cur = p;
    }

    // fallback: nearest parent
    return titleEl.parentElement || null;
  };

  const orderedLines = (container) => {
    // capture the typical structure in DOM order
    return Array.from(container.querySelectorAll("h3,h4,p,div,span,li"))
      .filter(n => (n.textContent||"").trim().length > 0);
  };

  const findLineIndex = (lines, elOrText) => {
    if (typeof elOrText === "string") {
      return lines.findIndex(n => textEq(n.textContent, elOrText));
    }
    const idx = lines.indexOf(elOrText);
    if (idx >= 0) return idx;
    return -1;
  };

  const ensureDateAndLocation = (job) => {
    const titleEl = findExactNode(job.title);
    if (!titleEl) return;

    const container = findJobContainer(titleEl, job.title);
    if (!container) return;

    const lines = orderedLines(container);

    // Find title position in this container's line list by nearest matching line
    // (the title bar itself may be h2 and not in lines; so scan by text within container)
    const titleIdx = lines.findIndex(n => textEq(n.textContent, job.title));
    const startIdx = titleIdx >= 0 ? titleIdx : 0;

    // Find date line AFTER title (or near top) and restore it explicitly
    let dateEl = null;
    let dateElIdx = -1;
    const dateRe = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+20\\d{2}\\s*-\\s*(Present|20\\d{2})/i;

    for (let i = startIdx; i < Math.min(lines.length, startIdx + 10); i++){
      const txt = (lines[i].textContent||"").trim();
      if (dateRe.test(txt) || txt === job.date) {
        dateEl = lines[i];
        dateElIdx = i;
        break;
      }
    }

    // If date line was previously overwritten (e.g., "Remote"), we still restore it by searching for the first plausible "big line":
    if (!dateEl) {
      // heuristic: choose first h3/h4 in container and treat as date line
      dateEl = container.querySelector("h3,h4");
      if (dateEl) dateElIdx = findLineIndex(lines, dateEl);
    }

    if (dateEl && job.date) dateEl.textContent = job.date;

    // Now set ONLY the location line directly UNDER the date line
    if (job.loc) {
      let locEl = null;

      if (dateElIdx >= 0) {
        for (let j = dateElIdx + 1; j < Math.min(lines.length, dateElIdx + 8); j++){
          const txt = (lines[j].textContent||"").trim();
          if (TYPE_SET.has(txt)) break; // stop at job type section
          // pick the first non-empty line as "location" (this matches the sites structure)
          locEl = lines[j];
          break;
        }
      }

      // fallback: find a line that looks like a location line (contains commas/Area/Remote/Hybrid/United)
      if (!locEl) {
        locEl = lines.find(n => /(Area|United|Hybrid|On-site|Remote|Los Angeles|San Francisco|California)/i.test((n.textContent||"")));
      }

      if (locEl) locEl.textContent = job.loc;
    }

    // Insert a visible blank line between job type and description
    const typeEl = lines.find(n => TYPE_SET.has((n.textContent||"").trim()));
    if (typeEl) {
      const next = typeEl.nextElementSibling;
      if (!(next && next.classList && next.classList.contains("chloe-job-gap"))) {
        const gap = document.createElement("div");
        gap.className = "chloe-job-gap";
        gap.style.height = "12px";
        gap.style.width = "1px";
        typeEl.insertAdjacentElement("afterend", gap);
      }
    }
  };

  onReady(() => {
    // Keep existing menu/icon fixes if they already exist from previous runs.
    // (Do not re-break anything hereonly ensure copy/apostrophes + jobs date/loc/type gap.)

    // Apostrophes fix:
    const bad1 = findExactNode("Heres what Ive been up to the past few years!");
    const bad2 = findExactNode("Here's what Ive been up to the past few years!");
    const bad3 = findExactNode("Heres what I've been up to the past few years!");
    const target = bad1 || bad2 || bad3;
    if (target) target.textContent = "Here\\u2019s what I\\u2019ve been up to the past few years!";

    // Restore dates + set locations safely
    for (const job of JOBS) ensureDateAndLocation(job);
  });
})();
</script>`;
  {
    const bodyPatchedWithFixes = html.replace(/<\/body>/i, `${chloeMenuAndProjectsFixesScript}\n</body>`);
    if (bodyPatchedWithFixes === html) fail("BODY_CLOSE_NOT_FOUND_FOR_MENU_FIXES");
    html = bodyPatchedWithFixes;
  }

  // Verification: old project titles should be gone, new one must exist
  if (html.includes("My name is Ed")) fail("OLD_ED_BIO_STILL_PRESENT");
  if (html.includes("Page Buddy")) fail("OLD_PROJECTS_STILL_PRESENT (Page Buddy found)");
  if (!html.includes("Hi!")) fail("HI_BANG_MISSING");
  if (!html.includes("Stealth Startup - Founder")) fail("TOP_STEALTH_FOUNDER_MISSING");
  if (!html.includes("Adobe - AI Search")) fail("ADOBE_PROJECT_MISSING");
  if (!html.includes("Instagram - Creator")) fail("INSTAGRAM_PROJECT_MISSING");
  if (!html.includes("Outsmart - Product Marketing")) fail("OUTSMART_PROJECT_MISSING");
  if (!html.includes('class="chloe-date"')) fail("CHLOE_DATE_CLASS_MISSING");
  const instagramIdx = html.indexOf("Instagram - Creator");
  const singleOriginIdx = html.indexOf("Single Origin Studio - CEO");
  const outsmartIdx = html.indexOf("Outsmart - Product Marketing");
  if (instagramIdx === -1 || singleOriginIdx === -1 || outsmartIdx === -1) {
    fail("PROJECT_ORDER_MARKERS_MISSING");
  }
  if (!(instagramIdx < singleOriginIdx && singleOriginIdx < outsmartIdx)) {
    fail("SINGLE_ORIGIN_ORDER_INCORRECT");
  }
  if (/<h1\b[^>]*>\s*contact\s*<\/h1>/i.test(html)) fail("CONTACT_SECTION_STILL_PRESENT");
  if (!html.includes('id="chloe-hi"')) fail("CHLOE_HI_ID_MISSING");
  if (!html.includes('id="chloe-scroll-dimmer"')) fail("SCROLL_DIMMER_MISSING");
  if (html.includes('data-chloe-theme="dark"') && !html.includes('id="chloe-code-rain"')) {
    fail("CHLOE_CODE_RAIN_CANVAS_MISSING");
  }
  if (!html.includes('id="chloe-code-rain-script"')) fail("CHLOE_CODE_RAIN_SCRIPT_MISSING");
  if (!html.includes('id="chloe-scroll-tone"')) fail("SCROLL_TONE_SCRIPT_MISSING");
  if (!html.includes('id="chloe-menu-and-projects-fixes"')) fail("MENU_PROJECTS_FIXES_SCRIPT_MISSING");
  if (!html.includes("--chloe-dark")) fail("CHLOE_DARK_VAR_MISSING");
  if (!html.includes("--chloe-bg")) fail("CHLOE_BG_VAR_MISSING");
  if (!html.includes(".chloe-job-gap")) fail("CHLOE_JOB_GAP_CSS_MISSING");
  if (!html.includes("Here's what I've been up to the past few years!")) fail("HI_COPY_APOSTROPHES_MISSING");
  if (CHLOE_THEME === "dark") {
    if (!html.includes('data-chloe-theme="dark"')) fail("DARK_THEME_ATTR_MISSING");
    if (!html.includes("--chloe-bg")) fail("DARK_THEME_CSS_MISSING");
    if (!html.includes("--chloe-box-bg:#DDD6CC")) fail("DARK_THEME_BOX_BG_MISSING");
    if (!html.includes('img[src*="bg"]')) fail("DARK_THEME_BG_IMG_SELECTOR_MISSING");
    if (!html.includes("#chloe-code-rain")) fail("DARK_THEME_CODE_RAIN_CSS_MISSING");
  }

  fs.writeFileSync(indexPath, html, "utf8");
  const writtenHtml = fs.readFileSync(indexPath, "utf8");
  if (!writtenHtml.includes('id="chloe-menu-and-projects-fixes"')) {
    fail("MENU_PROJECTS_FIXES_SCRIPT_MISSING_AFTER_WRITE");
  }
  console.log(`${prefix} DONE (scroll Projects replaced).`);
}

try {
  main();
} catch (e) {
  console.error(`[work:retro:apply-chloe] ERROR: ${e.message}`);
  process.exit(1);
}
