"use client";

import { useState, useCallback } from "react";

interface RankedChoiceQuestionProps {
  content: {
    stem: string;
    options: string[];
  };
  onConfirm: (selectedOptions: number[]) => void;
  disabled?: boolean;
}

export function RankedChoiceQuestion({ content, onConfirm, disabled }: RankedChoiceQuestionProps) {
  const [order, setOrder] = useState<number[]>(content.options.map((_, i) => i));
  const [confirmed, setConfirmed] = useState(false);

  const moveUp = useCallback(
    (index: number) => {
      if (index === 0 || confirmed || disabled) return;
      setOrder((prev) => {
        const next = [...prev];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        return next;
      });
    },
    [confirmed, disabled],
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index === order.length - 1 || confirmed || disabled) return;
      setOrder((prev) => {
        const next = [...prev];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        return next;
      });
    },
    [confirmed, disabled, order.length],
  );

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm(order);
  };

  return (
    <div className="space-y-4">
      <div
        className="text-lg font-medium text-gray-900 select-none"
        data-question-stem
      >
        {content.stem}
      </div>

      <p className="text-sm text-gray-500">
        Drag or use arrows to rank items from most important (top) to least important (bottom).
      </p>

      <div className="space-y-2 mt-4">
        {order.map((optionIndex, position) => (
          <div
            key={optionIndex}
            className={`
              flex items-center gap-3 p-4 rounded-lg border-2
              ${confirmed ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"}
            `}
          >
            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center
                           text-sm font-semibold text-gray-600 flex-shrink-0">
              {position + 1}
            </span>

            <span className="flex-grow text-base">{content.options[optionIndex]}</span>

            {!confirmed && !disabled && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(position)}
                  disabled={position === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Move ${content.options[optionIndex]} up`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(position)}
                  disabled={position === order.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Move ${content.options[optionIndex]} down`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!confirmed && !disabled && (
        <div className="flex justify-end mt-6">
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:ring-offset-2 transition-colors"
          >
            Confirm Ranking
          </button>
        </div>
      )}
    </div>
  );
}
