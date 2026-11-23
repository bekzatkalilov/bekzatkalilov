/* Reusable cinematic background sets (SVG strings). */
(function (root) {
  'use strict';

  /**
   * darkRoom: night-time bedroom studio — window with city lights,
   * desk + glowing monitor, warm lamp, volumetric light, vignette.
   *   w,h       canvas size
   *   t         time (s) for flicker / screen animation
   *   floorY    floor line (where characters stand)
   *   screen    text shown on the monitor
   */
  function darkRoom({ w = 1920, h = 1080, t = 0, floorY = 900, screen = 'RENDERING… 98%', id = 'room' } = {}) {
    const s = h / 1080;
    const mx = w * 0.62, my = floorY - 470 * s;           // monitor top-left
    const mw = 520 * s, mh = 300 * s;
    const prog = 0.6 + 0.38 * ((t * 0.08) % 1);
    let city = '';
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const winX = w * 0.08, winY = h * 0.12, winW = w * 0.3, winH = h * 0.42;
    for (let i = 0; i < 22; i++) {
      const bw = (20 + rnd() * 50) * s, bh = (60 + rnd() * 240) * s;
      const bx = winX + rnd() * winW, by = winY + winH - bh;
      city += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#141a2e"/>`;
      for (let j = 0; j < 6; j++) {
        if (rnd() < 0.5) continue;
        const on = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 3 + j);
        city += `<rect x="${bx + 4 * s + rnd() * (bw - 10 * s)}" y="${by + 8 * s + rnd() * (bh - 16 * s)}" width="${4 * s}" height="${5 * s}" fill="#ffd27a" opacity="${(0.35 + 0.5 * on).toFixed(2)}"/>`;
      }
    }
    const bars = ['#ff5e7e', '#ffb347', '#4ade80', '#38bdf8', '#a78bfa'].map((c, i) =>
      `<rect x="${mx + 30 * s}" y="${my + (70 + i * 34) * s}" width="${(90 + 40 * Math.sin(t * 2 + i)) * s}" height="${20 * s}" rx="${4 * s}" fill="${c}" opacity="0.9"/>`).join('');
    const timeline = [...Array(3)].map((_, r) => [...Array(7)].map((_, k) =>
      `<rect x="${mx + (30 + k * 66) * s}" y="${my + (240 + r * 18) * s}" width="${58 * s}" height="${12 * s}" rx="${3 * s}" fill="${['#8b5cf6', '#38bdf8', '#22c55e'][r]}" opacity="0.8"/>`).join('')).join('');
    const pulse = Array.from({ length: 40 }, (_, i) => {
      const x = mx + (160 + i * 8) * s;
      const ph = (i + t * 12) % 40;
      const y = my + 40 * s - (ph > 18 && ph < 21 ? (ph - 18) * 12 * s : 0);
      return `${i ? 'L' : 'M'}${x} ${y}`;
    }).join(' ');

    return `<defs>
      <linearGradient id="${id}-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1b1f2e"/><stop offset="1" stop-color="#2a2f42"/></linearGradient>
      <linearGradient id="${id}-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#23232f"/><stop offset="1" stop-color="#121219"/></linearGradient>
      <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#4fd1ff" stop-opacity="0.35"/><stop offset="1" stop-color="#4fd1ff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-lamp" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffb26b" stop-opacity="0.45"/><stop offset="1" stop-color="#ffb26b" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-vig" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1026"/><stop offset="1" stop-color="#3b2a5a"/></linearGradient>
      <filter id="${id}-blur"><feGaussianBlur stdDeviation="${2.5 * s}"/></filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${id}-wall)"/>
    <g opacity="0.25">${[...Array(12)].map((_, i) => `<rect x="${i * w / 12}" y="0" width="${2 * s}" height="${floorY}" fill="#3a4058"/>`).join('')}</g>
    <!-- window -->
    <g filter="url(#${id}-blur)">
      <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" fill="url(#${id}-sky)"/>
      <circle cx="${winX + winW * 0.8}" cy="${winY + winH * 0.2}" r="${26 * s}" fill="#e9e4ff" opacity="0.85"/>
      ${city}
    </g>
    <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" fill="none" stroke="#0e0f16" stroke-width="${14 * s}"/>
    <path d="M${winX + winW / 2} ${winY} V${winY + winH} M${winX} ${winY + winH / 2} H${winX + winW}" stroke="#0e0f16" stroke-width="${8 * s}"/>
    <!-- moonlight beam -->
    <path d="M${winX} ${winY} L${winX + winW} ${winY} L${winX + winW + 380 * s} ${floorY} L${winX + 200 * s} ${floorY} Z" fill="#9db4ff" opacity="0.05"/>
    <!-- shelf -->
    <rect x="${w * 0.42}" y="${h * 0.22}" width="${300 * s}" height="${10 * s}" fill="#11121a"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${w * 0.42 + (20 + i * 26) * s}" y="${h * 0.22 - (60 + (i % 3) * 14) * s}" width="${20 * s}" height="${(60 + (i % 3) * 14) * s}" fill="${['#3d2b56', '#21455e', '#5a2f2f', '#2f4a36', '#4a4030'][i]}"/>`).join('')}
    <rect x="${w * 0.42 + 180 * s}" y="${h * 0.22 - 46 * s}" width="${50 * s}" height="${46 * s}" rx="${6 * s}" fill="#1f6f5c"/>
    <!-- floor -->
    <rect y="${floorY}" width="${w}" height="${h - floorY}" fill="url(#${id}-floor)"/>
    <rect y="${floorY}" width="${w}" height="${4 * s}" fill="#0c0c12"/>
    <!-- lamp -->
    <circle cx="${w * 0.55}" cy="${floorY - 330 * s}" r="${280 * s}" fill="url(#${id}-lamp)"/>
    <!-- desk -->
    <rect x="${w * 0.5}" y="${floorY - 170 * s}" width="${w * 0.48}" height="${16 * s}" rx="${4 * s}" fill="#0f1017"/>
    <rect x="${w * 0.52}" y="${floorY - 154 * s}" width="${12 * s}" height="${154 * s}" fill="#0f1017"/>
    <rect x="${w * 0.95}" y="${floorY - 154 * s}" width="${12 * s}" height="${154 * s}" fill="#0f1017"/>
    <path d="M${w * 0.55} ${floorY - 170 * s} l${-10 * s} ${-120 * s} l${40 * s} ${-60 * s}" stroke="#0f1017" stroke-width="${8 * s}" fill="none"/>
    <path d="M${w * 0.55 + 12 * s} ${floorY - 362 * s} l${70 * s} ${10 * s} l${-24 * s} ${50 * s} z" fill="#191a24"/>
    <!-- monitor -->
    <ellipse cx="${mx + mw / 2}" cy="${my + mh / 2}" rx="${mw * 1.1}" ry="${mh * 1.2}" fill="url(#${id}-glow)"/>
    <rect x="${mx + mw / 2 - 10 * s}" y="${my + mh}" width="${20 * s}" height="${floorY - 170 * s - my - mh}" fill="#0f1017"/>
    <rect x="${mx - 10 * s}" y="${my - 10 * s}" width="${mw + 20 * s}" height="${mh + 20 * s}" rx="${12 * s}" fill="#0a0b10"/>
    <rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="${6 * s}" fill="#0e1a2b"/>
    <path d="${pulse}" stroke="#ff4d6d" stroke-width="${2.5 * s}" fill="none"/>
    <text x="${mx + 30 * s}" y="${my + 46 * s}" font-family="Arial, sans-serif" font-weight="700" font-size="${18 * s}" fill="#ff6b81">♥ ${Math.round(150 + 25 * Math.sin(t * 1.3))} BPM</text>
    ${bars}
    <rect x="${mx + 190 * s}" y="${my + 80 * s}" width="${300 * s}" height="${130 * s}" rx="${10 * s}" fill="#13263d" stroke="#3aa0c8" stroke-width="${2 * s}"/>
    <text x="${mx + 212 * s}" y="${my + 125 * s}" font-family="Arial, sans-serif" font-weight="700" font-size="${17 * s}" fill="#cfe9ff">${screen}</text>
    <rect x="${mx + 212 * s}" y="${my + 150 * s}" width="${256 * s}" height="${18 * s}" rx="${9 * s}" fill="#0b1626"/>
    <rect x="${mx + 212 * s}" y="${my + 150 * s}" width="${256 * s * prog}" height="${18 * s}" rx="${9 * s}" fill="#34d399"/>
    ${timeline}
    <!-- keyboard + mug -->
    <rect x="${mx + 60 * s}" y="${floorY - 182 * s}" width="${300 * s}" height="${12 * s}" rx="${4 * s}" fill="#1b1d29"/>
    <rect x="${mx + 420 * s}" y="${floorY - 226 * s}" width="${40 * s}" height="${56 * s}" rx="${6 * s}" fill="#22c55e" opacity="0.85"/>
    <!-- screen light spill on floor -->
    <ellipse cx="${mx + mw / 2}" cy="${floorY + 30 * s}" rx="${mw}" ry="${60 * s}" fill="#4fd1ff" opacity="0.06"/>`;
  }

  /** Vignette + subtle film grain overlay (draw last). */
  function vignette({ w = 1920, h = 1080, id = 'vig' } = {}) {
    return `<defs><radialGradient id="${id}" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#${id})" pointer-events="none"/>`;
  }

  const api = { darkRoom, vignette };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Backgrounds = api;
})(typeof window !== 'undefined' ? window : globalThis);
