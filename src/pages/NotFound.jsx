import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import './Auth.css'; // Reusing auth styles for simplicity

const NotFound = () => {
  return (
    <div className="auth-container">
      <div className="auth-card glass-panel fade-in-up" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--primary)' }}>404</h1>
        <h2 style={{ marginBottom: '1rem' }}>Page Not Found</h2>
        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
          <Home size={18} />
          Go to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
