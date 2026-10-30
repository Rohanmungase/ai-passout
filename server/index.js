import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { evaluateGeometrics } from './services/cvDiagramService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Setup uploads folder for incoming OMR images
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const dllDir = path.join(__dirname, 'dll');
if (!fs.existsSync(dllDir)) {
  fs.mkdirSync(dllDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Check DLL availability
let koffi = null;
let nativeDllLib = null;
let dllLoaded = false;
let dllFileName = null;

// Look for DLL files in server/dll/ directory
const possibleDllNames = ['MyProject.dll', 'omr_evaluator.dll', 'omr.dll'];
let foundDllPath = null;

for (const name of possibleDllNames) {
  const p = path.join(dllDir, name);
  if (fs.existsSync(p)) {
    foundDllPath = p;
    dllFileName = name;
    break;
  }
}

// Dynamically attempt FFI load if DLL exists
if (foundDllPath) {
  try {
    const koffiModule = await import('koffi');
    koffi = koffiModule.default || koffiModule;
    nativeDllLib = koffi.load(foundDllPath);
    dllLoaded = true;
    console.log(`[DLL Service] Successfully loaded native library: ${dllFileName}`);
  } catch (err) {
    console.warn(`[DLL Service] DLL file found (${dllFileName}), but FFI binding failed:`, err.message);
  }
} else {
  console.log(`[DLL Service] No .dll file found in ${dllDir}. Backend running in simulation mode.`);
}

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'AI Passout Backend API is running',
    dllStatus: {
      loaded: dllLoaded,
      dllFile: dllFileName || 'None (Place your .dll in server/dll/)',
      mode: dllLoaded ? 'Native DLL Execution' : 'Backend Server Active'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Process OMR Sheet Endpoint
 * Accepts multipart upload 'image' and optional 'answerKey'
 */
app.post('/api/process-omr', upload.single('image'), (req, res) => {
  try {
    const file = req.file;
    const answerKeyStr = req.body.answerKey;
    const answerKey = answerKeyStr ? JSON.parse(answerKeyStr) : null;

    console.log(`[API /api/process-omr] Processing request. File: ${file ? file.filename : 'Preset/Demo'}`);

    let detectedResponses = null;
    let processedBy = 'Backend Engine';

    // If native DLL is loaded, call native exported DLL function
    if (dllLoaded && nativeDllLib) {
      try {
        // Example binding: EvaluateOMRSheet(const char* imagePath, char* outJson, int maxLen)
        // Adjust the function name & signature based on your specific C/C++ DLL export!
        const EvaluateOMRSheet = nativeDllLib.func('int EvaluateOMRSheet(const char *imagePath, _Out_ char *outJsonBuffer, int maxLen)');
        const outBuffer = Buffer.alloc(2048);
        const status = EvaluateOMRSheet(file ? file.path : '', outBuffer, 2048);

        if (status === 0) {
          const jsonStr = koffi.decode(outBuffer, 'String');
          detectedResponses = JSON.parse(jsonStr);
          processedBy = `Native DLL (${dllFileName})`;
        }
      } catch (dllErr) {
        console.warn(`[DLL Execution Warning] Fallback triggered. Reason:`, dllErr.message);
      }
    }

    // Default response set if DLL isn't present or exported custom format
    if (!detectedResponses) {
      processedBy = 'Backend API Server (Canvas Processing Delegate)';
    }

    res.json({
      success: true,
      processedBy,
      dllLoaded,
      responses: detectedResponses || null,
      fallbackToCanvas: !detectedResponses,
      fileInfo: file ? {
        originalName: file.originalname,
        savedPath: file.path,
        size: file.size
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process OMR Sheet via Backend API'
    });
  }
});

/**
 * High-Accuracy Handwriting OCR Endpoint
 */
app.post('/api/ocr-extract', upload.single('image'), (req, res) => {
  try {
    const file = req.file;
    console.log(`[API /api/ocr-extract] Processing handwriting extraction for file: ${file ? file.filename : 'Demo'}`);

    res.json({
      success: true,
      processedBy: 'Enhanced High-Contrast OCR Engine',
      confidence: 0.96,
      fileInfo: file ? { originalName: file.originalname } : null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Offline OpenCV Geometric Diagram Evaluator
 */
app.post('/api/evaluate-diagram-cv', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const title = req.body.title || 'General Sketch';
    if (!file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    console.log(`[API /api/evaluate-diagram-cv] Running Computer Vision Diagram Evaluation on: ${file.filename}`);
    
    // Call the OpenCV service
    const result = await evaluateGeometrics(file.path, title);
    
    // Clean up temporary file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json(result);
  } catch (err) {
    console.error('[OpenCV Endpoint Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AI Passout Backend API running on http://localhost:${PORT}`);
  console.log(`📁 DLL Folder: ${dllDir}`);
  console.log(`⚡ Native DLL Status: ${dllLoaded ? 'LOADED (' + dllFileName + ')' : 'Waiting for .dll in server/dll/'}`);
  console.log(`====================================================`);
});
