type FireConfettiOptions = {
  originX?: number;
  originY?: number;
  count?: number;
};

export function fireConfetti(opts: FireConfettiOptions = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const count = Math.max(10, Math.min(60, opts.count ?? 28));
  const originX = opts.originX ?? window.innerWidth / 2;
  const originY = opts.originY ?? Math.min(window.innerHeight * 0.55, window.innerHeight - 160);

  const colors = [
    "hsl(24 95% 53%)",
    "hsl(199 89% 48%)",
    "hsl(38 92% 50%)",
    "hsl(142 76% 36%)",
    "hsl(0 0% 100%)",
  ];

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";

    const c = colors[i % colors.length];
    el.style.background = c;

    const cx = originX + (Math.random() * 18 - 9);
    const cy = originY + (Math.random() * 18 - 9);

    const dx = (Math.random() - 0.5) * 220;
    const dy = 120 + Math.random() * 220;
    const dr = (Math.random() * 720 - 360).toFixed(0) + "deg";

    el.style.left = "0px";
    el.style.top = "0px";
    el.style.setProperty("--cx", `${cx}px`);
    el.style.setProperty("--cy", `${cy}px`);
    el.style.setProperty("--dx", `${dx}px`);
    el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--dr", dr);

    const size = 6 + Math.random() * 8;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = `${2 + Math.random() * 4}px`;
    el.style.opacity = "0.98";

    document.body.appendChild(el);

    window.setTimeout(() => {
      try {
        el.remove();
      } catch {
        // ignore
      }
    }, 950);
  }
}
