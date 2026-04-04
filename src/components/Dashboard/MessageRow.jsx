import React, { memo, useContext, useMemo, useRef, useState } from 'react';
import { Paperclip, Copy, ThumbsUp, ThumbsDown, RotateCcw, Check, Pencil, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cleanMarkdown, extractArtifacts } from '../../utils/dashboardUtils';
import { ArtifactTimelineContainer, ArtifactDownloadGrid } from './ArtifactComponents';
import { CodeBlock } from './CodeBlock';

// We'll expect ArtifactContext to be provided by the parent
import { ArtifactContext } from './DashboardContext';

export const StaticStitchLogo = ({ className = "", style = {} }) => (
  <div className={`stitch-logo-container static ${className}`} style={style}>
    <svg width="100%" height="100%" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="40" fill="none" stroke="#FF6A00" strokeWidth="4" strokeLinecap="round" strokeDasharray="18 10" />
      <circle cx="60" cy="60" r="22" fill="none" stroke="#FF6A00" strokeWidth="3" strokeDasharray="10 6" opacity="0.8" />
      <circle cx="60" cy="60" r="6" fill="#FF6A00" />
    </svg>
  </div>
);

export const StitchLogo = ({ className = "", style = {} }) => (
  <div className={`stitch-logo-container ${className}`} style={style}>
    <svg width="100%" height="100%" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">

      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke="#FF6A00"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="18 10">

        <animate
          attributeName="r"
          values="34;44;34"
          dur="2.5s"
          repeatCount="indefinite" />

        <animate
          attributeName="opacity"
          values="0.6;1;0.6"
          dur="2.5s"
          repeatCount="indefinite" />
      </circle>

      <circle
        cx="60"
        cy="60"
        r="22"
        fill="none"
        stroke="#FF6A00"
        strokeWidth="3"
        strokeDasharray="10 6"
        opacity="0.8">

        <animate
          attributeName="r"
          values="18;26;18"
          dur="2s"
          repeatCount="indefinite" />

        <animate
          attributeName="opacity"
          values="0.5;0.9;0.5"
          dur="2s"
          repeatCount="indefinite" />
      </circle>
      <circle
        cx="60"
        cy="60"
        r="6"
        fill="#FF6A00">

        <animate
          attributeName="r"
          values="5;7;5"
          dur="1.8s"
          repeatCount="indefinite" />
      </circle>

    </svg>
  </div>
);

const markdownComponents = {
  p: ({ node, ...props }) => <div className="md-paragraph" style={{ margin: '0 0 0.5em 0', lineHeight: '1.6' }} {...props} />,
  li: ({ node, ...props }) => <li style={{ margin: '0.4em 0', lineHeight: '1.6' }} {...props} />,
  ul: ({ node, ...props }) => <ul style={{ margin: '0 0 1em 0', paddingLeft: '1.5em' }} {...props} />,
  ol: ({ node, ...props }) => <ol style={{ margin: '0 0 1em 0', paddingLeft: '1.5em' }} {...props} />,
  h1: ({ node, ...props }) => <h1 style={{ margin: '1.5em 0 0.5em 0', fontSize: '1.75em', fontWeight: '600', letterSpacing: '-0.02em' }} {...props} />,
  h2: ({ node, ...props }) => <h2 style={{ margin: '1.4em 0 0.5em 0', fontSize: '1.5em', fontWeight: '600', letterSpacing: '-0.01em' }} {...props} />,
  h3: ({ node, ...props }) => <h3 style={{ margin: '1.2em 0 0.5em 0', fontSize: '1.25em', fontWeight: '600' }} {...props} />,
  h4: ({ node, ...props }) => <h4 style={{ margin: '1.2em 0 0.5em 0', fontSize: '1.1em', fontWeight: '600' }} {...props} />,
  pre: ({ node, ...props }) => <div className="markdown-pre" style={{ margin: 0, padding: 0 }} {...props} />,
  code: (props) => <CodeBlock {...props} />,
  a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
};

import { Globe, ChevronDown, CheckCircle2 } from 'lucide-react';

