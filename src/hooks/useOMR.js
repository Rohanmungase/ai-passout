import { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { processOMRSheet, extractAnswersFromImage, DEFAULT_ANSWER_KEY } from '../services/omrService';
import { useToast } from './useToast';

/**
 * Custom hook to manage OMR bubble sheet scanning and evaluation state.
 */
export function useOMR() {
  const { state, dispatch } = useAppContext();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [answerKey, setAnswerKey] = useState(state.omrAnswerKey || DEFAULT_ANSWER_KEY);

  /** Process an OMR sheet against the answer key */
  const runOMREvaluation = useCallback(async (fileOrPreset, options = {}, overrideKey = null) => {
    setIsProcessing(true);
    try {
      const activeKey = overrideKey || state.omrAnswerKey || DEFAULT_ANSWER_KEY;
      const result = await processOMRSheet(fileOrPreset, activeKey, options);
      dispatch({ type: 'SET_OMR_RESULT', payload: result });
      toast.success(`OMR sheet evaluated! Score: ${result.summary.totalScore}/${result.summary.maxScore} (${result.summary.percentage}%)`);
      return result;
    } catch (err) {
      console.error('OMR Evaluation error:', err);
      toast.error('Failed to evaluate OMR sheet. Please try again.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [answerKey, dispatch, toast]);

  /** Update an answer key choice for a question */
  const updateAnswerKeyChoice = useCallback((qNo, newAnswer) => {
    const updatedKey = answerKey.map(q => q.qNo === qNo ? { ...q, answer: newAnswer } : q);
    setAnswerKey(updatedKey);
    dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: updatedKey });
  }, [answerKey, dispatch]);

  /** Extract and load Answer Key directly from an Answer Key Image File */
  const loadAnswerKeyFromImage = useCallback(async (imageFile) => {
    try {
      toast.info('Scanning Answer Key image...');
      const extractedKeyMap = await extractAnswersFromImage(imageFile, true);
      const newKey = DEFAULT_ANSWER_KEY.map(q => ({
        ...q,
        answer: extractedKeyMap[q.qNo] || q.answer,
      }));
      setAnswerKey(newKey);
      dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: newKey });
      toast.success(`Master Answer Key extracted from image "${imageFile.name}"!`);
      return newKey;
    } catch (err) {
      toast.error('Failed to extract answer key from image.');
      return null;
    }
  }, [dispatch, toast]);

  return {
    isProcessing,
    answerKey,
    omrResult: state.omrResult,
    runOMREvaluation,
    updateAnswerKeyChoice,
    loadAnswerKeyFromImage,
    setAnswerKey,
  };
}
