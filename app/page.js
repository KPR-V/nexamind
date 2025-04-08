"use client";
import dynamic from "next/dynamic";
const ChatApp = dynamic(() => import("./components/chatapp"), {
  ssr: false,
});
export default function page() {
  return (
    <main className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <ChatApp />
    </main>
  );
}
