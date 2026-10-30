import { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { evaluateAnswer, evaluateQuestionWiseRubric, parseQuestionsFromExtractedText } from '../services/aiEvaluationService';
import { extractText } from '../services/ocrService';
import { useToast } from './useToast';

/** Helper function to parse student header metadata from raw extracted text */
function extractHeaderFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const headerInfo = {};

  const nameMatch = text.match(/(?:Name|Student Name|Student)\s*[\:\=]\s*([^\n\r]+)/i);
  if (nameMatch && nameMatch[1].trim()) headerInfo.name = nameMatch[1].trim().toUpperCase();

  const rollMatch = text.match(/(?:Roll\s*(?:No|Num|\.)?|PRN|Reg\s*No)\s*[\:\=]\s*([^\n\r]+)/i);
  if (rollMatch && rollMatch[1].trim()) headerInfo.rollNo = rollMatch[1].trim();

  const subjectMatch = text.match(/(?:Subject|Paper|Course)\s*[\:\=]\s*([^\n\r]+)/i);
  if (subjectMatch && subjectMatch[1].trim()) headerInfo.subject = subjectMatch[1].trim().toUpperCase();

  const classMatch = text.match(/(?:Class|Year|Department|Dept|Standard|Std)\s*[\:\=]\s*([^\n\r]+)/i);
  if (classMatch && classMatch[1].trim()) headerInfo.className = classMatch[1].trim().toUpperCase();

  const divMatch = text.match(/(?:Division|Div|Branch|Sec|Section)\s*[\:\=]\s*([^\n\r]+)/i);
  if (divMatch && divMatch[1].trim()) headerInfo.division = divMatch[1].trim().toUpperCase();

  const collegeMatch = text.match(/(?:College|Institute|University|School)\s*(?:Name)?\s*[\:\=]\s*([^\n\r]+)/i);
  if (collegeMatch && collegeMatch[1].trim()) headerInfo.collegeName = collegeMatch[1].trim().toUpperCase();

  return Object.keys(headerInfo).length > 0 ? headerInfo : null;
}

/**
 * Custom hook that orchestrates the OCR extraction and AI evaluation flow.
 * Manages loading states and dispatches results to the global context.
 */
export function useEvaluation() {
  const { state, dispatch } = useAppContext();
  const toast = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  /** Run OCR text extraction on the uploaded files */
  const runExtraction = useCallback(async (files) => {
    if (!files || files.length === 0) {
      toast.error('No files uploaded. Please upload an answer sheet first.');
      return null;
    }

    setIsExtracting(true);
    try {
      // Process all files with studentInfo and page index awareness
      const results = await Promise.all(
        files.map((file, idx) => extractText(file, { pageIndex: idx, totalPages: files.length, studentInfo: state.studentInfo }))
      );

      // Combine results
      const combinedText = results.map(r => r ? r.text : '').filter(Boolean).join('\n\n--- [Next Page] ---\n\n');
      const totalWords = results.reduce((acc, r) => acc + (r?.wordCount || 0), 0);
      const avgConfidence = results.reduce((acc, r) => acc + (r?.confidence || 0.9), 0) / (results.length || 1);
      const totalTime = results.reduce((acc, r) => acc + (r?.processingTime || 0), 0);

      const combinedResult = {
        text: combinedText,
        confidence: avgConfidence,
        wordCount: totalWords,
        processingTime: totalTime,
        fileResults: results,
      };

      // Detect subject from text if not set
      let detectedSubject = state.studentInfo?.subject;
      if (!detectedSubject) {
        if (combinedText.includes('GEOGRAPHY') || combinedText.includes('Geography') || combinedText.includes('structure of the Earth')) {
          detectedSubject = 'GEOGRAPHY';
        } else if (combinedText.includes('DBMS') || combinedText.includes('DATABASE MANAGEMENT')) {
          detectedSubject = 'DATABASE MANAGEMENT SYSTEM (DBMS)';
        } else if (combinedText.includes('COMPUTER SCIENCE') || combinedText.includes('RAM and ROM')) {
          detectedSubject = 'COMPUTER SCIENCE';
        } else if (combinedText.includes('SCIENCE') || combinedText.includes('photosynthesis') || combinedText.includes('Newton')) {
          detectedSubject = 'SCIENCE';
        } else if (combinedText.includes('MATHEMATICS') || combinedText.includes('2x²')) {
          detectedSubject = 'MATHEMATICS';
        } else if (combinedText.includes('HISTORY') || combinedText.includes('Non-Cooperation Movement')) {
          detectedSubject = 'HISTORY';
        }
      }

      // Only update missing fields in studentInfo without overwriting user selections
      const dynamicHeader = extractHeaderFromText(combinedText);
      const updatedInfo = {
        name: state.studentInfo?.name || dynamicHeader?.name || '',
        rollNo: state.studentInfo?.rollNo || dynamicHeader?.rollNo || '',
        className: state.studentInfo?.className || dynamicHeader?.className || '',
        division: state.studentInfo?.division || dynamicHeader?.division || '',
        collegeName: state.studentInfo?.collegeName || dynamicHeader?.collegeName || '',
        batch: state.studentInfo?.batch || '',
        subject: detectedSubject || 'GENERAL'
      };

      dispatch({ type: 'UPDATE_STUDENT_INFO', payload: updatedInfo });

      dispatch({ type: 'SET_OCR_RESULT', payload: combinedResult });
      toast.success(`Text extracted successfully! (${totalWords} words, ${Math.round(avgConfidence * 100)}% confidence)`);
      return combinedResult;
    } catch (err) {
      console.error("Extraction execution error:", err);
      toast.error('Failed to extract text. Please try again.');
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, [dispatch, state.studentInfo, toast]);

  /** Run AI evaluation directly on the student answer */
  const runEvaluation = useCallback(async (studentAnswer, maxMarks) => {
    if (!studentAnswer?.trim()) {
      toast.error('No student answer available. Please extract text first.');
      return null;
    }
    if (!maxMarks || maxMarks <= 0) {
      toast.error('Please set valid maximum marks.');
      return null;
    }

    setIsEvaluating(true);
    try {
      let result;
      const parsedQuestions = parseQuestionsFromExtractedText(studentAnswer);
      if (parsedQuestions && parsedQuestions.length > 0) {
        result = await evaluateQuestionWiseRubric(parsedQuestions, studentAnswer);
      } else {
        result = await evaluateAnswer(studentAnswer, maxMarks);
      }
      dispatch({ type: 'SET_EVALUATION_RESULT', payload: result });
      toast.success(`Evaluation complete! Score: ${result.marksObtained}/${result.maxMarks}`);
      return result;
    } catch (err) {
      toast.error('Evaluation failed. Please try again.');
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, [dispatch, toast]);

  return {
    isExtracting,
    isEvaluating,
    extractedText: state.extractedText,
    evaluationResult: state.evaluationResult,
    ocrResult: state.ocrResult,
    runExtraction,
    runEvaluation,
  };
}
