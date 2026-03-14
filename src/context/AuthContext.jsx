import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on initial load
    const checkAuthStatus = () => {
      const accessToken = localStorage.getItem('access');
      if (accessToken) {
        // We could verify the token by fetching user details 
        // For now, we'll just set them as authenticated if a token exists
        // A more robust solution would decode the JWT to get basic user info
        setUser({ authenticated: true });
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login/', {
        username: email, // Assuming email is used as username or custom auth backend handles it
        password: password,
      });

      const { access, refresh } = response.data;
      
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      
      setUser({ authenticated: true, email });
      navigate('/');
      
      return { success: true };
    } catch (error) {
      console.error('Login Error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Invalid email or password' 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      // Assuming name contains first and last name, or just first name
      const firstName = name.split(' ')[0] || '';
      const lastName = name.substring(firstName.length).trim() || '';

      await api.post('/auth/register/', {
        username: email, // Use email as username
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
      });

      // After successful registration, log them in or redirect to verify email
      navigate('/verify-email');
      return { success: true };
      
    } catch (error) {
       console.error('Registration Error:', error.response?.data);
       // Simplify error formatting for the UI
       let errorMsg = 'An error occurred during registration';
       if (error.response?.data) {
          const data = error.response.data;
          if (data.username) errorMsg = `Email: ${data.username[0]}`;
          else if (data.email) errorMsg = `Email: ${data.email[0]}`;
          else if (data.password) errorMsg = `Password: ${data.password[0]}`;
       }
       return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
    navigate('/signin');
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
