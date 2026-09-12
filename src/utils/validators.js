/**
 * Validation utilities for the application.
 */

/**
 * Validates that the evaluation form has all required fields.
 * @param {{ correctAnswer: string, studentAnswer: string, maxMarks: number }} fields
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEvaluationForm({ studentAnswer, maxMarks }) {
  const errors = [];
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    errors.push('Student answer is required.');
  }
  if (!maxMarks || maxMarks <= 0) {
    errors.push('Maximum marks must be greater than 0.');
  }
  if (maxMarks > 100) {
    errors.push('Maximum marks cannot exceed 100.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that an image file meets the upload requirements.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUploadFile(file) {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  const maxSize = 20 * 1024 * 1024; // 20MB for PDFs

  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const nameLower = file.name.toLowerCase();
  const isAllowed = allowedTypes.includes(file.type) || nameLower.endsWith('.pdf') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg');

  if (!isAllowed) {
    return { valid: false, error: 'Invalid file type. Only PNG, JPG, JPEG, and PDF files are supported.' };
  }
  if (file.size > maxSize) {
    return { valid: false, error: 'File is too large. Maximum file size is 20MB.' };
  }
  return { valid: true };
}
