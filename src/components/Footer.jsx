import React from 'react';
import { BrainCircuit, Twitter, Linkedin, Github } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="footer-container">
        <div className="footer-grid">
          
          <div className="footer-brand">
            <div className="navbar-logo">
              <div className="logo-icon">
                <BrainCircuit size={20} color="var(--accent-blue)" />
              </div>
              <span className="logo-text text-main">DocMind AI</span>
            </div>
            <p className="footer-description">
              Giving enterprise documents the power of thought. Built for the modern workforce.
            </p>
            <div className="social-links">
              <a href="#" aria-label="Twitter"><Twitter size={20} /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin size={20} /></a>
              <a href="#" aria-label="GitHub"><Github size={20} /></a>
            </div>
          </div>

          <div className="footer-links">
            <h4 className="footer-heading">Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#use-cases">Use Cases</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4 className="footer-heading">Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4 className="footer-heading">Legal</h4>
            <ul>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Cookie Guidelines</a></li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} DocMind AI Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
