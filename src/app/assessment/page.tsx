"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Session {
  id: string;
  status: string;
  createdAt: string;
  jobProfile: { displayName: { en: string } };
}

export default function AssessmentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/sessions/my")
      .then((r) => r.json())
      .then((data) => { setSessions(data.sessions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  if (status === "loading" || !session) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading…</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Skill Assessment</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome, {session.user?.name ?? session.user?.email}</h2>
          <p className="text-gray-500 mt-1">Your assessments are listed below.</p>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading your assessments…</p>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No assessments assigned yet.</p>
            <p className="text-gray-400 text-sm mt-1">Your administrator will send you an invitation when one is ready.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.jobProfile?.displayName?.en ?? "Assessment"}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Status: <span className={s.status === "COMPLETED" ? "text-green-600" : "text-blue-600"}>{s.status}</span>
                  </p>
                </div>
                {s.status === "COMPLETED" ? (
                  <Link href={`/reports/${s.id}`} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    View Report
                  </Link>
                ) : (
                  <Link href={`/assessment/${s.id}`} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {s.status === "IN_PROGRESS" ? "Continue" : "Start"}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
