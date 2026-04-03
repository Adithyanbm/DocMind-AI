import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import './Auth.css'; 

const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.authenticated) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loginWithGoogleFlow = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsSubmitting(true);
      setError('');
      // tokenResponse.access_token contains the token with Drive scopes
      const result = await loginWithGoogle(tokenResponse.access_token);
      if (!result.success) {
        setError(result.error || 'Google Sign-Up failed');
        setIsSubmitting(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      setError('Google Sign-Up was unsuccessful. Try again.');
    },
    // We need both email/profile (default) AND drive.file
    scope: 'https://www.googleapis.com/auth/drive.file'
  });

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await register(name, email, password);
    
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
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-subtitle">Start processing your documents with AI today.</p>
        </div>

        <form className="auth-form" onSubmit={handleSignUp}>
          {error && <div className="auth-error-message" style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                id="name" 
                placeholder="Jane Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                id="email" 
                placeholder="jane@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                id="password" 
                placeholder="Create a strong password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : <><>Sign Up</> <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="auth-divider" style={{ textAlign: 'center', margin: '1.5rem 0', position: 'relative' }}>
          <span style={{ background: '#fff', padding: '0 10px', color: '#64748b', fontSize: '0.875rem', zIndex: 1, position: 'relative' }}>or continue with</span>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e2e8f0', zIndex: 0 }}></div>
        </div>

        <div className="google-auth-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
            onClick={() => loginWithGoogleFlow()}
            disabled={isSubmitting}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>
        </div>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/signin" className="auth-link">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
