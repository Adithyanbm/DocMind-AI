import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url';

// Set the worker source from the locally bundled file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Generates a high-quality thumbnail of the first page of a PDF.
 * @param {string} base64 - Base64 encoded PDF content.
 * @returns {Promise<string>} - Promise resolving to base64 encoded JPG thumbnail.
 */
export const generatePDFThumbnail = async (base64) => {
  try {
    const response = await fetch(`data:application/pdf;base64,${base64}`);
    const arrayBuffer = await response.arrayBuffer();
    const array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({ data: array });
    const pdf = await loadingTask.promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Set scale for high quality but small file size
    const viewport = page.getViewport({ scale: 0.8 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    
    const thumbnail = canvas.toDataURL('image/jpeg', 0.85);
    return { thumbnail, numPages: pdf.numPages };
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    return null;
  }
};
