/* src/utils/dashboardUtils.js */

/**
 * Infer a meaningful filename from code content
 */
export const inferCodeName = (rawCode, lang) => {
  const filenameComment = rawCode.match(/^\s*(?:#|\/\/|<!--|\/\*)\s*filename:\s*([\w\.\-\_\/]+)(?:\s*-->|\s*->|\s*\*\/|$|\s)/im);
  if (filenameComment) return filenameComment[1].trim();

  const extMap = { 
    python: 'py', javascript: 'js', typescript: 'ts', jsx: 'jsx', tsx: 'tsx', 
    bash: 'sh', shell: 'sh', html: 'html', css: 'css', java: 'java', 
    cpp: 'cpp', c: 'c', go: 'go', rust: 'rs', ruby: 'rb' 
  };
  const ext = extMap[lang?.toLowerCase()] || lang || 'txt';

  const pyClass = rawCode.match(/^class\s+(\w+)/m);
  if (pyClass) return `${pyClass[1].toLowerCase()}.${ext}`;
  const pyDef = rawCode.match(/^def\s+(?!__)(\w+)/m);
  if (pyDef && lang === 'python') return `${pyDef[1]}.${ext}`;
  const jsClass = rawCode.match(/^(?:export\s+)?(?:default\s+)?class\s+(\w+)/m);
  if (jsClass) return `${jsClass[1]}.${ext}`;
  const jsComp = rawCode.match(/^(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z]\w+)/m);
  if (jsComp) return `${jsComp[1]}.${ext}`;
  const jsFn = rawCode.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m);
  if (jsFn) return `${jsFn[1]}.${ext}`;
  const htmlTitle = rawCode.match(/<title>([^<]{1,30})<\/title>/i);
  if (htmlTitle) return `${htmlTitle[1].trim().replace(/\s+/g, '_').toLowerCase()}.html`;
  if (rawCode.startsWith('#!/')) return `script.${ext}`;

  return `snippet.${ext}`;
};

/**
 * Strip ACTION: metadata and clean up markdown
 */
export const cleanMarkdown = (text) => {
  if (!text) return '';
  
  // 1. Identify and preserve ACTION line for UI feedback if it's the only content
  const actionMatch = text.match(/ACTION:\s*(.*)/);
  let cleaned = text.replace(/ACTION:\s*(.*)(\n|$)/g, '').trim();
  
  if (!cleaned && actionMatch) {
    // If we only have an ACTION line, show it subtly instead of stripping it completely 
    // This prevents 'empty' bubbles during project generation.
    return `*${actionMatch[1]}*`;
  }
  
  let processedText = cleaned || text.replace(/ACTION:\s*(.*)(\n|$)/g, '');

  const match = processedText.match(/^\s*```(?:markdown|md)\s*?\n([\s\S]*)$/i);
  let finalCleaned = processedText;
  if (match) {
    finalCleaned = match[1].replace(/\n?```\s*$/, '');
  }
  
  // Strip out any hallucinated metadata tags that shouldn't be displayed
  finalCleaned = finalCleaned
    .replace(/<!--\s*ACTIVE_VERSION:\s*\d+\s*--?>/gi, '')
    .replace(/<!--\s*VERSIONS:\s*.*?--?>/gi, '');
    
  return finalCleaned
    .replace(/\n{3,}/g, '\n\n');
};

/**
 * Map custom or shorthand languages to Prism-compatible names
 */
export const mapLanguage = (lang) => {
  if (!lang) return 'javascript';
  const lower = lang.toLowerCase().trim();
  
  // Handle x-react, react, etc.
  if (lower.includes('react') || lower === 'jsx' || lower === 'tsx') return 'jsx';
  if (lower === 'js' || lower === 'javascript') return 'javascript';
  if (lower === 'py' || lower === 'python') return 'python';
  if (lower === 'ts' || lower === 'typescript') return 'typescript';
  if (lower === 'htm' || lower === 'html') return 'html';
  if (lower === 'css') return 'css';
  if (lower === 'json') return 'json';
  if (lower === 'sh' || lower === 'bash' || lower === 'shell') return 'bash';
  if (lower === 'sql') return 'sql';
  if (lower === 'md' || lower === 'markdown') return 'markdown';
  if (lower === 'svg') return 'svg';
  
  // Strip x- prefix if it exists but no match found
  if (lower.startsWith('x-')) return lower.substring(2);
  
  return lower;
};

/**
 * Intelligent fallback to guess language from code content 
 * if the MIME type is generic or missing.
 */
