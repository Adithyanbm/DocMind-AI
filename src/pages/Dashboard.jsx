import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Menu, Plus, Search, MessageSquare, Settings, ArrowUp, X, HardDrive,
  ChevronDown, ChevronRight, Sparkles, Paperclip, Camera, FolderPlus, Book, Blocks, Globe, PenTool,
  Mic, MicOff, Star, Pencil, Trash2, Layers, Compass, MessageCircle, GraduationCap, Heart, Lightbulb
} from 'lucide-react';

import SettingsModal from '../components/SettingsModal';
import { ArtifactContext } from '../components/Dashboard/DashboardContext';
import { Sidebar } from '../components/Dashboard/Sidebar';
import { ArtifactPanel } from '../components/Dashboard/ArtifactPanel';
import { MemoizedMessageRow, StaticStitchLogo, StitchLogo } from '../components/Dashboard/MessageRow';
import { useSpeech } from '../hooks/useSpeech';
import { generatePDFThumbnail } from '../utils/pdfUtils';
import * as chatService from '../services/chatService';
import './Dashboard.css';

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  const dateStr = date.toDateString();
  const nowStr = now.toDateString();
  if (dateStr === nowStr) return 'Today';
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dateStr === yesterday.toDateString()) return 'Yesterday';
  
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) return 'Past week';
  if (diffDays <= 30) return 'Past month';
  return 'Past year';
};

