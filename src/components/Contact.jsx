import React from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import './Contact.css';

const Contact = () => {
  return (
    <section className="contact-section" id="contact">
      {/* Background elements */}
      <div className="contact-bg-glow"></div>

      <div className="contact-container">
        <div className="contact-grid">
          
          <div className="contact-info animate-fade-up">
            <h2 className="section-title">Ready to transform your document workflow?</h2>
            <p className="contact-description">
              Get in touch with our team to see how DocMind AI can save your team thousands of hours. Drop us a line, and we'll get back to you within 24 hours.
            </p>
            
            <div className="contact-method">
              <div className="method-icon"><Mail size={20} color="var(--primary)" /></div>
              <div>
                <p className="method-label">Email Us</p>
                <a href="mailto:hello@docmind.ai" className="method-value">hello@docmind.ai</a>
              </div>
            </div>

            <div className="contact-office">
              <p className="method-label">HQ</p>
              <p className="method-value">123 Market St, Suite 400<br/>San Francisco, CA 94105</p>
            </div>
          </div>

          <div className="contact-form-wrapper animate-fade-up delay-200">
            <div className="glass-card contact-form-card">
              <h3 className="form-title">Send a message</h3>
              
              <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input type="text" id="name" placeholder="Jane Doe" className="form-input" />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Work Email</label>
                  <input type="email" id="email" placeholder="jane@company.com" className="form-input" />
                </div>
                
                <div className="form-group">
                  <label htmlFor="company">Company</label>
                  <input type="text" id="company" placeholder="Acme Corp" className="form-input" />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">How can we help?</label>
                  <textarea id="message" rows="4" placeholder="Tell us about your document processing needs..." className="form-input textarea"></textarea>
                </div>
                
                <button type="button" className="btn btn-primary w-full submit-btn">
                  Send Message <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Contact;
