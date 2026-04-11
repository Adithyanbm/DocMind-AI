import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Plus, MoreHorizontal, Archive, Trash2, X, Check, 
  MinusCircle, Star, Pencil, Square, CheckSquare 
} from 'lucide-react';
import './styles/ChatsManagement.css';

const ChatsManagement = ({ 
  recentChats, 
  loadChat, 
  deleteChat, 
  newChat,
  renameChat,
  toggleStar,
  fetchRecentChats
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const menuRef = useRef(null);
  const editInputRef = useRef(null);

  const filteredChats = useMemo(() => {
    return recentChats.filter(chat => {
      const name = chat.name || '';
      const chatTitle = name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ');
      return chatTitle.toLowerCase().includes((internalSearch || '').toLowerCase());
    });
  }, [recentChats, internalSearch]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAll = () => {
    if (selectedIds.size === filteredChats.length) {
      clearSelection();
    } else {
      setSelectedIds(new Set(filteredChats.map(c => c.id)));
    }
  };

  const formatRelativeTime = (timeStr) => {
    if (!timeStr) return 'Recently';
    const date = new Date(timeStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleMenuAction = (action, chat, e) => {
    if (e) e.stopPropagation();
    const chatId = chat.id;
    setMenuOpenId(null);
    
    switch(action) {
      case 'select':
        toggleSelect(chatId);
        break;
      case 'delete':
        if (window.confirm('Delete this chat?')) {
          deleteChat(chatId);
        }
        break;
      case 'star':
        toggleStar(chatId, chat.starred);
        break;
      case 'rename':
        setEditingId(chatId);
        const name = chat.name || '';
        setEditValue(name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' '));
        break;
      default:
        break;
    }
  };

  const submitRename = async (chatId) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    await renameChat(editValue.trim(), chatId);
    setEditingId(null);
  };

  return (
    <div className="chats-management-container">
      <div className="chats-view-header">
        <h1>Chats</h1>
        <button className="new-chat-btn-flat" onClick={newChat}>
          <Plus size={18} />
          <span>New chat</span>
        </button>
      </div>

      <div className="chats-search-wrapper">
        <Search className="chats-search-icon" size={20} />
        <input 
          type="text" 
          className="chats-search-input" 
          placeholder="Search your chats..." 
          value={internalSearch}
          onChange={(e) => setInternalSearch(e.target.value)}
        />
      </div>

      {selectedIds.size > 0 ? (
        <div className="bulk-action-toolbar">
          <button className="close-selection-btn" onClick={clearSelection}>
            <MinusCircle size={20} />
          </button>
          <div className="selection-count">{selectedIds.size} selected</div>
          <div className="bulk-actions-icons">
            <button className="bulk-action-btn" title="Archive selection">
              <Archive size={18} />
            </button>
            <button 
              className="bulk-action-btn" 
              title="Delete selection"
              onClick={() => {
                if (window.confirm(`Delete ${selectedIds.size} chats?`)) {
                  selectedIds.forEach(id => deleteChat(id));
                  clearSelection();
                }
              }}
            >
              <Trash2 size={18} />
            </button>
            <button className="close-selection-btn" onClick={clearSelection} style={{ marginLeft: '12px' }}>
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="chats-sub-header">
          <div className="header-checkbox-wrapper" onClick={selectAll}>
            <div className={`custom-rect-checkbox header-rect ${selectedIds.size === filteredChats.length && filteredChats.length > 0 ? 'selected' : ''}`}>
              {selectedIds.size === filteredChats.length && filteredChats.length > 0 && <Check size={12} color="white" strokeWidth={3} />}
            </div>
          </div>
          <div className="sub-header-text-group">
            <span>Your chats with Mosaic</span>
            <button className="select-all-btn" onClick={(e) => { e.stopPropagation(); selectAll(); }}>Select</button>
          </div>
        </div>
      )}

      <div className="chats-management-list">
        {filteredChats.map((chat) => {
          const isSelected = selectedIds.has(chat.id);
          const isMenuOpen = menuOpenId === chat.id;
          const name = chat.name || '';
          const displayTitle = name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ');
          
          return (
            <div 
              key={chat.id} 
              className={`chat-management-row ${isSelected ? 'selected' : ''}`}
              onClick={() => loadChat(chat.id)}
            >
              <div className="chat-check-box-wrapper" onClick={(e) => toggleSelect(chat.id, e)}>
                <div className={`custom-rect-checkbox ${isSelected ? 'selected' : ''}`}>
                  {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                </div>
              </div>
              
              <div className="chat-info-main">
                {editingId === chat.id ? (
                  <div className="chat-rename-container" onClick={e => e.stopPropagation()}>
                    <input
                      ref={editInputRef}
                      type="text"
                      className="chat-rename-input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(chat.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => submitRename(chat.id)}
                    />
                  </div>
                ) : (
                  <div className="chat-row-title">
                    {displayTitle}
                    {chat.starred && (
                      <Star size={14} className="star-indicator" fill="currentColor" />
                    )}
                  </div>
                )}
                <div className="chat-row-time">Last message {formatRelativeTime(chat.modifiedTime)}</div>
              </div>

              <div className="chat-row-actions">
                <div className="menu-anchor-container">
                  <button 
                    className={`chat-more-btn ${isMenuOpen ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setMenuOpenId(isMenuOpen ? null : chat.id); 
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {isMenuOpen && (
                    <div className="chat-context-menu" ref={menuRef}>
                      <div className="menu-item" onClick={(e) => handleMenuAction('select', chat, e)}>
                        <Check size={16} className="menu-icon" />
                        <span>Select</span>
                      </div>
                      <div className="menu-item" onClick={(e) => handleMenuAction('star', chat, e)}>
                        <Star size={16} className={`menu-icon ${chat.starred ? 'starred' : ''}`} fill={chat.starred ? "currentColor" : "none"} />
                        <span>{chat.starred ? 'Unstar' : 'Star'}</span>
                      </div>
                      <div className="menu-item" onClick={(e) => handleMenuAction('rename', chat, e)}>
                        <Pencil size={16} className="menu-icon" />
                        <span>Rename</span>
                      </div>
                      <div className="menu-divider"></div>
                      <div className="menu-item delete-item" onClick={(e) => handleMenuAction('delete', chat, e)}>
                        <Trash2 size={16} className="menu-icon" />
                        <span>Delete</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredChats.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--claude-text-muted)' }}>
            {internalSearch ? "No chats found matching your search." : "No recent chats found."}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsManagement;
