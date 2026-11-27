"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { CARD_SIZES, type CardFormat } from "./shared";

/**
 * Renders a full-resolution card (1080px wide) scaled down to fit its
 * container. The inner node stays at native size, so exports are pixel-exact.
 */
export function ScaledCard({
  format,
  children,
  cardRef,
  className,
  label,
}: {
  format: CardFormat;
  children: ReactNode;
  cardRef?: Ref<HTMLDivElement>;
  className?: string;
  label?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const { width, height } = CARD_SIZES[format];

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div
      ref={frame}
      className={className}
      role="img"
      aria-label={label}
      style={{ position: "relative", width: "100%", aspectRatio: `${width} / ${height}`, overflow: "hidden" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <div ref={cardRef}>{children}</div>
      </div>
    </div>
  );
}
