"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AgentProvider } from "../../contexts/AgentContext";
import { UserDataProvider } from "../../contexts/UserDataContext";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AgentsLayout({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    document.title = "NexaMind - AI Agents";
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3 bg-zinc-900">
        <Link
          href="/"
          className="inline-flex items-center text-zinc-400 hover:text-zinc-200 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:translate-x-[-2px] transition-transform" />
          Back to Home
        </Link>
      </div>
      <div className="flex flex-1">
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <UserDataProvider>
            <AgentProvider>{children}</AgentProvider>
          </UserDataProvider>
        </main>
      </div>
    </div>
  );
}
