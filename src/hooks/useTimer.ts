"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTimerOptions {
  timeLimitSeconds?: number;
  onExpiry?: () => void;
}

export function useTimer({ timeLimitSeconds, onExpiry }: UseTimerOptions) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitSeconds ?? Infinity);
  const startTimeRef = useRef(Date.now());
  const expiryCalledRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setRemainingSeconds(timeLimitSeconds ?? Infinity);
    expiryCalledRef.current = false;
  }, [timeLimitSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      if (timeLimitSeconds) {
        const remaining = Math.max(0, timeLimitSeconds - elapsed);
        setRemainingSeconds(remaining);

        if (remaining === 0 && !expiryCalledRef.current) {
          expiryCalledRef.current = true;
          onExpiry?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimitSeconds, onExpiry]);

  const reset = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setRemainingSeconds(timeLimitSeconds ?? Infinity);
    expiryCalledRef.current = false;
  }, [timeLimitSeconds]);

  return {
    elapsedSeconds,
    remainingSeconds,
    showTimer: timeLimitSeconds !== undefined && remainingSeconds <= 60,
    isExpired: timeLimitSeconds !== undefined && remainingSeconds === 0,
    reset,
  };
}
