import React, { useState } from 'react';
import { X, User, Shield, CreditCard, Box, Link, Terminal, Check } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, user, colorMode, setColorMode, chatFont, setChatFont, backgroundAnimation, setBackgroundAnimation, voiceSetting, setVoiceSetting }) => {
  const [activeTab, setActiveTab] = useState('General');

  if (!isOpen) return null;
  
  const userName = user?.first_name ? user.first_name : (user?.email ? user.email.split('@')[0] : 'User');
  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* MODAL HEADER */}
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-modal-body">
          {/* SIDEBAR */}
          <div className="settings-sidebar">
            {['General', 'Account', 'Privacy', 'Billing', 'Capabilities', 'Connectors', 'Claude Code'].map(tab => (
              <button 
                key={tab} 
                className={`settings-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="settings-content">
            {activeTab === 'General' && (
              <div className="settings-section">
                <h3>Profile</h3>
                <div className="settings-row split">
                  <div className="input-group">
                    <label>Full name</label>
                    <div className="input-with-avatar">
                      <div className="mini-avatar">{userInitials}</div>
                      <input type="text" defaultValue={userName} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>What should DocMind AI call you?</label>
                    <input type="text" defaultValue={userName} />
                  </div>
                </div>

                <div className="input-group">
                  <label>What best describes your work?</label>
                  <select defaultValue="">
                    <option value="" disabled>Select your work function</option>
                    <option value="developer">Developer</option>
                    <option value="designer">Designer</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>What personal preferences should DocMind AI consider in responses?</label>
                  <p className="sub-label">Your preferences will apply to all conversations, within DocMind AI's guidelines.</p>
                  <textarea 
                    placeholder="e.g. when learning new concepts, I find analogies particularly helpful"
                    rows="4"
                  ></textarea>
                </div>
                
                <hr className="settings-divider" />

                <h3>Notifications</h3>
                <div className="settings-row flex-between">
                  <div className="setting-label-block">
                    <h4>Response completions</h4>
                    <p>Get notified when DocMind AI has finished a response. Most useful for long-running tasks like tool calls and Research.</p>
                  </div>
                  <div className="toggle-switch active">
                    <div className="toggle-thumb"></div>
                  </div>
                </div>

                <hr className="settings-divider" />

                <h3 style={{ marginTop: '24px' }}>Appearance</h3>
                
                <div className="settings-block">
                  <label>Color mode</label>
                  <div className="card-selector">
                    <div className="selector-item" onClick={() => setColorMode('light')}>
                      <div className={`selector-card ${colorMode === 'light' ? 'active' : ''}`}>
                        <div className="card-visual light-preview">
                          <div className="mock-lines top-left"></div>
                          <div className="mock-pill top-right"></div>
                          <div className="mock-input"><div className="mock-btn"></div></div>
                        </div>
                      </div>
                      <span className="selector-label">Light</span>
                    </div>
                    
                    <div className="selector-item" onClick={() => setColorMode('auto')}>
                      <div className={`selector-card ${colorMode === 'auto' ? 'active' : ''}`}>
                        <div className="card-visual auto-preview">
                          <div className="mock-lines top-left"></div>
                          <div className="mock-pill top-right"></div>
                          <div className="mock-input"><div className="mock-btn"></div></div>
                        </div>
                      </div>
                      <span className="selector-label">Auto</span>
                    </div>

                    <div className="selector-item" onClick={() => setColorMode('dark')}>
                      <div className={`selector-card ${colorMode === 'dark' ? 'active' : ''}`}>
                        <div className="card-visual dark-preview">
                          <div className="mock-lines top-left"></div>
                          <div className="mock-pill top-right"></div>
                          <div className="mock-input"><div className="mock-btn"></div></div>
                        </div>
                      </div>
                      <span className="selector-label">Dark</span>
                    </div>
                  </div>
                </div>

                <div className="settings-block">
                  <label>Background animation</label>
                  <div className="card-selector small-visual">
                    <div className="selector-item" onClick={() => setBackgroundAnimation('enabled')}>
                      <div className={`selector-card ${backgroundAnimation === 'enabled' ? 'active' : ''}`}>
                        <div className="visual-dots">
                          <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                        </div>
                      </div>
                      <span className="selector-label">Enabled</span>
                    </div>
                    <div className="selector-item" onClick={() => setBackgroundAnimation('auto')}>
                      <div className={`selector-card ${backgroundAnimation === 'auto' ? 'active' : ''}`}>
                        <div className="visual-dots">
                          <span className="dot"></span><span className="line"></span><span className="dot"></span>
                        </div>
                      </div>
                      <span className="selector-label">Auto</span>
                    </div>
                    <div className="selector-item" onClick={() => setBackgroundAnimation('disabled')}>
                      <div className={`selector-card ${backgroundAnimation === 'disabled' ? 'active' : ''}`}>
                        <div className="visual-dots disabled">
                          <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                        </div>
                      </div>
                      <span className="selector-label">Disabled</span>
                    </div>
                  </div>
                </div>

                <div className="settings-block">
                  <label>Chat font</label>
                  <div className="card-selector text-visual">
                    <div className="selector-item" onClick={() => setChatFont('default')}>
                      <div className={`selector-card ${chatFont === 'default' ? 'active' : ''}`}>
                        <div className="font-preview default">Aa</div>
                      </div>
                      <span className="selector-label">Default</span>
                    </div>
                    <div className="selector-item" onClick={() => setChatFont('sans')}>
                      <div className={`selector-card ${chatFont === 'sans' ? 'active' : ''}`}>
                        <div className="font-preview sans">Aa</div>
                      </div>
                      <span className="selector-label">Sans</span>
                    </div>
                    <div className="selector-item" onClick={() => setChatFont('system')}>
                      <div className={`selector-card ${chatFont === 'system' ? 'active' : ''}`}>
                        <div className="font-preview system">Aa</div>
                      </div>
                      <span className="selector-label">System</span>
                    </div>
                    <div className="selector-item" onClick={() => setChatFont('dyslexic')}>
                      <div className={`selector-card ${chatFont === 'dyslexic' ? 'active' : ''}`}>
                        <div className="font-preview dyslexic">Aa</div>
                      </div>
                      <span className="selector-label">Dyslexic friendly</span>
                    </div>
                  </div>
                </div>
                
                <hr className="settings-divider" />

                <h3>Voice settings</h3>
                <div className="settings-block">
                  <label>Voice</label>
                  <div className="chip-selector">
                    {['Buttery', 'Airy', 'Mellow', 'Glassy', 'Rounded'].map(voice => (
                      <button 
                        key={voice} 
                        className={`chips ${voiceSetting === voice.toLowerCase() ? 'active' : ''}`}
                        onClick={() => setVoiceSetting(voice.toLowerCase())}
                      >
                        {voice}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
