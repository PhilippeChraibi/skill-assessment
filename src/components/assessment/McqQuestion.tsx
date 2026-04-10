"use client";

import { useState } from "react";

interface McqQuestionProps {
  content: {
    stem: string;
    options: string[];
  };
  onConfirm: (selectedOptions: number[]) => void;
  disabled?: boolean;
}

export function McqQuestion({ content, onConfirm, disabled }: McqQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (index: number) => {
    if (confirmed || disabled) return;
    setSelected(index);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setConfirmed(true);
    onConfirm([selected]);
  };

  return (
    <div className="space-y-4">
      <div
        className="text-lg font-medium text-gray-900 select-none"
        data-question-stem
      >
        {content.stem}
      </div>

      <div className="space-y-3 mt-6">
        {content.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={confirmed || disabled}
            className={`
              w-full text-left p-4 rounded-lg border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${
                selected === index
                  ? confirmed
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }
              ${confirmed || disabled ? "cursor-default" : "cursor-pointer"}
            `}
            aria-pressed={selected === index}
            role="radio"
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-5 h-5 rounded-full border-2 flex-shrink-0
                  flex items-center justify-center
                  ${selected === index ? "border-blue-600" : "border-gray-300"}
                `}
              >
                {selected === index && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                )}
              </div>
              <span className="text-base">{option}</span>
            </div>
          </button>
        ))}
      </div>

      {selected !== null && !confirmed && (
        <div className="flex justify-end mt-6">
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:ring-offset-2 transition-colors"
          >
            Confirm Answer
          </button>
        </div>
      )}
    </div>
  );
}
