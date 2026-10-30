import cv from '@techstark/opencv-js';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

/**
 * Parses an image file directly into an OpenCV Mat object
 */
async function loadOpencvImage(filePath) {
  // Load the image using canvas
  const img = await loadImage(filePath);
  
  // Create a canvas with the image dimensions
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  
  // Draw the image onto the canvas
  ctx.drawImage(img, 0, 0, img.width, img.height);
  
  // Extract pixel data
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Convert into OpenCV Mat
  const mat = cv.matFromImageData(imgData);
  return mat;
}

/**
 * Geometric Diagram Evaluator
 * 
 * Uses OpenCV WebAssembly port to strictly evaluate geometric structures
 * such as straight lines (rays) and general shape complexity.
 * 
 * @param {string} imagePath - Path to the temporarily uploaded image
 * @param {string} questionTitle - The prompt/context from the question
 */
export async function evaluateGeometrics(imagePath, questionTitle) {
  let mat = null;
  let dst = null;
  let lines = null;

  try {
    // 1. Load Image
    mat = await loadOpencvImage(imagePath);
    dst = new cv.Mat();
    
    // 2. Preprocess the image (Grayscale)
    cv.cvtColor(mat, dst, cv.COLOR_RGBA2GRAY, 0);
    
    // 3. Edge Detection (Canny algorithm highlights drawn borders and pen strokes)
    // parameters: src, dst, threshold1, threshold2, apertureSize, L2gradient
    cv.Canny(dst, dst, 50, 150, 3, false);
    
    // 4. Hough Line Transform (detects mathematically straight lines like rays or edges)
    lines = new cv.Mat();
    // rho = 1, theta = Math.PI/180, threshold = 80, minLineLength = 50, maxLineGap = 10
    cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 80, 50, 10);
    
    const detectedLineCount = lines.rows;
    
    let structuralAccuracy = 50; // Base score
    let feedback = "";
    
    const titleLower = (questionTitle || '').toLowerCase();
    let diagramType = "General Sketch";
    
    // Simple heuristic: If it's an optics ray diagram, expect a fair number of straight lines
    if (titleLower.includes("ray") || titleLower.includes("mirror") || titleLower.includes("lens")) {
      diagramType = "Optics Ray Diagram";
      if (detectedLineCount >= 3) {
        structuralAccuracy = Math.min(100, 80 + (detectedLineCount * 2));
        feedback = `Excellent structural geometry. Detected ${detectedLineCount} prominent straight rays/lines indicating disciplined drawing.`;
      } else if (detectedLineCount > 0) {
        structuralAccuracy = 70;
        feedback = `Partial geometric structure. Only detected ${detectedLineCount} prominent straight lines. Ensure rays are drawn with a ruler.`;
      } else {
        structuralAccuracy = 30;
        feedback = `Poor geometry. Failed to detect any straight uniform lines or light rays.`;
      }
    } 
    // If it's a circuit
    else if (titleLower.includes("circuit") || titleLower.includes("ohm")) {
      diagramType = "Circuit Diagram";
      if (detectedLineCount >= 4) {
        structuralAccuracy = Math.min(100, 80 + detectedLineCount);
        feedback = `Good circuit geometry. Detected structural wiring (${detectedLineCount} prominent edges).`;
      } else {
        structuralAccuracy = 50;
        feedback = `Weak structure. Ensure circuit connection lines are drawn straight and prominent.`;
      }
    } 
    // Fallback for general diagram
    else {
      if (detectedLineCount > 0) {
        structuralAccuracy = Math.min(100, 70 + (detectedLineCount * 2));
        feedback = `Detected ${detectedLineCount} structural edges/lines in the diagram.`;
      } else {
        structuralAccuracy = 50;
        feedback = `No prominent straight edges found. Assuming a free-hand non-geometric diagram.`;
      }
    }

    return {
      success: true,
      diagramType,
      structuralScore: structuralAccuracy,
      detectedLineCount,
      cvFeedback: feedback
    };

  } catch (error) {
    console.error("[OpenCV Error] Diagram evaluation failed: ", error);
    return {
      success: false,
      error: error.message || "Failed to process image with computer vision.",
      structuralScore: 0
    };
  } finally {
    // Memory management: Must manually delete C++ bound objects in OpenCV.js
    if (mat) mat.delete();
    if (dst) dst.delete();
    if (lines) lines.delete();
  }
}
