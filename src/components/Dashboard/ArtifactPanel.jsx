import React from 'react';
import { X, Check, ChevronDown, RotateCcw } from 'lucide-react';
import { DebouncedSyntaxHighlighter } from './CodeBlock';
import { extractArtifacts } from '../../utils/dashboardUtils';

export const ArtifactPanel = ({ 
  activeArtifact, 
  messages, 
  isStreaming, 
  artifactWidth, 
  isResizingRef, 
  setArtifactWidth, 
  artifactCopied, 
  setArtifactCopied, 
  artifactDropdownOpen, 
  setArtifactDropdownOpen, 
  artifactRefreshing, 
  setArtifactRefreshing, 
  setActiveArtifact, 
  artifactScrollRef, 
  handleArtifactScroll, 
  userScrolledArtifactRef 
}) => {
  if (!activeArtifact) return null;

  // Derive live code from messages — updates automatically when messages change during streaming
  const liveMsg = messages[activeArtifact.msgIdx];
  const liveArtifacts = liveMsg ? extractArtifacts(liveMsg.content).artifacts : [];
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
           e.currentTarget.classList.add('is-dragging');
        }}
      >
         <div className="resizer-bump"></div>
      </div>
      <div className="artifact-side-panel" style={{ width: artifactWidth ? `${artifactWidth}px` : '50%', flex: artifactWidth ? 'none' : '1', maxWidth: 'none' }}>
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
                     onClick={() => {
                         navigator.clipboard.writeText(liveCode);
                         setArtifactCopied(true);
                         setTimeout(() => setArtifactCopied(false), 2000);
                     }} 
                     style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '60px', justifyContent: 'center' }}
                     title="Copy"
                   >
                     {artifactCopied ? (
                        <>
                           <Check size={14} color="#10b981" /> 
                           <span style={{ color: '#10b981' }}>Copied</span>
                        </>
                     ) : "Copy"}
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
                <button 
                  className="artifact-action-btn" 
                  title="Refresh"
                  onClick={() => {
                     setArtifactRefreshing(true);
                     setTimeout(() => setArtifactRefreshing(false), 600);
                  }}
                >
                  <RotateCcw size={15} className={artifactRefreshing ? 'spin-refresh' : ''} />
                </button>
                <button className="artifact-action-btn close" onClick={() => setActiveArtifact(null)} title="Close">
                  <X size={16} />
                </button>
             </div>
         </div>
         <div className="artifact-panel-body" ref={artifactScrollRef} onScroll={handleArtifactScroll}>
            {liveCode ? (
              <DebouncedSyntaxHighlighter
                 code={liveCode}
                 lang={liveLang}
                 isStreaming={isStreaming}
                 scrollRef={artifactScrollRef}
                 userScrolledUpRef={userScrolledArtifactRef}
              />
            ) : (
              <div style={{ padding: '16px', color: '#888', fontSize: '0.9rem' }}>Generating code...</div>
            )}
         </div>
      </div>
    </>
  );
};
