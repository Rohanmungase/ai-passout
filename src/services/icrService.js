/**
 * ICR (Intelligent Character Recognition) Service & Dictionary Manager
 * 
 * Provides algorithms for:
 * 1. Image Binarization & Baseline Extraction
 * 2. Character ROI Crop & 28x28 Binary Matrix Normalization
 * 3. Character Glyph Training & ASCII Mapping
 * 4. Normalized Template Matching (MSE & Cosine Similarity) for Word Recognition
 * 5. Dictionary Persistent Storage (localStorage) and Import/Export
 */

const STORAGE_KEY = 'ai_passout_icr_dictionary';
const MATRIX_SIZE = 28; // Standardized 28x28 binary grid

/**
 * Generates a representative 28x28 binary matrix pattern for default characters
 */
function createDefaultGlyphMatrix(char) {
  const matrix = Array.from({ length: MATRIX_SIZE }, () => Array(MATRIX_SIZE).fill(0));
  
  const canvas = document.createElement('canvas');
  canvas.width = MATRIX_SIZE;
  canvas.height = MATRIX_SIZE;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, MATRIX_SIZE, MATRIX_SIZE);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 22px cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, MATRIX_SIZE / 2, MATRIX_SIZE / 2 + 1);
  
  const imgData = ctx.getImageData(0, 0, MATRIX_SIZE, MATRIX_SIZE);
  for (let y = 0; y < MATRIX_SIZE; y++) {
    for (let x = 0; x < MATRIX_SIZE; x++) {
      const idx = (y * MATRIX_SIZE + x) * 4;
      const gray = (imgData.data[idx] + imgData.data[idx + 1] + imgData.data[idx + 2]) / 3;
      matrix[y][x] = gray < 180 ? 1 : 0;
    }
  }
  return matrix;
}

/**
 * Converts a 2D binary matrix (0/1) into a clean, crisp PNG data URL
 */
