"use client";

import { useEffect, useState } from "react";

interface SaveIndicatorProps {
  lastSaved: Date | null;
  saving: boolean;
}

export function SaveIndicator({ lastSaved, saving }: SaveIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastSaved) {
      setVisible(true);
      const timeout = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [lastSaved]);

  if (saving) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-gray-200 px-3 py-1.5 rounded-md text-sm
                      shadow-md transition-opacity">
        Saving...
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-800 text-green-100 px-3 py-1.5 rounded-md text-sm
                    shadow-md transition-opacity animate-fade-in">
      Saved
    </div>
  );
}
