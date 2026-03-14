import React from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';
import './Auth.css';

const VerifyEmail = () => {
  return (
    <div className="auth-container">
      <div className="auth-card glass-card animate-fade-up text-center">
        <div className="auth-header" style={{ marginBottom: "2rem" }}>
          <div className="auth-logo" style={{ justifyContent: "center", marginBottom: "2rem" }}>
            <div className="logo-mark">
              <MailCheck size={32} color="var(--primary)" />
            </div>
          </div>
          <h1 className="auth-title">Verify your email</h1>
          <p className="auth-subtitle">
            We've sent a verification link to your email address. 
            Please check your inbox (and spam folder) to activate your account.
          </p>
        </div>

        <div className="auth-actions" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button className="btn btn-primary auth-submit-btn">
            Resend Email
          </button>
          
          <Link to="/signin" className="btn btn-ghost auth-submit-btn">
            <ArrowLeft size={18} /> Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
