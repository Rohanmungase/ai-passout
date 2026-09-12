/**
 * Helper to handle PDF Data URLs & Blob URLs safely without triggering browser about:blank#blocked errors.
 */

/**
 * Converts a Base64 / Data URL to a Blob object URL
 * @param {string} dataUrl 
 * @returns {string} Blob URL
 */
export function getPdfBlobUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http')) return dataUrl;

  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return dataUrl;
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error creating PDF Blob URL:', err);
    return dataUrl;
  }
}

/**
 * Opens a PDF Data URL safely in a new browser tab or triggers download if popups blocked
 * @param {string} dataUrl 
 * @param {string} fileName 
 */
export function openPdfInNewTab(dataUrl, fileName = 'Answer_Sheet.pdf') {
  if (!dataUrl) return;

  try {
    const blobUrl = getPdfBlobUrl(dataUrl);
    const newWin = window.open(blobUrl, '_blank');
    
    if (!newWin) {
      // Fallback: Trigger direct download if popup blocker prevents new tab
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.error('Error opening PDF:', err);
  }
}
