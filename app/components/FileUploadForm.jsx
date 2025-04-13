'use client';

import { useState } from 'react';
import axios from 'axios';

export default function FileUploadForm({ spaceId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file first');
      return;
    }
    
    if (!spaceId) {
      setError('No storage space available');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('did', spaceId);
      
      if (file.type.startsWith('image/')) {
        formData.append('type', 'image');
      } else {
        formData.append('type', 'file');
      }
      
      // Add additional metadata
      const metadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };
      formData.append('metadata', JSON.stringify(metadata));
      
      console.log('Uploading file:', file.name);
      console.log('To space ID:', spaceId);
      
      const response = await axios.post(
        'http://localhost:5000/uploadFileFromClient', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data && response.data.success) {
        setFile(null);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        setError('Upload failed: ' + (response.data?.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Error uploading file: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-3">Upload File</h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        <div>
          <label className="block mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Select File
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-zinc-700 dark:text-zinc-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      dark:file:bg-zinc-700 dark:file:text-blue-300
                      hover:file:bg-blue-100 dark:hover:file:bg-zinc-600"
            disabled={isUploading}
          />
        </div>
        
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {file && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </div>
        )}
        
        <button
          type="submit"
          disabled={isUploading || !file}
          className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                   disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : 'Upload'}
        </button>
      </form>
    </div>
  );
}