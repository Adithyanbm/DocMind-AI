import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, User, Menu, Plus, Search, Layers, Compass, 
  MessageSquare, Settings, ArrowUp, Paperclip, ChevronDown, Sparkles, X, HardDrive, Trash2, ChevronRight,
  CircleStop, AudioWaveform, Camera, FolderPlus, Book, Blocks, Globe, PenTool,
  LogOut, HelpCircle, ArrowUpCircle, Download, Gift, Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SettingsModal from '../components/SettingsModal';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]); // Add ref for messages
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('docmind_colorMode') || 'dark');
  const [chatFont, setChatFont] = useState(() => localStorage.getItem('docmind_chatFont') || 'default');
  const [backgroundAnimation, setBackgroundAnimation] = useState(() => localStorage.getItem('docmind_bgAnim') || 'auto');
  const [voiceSetting, setVoiceSetting] = useState(() => localStorage.getItem('docmind_voice') || 'buttery');

  // Sync preferences to localStorage
  useEffect(() => {
    localStorage.setItem('docmind_colorMode', colorMode);
  }, [colorMode]);

  useEffect(() => {
    localStorage.setItem('docmind_chatFont', chatFont);
  }, [chatFont]);

  useEffect(() => {
    localStorage.setItem('docmind_bgAnim', backgroundAnimation);
  }, [backgroundAnimation]);

  useEffect(() => {
    localStorage.setItem('docmind_voice', voiceSetting);
  }, [voiceSetting]);

  const searchInputRef = useRef(null);
  
  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Cmd/Ctrl + Shift + O = New Chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyO') {
        e.preventDefault();
        setMessages([]);
        setCurrentFileId(null);
        if (textareaRef.current) textareaRef.current.focus();
      }
      
      // Cmd/Ctrl + K = Search Modal
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
      
      // Cmd/Ctrl + Shift + , = Settings Modal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'Comma' || e.key === '<' || e.key === ',')) {
        e.preventDefault();
        setIsSettingsModalOpen(true);
      }
      
      // Cmd/Ctrl + U = Add file or photo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyU') {
        e.preventDefault();
        if (fileInputRef.current) fileInputRef.current.click();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const [isSaving, setIsSaving] = useState(false);

  const [recentChats, setRecentChats] = useState([]);
  const [currentFileId, setCurrentFileId] = useState(null);
  const currentFileIdRef = useRef(null); // Add ref for fileId
  
  // Sync state to refs
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  useEffect(() => {
    currentFileIdRef.current = currentFileId;
  }, [currentFileId]);

  // Fetch recent chats from Google Drive
  const fetchRecentChats = async () => {
    try {
      const accessToken = localStorage.getItem('access');
      const googleToken = localStorage.getItem('google_access_token');
      if (!accessToken || !googleToken) return;

      const res = await fetch(`http://localhost:8000/api/chat/history/?google_token=${googleToken}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setRecentChats(data.files);
      }
    } catch (err) {
      console.error("Failed to fetch recent chats", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentChats();
    }
  }, [isAuthenticated]);

  const loadChat = async (fileId) => {
    try {
      const accessToken = localStorage.getItem('access');
      const googleToken = localStorage.getItem('google_access_token');
      
      const res = await fetch(`http://localhost:8000/api/chat/history/${fileId}/?google_token=${googleToken}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      
      if (data.success) {
        // Parse the markdown content back into messages (simplified approach)
        const parsedMessages = [];
        const blocks = data.content.split(/\*\*(You|DocMind AI):\*\*/).filter(Boolean);
        
        for (let i = 1; i < blocks.length; i += 2) {
          const role = blocks[i].trim() === 'You' ? 'user' : 'assistant';
          let content = blocks[i+1]?.trim() || '';
          
          if (content && !content.startsWith("# DocMind AI")) {
            let apiContent = content;
            
            // Re-hydrate images from markdown format
            if (role === 'user' && content.includes('![Attached Image](data:image/')) {
                const imgRegex = new RegExp("!\\[Attached Image\\]\\((data:image/[^;]+;base64,[^)]+)\\)");
                const imgMatch = content.match(imgRegex);
                if (imgMatch) {
                    const base64Url = imgMatch[1];
                    // Remove the image markdown from the plain text display content
                    content = content.replace(imgMatch[0], '').trim();
                    
                    // Re-construct the Vision API payload array
                    apiContent = [
                        { type: "text", text: content || "Analyze this image." },
                        { type: "image_url", image_url: { url: base64Url } }
                    ];
                    
                    parsedMessages.push({ 
                        role, 
                        content, 
                        apiContent,
                        attachment: "Uploaded Image",
                        attachmentData: base64Url 
                    });
                    continue; // Skip the standard push
                }
            }
            
            parsedMessages.push({ role, content, apiContent });
          }
        }
        
        setMessages(parsedMessages);
        setCurrentFileId(fileId);
        if (window.innerWidth <= 768) setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to load chat", err);
    }
  };

  const autoSaveToDrive = async (msgsToSave) => {
    try {
      const accessToken = localStorage.getItem('access');
      const googleToken = localStorage.getItem('google_access_token');
      if (!accessToken || !googleToken) return;

      setIsSaving(true);
      const fileIdToUse = currentFileIdRef.current;
      
      const res = await fetch('http://localhost:8000/api/chat/save-to-drive/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          messages: msgsToSave.filter(m => m.role !== 'system'),
          google_token: googleToken,
          file_id: fileIdToUse
        })
      });
      
      const data = await res.json();
      if (data.success && data.file_id) {
        if (!fileIdToUse) {
          setCurrentFileId(data.file_id);
          fetchRecentChats(); // Refresh sidebar with new file
        }
      }
    } catch (err) {
      console.error("Auto-save failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteChat = async (fileId, e) => {
    e.stopPropagation();
    try {
      const accessToken = localStorage.getItem('access');
      const googleToken = localStorage.getItem('google_access_token');
      if (!accessToken || !googleToken) return;

      const res = await fetch(`http://localhost:8000/api/chat/history/${fileId}/delete/?google_token=${googleToken}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.success) {
        if (currentFileId === fileId) {
          setMessages([]);
          setCurrentFileId(null);
        }
        fetchRecentChats();
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/signin');
    }
  }, [isAuthenticated, loading, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Convert file to base64 for vision model
  const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = reject;
      });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64String = await fileToBase64(file);
        setAttachedFile({
          name: file.name,
          type: file.type,
          size: file.size,
          base64: base64String
        });
      } catch (err) {
        console.error("Failed to convert image to base64", err);
      }
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
            // Found an image in the clipboard
            const file = item.getAsFile();
            if (file) {
                try {
                  const base64String = await fileToBase64(file);
                  
                  // Use a generic name if missing
                  let fileName = file.name;
                  if (!fileName || fileName === 'image.png') {
                      fileName = `Screenshot ${new Date().toLocaleTimeString(undefined, {hour12: false})}.png`;
                  }

                  setAttachedFile({
                    name: fileName,
                    type: file.type,
                    size: file.size,
                    base64: base64String
                  });
                } catch (err) {
                  console.error("Failed to convert pasted image to base64", err);
                }
            }
            break; // Only attach the first image found
        }
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedFile) || isStreaming) return;

    let apiContent = input;
    if (attachedFile && attachedFile.type.startsWith('image/')) {
        apiContent = [
            { type: "text", text: input || "Analyze this image." },
            { type: "image_url", image_url: { url: `data:${attachedFile.type};base64,${attachedFile.base64}` } }
        ];
    } else if (attachedFile) {
        apiContent = `[Attached File: ${attachedFile.name}]\n[File Content / Data]\n\n${input}`;
    }

    const newUserMessage = { role: 'user', content: apiContent };
    const displayUserMessage = { 
        role: 'user', 
        content: input, 
        attachment: attachedFile ? attachedFile.name : null,
        attachmentData: attachedFile && attachedFile.type.startsWith('image/') ? `data:${attachedFile.type};base64,${attachedFile.base64}` : null,
        apiContent: apiContent // Store the proper API format for history
    };

    setMessages(prev => [...prev, displayUserMessage]);
    setInput('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Reset textarea height
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    setIsStreaming(true);

    const apiMessages = messages.map(m => {
        // If it's a historical message, and it has an image (array content), 
        // we convert it back to text so the model doesn't crash on multi-turn vision.
        if (Array.isArray(m.apiContent)) {
             const textPart = m.apiContent.find(p => p.type === 'text');
             return { role: m.role, content: textPart ? textPart.text : "[User provided an image earlier]" };
        }
        return { role: m.role, content: m.apiContent || m.content };
    });
    apiMessages.push(newUserMessage);

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '', reasoning_content: '' }]);

      const token = localStorage.getItem('access');
      
      abortControllerRef.current = new AbortController();

      const response = await fetch('http://localhost:8000/api/chat/completions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let assistantContent = '';
      let assistantReasoning = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.choices && data.choices[0].delta) {
                const delta = data.choices[0].delta;
                
                if (delta.content) {
                  assistantContent += delta.content;
                }
                if (delta.reasoning_content) {
                  assistantReasoning += delta.reasoning_content;
                }
                
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastMsg = { ...newMsgs[newMsgs.length - 1] };
                  
                  if (delta.content) {
                    lastMsg.content = assistantContent;
                  }
                  if (delta.reasoning_content) {
                    lastMsg.reasoning_content = assistantReasoning;
                  }
                  
                  newMsgs[newMsgs.length - 1] = lastMsg;
                  return newMsgs;
                });
              }
            } catch (err) {
              console.warn('Error parsing JSON from stream', err, dataStr);
            }
          }
        }
      }
      
      // Stream finished. Construct the exact final state without relying on functional `prev`
      const finalAssistantMessage = {
          role: 'assistant',
          content: assistantContent,
          reasoning_content: assistantReasoning
      };
      
      const sessionMessagesToSave = [...apiMessages, finalAssistantMessage];
      autoSaveToDrive(sessionMessagesToSave);

    } catch (error) {
      if (error.name === 'AbortError') {
         console.log("Stream aborted by user");
         autoSaveToDrive(messagesRef.current);
         return;
      }
      console.error('Chat error:', error);
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        lastMsg.content = 'Sorry, there was an error communicating with the AI. Please try again.';
        lastMsg.isError = true;
        return newMsgs;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  if (loading || !user) return <div className={`claude-dashboard setup-phase ${colorMode === 'light' ? 'theme-light' : ''} font-${chatFont}`}></div>;

  return (
    <div className={`claude-dashboard ${colorMode === 'light' ? 'theme-light' : ''} font-${chatFont}`}>
      
      {/* SIDEBAR */}
      <div className={`claude-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="icon-btn" onClick={() => setSidebarOpen(false)} title="Close Sidebar">
            <Menu size={20} />
          </button>
          <button className="icon-btn" onClick={() => setIsSearchModalOpen(true)} title="Search chats (Ctrl+K)">
            <Search size={20} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={() => { setMessages([]); setCurrentFileId(null); }} title="New chat (Ctrl+Shift+O)">
          <div className="new-chat-content">
            <div className="docmind-icon"><Bot size={16} /></div>
            <span>New chat</span>
          </div>
          <Plus size={18} />
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
          
          {showProfileMenu && (
            <>
              <div className="profile-overlay-invisible" onClick={() => setShowProfileMenu(false)}></div>
              <div className="profile-popover-menu">
                <div className="profile-popover-header">
                  {user?.email || 'user@example.com'}
                </div>
                <button className="popover-item" onClick={() => { setShowProfileMenu(false); setIsSettingsModalOpen(true); }}>
                  <Settings size={16} /> <span>Settings</span> <span className="shortcut">Ctrl+Shift+,</span>
                </button>
                <button className="popover-item has-submenu" onClick={() => setShowProfileMenu(false)}>
                  <Globe size={16} /> <span>Language</span> <ChevronRight size={14} className="submenu-arrow"/>
                </button>
                <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
                  <HelpCircle size={16} /> <span>Get help</span>
                </button>
                <hr className="popover-divider" />
                <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
                  <ArrowUpCircle size={16} /> <span>Upgrade plan</span>
                </button>
                <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
                  <Download size={16} /> <span>Get apps and extensions</span>
                </button>
                <button className="popover-item" onClick={() => setShowProfileMenu(false)}>
                  <Gift size={16} /> <span>Gift DocMind</span>
                </button>
                <button className="popover-item has-submenu" onClick={() => setShowProfileMenu(false)}>
                  <Info size={16} /> <span>Learn more</span> <ChevronRight size={14} className="submenu-arrow"/>
                </button>
                <hr className="popover-divider" />
                <button className="popover-item text-danger" onClick={() => { setShowProfileMenu(false); logout(); }}>
                  <LogOut size={16} /> <span>Log out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="claude-workspace">
        <header className="workspace-header">
          {!sidebarOpen && (
             <button className="icon-btn sidebar-toggle" onClick={() => setSidebarOpen(true)}>
               <Menu size={20} />
             </button>
          )}
          <div className="header-right-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {isSaving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                <HardDrive size={14} className="saving-spinner" /> Saving to Drive...
              </div>
            )}
            <div className="model-selector">
               DocMind AI <ChevronDown size={14} />
            </div>
          </div>
        </header>

        <div className={`workspace-content ${messages.length === 0 ? 'empty' : ''}`}>
          
          {/* EMPTY STATE */}
          {messages.length === 0 && (
            <div className="welcome-state">
              <div className="greeting">
                <Sparkles size={32} className="greeting-sparkle" />
                <h1>Sunday session, {user?.first_name || 'DocMind'}?</h1>
              </div>
            </div>
          )}

          {/* CHAT HISTORY */}
          {messages.length > 0 && (
             <div className="chat-thread">
                {messages.map((msg, index) => (
                   <div key={index} className={`message-row ${msg.role}`}>
                      {msg.role === 'assistant' && (
                         <div className="message-avatar bot"><Bot size={18} /></div>
                      )}
                      
                      <div className="message-body">
                         {msg.attachmentData && (
                            <img src={msg.attachmentData} alt="Attachment" className="image-preview-standalone" />
                         )}
                         {msg.attachment && !msg.attachmentData && (
                            <div className="message-attachment">
                               <Paperclip size={14} /> {msg.attachment}
                            </div>
                         )}
                         <div className={`message-text ${msg.isError ? 'error-text' : ''}`}>
                            {msg.reasoning_content && (
                              <details className="think-block">
                                <summary>Thought Process</summary>
                                <div className="think-content">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.reasoning_content}</ReactMarkdown>
                                </div>
                              </details>
                            )}
                            {msg.content && (
                              <div className="markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                              </div>
                            )}
                         </div>
                      </div>

                      {msg.role === 'user' && (
                         <div className="message-avatar user">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
                      )}
                   </div>
                ))}
                
                {isStreaming && messages[messages.length-1]?.role !== 'assistant' && (
                   <div className="message-row assistant">
                      <div className="message-avatar bot"><Bot size={18} /></div>
                      <div className="message-body">
                        <div className="typing-dot"></div>
                      </div>
                   </div>
                )}
                <div ref={messagesEndRef} className="scroll-anchor" />
             </div>
          )}

          {/* INPUT BAR */}
          <div className="input-container-wrapper" style={{ position: 'relative' }}>

             {showTemplateMenu && messages.length === 0 && (
              <div className="template-menu template-popup">
                <div className="template-header">
                  <div className="template-header-left">
                    <span className="code-tag">&lt;/&gt; Code</span>
                  </div>
                  <button className="icon-btn" style={{width: 20, height: 20}} onClick={() => setShowTemplateMenu(false)}><X size={14} /></button>
                </div>
                <div className="template-list">
                  <button className="template-item" onClick={() => { setInput("Develop algorithm solutions"); setShowTemplateMenu(false); }}>
                    Develop algorithm solutions
                  </button>
                  <button className="template-item" onClick={() => { setInput("Tell me what programming paradigm suits my thinking style"); setShowTemplateMenu(false); }}>
                    Tell me what programming paradigm suits my thinking style
                  </button>
                  <button className="template-item" onClick={() => { setInput("Help me turn a screenshot into working code"); setShowTemplateMenu(false); }}>
                    Help me turn a screenshot into working code
                  </button>
                  <button className="template-item" onClick={() => { setInput("Develop deployment strategies"); setShowTemplateMenu(false); }}>
                    Develop deployment strategies
                  </button>
                  <button className="template-item" onClick={() => { setInput("Design scalability plans"); setShowTemplateMenu(false); }}>
                    <span>Design scalability plans</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
             )}

             <div className="input-container">
               {attachedFile && (
                  <div className={attachedFile.type.startsWith('image/') ? "attachment-image-preview" : "attachment-chip"}>
                     {attachedFile.type.startsWith('image/') ? (
                        <>
                           <img src={`data:${attachedFile.type};base64,${attachedFile.base64}`} alt="preview" className="attachment-preview-large" />
                           <button className="remove-img-btn" onClick={removeAttachment}><X size={14}/></button>
                        </>
                     ) : (
                        <>
                           <span className="file-name">{attachedFile.name}</span>
                           <button onClick={removeAttachment}><X size={14}/></button>
                        </>
                     )}
                  </div>
               )}
               
               <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="How can I help you today?"
                  disabled={isStreaming}
                  rows={1}
                  className="chat-textarea"
               />

               <div className="input-controls">
                  <div className="input-controls-left" style={{ position: 'relative' }}>
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       onChange={(e) => {
                         handleFileChange(e);
                         setShowAttachmentMenu(false);
                       }} 
                       style={{ display: 'none' }}
                     />
                     <button 
                       className={`attach-file-btn ${showAttachmentMenu ? 'active' : ''}`}
                       onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                       disabled={isStreaming}
                       title="Attachments"
                     >
                        <Plus size={20} />
                     </button>
                     
                     {showAttachmentMenu && (
                       <>
                         <div className="attachment-overlay-invisible" onClick={() => setShowAttachmentMenu(false)}></div>
                         <div className="attachment-popover-menu">
                           <button className="popover-item" onClick={() => fileInputRef.current.click()}>
                             <Paperclip size={16} /> <span>Add files or photos</span> <span className="shortcut">Ctrl+U</span>
                           </button>
                           <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                             <Camera size={16} /> <span>Take a screenshot</span>
                           </button>
                           <button className="popover-item has-submenu" onClick={() => setShowAttachmentMenu(false)}>
                             <FolderPlus size={16} /> <span>Add to project</span> <ChevronRight size={14} className="submenu-arrow"/>
                           </button>
                           <button className="popover-item has-submenu" onClick={() => setShowAttachmentMenu(false)}>
                             <Book size={16} /> <span>Skills</span> <ChevronRight size={14} className="submenu-arrow"/>
                           </button>
                           <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                             <Blocks size={16} /> <span>Add connectors</span>
                           </button>
                           <hr className="popover-divider" />
                           <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                             <Globe size={16} /> <span>Web search</span>
                           </button>
                           <button className="popover-item has-submenu" onClick={() => setShowAttachmentMenu(false)}>
                             <PenTool size={16} /> <span>Use style</span> <ChevronRight size={14} className="submenu-arrow"/>
                           </button>
                         </div>
                       </>
                     )}
                  </div>
                  
                  <div className="input-controls-right">
                     <div className="model-selector-small">DocMind AI <ChevronDown size={14}/></div>
                     {isStreaming ? (
                        <button 
                          className="submit-btn stop"
                          onClick={handleStop}
                          title="Stop generating"
                        >
                           <CircleStop size={18} strokeWidth={2} />
                        </button>
                     ) : (
                        <button 
                          className={`submit-btn ${input.trim() || attachedFile ? 'active' : 'idle'}`}
                          onClick={handleSubmit}
                          disabled={(!input.trim() && !attachedFile)}
                          title="Send message"
                        >
                           {input.trim() || attachedFile ? (
                              <ArrowUp size={20} strokeWidth={2.5} />
                           ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                 <path d="M4 10v4" className="waveform-bar" />
                                 <path d="M8 8v8" className="waveform-bar" />
                                 <path d="M12 5v14" className="waveform-bar" />
                                 <path d="M16 8v8" className="waveform-bar" />
                                 <path d="M20 10v4" className="waveform-bar" />
                              </svg>
                           )}
                        </button>
                     )}
                  </div>
               </div>
             </div>

             {/* TAGS (Only on empty state) */}
             {messages.length === 0 && (
                <div className="suggestion-tags">
                   <button className="tag" onClick={() => setShowTemplateMenu(!showTemplateMenu)}>
                      <span className="code-tag" style={{ border: 'none', padding: 0, background: 'transparent', fontSize: '0.85rem' }}>&lt;/&gt;</span> Code
                   </button>
                   <button className="tag"><MessageSquare size={14}/> Summarize notes</button>
                   <button className="tag"><Layers size={14}/> Analyze architecture</button>
                   <button className="tag"><Bot size={14}/> Brainstorm ideas</button>
                </div>
             )}
          </div>

        </div>
      </div>
      
      {/* SEARCH MODAL OVERLAY */}
      {isSearchModalOpen && (
        <div className="search-modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <Search size={18} className="search-modal-icon" />
              <input 
                 autoFocus
                 type="text" 
                 placeholder="Search chats and projects" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="search-modal-input"
               />
               <button className="icon-btn close-btn" onClick={() => { setIsSearchModalOpen(false); setSearchQuery(''); }}>
                 <X size={18} />
               </button>
            </div>
            
            <div className="search-modal-results">
              {recentChats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="search-no-results">No results found</div>
              ) : (
                recentChats
                  .filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(chat => {
                    const cleanName = chat.name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ');
                    return (
                      <div 
                        key={chat.id} 
                        className="search-result-item"
                        onClick={() => {
                          loadChat(chat.id);
                          setIsSearchModalOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="search-result-left">
                          <MessageSquare size={16} />
                          <span>{cleanName}</span>
                        </div>
                        <div className="search-result-right">
                          <span className="search-result-date">Enter</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        user={user}
        colorMode={colorMode}
        setColorMode={setColorMode}
        chatFont={chatFont}
        setChatFont={setChatFont}
        backgroundAnimation={backgroundAnimation}
        setBackgroundAnimation={setBackgroundAnimation}
        voiceSetting={voiceSetting}
        setVoiceSetting={setVoiceSetting}
      />

    </div>
  );
};

export default Dashboard;
