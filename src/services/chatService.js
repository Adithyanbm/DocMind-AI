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

export const getChatCompletions = async (messages, signal, isWebSearchActive = false, model = null) => {
  let token = localStorage.getItem('access');
  
  const makeRequest = async (authToken) => {
    return fetch('http://localhost:8000/api/chat/completions/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        messages,
        isWebSearchActive,
        model
      }),
      signal
    });
  };

  let response = await makeRequest(token);

  // Handle 401 Unauthorized (Token expired)
  if (response.status === 401) {
    try {
      const refreshToken = localStorage.getItem('refresh');
      if (!refreshToken) throw new Error('No refresh token');

      // Attempt to refresh the access token
      const refreshResponse = await api.post('/auth/refresh/', { refresh: refreshToken });
      const { access } = refreshResponse.data;
      
      localStorage.setItem('access', access);
      
      // Retry with the new token
      response = await makeRequest(access);
    } catch (error) {
      console.error('Token refresh failed during streaming:', error);
      // Optional: Clear tokens and redirect to login if refresh also fails
      // localStorage.removeItem('access');
      // localStorage.removeItem('refresh');
      // window.location.href = '/signin';
      return response; // Return the 401 if refresh failed
    }
  }

  return response;
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
