import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import './Auth.css'; // Shared auth styles

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  
  const handleGoogleSuccess = async (credentialResponse) => {
    setIsSubmitting(true);
    setError('');
    const result = await loginWithGoogle(credentialResponse.credential);
    if (!result.success) {
      setError(result.error || 'Google Sign-In failed');
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Back to Home
      </Link>
      
      <div className="auth-card glass-card animate-fade-up">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-mark">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>DocMind AI</h2>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Enter your credentials to access your account</p>
        </div>

        <form className="auth-form" onSubmit={handleSignIn}>
          {error && <div className="auth-error-message" style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                id="email" 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
            </div>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                id="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : <><>Sign In</> <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="google-auth-wrapper" style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setError('Google Sign-In was unsuccessful. Try again.');
            }}
            useOneTap
          />
        </div>

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          <p>Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
