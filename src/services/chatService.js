import api from './api';

export const fetchHistory = async (googleToken) => {
  try {
    const response = await api.get(`/chat/history/?google_token=${googleToken}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || 'Failed to fetch chat history';
  }
};

export const fetchChatContent = async (fileId, googleToken) => {
  try {
    const response = await api.get(`/chat/history/${fileId}/?google_token=${googleToken}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || 'Failed to load chat content';
  }
};

export const saveToDrive = async (messages, googleToken, fileId = null) => {
  try {
    const response = await api.post('/chat/save-to-drive/', {
      messages: messages.filter(m => m.role !== 'system'),
      google_token: googleToken,
      file_id: fileId
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || 'Failed to save chat to Google Drive';
  }
};

export const deleteHistory = async (fileId, googleToken) => {
  try {
    const response = await api.delete(`/chat/history/${fileId}/delete/?google_token=${googleToken}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || 'Failed to delete chat';
  }
};

export const getChatCompletions = async (messages, signal) => {
  // We use fetch directly here because of streaming support which is easier with native fetch
  const token = localStorage.getItem('access');
  return fetch('http://localhost:8000/api/chat/completions/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messages }),
    signal
  });
};

export const renameChat = async (fileId, newName, googleToken) => {
  try {
    const response = await api.patch(`/chat/history/${fileId}/rename/`, {
      google_token: googleToken,
      new_name: newName
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || 'Failed to rename chat';
  }
};