export const inferLanguageFromContent = (code, currentLang) => {
  if (currentLang && currentLang !== 'text' && currentLang !== 'plain') return currentLang;
  
  const snippet = code.trim().slice(0, 1000);
  
  // React/JSX detection (most common source of "plain" errors)
  if (
    snippet.includes('import React') || 
    snippet.includes('useState') || 
    snippet.includes('useEffect') ||
    snippet.includes('from \'antd\'') ||
    snippet.includes('from "@ant-design/icons"') ||
    (/<[A-Z][A-Za-z0-9]+\s*(?:\/|>)/.test(snippet)) || 
    (snippet.includes('export default function') && snippet.includes('return ('))
  ) {
    return 'jsx';
  }
  
  // Python detection
  if (snippet.includes('def ') || (snippet.includes('import ') && snippet.includes(':'))) {
    return 'python';
  }
  
  // HTML/SVG detection
  if (snippet.startsWith('<')) {
    if (snippet.includes('<svg')) return 'svg';
    if (snippet.includes('<div') || snippet.includes('<html') || snippet.includes('<!DOCTYPE')) return 'html';
  }

  return currentLang || 'text';
};

/**
 * Extract artifacts (code blocks) from message content
 */
/**
 * Extract artifacts from message content using structured tags
 */
export const extractArtifacts = (text) => {
  if (!text) return { artifacts: [], preText: '', postText: '' };
  
  const artifacts = [];
  let firstArtifactIndex = -1;
  let lastArtifactEndIndex = -1;

  // 1. Match <docmind_artifact> tags (including streaming/unclosed tags)
  // Reusable regex for attributes (supporting both single and double quotes)
  const attrRegex = /(\w+)=['"]([^'"]*)['"]/g;
  
  // Tag regex: matches <docmind_artifact ...> and optional content + closing tag
  const artifactRegex = /<docmind_artifact\s+([^>]*?)>([\s\S]*?)(?:<\/docmind_artifact>|$)/g;
  
  let match;
  while ((match = artifactRegex.exec(text)) !== null) {
    const attrString = match[1];
    const codeContent = match[2] || '';
    
    // Parse attributes
    const attrs = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    const identifier = attrs.identifier || 'snippet';
    const type = attrs.type || 'text/plain';
    const title = attrs.title || 'Untitled Artifact';

    // Map MIME type to language for SyntaxHighlighter
    const langMap = {
      'application/react': 'jsx',
      'text/javascript': 'javascript',
      'text/x-python': 'python',
      'text/html': 'html',
      'text/css': 'css',
      'text/markdown': 'markdown',
      'image/svg+xml': 'svg',
      'application/code': 'code',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
    };
    const rawLang = langMap[type] || type.split('/')[1]?.split('.')[0] || 'text';
    let lang = mapLanguage(rawLang);
    
    // Fallback: If we got 'text' or 'plain', try to infer better highlighting from content
    lang = inferLanguageFromContent(codeContent, lang);

    if (firstArtifactIndex === -1) firstArtifactIndex = match.index;
    lastArtifactEndIndex = match.index + match[0].length;

    artifacts.push({
      identifier,
      type,
      title,
      lang,
      code: codeContent.trim(),
      fileName: identifier.includes('.') ? identifier : `${identifier}.${lang === 'jsx' ? 'jsx' : lang}`,
      fileDesc: title,
      isStructured: true
    });
  }

  // 2. Fallback to classic triple-backtick blocks for backward compatibility 
  // ONLY if no structured artifacts were found (to avoid double parsing)
  if (artifacts.length === 0) {
    const classicRegex = /```([\w-]+)?([^\n]*)\n?([\s\S]*?)(?:```|$)/g;
    while ((match = classicRegex.exec(text)) !== null) {
      const rawLang = match[1] || 'text';
      const lang = mapLanguage(rawLang);
      const codeBody = match[3] || '';
      
      const hasFilenameTag = /^\s*(?:#|\/\/|<!--|\/\*)\s*filename:\s*\S+/im.test(codeBody);
      const lineCount = codeBody.split('\n').length;
      
      if (hasFilenameTag || lineCount >= 12) {
        if (firstArtifactIndex === -1) firstArtifactIndex = match.index;
        lastArtifactEndIndex = match.index + match[0].length;

        const fileName = inferCodeName(codeBody, lang);
        const descMatch = /^\s*(?:#|\/\/|<!--|\/\*)\s*description:\s*(.*)/im.exec(codeBody);
        const fileDesc = descMatch ? descMatch[1].trim() : `Generated ${fileName}`;
        
        let cleanedCode = codeBody
           .replace(/^\s*(?:#|\/\/|<!--|\/\*)\s*filename:\s*\S+(?:\s*(?:-->|->|\*\/))?\s*\n?/im, '')
           .replace(/^\s*(?:#|\/\/|<!--|\/\*)\s*description:\s*.*?(?:-->|->|\*\/|(?=\n|$))\s*\n?/im, '')
           .replace(/\s+$/, '');

        artifacts.push({ lang, code: cleanedCode, fileName, fileDesc, isStructured: false });
      }
    }
  }

  let preText = text;
  let postText = '';
  if (firstArtifactIndex !== -1) {
    preText = text.substring(0, firstArtifactIndex);
    postText = text.substring(lastArtifactEndIndex);
  }

  return { artifacts, preText, postText };
};
