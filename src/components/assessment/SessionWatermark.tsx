"use client";

interface SessionWatermarkProps {
  sessionId: string;
}

export function SessionWatermark({ sessionId }: SessionWatermarkProps) {
  // Show truncated session ID in corner for screenshot traceability
  const shortId = sessionId.slice(-8);

  return (
    <div
      className="fixed bottom-2 left-2 text-[10px] text-gray-300 font-mono select-none pointer-events-none z-40"
      aria-hidden="true"
    >
      SID:{shortId}
    </div>
  );
}
