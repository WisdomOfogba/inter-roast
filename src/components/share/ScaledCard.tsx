"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Shows a native-size card scaled to its container width. */
export function ScaledCard({ width, height, children, label }: { width: number; height: number; children: ReactNode; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
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
    <div ref={frame} role="img" aria-label={label} className="relative w-full overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
      <div aria-hidden className="absolute left-0 top-0" style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", visibility: scale ? "visible" : "hidden" }}>
        {children}
      </div>
    </div>
  );
}
