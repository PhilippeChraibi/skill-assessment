"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const [clicked, setClicked] = useState(false);

  const handleSignIn = () => {
    if (!url) return;
    setClicked(true);
    // Navigate via JavaScript only — not via an href — so email scanners
    // (Microsoft Safe Links, etc.) cannot pre-consume the magic link token.
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">Complete Your Sign In</h2>
          <p className="text-gray-500 text-sm mt-2">
            Click the button below to securely sign in to the Skill Assessment Platform.
          </p>
        </div>

        {url ? (
          <button
            onClick={handleSignIn}
            disabled={clicked}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
          >
            {clicked ? "Signing in…" : "Complete Sign In"}
          </button>
        ) : (
          <p className="text-red-500 text-sm">Invalid or missing sign-in link.</p>
        )}

        <p className="text-gray-400 text-xs">
          This link can only be used once and expires in 24 hours.
          If you did not request this, you can safely close this page.
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
