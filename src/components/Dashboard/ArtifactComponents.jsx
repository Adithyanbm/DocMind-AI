import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, Loader2, FileText, Code } from 'lucide-react';

export const StreamingPreview = ({ art }) => {
  const scrollRef = React.useRef(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [art.code]);
  
  return (
    <div className="streaming-code-preview" style={{ position: 'relative', zIndex: 1, marginLeft: '28px', marginBottom: '8px', border: '1px solid var(--claude-border)', borderRadius: '8px', background: 'var(--claude-bg)', overflow: 'hidden' }}>
       <div style={{ padding: '8px', background: 'var(--claude-bg)' }}>
          <div ref={scrollRef} style={{ maxHeight: '220px', overflowY: 'auto', width: '100%', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', background: 'var(--claude-bg)' }}>
             <SyntaxHighlighter
                children={art.code}
                style={oneDark}
                language={art.lang}
                PreTag="div"
                wrapLines={true}
                lineProps={{ style: { backgroundColor: 'transparent' } }}
                codeTagProps={{ style: { backgroundColor: 'transparent', background: 'transparent' } }}
                customStyle={{ margin: 0, background: 'transparent', padding: '12px 16px', fontSize: '0.85em', fontFamily: "'Fira Code', 'Consolas', monospace" }}
             />
          </div>
       </div>
    </div>
  );
};

export const ArtifactTimelineContainer = ({ artifacts, isStreaming, openArtifact, fullContent }) => {
  const [collapsed, setCollapsed] = useState(false);
  if (!artifacts || artifacts.length === 0) return null;

  const activeStreamIndex = isStreaming ? artifacts.length - 1 : -1;

  let baseHeaderText = `Created ${artifacts.length} file${artifacts.length !== 1 ? 's' : ''}`;
  const actionMatch = fullContent?.match(/ACTION:\s*(.*)/);
  if (actionMatch) {
     baseHeaderText = actionMatch[1].trim();
  }

  let targetText = baseHeaderText;
  if (isStreaming && activeStreamIndex >= 0) {
      const activeArt = artifacts[activeStreamIndex];
      targetText = activeArt.fileDesc ? `Generating ${activeArt.fileName}... (${activeArt.fileDesc})` : `Generating ${activeArt.fileName}...`;
  }

  const [displayHeader, setDisplayHeader] = useState("");
  const [fadeClass, setFadeClass] = useState("header-fade-in");

  useEffect(() => {
     if (targetText && displayHeader !== targetText) {
         if (displayHeader === "") {
             setDisplayHeader(targetText);
             return;
         }
         setFadeClass("header-fade-out");
         const timer = setTimeout(() => {
             setDisplayHeader(targetText);
             setFadeClass("header-fade-in");
         }, 300);
         return () => clearTimeout(timer);
     }
  }, [targetText, displayHeader]);

  const spanClasses = `header-text-slide ${fadeClass} ${isStreaming ? 'shimmer-text' : ''}`;

  return (
    <div className="artifact-master-accordion" style={{ margin: '16px 0', position: 'relative' }}>
       <div 
         className="accordion-header" 
         onClick={() => setCollapsed(!collapsed)} 
         style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 0', fontWeight: 400, color: 'var(--claude-text-muted)', fontSize: '0.85rem', userSelect: 'none', overflow: 'hidden' }}
       >
          <ChevronDown size={14} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--claude-text-muted)', flexShrink: 0 }} />
          
          <div style={{ position: 'relative', flex: 1, height: '1.2rem', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
             <span className={spanClasses} style={{ position: 'absolute', whiteSpace: 'nowrap', width: '100%', textOverflow: 'ellipsis', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {displayHeader}
                {(isStreaming && displayHeader !== baseHeaderText) && <Loader2 size={12} className="streaming-pulse-spin" style={{ color: 'var(--claude-accent)', flexShrink: 0 }} />}
             </span>
          </div>
       </div>
       
       <div className={`accordion-body-wrapper ${collapsed ? 'collapsed' : 'expanded'}`}>
          <div className="accordion-body" style={{ position: 'relative', marginTop: '8px', paddingBottom: '8px', minHeight: 0 }}>
             <div className="stepper-track-line" style={{ position: 'absolute', top: '10px', bottom: '10px', left: '7px', width: '1px', background: 'var(--claude-border)', zIndex: 0 }}></div>
             
             {artifacts.map((art, idx) => {
                const isActivelyStreaming = (idx === activeStreamIndex);
                
                if (isActivelyStreaming) {
                    return <StreamingPreview key={idx} art={art} />;
                }

                return (
                   <div key={idx} className="unified-timeline-item" onClick={() => openArtifact(art, idx)}>
                      <div className="timeline-document-icon">
                         <FileText size={16} />
                         <span className="timeline-filename-main">{art.fileDesc}</span>
                      </div>
                      <div className="timeline-tag-badge">
                         {art.fileName}
                      </div>
                   </div>
                );
             })}
          </div>
       </div>
    </div>
  );
};

const getArtifactTheme = (lang = '', fileName = '') => {
  const extension = fileName.split('.').pop()?.toLowerCase() || lang.toLowerCase();
  
  switch (extension) {
    case 'jsx':
    case 'tsx':
    case 'react':
      return { 
        color: '#61DAFB', 
        icon: <Code size={18} />, 
        label: 'React Component',
        bgColor: 'rgba(97, 218, 251, 0.1)'
      };
    case 'html':
      return { 
        color: '#A855F7', 
        icon: <Layout size={18} />, 
        label: 'HTML Page',
        bgColor: 'rgba(168, 85, 247, 0.1)'
      };
    case 'svg':
      return { 
        color: '#F59E0B', 
        icon: <FileCode size={18} />, 
        label: 'Vector Graphic',
        bgColor: 'rgba(245, 158, 11, 0.1)'
      };
    case 'md':
    case 'markdown':
      return { 
        color: '#3B82F6', 
        icon: <FileText size={18} />, 
        label: 'Markdown',
        bgColor: 'rgba(59, 130, 246, 0.1)'
      };
    default:
      return { 
        color: '#94A3B8', 
        icon: <FileText size={18} />, 
        label: 'Code File',
        bgColor: 'rgba(148, 163, 184, 0.1)'
      };
  }
};

export const ArtifactDownloadGrid = ({ artifacts, openArtifact }) => {
  if (!artifacts || artifacts.length === 0) return null;

  const handleDownload = (e, fileName, code) => {
    e.stopPropagation();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="artifact-modern-grid">
      {artifacts.map((art, idx) => {
        const theme = getArtifactTheme(art.lang, art.fileName);
        
        return (
          <div 
            key={idx} 
            className="artifact-premium-card"
            style={{ '--theme-color': theme.color, '--theme-bg': theme.bgColor }}
            onClick={() => openArtifact(art, idx)}
          >
            <div className="art-card-main">
              <div className="art-card-icon-wrapper">
                {theme.icon}
              </div>
              <div className="art-card-info">
                <div className="art-card-name-row">
                   <span className="art-card-filename">{art.fileName.split('.')[0]}</span>
                   <span className="art-card-ext">.{art.fileName.split('.').pop()}</span>
                </div>
                <div className="art-card-label">{theme.label}</div>
              </div>
              <div className="art-card-actions">
                <button className="art-view-btn">
                  View
                </button>
              </div>
            </div>
            
            <div className="art-card-bottom-actions">
               <button 
                  className="art-mini-download"
                  onClick={(e) => handleDownload(e, art.fileName, art.code)}
                  title="Download File"
               >
                  Download
               </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
import { Eye, Layout, FileCode } from 'lucide-react';
