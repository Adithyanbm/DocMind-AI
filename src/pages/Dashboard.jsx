import React, { useState, useRef, useEffect, memo, createContext, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, User, Menu, Plus, Search, Layers, Compass, 
  MessageSquare, Settings, ArrowUp, Paperclip, ChevronDown, Sparkles, X, HardDrive, Trash2, ChevronRight,
  CircleStop, AudioWaveform, Camera, FolderPlus, Book, Blocks, Globe, PenTool,
  LogOut, HelpCircle, ArrowUpCircle, Download, Gift, Info, MicOff, Mic, Copy, Check, Square, FileCode, FileText, Loader2, RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SettingsModal from '../components/SettingsModal';
import './Dashboard.css';

const ArtifactContext = createContext();

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const customOneDark = { ...oneDark };
Object.keys(customOneDark).forEach(key => {
  if (typeof customOneDark[key] === 'object') {
    if (customOneDark[key].background) {
      delete customOneDark[key].background;
    }
    if (customOneDark[key].backgroundColor) {
      delete customOneDark[key].backgroundColor;
    }
  }
});
/* ── Infer a meaningful filename from code content ── */
const inferCodeName = (rawCode, lang) => {
  // Highest priority: LLM-provided filename comment in any language
  const filenameComment = rawCode.match(/^#\s*filename:\s*(\S+)/im)
    || rawCode.match(/^\/\/\s*filename:\s*(\S+)/im)
    || rawCode.match(/^<!--\s*filename:\s*(\S+)/im)
    || rawCode.match(/^\/\*\s*filename:\s*(\S+)/im);
  if (filenameComment) return filenameComment[1];

  const extMap = { python: 'py', javascript: 'js', typescript: 'ts', jsx: 'jsx', tsx: 'tsx', bash: 'sh', shell: 'sh', html: 'html', css: 'css', java: 'java', cpp: 'cpp', c: 'c', go: 'go', rust: 'rs', ruby: 'rb' };
  const ext = extMap[lang?.toLowerCase()] || lang || 'txt';

  // Python class
  const pyClass = rawCode.match(/^class\s+(\w+)/m);
  if (pyClass) return `${pyClass[1].toLowerCase()}.${ext}`;
  // Python def (skip __init__, __main__, setup, etc.)
  const pyDef = rawCode.match(/^def\s+(?!__)(\w+)/m);
  if (pyDef && lang === 'python') return `${pyDef[1]}.${ext}`;
  // JS/TS named export class
  const jsClass = rawCode.match(/^(?:export\s+)?(?:default\s+)?class\s+(\w+)/m);
  if (jsClass) return `${jsClass[1]}.${ext}`;
  // React functional component (PascalCase const)
  const jsComp = rawCode.match(/^(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)/m);
  if (jsComp) return `${jsComp[1]}.${ext}`;
  // General function
  const jsFn = rawCode.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m);
  if (jsFn) return `${jsFn[1]}.${ext}`;
  // HTML title
  const htmlTitle = rawCode.match(/<title>([^<]{1,30})<\/title>/i);
  if (htmlTitle) return `${htmlTitle[1].trim().replace(/\s+/g, '_').toLowerCase()}.html`;
  // Shebang
  if (rawCode.startsWith('#!/')) return `script.${ext}`;

  return `snippet.${ext}`;
};

/* ── CodeBlock — scroll tracking handled by Dashboard's handleScroll ── */
const CodeBlock = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const context = useContext(ArtifactContext);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/^\n+/, '').replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return <code className={className} {...props}>{children}</code>;
  }

  const lang = match ? match[1] : 'text';
  const rawCode = String(children).replace(/^\n+/, '').replace(/\n$/, '');
  const lineCount = rawCode.split('\n').length;

  // Always show stepper for large blocks — even during streaming
  // This avoids the jarring inline → stepper transition after stream ends
  if (lineCount > 15 && context?.openArtifact) {
      const fileName = inferCodeName(rawCode, lang);
      const artIdx = context.nextArtIdxRef?.current ?? 0;
      if (context.nextArtIdxRef) context.nextArtIdxRef.current += 1;
      
      // Stepper is its own component so it can have local collapsed state
      const ArtifactStepper = () => {
        const [collapsed, setCollapsed] = React.useState(false);
        return (
          <div className="artifact-inline-stepper">
            <div 
              className="stepper-header" 
              onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Created {fileName}
              <ChevronDown size={14} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>
            {!collapsed && (
              <div className="stepper-timeline">
                <div className="stepper-track-line"></div>
                <div className="stepper-item" style={{ cursor: 'pointer' }} onClick={() => context.openArtifact(artIdx, lang, rawCode)}>
                   <div className="stepper-icon"><FileCode size={14} /></div>
                   <div className="stepper-content">
                      <span className="stepper-text">Generated code</span>
                      <span className="stepper-badge">{fileName}</span>
                   </div>
                </div>
                <div className="stepper-item" style={{ cursor: 'pointer' }} onClick={() => context.openArtifact(artIdx, lang, rawCode)}>
                   <div className="stepper-icon"><FileText size={14} /></div>
                   <div className="stepper-content">
                      <span className="stepper-text">View in Artifact panel</span>
                   </div>
                </div>
                <div className={`stepper-item ${context?.isStreaming ? '' : 'done'}`}>
                   <div className="stepper-icon">
                     {context?.isStreaming ? <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} /> : <Check size={14} />}
                   </div>
                   <div className="stepper-content">
                      <span className="stepper-text">
                        {context?.isStreaming ? 'Generating artifact...' : 'Artifact ready'}
                      </span>
                   </div>
                </div>
              </div>
            )}
          </div>
        );
      };
      return <ArtifactStepper />;
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-lang">
        <span className="code-language">{lang}</span>
      </div>
      <button className="code-copy-btn" onClick={handleCopy} aria-label="Copy code">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? 'Copied!' : 'Copy'}</span>
      </button>
      <SyntaxHighlighter
        children={String(children).replace(/^\n+/, '').replace(/\n$/, '')}
        style={customOneDark}
        language={lang}
        PreTag="div"
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: '4px 16px 16px 16px', /* Tiny 4px top padding */
          fontSize: '0.9em',
          lineHeight: '1.5',
          fontFamily: "'Fira Code', 'Consolas', monospace",
        }}
        {...props}
      />
    </div>
  );
};

