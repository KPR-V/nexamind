"use client";
import React, { useState, useRef, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import {
  MessageCircle,
  Settings,
  Download,
  Trash2,
  MoreVertical,
  Image,
  MessageSquare,
  Terminal,
  Database,
  AlertTriangle
} from "lucide-react";
import { useSidebar } from "./ui/SidebarContext";
import { useDisconnect, useAccount } from "wagmi";
import axios from "axios";

const Navbar = ({
  isImageMode,
  setIsImageMode,
  selectedModel,
  toggleModelDialog,
  enableTools,
  toggleTools,
  isConnected,
  showStorachaPanel,
  setShowStorachaPanel,
  isModelToolCapable,
  clearConversation,
  downloadConversation,
  collapsed,
  enableWebSearchForNonToolModels,
  toggleWebSearchForNonToolModels,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);
  const [spaceError, setSpaceError] = useState(null);
  const [spaceName, setSpaceName] = useState(null);
  const [spaceId, setSpaceId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const { isMobile } = useSidebar();
  const { disconnect } = useDisconnect();
  const { address: walletAddress, isConnected: walletIsConnected } = useAccount();

  // Effect to handle wallet address changes
  useEffect(() => {
    if (walletIsConnected && walletAddress) {
      handleWalletChange(walletAddress);
    } else {
      setSpaceId("");
      setSpaceName(null);
      setSpaceError(null);
    }
  }, [walletAddress, walletIsConnected]);

  // Handle wallet address change
  const handleWalletChange = async (address) => {
    setIsLoading(true);
    setSpaceError(null);
    
    try {
      // Check if this wallet already has a space
      const spaceResponse = await axios.get("http://localhost:5000/getSpaceForWallet", {
        params: { walletAddress: address }
      });
      
      if (spaceResponse.data && spaceResponse.data.did) {
        // Space exists, set it as current
        await axios.post("http://localhost:5000/setCurrentSpace", {
          did: spaceResponse.data.did
        });
        
        setSpaceId(spaceResponse.data.did);
        setSpaceName(formatSpaceName(spaceResponse.data.did, address));
      } else {
        // Something went wrong with the response
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      // If error is 404, it means no space exists for this wallet
      if (error.response && error.response.status === 404) {
        try {
          // Create a new space for this wallet
          const createResponse = await axios.post("http://localhost:5000/createstorachaspace", {
            walletaddress: address
          });
          
          if (createResponse.data && createResponse.data.did) {
            setSpaceId(createResponse.data.did);
            setSpaceName(formatSpaceName(createResponse.data.did, address));
          } else {
            console.error("Invalid response format:", createResponse.data);
            throw new Error("Failed to create space: invalid response format");
          }
        } catch (createError) {
          console.error("Error creating space:", createError);
          if (createError.response) {
            // Log more details about the error response
            console.error("Error response:", createError.response.status, createError.response.data);
            setSpaceError(`Failed to create space (${createError.response.status}): ${createError.response.data.error || "Unknown error"}`);
          } else if (createError.request) {
            // The request was made but no response was received
            console.error("No response received");
            setSpaceError("Failed to create space: No response from server. Is the API running?");
          } else {
            // Something happened in setting up the request
            setSpaceError(`Failed to create space: ${createError.message}`);
          }
        }
      } else {
        console.error("Error handling wallet change:", error);
        setSpaceError("Error connecting to space");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to format space name
  const formatSpaceName = (did, address) => {
    // Format wallet address
    const shortAddress = address ? 
      `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 
      "Unknown";
      
    // If DID is available, show part of it
    if (did) {
      const parts = did.split(":");
      if (parts.length >= 3) {
        return `${shortAddress} (${parts[2].substring(0, 6)}...)`;
      }
    }
    
    return shortAddress;
  };

  // Handle disconnect button click
  const handleDisconnect = () => {
    disconnect?.();
    setSpaceId("");
    setSpaceName(null);
    setSpaceError(null);
    setMenuVisible(false);
    setMoreOptionsVisible(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuVisible(false);
      }
      if (
        moreOptionsRef.current &&
        !moreOptionsRef.current.contains(event.target)
      ) {
        setMoreOptionsVisible(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="border-b border-zinc-800 p-3 flex items-center justify-between bg-zinc-900 sticky top-0 z-10">
      <div
        className={`flex items-center ${
          !isMobile && collapsed ? "ml-20" : "ml-14 lg:ml-0"
        }`}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mr-3 shadow-md">
          <MessageCircle size={24} />
        </div>
        <div className="flex items-center space-x-4 sm:space-x-12">
          <div>
            <h1 className="text-xl font-bold text-white">Nexamind Chat</h1>
            <p className="text-xs text-zinc-400">
              {isImageMode ? "Image Generation Mode" : "Text Chat Mode"}
            </p>
          </div>

          {!isImageMode && isModelToolCapable(selectedModel) && (
            <button
              onClick={toggleTools}
              className={`flex items-center px-2 py-1.5 rounded-md transition-colors ${
                enableTools
                  ? "bg-green-900/30 text-green-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              <Terminal size={16} className="mr-1" />
              <span className="text-xs hidden sm:inline">Tools</span>
            </button>
          )}
          {!isModelToolCapable(selectedModel) && (
            <button
              onClick={toggleWebSearchForNonToolModels}
              className={`flex items-center px-2 py-1.5 rounded-md transition-colors ${
                enableWebSearchForNonToolModels
                  ? "bg-green-900/30 text-green-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              <Terminal size={16} className="mr-1" />
              <span className="text-xs hidden sm:inline">Web Search</span>
            </button>
          )}
        </div>
      </div>

      {spaceError && (
        <div className="hidden sm:flex items-center text-red-400 text-xs mr-2">
          <AlertTriangle size={14} className="mr-1" />
          <span>{spaceError}</span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 bg-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => setIsImageMode(false)}
            className={`text-xs sm:text-sm px-2 py-1 rounded ${
              !isImageMode
                ? "bg-zinc-700 text-blue-400 shadow-sm"
                : "text-zinc-400"
            } flex items-center`}
          >
            <MessageSquare size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Text</span>
          </button>
          <button
            onClick={() => setIsImageMode(true)}
            className={`text-xs sm:text-sm px-2 py-1 rounded ${
              isImageMode
                ? "bg-zinc-700 text-purple-400 shadow-sm"
                : "text-zinc-400"
            } flex items-center`}
          >
            <Image size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Image</span>
          </button>
        </div>

        <button
          onClick={toggleModelDialog}
          className="flex items-center text-xs bg-zinc-800 hover:bg-zinc-700 px-2 sm:px-3 py-1.5 rounded-md text-zinc-300 transition-colors"
        >
          <span className="hidden sm:inline mr-1">Model:</span>
          <span className="font-semibold truncate max-w-[60px] sm:max-w-[80px]">
            {selectedModel || "Select"}
          </span>
        </button>

        <div className="relative sm:hidden" ref={moreOptionsRef}>
          <button
            onClick={() => setMoreOptionsVisible(!moreOptionsVisible)}
            className="text-zinc-400 hover:text-zinc-300 p-2 rounded-full"
          >
            <MoreVertical size={20} />
          </button>

          {moreOptionsVisible && (
            <div className="absolute right-0 mt-2 w-56 bg-zinc-800 rounded-md shadow-lg border border-zinc-700 z-20">
              <div className="py-1">
                <button
                  onClick={() => {
                    toggleModelDialog();
                    setMoreOptionsVisible(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700"
                >
                  <Settings size={16} className="mr-2" />
                  Change Model
                </button>

                {walletIsConnected && spaceId && (
                  <button
                    onClick={() => {
                      setShowStorachaPanel(!showStorachaPanel);
                      setMoreOptionsVisible(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700"
                  >
                    <Database size={16} className="mr-2" />
                    Storacha Storage
                  </button>
                )}

                <div className="border-t border-zinc-700 my-1"></div>

                <button
                  onClick={() => {
                    clearConversation();
                    setMoreOptionsVisible(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700"
                >
                  <Trash2 size={16} className="mr-2" />
                  Clear conversation
                </button>

                <button
                  onClick={() => {
                    downloadConversation();
                    setMoreOptionsVisible(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700"
                >
                  <Download size={16} className="mr-2" />
                  Download chat
                </button>
                
                {walletIsConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-2 text-sm flex items-center text-red-400 hover:bg-zinc-700"
                  >
                    <Settings size={16} className="mr-2" />
                    Disconnect Wallet
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {walletIsConnected && spaceId && (
          <button
            onClick={() => setShowStorachaPanel(!showStorachaPanel)}
            className={`hidden sm:flex text-xs px-2 py-1.5 rounded-md transition-colors ${
              showStorachaPanel
                ? "bg-teal-900/30 text-teal-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
            title={spaceId}
          >
            <Database size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {isLoading ? "Loading..." : "Storacha"}
            </span>
          </button>
        )}

        <div className="ml-1">
          <ConnectButton
            chainStatus="icon"
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
            showBalance={false}
          />
        </div>

        <div className="relative hidden sm:block" ref={menuRef}>
          <button
            onClick={() => setMenuVisible(!menuVisible)}
            className="text-zinc-400 hover:text-zinc-300 p-2 rounded-full"
          >
            <MoreVertical size={20} />
          </button>

          {menuVisible && (
            <div className="absolute right-0 mt-2 w-56 bg-zinc-800 rounded-md shadow-lg border border-zinc-700 z-20">
              <div className="py-1">
                {spaceName && (
                  <div className="px-4 py-2 text-sm text-zinc-400 border-b border-zinc-700">
                    <div className="font-medium text-zinc-300">Current Space:</div>
                    <div className="truncate" title={spaceId}>{spaceName}</div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    clearConversation();
                    setMenuVisible(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700"
                >
                  <Trash2 size={16} className="mr-2" />
                  Clear conversation
                </button>
                
                <button
                  onClick={() => {
                    downloadConversation();
                    setMenuVisible(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700"
                >
                  <Download size={16} className="mr-2" />
                  Download chat
                </button>
                
                {walletIsConnected && (
                  <Link
                    href="/dashboard"
                    className="w-full text-left px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700"
                    onClick={() => setMenuVisible(false)}
                  >
                    <Settings size={16} className="mr-2" />
                    Dashboard
                  </Link>
                )}
                
                {walletIsConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-2 text-sm flex items-center text-red-400 hover:bg-zinc-700"
                  >
                    <Settings size={16} className="mr-2" />
                    Disconnect Wallet
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;