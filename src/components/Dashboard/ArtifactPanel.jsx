import React from 'react';
import { X, Check, ChevronDown, RotateCcw, Eye, Code, Maximize2, Minimize2, Download, Presentation } from 'lucide-react';
import { handlePptxExport } from '../../utils/pptxExport';
import { DebouncedSyntaxHighlighter } from './CodeBlock';
import { extractArtifacts } from '../../utils/dashboardUtils';
import ArtifactPreview from './ArtifactPreview';

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
  const [viewMode, setViewMode] = React.useState('code'); // 'code' or 'preview'
  const [isWideView, setIsWideView] = React.useState(false);

  // Derive live code from messages — updates automatically when messages change during streaming
  const liveMsg = activeArtifact ? messages[activeArtifact.msgIdx] : null;
  const liveArtifacts = liveMsg ? extractArtifacts(liveMsg.content).artifacts : [];
  
  // Matching logic: 
  // 1. If we have a structured identifier, use it FIRST.
  // 2. Otherwise fall back to fingerprint matching (for legacy snippets).
  let liveArt = null;
  if (activeArtifact?.isStructured && activeArtifact?.identifier) {
    liveArt = liveArtifacts.find(a => a.identifier === activeArtifact.identifier);
  }
  
  if (activeArtifact && !liveArt) {
      const fingerprint = (activeArtifact.codeSnapshot || '').slice(0, 80);
      liveArt = fingerprint
        ? (liveArtifacts.find(a => a.code.startsWith(fingerprint)) ?? liveArtifacts[activeArtifact.artIdx])
        : liveArtifacts[activeArtifact.artIdx];
  }

  // Always fall back to the snapshot stored at click time so no "Generating code..."
  const rawLiveCode = (activeArtifact && liveArt?.code && liveArt.code.length >= (activeArtifact.codeSnapshot || '').length)
    ? liveArt.code
    : (activeArtifact ? (activeArtifact.codeSnapshot || liveArt?.code || '') : '');
  const liveCode = rawLiveCode; 
  const liveLang = liveArt?.lang ?? activeArtifact?.lang ?? 'text';
  const liveFileName = liveArt?.fileName || activeArtifact?.fileName || `artifact.${liveLang}`;

  // Auto-switch to preview for non-code types
  React.useEffect(() => {
    if (!activeArtifact) return;
    const previewOnlyTypes = [
      'pdf', 'docx', 'xlsx', 'pptx', 'markdown', 'md', 'svg', 'mermaid', 'application/vnd.docmind.pptx', 'presentation', 'vnd'
    ];
    if (previewOnlyTypes.includes(liveLang) || liveLang.includes('pptx')) {
      setViewMode('preview');
    }
  }, [liveLang, activeArtifact]);

  const isPptx = React.useMemo(() => {
    if (liveLang === 'pptx' || liveLang === 'presentation' || liveLang === 'application/vnd.docmind.pptx') return true;
    try {
      const trimmed = liveCode.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        return parsed.slides && Array.isArray(parsed.slides);
      }
    } catch (e) {}
    return false;
  }, [liveLang, liveCode]);

  const [isExporting, setIsExporting] = React.useState(false);

  if (!activeArtifact) return null;

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
                
                {/* View Toggle - ONLY for renderable code */}
                {(['html', 'svg', 'jsx', 'tsx', 'markdown', 'md', 'css', 'pptx', 'presentation', 'application/vnd.docmind.pptx', 'vnd'].includes(liveLang) || liveLang.includes('pptx')) && (
                  <div className="artifact-view-toggle">
                    <button 
                       className={`view-toggle-btn ${viewMode === 'preview' ? 'active' : ''}`}
                       onClick={() => setViewMode('preview')}
                       title="Preview"
                    >
                       <Eye size={14} />
                    </button>
                    <button 
                       className={`view-toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
                       onClick={() => setViewMode('code')}
                       title="Code"
                    >
                       <Code size={14} />
                    </button>
                  </div>
                )}

                {/* Wide View Toggle */}
                {viewMode === 'preview' && (
                  <button 
                    className={`artifact-action-btn ${isWideView ? 'active' : ''}`}
                    onClick={() => setIsWideView(!isWideView)}
                    title={isWideView ? "Standard View" : "Wide View (Enables scrolling)"}
                    style={{ marginLeft: '4px' }}
                  >
                    {isWideView ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                )}

               <div className="artifact-header-title">
                 {liveFileName} <span className="artifact-header-title-sep">·</span> <span className="artifact-header-lang-tag">{liveLang.toUpperCase()}</span>
               </div>

               {isStreaming && activeArtifact.msgIdx === messages.length - 1 && (
                   <div className="artifact-header-live">
                      <div className="artifact-header-live-dot"></div>
                      Live
                   </div>
               )}
            </div>
            <div className="artifact-header-actions" style={{ gap: '6px', display: 'flex', alignItems: 'center' }}>
                {isPptx ? (
                  <button 
                    className="artifact-action-btn"
                    disabled={isExporting}
                    onClick={async () => {
                      setIsExporting(true);
                      try {
                        const data = JSON.parse(liveCode.trim());
                        await handlePptxExport(data, liveFileName);
                      } catch (e) {
                        alert("Error parsing presentation data.");
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    title="Download as (.pptx)"
                    style={{ background: '#10b981', color: 'white', borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', border: 'none' }}
                  >
                    {isExporting ? <RotateCcw size={14} className="spin-refresh" /> : <Download size={14} />}
                    Download .pptx
                  </button>
                ) : (
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
                )}
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
              viewMode === 'preview' ? (
                                <ArtifactPreview 
                  code={liveCode} 
                  lang={liveLang} 
                  fileName={liveFileName} 
                  identifier={activeArtifact.identifier || liveArt?.identifier || 'snippet'}
                  isWideView={isWideView} 
                />
              ) : (
                <DebouncedSyntaxHighlighter
                  code={liveCode}
                  lang={liveLang}
                  isStreaming={isStreaming}
                  scrollRef={artifactScrollRef}
                  userScrolledUpRef={userScrolledArtifactRef}
                />
              )
            ) : (
              <div style={{ padding: '16px', color: '#888', fontSize: '0.9rem' }}>Generating code...</div>
            )}
         </div>
      </div>
    </>
  );
};
