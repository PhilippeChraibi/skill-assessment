"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoStarted = useRef(false);

  const token = params.token as string;

  const startSession = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assessment/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create session. Please contact your administrator.");
        setLoading(false);
        return;
      }

      router.push(`/assessment/${data.sessionId}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=/invite/${token}`);
      return;
    }
    startSession();
  };

  // Auto-start when user lands back on this page after signing in
  useEffect(() => {
    if (status === "authenticated" && session?.user && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  if (status === "loading" || (status === "authenticated" && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Setting up your assessment…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skills Assessment</h1>
            <p className="mt-2 text-gray-600">
              You have been invited to complete a professional skills assessment.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 text-left space-y-2">
            <p className="font-medium text-gray-900">Before you begin:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Find a quiet place with a stable internet connection</li>
              <li>The assessment will take approximately 30–45 minutes</li>
              <li>You cannot go back to previous questions once submitted</li>
              <li>Your progress is auto-saved every 30 seconds</li>
              <li>You will receive your report by email upon completion</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm text-left">
              <p className="font-medium mb-1">Unable to start assessment</p>
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Setting up…" : session?.user ? "Try Again" : "Sign in to Begin"}
          </button>

          {!session?.user && (
            <p className="text-xs text-gray-400">
              You&apos;ll receive a one-time code to verify your email address.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
