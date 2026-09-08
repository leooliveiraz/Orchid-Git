import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const RAINBOW = ["#ff2d55", "#ff9500", "#ffe600", "#34c759", "#32ade6", "#5856d6", "#af52de"];
const DEG_PER_UNIT = 36;
const GLOW_BLUR_REST = 16;
const GLOW_BLUR_HOVER = 28;
const ARC = 360;
const MAX_STROKE_WIDTH = 30;

const radiusFromPercent = (w, h, pct) =>
  (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

const BAND_MASK = {
  maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
  maskClip: "border-box, content-box",
  maskComposite: "exclude",
  WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
  WebkitMaskClip: "border-box, content-box",
  WebkitMaskComposite: "xor",
};

const EASE = "cubic-bezier(0.44, 0, 0.56, 1)";
const HOVER_TRANSITION = `transform 0.4s ${EASE}, background-color 0.4s ${EASE}`;
const COLOR_TRANSITION = `color 0.4s ${EASE}`;
const FILTER_TRANSITION = `filter 0.4s ${EASE}`;
const OPACITY_TRANSITION = `opacity 0.4s ${EASE}`;

export default function PrismRingButton({
  label = "PRISM BUTTON",
  showText = true,
  padding = "12px 22px",
  rounded = 100,
  colors = {
    fill: "#0D0D0D",
    hoverFill: "#171717",
    textColor: "#FFFFFF",
    hoverTextColor: "#EDE9FF",
  },
  font = {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: "1.5em",
    letterSpacing: "0.01em",
    fontFamily: "inherit",
  },
  gap = 12,
  addIcon = false,
  icon = {
    type: "element",
    element: null,
    symbol: "\u2192",
    color: "#FFFFFF",
    hoverColor: "#EDE9FF",
    side: "left",
    size: 18,
    padding: 0,
  },
  stroke = { colors: RAINBOW, strokeWidth: 1.5 },
  speed: speedPct = 50,
  hoverScale = 103,
  onClick,
  style,
}) {
  const speed = 10 * (Math.max(0, Math.min(100, Math.round(speedPct))) / 50);

  const fill = colors?.fill ?? "#0D0D0D";
  const textColor = colors?.textColor ?? "#FFFFFF";
  const hoverFill = colors?.hoverFill ?? "#171717";
  const hoverTextColor = colors?.hoverTextColor ?? "#EDE9FF";

  const strokeColors = stroke?.colors ?? RAINBOW;
  const strokeWidth = Math.max(0, Math.min(MAX_STROKE_WIDTH, stroke?.strokeWidth ?? 1.5));

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const lit = hovered || focused;

  const pillRef = useRef(null);
  const restRef = useRef(null);
  const fullRef = useRef(null);
  const glowSpinRef = useRef(null);

  const [side, setSide] = useState(0);
  const [radiusPx, setRadiusPx] = useState(0);

  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) {
        setSide(Math.ceil(Math.hypot(w, h) * 1.02));
        setRadiusPx(radiusFromPercent(w, h, rounded));
      }
    };
    measure();
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => ro && ro.disconnect();
  }, [rounded]);

  const speedRef = useRef(0);
  useEffect(() => {
    speedRef.current = Math.max(0, speed) * DEG_PER_UNIT;
  }, [speed]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let angle = 0;
    const tick = (t) => {
      if (!last) last = t;
      angle = (angle + (speedRef.current * (t - last)) / 1000) % 360;
      last = t;
      const tr = `rotate(${angle}deg)`;
      if (restRef.current) restRef.current.style.transform = tr;
      if (fullRef.current) fullRef.current.style.transform = tr;
      if (glowSpinRef.current) glowSpinRef.current.style.transform = tr;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hoverScaleRef = Math.max(50, Math.min(150, hoverScale)) / 100;

  const stops = strokeColors && strokeColors.length ? strokeColors : RAINBOW;
  const n = stops.length;
  const fullConic = `conic-gradient(from 0deg, ${[...stops, stops[0]].join(", ")})`;
  const restStops =
    n === 1
      ? `${stops[0]} 0deg, ${stops[0]} ${ARC}deg`
      : stops.map((c, i) => `${c} ${((ARC * i) / (n - 1)).toFixed(2)}deg`).join(", ");
  const restConic = `conic-gradient(from 0deg, ${restStops})`;

  const spin = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: side,
    height: side,
    marginTop: -side / 2,
    marginLeft: -side / 2,
  };

  const glowBlur = lit ? GLOW_BLUR_HOVER : GLOW_BLUR_REST;

  const {
    type: iconType = "element",
    element: iconElement = null,
    symbol: iconSymbol = "\u2192",
    color: iconColor = "#FFFFFF",
    hoverColor: iconHoverColor = "#EDE9FF",
    side: iconSide = "left",
    size: iconSize = 18,
    padding: iconPadding = 0,
  } = icon;
  const hasIcon = !!addIcon;

  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <button
        ref={pillRef}
        type="button"
        onClick={onClick}
        onFocus={(e) => {
          let visible = true;
          try {
            visible = e.currentTarget.matches(":focus-visible");
          } catch {
            // :focus-visible unsupported — treat it as a real focus
          }
          if (visible) setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        style={{
          position: "relative",
          zIndex: 1,
          boxSizing: "border-box",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: showText ? gap : 0,
          flexDirection: hasIcon && iconSide === "right" ? "row-reverse" : "row",
          minWidth: 80,
          minHeight: 40,
          padding,
          borderRadius: radiusPx,
          border: "none",
          backgroundColor: lit ? hoverFill : fill,
          cursor: "pointer",
          textDecoration: "none",
          WebkitTapHighlightColor: "transparent",
          transform: `scale(${lit ? hoverScaleRef : 1})`,
          transformOrigin: "center center",
          transition: HOVER_TRANSITION,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            filter: `blur(${glowBlur}px)`,
            transition: FILTER_TRANSITION,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxSizing: "border-box",
              padding: strokeWidth,
              borderRadius: radiusPx,
              ...BAND_MASK,
            }}
          >
            <div ref={glowSpinRef} style={{ ...spin, background: fullConic }} />
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            boxSizing: "border-box",
            padding: strokeWidth,
            borderRadius: radiusPx,
            zIndex: 1,
            pointerEvents: "none",
            ...BAND_MASK,
          }}
        >
          <div
            ref={restRef}
            style={{
              ...spin,
              background: restConic,
              opacity: lit ? 0 : 1,
              transition: OPACITY_TRANSITION,
            }}
          />
          <div
            ref={fullRef}
            style={{
              ...spin,
              background: fullConic,
              opacity: lit ? 1 : 0,
              transition: OPACITY_TRANSITION,
            }}
          />
        </div>

        {hasIcon && (
          <span
            aria-hidden
            style={{
              position: "relative",
              zIndex: 2,
              fontSize: iconSize,
              lineHeight: 1,
              margin: iconPadding,
              color: lit ? iconHoverColor : iconColor,
              flex: "none",
              pointerEvents: "none",
              display: "inline-flex",
              alignItems: "center",
              transition: COLOR_TRANSITION,
            }}
          >
            {iconType === "element" && iconElement ? iconElement : iconSymbol}
          </span>
        )}

        {showText && (
          <span
            style={{
              position: "relative",
              zIndex: 2,
              color: lit ? hoverTextColor : textColor,
              whiteSpace: "nowrap",
              transition: COLOR_TRANSITION,
              ...font,
            }}
          >
            {label}
          </span>
        )}
      </button>
    </div>
  );
}
