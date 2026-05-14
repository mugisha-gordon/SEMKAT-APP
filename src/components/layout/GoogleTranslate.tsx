import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    google?: any;
    semkatInitGoogleTranslate?: () => void;
  }
}

const STORAGE_KEY = "semkat_translate_lang";
const POS_KEY = "semkat_translate_widget_pos";
const DEFAULT_LANG = "en";
const LONG_PRESS_MS = 520;
const MOVE_CANCEL_PX = 12;

const languages = [
  { value: "en", label: "English" },
  { value: "sw", label: "Swahili" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "zh-CN", label: "Chinese" },
];

type Pos = { left: number; top: number };

function setGoogleTranslateCookie(lang: string) {
  const next = `/auto/${lang}`;
  document.cookie = `googtrans=${next}; path=/; SameSite=Lax`;
  document.cookie = `googtrans=${next}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
}

function clampPos(left: number, top: number, el: HTMLElement | null, pad = 8): Pos {
  if (!el) return { left, top };
  const w = el.offsetWidth || 160;
  const h = el.offsetHeight || 44;
  const maxL = window.innerWidth - w - pad;
  const maxT = window.innerHeight - h - pad;
  return {
    left: Math.max(pad, Math.min(left, maxL)),
    top: Math.max(pad, Math.min(top, maxT)),
  };
}

function loadSavedPos(): Pos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left?: number; top?: number };
    if (typeof p.left !== "number" || typeof p.top !== "number") return null;
    if (!Number.isFinite(p.left) || !Number.isFinite(p.top)) return null;
    return { left: p.left, top: p.top };
  } catch {
    return null;
  }
}

const GoogleTranslate = () => {
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const lastRef = useRef({ x: 0, y: 0 });
  const grabRef = useRef({ x: 0, y: 0 });
  const dragActiveRef = useRef(false);
  const movedTooFarRef = useRef(false);

  const [selectedLang, setSelectedLang] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  const [widgetPos, setWidgetPos] = useState<Pos | null>(() => loadSavedPos());
  const [isDragging, setIsDragging] = useState(false);

  const applyLanguageToGoogleCombo = (lang: string, retries = 8) => {
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event("change"));
      return;
    }
    if (retries <= 0) return;
    window.setTimeout(() => applyLanguageToGoogleCombo(lang, retries - 1), 300);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const finishDrag = () => {
    clearLongPressTimer();
    if (!dragActiveRef.current) {
      pointerIdRef.current = null;
      return;
    }
    dragActiveRef.current = false;
    setIsDragging(false);

    const el = panelRef.current;
    const pid = pointerIdRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const next = clampPos(r.left, r.top, el);
      setWidgetPos(next);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (pid != null) {
        try {
          el.releasePointerCapture(pid);
        } catch {
          // ignore
        }
      }
    }
    pointerIdRef.current = null;
  };

  useEffect(() => {
    setGoogleTranslateCookie(selectedLang);

    window.semkatInitGoogleTranslate = () => {
      if (!window.google?.translate?.TranslateElement) return;
      const host = document.getElementById("google_translate_element");
      if (host) host.innerHTML = "";
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: languages.map((l) => l.value).join(","),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element"
      );
      applyLanguageToGoogleCombo(selectedLang);
    };

    if (window.google?.translate?.TranslateElement) {
      window.semkatInitGoogleTranslate();
      return;
    }

    if (document.getElementById("google-translate-script")) return;

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=semkatInitGoogleTranslate";
    script.async = true;
    document.body.appendChild(script);
  }, [selectedLang]);

  useEffect(() => {
    setGoogleTranslateCookie(selectedLang);
    applyLanguageToGoogleCombo(selectedLang);
  }, [location.pathname, location.search, selectedLang]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setGoogleTranslateCookie(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }

    applyLanguageToGoogleCombo(lang);
  };

  const onDragHandlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startRef.current = { x: e.clientX, y: e.clientY };
    lastRef.current = { x: e.clientX, y: e.clientY };
    movedTooFarRef.current = false;
    pointerIdRef.current = e.pointerId;
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      if (movedTooFarRef.current) return;

      const el = panelRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      grabRef.current = {
        x: lastRef.current.x - r.left,
        y: lastRef.current.y - r.top,
      };

      dragActiveRef.current = true;
      setIsDragging(true);
      try {
        navigator.vibrate?.(18);
      } catch {
        // ignore
      }

      const next = clampPos(r.left, r.top, el);
      setWidgetPos(next);

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }, LONG_PRESS_MS);
  };

  const onPanelPointerMove = (e: React.PointerEvent) => {
    lastRef.current = { x: e.clientX, y: e.clientY };

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!dragActiveRef.current && dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      movedTooFarRef.current = true;
      clearLongPressTimer();
    }

    if (!dragActiveRef.current) return;

    e.preventDefault();
    const el = panelRef.current;
    const left = e.clientX - grabRef.current.x;
    const top = e.clientY - grabRef.current.y;
    setWidgetPos(clampPos(left, top, el));
  };

  const onPanelPointerUp = () => {
    if (dragActiveRef.current) {
      finishDrag();
    } else {
      clearLongPressTimer();
      pointerIdRef.current = null;
    }
  };

  useEffect(() => {
    const onResize = () => {
      setWidgetPos((prev) => {
        if (!prev) return prev;
        return clampPos(prev.left, prev.top, panelRef.current);
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const defaultPlacement = !widgetPos;

  return (
    <div
      ref={panelRef}
      className={defaultPlacement ? "fixed top-28 right-2 z-[120] sm:right-4 lg:top-20" : "fixed z-[120]"}
      style={
        widgetPos
          ? {
              left: widgetPos.left,
              top: widgetPos.top,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
      onPointerMove={onPanelPointerMove}
      onPointerUp={onPanelPointerUp}
      onPointerCancel={onPanelPointerUp}
    >
      <div
        className={`glass-strong glass-border rounded-xl px-2 py-1.5 shadow-md flex items-center gap-2 select-none ${
          isDragging ? "touch-none ring-2 ring-semkat-orange/70" : ""
        }`}
      >
        <span
          role="button"
          tabIndex={0}
          title="Long-press, then drag to move"
          aria-label="Move translator — long press then drag"
          className="inline-flex shrink-0 cursor-grab touch-none rounded-md p-0.5 text-muted-foreground hover:bg-muted/50 active:cursor-grabbing"
          onPointerDown={onDragHandlePointerDown}
          onContextMenu={(ev) => ev.preventDefault()}
        >
          <Languages className="h-4 w-4 pointer-events-none" />
        </span>
        <select
          aria-label="Select language"
          value={selectedLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-foreground outline-none"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value} className="text-foreground bg-background">
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <div id="google_translate_element" className="sr-only" />
    </div>
  );
};

export default GoogleTranslate;
