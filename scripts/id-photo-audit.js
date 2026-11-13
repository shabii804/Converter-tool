/* ID Photo page audit — runs in the browser via agent-browser eval.
   Measures typography, spacing, left-edge alignment, touch targets,
   overflow and collects colors for contrast math. */
(() => {
  const pick = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      font: cs.fontFamily.split(",")[0].replace(/["']/g, ""),
      size: cs.fontSize,
      weight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      color: cs.color,
      bg: cs.backgroundColor,
      x: Math.round(r.x),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };

  const out = { viewport: innerWidth + "x" + innerHeight };

  // main landmark + sections
  const main = document.querySelector("main");
  out.mainX = main ? Math.round(main.getBoundingClientRect().x) : null;

  out.h1 = pick(document.querySelector("main h1"));
  out.intro = pick(
    [...document.querySelectorAll("main p")].find((p) =>
      p.textContent.includes("Crop a photo")
    )
  );

  // labels & helper text inside options
  out.labels = [...document.querySelectorAll("main label")].slice(0, 8).map(pick);
  const labelPs = [...document.querySelectorAll("main p")].filter((p) =>
    /Size preset|Zoom|Move left|Move up|Background|print sheet/i.test(p.textContent)
  );
  out.labelPs = labelPs.slice(0, 8).map(pick);
  out.helper = [...document.querySelectorAll("main p")].filter((p) =>
    /no face detection|As many copies|print at 100/i.test(p.textContent)
  ).map(pick);

  // buttons
  out.buttons = [...document.querySelectorAll("main button")].slice(0, 20).map((b) => {
    const p = pick(b);
    p.label = (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 30);
    return p;
  });

  // cards + sections geometry
  out.cards = [...document.querySelectorAll("main [class*='rounded-card']")]
    .filter((el) => el.getBoundingClientRect().width > 100)
    .slice(0, 10)
    .map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { pad: cs.padding, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });

  // left edges of all direct content blocks in main flow
  out.leftEdges = [...document.querySelectorAll("main section > *, main section div[class*='flex'] > *")]
    .slice(0, 12)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, x: Math.round(r.x), w: Math.round(r.width), cls: (el.className || "").toString().slice(0, 60) };
    });

  // touch targets < 44px
  out.smallTargets = [...document.querySelectorAll("main button, main a, main input, main [role='slider']")]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { el, w: r.width, h: r.height, label: (el.getAttribute("aria-label") || el.textContent || el.type || "").trim().slice(0, 24) };
    })
    .filter((t) => t.w > 0 && t.h > 0 && (t.w < 44 || t.h < 44))
    .slice(0, 25)
    .map((t) => ({ label: t.label, w: Math.round(t.w), h: Math.round(t.h) }));

  // horizontal overflow
  const doc = document.documentElement;
  out.overflow = {
    scrollW: doc.scrollWidth,
    clientW: doc.clientWidth,
    overflowPx: doc.scrollWidth - doc.clientWidth,
    offenders: [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1 && el.getBoundingClientRect().width > 20)
      .slice(0, 8)
      .map((el) => ({ tag: el.tagName, cls: (el.className || "").toString().slice(0, 50), right: Math.round(el.getBoundingClientRect().right) })),
  };

  // section vertical rhythm: top-level blocks in the tool section
  const sec = document.querySelector("main section");
  if (sec) {
    out.sections = [...sec.children].map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { tag: el.tagName, cls: (el.className || "").toString().slice(0, 70), y: Math.round(r.y), h: Math.round(r.height), mb: cs.marginBottom };
    });
  }

  // footer typography
  const footer = document.querySelector("footer");
  out.footer = footer
    ? {
        copy: pick(footer.querySelector("p")),
        links: [...footer.querySelectorAll("a, button")].slice(0, 8).map((a) => {
          const p = pick(a);
          p.label = (a.textContent || "").trim().slice(0, 24);
          p.href = a.getAttribute("href");
          return p;
        }),
      }
    : null;

  // collect unique fg/bg pairs for contrast math (samples)
  out.colorSamples = [...document.querySelectorAll("main p, main button, main h1, footer p, footer a")]
    .slice(0, 40)
    .map((el) => {
      const cs = getComputedStyle(el);
      return { c: cs.color, b: cs.backgroundColor, t: (el.textContent || "").trim().slice(0, 18) };
    });

  return out;
})()
