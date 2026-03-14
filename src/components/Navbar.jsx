import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Zap } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-mark">
            <Zap size={20} color="var(--primary)" fill="var(--primary)" />
          </div>
          <span className="text-main font-bold">DocMind AI</span>
        </Link>
        
        <div className="navbar-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#use-cases" className="nav-link">Use Cases</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#contact" className="nav-link">Contact</a>
        </div>

        <div className="navbar-actions">
          <Link to="/signin" className="nav-link sign-in-btn">Sign In</Link>
          <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
        
        <button className="mobile-menu-btn">
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
