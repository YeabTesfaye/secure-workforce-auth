"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = saved ? saved === "dark" : true;
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  return <>{children}</>;
}
