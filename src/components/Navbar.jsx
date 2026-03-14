import { BrainCircuit } from 'lucide-react';
import './Navbar.css'; // We'll create a module or just use plain CSS classes, let's use plain CSS

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <div className="logo-icon">
            <BrainCircuit size={20} color="#38bdf8" />
          </div>
          <span className="logo-text">DocMind AI</span>
        </div>

        {/* Links */}
        <div className="navbar-links">
          <a href="#features">Features</a>
          <a href="#use-cases">Use Cases</a>
          <a href="#pricing">Pricing</a>
          <a href="#contact">Contact</a>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <a href="#signin" className="login-link">Sign In</a>
          <button className="btn btn-primary btn-sm">Get Started</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
