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
                   <div key={idx} className="unified-timeline-item" onClick={() => openArtifact(idx, art.lang, art.code, art.fileName)}>
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
    <div className="artifact-download-grid">
      {artifacts.map((art, idx) => (
        <div 
          key={idx} 
          className="artifact-download-card"
          style={{ animationDelay: `${idx * 0.1}s` }}
          onClick={() => openArtifact(idx, art.lang, art.code, art.fileName)}
        >
          <div className="artifact-card-left">
            <div className="artifact-card-icon-box" style={{ background: 'transparent', border: 'none' }}>
              <svg 
                width="40" 
                height="48" 
                viewBox="0 0 110 136" 
                xmlns="http://www.w3.org/2000/svg"
                className="doc-icon-svg"
              >
                {/* Full user-provided SVG paths */}
                <rect x="0" y="0" width="110" height="136" rx="20" fill="#2c2f2c"/>
                <rect x="0.75" y="0.75" width="108.5" height="134.5" rx="19.5" fill="none" stroke="#484d48" strokeWidth="1.5"/>
                <g transform="translate(28, 28)">
                  <path d="M8 0 L38 0 L54 16 L54 68 L8 68 Z"
                        fill="none"
                        stroke="#9aa09a"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"/>
                  <path d="M38 0 L38 16 L54 16"
                        fill="none"
                        stroke="#9aa09a"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"/>
                </g>
              </svg>
            </div>
            <div className="artifact-card-details">
              <span className="artifact-card-title">{art.fileName.split('.')[0]}</span>
              <span className="artifact-card-subtitle">{art.lang.toUpperCase()}</span>
            </div>
          </div>
          <button 
            className="artifact-card-download-btn"
            onClick={(e) => handleDownload(e, art.fileName, art.code)}
          >
            Download
          </button>
        </div>
      ))}
    </div>
  );
};
