"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function CompletionContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="space-y-6">

          {/* Checkmark */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assessment Complete</h1>
            <p className="mt-2 text-gray-500 text-sm">
              Thank you — your responses have been recorded and fully scored.
            </p>
          </div>

          {/* Report status */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-left space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-semibold text-blue-900">Your personalised report is being generated</p>
            </div>
            <ul className="text-sm text-blue-700 space-y-1.5 pl-7 list-disc">
              <li>Detailed score breakdown by competency area</li>
              <li>Theory vs. practice performance analysis</li>
              <li>Personalised development recommendations</li>
            </ul>
            <p className="text-sm text-blue-600 pt-1">
              You will receive an email with a link to your full report once it is ready.
            </p>
          </div>

          {/* CTA */}
          {sessionId && (
            <Link
              href={`/reports/${sessionId}`}
              className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              View My Report
            </Link>
          )}

          <Link
            href="/assessment"
            className="inline-block text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Return to dashboard
          </Link>

          {sessionId && (
            <p className="text-xs text-gray-300">Ref: {sessionId.slice(-8).toUpperCase()}</p>
          )}
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
