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
      toast.info('Scanning Sample Answer Key image...');
      const extractedKeyMap = await extractAnswersFromImage(imageFile);

      const newKey = DEFAULT_ANSWER_KEY.map(q => ({
        ...q,
        answer: extractedKeyMap[q.qNo] || q.answer,
      }));
      setAnswerKey(newKey);
      dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: newKey });
      toast.success(`Master Answer Key auto-filled from "${imageFile.name}"!`);
      return newKey;
    } catch (err) {
      toast.error('Failed to extract answer key from sample sheet.');
      return null;
    }
  }, [dispatch, toast]);

  /** Select and apply a saved answer key from teacher repository */
  const selectSavedAnswerKey = useCallback((savedKey) => {
    if (!savedKey) return;
    const targetAnswers = savedKey.answers || DEFAULT_ANSWER_KEY;
    setAnswerKey(targetAnswers);
    dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: targetAnswers });
    toast.success(`Loaded Answer Key: "${savedKey.title}"`);
  }, [dispatch, toast]);

  /** Save current answer key into teacher repository */
  const saveAnswerKey = useCallback((title, subject = 'Computer Science', setCode = 'Set A', previewUrl = null) => {
    if (!title || !title.trim()) {
      toast.error('Please enter a title for the Answer Key.');
      return null;
    }
    const cleanTitle = title.trim();
    const finalTitle = setCode && !cleanTitle.toLowerCase().includes(setCode.toLowerCase())
      ? `${cleanTitle} (${setCode})`
      : cleanTitle;

    const newKeyObj = {
      id: `key-${Date.now()}`,
      title: finalTitle,
      subject: subject.trim() || 'General Subject',
      setCode: setCode || 'Set A',
      totalQuestions: answerKey.length,
      answers: answerKey,
      previewUrl: previewUrl || null,
      created: new Date().toISOString(),
      author: state.user?.name || 'Teacher / Evaluator'
    };
    dispatch({ type: 'SAVE_ANSWER_KEY', payload: newKeyObj });
    toast.success(`Answer Key "${newKeyObj.title}" saved to Teacher Repository!`);
    return newKeyObj;
  }, [answerKey, dispatch, state.user, toast]);

  /** Delete an answer key from teacher repository */
  const deleteAnswerKey = useCallback((id) => {
    dispatch({ type: 'DELETE_ANSWER_KEY', payload: id });
    toast.info('Answer Key removed from Teacher Repository.');
  }, [dispatch, toast]);

  return {
    isProcessing,
    answerKey,
    savedAnswerKeys: state.savedAnswerKeys || [],
    omrResult: state.omrResult,
    runOMREvaluation,
    updateAnswerKeyChoice,
    loadAnswerKeyFromImage,
    selectSavedAnswerKey,
    saveAnswerKey,
    deleteAnswerKey,
    setAnswerKey,
  };
}
