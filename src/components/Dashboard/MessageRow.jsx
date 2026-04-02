import React, { memo, useContext, useMemo, useRef, useState } from 'react';
import { Paperclip, Copy, ThumbsUp, ThumbsDown, RotateCcw, Check } from 'lucide-react';
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
        stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="18 10">

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
        stroke-width="3"
        stroke-dasharray="10 6"
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
  p: ({ node, ...props }) => <div className="md-paragraph" style={{ margin: '0 0 1em 0', lineHeight: '1.6' }} {...props} />,
  li: ({ node, ...props }) => <li style={{ margin: '0.4em 0', lineHeight: '1.6' }} {...props} />,
  ul: ({ node, ...props }) => <ul style={{ margin: '0 0 1em 0', paddingLeft: '1.5em' }} {...props} />,
  ol: ({ node, ...props }) => <ol style={{ margin: '0 0 1em 0', paddingLeft: '1.5em' }} {...props} />,
  h1: ({ node, ...props }) => <h1 style={{ margin: '1.5em 0 0.5em 0', fontSize: '1.75em', fontWeight: '600', letterSpacing: '-0.02em' }} {...props} />,
  h2: ({ node, ...props }) => <h2 style={{ margin: '1.4em 0 0.5em 0', fontSize: '1.5em', fontWeight: '600', letterSpacing: '-0.01em' }} {...props} />,
  h3: ({ node, ...props }) => <h3 style={{ margin: '1.2em 0 0.5em 0', fontSize: '1.25em', fontWeight: '600' }} {...props} />,
  h4: ({ node, ...props }) => <h4 style={{ margin: '1.2em 0 0.5em 0', fontSize: '1.1em', fontWeight: '600' }} {...props} />,
  pre: ({ node, ...props }) => <div className="markdown-pre" style={{ margin: 0, padding: 0 }} {...props} />,
  code: (props) => <CodeBlock {...props} />,
};

export const MemoizedMessageRow = memo(({ msg, user, msgIdx, isThisStreamingMsg, isLatest }) => {
  const context = useContext(ArtifactContext);
  const { artifacts, preText, postText } = useMemo(() => extractArtifacts(msg.content), [msg.content]);
  const nextArtIdxRef = useRef(0);
  nextArtIdxRef.current = 0;

  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openArtifact = React.useCallback((artIdx, lang, codeSnapshot) => {
    context?.setActiveArtifact?.({ msgIdx, artIdx, lang, codeSnapshot: codeSnapshot || '' });
  }, [msgIdx, context]);

  const cleanedContent = useMemo(() => cleanMarkdown(msg.content), [msg.content]);
  const cleanedPreText = useMemo(() => cleanMarkdown(preText), [preText]);
  const cleanedPostText = useMemo(() => cleanMarkdown(postText), [postText]);

  return (
    <div className={`message-row ${msg.role}`}>
      <div className="message-avatar-spacer" style={{ width: '32px', flexShrink: 0 }}></div>

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

          {artifacts.length === 0 ? (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {cleanedContent}
              </ReactMarkdown>
            </div>
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
              <div className={`message-action-bar ${!isLatest ? 'historical-action-bar' : ''}`} style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', color: 'var(--claude-text-muted)' }}>
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
                <div className="assistant-bottom-logo" style={{ marginTop: '24px', marginBottom: '8px' }}>
                  <StaticStitchLogo style={{ width: '48px', height: '48px' }} />
                </div>
              )}
            </>
          )}
        </div>
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
    && prevProps.isThisStreamingMsg === nextProps.isThisStreamingMsg
    && prevProps.isLatest === nextProps.isLatest;
});
