import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const storachaService = {
  createSpace: async (walletAddress) => {
    const response = await axios.post(`${API_BASE_URL}/createstorachaspace`, { walletAddress });
    return response.data;
  },
  
  getSpaceForWallet: async (walletAddress) => {
    const response = await axios.get(`${API_BASE_URL}/getSpaceForWallet`, { 
      params: { walletAddress } 
    });
    return response.data;
  },
  
  setCurrentSpace: async (did) => {
    const response = await axios.post(`${API_BASE_URL}/setCurrentSpace`, { did });
    return response.data;
  },
  
  listUploads: async (did) => {
    const response = await axios.get(`${API_BASE_URL}/listUploads`, { 
      params: { did } 
    });
    return response.data;
  },
  
  getUpload: async (cid, did) => {
    const response = await axios.get(`${API_BASE_URL}/getUpload`, { 
      params: { cid, did } 
    });
    return response.data;
  },
  
  uploadChatData: async (chatdata, did) => {
    const response = await axios.post(`${API_BASE_URL}/uploadFile`, { 
      chatdata, 
      did 
    });
    return response.data;
  },
  
  uploadFile: async (formData) => {
    const response = await axios.post(`${API_BASE_URL}/uploadFileFromClient`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }
};

export default storachaService;