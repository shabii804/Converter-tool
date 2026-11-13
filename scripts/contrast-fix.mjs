// Find nearest blue-gray that passes 4.5:1 on given backgrounds
function lum(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(fg, bg) {
  const l1 = lum(fg), l2 = lum(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
function hex(c) { return "#" + c.map(v => v.toString(16).padStart(2, "0")).join(""); }

// dark: needs >=4.5 on #0b0f1a (bg) and #101627 (card) and #0e1424 (surface-1)
console.log("— DARK candidates (target >=4.5 on bg, card, surface-1) —");
for (const [r, g, b] of [[122,132,153],[118,128,149],[114,124,146],[122,131,150]]) {
  const c = [r, g, b];
  console.log(hex(c), "on 0b0f1a:", ratio(c, [11,15,26]).toFixed(2),
    "on 101627:", ratio(c, [16,22,39]).toFixed(2),
    "on 0e1424:", ratio(c, [14,20,36]).toFixed(2));
}
console.log("— LIGHT candidates (target >=4.5 on #fff and #f6f7fb) —");
for (const [r, g, b] of [[113,121,135],[109,117,131],[104,113,128],[100,109,124]]) {
  const c = [r, g, b];
  console.log(hex(c), "on fff:", ratio(c, [255,255,255]).toFixed(2),
    "on f6f7fb:", ratio(c, [246,247,251]).toFixed(2));
}