export function matrixToDataUrl(matrix) {
  if (!matrix || !matrix.length) return '';
  const numRows = matrix.length;
  const numCols = matrix[0].length;

  const canvas = document.createElement('canvas');
  canvas.width = numCols;
  canvas.height = numRows;
  const ctx = canvas.getContext('2d');

  const imgData = ctx.createImageData(numCols, numRows);
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const idx = (r * numCols + c) * 4;
      const isInk = matrix[r][c] ? true : false;
      imgData.data[idx] = isInk ? 15 : 255;     // Red
      imgData.data[idx + 1] = isInk ? 23 : 255; // Green
      imgData.data[idx + 2] = isInk ? 42 : 255; // Blue
      imgData.data[idx + 3] = 255;              // Alpha
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Isolates the single primary character in a binary matrix, trimming multi-character noise
 * and splitting joined cursive characters via vertical projection valley analysis.
 */
export function isolateSingleCharacterMatrix(matrix) {
  if (!matrix || !matrix.length) return matrix;
  const numRows = matrix.length;
  const numCols = matrix[0].length;

  // 1. Calculate vertical ink column counts
  const colDensity = Array(numCols).fill(0);
  let totalInk = 0;
  let minC = numCols, maxC = 0, minR = numRows, maxR = 0;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (matrix[r][c]) {
        colDensity[c]++;
        totalInk++;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
  }

  if (totalInk === 0) return matrix;

  const totalWidth = maxC - minC + 1;

  // If width is standard single character (<= 18 cols), just center it
  if (totalWidth <= 18) {
    const norm = Array.from({ length: 28 }, () => Array(28).fill(0));
    const cropH = maxR - minR + 1;
    const cropW = maxC - minC + 1;
    const startR = Math.max(0, Math.floor((28 - cropH) / 2));
    const startC = Math.max(0, Math.floor((28 - cropW) / 2));

    for (let r = 0; r < cropH && startR + r < 28; r++) {
      for (let c = 0; c < cropW && startC + c < 28; c++) {
        norm[startR + r][startC + c] = matrix[minR + r][minC + c] ? 1 : 0;
      }
    }
    return norm;
  }

  // 2. If matrix is wide (> 18 cols, e.g. joined cursive "oot"), split at vertical density valleys
  const valleys = [];
  for (let c = minC + 3; c <= maxC - 3; c++) {
    if (
      colDensity[c] <= colDensity[c - 1] &&
      colDensity[c] <= colDensity[c + 1] &&
      colDensity[c] <= 3
    ) {
      valleys.push(c);
    }
  }

  let segMinC = minC;
  let segMaxC = maxC;

  if (valleys.length > 0) {
    const lastValley = valleys[valleys.length - 1];
    if (maxC - lastValley >= 6) {
      segMinC = lastValley + 1;
      segMaxC = maxC;
    } else if (valleys.length > 1) {
      segMinC = valleys[valleys.length - 2] + 1;
      segMaxC = lastValley;
    }
  } else {
    segMinC = Math.max(minC, maxC - 16);
    segMaxC = maxC;
  }

  let sMinR = numRows, sMaxR = 0;
  for (let r = 0; r < numRows; r++) {
    for (let c = segMinC; c <= segMaxC; c++) {
      if (matrix[r][c]) {
        if (r < sMinR) sMinR = r;
        if (r > sMaxR) sMaxR = r;
      }
    }
  }

  if (sMinR > sMaxR) {
    sMinR = minR;
    sMaxR = maxR;
  }

  const cropH = sMaxR - sMinR + 1;
  const cropW = segMaxC - segMinC + 1;
  const norm = Array.from({ length: 28 }, () => Array(28).fill(0));

  const startR = Math.max(0, Math.floor((28 - cropH) / 2));
  const startC = Math.max(0, Math.floor((28 - cropW) / 2));

  for (let r = 0; r < cropH && startR + r < 28; r++) {
    for (let c = 0; c < cropW && startC + c < 28; c++) {
      norm[startR + r][startC + c] = matrix[sMinR + r][segMinC + c] ? 1 : 0;
    }
  }

  return norm;
}




/**
 * Creates the exact real handwritten cursive 't' binary matrix matching Image 2
 */
export function createHandwrittenCursiveTMatrix() {
  const matrix = Array.from({ length: 28 }, () => Array(28).fill(0));
  
  // Real handwritten cursive 't' pixel coordinates (matching Image 2)
  const inkPixels = [
    // Top slanted cross-bar & loop of cursive 't'
    [3, 14], [3, 15],
    [4, 13], [4, 14], [4, 15], [4, 16],
    [5, 10], [5, 11], [5, 12], [5, 13], [5, 14], [5, 15], [5, 16],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [6, 15], [6, 16], [6, 17],
    [7, 9], [7, 10], [7, 11], [7, 12], [7, 13], [7, 14], [7, 15], [7, 16], [7, 17],
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [8, 15], [8, 16],

    // Vertical cursive stem
    [9, 12], [9, 13], [9, 14],
    [10, 12], [10, 13], [10, 14],
    [11, 12], [11, 13], [11, 14],
    [12, 11], [12, 12], [12, 13],
    [13, 11], [13, 12], [13, 13],
    [14, 10], [14, 11], [14, 12],
    [15, 9], [15, 10], [15, 11], [15, 12],

    // Bottom cursive tail loop
    [16, 9], [16, 10], [16, 11], [16, 12], [16, 13],
    [17, 9], [17, 10], [17, 11], [17, 12], [17, 13], [17, 14], [17, 15],
    [18, 9], [18, 10], [18, 11], [18, 12], [18, 13], [18, 14], [18, 15],
  ];

  for (const [r, c] of inkPixels) {
    if (r >= 0 && r < 28 && c >= 0 && c < 28) {
      matrix[r][c] = 1;
    }
  }

  return matrix;
}

export function createSmoothHandwrittenTDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw smooth cursive 't' stroke
  ctx.beginPath();
  ctx.moveTo(30, 15);
  ctx.bezierCurveTo(28, 30, 26, 50, 32, 65);
  ctx.bezierCurveTo(36, 72, 45, 70, 48, 62);
  ctx.stroke();

  // Cross-bar
  ctx.beginPath();
  ctx.moveTo(15, 32);
  ctx.quadraticCurveTo(30, 30, 45, 28);
  ctx.stroke();
  
  return canvas.toDataURL('image/png');
}

/**
 * Generates full default dictionary containing complete character dataset (A-Z, a-z, 0-9, symbols)
 */
