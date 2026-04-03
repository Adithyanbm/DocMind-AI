/* src/utils/dashboardUtils.js */

/**
 * Infer a meaningful filename from code content
 */
export const inferCodeName = (rawCode, lang) => {
  const filenameComment = rawCode.match(/^#\s*filename:\s*(\S+)/im)
    || rawCode.match(/^\/\/\s*filename:\s*(\S+)/im)
    || rawCode.match(/^<!--\s*filename:\s*(\S+)/im)
    || rawCode.match(/^\/\*\s*filename:\s*(\S+)/im);
  if (filenameComment) return filenameComment[1];

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
  return finalCleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^([*+-]|\d+\.)\s*\n+/gm, '$1 ');
};

/**
 * Extract artifacts (code blocks) from message content
 */
export const extractArtifacts = (text) => {
  if (!text) return { artifacts: [], preText: '', postText: '' };
  const artifacts = [];
  let firstArtifactIndex = -1;
  let lastArtifactEndIndex = -1;

  const regex = /```([\w-]+)?\n([\s\S]*?)(?:```|$)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawCode = match[2].replace(/^\n+/, '').replace(/\n$/, '');
    const hasFilenameTag = /^(?:#|\/\/|<!--|\/\*)\s*filename:\s*\S+/im.test(rawCode);
    const lineCount = rawCode.split('\n').length;
    
    if (hasFilenameTag || lineCount >= 12) {
      if (firstArtifactIndex === -1) {
         firstArtifactIndex = match.index;
      }
      lastArtifactEndIndex = match.index + match[0].length;

      const lang = match[1] || 'text';
      const fileName = inferCodeName(rawCode, lang);
      const descMatch = /^(?:#|\/\/|<!--|\/\*)\s*description:\s*(.*)/im.exec(rawCode);
      const fileDesc = descMatch ? descMatch[1].trim() : `Generated ${fileName}`;
      
      let cleanedCode = rawCode
         .replace(/^(?:#|\/\/|<!--|\/\*)\s*filename:\s*(.*)\n?/im, '')
         .replace(/^(?:#|\/\/|<!--|\/\*)\s*description:\s*(.*)\n?/im, '')
         .trim();

      artifacts.push({ lang, code: cleanedCode, fileName, fileDesc });
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
