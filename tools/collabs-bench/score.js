const fs = require("fs");
const path = require("path");
const { decodePng } = require("./png_decode");

const OUT_DIR = path.join(__dirname, "_out");

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function load(name) {
  const file = path.join(OUT_DIR, name);
  if (!fs.existsSync(file)) {
    throw new Error(`missing screenshot: ${file}`);
  }
  return decodePng(fs.readFileSync(file));
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sampleRegionStats(img, nx0, ny0, nx1, ny1) {
  const x0 = clamp(Math.floor(nx0 * img.width), 0, img.width - 1);
  const y0 = clamp(Math.floor(ny0 * img.height), 0, img.height - 1);
  const x1 = clamp(Math.floor(nx1 * img.width), x0 + 1, img.width);
  const y1 = clamp(Math.floor(ny1 * img.height), y0 + 1, img.height);
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  let max = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * img.width + x) * 4;
      const ll = luma(img.data[i], img.data[i + 1], img.data[i + 2]);
      sum += ll;
      sumSq += ll * ll;
      max = Math.max(max, ll);
      n += 1;
    }
  }
  const mean = sum / Math.max(1, n);
  const variance = Math.max(0, sumSq / Math.max(1, n) - mean * mean);
  return { mean, stddev: Math.sqrt(variance), max };
}

function downsample(img, outW, outH) {
  const out = new Float32Array(outW * outH * 3);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const sx = clamp(Math.floor(((x + 0.5) / outW) * img.width), 0, img.width - 1);
      const sy = clamp(Math.floor(((y + 0.5) / outH) * img.height), 0, img.height - 1);
      const si = (sy * img.width + sx) * 4;
      const oi = (y * outW + x) * 3;
      out[oi] = img.data[si];
      out[oi + 1] = img.data[si + 1];
      out[oi + 2] = img.data[si + 2];
    }
  }
  return { width: outW, height: outH, data: out };
}

function parallaxDiff(center, corner) {
  const c = downsample(center, 96, 48);
  const k = downsample(corner, 96, 48);
  let acc = 0;
  for (let i = 0; i < c.data.length; i += 1) {
    acc += Math.abs(c.data[i] - k.data[i]) / 255;
  }
  const raw = acc / Math.max(1, c.data.length);
  return clamp(raw * 320, 0, 1);
}

function portalRingBrightness(img) {
  const small = downsample(img, 120, 60);
  const cx = 0.5 * small.width;
  const cy = 0.47 * small.height;
  const r0 = 0.11 * Math.min(small.width, small.height);
  const r1 = 0.2 * Math.min(small.width, small.height);
  let n = 0;
  let bright = 0;
  let sum = 0;
  let sumSq = 0;
  let max = 0;
  for (let y = 0; y < small.height; y += 1) {
    for (let x = 0; x < small.width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const rr = Math.sqrt(dx * dx + dy * dy);
      if (rr < r0 || rr > r1) continue;
      const i = (y * small.width + x) * 3;
      const ll = luma(small.data[i], small.data[i + 1], small.data[i + 2]);
      n += 1;
      if (ll >= 135) bright += 1;
      sum += ll;
      sumSq += ll * ll;
      max = Math.max(max, ll);
    }
  }
  const brightRatio = n > 0 ? bright / n : 0;
  const mean = sum / Math.max(1, n);
  const variance = Math.max(0, sumSq / Math.max(1, n) - mean * mean);
  return { brightRatio, max, stddev: Math.sqrt(variance) };
}

function main() {
  const homeCenter = load("home_center.png");
  const homeTl = load("home_topleft.png");
  const homeBr = load("home_bottomright.png");
  const reelsCenter = load("reels_center.png");

  const homeStats = sampleRegionStats(homeCenter, 0, 0, 1, 1);
  const HERO_STDDEV = Number(homeStats.stddev.toFixed(2));
  const HERO_PRESENT_PASS = HERO_STDDEV >= 18;

  const portal = portalRingBrightness(homeCenter);
  const PORTAL_BRIGHT_RATIO = Number(portal.brightRatio.toFixed(4));
  const PORTAL_MAX = Number(portal.max.toFixed(2));
  const PORTAL_STDDEV = Number(portal.stddev.toFixed(2));
  const PORTAL_BRIGHT_PASS = portal.brightRatio >= 0.0001 && PORTAL_MAX >= 140 && PORTAL_STDDEV >= 8;

  const waterStats = sampleRegionStats(homeCenter, 0, 0.75, 1, 1);
  const WATER_MAX = Number(waterStats.max.toFixed(2));
  const WATER_STDDEV = Number(waterStats.stddev.toFixed(2));
  const WATER_LIFE_PASS = WATER_MAX >= 230 && WATER_STDDEV >= 12;

  const paraA = parallaxDiff(homeCenter, homeTl);
  const paraB = parallaxDiff(homeCenter, homeBr);
  const PARALLAX_SCORE = Number(((paraA + paraB) * 0.5).toFixed(4));
  const PARALLAX_PASS = PARALLAX_SCORE >= 0.06 && PARALLAX_SCORE <= 0.22;

  const reelsTop = sampleRegionStats(reelsCenter, 0, 0, 1, 0.4);
  const REELS_TOP_LUMA = Number(reelsTop.mean.toFixed(2));
  const REELS_WHITE_PASS = REELS_TOP_LUMA >= 235;

  const FUNCTIONAL_PASS = fs.existsSync(path.join(OUT_DIR, "functional_pass.txt"));

  const HOME_NOT_BLACK = homeStats.mean >= 8 && homeStats.stddev >= 2;
  const REELS_NOT_BLACK = REELS_TOP_LUMA >= 8;
  const BLACK_CAPTURE_PASS = HOME_NOT_BLACK && REELS_NOT_BLACK;

  const gates = {
    HERO_STDDEV_MIN: 18,
    PORTAL_BRIGHT_RATIO_MIN: 0.0001,
    PORTAL_MAX_MIN: 140,
    PORTAL_STDDEV_MIN: 8,
    WATER_LUMA_MAX_MIN: 230,
    WATER_STDDEV_MIN: 12,
    PARALLAX_MIN: 0.06,
    PARALLAX_MAX: 0.22,
    REELS_TOP_LUMA_MIN: 235,
    FUNCTIONAL: true,
  };

  const pass = Boolean(
    HERO_PRESENT_PASS &&
      PORTAL_BRIGHT_PASS &&
      WATER_LIFE_PASS &&
      PARALLAX_PASS &&
      REELS_WHITE_PASS &&
      FUNCTIONAL_PASS &&
      BLACK_CAPTURE_PASS,
  );

  const out = {
    timestamp: new Date().toISOString(),
    viewport: [2048, 1024],
    scores: {
      HERO_STDDEV,
      HERO_PRESENT_PASS,
      PORTAL_BRIGHT_RATIO,
      PORTAL_MAX,
      PORTAL_STDDEV,
      PORTAL_BRIGHT_PASS,
      WATER_MAX,
      WATER_STDDEV,
      WATER_LIFE_PASS,
      PARALLAX_SCORE,
      PARALLAX_PASS,
      REELS_TOP_LUMA,
      REELS_WHITE_PASS,
      FUNCTIONAL_PASS,
      HOME_NOT_BLACK,
      REELS_NOT_BLACK,
      BLACK_CAPTURE_PASS,
    },
    gates,
    pass,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "latest_scores.json"), JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("[score] ERROR:", error && error.message ? error.message : error);
    process.exit(1);
  }
}
