"use client";

import { useEffect } from "react";

/**
 * Client navigations keep the previous scroll offset when the new page is
 * already "in view", which can tuck the top of the result under the sticky nav.
 */
export function ScrollToTop() {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0 });
  }, []);
  return null;
}
