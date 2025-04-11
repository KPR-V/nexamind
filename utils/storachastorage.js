"use client";
import CryptoJS from "crypto-js";

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

export async function storeFile(file, address) {
  try {
    const cid = await client.put([file]);

    const metadata = {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      uploadedAt: new Date().toISOString(),
      owner: address,
    };

    const metadataCid = await storeData(
      metadata,
      address,
      `${file.name}.metadata.json`
    );

    return {
      cid,
      metadataCid: metadataCid.cid,
      url: `https://${cid}.ipfs.dweb.link/${file.name}`,
    };
  } catch (error) {
    console.error("Error storing file:", error);
    throw error;
  }
}

export async function storeConversation(messages, address) {
  try {
    const timestamp = new Date().toISOString();
    const filename = `conversation-${timestamp}.json`;

    return await storeData(messages, address, filename);
  } catch (error) {
    console.error("Error storing conversation:", error);
    throw error;
  }
}

export async function storeGeneratedImage(imageBlob, prompt, address) {
  try {
    const timestamp = new Date().toISOString();
    const filename = `generated-image-${timestamp}.png`;

    const file = new File([imageBlob], filename, { type: "image/png" });

    const result = await storeFile(file, address);

    const metadata = {
      prompt,
      generatedAt: timestamp,
      owner: address,
      imageCid: result.cid,
    };

    const metadataResult = await storeData(
      metadata,
      address,
      `${filename}.metadata.json`
    );

    return {
      ...result,
      metadataCid: metadataResult.cid,
      metadata,
    };
  } catch (error) {
    console.error("Error storing generated image:", error);
    throw error;
  }
}
