"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CompletionContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="space-y-6">
          {/* Animated checkmark */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Assessment Complete
            </h1>
            <p className="mt-3 text-gray-600">
              Thank you for completing the assessment. Your responses have been
              recorded and are being analyzed.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium">Your report is being prepared</p>
            <p className="mt-1 text-blue-600">
              You will receive an email with your detailed results shortly.
            </p>
          </div>

          {sessionId && (
            <>
              <a
                href={`/reports/${sessionId}`}
                className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                           hover:bg-blue-700 transition-colors"
              >
                View My Report
              </a>
              <p className="text-xs text-gray-400">
                Session reference: {sessionId.slice(-8)}
              </p>
            </>
          )}

          <a
            href="/"
            className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium
                       hover:bg-gray-200 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <CompletionContent />
    </Suspense>
  );
}