const markdownComponents = {
  p: ({node, ...props}) => <div className="md-paragraph" style={{ margin: '0 0 1em 0', lineHeight: '1.6' }} {...props} />,
  li: ({node, ...props}) => <li style={{ margin: '0.4em 0', lineHeight: '1.6' }} {...props} />,
  ul: ({node, ...props}) => <ul style={{ margin: '0 0 1em 0', paddingLeft: '1.5em' }} {...props} />,
  ol: ({node, ...props}) => <ol style={{ margin: '0 0 1em 0', paddingLeft: '1.5em' }} {...props} />,
  h1: ({node, ...props}) => <h1 style={{ margin: '1.5em 0 0.5em 0', fontSize: '1.75em', fontWeight: '600', letterSpacing: '-0.02em' }} {...props} />,
  h2: ({node, ...props}) => <h2 style={{ margin: '1.4em 0 0.5em 0', fontSize: '1.5em', fontWeight: '600', letterSpacing: '-0.01em' }} {...props} />,
  h3: ({node, ...props}) => <h3 style={{ margin: '1.2em 0 0.5em 0', fontSize: '1.25em', fontWeight: '600' }} {...props} />,
  h4: ({node, ...props}) => <h4 style={{ margin: '1.2em 0 0.5em 0', fontSize: '1.1em', fontWeight: '600' }} {...props} />,
  pre: ({node, ...props}) => <div className="markdown-pre" style={{ margin: 0, padding: 0 }} {...props} />,
  code: (props) => <CodeBlock {...props} />,
};

const cleanMarkdown = (text) => {
  if (!text) return '';
  const match = text.match(/^\s*```(?:markdown|md)\s*?\n([\s\S]*)$/i);
  let cleaned = text;
  if (match) {
    cleaned = match[1].replace(/\n?```\s*$/, '');
  }
  return cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^([*+-]|\d+\.)\s*\n+/gm, '$1 ');
};

const extractArtifacts = (text) => {
  if (!text) return [];
  const artifacts = [];
  // Match both complete blocks and currently streaming unclosed blocks
  const regex = /```([\w-]+)?\n([\s\S]*?)(?:```|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawCode = match[2].replace(/^\n+/, '').replace(/\n$/, '');
    const hasFilenameTag = /^(?:#|\/\/|<!--|\/\*)\s*filename:\s*\S+/im.test(rawCode);
    if (hasFilenameTag) {
      const lang = match[1] || 'text';
      artifacts.push({ lang, code: rawCode, fileName: inferCodeName(rawCode, lang) });
    }
  }
  return artifacts;
};

