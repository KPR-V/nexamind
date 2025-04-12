import storachaService from './storachaService';

export const saveChat = async (messages, did) => {
  if (!did || !messages || !Array.isArray(messages)) {
    throw new Error('Invalid parameters for chat storage');
  }
  
  try {
    const result = await storachaService.uploadChatData(messages, did);
    return result;
  } catch (error) {
    console.error('Error saving chat:', error);
    throw error;
  }
};

export const saveChatWithMetadata = async (messages, metadata, did) => {
  if (!did || !messages || !Array.isArray(messages)) {
    throw new Error('Invalid parameters for chat storage');
  }
  
  try {
    const chatData = {
      messages: messages,
      ...metadata,
      type: "chat",
      timestamp: Date.now()
    };
    
    const result = await storachaService.uploadChatData(chatData, did);
    return result;
  } catch (error) {
    console.error('Error saving chat with metadata:', error);
    throw error;
  }
};