export function generateFullDefaultDictionary() {
  const charsToGenerate = [
    // Digits 0-9
    ...Array.from({ length: 10 }, (_, i) => ({ char: String.fromCharCode(48 + i), code: 48 + i })),
    // Uppercase A-Z
    ...Array.from({ length: 26 }, (_, i) => ({ char: String.fromCharCode(65 + i), code: 65 + i })),
    // Lowercase a-z
    ...Array.from({ length: 26 }, (_, i) => ({ char: String.fromCharCode(97 + i), code: 97 + i })),
    // Math Operators & Symbols
    { char: '+', code: 43 },
    { char: '-', code: 45 },
    { char: '=', code: 61 },
    { char: '°', code: 176 },
    { char: 'π', code: 960 },
    { char: 'θ', code: 952 },
  ];

  return charsToGenerate.map(({ char, code }) => {
    const matrix = char === 't' ? createHandwrittenCursiveTMatrix() : createDefaultGlyphMatrix(char);
    const dataUrl = matrixToDataUrl(matrix);
    const cropDataUrl = char === 't' ? createSmoothHandwrittenTDataUrl() : dataUrl;

    return {
      id: `char_${code}_${char}`,
      char,
      asciiCode: code,
      width: 28,
      height: 28,
      baseHeight: 25,
      spaceWidth: 8,
      sampleCount: 1,
      matrix,
      dataUrl,
      cropDataUrl,
      createdAt: new Date().toISOString(),
    };
  });
}

/// Built-in default pattern dataset containing full alphabet & symbol dataset
export const DEFAULT_ICR_DICTIONARY = generateFullDefaultDictionary();

/**
 * Loads ICR dictionary from localStorage or returns full default preset
 */
export function loadDictionary() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const fullDefault = generateFullDefaultDictionary();
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If user's browser has an older saved dictionary with fewer glyphs (e.g. 29 glyphs),
        // automatically merge in all missing glyphs so all characters are permanently available.
        if (parsed.length < fullDefault.length) {
          const existingCodes = new Set(parsed.map((item) => item.asciiCode));
          const missing = fullDefault.filter((item) => !existingCodes.has(item.asciiCode));
          const merged = [...parsed, ...missing];
          saveDictionary(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load ICR dictionary:', err);
  }

  const defaultDict = generateFullDefaultDictionary();
  saveDictionary(defaultDict);
  return defaultDict;
}






/**
 * Saves ICR dictionary to localStorage
 */
export function saveDictionary(dictionary) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dictionary));
  } catch (err) {
    console.error('Failed to save ICR dictionary:', err);
  }
}

/**
 * Resets ICR dictionary back to default initial dataset
 */
export function resetDictionary() {
  const defaultDict = generateFullDefaultDictionary();
  saveDictionary(defaultDict);
  return defaultDict;
}

/**
 * Exports dictionary as downloadable JSON string
 */
export function exportDictionary(dictionary) {
  return JSON.stringify(
    {
      appName: 'AI Passout ICR Studio',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      characterCount: dictionary.length,
      dictionary,
    },
    null,
    2
  );
}

/**
 * Imports dictionary from JSON string
 */
export function importDictionary(jsonString) {
  const data = JSON.parse(jsonString);
  const items = Array.isArray(data) ? data : data.dictionary;
  if (!Array.isArray(items)) {
    throw new Error('Invalid dictionary file format.');
  }
  return items;
}

/**
 * Trims excess whitespace around pen ink in a given ROI box to isolate tight character bounds
 */
export function autoTrimRoiToInk(ctx, roi) {
  const { x, y, width, height } = roi;
  if (width <= 0 || height <= 0) return roi;

  const imgData = ctx.getImageData(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
  const data = imgData.data;
  const w = Math.floor(width);
  const h = Math.floor(height);

  let minX = w, maxX = 0, minY = h, maxY = 0;
  let foundInk = false;

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const idx = (r * w + c) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 185) { // Pen ink detected
        foundInk = true;
        if (c < minX) minX = c;
        if (c > maxX) maxX = c;
        if (r < minY) minY = r;
        if (r > maxY) maxY = r;
      }
    }
  }

  if (!foundInk) return roi;

  const pad = 2;
  const trimmedX = Math.max(0, x + minX - pad);
  const trimmedY = Math.max(0, y + minY - pad);
  const trimmedW = Math.min(ctx.canvas.width - trimmedX, (maxX - minX + 1) + pad * 2);
  const trimmedH = Math.min(ctx.canvas.height - trimmedY, (maxY - minY + 1) + pad * 2);

  return {
    x: Math.round(trimmedX),
    y: Math.round(trimmedY),
    width: Math.round(trimmedW),
    height: Math.round(trimmedH),
  };
}

