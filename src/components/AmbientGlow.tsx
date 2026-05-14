import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_GLOW: Array<{ test: (path: string) => boolean; a: string; b: string }> = [
  { test: (p) => p.startsWith("/properties"), a: "24 95% 53%", b: "199 89% 48%" },
  { test: (p) => p.startsWith("/agents"), a: "199 89% 48%", b: "38 92% 50%" },
  { test: (p) => p.startsWith("/explore"), a: "199 89% 48%", b: "24 95% 53%" },
  { test: (p) => p.startsWith("/services"), a: "38 92% 50%", b: "199 89% 48%" },
  { test: (p) => p.startsWith("/messages"), a: "199 89% 48%", b: "24 95% 53%" },
  { test: (p) => p.startsWith("/notifications"), a: "24 95% 53%", b: "38 92% 50%" },
  { test: (p) => p.startsWith("/auth"), a: "24 95% 53%", b: "199 89% 48%" },
];

const AmbientGlow = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const match = ROUTE_GLOW.find((r) => r.test(path));

    const root = document.documentElement;
    if (match) {
      root.style.setProperty("--ambient-a", match.a);
      root.style.setProperty("--ambient-b", match.b);
    } else {
      root.style.removeProperty("--ambient-a");
      root.style.removeProperty("--ambient-b");
    }

    return () => {
      root.style.removeProperty("--ambient-a");
      root.style.removeProperty("--ambient-b");
    };
  }, [location.pathname]);

  return <div className="ambient-bg" aria-hidden="true" />;
};

export default AmbientGlow;
