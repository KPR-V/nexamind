"use client";
import CryptoJS from "crypto-js";
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function createClient(email) {
  const client = await create();
  if (email) {
    await client.login(email);
  }
  return client;
}

function generateEncryptionKey(address) {
  if (!address || typeof address !== "string" || address.trim() === "") {
    throw new Error("Invalid address provided for encryption");
  }
  const salt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || "default-salt";
  return CryptoJS.PBKDF2(address.toLowerCase(), salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString();
}

function encryptData(data, address) {
  const key = generateEncryptionKey(address);
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

function decryptData(encryptedData, address) {
  const key = generateEncryptionKey(address);
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

export async function storeData(data, address, filename = "data.json", email) {
  try {
    const encryptedData = encryptData(data, address);
    const client = await createClient(email);

    const blob = new Blob([encryptedData], { type: "application/json" });
    const file = new File([blob], filename);

    const cid = await client.put([file]);

    return {
      cid,
      url: `https://${cid}.ipfs.dweb.link/${filename}`,
    };
  } catch (error) {
    console.error("Error storing data:", error);
    throw error;
  }
}

export async function retrieveData(cid, address, filename = "data.json") {
  try {
    const res = await fetch(`https://${cid}.ipfs.dweb.link/${filename}`);
    const encryptedData = await res.text();

    return decryptData(encryptedData, address);
  } catch (error) {
    console.error("Error retrieving data:", error);
    throw error;
  }
}

const StorachaStorage = {
  async storeConversation(messages, walletAddress) {
    try {
      const spaceResponse = await axios.get(`${API_BASE_URL}/getSpaceForWallet`, {
        params: { walletAddress }
      });
      
      if (!spaceResponse.data || !spaceResponse.data.did) {
        throw new Error("No space found for this wallet");
      }
      
      const spaceId = spaceResponse.data.did;
      
      // Upload the conversation
      const uploadResponse = await axios.post(`${API_BASE_URL}/uploadFile`, {
        chatdata: messages,
        did: spaceId
      });
      
      if (!uploadResponse.data.success) {
        throw new Error("Upload failed");
      }
      
      const cid = uploadResponse.data.cid;
      
      return {
        success: true,
        cid,
        url: `https://${cid}.ipfs.w3s.link`
      };
    } catch (error) {
      console.error("Error in storeConversation:", error);
      throw error;
    }
  },
  
  async storeGeneratedImage(imageBlob, prompt, walletAddress) {
    try {
      const spaceResponse = await axios.get(`${API_BASE_URL}/getSpaceForWallet`, {
        params: { walletAddress }
      });
      
      if (!spaceResponse.data || !spaceResponse.data.did) {
        throw new Error("No space found for this wallet");
      }
      
      const spaceId = spaceResponse.data.did;
      
      const formData = new FormData();
      const filename = `ai-image-${Date.now()}.png`;
      formData.append('file', new File([imageBlob], filename, { type: 'image/png' }));
      formData.append('did', spaceId);
      formData.append('type', 'image');
      
      const metadata = {
        prompt,
        generated: true,
        timestamp: Date.now(),
        description: prompt,
        isGenerated: true
      };
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await axios.post(
        `${API_BASE_URL}/uploadFileFromClient`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (!response.data.success) {
        throw new Error("Image upload failed");
      }
      
      return {
        success: true,
        cid: response.data.cid,
        url: `https://${response.data.cid}.ipfs.w3s.link`,
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error("Error in storeGeneratedImage:", error);
      throw error;
    }
  },
  
  async storeFile(file, walletAddress) {
    try {
      const spaceResponse = await axios.get(`${API_BASE_URL}/getSpaceForWallet`, {
        params: { walletAddress }
      });
      
      if (!spaceResponse.data || !spaceResponse.data.did) {
        throw new Error("No space found for this wallet");
      }
      
      const spaceId = spaceResponse.data.did;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('did', spaceId);
      
      const response = await axios.post(
        `${API_BASE_URL}/uploadFileFromClient`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (!response.data.success) {
        throw new Error("File upload failed");
      }
      
      return {
        success: true,
        cid: response.data.cid,
        url: `https://${response.data.cid}.ipfs.w3s.link`,
        metadata: response.data.metadata
      };
    } catch (error) {
      console.error("Error in storeFile:", error);
      throw error;
    }
  }
};

export default StorachaStorage;