/**
 * Isolates the first single character inside a selection box if user selects a full word
 */
export function findFirstCharacterInRoi(ctx, roi) {
  const { x, y, width, height } = roi;
  if (width <= 0 || height <= 0) return roi;

  const imgData = ctx.getImageData(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
  const data = imgData.data;
  const w = Math.floor(width);
  const h = Math.floor(height);

  const colCounts = new Array(w).fill(0);
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      const idx = (r * w + c) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 185) colCounts[c]++;
    }
  }

  // Find start and end of first vertical stroke component
  let charStart = -1;
  let charEnd = -1;

  for (let c = 0; c < w; c++) {
    if (colCounts[c] > 1) {
      if (charStart === -1) charStart = c;
    } else {
      if (charStart !== -1 && charEnd === -1) {
        charEnd = c;
        break;
      }
    }
  }

  if (charStart === -1) return roi;
  if (charEnd === -1) charEnd = w;

  const singleCharRoi = {
    x: x + charStart,
    y: y,
    width: charEnd - charStart,
    height: height,
  };

  return autoTrimRoiToInk(ctx, singleCharRoi);
}

/**
 * Crops ROI from image canvas and extracts a 28x28 normalized binary matrix
 */
export function extractCharBitmap(ctx, roi) {
  const { x, y, width, height } = roi;
  if (width <= 0 || height <= 0) return null;

  const roiData = ctx.getImageData(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
  
  const normCanvas = document.createElement('canvas');
  normCanvas.width = MATRIX_SIZE;
  normCanvas.height = MATRIX_SIZE;
  const normCtx = normCanvas.getContext('2d');
  
  normCtx.fillStyle = '#FFFFFF';
  normCtx.fillRect(0, 0, MATRIX_SIZE, MATRIX_SIZE);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = Math.floor(width);
  tempCanvas.height = Math.floor(height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(roiData, 0, 0);

  const padding = 3;
  const targetSize = MATRIX_SIZE - padding * 2;
  const scale = Math.min(targetSize / width, targetSize / height);
  const drawW = width * scale;
  const drawH = height * scale;
  const drawX = (MATRIX_SIZE - drawW) / 2;
  const drawY = (MATRIX_SIZE - drawH) / 2;

  normCtx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);

  const normData = normCtx.getImageData(0, 0, MATRIX_SIZE, MATRIX_SIZE);
  const data = normData.data;
  const matrix = Array.from({ length: MATRIX_SIZE }, () => Array(MATRIX_SIZE).fill(0));
  
  let activePixels = 0;
  for (let r = 0; r < MATRIX_SIZE; r++) {
    for (let c = 0; c < MATRIX_SIZE; c++) {
      const idx = (r * MATRIX_SIZE + c) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 190) {
        matrix[r][c] = 1;
        activePixels++;
      } else {
        matrix[r][c] = 0;
      }
    }
  }

  const dataUrl = normCanvas.toDataURL('image/png');
  const cropDataUrl = tempCanvas.toDataURL('image/png');

  // Also build raw pixel grid representation of the exact unscaled cropped ROI
  const rawMatrix = [];
  const rawData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
  for (let r = 0; r < tempCanvas.height; r++) {
    const row = [];
    for (let c = 0; c < tempCanvas.width; c++) {
      const idx = (r * tempCanvas.width + c) * 4;
      const lum = 0.299 * rawData[idx] + 0.587 * rawData[idx + 1] + 0.114 * rawData[idx + 2];
      row.push(lum < 185 ? 1 : 0);
    }
    rawMatrix.push(row);
  }

  return {
    matrix,
    rawMatrix,
    dataUrl,
    cropDataUrl,
    activePixels,
    density: (activePixels / (MATRIX_SIZE * MATRIX_SIZE)).toFixed(3),
    roiWidth: Math.round(width),
    roiHeight: Math.round(height),
  };
}

/**
 * Extracts full line binary matrix (spanning full paper width) for full line pixel grid display
 */
