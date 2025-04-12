"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileUp } from "lucide-react";
import { useAccount } from "wagmi";
import axios from "axios";

const StorachaPanel = ({
  isOpen,
  onClose,
  onSaveConversation,
  isProcessing,
  hasMessages,
}) => {
  const [file, setFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [spaceId, setSpaceId] = useState("");
  const fileInputRef = useRef(null);
  const { address } = useAccount();

  useEffect(() => {
    if (address) {
      fetchSpaceId();
    }
  }, [address]);

  const fetchSpaceId = async () => {
    try {
      const spaceResponse = await axios.get("http://localhost:5000/getSpaceForWallet", {
        params: { walletAddress: address }
      });
      
      if (spaceResponse.data && spaceResponse.data.did) {
        setSpaceId(spaceResponse.data.did);
      } else {
        const createResponse = await axios.post("http://localhost:5000/createstorachaspace", {
          walletaddress: address
        });
        
        if (createResponse.data && createResponse.data.did) {
          setSpaceId(createResponse.data.did);
        }
      }
    } catch (error) {
      console.error("Error fetching space ID:", error);
      if (error.response && error.response.status === 404) {
        try {
          const createResponse = await axios.post("http://localhost:5000/createstorachaspace", {
            walletaddress: address
          });
          
          if (createResponse.data && createResponse.data.did) {
            setSpaceId(createResponse.data.did);
          }
        } catch (createError) {
          console.error("Error creating space:", createError);
        }
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleCreateSpace = async () => {
    setUploadingFile(true);
    try {
      const response = await axios.post("http://localhost:5000/createstorachaspace", {
        walletaddress: address
      });
      const did = response.data;
      console.log("Space created:", did);
      setSpaceId(did.did);
      
      setUploadResult({
        success: true,
        message: "Space created successfully!",
        did: did.did
      });
    } catch (e) {
      console.error("Error creating space:", e);
      setUploadResult({
        success: false,
        error: e.message || "Failed to create space"
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setUploadingFile(true);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      if (!spaceId) {
        await fetchSpaceId();
      }
      
      formData.append("did", spaceId);

      const response = await axios.post("http://localhost:5000/uploadFileFromClient", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setUploadResult({
        success: true,
        cid: response.data.cid,
      });
      
      setFile(null);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadResult({
        success: false,
        error: error.response?.data?.error || error.message || "Upload failed",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-30"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-full bg-zinc-800 rounded-lg shadow-xl z-40 overflow-hidden"
          >
            <div className="relative">
              <div className="flex justify-between items-center border-b border-zinc-700 p-4">
                <h3 className="text-lg font-medium text-white">
                  Storacha Storage
                </h3>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-zinc-300"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-white">
                    Save Current Conversation
                  </h4>
                  <p className="text-sm text-zinc-400 mb-4">
                    Store this conversation securely on Storacha with
                    wallet-based encryption.
                  </p>
                  <button
                    onClick={handleCreateSpace}
                    disabled={isProcessing || uploadingFile}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-sm"
                  >
                    {uploadingFile ? "Creating..." : "Create Space"}
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-700">
                  <h4 className="font-medium mb-3 text-white">
                    Upload File to Storacha
                  </h4>

                  <div className="mb-4">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-zinc-700 border-zinc-600"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FileUp size={24} className="mb-3 text-zinc-400" />
                          <p className="mb-2 text-sm text-zinc-400">
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            or drag and drop
                          </p>
                          <p className="text-xs text-zinc-400">
                            (Any file type)
                          </p>
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  </div>

                  {file && (
                    <div className="p-3 bg-zinc-700 rounded-md mb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white truncate mr-2">
                          {file.name}
                        </p>
                        <button
                          className="text-zinc-400 hover:text-zinc-300"
                          onClick={() => setFile(null)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleFileUpload}
                    disabled={!file || uploadingFile || !spaceId}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-sm flex items-center justify-center"
                  >
                    {uploadingFile ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="mr-2" />
                        Upload to Storacha
                      </>
                    )}
                  </button>

                  {uploadResult && (
                    <div
                      className={`mt-4 p-3 rounded-md ${
                        uploadResult.success
                          ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                          : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                      }`}
                    >
                      {uploadResult.success ? (
                        <>
                          <p className="font-medium">
                            {uploadResult.cid ? "File uploaded successfully!" : "Operation successful!"}
                          </p>
                          {uploadResult.cid && (
                            <p className="text-sm mt-1">
                              CID: {uploadResult.cid}
                            </p>
                          )}
                          {uploadResult.did && (
                            <p className="text-sm mt-1">
                              Space ID: {uploadResult.did}
                            </p>
                          )}
                          {uploadResult.message && (
                            <p className="text-sm mt-1">
                              {uploadResult.message}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium">Operation failed</p>
                          <p className="text-sm mt-1">{uploadResult.error}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StorachaPanel;