import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck, ArrowLeft, RefreshCw, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState('');
  
  const { verifyEmail, resendVerificationCode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have an email stored from a recent registration
    const pendingEmail = localStorage.getItem('pending_verification_email');
    if (pendingEmail) {
      setEmailToVerify(pendingEmail);
    } else {
      // If we don't know who is verifying, redirect them to signin
      navigate('/signin');
    }
  }, [navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    const result = await verifyEmail(emailToVerify, code);
    
    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
    }
    // Note: On success, AuthContext handles the redirect to signin
  };

  const handleResend = async () => {
    setError('');
    setSuccessMsg('');
    
    const result = await resendVerificationCode(emailToVerify);
    
    if (result.success) {
      setSuccessMsg('A new verification code has been sent.');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-container">
      <div className="back-link">
        <Link to="/signin" className="btn btn-icon">
          <ArrowLeft size={18} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <div className="auth-card verify-card glass-panel fade-in-up">
        <div className="auth-header">
          <div className="verify-icon">
            <MailCheck size={40} className="text-primary" />
          </div>
          <h1>Verify your email</h1>
          <p>We've sent a 6-digit code to <strong>{emailToVerify}</strong>.</p>
          <p>Please check your backend terminal for the simulation printout.</p>
        </div>

        <form className="auth-form" onSubmit={handleVerify}>
          {error && <div className="auth-error-message" style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          {successMsg && <div className="auth-success-message" style={{ color: '#10b981', fontSize: '0.875rem', marginBottom: '0.5rem', background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>{successMsg}</div>}
          
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <div className="input-with-icon">
              <Key size={18} className="input-icon" />
              <input
                type="text"
                id="code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={6}
                style={{ letterSpacing: '8px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isSubmitting || code.length !== 6}>
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="verify-actions">
          <button className="btn btn-outline resend-btn" onClick={handleResend} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={18} /> Resend Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
