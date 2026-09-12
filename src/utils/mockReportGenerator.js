/**
 * Mock Report Generator
 * Generates structured report data for the evaluation results.
 */

import { formatTimestamp, getGrade } from './formatters';

/**
 * Generates a complete report object from evaluation data.
 * @param {Object} params
 * @param {string} params.studentAnswer - The student's answer text
 * @param {string} params.correctAnswer - The correct/model answer text
 * @param {string} params.extractedText - The OCR-extracted text
 * @param {Object} params.evaluationResult - The evaluation result from aiEvaluationService
 * @returns {Object} A structured report object
 */
export function generateReport({ studentAnswer, correctAnswer, extractedText, evaluationResult, studentInfo }) {
  const percentage = (evaluationResult.marksObtained / evaluationResult.maxMarks) * 100;

  return {
    id: `RPT-${Date.now()}`,
    generatedAt: formatTimestamp(),
    studentInfo: studentInfo || {},
    studentAnswer,
    correctAnswer,
    extractedText,
    marks: {
      obtained: evaluationResult.marksObtained,
      maximum: evaluationResult.maxMarks,
      percentage: Math.round(percentage * 10) / 10,
      grade: getGrade(percentage),
    },
    analytics: {
      accuracy: evaluationResult.accuracy,
      similarity: evaluationResult.similarity,
      grammar: evaluationResult.grammar,
      keywordMatch: evaluationResult.keywordMatch,
      completeness: evaluationResult.completeness,
    },
    feedback: evaluationResult.feedback,
    summary: generateSummary(percentage, evaluationResult),
  };
}

/**
 * Generates a text summary based on the evaluation scores.
 */
function generateSummary(percentage, result) {
  if (percentage >= 90) {
    return 'Exceptional performance! The student demonstrates a thorough understanding of the topic with excellent use of terminology and comprehensive coverage.';
  } else if (percentage >= 75) {
    return 'Good performance. The student shows solid understanding of the core concepts. Minor improvements in detail and terminology could further enhance the answer.';
  } else if (percentage >= 60) {
    return 'Satisfactory performance. The student covers the basic concepts but could benefit from more detailed explanations and better use of technical terms.';
  } else if (percentage >= 40) {
    return 'Below average performance. The student needs to improve understanding of key concepts and provide more comprehensive answers.';
  } else {
    return 'The answer needs significant improvement. The student should review the topic thoroughly and practice writing structured, detailed answers.';
  }
}
