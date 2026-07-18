"use client";

import { useEffect } from "react";
import { retryPendingResults } from "@/lib/resultSync";

export default function SWRegister() {
  useEffect(() => {
    const retry = () => {
      void retryPendingResults();
    };

    retry();
    window.addEventListener("online", retry);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("Service worker registration failed.", error);
      });
    }

    return () => window.removeEventListener("online", retry);
  }, []);

  return null;
}
