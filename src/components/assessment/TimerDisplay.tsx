"use client";

interface TimerDisplayProps {
  remainingSeconds: number;
  show: boolean;
}

export function TimerDisplay({ remainingSeconds, show }: TimerDisplayProps) {
  if (!show) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isUrgent = remainingSeconds <= 30;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 px-4 py-2 rounded-lg font-mono text-lg font-bold
        shadow-lg transition-all animate-pulse
        ${isUrgent ? "bg-red-600 text-white" : "bg-amber-500 text-white"}
      `}
      role="timer"
      aria-live="assertive"
      aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
    >
      {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}
