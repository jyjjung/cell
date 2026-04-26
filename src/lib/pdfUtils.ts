import * as pdfjsLib from 'pdfjs-dist';

// Make sure to use the correct worker src
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Converts a PDF file into an array of image Blobs.
 * @param file The PDF File object
 * @param scale The resolution scale (default 2 for high quality)
 * @returns Array of Blobs, one for each page
 */
export async function convertPdfToImages(file: File, scale = 2): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const imageBlobs: Blob[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    // Prepare canvas using PDF page dimensions
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;

    // Convert canvas to Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
    });
    
    if (blob) {
      imageBlobs.push(blob);
    }
  }

  return imageBlobs;
}
