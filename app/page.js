"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AppSidebar from "./components/appsidebar";
import { SidebarProvider } from "./components/ui/SidebarContext";
import localFont from 'next/font/local'
const myFont = localFont({ src: '../fonts/Nunito-VariableFont_wght.ttf' })

const ChatApp = dynamic(() => import("./components/chatapp"), {
  ssr: false,
});

export default function Page() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);

  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem("storedConversations");
      if (savedConversations) {
        setConversations(JSON.parse(savedConversations));
      }
    } catch (e) {
      console.error("Error loading conversations:", e);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(
        "storedConversations",
        JSON.stringify(conversations)
      );
    }
  }, [conversations]);

  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
  };

  const handleNewChat = () => {
    setCurrentConversation(null);

    localStorage.removeItem("chatMessages");

    window.location.reload();
  };

  return (
    <SidebarProvider defaultCollapsed={false}>
      <div className={myFont.className}>
      <main className="bg-zinc-900 h-screen overflow-hidden">
        <AppSidebar
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />

        <div className="transition-all duration-300 min-h-screen lg:pl-16  ">
          <ChatApp
            key={currentConversation ? currentConversation.id : "new"}
            initialConversation={currentConversation}
            onConversationSaved={(convo) => {
              if (!conversations.find((c) => c.id === convo.id)) {
                setConversations((prev) => [...prev, convo]);
              }
            }}
          />
        </div>
      </main>
      </div>
    </SidebarProvider>
  );
}
