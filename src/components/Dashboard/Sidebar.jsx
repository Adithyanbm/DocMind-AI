import React from 'react';
import { Menu, Search, Bot, Plus, MessageSquare, Layers, Compass, Trash2, Settings, ChevronRight, HelpCircle, ArrowUpCircle, Download, Gift, Info, LogOut, Blocks, PenTool } from 'lucide-react';
import { StaticStitchLogo } from './MessageRow';

export const Sidebar = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  setIsSearchModalOpen, 
  newChat, 
  searchQuery, 
  recentChats, 
  currentFileId, 
  loadChat, 
  deleteChat, 
  user, 
  showProfileMenu, 
  setShowProfileMenu, 
  setIsSettingsModalOpen, 
  logout 
}) => {
  // Reusable profile menu popover
  const renderProfilePopover = () => (
    <>
      <div className="profile-overlay-invisible" onClick={() => setShowProfileMenu(false)}></div>
      <div className="profile-popover-menu">
        <div className="profile-popover-email">
          {user?.email || 'user@example.com'}
        </div>
        <div className="popover-divider"></div>
        <button className="popover-item" onClick={() => { setShowProfileMenu(false); setIsSettingsModalOpen(true); }}>
          <Settings size={16} />
          <span>Settings</span>
          <span className="shortcut">⌘+Shift+,</span>
        </button>
        <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
          <Globe size={16} />
          <span>Language</span>
          <ChevronRight size={14} className="popover-chevron" />
        </button>
        <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
          <HelpCircle size={16} />
          <span>Get help</span>
        </button>
        <div className="popover-divider"></div>
        <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
          <ArrowUpCircle size={16} />
          <span>Upgrade plan</span>
        </button>
        <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
          <Download size={16} />
          <span>Get apps and extensions</span>
        </button>
        <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
          <Gift size={16} />
          <span>Gift DocMind</span>
        </button>
        <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
          <Info size={16} />
          <span>Learn more</span>
          <ChevronRight size={14} className="popover-chevron" />
        </button>
        <div className="popover-divider"></div>
        <button className="popover-item popover-item-danger" onClick={() => { setShowProfileMenu(false); logout(); }}>
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </>
  );

  if (!sidebarOpen) {
    return (
      <div className="claude-sidebar-mini">
        <div className="mini-top">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Open Sidebar"><Menu size={20} /></button>
          <button className="icon-btn" onClick={newChat} title="New Chat"><Plus size={18} /></button>
          <button className="icon-btn" onClick={() => setIsSearchModalOpen(true)} title="Search"><Search size={18} /></button>
          <button className="icon-btn" title="Projects"><Layers size={18} /></button>
          <button className="icon-btn" title="Chats"><MessageSquare size={18} /></button>
          <button className="icon-btn" title="Artifacts"><Blocks size={18} /></button>
          <button className="icon-btn" title="Code"><PenTool size={18} /></button>
        </div>
        <div className="mini-bottom" style={{ position: 'relative' }}>
          <button className="icon-btn" title="Download App"><Download size={18} /></button>
          <button className="mini-user-btn" onClick={() => setShowProfileMenu(!showProfileMenu)} title="Account">
            <div className="mini-user-avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
          </button>
          {showProfileMenu && renderProfilePopover()}
        </div>
      </div>
    );
  }

  return (
    <div className={`claude-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <button className="icon-btn" onClick={() => setSidebarOpen(false)} title="Close Sidebar">
          <Menu size={20} />
        </button>
        <button className="icon-btn" onClick={() => setIsSearchModalOpen(true)} title="Search chats (Ctrl+K)">
          <Search size={20} />
        </button>
      </div>

      <button className="new-chat-btn" onClick={newChat} title="New chat (Ctrl+Shift+O)">
        <div className="new-chat-content">
          <div className="new-chat-plus-icon"><Plus size={14} /></div>
          <span>New chat</span>
        </div>
      </button>

      <div className="sidebar-section">
        <a href="#" className="sidebar-link active"><MessageSquare size={16} /> Chats</a>
        <a href="#" className="sidebar-link"><Layers size={16} /> Projects</a>
        <a href="#" className="sidebar-link"><Compass size={16} /> Discover</a>
      </div>

      <div className="sidebar-recents">
        <div className="recents-header">Recents (Google Drive)</div>
        {recentChats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
          <div className="recent-link" style={{ opacity: 0.5 }}>
             {searchQuery ? "No results found." : "No recent chats found."}
          </div>
        ) : (
          recentChats
            .filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(chat => (
            <div key={chat.id} className={`recent-chat-item ${currentFileId === chat.id ? 'active' : ''}`}>
              <a 
                href="#" 
                className="recent-link"
                onClick={(e) => { e.preventDefault(); loadChat(chat.id); }}
              >
                {chat.name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ')}
              </a>
              <button className="delete-chat-btn" onClick={(e) => deleteChat(chat.id, e)} title="Delete chat">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer" style={{ position: 'relative' }}>
        <button className={`user-profile-btn ${showProfileMenu ? 'active' : ''}`} onClick={() => setShowProfileMenu(!showProfileMenu)}>
           <div className="user-avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
           <div className="user-info">
             <span className="user-name">{user?.first_name ? user.first_name : (user?.email ? user.email.split('@')[0] : 'User')}</span>
             <span className="user-plan">Free plan</span>
           </div>
           <Settings size={16} className="settings-icon" />
        </button>
        
        {showProfileMenu && renderProfilePopover()}
      </div>
    </div>
  );
};

const Globe = ({ size, className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
