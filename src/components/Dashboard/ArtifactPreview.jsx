import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, Download, FileJson, FileCode, Presentation, FileSpreadsheet, File as FileIcon, ExternalLink } from 'lucide-react';
import { mapLanguage } from '../../utils/dashboardUtils';

const DockerReactRenderer = ({ code, identifier, isWideView }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const startPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('access');
        const response = await fetch('/api/chat/preview/react/start/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ code, identifier })
        });
        
        const data = await response.json();
        if (data.url && isMounted) {
          setPreviewUrl(data.url);
        } else if (data.error && isMounted) {
          setError(data.error);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(startPreview, 500); // Debounce
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [code, identifier]);

  return (
    <div style={{ 
      position: 'relative', 
      width: isWideView ? '1200px' : '100%', 
      height: '100%', 
      background: 'white',
      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {(loading || !previewUrl) && !error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', zIndex: 1, gap: '12px' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: '500' }}>
            {loading ? "Starting Docker Environment..." : "Preparing Preview..."}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#999' }}>This may take 10-15 seconds for the first run.</p>
        </div>
      )}
      
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', zIndex: 2, padding: '24px', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '12px', fontWeight: '600' }}>Preview Error</div>
          <div style={{ fontSize: '0.85rem', color: '#666', background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fee2e2', maxWidth: '100%', overflow: 'auto' }}>
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {previewUrl && (
        <iframe
          title="React Preview"
          src={previewUrl}
          sandbox="allow-scripts allow-popups allow-forms allow-modals allow-same-origin"
          className="artifact-preview-iframe"
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
};

const HtmlRenderer = ({ code, isWideView }) => {
  const srcDoc = useMemo(() => {
    const hasHtmlTags = /<html|<!DOCTYPE/i.test(code);
    if (hasHtmlTags) return code;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              background: #ffffff; 
              margin: 0; 
              padding: 0;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            /* If there's a canvas, try to center it for games */
            canvas {
              display: block;
              margin: auto;
              max-width: 100%;
              max-height: 100%;
            }
          </style>
        </head>
        <body>
          ${code}
          <script>
            // Ensure keyboard focus works for games
            window.addEventListener('mousedown', function() {
              window.focus();
            });
            // Auto-focus if there's an interactive element
            window.addEventListener('load', function() {
              if (document.querySelector('canvas, button, input')) {
                window.focus();
              }
            });
          </script>
        </body>
      </html>
    `;
  }, [code]);

  return (
    <iframe
      title="HTML Preview"
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-popups allow-forms allow-modals allow-same-origin"
      className="artifact-preview-iframe"
      style={{ 
        background: 'white', 
        width: isWideView ? '1200px' : '100%', 
        height: '100%', 
        border: 'none',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    />
  );
};

const SvgRenderer = ({ code, isWideView }) => {
  const srcDoc = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              background: #f8fafc;
              overflow: hidden;
            }
            svg { 
              max-width: 95vw; 
              max-height: 95vh; 
              filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
            }
          </style>
        </head>
        <body>${code}</body>
      </html>
    `;
  }, [code]);

  return (
    <iframe
      title="SVG Preview"
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-popups allow-forms allow-modals"
      className="artifact-preview-iframe"
      style={{ 
        background: '#f8fafc', 
        width: isWideView ? '1200px' : '100%', 
        height: '100%', 
        border: 'none',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    />
  );
};

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : 'text';
    
    return !inline ? (
      <SyntaxHighlighter
        children={String(children).replace(/\n$/, '')}
        style={oneDark}
        language={mapLanguage(lang)}
        PreTag="div"
        customStyle={{
          margin: '1.5em 0',
          borderRadius: '8px',
          fontSize: '13px',
          background: '#1e1e1e'
        }}
        {...props}
      />
    ) : (
      <code className={className} style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2em 0.4em', borderRadius: '4px' }} {...props}>
        {children}
      </code>
    );
  }
};

const MermaidRenderer = ({ code, isWideView }) => {
  const cleanedCode = useMemo(() => {
    // Strip accidental triple backticks hallucinated by LLM
    return code.replace(/```mermaid\n?|```\n?|```$/g, '').trim();
  }, [code]);

  const srcDoc = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 24px; 
              display: flex; 
              justify-content: center; 
              background: #ffffff; 
              min-height: 100vh;
              font-family: -apple-system, sans-serif;
              ${isWideView ? 'width: fit-content; min-width: 100%;' : ''}
            }
            .mermaid { 
              width: 100%; 
              display: flex; 
              justify-content: center; 
            }
            svg {
              max-width: ${isWideView ? 'none' : '100%'};
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="mermaid">
            ${cleanedCode}
          </div>
          <script>
            mermaid.initialize({ 
              startOnLoad: true, 
              theme: 'neutral',
              fontFamily: 'system-ui',
              securityLevel: 'loose'
            });
          </script>
        </body>
      </html>
    `;
  }, [cleanedCode, isWideView]);

  return (
    <iframe
      title="Mermaid Preview"
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-popups allow-forms allow-modals"
      className="artifact-preview-iframe"
      style={{ 
        background: 'white', 
        width: isWideView ? '1200px' : '100%', 
        height: '100%', 
        border: 'none',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    />
  );
};

const MarkdownRenderer = ({ code }) => {
  return (
    <div className="markdown-preview-container" style={{ padding: '24px', background: 'white', color: '#1a1a1a', height: '100%', overflow: 'auto' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {code}
      </ReactMarkdown>
    </div>
  );
};

const CodeRenderer = ({ code, lang }) => {
  return (
    <div className="code-preview-container" style={{ height: '100%', background: '#1e1e1e' }}>
      <SyntaxHighlighter
        children={code}
        style={oneDark}
        language={mapLanguage(lang)}
        customStyle={{ 
          margin: 0, 
          padding: '24px', 
          height: '100%', 
          fontSize: '14px',
          lineHeight: '1.5',
          background: 'transparent'
        }}
      />
    </div>
  );
};

const BinaryRenderer = ({ lang, fileName, code }) => {
  const meta = {
    pdf: { icon: FileText, label: 'PDF Document', color: '#ef4444' },
    docx: { icon: FileIcon, label: 'Word Document', color: '#2b579a' },
    xlsx: { icon: FileSpreadsheet, label: 'Excel Spreadsheet', color: '#217346' },
    pptx: { icon: Presentation, label: 'PowerPoint Presentation', color: '#d24726' },
    default: { icon: FileIcon, label: 'Binary File', color: '#64748b' }
  }[lang] || { icon: FileIcon, label: 'Binary File', color: '#64748b' };

  return (
    <div className="binary-preview-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9', padding: '40px' }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '300px', width: '100%' }}>
        <meta.icon size={64} color={meta.color} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px', wordBreak: 'break-all' }}>{fileName}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{meta.label}</div>
        </div>
        <button 
          onClick={() => {
            const blob = new Blob([code], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ width: '100%', padding: '10px', background: meta.color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  );
};

const ArtifactPreview = ({ code, lang, fileName, identifier, isWideView }) => {
  if (!code) return <div style={{ padding: '20px', color: '#666' }}>No content to preview</div>;

  const type = lang?.toLowerCase();

  switch (type) {
    case 'jsx':
    case 'tsx':
    case 'react':
      return <DockerReactRenderer code={code} identifier={identifier} isWideView={isWideView} />;
    case 'html':
      return <HtmlRenderer code={code} isWideView={isWideView} />;
    case 'svg':
      return <SvgRenderer code={code} isWideView={isWideView} />;
    case 'markdown':
    case 'md':
      return <MarkdownRenderer code={code} />;
    case 'pptx':
      return <BinaryRenderer lang={type} fileName={fileName} code={code} />;
    case 'mermaid':
      return <MermaidRenderer code={code} isWideView={isWideView} />;
    case 'code':
      return <CodeRenderer code={code} lang="javascript" />; // Default to JS if generic code
    default:
      // Fallback for UI-like code vs regular code
      if (code.trim().startsWith('<svg')) return <SvgRenderer code={code} isWideView={isWideView} />;
      if (code.trim().startsWith('<')) return <HtmlRenderer code={code} isWideView={isWideView} />;
      return <CodeRenderer code={code} lang={lang || 'text'} />;
  }
};

export default ArtifactPreview;
