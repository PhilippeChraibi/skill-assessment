"use client";

import { useState, useCallback } from "react";

interface OpenTextQuestionProps {
  content: {
    stem: string;
    guidanceWordCount?: { min: number; max: number };
  };
  onConfirm: (rawAnswer: string) => void;
  onKeyDown: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onTextChange?: (text: string) => void;
  disabled?: boolean;
}

export function OpenTextQuestion({
  content,
  onConfirm,
  onKeyDown,
  onPaste,
  onTextChange,
  disabled,
}: OpenTextQuestionProps) {
  const [text, setText] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const guidance = content.guidanceWordCount;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      onTextChange?.(e.target.value);
    },
    [onTextChange],
  );

  const handleConfirm = () => {
    if (text.trim().length === 0) return;
    setConfirmed(true);
    onConfirm(text);
  };

  return (
    <div className="space-y-4">
      <div
        className="text-lg font-medium text-gray-900 select-none"
        data-question-stem
      >
        {content.stem}
      </div>

      {guidance && (
        <p className="text-sm text-gray-500">
          We expect {guidance.min}–{guidance.max} words.
        </p>
      )}

      <div className="relative">
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={confirmed || disabled}
          rows={10}
          className={`
            w-full p-4 border-2 rounded-lg resize-y text-base
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${confirmed || disabled ? "bg-gray-50 border-gray-200" : "border-gray-300"}
          `}
          placeholder="Type your answer here..."
          aria-label="Your answer"
        />

        <div className="flex justify-between items-center mt-2 text-sm">
          <span
            className={`
              ${
                guidance
                  ? wordCount < guidance.min
                    ? "text-amber-600"
                    : wordCount > guidance.max
                      ? "text-amber-600"
                      : "text-green-600"
                  : "text-gray-500"
              }
            `}
          >
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
      </div>

      {!confirmed && !disabled && text.trim().length > 0 && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:ring-offset-2 transition-colors"
          >
            Submit Answer
          </button>
        </div>
      )}
    </div>
  );
}
