import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { mapLanguage } from '../../utils/dashboardUtils';

/* -- Performance: Debounced Viewer for streaming artifacts -- */
export const DebouncedSyntaxHighlighter = React.memo(({ code, lang, isStreaming, scrollRef, userScrolledUpRef }) => {
  const [displayCode, setDisplayCode] = React.useState(code);

  React.useEffect(() => {
    // Only debounce during rapid small stream chunks.
    if (!displayCode || Math.abs(code.length - displayCode.length) > 50) {
      setDisplayCode(code);
    } else {
      const timer = setTimeout(() => {
        setDisplayCode(code);
      }, 400); // Throttles highlighting calculation to every 400ms
      return () => clearTimeout(timer);
    }
  }, [code, displayCode]);

  React.useLayoutEffect(() => {
    // Auto-scroll when code chunks render, only if the user hasn't scrolled up
    if (isStreaming && scrollRef?.current && userScrolledUpRef && !userScrolledUpRef.current) {
        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [displayCode, isStreaming, scrollRef, userScrolledUpRef]);

  return (
    <SyntaxHighlighter
       children={displayCode}
       language={mapLanguage(lang)}
       style={oneDark}
       PreTag="div"
       showLineNumbers={true}
       wrapLines={true}
       lineProps={{ style: { backgroundColor: 'transparent' } }}
       codeTagProps={{ style: { backgroundColor: 'transparent', background: 'transparent' } }}
       customStyle={{
         margin: 0,
         background: '#1e1e1e', // Force dark background for visibility
         padding: '16px',
         fontSize: '0.86em',
         lineHeight: '1.5',
         fontFamily: "'Fira Code', 'Consolas', monospace",
         whiteSpace: 'pre', // Crucial for indentation
       }}
    />
  );
});

/* -- CodeBlock — strictly for non-artifact generic code chunks -- */
export const CodeBlock = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : 'text';
  const rawCode = String(children).replace(/^\n+/, '').replace(/\n$/, '');
  const lineCount = rawCode.split('\n').length;
  
  const hasFilenameTag = /^(?:#|\/\/|<!--|\/\*)\s*filename:\s*\S+/im.test(rawCode);
  const isSignificant = lineCount >= 12;
  const isArtifact = hasFilenameTag || isSignificant;

  // Artifacts are removed from standard Markdown flow entirely.
  if (isArtifact) return null;

  if (inline) {
    return <code className={className} {...props}>{children}</code>;
  }

  // Intercept generic 'text' (default un-tagged blocks) to render firmly inline
  if (lang === 'text') {
    return (
      <span 
        className="inline-text-block"
        style={{
          color: '#ff6b6b', // red color Request
          backgroundColor: 'transparent',
          padding: 0,
          fontSize: '0.85em', 
          lineHeight: '1.4',
          fontFamily: "'Fira Code', 'Consolas', monospace",
          wordBreak: 'break-word'
        }}
      >
        {rawCode}
      </span>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper" style={{ border: '1px solid var(--claude-border)', display: 'flex', flexDirection: 'column', marginBottom: '1.5rem' }}>
      <div className="code-block-lang">
        <span className="code-language">{lang}</span>
      </div>
      <button className="code-copy-btn" onClick={handleCopy} aria-label="Copy code">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? 'Copied!' : 'Copy'}</span>
      </button>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <SyntaxHighlighter
          children={rawCode}
          style={oneDark}
          language={mapLanguage(lang)}
          PreTag="div"
          codeTagProps={{ style: { backgroundColor: 'transparent', background: 'transparent' } }}
          customStyle={{ margin: 0, background: 'transparent', padding: '4px 16px 16px 16px', fontSize: '0.9em', whiteSpace: 'pre' }}
          {...props}
        />
      </div>
    </div>
  );
};
