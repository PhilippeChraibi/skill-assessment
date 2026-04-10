"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AntiCheatData {
  keystrokeCadence: number[];
  pastedCharCount: number;
  focusLossCount: number;
  focusLossDuration: number; // total seconds out of focus
}

export function useAntiCheat() {
  const [data, setData] = useState<AntiCheatData>({
    keystrokeCadence: [],
    pastedCharCount: 0,
    focusLossCount: 0,
    focusLossDuration: 0,
  });

  const lastKeystrokeTime = useRef<number | null>(null);
  const focusLostAt = useRef<number | null>(null);

  // ── Focus / blur tracking ──
  useEffect(() => {
    const handleBlur = () => {
      focusLostAt.current = Date.now();
      setData((prev) => ({
        ...prev,
        focusLossCount: prev.focusLossCount + 1,
      }));
    };

    const handleFocus = () => {
      if (focusLostAt.current) {
        const duration = Math.round((Date.now() - focusLostAt.current) / 1000);
        focusLostAt.current = null;
        setData((prev) => ({
          ...prev,
          focusLossDuration: prev.focusLossDuration + duration,
        }));
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // ── Disable right-click + text selection on question stems ──
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-question-stem]")) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // ── Keystroke tracking ──
  const handleKeyDown = useCallback(() => {
    const now = Date.now();
    if (lastKeystrokeTime.current !== null) {
      const interval = now - lastKeystrokeTime.current;
      setData((prev) => ({
        ...prev,
        keystrokeCadence: [...prev.keystrokeCadence, interval],
      }));
    }
    lastKeystrokeTime.current = now;
  }, []);

  // ── Paste tracking ──
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    setData((prev) => ({
      ...prev,
      pastedCharCount: prev.pastedCharCount + pastedText.length,
    }));
  }, []);

  // ── Reset for new question ──
  const reset = useCallback(() => {
    setData({
      keystrokeCadence: [],
      pastedCharCount: 0,
      focusLossCount: 0,
      focusLossDuration: 0,
    });
    lastKeystrokeTime.current = null;
    focusLostAt.current = null;
  }, []);

  return {
    data,
    handleKeyDown,
    handlePaste,
    reset,
  };
}