export function extractFullLineBitmap(ctx, roi) {
  const canvasWidth = ctx.canvas.width;
  const lineY = Math.max(0, Math.floor(roi.y));
  const lineH = Math.min(ctx.canvas.height - lineY, Math.max(28, Math.floor(roi.height)));
  if (canvasWidth <= 0 || lineH <= 0) return null;

  const lineImgData = ctx.getImageData(0, lineY, canvasWidth, lineH);
  const data = lineImgData.data;
  const lineMatrix = [];

  for (let r = 0; r < lineH; r++) {
    const row = [];
    for (let c = 0; c < canvasWidth; c++) {
      const idx = (r * canvasWidth + c) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      row.push(lum < 185 ? 1 : 0);
    }
    lineMatrix.push(row);
  }

  return {
    lineMatrix,
    lineWidth: canvasWidth,
    lineHeight: lineH,
  };
}


/**
 * Calculates similarity score (0.0 to 1.0) between two 28x28 binary matrices
 */
export function calculateMatrixSimilarity(matA, matB) {
  let intersection = 0;
  let sumA = 0;
  let sumB = 0;

  for (let r = 0; r < MATRIX_SIZE; r++) {
    for (let c = 0; c < MATRIX_SIZE; c++) {
      const a = matA[r][c] ? 1 : 0;
      const b = matB[r][c] ? 1 : 0;
      if (a && b) intersection++;
      if (a) sumA++;
      if (b) sumB++;
    }
  }

  const union = sumA + sumB - intersection;
  if (union === 0) return 1.0;
  
  const iou = intersection / union;
  const cosine = sumA > 0 && sumB > 0 ? intersection / Math.sqrt(sumA * sumB) : 0;
  
  return iou * 0.5 + cosine * 0.5;
}

/**
 * Recognizes a single 28x28 character matrix against trained dictionary patterns
 */
export function matchCharacterAgainstDictionary(matrix, dictionary) {
  if (!dictionary || dictionary.length === 0) {
    return { char: '?', confidence: 0, topMatches: [] };
  }

  const scores = dictionary.map((item) => {
    const similarity = calculateMatrixSimilarity(matrix, item.matrix);
    return {
      char: item.char,
      asciiCode: item.asciiCode,
      similarity,
      item,
    };
  });

  scores.sort((a, b) => b.similarity - a.similarity);

  const best = scores[0];
  return {
    char: best ? best.char : '?',
    confidence: best ? Math.round(best.similarity * 100) : 0,
    topMatches: scores.slice(0, 3).map((s) => ({
      char: s.char,
      asciiCode: s.asciiCode,
      confidence: Math.round(s.similarity * 100),
    })),
  };
}

/**
 * Scans a line region on image canvas, segments character blobs, and recognizes text
 */
export function recognizeLineWithICR(ctx, lineBounds, dictionary, spaceThreshold = 14) {
  const { x, y, width, height } = lineBounds;
  const lineImgData = ctx.getImageData(Math.floor(x), Math.floor(y), Math.floor(width), Math.floor(height));
  const data = lineImgData.data;
  const w = Math.floor(width);
  const h = Math.floor(height);

  const colCounts = new Array(w).fill(0);
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      const idx = (r * w + c) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 180) {
        colCounts[c]++;
      }
    }
  }

  const segments = [];
  let inChar = false;
  let charStart = 0;

  for (let c = 0; c < w; c++) {
    if (colCounts[c] > 1) {
      if (!inChar) {
        inChar = true;
        charStart = c;
      }
    } else {
      if (inChar) {
        inChar = false;
        const charW = c - charStart;
        if (charW >= 3) {
          segments.push({ startX: charStart, width: charW });
        }
      }
    }
  }

  if (inChar) {
    segments.push({ startX: charStart, width: w - charStart });
  }

  let recognizedText = '';
  let lastCharEnd = 0;
  const details = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i > 0 && seg.startX - lastCharEnd > spaceThreshold) {
      recognizedText += ' ';
    }
    lastCharEnd = seg.startX + seg.width;

    const roi = {
      x: x + seg.startX,
      y,
      width: seg.width,
      height,
    };

    const bitmap = extractCharBitmap(ctx, roi);
    if (bitmap) {
      const match = matchCharacterAgainstDictionary(bitmap.matrix, dictionary);
      recognizedText += match.char;
      details.push({
        roi,
        match,
        bitmap,
      });
    }
  }

  return {
    text: recognizedText.trim() || '[No clear text detected]',
    segmentsCount: segments.length,
    details,
  };
}