const MemoizedMessageRow = memo(({ msg, user, msgIdx }) => {
  const context = useContext(ArtifactContext);
  const artifacts = React.useMemo(() => extractArtifacts(msg.content), [msg.content]);
  // Provide per-message artifact index counter for CodeBlock via context
  const nextArtIdxRef = useRef(0);
  // Reset on each render so index is deterministic per message
  nextArtIdxRef.current = 0;
  
  const openArtifact = React.useCallback((artIdx, lang, codeSnapshot) => {
    context?.setActiveArtifact({ msgIdx, artIdx, lang, codeSnapshot: codeSnapshot || '' });
  }, [msgIdx, context]);

  // Pass isStreaming into context so CodeBlock can suppress stepper while streaming
  const isStreaming = context?.isStreaming;
  const isThisStreamingMsg = isStreaming && msgIdx === (context?.messages?.length ?? 0) - 1;

  return (
    <div className={`message-row ${msg.role}`}>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {cleanMarkdown(msg.reasoning_content)}
                  </ReactMarkdown>
                </div>
              </details>
            )}
            {msg.content && (
              <div className="markdown-body">
                <ArtifactContext.Provider value={{ ...context, openArtifact, nextArtIdxRef, isStreaming: isThisStreamingMsg }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {cleanMarkdown(msg.content)}
                  </ReactMarkdown>
                </ArtifactContext.Provider>
              </div>
            )}
            
            {/* END OF CONVERSATION ARTIFACTS BLOCK — only shown after streaming completes */}
            {msg.role === 'assistant' && artifacts.length > 0 && !isThisStreamingMsg && (
               <div className="message-artifacts-bottom">
                  {artifacts.map((art, idx) => {
                     return (
                        <div key={idx} className="artifact-file-card" onClick={() => openArtifact(idx, art.lang, art.code)}>
                           <div className="artifact-file-left">
                              <div className="artifact-file-icon">
                                 <FileCode size={18} strokeWidth={1.5} />
                              </div>
                              <div className="artifact-file-info">
                                <div className="artifact-file-title" title={art.fileName}>{art.fileName}</div>
                                <div className="artifact-file-lang">{art.lang.toUpperCase()} code</div>
                              </div>
                           </div>
                           <button 
                             className="artifact-file-download" 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               const blob = new Blob([art.code], { type: 'text/plain' });
                               const url = URL.createObjectURL(blob);
                               const a = document.createElement('a');
                               a.href = url;
                               a.download = art.fileName;
                               a.click();
                               URL.revokeObjectURL(url);
                             }}
                           >
                             Download
                           </button>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>

      {msg.role === 'user' && (
         <div className="message-avatar user">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom deep comparison to ignore object reference changes if simple token strings match
  return prevProps.msg.content === nextProps.msg.content 
         && prevProps.msg.reasoning_content === nextProps.msg.reasoning_content 
         && prevProps.msg.isError === nextProps.msg.isError;
});

const Dashboard = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeArtifact, setActiveArtifact] = useState(null); // Artifact system
  const [artifactDropdownOpen, setArtifactDropdownOpen] = useState(false);
  const [artifactWidth, setArtifactWidth] = useState(500);
  const isResizingRef = useRef(false);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 350 && newWidth < window.innerWidth - 450) {
        setArtifactWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
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
        activeStreamIdRef.current = null; // Sever DOM sync to push active rendering to background
        setIsStreaming(false); // Reset UI visually for the new chat
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
    
    // Preload speech synthesis voices on mount so they are ready
    if (window.speechSynthesis) {
       window.speechSynthesis.getVoices();
    }
    
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  
  const messagesEndRef = useRef(null);
  const chatThreadRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const activeStreamIdRef = useRef(null); // Tracks the unique ID of the currently focused UI stream
  
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [recentChats, setRecentChats] = useState([]);
  const [currentFileId, setCurrentFileId] = useState(null);
  const currentFileIdRef = useRef(null); // Add ref for fileId
  const backgroundStreamsRef = useRef({}); // Tracks raw token buffers for background generators
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);
  const handleSubmitRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const lastInputWasVoiceRef = useRef(false);
  
  // Auto-submit after dictation ends naturally
  useEffect(() => {
    if (autoSubmitPending) {
        setAutoSubmitPending(false);
        if (input.trim() && !isStreaming) {
            // Mimic an event object to pass e.preventDefault traps
            if (handleSubmitRef.current) handleSubmitRef.current({ preventDefault: () => {} }, { fromVoice: true });
        }
    }
  }, [autoSubmitPending, input, isStreaming]);
  
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
        
        // Re-attach to an active background stream if one exists for this file
        const bgStream = backgroundStreamsRef.current[fileId];
        if (bgStream) {
            parsedMessages.push({
                role: 'assistant',
                content: bgStream.content,
                reasoning_content: bgStream.reasoning
            });
            activeStreamIdRef.current = bgStream.trackerId;
            setIsStreaming(true);
        } else {
            activeStreamIdRef.current = null; // Decouple DOM from any active background generators
            setIsStreaming(false);
        }
        
        setMessages(parsedMessages);
        setCurrentFileId(fileId);
        if (window.innerWidth <= 768) setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to load chat", err);
    }
  };

  const autoSaveToDrive = async (msgsToSave, overrideFileId = undefined, trackerId = null) => {
    try {
      const accessToken = localStorage.getItem('access');
      const googleToken = localStorage.getItem('google_access_token');
      if (!accessToken || !googleToken) return;

      setIsSaving(true);
      const fileIdToUse = overrideFileId !== undefined ? overrideFileId : currentFileIdRef.current;
      
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
          // generic save (new chat). Only set currentFileId if we haven't navigated away from this context
          if (!trackerId || activeStreamIdRef.current === trackerId) {
             setCurrentFileId(data.file_id);
          }
          fetchRecentChats(); // Refresh sidebar with new file
        }
        return data.file_id;
      }
      return null;
    } catch (err) {
      console.error("Auto-save failed", err);
      return null;
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

  const handleScroll = () => {
    if (chatThreadRef.current) {
        const chatThread = chatThreadRef.current;
        const { scrollTop, scrollHeight, clientHeight } = chatThread;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        setAutoScroll(isNearBottom);

        // ── Copy button scroll tracking ──
        // Update position of ALL copy buttons inside code blocks
        const threadRect = chatThread.getBoundingClientRect();
        
        const btns = chatThread.querySelectorAll('.code-copy-btn');
        btns.forEach(btn => {
          const wrapper = btn.closest('.code-block-wrapper');
          if (!wrapper) return;
          
          const wRect = wrapper.getBoundingClientRect();
          const btnH = btn.offsetHeight || 32;
          
          // Calculate relative position: how far is the top of the code block 
          // above or below the inside top of the chat area?
          const relativeTop = wRect.top - threadRect.top;
          
          // If the code block's top has scrolled above the chat thread's visible top area (plus a small margin)
          // AND the bottom of the code block hasn't scrolled past the chat thread's top yet
          if (relativeTop < 0 && wRect.bottom > threadRect.top + btnH + 16) {
            // Slide it down to compensate for the scroll amount
            btn.style.top = Math.round(Math.abs(relativeTop) + 8) + 'px';
          } else {
            // Code block is fully visible or entirely off-screen
            btn.style.top = '8px';
          }
        });
    }
  };



  const scrollToBottom = () => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
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

  const toggleListening = () => {
    if (isListening) {
      manualStopRef.current = true;
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    manualStopRef.current = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not natively support Speech Recognition.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    const originalInput = input.trim();
    let finalTranscript = '';
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const combined = originalInput + (originalInput && (finalTranscript || interimTranscript) ? ' ' : '') + finalTranscript + interimTranscript;
      setInput(combined);
      
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      
      if (combined.trim()) {
         silenceTimeoutRef.current = setTimeout(() => {
             if (recognitionRef.current) {
                 manualStopRef.current = false;
                 recognitionRef.current.stop();
             }
         }, 2000);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (!manualStopRef.current) {
          setAutoSubmitPending(true);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsStreaming(false);
  };

  const speakChunk = (text) => {
    if (!window.speechSynthesis || !text) return;
    
    // Remove markdown symbols to make speech sound natural
    const cleanText = text.replace(/[*#`_]/g, '').trim();
    if (!cleanText) return;
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    
    // Attempt to find a high-quality human voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = voices.filter(v => 
       v.name.includes('Google US English') || 
       v.name.includes('Microsoft Aria') ||
       v.name.includes('Samantha') || 
       v.name.includes('Google UK English Female') ||
       v.name.includes('Microsoft Jenny') ||
       v.name.includes('Microsoft Guy')
    );
    
    if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e, options = { fromVoice: false }) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedFile) || isStreaming) return;
    
    lastInputWasVoiceRef.current = options.fromVoice;

    // Clear any leftover TTS queue whenever a new prompt starts
    if (window.speechSynthesis) {
       window.speechSynthesis.cancel();
    }
    
    setAutoScroll(true); // Force scroll to bottom on new message

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
    
    // System constraint for grammatical correctness natively
    apiMessages.unshift({
        role: 'system',
        content: "You are DocMind AI. The user may be utilizing speech-to-text dictation. You must ensure all generated responses are perfectly grammatically correct, highly coherent, and clearly formatted."
    });
    
    apiMessages.push(newUserMessage);

    const streamTrackerId = Date.now().toString();
    let startingFileId = currentFileIdRef.current;

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '', reasoning_content: '' }]);

      const token = localStorage.getItem('access');
      
      abortControllerRef.current = new AbortController();
      
      activeStreamIdRef.current = streamTrackerId;
      
      // Proactive save for new chats so it appears in sidebar immediately
      if (!startingFileId) {
          startingFileId = await autoSaveToDrive([...apiMessages], undefined, streamTrackerId);
      }

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
      let speechBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        let hasUpdates = false;
        
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
                  speechBuffer += delta.content;
                  
                  // Live TTS Sentence Tokenizer
                  let match = speechBuffer.match(/([.?!:\n]+)(\s+|$)/);
                  while (match) {
                      const splitIndex = match.index + match[1].length;
                      const sentence = speechBuffer.slice(0, splitIndex);
                      if (activeStreamIdRef.current === streamTrackerId && !abortControllerRef.current?.signal.aborted) {
                          if (lastInputWasVoiceRef.current) speakChunk(sentence);
                      }
                      speechBuffer = speechBuffer.slice(splitIndex);
                      match = speechBuffer.match(/([.?!:\n]+)(\s+|$)/);
                  }
                  
                  hasUpdates = true;
                }
                if (delta.reasoning_content) {
                  assistantReasoning += delta.reasoning_content;
                  hasUpdates = true;
                }
              }
            } catch (err) {
              console.warn('Error parsing JSON from stream', err, dataStr);
            }
          }
        }

        // Directly mutating state without artificial timeout.
        // React 18's async batching and our MemoizedMessageRow will handle rendering safely.
        if (hasUpdates) {
          if (startingFileId) {
              backgroundStreamsRef.current[startingFileId] = {
                  content: assistantContent,
                  reasoning: assistantReasoning,
                  trackerId: streamTrackerId
              };
          }

          if (activeStreamIdRef.current === streamTrackerId) {
            setMessages(prev => {
              const newMsgs = [...prev];
              const lastMsg = { ...newMsgs[newMsgs.length - 1] };
              
              lastMsg.content = assistantContent;
              lastMsg.reasoning_content = assistantReasoning;
              
              newMsgs[newMsgs.length - 1] = lastMsg;
              return newMsgs;
            });
          }
        }
      }
      
      // Stream finished. Force explicit final sync to catch unrendered stragglers
      if (activeStreamIdRef.current === streamTrackerId) {
        setMessages(prev => {
           const newMsgs = [...prev];
           const lastMsg = { ...newMsgs[newMsgs.length - 1] };
           lastMsg.content = assistantContent;
           lastMsg.reasoning_content = assistantReasoning;
           newMsgs[newMsgs.length - 1] = lastMsg;
           return newMsgs;
        });
      }

      const finalAssistantMessage = {
          role: 'assistant',
          content: assistantContent,
          reasoning_content: assistantReasoning
      };
      
      const sessionMessagesToSave = [...apiMessages, finalAssistantMessage];
      autoSaveToDrive(sessionMessagesToSave, startingFileId, streamTrackerId);
      
      // Auto-speak any remainder text that didn't hit a punctuation mark
      if (activeStreamIdRef.current === streamTrackerId && speechBuffer.trim() && !abortControllerRef.current?.signal.aborted) {
          if (lastInputWasVoiceRef.current) speakChunk(speechBuffer);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
         console.log("Stream manually aborted by stop button");
         // User hit Stop. Wait, if it was manually aborted, we shouldn't save the aborted state 
         // without the assistant message. Handle it below:
         autoSaveToDrive(messagesRef.current, startingFileId, streamTrackerId);
      } else {
         console.error('Chat error:', error);
         setMessages(prev => {
           // Only inject error if we are still on the original screen
           if (activeStreamIdRef.current !== streamTrackerId) return prev;
           const newMsgs = [...prev];
           const lastMsg = newMsgs[newMsgs.length - 1];
           lastMsg.content = 'Sorry, there was an error communicating with the AI. Please try again.';
           lastMsg.isError = true;
           return newMsgs;
         });
      }
    } finally {
      if (startingFileId) delete backgroundStreamsRef.current[startingFileId];
      
      if (activeStreamIdRef.current === streamTrackerId) {
        setIsStreaming(false);
      }
    }
  };

  // Update handle submit ref natively for closure safety to defeat stale closures in auto-submit
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  if (loading || !user) return <div className={`claude-dashboard setup-phase ${colorMode === 'light' ? 'theme-light' : ''} font-${chatFont}`}></div>;

  return (
    <ArtifactContext.Provider value={{ activeArtifact, setActiveArtifact, messages, isStreaming }}>
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

        <button className="new-chat-btn" onClick={() => { 
            activeStreamIdRef.current = null;
            setIsStreaming(false);
            setMessages([]); 
            setCurrentFileId(null); 
        }} title="New chat (Ctrl+Shift+O)">
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

        <div className="workspace-body">
        <div className={`workspace-content ${messages.length === 0 ? 'empty' : ''}`}>
          
          {/* EMPTY STATE */}
          {messages.length === 0 && (
            <div className="welcome-state">
              <div className="greeting">
                <Sparkles size={32} className="greeting-sparkle" />
                <h1>
                  {(() => {
                    const hour = new Date().getHours();
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = days[new Date().getDay()];
                    let timeGreeting = '';
                    if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
                    else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
                    else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
                    else timeGreeting = `Late night ${dayName} session`;
                    
                    const nameToDisplay = user?.first_name || (user?.email ? user.email.split('@')[0] : 'DocMind');
                    return `${timeGreeting}, ${nameToDisplay}`;
                  })()}
                </h1>
              </div>
            </div>
          )}

          {/* CHAT HISTORY */}
          {messages.length > 0 && (
             <div className="chat-thread" ref={chatThreadRef} onScroll={handleScroll}>
                {messages.map((msg, index) => (
                   <MemoizedMessageRow key={index} msg={msg} user={user} msgIdx={index} />
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
                     
                     {isListening && (
                       <button 
                         className="mic-btn active"
                         onClick={toggleListening}
                         style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}
                         title="Stop dictating and clear"
                       >
                          <div style={{ backgroundColor: '#e57373', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MicOff size={18} color="white" strokeWidth={2} />
                          </div>
                       </button>
                     )}

                     {isListening || (isStreaming && lastInputWasVoiceRef.current) ? (
                        <button 
                          className="submit-btn stop"
                          onClick={() => {
                              if (isListening) {
                                  manualStopRef.current = true;
                                  if (recognitionRef.current) recognitionRef.current.stop();
                                  setIsListening(false);
                                  setAutoSubmitPending(true); // force send
                              } else {
                                  handleStop();
                              }
                          }}
                          title={isListening ? "Finish dictating and send" : "Stop speaking"}
                          style={{ backgroundColor: '#244b7a', color: '#88bbfb', borderRadius: '8px', padding: '0 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '4px', width: 'auto', border: 'none', outline: 'none', cursor: 'pointer' }}
                        >
                           <span style={{ fontSize: '18px', letterSpacing: '1px', lineHeight: '1', paddingBottom: '4px' }}>•••</span> <span style={{ fontSize: '14px', fontWeight: '500' }}>Stop</span>
                        </button>
                     ) : isStreaming ? (
                        <button 
                          key="stop-btn"
                          className="submit-btn stop"
                          onClick={handleStop}
                          title="Stop generating"
                        >
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <circle cx="12" cy="12" r="9" />
                             <rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
                           </svg>
                        </button>
                     ) : (
                        <button 
                          key="send-btn"
                          className={`submit-btn ${input.trim() || attachedFile ? 'active' : 'idle'}`}
                          onClick={(e) => {
                             if (input.trim() || attachedFile) {
                                handleSubmit(e);
                             } else {
                                toggleListening();
                             }
                          }}
                          title={input.trim() || attachedFile ? "Send message" : "Voice dictate"}
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

        {/* RIGHT PANEL ARTIFACT */}
        {activeArtifact && (() => {
           // Derive live code from messages — updates automatically when messages change during streaming
           const liveMsg = messages[activeArtifact.msgIdx];
           const liveArtifacts = liveMsg ? extractArtifacts(liveMsg.content) : [];
           // Fingerprint match: find artifact whose code starts with the stored snapshot prefix
           const fingerprint = (activeArtifact.codeSnapshot || '').slice(0, 80);
           const liveArt = fingerprint
             ? (liveArtifacts.find(a => a.code.startsWith(fingerprint)) ?? liveArtifacts[activeArtifact.artIdx])
             : liveArtifacts[activeArtifact.artIdx];
           // Always fall back to the snapshot stored at click time so no "Generating code..."
           const rawLiveCode = (liveArt?.code && liveArt.code.length >= (activeArtifact.codeSnapshot || '').length)
             ? liveArt.code
             : (activeArtifact.codeSnapshot || liveArt?.code || '');
           const liveCode = rawLiveCode.replace(/^(?:#|\/\/|<!--|\/\*)\s*filename:\s*\S+.*\n?/i, '');
           const liveLang = liveArt?.lang ?? activeArtifact.lang ?? 'text';
           
           return (
           <>
              <div 
                className="artifact-resizer" 
                onMouseDown={(e) => {
                   e.preventDefault();
                   isResizingRef.current = true;
                   document.body.style.cursor = 'col-resize';
                }}
              />
              <div className="artifact-side-panel" style={{ width: `${artifactWidth}px`, maxWidth: 'none' }}>
                 <div className="artifact-panel-header" style={{ justifyContent: 'space-between' }}>
                    <div className="artifact-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <div className="artifact-header-title" style={{ marginRight: '4px' }}>
                         {liveArt?.fileName || `artifact.${liveLang}`}
                       </div>
                       {isStreaming && activeArtifact.msgIdx === messages.length - 1 && (
                           <div className="artifact-header-live">
                              <div className="artifact-header-live-dot"></div>
                              Live
                           </div>
                       )}
                    </div>
                    <div className="artifact-header-actions" style={{ gap: '6px', display: 'flex', alignItems: 'center' }}>
                        <div className="artifact-dropdown">
                           <button 
                             className="artifact-dropdown-btn left" 
                             onClick={() => navigator.clipboard.writeText(liveCode)} 
                             title="Copy"
                           >
                             Copy
                           </button>
                           <button 
                             className="artifact-dropdown-btn right"
                             onClick={(e) => {
                               e.stopPropagation();
                               setArtifactDropdownOpen(!artifactDropdownOpen);
                             }}
                             title="More Options"
                           >
                             <ChevronDown size={14} style={{ transform: artifactDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                           </button>
                           {artifactDropdownOpen && (
                             <div className="artifact-dropdown-content" style={{ display: 'flex' }}>
                               <button className="artifact-dropdown-item" onClick={() => {
                                  const blob = new Blob([liveCode], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = liveArt?.fileName || `artifact.${liveLang}`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                  setArtifactDropdownOpen(false);
                               }}>
                                  Download
                               </button>
                               <button className="artifact-dropdown-item" onClick={() => setArtifactDropdownOpen(false)}>Publish artifact</button>
                             </div>
                           )}
                        </div>
                        <button className="artifact-action-btn" title="Refresh">
                          <RotateCcw size={15} />
                        </button>
                        <button className="artifact-action-btn close" onClick={() => setActiveArtifact(null)} title="Close">
                          <X size={16} />
                        </button>
                     </div>
                 </div>
                 <div className="artifact-panel-body">
                    {liveCode ? (
                      <SyntaxHighlighter
                         children={liveCode}
                         language={liveLang}
                         style={customOneDark}
                         PreTag="div"
                         showLineNumbers={true}
                         customStyle={{
                           margin: 0,
                           background: 'transparent',
                           padding: '16px',
                           fontSize: '0.86em',
                           lineHeight: '1.5',
                           fontFamily: "'Fira Code', 'Consolas', monospace",
                         }}
                      />
                    ) : (
                      <div style={{ padding: '16px', color: '#888', fontSize: '0.9rem' }}>Generating code...</div>
                    )}
                 </div>
              </div>
           </>
           );
        })()}
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
    </ArtifactContext.Provider>
  );
};

export default Dashboard;
