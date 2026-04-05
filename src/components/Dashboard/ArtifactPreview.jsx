import React, { useMemo } from 'react';

const ArtifactPreview = ({ code, lang }) => {
  const srcDoc = useMemo(() => {
    if (!code) return '';

    const isSvg = lang === 'svg' || code.trim().startsWith('<svg');
    const isHtml = lang === 'html' || code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html');

    if (isSvg) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body, html { margin: 0; padding: 0; height: 100%; width: 100%; display: flex; align-items: center; justify-content: center; background: transparent; overflow: hidden; }
              svg { max-width: 100%; max-height: 100%; }
            </style>
          </head>
          <body>${code}</body>
        </html>
      `;
    }

    if (isHtml) {
      // If it's a full HTML page, just use it. If not, wrap it.
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
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: transparent; color: inherit; padding: 20px; }
            </style>
          </head>
          <body>${code}</body>
        </html>
      `;
    }

    // Default: try to render as HTML/Tailwind if it's a UI snippet
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: transparent; color: inherit; padding: 20px; }
          </style>
        </head>
        <body>${code}</body>
      </html>
    `;
  }, [code, lang]);

  return (
    <div className="artifact-preview-container">
      <iframe
        title="Artifact Preview"
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-popups allow-forms allow-modals"
        className="artifact-preview-iframe"
      />
    </div>
  );
};

export default ArtifactPreview;
