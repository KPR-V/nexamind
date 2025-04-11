"use client";

// Import and use the polyfill before any other imports

import dynamic from "next/dynamic";
const StorachaStorage = dynamic(() => import("../utils/storachastorage"), {
  ssr: false,
});
import { createContext, useContext, useState, useEffect } from "react";
import { useAccount } from "wagmi";
const UserDataContext = createContext();

export function UserDataProvider({ children }) {
  const { address, isConnected } = useAccount();
  const [conversations, setConversations] = useState([]);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Save a conversation to Storacha
  const saveConversation = async (messages) => {
    if (!isConnected || !address) return null;

    setIsLoading(true);
    try {
      const result = await StorachaStorage.storeConversation(messages, address);

      // Update local state
      setConversations((prev) => [
        ...prev,
        {
          id: result.cid,
          messages,
          timestamp: new Date().toISOString(),
          url: result.url,
        },
      ]);

      return result;
    } catch (error) {
      console.error("Error saving conversation:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Save a generated image to Storacha
  const saveGeneratedImage = async (imageBlob, prompt) => {
    if (!isConnected || !address) return null;

    setIsLoading(true);
    try {
      const result = await StorachaStorage.storeGeneratedImage(
        imageBlob,
        prompt,
        address
      );

      // Update local state
      setGeneratedImages((prev) => [
        ...prev,
        {
          id: result.cid,
          prompt,
          timestamp: new Date().toISOString(),
          url: result.url,
        },
      ]);

      return result;
    } catch (error) {
      console.error("Error saving generated image:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a file to Storacha
  const uploadFile = async (file) => {
    if (!isConnected || !address) return null;

    setIsLoading(true);
    try {
      const result = await StorachaStorage.storeFile(file, address);

      // Update local state
      setUploadedFiles((prev) => [
        ...prev,
        {
          id: result.cid,
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: new Date().toISOString(),
          url: result.url,
        },
      ]);

      return result;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setConversations([]);
      setGeneratedImages([]);
      setUploadedFiles([]);
    }
  }, [isConnected]);



  return (
    <UserDataContext.Provider
      value={{
        address,
        isConnected,
        conversations,
        generatedImages,
        uploadedFiles,
        isLoading,
        saveConversation,
        saveGeneratedImage,
        uploadFile,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  return useContext(UserDataContext);
}
