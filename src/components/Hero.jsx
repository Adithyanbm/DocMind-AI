import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, FileText, BrainCircuit, Activity } from 'lucide-react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      
      <div className="hero-container">

        {/* Headline */}
        <h1 className="hero-title animate-fade-up delay-100">
          Your Documents,<br />
          Now <span className="text-gradient">Think for You</span>
        </h1>

        {/* Description */}
        <p className="hero-description animate-fade-up delay-200">
          DocMind AI reads, analyzes, and extracts actionable insights from millions of documents in seconds. Built for enterprise teams who need answers, not just search results.
        </p>

        {/* CTA Buttons */}
        <div className="hero-actions animate-fade-up delay-300">
          <Link to="/signup" className="btn btn-primary">
            Get Started <ArrowRight size={18} />
          </Link>
          <button className="btn btn-ghost">
            <Play size={18} fill="currentColor" /> Watch Demo
          </button>
        </div>

        {/* Illustration Area */}
        <div className="hero-illustration animate-fade-up delay-400">
          <div className="doc-card left-card glass-card">
            <div className="card-header">
              <FileText size={16} color="var(--accent-blue)" />
              <div className="card-title">Q3_Financial_Review.pdf</div>
            </div>
            <div className="card-body type-document">
              <p>Total Q3 revenue grew by <strong>14.2%</strong> to $2.4M.</p>
              <p>Operating expenses were reduced by <strong>3.5%</strong> QoQ.</p>
              <p>Net profit margins improved to robust <strong>18%</strong>.</p>
            </div>
            <div className="glow left-glow"></div>
          </div>

          <div className="center-node">
            <div className="node-rings">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
            </div>
            <div className="node-icon glass-card shadow-glow">
              <BrainCircuit size={32} color="var(--primary)" />
            </div>
            {/* Connection Lines */}
            <svg className="connection-lines" width="400" height="100" viewBox="0 0 400 100">
              <path className="path-anim path-blue" d="M 0 50 Q 100 50 200 50" stroke="var(--accent-blue)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.6" />
              <path className="path-anim path-purple" d="M 400 50 Q 300 50 200 50" stroke="var(--accent-purple)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.6" />
            </svg>
          </div>

          <div className="doc-card right-card glass-card">
            <div className="card-header">
              <Activity size={16} color="var(--accent-purple)" />
              <div className="card-title">Extracted JSON</div>
            </div>
            <div className="card-body type-code">
              <pre>{`{
  "revenue": "$2.4M",
  "growth": "+14.2%",
  "margin": "18%",
  "sentiment": "positive"
}`}</pre>
            </div>
             <div className="glow right-glow"></div>
          </div>
        </div>

        {/* Stats */}
        <div className="hero-stats animate-fade-up delay-500">
          <div className="stat-chip glass-card">
            <span className="stat-value">10M+</span>
            <span className="stat-label">Docs Processed</span>
          </div>
          <div className="stat-chip glass-card">
            <span className="stat-value">0.3s</span>
            <span className="stat-label">Response Time</span>
          </div>
          <div className="stat-chip glass-card">
            <span className="stat-value">99.2%</span>
            <span className="stat-label">Extraction Accuracy</span>
          </div>
        </div>
        
      </div>
    </section>
  );
};

export default Hero;
