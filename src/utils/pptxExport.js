/**
 * Utility to handle PPTX export using PptxGenJS
 * Loads the library dynamically if not present.
 */

// Internal helper to fetch image and convert to base64
// Handles CORS/network failures gracefully
async function fetchImageAsBase64(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn(`CORS/Fetch error for image: ${url}`, e);
    return null;
  }
}

export const handlePptxExport = async (data, fileName) => {
  try {
    if (!data || !data.slides) {
      throw new Error("Invalid presentation data");
    }

    // Dynamic load PptxGenJS
    if (!window.PptxGenJS) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const pres = new window.PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.title = data.title || fileName || "Presentation";

    const themes = {
      'modern-dark': { bg: '#1e293b', text: '#f8fafc', accent: '#3b82f6' },
      'elegant-white': { bg: '#ffffff', text: '#0f172a', accent: '#6366f1' },
      'corporate-blue': { bg: '#0c4a6e', text: '#f0f9ff', accent: '#38bdf8' }
    };

    const currentTheme = themes[data.theme] || themes['modern-dark'];
    const textColor = currentTheme.text.replace('#', '');
    const accentColor = currentTheme.accent.replace('#', '');

    // Processing slides. We use for...of to handle awaits correctly
    for (const slide of data.slides) {
      const s = pres.addSlide();
      s.background = { fill: currentTheme.bg.replace('#', '') };

      // Try to get base64 data for image if it exists
      let imgData = null;
      if (slide.image) {
        imgData = await fetchImageAsBase64(slide.image);
      }

      // Helper for backgrounds/overlays
      const addDarkOverlay = () => {
        s.addShape(pres.ShapeType.rect, { 
          x: 0, y: 0, w: '100%', h: '100%', 
          fill: { color: '000000', transparency: 50 } 
        });
      };

      if (slide.layout === 'TITLE_SLIDE') {
        if (imgData) {
          s.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%', sizing: { type: 'cover' } });
          addDarkOverlay();
          const whiteColor = 'FFFFFF';
          s.addText(slide.title, { 
            x: 1, y: 2, w: '80%', fontSize: 48, color: whiteColor, bold: true, align: 'center' 
          });
          if (slide.subtitle) {
            s.addText(slide.subtitle, { 
              x: 1, y: 3.5, w: '80%', fontSize: 24, color: accentColor, align: 'center' 
            });
          }
        } else {
          s.addText(slide.title, { 
            x: 1, y: 2, w: '80%', fontSize: 44, color: textColor, bold: true, align: 'center' 
          });
          if (slide.subtitle) {
            s.addText(slide.subtitle, { 
              x: 1, y: 3.5, w: '80%', fontSize: 24, color: accentColor, align: 'center' 
            });
          }
        }
      } else if (slide.layout === 'SECTION_HEADER') {
        if (imgData) {
          s.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%', sizing: { type: 'cover' } });
          addDarkOverlay();
          s.addText(slide.title, { 
            x: 1, y: 2.5, w: '80%', fontSize: 40, color: 'FFFFFF', bold: true, align: 'center' 
          });
        } else {
          s.addText(slide.title, { 
            x: 1, y: 2.5, w: '80%', fontSize: 36, color: textColor, bold: true, align: 'center' 
          });
        }
      } else if (slide.layout === 'IMAGE_CONTENT' || (slide.image && slide.points)) {
        if (imgData) {
          s.addImage({ data: imgData, x: 0, y: 0, w: '50%', h: '100%', sizing: { type: 'cover' } });
          s.addText(slide.title, { 
            x: '55%', y: 0.5, w: '40%', fontSize: 28, color: textColor, bold: true 
          });
          if (slide.points) {
            s.addText(slide.points.map(p => "• " + p).join('\n'), { 
              x: '55%', y: 1.5, w: '40%', h: 3.5, fontSize: 18, color: textColor, valign: 'top' 
            });
          }
        } else {
          s.addText(slide.title, { x: 0.5, y: 0.5, w: '90%', fontSize: 28, color: textColor, bold: true });
          if (slide.points) {
            s.addText(slide.points.map(p => "• " + p).join('\n'), { x: 0.5, y: 1.5, w: '90%', h: 3.5, fontSize: 18, color: textColor, valign: 'top' });
          }
        }
      } else {
        s.addText(slide.title, { x: 0.5, y: 0.5, w: '90%', fontSize: 28, color: textColor, bold: true });
        if (slide.points) {
          s.addText(slide.points.map(p => "• " + p).join('\n'), { x: 0.5, y: 1.5, w: '90%', h: 3.5, fontSize: 18, color: textColor, valign: 'top' });
        }
      }

      if (slide.speakerNotes) {
        s.addNotes(slide.speakerNotes);
      }
    }

    pres.writeFile({ fileName: `${pres.title.replace(/[<>:"/\\|?*]/g, '')}.pptx` });
  } catch (err) {
    console.error("PPTX Export Error:", err);
    alert("Export failed: " + err.message);
  }
};
