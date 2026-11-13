// WCAG contrast calculator for measured color pairs
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
const pairs = [
  ["H1 (dark) #f2f5fa on #0b0f1a", [242,245,250], [11,15,26]],
  ["Intro/muted (dark) #97a1b5 on #0b0f1a", [151,161,181], [11,15,26]],
  ["Helper faint (dark) #6b7590 on #0b0f1a", [107,117,144], [11,15,26]],
  ["Helper faint on card #6b7590 on #101627", [107,117,144], [16,22,39]],
  ["Muted on card (dark) #97a1b5 on #101627", [151,161,181], [16,22,39]],
  ["White on primary btn #fff on #4f46e5", [255,255,255], [79,70,229]],
  ["White on violet grad end #fff on #7c3aed", [255,255,255], [124,58,237]],
  ["H1 (light) #0b0f1a on #ffffff", [11,15,26], [255,255,255]],
  ["Muted (light) #5b6472 on #ffffff", [91,100,114], [255,255,255]],
  ["Faint (light) #8a93a3 on #ffffff", [138,147,163], [255,255,255]],
  ["Faint (light) #8a93a3 on card surface-2 #fff", [138,147,163], [255,255,255]],
  ["Muted (light) on surface-1 #5b6472 on #f6f7fb", [91,100,114], [246,247,251]],
  ["Footer link dark #97a1b5 on footer bg #0e1424", [151,161,181], [14,20,36]],
];
for (const [name, fg, bg] of pairs) {
  console.log(name.padEnd(48), ratio(fg, bg).toFixed(2) + ":1");
}
