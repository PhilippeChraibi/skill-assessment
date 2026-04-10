"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AutoSaveOptions {
  sessionId: string;
  questionId: string;
  intervalMs?: number;
}

export function useAutoSave({ sessionId, questionId, intervalMs = 30_000 }: AutoSaveOptions) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const currentDataRef = useRef<{
    rawAnswer?: string;
    selectedOptions?: number[];
    keystrokeCadenceData?: number[];
  }>({});

  const save = useCallback(async () => {
    const data = currentDataRef.current;
    if (!data.rawAnswer && !data.selectedOptions?.length) return;

    setSaving(true);
    try {
      await fetch(`/api/assessment/sessions/${sessionId}/auto-save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          ...data,
        }),
      });
      setLastSaved(new Date());
    } catch {
      // Silent fail for auto-save
    } finally {
      setSaving(false);
    }
  }, [sessionId, questionId]);

  // Update data ref without triggering saves
  const updateData = useCallback(
    (data: { rawAnswer?: string; selectedOptions?: number[]; keystrokeCadenceData?: number[] }) => {
      currentDataRef.current = data;
    },
    [],
  );

  // Auto-save interval
  useEffect(() => {
    const interval = setInterval(save, intervalMs);
    return () => clearInterval(interval);
  }, [save, intervalMs]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const data = currentDataRef.current;
      if (data.rawAnswer || data.selectedOptions?.length) {
        navigator.sendBeacon(
          `/api/assessment/sessions/${sessionId}/auto-save`,
          JSON.stringify({ questionId, ...data }),
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionId, questionId]);

  return { lastSaved, saving, updateData, saveNow: save };
}
