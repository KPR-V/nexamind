"use client";

import { useState } from "react";
import { useUserData } from "../../contexts/UserDataContext";

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const { uploadFile, isConnected } = useUserData();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !isConnected) return;

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      setResult(result);
      setFile(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Upload File to Storacha</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select File
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={isUploading || !isConnected}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || isUploading || !isConnected}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
      >
        {isUploading ? "Uploading..." : "Upload to Storacha"}
      </button>

      {result && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md">
          <p className="font-medium">File uploaded to Storacha!</p>
          <p className="text-sm mt-1">CID: {result.cid}</p>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
          >
            View on Storacha Gateway
          </a>
        </div>
      )}

      {!isConnected && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md">
          Please connect your wallet to upload files.
        </div>
      )}
    </div>
  );
}
