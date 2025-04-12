"use client";


import dynamic from "next/dynamic";
const StorachaStorage = dynamic(() => import("../utils/storachastorage"), {
  ssr: false,
});
import { createContext, useContext, useState, useEffect } from "react";
import { useAccount } from "wagmi";
import axios from 'axios'; 
const UserDataContext = createContext();

export function UserDataProvider({ children }) {
  const { address, isConnected } = useAccount();
  const [conversations, setConversations] = useState([]);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const saveConversation = async (messages) => {
    if (!isConnected || !address) return null;

    setIsLoading(true);
    try {
      const result = await StorachaStorage.storeConversation(messages, address);

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

  const saveGeneratedImage = async (imageBlob, prompt) => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    setIsLoading(true);
    try {
      const spaceResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/getSpaceForWallet`, {
        params: { walletAddress: address }
      });
      
      if (!spaceResponse.data || !spaceResponse.data.did) {
        throw new Error("Could not find storage space for your wallet");
      }
      
      const spaceId = spaceResponse.data.did;
      
      const formData = new FormData();
      
      const filename = `ai-image-${Date.now()}.png`;
      formData.append('file', new File([imageBlob], filename, { type: 'image/png' }));
      formData.append('did', spaceId);
      formData.append('type', 'image');
      
      const metadata = {
        prompt: prompt,
        generated: true,
        timestamp: Date.now(),
        description: prompt
      };
      formData.append('metadata', JSON.stringify(metadata));

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/uploadFileFromClient`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (!response.data.success) {
        throw new Error("Upload failed");
      }

      setGeneratedImages((prev) => [
        ...prev,
        {
          id: response.data.cid,
          prompt: prompt,
          timestamp: new Date().toISOString(),
          url: `https://${response.data.cid}.ipfs.w3s.link`,
        },
      ]);

      return response.data;
    } catch (error) {
      console.error("Error saving generated image:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file) => {
    if (!isConnected || !address) return null;

    setIsLoading(true);
    try {
      const result = await StorachaStorage.storeFile(file, address);

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
