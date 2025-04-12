"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeft,
  Plus,
  ExternalLink,
  LogOut,
  ChevronLeft,
  Bookmark,
  FileText,
  RefreshCw,
  Database
} from "lucide-react";
import Link from "next/link";
import { useDisconnect } from "wagmi";
import { useSidebar } from "./ui/SidebarContext";
import axios from "axios";

export default function AppSidebar({
  conversations = [],
  onSelectConversation,
  onNewChat,
}) {
  const { collapsed, mobileOpen, isMobile, toggleSidebar, setMobileOpen } =
    useSidebar();
  const { disconnect } = useDisconnect();
  const [storedConversations, setStoredConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [spaceName, setSpaceName] = useState("Loading...");
  const [spaceId, setSpaceId] = useState("");

  const sidebarWidth = collapsed && !isMobile ? "w-16" : "w-72";
  const showLabels = !collapsed || isMobile;

  // Fetch space info and stored conversations on component mount
  useEffect(() => {
    fetchSpaceInfo();
    fetchStoredConversations();
  }, []);

  // Fetch space information
  const fetchSpaceInfo = async () => {
    try {
      const didResponse = await axios.get("http://localhost:5000/getDID");
      const did = didResponse.data;
      setSpaceId(did);
      
      // Extract space name from DID
      if (did) {
        // If DID has a format like did:key:zXXXXX or did:web:spacename, etc.
        const parts = did.split(":");
        if (parts.length >= 3) {
          setSpaceName(parts[2].substring(0, 10) + "...");
        } else {
          setSpaceName(did.substring(0, 10) + "...");
        }
        
        // Alternatively, if you have an endpoint that returns space info:
        // const spaceInfoResponse = await axios.get("http://localhost:5000/getSpaceInfo", {
        //   params: { did }
        // });
        // setSpaceName(spaceInfoResponse.data.name || "Unknown Space");
      }
    } catch (error) {
      console.error("Error fetching space info:", error);
      setSpaceName("Unknown Space");
    }
  };

  // Fetch stored conversations from Storacha
  const fetchStoredConversations = async () => {
    setIsLoading(true);
    try {
      const didResponse = await axios.get("http://localhost:5000/getDID");
      const did = didResponse.data;
      setSpaceId(did);
      
      // Get the list of uploaded files
      const response = await axios.get("http://localhost:5000/listUploads", {
        params: { did }
      });
      
      if (response.data && Array.isArray(response.data.uploads)) {
        // Process each upload and fetch its content
        const storedChats = await Promise.all(
          response.data.uploads.map(async (upload) => {
            try {
              // Extract the CID string properly
              const cidString = upload.root.toString();
              
              // Fetch the content of each upload
              const contentResponse = await axios.get(`http://localhost:5000/getUpload`, {
                params: { 
                  cid: cidString,
                  did
                }
              });
              
              // Parse the chat data
              const chatData = contentResponse.data;
              
              return {
                id: cidString,
                messages: chatData,
                timestamp: upload.uploaded || Date.now(),
                isStoredChat: true,
                title: getChatTitle(chatData)
              };
            } catch (error) {
              console.error("Error fetching upload content:", error);
              return null;
            }
          })
        );
        
        // Filter out failed fetches and set stored conversations
        setStoredConversations(storedChats.filter(chat => chat !== null));
      }
    } catch (error) {
      console.error("Error fetching stored conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to reload stored conversations
  const reloadStoredConversations = async () => {
    setIsReloading(true);
    await fetchStoredConversations();
    setIsReloading(false);
  };

  // Helper function to extract title from chat messages
  const getChatTitle = (messages) => {
    if (!messages || !Array.isArray(messages)) return "Saved Chat";
    
    const firstUserMessage = messages.find(m => m.sender === "user");
    if (firstUserMessage && firstUserMessage.text) {
      return firstUserMessage.text.length > 30
        ? firstUserMessage.text.substring(0, 30) + "..."
        : firstUserMessage.text;
    }
    
    return "Saved Chat";
  };

  // Handle chat upload to Storacha
  const handleChatUpload = async () => {
    try {
      setIsLoading(true);
      const didResponse = await axios.get("http://localhost:5000/getDID");
      const did = didResponse.data;
      
      const chatdata = localStorage.getItem("chatMessages");
      if (!chatdata) {
        console.error("No chat messages found in localStorage");
        return;
      }
      
      const parsedChatData = JSON.parse(chatdata);
      
      const response = await axios.post("http://localhost:5000/uploadFile", {
        chatdata: parsedChatData,
        did
      });
      
      console.log("Upload successful:", response.data);
      
      // After successful upload, refresh the stored conversations
      await fetchStoredConversations();
      
    } catch (e) {
      console.error("Error uploading chat:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Combine regular conversations with stored conversations
  const allConversations = [...conversations, ...storedConversations];

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

            {/* Current Space Information */}
            {showLabels && (
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center text-zinc-400 text-xs">
                  <Database size={12} className="mr-1" />
                  <span>CURRENT SPACE</span>
                </div>
                <div className="mt-1 font-medium text-white truncate" title={spaceId}>
                  {spaceName}
                </div>
              </div>
            )}

            <div className="p-4">
              <button
                onClick={() => {
                  onNewChat?.();
                  if (isMobile) setMobileOpen(false);
                }}
                className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white py-2 rounded-md shadow flex items-center justify-center transition-colors ${
                  collapsed && !isMobile ? "px-2" : "px-4"
                }`}
                disabled={isLoading}
              >
                <Plus size={18} className={showLabels ? "mr-2" : ""} />
                {showLabels && "New Chat"}
              </button>
            </div>

            <div className="pt-2 pr-4 pl-4 pb-4">
              <button 
                onClick={handleChatUpload}
                disabled={isLoading}
                className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white py-2 rounded-md shadow flex items-center justify-center transition-colors ${
                  collapsed && !isMobile ? "px-2" : "px-4"
                }`}>
                <Bookmark size={18} className={showLabels ? "mr-2" : ""} />
                {showLabels && (isLoading ? "Saving..." : "Save Chat")}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {showLabels && (
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-xs uppercase font-semibold text-zinc-400">
                    Recent Conversations
                  </h3>
                  <button 
                    onClick={reloadStoredConversations}
                    disabled={isReloading}
                    className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors"
                    title="Reload stored conversations"
                  >
                    <RefreshCw 
                      size={14} 
                      className={`transition-all duration-500 ${isReloading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              )}

              {allConversations && allConversations.length > 0 ? (
                <ul className="space-y-1">
                  {allConversations.map((convo, index) => {
                    const isStoredChat = convo.isStoredChat;
                    
                    let displayTitle;
                    if (isStoredChat) {
                      displayTitle = convo.title || "Saved Chat";
                    } else {
                      const firstMessage =
                        convo.messages && convo.messages.length > 0
                          ? convo.messages.find((m) => m.sender === "user")
                              ?.text || "New Conversation"
                          : "New Conversation";

                      displayTitle =
                        firstMessage.length > 30
                          ? firstMessage.substring(0, 30) + "..."
                          : firstMessage;
                    }

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
                            isStoredChat ? <FileText size={16} /> : <Plus size={16} />
                          ) : (
                            <>
                              <div className="flex items-center">
                                {isStoredChat && (
                                  <FileText size={14} className="mr-2 text-blue-400" />
                                )}
                                <span className="font-medium text-white">
                                  {displayTitle}
                                </span>
                              </div>
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
                  {isLoading || isReloading ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw size={20} className="animate-spin mb-2" />
                      <p className="text-zinc-400">Loading...</p>
                    </div>
                  ) : showLabels ? (
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