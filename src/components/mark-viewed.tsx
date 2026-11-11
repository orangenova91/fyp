"use client";

import { useEffect } from "react";

/** Records the view after the page is actually shown, so link prefetches don't count. */
export function MarkViewed({ action }: { action: () => Promise<void> }) {
  useEffect(() => {
    void action();
  }, [action]);
  return null;
}
