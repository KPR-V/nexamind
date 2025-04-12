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
  Database,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useDisconnect, useAccount } from "wagmi";
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
  const { address: walletAddress, isConnected } = useAccount();
  
  const [storedConversations, setStoredConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [spaceName, setSpaceName] = useState("Loading...");
  const [spaceId, setSpaceId] = useState("");
  const [spaceError, setSpaceError] = useState(null);

  const sidebarWidth = collapsed && !isMobile ? "w-16" : "w-72";
  const showLabels = !collapsed || isMobile;

  useEffect(() => {
    if (isConnected && walletAddress) {
      handleWalletChange(walletAddress);
    } else {
      setSpaceId("");
      setSpaceName("Not Connected");
      setStoredConversations([]);
    }
  }, [walletAddress, isConnected]);

  const handleWalletChange = async (address) => {
    setIsLoading(true);
    setSpaceError(null);
    
    try {
      const spaceResponse = await axios.get("http://localhost:5000/getSpaceForWallet", {
        params: { walletAddress: address }
      });
      
      if (spaceResponse.data && spaceResponse.data.did) {
        await axios.post("http://localhost:5000/setCurrentSpace", {
          did: spaceResponse.data.did
        });
        
        setSpaceId(spaceResponse.data.did);
        setSpaceName(formatSpaceName(spaceResponse.data.did, address));
        
        await fetchStoredConversations(spaceResponse.data.did);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        try {
          console.log("Creating new space for wallet:", address);
          const createResponse = await axios.post("http://localhost:5000/createstorachaspace", {
            walletaddress: address
          });
          
          if (createResponse.data && createResponse.data.did) {
            setSpaceId(createResponse.data.did);
            setSpaceName(formatSpaceName(createResponse.data.did, address));
            
            setStoredConversations([]);
          } else {
            throw new Error("Failed to create space");
          }
        } catch (createError) {
          console.error("Error creating space:", createError);
          setSpaceError("Failed to create space. Please try again.");
        }
      } else {
        console.error("Error handling wallet change:", error);
        setSpaceError("Error connecting to space. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatSpaceName = (did, address) => {
    const shortAddress = address ? 
      `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 
      "Unknown";
      
    if (did) {
      const parts = did.split(":");
      if (parts.length >= 3) {
        return `${shortAddress} (${parts[2].substring(0, 6)}...)`;
      }
    }
    
    return shortAddress;
  };

  const fetchStoredConversations = async (did = spaceId) => {
    setIsLoading(true);
    try {
      if (!did) {
        const didResponse = await axios.get("http://localhost:5000/getDID");
        did = didResponse.data;
        setSpaceId(did);
      }
      
      const response = await axios.get("http://localhost:5000/listUploads", {
        params: { did }
      });
      
      if (response.data && Array.isArray(response.data.uploads)) {
        const storedChats = await Promise.all(
          response.data.uploads.map(async (upload) => {
            try {
              const cidString = upload.root.toString();
              
              const contentResponse = await axios.get(`http://localhost:5000/getUpload`, {
                params: { 
                  cid: cidString,
                  did
                }
              });
              
              const data = contentResponse.data;
              
              if (data.type !== "chat" && 
                  !(Array.isArray(data) && data.length > 0 && data[0].sender) && 
                  !(data.messages && Array.isArray(data.messages))) {
                // Skip non-chat uploads
                return null;
              }
              
              const messages = Array.isArray(data) ? data : (data.messages || []);
              
              return {
                id: cidString,
                messages: messages,
                timestamp: upload.uploaded || data.timestamp || Date.now(),
                isStoredChat: true,
                title: getChatTitle(messages),
                size: upload.size,
                type: "chat"
              };
            } catch (error) {
              console.error("Error fetching upload content:", error);
              return null;
            }
          })
        );
        
        setStoredConversations(storedChats.filter(chat => chat !== null));
      }
    } catch (error) {
      console.error("Error fetching stored conversations:", error);
      setSpaceError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const reloadStoredConversations = async () => {
    setIsReloading(true);
    await fetchStoredConversations();
    setIsReloading(false);
  };

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

  const handleChatUpload = async () => {
    try {
      setIsLoading(true);
      
      if (!spaceId) {
        setSpaceError("No active space. Please connect your wallet.");
        return;
      }
      
      const chatdata = localStorage.getItem("chatMessages");
      if (!chatdata) {
        console.error("No chat messages found in localStorage");
        return;
      }
      
      const parsedChatData = JSON.parse(chatdata);
      
      const response = await axios.post("http://localhost:5000/uploadFile", {
        chatdata: parsedChatData,
        did: spaceId
      });
      
      console.log("Upload successful:", response.data);
      
      await fetchStoredConversations();
      
    } catch (e) {
      console.error("Error uploading chat:", e);
      setSpaceError("Failed to save chat");
    } finally {
      setIsLoading(false);
    }
  };

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
                  className="rounded-full bg-zinc-800 hover:bg-zinc-700 p-2 text-zinc-300 hover:text-white cursor-pointer"
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

            {showLabels && spaceError && (
              <div className="px-4 py-2 bg-red-900/30 border-b border-red-800">
                <div className="flex items-center text-red-400 text-xs">
                  <AlertTriangle size={12} className="mr-1" />
                  <span>{spaceError}</span>
                </div>
              </div>
            )}

            <div className="p-4">
              <button
                onClick={() => {
                  onNewChat?.();
                  if (isMobile) setMobileOpen(false);
                }}
                className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white py-2 rounded-md shadow cursor-pointer flex items-center justify-center transition-colors ${
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
                disabled={isLoading || !spaceId}
                className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white py-2 rounded-md shadow flex items-center justify-center transition-colors ${
                  (!spaceId ? "opacity-50 cursor-not-allowed " : "") +
                  (collapsed && !isMobile ? "px-2" : "px-4")
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
                    disabled={isReloading || !spaceId}
                    className={`text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors ${!spaceId ? "opacity-50 cursor-not-allowed" : ""}`}
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
                      {!spaceId ? (
                        <p className="text-xs mt-2">
                          Connect your wallet to access your space
                        </p>
                      ) : (
                        <>
                          <Plus size={24} className="mx-auto mb-3 opacity-50" />
                          <p>No conversations yet</p>
                          <p className="text-xs mt-2">
                            Start a new chat to see it here
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <Plus size={20} className="mx-auto opacity-50 hidden" />
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
                className={`flex items-center text-zinc-300 hover:text-white p-2 w-full rounded-md hover:bg-zinc-800 cursor-pointer transition-colors ${
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