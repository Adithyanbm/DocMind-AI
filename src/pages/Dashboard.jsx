import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, User, Menu, Plus, Search, Layers, Compass, 
  MessageSquare, Settings, ArrowUp, Paperclip, ChevronDown, Sparkles, X, HardDrive
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]); // Add ref for messages
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  
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
          const content = blocks[i+1]?.trim() || '';
          if (content && !content.startsWith("# DocMind AI")) {
            parsedMessages.push({ role, content });
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
        setAttachedFile({
          name: file.name,
          type: file.type,
          size: file.size,
          base64: base64String
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedFile) || isStreaming) return;

    let newUserContent = input;
    if (attachedFile) {
        newUserContent = `[Attached File: ${attachedFile.name}]\n[Base64 Data: ${attachedFile.base64}]\n\n${input}`;
    }

    const newUserMessage = { role: 'user', content: newUserContent };
    const displayUserMessage = { 
        role: 'user', 
        content: input, 
        attachment: attachedFile ? attachedFile.name : null 
    };

    setMessages(prev => [...prev, displayUserMessage]);
    setInput('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Reset textarea height
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    setIsStreaming(true);

    const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
    apiMessages.push(newUserMessage);

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '', reasoning_content: '' }]);

      const token = localStorage.getItem('access');
      
      const response = await fetch('http://localhost:8000/api/chat/completions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: apiMessages })
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

  if (loading || !user) return <div className="claude-dashboard setup-phase"></div>;

  return (
    <div className="claude-dashboard">
      
      {/* SIDEBAR */}
      <div className={`claude-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="icon-btn" onClick={() => setSidebarOpen(false)} title="Close Sidebar">
            <Menu size={20} />
          </button>
          <button className="icon-btn" title="Search chats">
            <Search size={20} />
          </button>
        </div>

        <button className="new-chat-btn" onClick={() => { setMessages([]); setCurrentFileId(null); }}>
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
          {recentChats.length === 0 ? (
            <div className="recent-link" style={{ opacity: 0.5 }}>No recent chats found.</div>
          ) : (
            recentChats.map(chat => (
              <a 
                key={chat.id} 
                href="#" 
                className={`recent-link ${currentFileId === chat.id ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); loadChat(chat.id); }}
              >
                {chat.name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ')}
              </a>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button className="user-profile-btn">
             <div className="user-avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
             <div className="user-info">
               <span className="user-name">{user?.first_name || 'User'}</span>
               <span className="user-plan">Pro plan</span>
             </div>
             <Settings size={16} className="settings-icon" />
          </button>
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
               GPT-OSS-20b <ChevronDown size={14} />
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
                         {msg.attachment && (
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
          <div className="input-container-wrapper">
             <div className="input-container">
               {attachedFile && (
                  <div className="attachment-chip">
                     <span className="file-name">{attachedFile.name}</span>
                     <button onClick={removeAttachment}><X size={14}/></button>
                  </div>
               )}
               
               <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="How can I help you today?"
                  disabled={isStreaming}
                  rows={1}
                  className="chat-textarea"
               />

               <div className="input-controls">
                  <div className="input-controls-left">
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       onChange={handleFileChange} 
                       style={{ display: 'none' }}
                     />
                     <button 
                       className="attach-file-btn"
                       onClick={() => fileInputRef.current.click()}
                       disabled={isStreaming}
                       title="Upload"
                     >
                        <Plus size={20} />
                     </button>
                  </div>
                  
                  <div className="input-controls-right">
                     <div className="model-selector-small">GPT-OSS 20b <ChevronDown size={14}/></div>
                     <button 
                       className={`submit-btn ${input.trim() || attachedFile ? 'active' : ''}`}
                       onClick={handleSubmit}
                       disabled={(!input.trim() && !attachedFile) || isStreaming}
                     >
                        <ArrowUp size={18} />
                     </button>
                  </div>
               </div>
             </div>

             {/* TAGS (Only on empty state) */}
             {messages.length === 0 && (
                <div className="suggestion-tags">
                   <button className="tag"><MessageSquare size={14}/> Summarize notes</button>
                   <button className="tag"><Layers size={14}/> Analyze architecture</button>
                   <button className="tag"><Bot size={14}/> Brainstorm ideas</button>
                </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
