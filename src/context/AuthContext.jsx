import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { forgotPassword as apiForgotPassword, resetPassword as apiResetPassword } from '../services/api';
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

      // Save email for the verification screen
      localStorage.setItem('pending_verification_email', email);

      // After successful registration, redirect to verify email
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

  const verifyEmail = async (email, code) => {
    try {
      await api.post('/auth/verify-email/', { email, code });
      // Clear the pending email
      localStorage.removeItem('pending_verification_email');
      // Redirect to signin
      navigate('/signin');
      return { success: true };
    } catch (error) {
       console.error('Verification Error:', error);
       return { 
         success: false, 
         error: error.response?.data?.error || 'Invalid verification code' 
       };
    }
  };

  const resendVerificationCode = async (email) => {
    try {
      await api.post('/auth/resend-code/', { email });
      return { success: true };
    } catch (error) {
       console.error('Resend Code Error:', error);
       return { 
         success: false, 
         error: error.response?.data?.error || 'Failed to resend code' 
       };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await apiForgotPassword(email);
      localStorage.setItem('pending_reset_email', email);
      navigate('/reset-password');
      return { success: true };
    } catch (error) {
      console.error('Forgot Password Error:', error);
      return { success: false, error: error };
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      await apiResetPassword(email, code, newPassword);
      localStorage.removeItem('pending_reset_email');
      navigate('/signin');
      return { success: true };
    } catch (error) {
       console.error('Reset Password Error:', error);
       return { success: false, error: error };
    }
  };

  const logout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('google_access_token');
    setUser(null);
    navigate('/signin');
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      // The frontend now passes an access_token with drive.file scopes
      const response = await api.post('/auth/google/', { token: googleToken });
      
      const { access, refresh, user: userData } = response.data;
      
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('google_access_token', googleToken); // Save for background sync
      
      setUser({ authenticated: true, ...userData });
      navigate('/dashboard');
      
      return { success: true };
    } catch (error) {
      console.error('Google Login Error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to authenticate with Google' 
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    verifyEmail,
    resendVerificationCode,
    forgotPassword,
    resetPassword,
    logout,
    loginWithGoogle,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