const Dashboard = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();

  // -- State & Refs --
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [artifactDropdownOpen, setArtifactDropdownOpen] = useState(false);
  const [artifactWidth, setArtifactWidth] = useState(null);
  const [artifactCopied, setArtifactCopied] = useState(false);
  const [artifactRefreshing, setArtifactRefreshing] = useState(false);
  const isResizingRef = useRef(false);

  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const artifactScrollRef = useRef(null);
  const userScrolledArtifactRef = useRef(false);

  const [input, setInput] = useState('');
  const [previewInput, setPreviewInput] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTemplateMenu, setActiveTemplateMenu] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTitleMenu, setShowTitleMenu] = useState(false);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState('');
  const renameTitleRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [colorMode, setColorMode] = useState(() => localStorage.getItem('docmind_colorMode') || 'dark');
  const [chatFont, setChatFont] = useState(() => localStorage.getItem('docmind_chatFont') || 'default');
  const [backgroundAnimation, setBackgroundAnimation] = useState(() => localStorage.getItem('docmind_bgAnim') || 'auto');
  const [voiceSetting, setVoiceSetting] = useState(() => localStorage.getItem('docmind_voice') || 'buttery');

  const messagesEndRef = useRef(null);
  const chatThreadRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const activeStreamIdRef = useRef(null);

  const [autoScroll, setAutoScroll] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [recentChats, setRecentChats] = useState([]);
  const [currentFileId, setCurrentFileId] = useState(null);
  const currentFileIdRef = useRef(null);
  const backgroundStreamsRef = useRef({});
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const handleSubmitRef = useRef(null);

  // -- Hooks --
  const {
    isListening,
    isAiSpeaking,
    toggleListening,
    speakChunk,
    stopSpeaking,
    lastInputWasVoiceRef,
    manualStopRef,
    recognitionRef,
    setAutoSubmitPending,
    setIsListening
  } = useSpeech(input, setInput, isStreaming, handleSubmitRef);

  // -- Effects & Sync --
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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    currentFileIdRef.current = currentFileId;
  }, [currentFileId]);

  // -- Resizing Artifact Panel --
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
        const resizer = document.querySelector('.artifact-resizer');
        if (resizer) resizer.classList.remove('is-dragging');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // -- Global Keyboard Shortcuts --
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyO') {
        e.preventDefault();
        newChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'Comma' || e.key === '<' || e.key === ',')) {
        e.preventDefault();
        setIsSettingsModalOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyU') {
        e.preventDefault();
        if (fileInputRef.current) fileInputRef.current.click();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // -- Handlers --
  const newChat = () => {
    activeStreamIdRef.current = null;
    setIsStreaming(false);
    setMessages([]);
    setCurrentFileId(null);
    setActiveArtifact(null);
    setChatTitle('');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const fetchRecentChats = async () => {
    try {
      const googleToken = localStorage.getItem('google_access_token');
      if (!googleToken) return;

      const data = await chatService.fetchHistory(googleToken);
      if (data.success) {
        setRecentChats(data.files);
      }
    } catch (err) {
      console.error("Failed to fetch recent chats", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchRecentChats();
  }, [isAuthenticated]);

  const loadChat = async (fileId) => {
    try {
      setActiveArtifact(null);
      const googleToken = localStorage.getItem('google_access_token');
      const data = await chatService.fetchChatContent(fileId, googleToken);

      if (data.success) {
        const parsedMessages = [];
        const blocks = data.content.split(/\*\*(You|DocMind AI):\*\*/).filter(Boolean);

        for (let i = 1; i < blocks.length; i += 2) {
          const role = blocks[i].trim() === 'You' ? 'user' : 'assistant';
          let content = blocks[i + 1]?.trim() || '';

          if (content && !content.startsWith("# DocMind AI")) {
            let apiContent = content;
            let attachmentData = null;
            let attachmentBase64 = null;
            let attachmentType = null;
            let attachment = null;
            let attachmentNumPages = 0;

            // 0. Extract Timestamp if present
            let timestamp = null;
            const tsMatch = content.match(/<!-- TIMESTAMP: (.*?) -->/);
            if (tsMatch) {
              timestamp = tsMatch[1];
              content = content.replace(tsMatch[0], '').trim();
            }

            // 0b. Extract Versions if present
            let versions = null;
            let activeVersionIndex = 0;
            const verMatch = content.match(/<!-- VERSIONS: (.*?) -->/);
            if (verMatch) {
              try {
                const b64 = verMatch[1];
                const jsonStr = atob(b64);
                versions = JSON.parse(jsonStr);
                activeVersionIndex = versions.length - 1;
                content = content.replace(verMatch[0], '').trim();
              } catch (e) {
                console.error("Failed to parse versions metadata", e);
              }
            }

            // 1. Check for Image Attachments
            const imgRegex = new RegExp("!\\[Attached Image\\]\\((data:image/[^;]+;base64,[^)]+)\\)");
            const imgMatch = content.match(imgRegex);
            if (role === 'user' && imgMatch) {
              const base64Url = imgMatch[1];
              content = content.replace(imgMatch[0], '').trim();
              attachmentData = base64Url;
              attachmentType = "image/png"; // Default to png if unknown, will work for previews
              attachment = "Uploaded Image";
              apiContent = [
                { type: "text", text: content || "Analyze this image." },
                { type: "image_url", image_url: { url: base64Url } }
              ];
            }

            // 2. Check for PDF Attachments (Metadata + Preview)
            const pdfMetaRegex = /<!-- PDF_METADATA: (\{.*?\}) -->/;
            const pdfPreviewRegex = /!\[PDF Preview\]\((data:image\/[^;]+;base64,[^)]+)\)/;
            const metaMatch = content.match(pdfMetaRegex);
            const previewMatch = content.match(pdfPreviewRegex);

            if (role === 'user' && metaMatch) {
              try {
                const meta = JSON.parse(metaMatch[1]);
                attachment = meta.name;
                attachmentType = meta.type || "application/pdf";
                attachmentNumPages = meta.pages || 0;
                attachmentBase64 = meta.base64;
                
                if (previewMatch) {
                  attachmentData = previewMatch[1];
                  content = content.replace(previewMatch[0], '');
                }
                
                content = content.replace(metaMatch[0], '').trim();
                
                // Clean up any remaining "[PDF Attachment: ...]" text
                content = content.replace(/\[PDF Attachment:.*?\]/, '').trim();

                apiContent = [
                  { type: "text", text: content || "Analyze this PDF." },
                  { type: "file", file_url: { url: `data:${attachmentType};base64,${attachmentBase64}`, name: attachment } }
                ];
              } catch (e) {
                console.error("Failed to parse PDF metadata", e);
              }
            }

            parsedMessages.push({ 
              role, 
              content, 
              apiContent, 
              attachment, 
              attachmentBase64,
              timestamp,
              versions,
              activeVersionIndex
            });
          }
        }

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
          activeStreamIdRef.current = null;
          setIsStreaming(false);
        }

        setMessages(parsedMessages);
        setCurrentFileId(fileId);
        // Derive chat title from the file name in recentChats
        const chatFile = recentChats.find(c => c.id === fileId);
        if (chatFile) {
          const title = chatFile.name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ');
          setChatTitle(title);
        }
        if (window.innerWidth <= 768) setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to load chat", err);
    }
  };

  const autoSaveToDrive = async (msgsToSave, overrideFileId = undefined, trackerId = null) => {
    try {
      const googleToken = localStorage.getItem('google_access_token');
      if (!googleToken) return;

      setIsSaving(true);
      const fileIdToUse = overrideFileId !== undefined ? overrideFileId : currentFileIdRef.current;
      const data = await chatService.saveToDrive(msgsToSave, googleToken, fileIdToUse);

      if (data.success && data.file_id) {
        if (!fileIdToUse) {
          if (!trackerId || activeStreamIdRef.current === trackerId) {
            setCurrentFileId(data.file_id);
            // Derive chat title from the saved file name
            if (data.name) {
              const title = data.name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ');
              setChatTitle(title);
            }
          }
          fetchRecentChats();
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
    if (e) e.stopPropagation();
    try {
      const googleToken = localStorage.getItem('google_access_token');
      if (!googleToken) return;

      const data = await chatService.deleteHistory(fileId, googleToken);
      if (data.success) {
        if (currentFileId === fileId) {
          setMessages([]);
          setCurrentFileId(null);
          setChatTitle('');
        }
        fetchRecentChats();
      }
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleRenameChat = async (newName) => {
    if (!currentFileId || !newName.trim()) return;
    try {
      const googleToken = localStorage.getItem('google_access_token');
      if (!googleToken) return;
      const data = await chatService.renameChat(currentFileId, newName.trim(), googleToken);
      if (data.success) {
        setChatTitle(newName.trim());
        fetchRecentChats();
      }
    } catch (err) {
      console.error("Failed to rename chat", err);
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/signin');
  }, [isAuthenticated, loading, navigate]);

  const handleScroll = () => {
    if (chatThreadRef.current) {
      const chatThread = chatThreadRef.current;
      const { scrollTop, scrollHeight, clientHeight } = chatThread;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setAutoScroll(isNearBottom);

      const threadRect = chatThread.getBoundingClientRect();
      const btns = chatThread.querySelectorAll('.code-copy-btn');
      btns.forEach(btn => {
        const wrapper = btn.closest('.code-block-wrapper');
        if (!wrapper) return;
        const wRect = wrapper.getBoundingClientRect();
        const btnH = btn.offsetHeight || 32;
        const relativeTop = wRect.top - threadRect.top;
        if (relativeTop < 0 && wRect.bottom > threadRect.top + btnH + 16) {
          btn.style.top = Math.round(Math.abs(relativeTop) + 8) + 'px';
        } else {
          btn.style.top = '8px';
        }
      });
    }
  };

  const scrollToBottom = () => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

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

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsAttachmentLoading(true);
      try {
        const base64String = await fileToBase64(file);
        let thumbnail = null;
        let numPages = 0;
        if (file.type === 'application/pdf') {
          const result = await generatePDFThumbnail(base64String);
          if (result) {
            thumbnail = result.thumbnail;
            numPages = result.numPages;
          }
        }
        
        setTimeout(() => {
          setAttachedFile({ 
            name: file.name, 
            type: file.type, 
            size: file.size, 
            base64: base64String,
            thumbnail: thumbnail,
            numPages: numPages
          });
          setIsAttachmentLoading(false);
        }, 1200);
      } catch (err) { 
        console.error("Failed to convert file to base64", err);
        setIsAttachmentLoading(false);
      }
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          setIsAttachmentLoading(true);
          try {
            const base64String = await fileToBase64(file);
            let fileName = file.name || `Screenshot ${new Date().toLocaleTimeString(undefined, { hour12: false })}.png`;
            setTimeout(() => {
              setAttachedFile({ name: fileName, type: file.type, size: file.size, base64: base64String });
              setIsAttachmentLoading(false);
            }, 3000);
          } catch (err) { 
            console.error("Failed to convert pasted image to base64", err);
            setIsAttachmentLoading(false);
          }
        }
        break;
      }
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStop = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    stopSpeaking();
    setIsStreaming(false);
  };

  const handleSubmit = async (e, options = { fromVoice: false, retryIndex: null }) => {
    if (e) e.preventDefault();
    if (isStreaming) return;

    let displayUserMessage;
    let messagesToMap = [];

    if (options.editIndex !== null && options.editIndex !== undefined) {
      const targetIdx = options.editIndex;
      const oldMsg = messages[targetIdx];
      
      // Update history/versions
      const newVersion = { 
        content: options.editContent, 
        apiContent: options.editContent, // Simplify for now
        timestamp: new Date().toISOString() 
      };
      
      const versions = oldMsg.versions || [{ 
        content: oldMsg.content, 
        apiContent: oldMsg.apiContent, 
        assistantResponse: messages[targetIdx + 1],
        timestamp: oldMsg.timestamp 
      }];
      
      const updatedVersions = [...versions, newVersion];
      
      displayUserMessage = { 
        ...oldMsg, 
        content: options.editContent, 
        apiContent: options.editContent,
        versions: updatedVersions,
        activeVersionIndex: updatedVersions.length - 1,
        timestamp: new Date().toISOString()
      };
      
      messagesToMap = [...messages.slice(0, targetIdx), displayUserMessage];
      setMessages(messagesToMap);
      setInput('');
      setAttachedFile(null);
    } else if (options.retryIndex !== null && options.retryIndex !== undefined) {
      // If clicking retry on an Assistant message, we want to resend the User message above it
      // If clicking retry on a User message, we want to resend that Specific User message
      const targetUserIdx = messages[options.retryIndex].role === 'user' ? options.retryIndex : options.retryIndex - 1;
      
      if (targetUserIdx < 0 || messages[targetUserIdx].role !== 'user') return;
      
      const targetUserMsg = messages[targetUserIdx];
      messagesToMap = messages.slice(0, targetUserIdx); // Get everything BEFORE the user message
      
      // Resend the targeted user message
      displayUserMessage = { ...targetUserMsg, timestamp: new Date().toISOString() };
      messagesToMap = [...messagesToMap, displayUserMessage];
      setMessages(messagesToMap);
      
      // Use the original content for API but reset user input field safely
      setInput(''); 
      setAttachedFile(null);
    } else {
      if (!input.trim() && !attachedFile) return;

      let apiContent = input;
      if (attachedFile && attachedFile.type.startsWith('image/')) {
        apiContent = [
          { type: "text", text: input || "Analyze this image." },
          { type: "image_url", image_url: { url: `data:${attachedFile.type};base64,${attachedFile.base64}` } }
        ];
      } else if (attachedFile && attachedFile.type === 'application/pdf') {
        apiContent = [
          { type: "text", text: input || "Analyze this PDF." },
          { type: "file", file_url: { url: `data:${attachedFile.type};base64,${attachedFile.base64}`, name: attachedFile.name } }
        ];
      } else if (attachedFile) {
        apiContent = `[Attached File: ${attachedFile.name}]\n[File Content / Data]\n\n${input}`;
      }

      displayUserMessage = {
        role: 'user', 
        content: input, 
        attachment: attachedFile ? attachedFile.name : null,
        attachmentType: attachedFile ? attachedFile.type : null,
        attachmentData: attachedFile 
          ? (attachedFile.type.startsWith('image/') 
              ? `data:${attachedFile.type};base64,${attachedFile.base64}` 
              : (attachedFile.thumbnail || null))
          : null,
        attachmentNumPages: attachedFile?.numPages || 0,
        attachmentBase64: (attachedFile && !attachedFile.type.startsWith('image/')) ? attachedFile.base64 : null,
        numPages: (attachedFile && attachedFile.numPages) || 0,
        apiContent: apiContent,
        timestamp: new Date().toISOString()
      };

      messagesToMap = [...messages, displayUserMessage];
      setMessages(messagesToMap);
      setInput('');
      setAttachedFile(null);
    }

    setActiveArtifact(null);
    lastInputWasVoiceRef.current = options.fromVoice;
    stopSpeaking();
    setAutoScroll(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsStreaming(true);

    const apiMessages = messagesToMap.map(m => ({
      role: m.role,
      content: m.apiContent || m.content
    }));

    apiMessages.unshift({
      role: 'system',
      content: "You are DocMind AI. The user may be utilizing speech-to-text dictation. You must ensure all generated responses are perfectly grammatically correct, highly coherent, and clearly formatted."
    });

    const streamTrackerId = Date.now().toString();
    let startingFileId = currentFileIdRef.current;

    try {
      setMessages([...messagesToMap, { role: 'assistant', content: '', reasoning_content: '' }]);
      abortControllerRef.current = new AbortController();
      activeStreamIdRef.current = streamTrackerId;

      if (!startingFileId) startingFileId = await autoSaveToDrive([...messagesToMap], undefined, streamTrackerId);

      const response = await chatService.getChatCompletions(apiMessages, abortControllerRef.current.signal);

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
            } catch (err) { console.warn('Error parsing JSON from stream', err, dataStr); }
          }
        }

        if (hasUpdates) {
          if (startingFileId) backgroundStreamsRef.current[startingFileId] = { content: assistantContent, reasoning: assistantReasoning, trackerId: streamTrackerId };
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

      const assistantMsg = { role: 'assistant', content: assistantContent, reasoning_content: assistantReasoning };

      // Update the user message in our local messages array to store the finished assistant response in its versions
      setMessages(prev => {
        const newMsgs = [...prev];
        // Find the user message that initiated this
        for (let i = newMsgs.length - 1; i >= 0; i--) {
          if (newMsgs[i].role === 'user' && newMsgs[i].versions) {
            const activeIdx = newMsgs[i].activeVersionIndex ?? 0;
            if (newMsgs[i].versions[activeIdx]) {
              newMsgs[i].versions[activeIdx].assistantResponse = assistantMsg;
            }
            break;
          }
        }
        return newMsgs;
      });

      autoSaveToDrive([...messagesToMap, assistantMsg], startingFileId, streamTrackerId);

      if (activeStreamIdRef.current === streamTrackerId && speechBuffer.trim() && !abortControllerRef.current?.signal.aborted) {
        if (lastInputWasVoiceRef.current) speakChunk(speechBuffer);
      }
    } catch (error) {
      if (error.name === 'AbortError') autoSaveToDrive([...messagesRef.current], startingFileId, streamTrackerId);
      else {
        console.error('Chat error:', error);
        setMessages(prev => {
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
      if (activeStreamIdRef.current === streamTrackerId) setIsStreaming(false);
    }
  };

  const handleVersionSwitch = (msgIdx, versionIdx) => {
    const newMessages = [...messages];
    const msgTurn = newMessages[msgIdx];
    if (!msgTurn.versions || !msgTurn.versions[versionIdx]) return;

    msgTurn.activeVersionIndex = versionIdx;
    msgTurn.content = msgTurn.versions[versionIdx].content;
    msgTurn.apiContent = msgTurn.versions[versionIdx].apiContent;

    // When switching a user message version, we must also switch the assistant response that follows it
    const updatedMessages = newMessages.slice(0, msgIdx + 1);
    const associatedAI = msgTurn.versions[versionIdx].assistantResponse;
    if (associatedAI) {
      updatedMessages.push(associatedAI);
    }
    
    setMessages(updatedMessages);
  };

  useEffect(() => { 
    handleSubmitRef.current = handleSubmit; 
    window.dashboardHandleRetry = (idx) => handleSubmit(null, { fromVoice: false, retryIndex: idx });
    window.dashboardHandleEditSave = (idx, newContent) => handleSubmit(null, { editIndex: idx, editContent: newContent });
    window.dashboardHandleVersionSwitch = (idx, versionIdx) => handleVersionSwitch(idx, versionIdx);
    window.dashboardHandleEdit = (idx) => {
      const msg = messages[idx];
      if (msg && msg.role === 'user') {
        setInput(msg.content);
        setMessages(messages.slice(0, idx));
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    };
    window.dashboardHandlePreview = (data) => {
      setPreviewData(data);
      setIsPreviewModalOpen(true);
    };
    return () => { 
      delete window.dashboardHandleRetry; 
      delete window.dashboardHandleEdit; 
      delete window.dashboardHandlePreview;
    };
  }, [handleSubmit, messages]);

  const artifactContextValue = useMemo(() => ({ setActiveArtifact }), []);

  if (loading || !user) return <div className={`claude-dashboard setup-phase ${colorMode === 'light' ? 'theme-light' : ''} font-${chatFont}`}></div>;

  return (
    <ArtifactContext.Provider value={artifactContextValue}>
      <div className={`claude-dashboard ${colorMode === 'light' ? 'theme-light' : ''} font-${chatFont}`}>

        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setIsSearchModalOpen={setIsSearchModalOpen}
          newChat={newChat}
          searchQuery={searchQuery}
          recentChats={recentChats}
          currentFileId={currentFileId}
          loadChat={loadChat}
          deleteChat={deleteChat}
          user={user}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
          logout={logout}
        />

        <div className="claude-workspace">
          <header className="workspace-header">
            {!sidebarOpen && (
              null /* Mini sidebar handles toggle now */
            )}

            {/* Chat Title (left side, like Claude) */}
            {messages.length > 0 && chatTitle && (
              <div className="chat-title-area" style={{ position: 'relative' }}>
                {isRenamingTitle ? (
                  <input
                    ref={renameTitleRef}
                    className="chat-title-rename-input"
                    defaultValue={chatTitle}
                    autoFocus
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== chatTitle) handleRenameChat(val);
                      setIsRenamingTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.target.value.trim();
                        if (val && val !== chatTitle) handleRenameChat(val);
                        setIsRenamingTitle(false);
                      }
                      if (e.key === 'Escape') setIsRenamingTitle(false);
                    }}
                  />
                ) : (
                  <button className="chat-title-btn" onClick={() => setShowTitleMenu(!showTitleMenu)}>
                    <span className="chat-title-text">{chatTitle}</span>
                    <ChevronDown size={14} />
                  </button>
                )}

                {showTitleMenu && (
                  <>
                    <div className="attachment-overlay-invisible" onClick={() => setShowTitleMenu(false)}></div>
                    <div className="chat-title-dropdown">
                      <button className="popover-item" onClick={() => { setShowTitleMenu(false); }}>
                        <Star size={16} />
                        <span>Star</span>
                      </button>
                      <button className="popover-item" onClick={() => { setShowTitleMenu(false); setIsRenamingTitle(true); }}>
                        <Pencil size={16} />
                        <span>Rename</span>
                      </button>
                      <button className="popover-item" onClick={() => { setShowTitleMenu(false); }}>
                        <FolderPlus size={16} />
                        <span>Add to project</span>
                      </button>
                      <div className="popover-divider"></div>
                      <button className="popover-item popover-item-danger" onClick={() => { setShowTitleMenu(false); deleteChat(currentFileId); }}>
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="header-right-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: 'auto' }}>
              {isSaving && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                  <HardDrive size={14} className="saving-spinner" /> Saving to Drive...
                </div>
              )}
            </div>
          </header>

          <div className="workspace-body">
            <div className={`workspace-content ${messages.length === 0 ? 'empty' : ''}`}>
              {messages.length === 0 && (
                <div className="welcome-state">
                  <div className="greeting">
                    <StaticStitchLogo />
                    <h1>
                      {(() => {
                        const hour = new Date().getHours();
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        let timeGreeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : hour >= 17 && hour < 22 ? 'Good evening' : `Late night ${days[new Date().getDay()]} session`;
                        return `${timeGreeting}, ${user?.first_name || (user?.email ? user.email.split('@')[0] : 'DocMind')}`;
                      })()}
                    </h1>
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <div className="chat-thread" ref={chatThreadRef} onScroll={handleScroll}>
                  {messages.map((msg, index) => {
                    // Check if this is the latest assistant message.
                    const isLatest = index === messages.length - 1 || (index === messages.length - 2 && messages[messages.length - 1].role === 'user');
                    return (
                      <MemoizedMessageRow key={index} msg={msg} user={user} msgIdx={index} isThisStreamingMsg={isStreaming && index === messages.length - 1} isLatest={isLatest} />
                    );
                  })}
                  {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="message-row assistant">
                      <div className="message-avatar bot"><Bot size={18} /></div>
                      <div className="message-body"><div className="typing-dot"></div></div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="scroll-anchor" />
                </div>
              )}

              <div className="input-container-wrapper">
                {/* Placeholder for template-popup move */}

                <div className={`input-container ${messages.length === 0 ? 'new-chat-input' : 'thread-input'}`}>
                  {isAttachmentLoading && (
                    <div className="attachment-shimmer-svg">
                      <svg width="108" height="108" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="shimmer">
                            <stop offset="0%" stopColor="#3a3a3a"/>
                            <stop offset="50%" stopColor="#5a5a5a"/>
                            <stop offset="100%" stopColor="#3a3a3a"/>
                            <animateTransform
                              attributeName="gradientTransform"
                              type="translate"
                              from="-108 0"
                              to="108 0"
                              dur="1.5s"
                              repeatCount="indefinite"/>
                          </linearGradient>
                        </defs>
                        <rect x="0.5" y="0.5" width="107" height="107" rx="4" fill="#1f1f1f" stroke="#3a3a3a" strokeWidth="1"/>
                        <rect x="16" y="20" width="76" height="12" rx="6" fill="url(#shimmer)"/>
                        <rect x="16" y="38" width="60" height="12" rx="6" fill="url(#shimmer)"/>
                        <rect x="16" y="80" width="36" height="16" rx="6" fill="url(#shimmer)"/>
                      </svg>
                    </div>
                  )}

                  {!isAttachmentLoading && attachedFile && (
                    <div className="file-preview-container">
                      {attachedFile.type.startsWith('image/') ? (
                        <div className="attachment-image-preview">
                          <img src={`data:${attachedFile.type};base64,${attachedFile.base64}`} alt="preview" className="attachment-preview-large" />
                          <button className="remove-attachment-btn" onClick={removeAttachment}><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="file-preview-card" onClick={() => {
                          setPreviewData({ 
                            name: attachedFile.name, 
                            thumbnail: attachedFile.thumbnail, 
                            numPages: attachedFile.numPages 
                          });
                          setIsPreviewModalOpen(true);
                        }}>
                          <div className="file-preview-icon-wrapper">
                            {attachedFile.thumbnail ? (
                              <>
                                <img src={attachedFile.thumbnail} alt="pdf-preview" className="pdf-thumbnail" />
                                <div className="pdf-badge">PDF</div>
                              </>
                            ) : (
                              <svg className="doc-icon-svg" width="38" height="46" viewBox="0 0 110 136" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0" y="0" width="110" height="136" rx="20" fill="#2c2f2c" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
                                <path d="M70 0 L110 40 L110 116 C110 127 101 136 90 136 L20 136 C9 136 0 127 0 116 L0 20 C0 9 9 0 20 0 Z" fill="#2c2f2c"/>
                                <path d="M70 0 L70 30 C70 35 75 40 80 40 L110 40 Z" fill="rgba(255,255,255,0.1)"/>
                                <rect x="25" y="60" width="60" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>
                                <rect x="25" y="80" width="40" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>
                              </svg>
                            )}
                          </div>
                          <button className="remove-attachment-btn" onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment();
                          }}><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  )}

                  <textarea
                    ref={textareaRef} 
                    value={previewInput !== null ? previewInput : input} 
                    onChange={(e) => {
                      if (previewInput !== null) { setPreviewInput(null); }
                      setInput(e.target.value);
                    }} 
                    onKeyDown={handleKeyDown} 
                    onPaste={handlePaste}
                    placeholder="How can I help you today?" 
                    disabled={isStreaming} 
                    rows={1} 
                    className={`chat-textarea ${previewInput !== null ? 'preview-mode' : ''}`}
                  />

                  <div className="input-controls">
                    <div className="input-controls-left" style={{ position: 'relative' }}>
                      <input type="file" ref={fileInputRef} onChange={(e) => { handleFileChange(e); setShowAttachmentMenu(false); }} style={{ display: 'none' }} />
                      <button className={`attach-file-btn ${showAttachmentMenu ? 'active' : ''}`} onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} disabled={isStreaming} title="Attachments"><Plus size={20} /></button>
                      {showAttachmentMenu && (
                        <>
                          <div className="attachment-overlay-invisible" onClick={() => setShowAttachmentMenu(false)}></div>
                          <div className="attachment-popover-menu">
                            <button className="popover-item" onClick={() => { fileInputRef.current.click(); setShowAttachmentMenu(false); }}>
                              <Paperclip size={16} />
                              <span>Add files or photos</span>
                              <span className="shortcut">Ctrl+U</span>
                            </button>
                            <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                              <Camera size={16} />
                              <span>Take a screenshot</span>
                            </button>
                            <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                              <FolderPlus size={16} />
                              <span>Add to project</span>
                              <ChevronRight size={14} className="popover-chevron" />
                            </button>
                            <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                              <Book size={16} />
                              <span>Skills</span>
                              <ChevronRight size={14} className="popover-chevron" />
                            </button>
                            <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                              <Blocks size={16} />
                              <span>Add connectors</span>
                            </button>
                            <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                              <Globe size={16} />
                              <span>Web search</span>
                            </button>
                            <button className="popover-item" onClick={() => setShowAttachmentMenu(false)}>
                              <PenTool size={16} />
                              <span>Use style</span>
                              <ChevronRight size={14} className="popover-chevron" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="input-controls-right">
                      <div className="model-selector-small">DocMind AI <ChevronDown size={14} /></div>

                      {(isListening || isStreaming || isAiSpeaking) ? (
                        (lastInputWasVoiceRef.current || isListening) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isListening && (
                              <button
                                className="mic-btn active"
                                onClick={toggleListening}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                                title="Mute"
                              >
                                <div style={{ backgroundColor: '#e57373', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <MicOff size={18} color="white" />
                                </div>
                              </button>
                            )}
                            <button
                              className="submit-btn stop voice"
                              onClick={() => {
                                if (isListening) {
                                  manualStopRef.current = true;
                                  if (recognitionRef.current) recognitionRef.current.stop();
                                  setIsListening(false);
                                  setAutoSubmitPending(true);
                                } else if (isAiSpeaking) {
                                  stopSpeaking();
                                } else handleStop();
                              }}
                              title="Stop"
                              style={{ backgroundColor: '#244b7a', color: '#88bbfb', borderRadius: '8px', padding: '0 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', border: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                            >
                              <span style={{ fontSize: '18px', letterSpacing: '1px', lineHeight: '1', paddingBottom: '4px' }}>•••</span>
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>Stop</span>
                            </button>
                          </div>
                        ) : (
                          <button className="submit-btn stop typing" onClick={handleStop} title="Stop generating">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" /></svg>
                          </button>
                        )
                      ) : (
                        <button
                          className={`submit-btn ${(input.trim() || attachedFile) && !isAttachmentLoading ? 'active' : 'idle'}`}
                          onClick={(e) => { if ((input.trim() || attachedFile) && !isAttachmentLoading) handleSubmit(e); else toggleListening(); }}
                          title={(input.trim() || attachedFile) && !isAttachmentLoading ? "Send message" : "Voice dictate"}
                          id="submit-query"
                        >
                          {input.trim() || attachedFile ? <ArrowUp size={20} strokeWidth={2.5} /> : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                              {[4, 8, 12, 16, 20].map((x, i) => <path key={i} d={`M${x} ${[10, 8, 5, 8, 10][i]}v${[4, 8, 14, 8, 4][i]}`} className="waveform-bar" />)}
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {activeTemplateMenu && messages.length === 0 && (() => {
                    const optionsMap = {
                      'code': [
                        "Develop algorithm solutions",
                        "Help me turn a screenshot into working code",
                        "Develop deployment strategies",
                        "Design scalability plans",
                        "Quiz me on python code"
                      ],
                      'write': [
                        "Write a compelling blog post intro",
                        "Draft a professional email reply",
                        "Create a product description",
                        "Write a creative short story",
                        "Polish my resume summary"
                      ],
                      'learn': [
                        "Explain machine learning simply",
                        "Teach me about system design",
                        "Break down how databases work",
                        "Help me understand recursion",
                        "Create a study plan for algorithms"
                      ],
                      'life': [
                        "Help me plan a productive morning routine",
                        "Suggest healthy meal prep ideas",
                        "Give me tips for better sleep habits",
                        "Plan a weekend trip itinerary",
                        "Help me set achievable goals"
                      ],
                      'choice': [
                        "Surprise me with something interesting",
                        "Tell me a fascinating science fact",
                        "Recommend a thought-provoking book",
                        "Share a creative writing prompt",
                        "Teach me something I probably don't know"
                      ]
                    };
                    const headers = {
                      'code': { icon: <span className="code-tag">&lt;/&gt;</span>, text: 'Code' },
                      'write': { icon: <PenTool size={14} />, text: 'Write' },
                      'learn': { icon: <GraduationCap size={14} />, text: 'Learn' },
                      'life': { icon: <Heart size={14} />, text: 'Life stuff' },
                      'choice': { icon: <Lightbulb size={14} />, text: "DocMind's choice" }
                    };
                    
                    const opts = optionsMap[activeTemplateMenu] || [];
                    const activeHeader = headers[activeTemplateMenu];

                    return (
                      <div className="template-menu template-popup">
                        <div className="template-header">
                          <div className="template-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeHeader.icon}
                            <span>{activeHeader.text}</span>
                          </div>
                          <button className="icon-btn" onClick={() => setActiveTemplateMenu(null)}><X size={14} /></button>
                        </div>
                        <div className="template-list">
                          {opts.map((t) => (
                            <button key={t} className="template-item" 
                              onMouseEnter={() => setPreviewInput(t)}
                              onMouseLeave={() => setPreviewInput(null)}
                              onClick={() => { setInput(t); setPreviewInput(null); setActiveTemplateMenu(null); }}
                            >
                              <span>{t}</span>
                              <ChevronRight size={16} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {messages.length === 0 && !activeTemplateMenu && (
                  <div className="suggestion-tags">
                    <button className="tag" onClick={() => setActiveTemplateMenu('code')}><span className="code-tag" style={{ border: 'none', padding: 0, background: 'transparent', fontSize: '0.85rem' }}>&lt;/&gt;</span> Code</button>
                    <button className="tag" onClick={() => setActiveTemplateMenu('write')}><PenTool size={14} /> Write</button>
                    <button className="tag" onClick={() => setActiveTemplateMenu('learn')}><GraduationCap size={14} /> Learn</button>
                    <button className="tag" onClick={() => setActiveTemplateMenu('life')}><Heart size={14} /> Life stuff</button>
                    <button className="tag" onClick={() => setActiveTemplateMenu('choice')}><Lightbulb size={14} /> DocMind's choice</button>
                  </div>
                )}
              </div>
            </div>

            <ArtifactPanel
              activeArtifact={activeArtifact} messages={messages} isStreaming={isStreaming}
              artifactWidth={artifactWidth} isResizingRef={isResizingRef} setArtifactWidth={setArtifactWidth}
              artifactCopied={artifactCopied} setArtifactCopied={setArtifactCopied}
              artifactDropdownOpen={artifactDropdownOpen} setArtifactDropdownOpen={setArtifactDropdownOpen}
              artifactRefreshing={artifactRefreshing} setArtifactRefreshing={setArtifactRefreshing}
              setActiveArtifact={setActiveArtifact} artifactScrollRef={artifactScrollRef}
              handleArtifactScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.target;
                userScrolledArtifactRef.current = Math.ceil(scrollTop + clientHeight) < scrollHeight - 30;
              }}
              userScrolledArtifactRef={userScrolledArtifactRef}
            />
          </div>
        </div>

        {isSearchModalOpen && (
          <div className="search-modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
            <div className="search-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="search-modal-header">
                <Search size={18} className="search-modal-icon" />
                <input autoFocus type="text" placeholder="Search chats and projects" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-modal-input" />
                <button className="icon-btn close-btn" onClick={() => { setIsSearchModalOpen(false); setSearchQuery(''); }}><X size={18} /></button>
              </div>
              <div className="search-modal-results">
                {recentChats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? <div className="search-no-results">No results found</div> :
                  recentChats.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase())).map(chat => (
                    <div key={chat.id} className="search-result-item" onClick={() => { loadChat(chat.id); setIsSearchModalOpen(false); setSearchQuery(''); }}>
                      <div className="search-result-left"><MessageCircle size={16} /><span>{chat.name.replace('DocMind_Chat_', '').replace('.md', '').replaceAll('_', ' ')}</span></div>
                      <div className="search-result-right">
                        <span className="search-result-date normal-only">{formatRelativeTime(chat.modifiedTime || chat.createdTime)}</span>
                        <span className="search-result-date hover-only">Enter</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        <SettingsModal
          isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} user={user}
          colorMode={colorMode} setColorMode={setColorMode} chatFont={chatFont} setChatFont={setChatFont}
          backgroundAnimation={backgroundAnimation} setBackgroundAnimation={setBackgroundAnimation}
          voiceSetting={voiceSetting} setVoiceSetting={setVoiceSetting}
        />

        {/* PDF Preview Lightbox */}
        {isPreviewModalOpen && previewData && (
          <div className="file-preview-modal-overlay" onClick={() => setIsPreviewModalOpen(false)}>
            <div className="file-preview-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{previewData.name}</h3>
                <button className="modal-close-btn" onClick={() => setIsPreviewModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-preview-body">
                {previewData.thumbnail && (
                  <img src={previewData.thumbnail} alt="Full Preview" className="modal-preview-image" />
                )}
              </div>
              
              <div className="modal-footer">
                <span>{previewData.numPages} {previewData.numPages === 1 ? 'page' : 'pages'}</span>
                <span className="modal-footer-hint">Click anywhere outside to close</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ArtifactContext.Provider>
  );
};

export default Dashboard;
