"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeft,
  Plus,
  ExternalLink,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { useDisconnect } from "wagmi";
import { useSidebar } from "./ui/SidebarContext";

export default function AppSidebar({
  conversations = [],
  onSelectConversation,
  onNewChat,
}) {
  const { collapsed, mobileOpen, isMobile, toggleSidebar, setMobileOpen } =
    useSidebar();
  const { disconnect } = useDisconnect();

  const sidebarWidth = collapsed && !isMobile ? "w-16" : "w-72";

  const showLabels = !collapsed || isMobile;

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg lg:hidden"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <ChevronLeft size={20} /> : <PanelLeft size={20} />}
      </button>

      <AnimatePresence>
        {mobileOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(mobileOpen || !isMobile) && (
          <motion.div
            initial={{ x: isMobile ? -288 : 0 }}
            animate={{ x: 0 }}
            exit={{ x: isMobile ? -288 : collapsed ? -64 : -288 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed left-0 top-0 h-screen ${sidebarWidth} bg-zinc-900 text-white border-r border-zinc-800 shadow-xl z-40 flex flex-col transition-all duration-300`}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              {showLabels ? (
                <span className="font-semibold text-white">NexaMind</span>
              ) : (
                <span></span>
              )}

              {!isMobile ? (
                <button
                  onClick={toggleSidebar}
                  className="rounded-full bg-zinc-800 hover:bg-zinc-700 p-2 text-zinc-300 hover:text-white"
                  title="Toggle Sidebar"
                >
                  <PanelLeft
                    size={16}
                    className={collapsed ? "rotate-180" : ""}
                  />
                </button>
              ) : (
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
            </div>

            <div className="p-4">
              <button
                onClick={() => {
                  onNewChat?.();
                  if (isMobile) setMobileOpen(false);
                }}
                className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white py-2 rounded-md shadow flex items-center justify-center transition-colors ${
                  collapsed && !isMobile ? "px-2" : "px-4"
                }`}
              >
                <Plus size={18} className={showLabels ? "mr-2" : ""} />
                {showLabels && "New Chat"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {showLabels && (
                <h3 className="text-xs uppercase font-semibold text-zinc-400 px-2 mb-2">
                  Recent Conversations
                </h3>
              )}

              {conversations && conversations.length > 0 ? (
                <ul className="space-y-1">
                  {conversations.map((convo, index) => {
                    const firstMessage =
                      convo.messages && convo.messages.length > 0
                        ? convo.messages.find((m) => m.sender === "user")
                            ?.text || "New Conversation"
                        : "New Conversation";

                    const displayTitle =
                      firstMessage.length > 30
                        ? firstMessage.substring(0, 30) + "..."
                        : firstMessage;

                    const date = new Date(convo.timestamp || Date.now());
                    const formattedDate = date.toLocaleDateString();

                    return (
                      <li key={convo.id || index}>
                        <button
                          onClick={() => {
                            onSelectConversation?.(convo);
                            if (isMobile) setMobileOpen(false);
                          }}
                          className={`w-full text-left rounded-md hover:bg-zinc-800 transition-colors flex ${
                            collapsed && !isMobile
                              ? "p-2 justify-center"
                              : "p-3 flex-col"
                          }`}
                          title={displayTitle}
                        >
                          {collapsed && !isMobile ? (
                            <Plus size={16} />
                          ) : (
                            <>
                              <span className="font-medium text-white">
                                {displayTitle}
                              </span>
                              <span className="text-xs text-zinc-400 mt-1">
                                {formattedDate}
                              </span>
                            </>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div
                  className={`text-center py-8 text-zinc-500 ${
                    collapsed && !isMobile ? "p-2" : ""
                  }`}
                >
                  {showLabels ? (
                    <>
                      <Plus size={24} className="mx-auto mb-3 opacity-50" />
                      <p>No conversations yet</p>
                      <p className="text-xs mt-2">
                        Start a new chat to see it here
                      </p>
                    </>
                  ) : (
                    <Plus size={20} className="mx-auto opacity-50" />
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 p-4">
              <Link
                href="/dashboard"
                className={`flex items-center text-zinc-300 hover:text-white p-2 w-full rounded-md hover:bg-zinc-800 transition-colors ${
                  collapsed && !isMobile ? "justify-center" : ""
                }`}
                onClick={() => {
                  if (isMobile) setMobileOpen(false);
                }}
              >
                <ExternalLink size={18} className={showLabels ? "mr-2" : ""} />
                {showLabels && "Dashboard"}
              </Link>
              <button
                className={`flex items-center text-zinc-300 hover:text-white p-2 w-full rounded-md hover:bg-zinc-800 transition-colors ${
                  collapsed && !isMobile ? "justify-center" : ""
                }`}
                onClick={() => {
                  disconnect?.();
                  if (isMobile) setMobileOpen(false);
                }}
              >
                <LogOut size={18} className={showLabels ? "mr-2" : ""} />
                {showLabels && "Disconnect Wallet"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
