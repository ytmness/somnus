"use client";

import { useEffect, useRef } from "react";

const DEFAULT_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: "0px 0px -80px 0px",
  threshold: 0.1,
};

export function useScrollReveal<T extends HTMLElement>(
  options: Partial<IntersectionObserverInit> = {}
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { ...DEFAULT_OPTIONS, ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.root, options.rootMargin, options.threshold]);

  return ref;
}