const WebSearchUI = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data || !data.searches || data.searches.length === 0) return null;

  return (
    <div className="web-search-ui">
      <div 
        className="web-search-toggle" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Searched the web</span>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>

      {isExpanded && (
        <div className="web-search-timeline">
          {data.searches.map((searchInfo, idx) => (
            <div key={idx} className="search-query-block">
              <div className="timeline-dot"><Globe size={14} /></div>
              
              <div className="search-query-header">
                <span className="query-text">{searchInfo.query}</span>
                <span className="results-count">{searchInfo.count} results</span>
              </div>
              
              <div className="search-results-list">
                {searchInfo.results.map((res, ridx) => (
                  <a key={ridx} href={res.url} target="_blank" rel="noopener noreferrer" className="search-result-row">
                    <img src={res.favicon} alt="" className="result-favicon" onError={(e) => { e.target.style.display = 'none'; }} />
                    <span className="result-title">{res.title}</span>
                    <span className="result-domain">{res.domain}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
          
          <div className="search-done-block">
            <div className="timeline-dot done-dot"><CheckCircle2 size={16} /></div>
            <span className="done-text">Done</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const MemoizedMessageRow = memo(({ msg, user, msgIdx, isThisStreamingMsg, isLatest }) => {
  const context = useContext(ArtifactContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content || '');

  const hasVersions = msg.versions && msg.versions.length > 1;
  const currentVersion = (msg.activeVersionIndex ?? 0) + 1;
  const totalVersions = msg.versions ? msg.versions.length : 1;

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(msg.content || '');
  };

  const handleEditSave = () => {
    if (!editContent.trim()) return;
    if (window.dashboardHandleEditSave) {
      window.dashboardHandleEditSave(msgIdx, editContent);
    }
    setIsEditing(false);
  };

  const onPrevVersion = () => {
    if (window.dashboardHandleVersionSwitch && msg.activeVersionIndex > 0) {
      window.dashboardHandleVersionSwitch(msgIdx, msg.activeVersionIndex - 1);
    }
  };

  const onNextVersion = () => {
    if (window.dashboardHandleVersionSwitch && msg.activeVersionIndex < msg.versions.length - 1) {
      window.dashboardHandleVersionSwitch(msgIdx, msg.activeVersionIndex + 1);
    }
  };

  const cleanMsgContent = useMemo(() => {
    let text = msg.content || '';
    // Strip the raw thought process tags if the LLM hallucinates them
    text = text.replace(/<previous_thought_process>[\s\S]*?(<\/previous_thought_process>|$)/g, '');
    text = text.replace(/<search_results_metadata>[\s\S]*?(<\/search_results_metadata>|$)/g, '');
    return text.trim();
  }, [msg.content]);

  const { artifacts, preText, postText } = useMemo(() => extractArtifacts(cleanMsgContent), [cleanMsgContent]);
  const nextArtIdxRef = useRef(0);
  nextArtIdxRef.current = 0;

  const [copied, setCopied] = useState(false);
  const [userCopied, setUserCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanMsgContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openArtifact = React.useCallback((artIdx, lang, codeSnapshot) => {
    context?.setActiveArtifact?.({ msgIdx, artIdx, lang, codeSnapshot: codeSnapshot || '' });
  }, [msgIdx, context]);

  const cleanedContent = useMemo(() => cleanMarkdown(cleanMsgContent), [cleanMsgContent]);
  const cleanedPreText = useMemo(() => cleanMarkdown(preText), [preText]);
  const cleanedPostText = useMemo(() => cleanMarkdown(postText), [postText]);

  const searchPayload = useMemo(() => {
    if (!msg.reasoning_content) return null;
    const match = msg.reasoning_content.match(/<docmind_search_ui>([\s\S]*?)<\/docmind_search_ui>/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch(e) { return null; }
  }, [msg.reasoning_content]);
  
  const cleanReasoning = useMemo(() => {
    if (!msg.reasoning_content) return null;
    let text = msg.reasoning_content;
    // Strip UI and metadata blocks from display, handling partial/streaming states
    text = text.replace(/<docmind_search_ui>[\s\S]*?(<\/docmind_search_ui>|$)/g, '');
    text = text.replace(/<search_results_metadata>[\s\S]*?(<\/search_results_metadata>|$)/g, '');
    return cleanMarkdown(text.trim());
  }, [msg.reasoning_content]);

  const isAttachmentOnly = (msg.attachmentData || msg.attachment) && !(msg.content || msg.reasoning_content || isThisStreamingMsg);

  return (
    <div className={`message-row ${msg.role}`}>
      <div className="message-avatar-spacer" style={{ width: '32px', flexShrink: 0 }}></div>

      <div className={`message-body-container ${msg.role === 'user' ? 'user-container' : 'assistant-container'}`}>
        {/* Attachment Block */}
        {(msg.attachmentData || msg.attachment) && (
          <div className="message-body attachment-block" style={{ marginBottom: (msg.content || msg.reasoning_content || isThisStreamingMsg) ? '6px' : '0' }}>
            {msg.attachmentData && msg.attachmentType && msg.attachmentType.startsWith('image/') && (
              <img 
                src={msg.attachmentData} 
                alt="Attachment" 
                className="image-preview-standalone" 
                style={{ cursor: 'pointer', marginBottom: 0 }}
                onClick={() => window.dashboardHandlePreview && window.dashboardHandlePreview({ 
                  name: msg.attachment || 'Image', 
                  thumbnail: msg.attachmentData,
                  isImage: true 
                })}
              />
            )}
            {msg.attachment && msg.attachmentType === 'application/pdf' && (
              <div className="pdf-preview-standalone" onClick={() => {
                window.dashboardHandlePreview && window.dashboardHandlePreview({ 
                  name: msg.attachment, 
                  thumbnail: msg.attachmentData, 
                  numPages: msg.attachmentNumPages || 0 
                });
              }}>
                <div className="pdf-preview-wrapper" style={{ position: 'relative', width: '108px', height: '108px' }}>
                  {msg.attachmentData ? (
                    <>
                      <img src={msg.attachmentData} alt="pdf-preview" className="pdf-thumbnail" />
                      <div className="pdf-badge">PDF</div>
                    </>
                  ) : (
                    <div className="pdf-placeholder-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: 'rgba(255,255,255,0.05)' }}>
                      <svg width="32" height="40" viewBox="0 0 110 136" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M70 0 L110 40 L110 116 C110 127 101 136 90 136 L20 136 C9 136 0 127 0 116 L0 20 C0 9 9 0 20 0 Z" fill="rgba(255,255,255,0.1)"/>
                        <text x="25" y="85" fill="rgba(255,255,255,0.3)" fontSize="30" fontWeight="bold" fontFamily="sans-serif">PDF</text>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}
            {msg.attachment && msg.attachmentType !== 'application/pdf' && !msg.attachmentData && (
              <div className="message-attachment">
                <Paperclip size={14} /> {msg.attachment}
              </div>
            )}
          </div>
        )}

        {/* Text/Content Block */}
        {(msg.content || msg.reasoning_content || isThisStreamingMsg) && (
          <div className={`message-body ${isEditing ? 'is-editing' : ''} ${msg.isError ? 'error-text' : ''}`}>
            {searchPayload && <WebSearchUI data={searchPayload} />}

            {msg.reasoning_content && cleanReasoning.length > 0 && (
              <details className="think-block">
                <summary>Thought Process</summary>
                <div className="think-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {cleanReasoning}
                  </ReactMarkdown>
                </div>
              </details>
            )}

            {msg.role === 'user' && isEditing ? (
              <div className="edit-container">
                <textarea
                  className="edit-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
                <div className="edit-footer">
                  <div className="branch-info">
                    <Info size={14} />
                    <span>Editing this message will create a new conversation branch. You can switch between branches using the arrow navigation buttons.</span>
                  </div>
                  <div className="edit-actions">
                    <button className="edit-btn cancel" onClick={handleEditCancel}>Cancel</button>
                    <button className="edit-btn save" onClick={handleEditSave} disabled={!editContent.trim() || editContent === msg.content}>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {artifacts.length === 0 ? (
                  msg.content && (
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {cleanedContent}
                      </ReactMarkdown>
                    </div>
                  )
                ) : (
                  <>
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {cleanedPreText}
                      </ReactMarkdown>
                    </div>

                    {msg.role === 'assistant' && (
                      <ArtifactTimelineContainer
                        artifacts={artifacts}
                        isStreaming={isThisStreamingMsg}
                        openArtifact={openArtifact}
                        fullContent={msg.content}
                      />
                    )}

                    {postText.trim() && (
                      <div className="markdown-body" style={{ marginTop: '16px' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {cleanedPostText}
                        </ReactMarkdown>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {isThisStreamingMsg && msg.role === 'assistant' && (
              <div className="assistant-generating-star generating" style={{ marginTop: '12px' }}>
                <StitchLogo style={{ width: '48px', height: '48px' }} />
              </div>
            )}

            {msg.role === 'assistant' && !isThisStreamingMsg && artifacts.length > 0 && (
              <ArtifactDownloadGrid
                artifacts={artifacts}
                openArtifact={openArtifact}
              />
            )}

            {msg.role === 'assistant' && !isThisStreamingMsg && (
              <>
                <div className={`message-action-bar ${!isLatest ? 'historical-action-bar' : ''}`} style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', color: 'var(--claude-text-muted)' }}>
                  <button className="icon-btn" onClick={handleCopy} title="Copy">
                    {copied ? <Check size={16} color="var(--claude-accent)" /> : <Copy size={16} />}
                  </button>
                  <button className="icon-btn" onClick={() => setFeedback(feedback === 'up' ? null : 'up')} title="Good response">
                    <ThumbsUp size={16} color={feedback === 'up' ? "var(--claude-accent)" : "currentColor"} />
                  </button>
                  <button className="icon-btn" onClick={() => setFeedback(feedback === 'down' ? null : 'down')} title="Bad response">
                    <ThumbsDown size={16} color={feedback === 'down' ? "var(--claude-error, #D25E5E)" : "currentColor"} />
                  </button>
                  <button className="icon-btn" onClick={() => window.dashboardHandleRetry && window.dashboardHandleRetry(msgIdx)} title="Retry"><RotateCcw size={16} /></button>
                </div>
                {isLatest && (
                  <div className="assistant-bottom-logo" style={{ marginTop: '4px', marginBottom: '4px' }}>
                    <StaticStitchLogo style={{ width: '48px', height: '48px' }} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {msg.role === 'user' && !isThisStreamingMsg && !isEditing && (
          <div className="user-action-bar">
            {msg.timestamp && (
              <span className="user-msg-date" title={new Date(msg.timestamp).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}>
                {(() => {
                  const d = new Date(msg.timestamp);
                  const now = new Date();
                  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  return isToday 
                    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
                    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toLowerCase();
                })()}
              </span>
            )}
            <button className="icon-btn" onClick={() => window.dashboardHandleRetry && window.dashboardHandleRetry(msgIdx)} title="Retry">
              <RotateCcw size={14} />
            </button>
            <button className="icon-btn" onClick={() => setIsEditing(true)} title="Edit">
              <Pencil size={14} />
            </button>
            <button className="icon-btn" onClick={() => { navigator.clipboard.writeText(msg.content); setUserCopied(true); setTimeout(() => setUserCopied(false), 2000); }} title="Copy">
              {userCopied ? <Check size={14} color="var(--claude-accent)" /> : <Copy size={14} />}
            </button>
            {totalVersions > 1 && (
              <div className="version-navigator" style={{ marginLeft: '4px' }}>
                <button className="version-nav-btn" onClick={onPrevVersion} disabled={msg.activeVersionIndex === 0}>
                  <ChevronLeft size={14} />
                </button>
                <span className="version-text">{currentVersion} / {totalVersions}</span>
                <button className="version-nav-btn" onClick={onNextVersion} disabled={msg.activeVersionIndex === totalVersions - 1}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {msg.role === 'user' && (
        <div className="message-avatar-spacer" style={{ width: '32px', flexShrink: 0 }}></div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.msg.content === nextProps.msg.content
    && prevProps.msg.reasoning_content === nextProps.msg.reasoning_content
    && prevProps.msg.isError === nextProps.msg.isError
    && prevProps.msg.timestamp === nextProps.msg.timestamp
    && prevProps.isThisStreamingMsg === nextProps.isThisStreamingMsg
    && prevProps.isLatest === nextProps.isLatest;
});
