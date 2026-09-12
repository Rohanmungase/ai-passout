import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Target, BarChart3, CheckCircle2, BookOpen,
  Sparkles, ArrowRight, AlertCircle, Hash, Type,
  Plus, Trash2, Layers, ListOrdered, CheckSquare, RefreshCw
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useEvaluation } from '../hooks/useEvaluation';
import { useToast } from '../hooks/useToast';
import { validateEvaluationForm } from '../utils/validators';
import { evaluateQuestionWiseRubric } from '../services/aiEvaluationService';
import { parseQATextIntoQuestions } from '../services/ocrService';
import AnalyticsCard from '../components/AnalyticsCard';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import FeedbackList from '../components/FeedbackList';
import LoadingSkeleton from '../components/LoadingSkeleton';
import StudentInfoCard from '../components/StudentInfoCard';

/**
 * Evaluation page — input student answer + evaluate with AI or Question-wise Rubric.
 */
export default function Evaluation() {
  const { state, dispatch } = useAppContext();
  const { isEvaluating, runEvaluation, evaluationResult } = useEvaluation();
  const toast = useToast();
  const navigate = useNavigate();

  const [evalMode, setEvalMode] = useState('rubric'); // 'single' or 'rubric'
  const [studentAnswer, setStudentAnswer] = useState(state.extractedText || '');
  const [maxMarks, setMaxMarks] = useState(state.maxMarks || 10);

  // Question-wise Rubric Questions State
  const [questions, setQuestions] = useState(() => {
    if (state.extractedText) {
      const parsed = parseQATextIntoQuestions(state.extractedText);
      if (parsed && parsed.length > 0) return parsed;
    }
    return [
      { id: 1, qNo: 'Q.a', title: 'Write a short note on the Khilafat Movement.', maxMarks: 5, modelAnswer: 'The Khilafat Movement (1919–1924) was an agitation by Indian Muslims allied with Mahatma Gandhi to pressure the British government to preserve the authority of the Ottoman Caliphate as Head of Islam. It promoted Hindu-Muslim unity.', studentAnswer: 'The Khilafat Movement was started in 1919 to protect the rights of the Ottoman Caliph. Indian Muslims led this movement with the support of Mahatma Gandhi. It promoted Hindu-Muslim unity.', presetStatus: 'Correct' },
      { id: 2, qNo: 'Q.b', title: 'Write a short note on Bhagat Singh.', maxMarks: 5, modelAnswer: 'Bhagat Singh was a prominent Indian freedom fighter who advocated socialism and revolution against British rule. He avenged the death of Lala Lajpat Rai by killing Saunders and was executed on 23 March 1931.', studentAnswer: 'Bhagat Singh was a famous poet and writer. He wrote many books on socialism. He believed in non-violence and peaceful protests. He was arrested in 1942 and died in jail in 1945.', presetStatus: 'Incorrect' },
      { id: 3, qNo: 'Q.c', title: 'Write a short note on Indian National Congress.', maxMarks: 5, modelAnswer: 'The Indian National Congress (INC) was founded in 1885 by A.O. Hume. It played a pivotal role in leading the Indian Independence movement against British colonial rule.', studentAnswer: 'The Indian National Congress was founded in 1885 by A.O. Hume. It played an important role in India\'s freedom struggle. It demanded rights and reforms through petitions in the early years.', presetStatus: 'Correct' },
      { id: 4, qNo: 'Q.d', title: 'Write a short note on the Non-Cooperation Movement.', maxMarks: 5, modelAnswer: 'The Non-Cooperation Movement was launched by Mahatma Gandhi in 1920 to resist British rule through non-violent means. Citizens surrendered titles and boycotted government institutions.', studentAnswer: 'The Non-Cooperation Movement was started by Subhas Chandra Bose in 1930. People cooperated with the British government. It was a violent movement and it was successful.', presetStatus: 'Incorrect' },
      { id: 5, qNo: 'Q.e', title: 'Write a short note on the Battle of Plassey.', maxMarks: 5, modelAnswer: 'The Battle of Plassey was fought on 23 June 1757 between the Nawab of Bengal (Siraj-ud-Daulah) and the British East India Company led by Robert Clive. British victory established East India Company rule.', studentAnswer: 'The Battle of Plassey was fought in 1764 between the British and the French. The French won this battle and gained control over Bengal.', presetStatus: 'Incorrect' },
      { id: 6, qNo: 'Q.f', title: 'Write a short note on the Quit India Movement.', maxMarks: 5, modelAnswer: 'The Quit India Movement was launched by Mahatma Gandhi on 8 August 1942 during World War II, demanding an end to British rule in India with the call Do or Die.', studentAnswer: 'The Quit India Movement was started in 1917 by Bal Gangadhar Tilak. It demanded complete independence. It ended peacefully in 1918.', presetStatus: 'Incorrect' },
    ];
  });

  useEffect(() => {
    if (state.extractedText) {
      setStudentAnswer(state.extractedText);
      const parsed = parseQATextIntoQuestions(state.extractedText);
      if (parsed && parsed.length > 0) {
        setQuestions(parsed);
      }
    }
  }, [state.extractedText]);

  const [isRubricEvaluating, setIsRubricEvaluating] = useState(false);

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        qNo: `Q.${nextNum}`,
        title: `Question ${nextNum} description`,
        maxMarks: 5,
        modelAnswer: '',
      },
    ]);
  };

  const handleRemoveQuestion = (id) => {
    if (questions.length <= 1) {
      toast.warning('At least one question is required in the rubric.');
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (id, field, value) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleLoadPreset = (presetName) => {
    if (presetName === 'math') {
      setQuestions([
        { id: 1, qNo: 'Q.1', title: 'Solve the following linear equation : 3x - 5 = 16', maxMarks: 5, modelAnswer: '3x - 5 = 16 => 3x = 21 => x = 7' },
        { id: 2, qNo: 'Q.2', title: 'Factorise : x² - 5x + 6', maxMarks: 5, modelAnswer: 'x² - 5x + 6 = (x - 2)(x - 3)' },
        { id: 3, qNo: 'Q.3', title: 'Solve the simultaneous equations : 2x + 3y = 12 ...(1) and x - y = 1 ...(2)', maxMarks: 5, modelAnswer: 'x = 3, y = 2' },
        { id: 4, qNo: 'Q.4', title: 'Draw a neat diagram of a right angled triangle and find the value of sin θ, cos θ and tan θ.', maxMarks: 5, modelAnswer: 'sin θ = 3/5, cos θ = 4/5, tan θ = 3/4' },
        { id: 5, qNo: 'Q.5', title: 'If the points A(2, 3) and B(6, 7) are the end points of a line segment, find the distance between them.', maxMarks: 5, modelAnswer: 'd = √((6-2)² + (7-3)²) = √32 = 4√2 units' },
        { id: 6, qNo: 'Q.6', title: 'Complete the following table for the linear function y = 2x + 1.', maxMarks: 5, modelAnswer: 'For x = -2, -1, 0, 1, 2; y values are -3, -1, 1, 3, 5' },
        { id: 7, qNo: 'Q.7', title: 'Find the area of a circle whose radius is 7 cm. (Use π = 22/7)', maxMarks: 5, modelAnswer: 'Area = πr² = (22/7) * 49 = 154 cm²' },
        { id: 8, qNo: 'Q.8', title: 'A bag contains 5 red balls, 3 white balls and 2 blue balls. Find the probability of drawing a white ball.', maxMarks: 5, modelAnswer: 'P(White) = 3/10 = 0.3' },
      ]);
      toast.success('Loaded Mathematics 8-Question Paper Preset');
    } else if (presetName === 'physics') {
      setQuestions([
        { id: 1, qNo: 'Q.1', title: "State Newton's Second Law of Motion", maxMarks: 5, modelAnswer: 'F = ma' },
        { id: 2, qNo: 'Q.2', title: "State Ohm's Law and express V = IR", maxMarks: 5, modelAnswer: 'V = IR, voltage is proportional to current' },
        { id: 3, qNo: 'Q.3', title: 'Derive Kinetic Energy formula (E = 1/2 mv²)', maxMarks: 10, modelAnswer: 'Work done W = F*d = m*a*d = 1/2 mv²' },
      ]);
      toast.success('Loaded Physics Question Paper Preset');
    } else if (presetName === 'cs') {
      setQuestions([
        { id: 1, qNo: 'Q.1', title: 'Define Object-Oriented Programming (OOP) Pillars', maxMarks: 5, modelAnswer: 'Encapsulation, Inheritance, Polymorphism, Abstraction' },
        { id: 2, qNo: 'Q.2', title: 'Difference between Array and Linked List', maxMarks: 5, modelAnswer: 'Array contiguous memory, Linked list pointer nodes' },
        { id: 3, qNo: 'Q.3', title: 'Explain Time Complexity of Quick Sort (Average & Worst)', maxMarks: 10, modelAnswer: 'Average O(n log n), Worst O(n²)' },
      ]);
      toast.success('Loaded Computer Science Question Paper Preset');
    } else if (presetName === 'geography') {
      setQuestions([
        { id: 1, qNo: 'Q.1', title: 'Define Geography. List its branches.', maxMarks: 4, modelAnswer: 'Study of Earth\'s surface, physical and human environment.' },
        { id: 2, qNo: 'Q.2', title: 'Write a short note on the structure of the Earth.', maxMarks: 4, modelAnswer: 'Layers: Crust (outermost), Mantle (molten rock), Core (inner/outer).' },
        { id: 3, qNo: 'Q.3', title: 'Explain the formation of soil.', maxMarks: 4, modelAnswer: 'Weathering of parent rock material mixed with organic matter.' },
        { id: 4, qNo: 'Q.4', title: 'Describe the different types of natural vegetation.', maxMarks: 4, modelAnswer: 'Tropical Evergreen, Deciduous, Thorn forests, Mountain vegetation.' },
        { id: 5, qNo: 'Q.5', title: 'What are the main features of the Indian Monsoon ?', maxMarks: 4, modelAnswer: 'Southwest summer winds bringing heavy seasonal rainfall.' },
        { id: 6, qNo: 'Q.6', title: 'Explain the major landforms of the Earth.', maxMarks: 4, modelAnswer: 'Mountains, Plateaus, and Plains.' },
        { id: 7, qNo: 'Q.7', title: 'Write a short note on the Peninsular Plateau of India.', maxMarks: 4, modelAnswer: 'Central Highlands and Deccan Plateau composed of igneous/metamorphic rocks.' },
      ]);
      toast.success('Loaded Geography 7-Question Paper Preset');
    }
  };

  const handleEvaluate = async () => {
    const validation = validateEvaluationForm({ studentAnswer, maxMarks });
    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    dispatch({ type: 'SET_MAX_MARKS', payload: maxMarks });
    dispatch({ type: 'SET_EXTRACTED_TEXT', payload: studentAnswer });

    await runEvaluation(studentAnswer, maxMarks);
  };

  const handleEvaluateRubric = async () => {
    if (!studentAnswer || !studentAnswer.trim()) {
      toast.error('Please input or extract student answer text first.');
      return;
    }

    setIsRubricEvaluating(true);
    try {
      const res = await evaluateQuestionWiseRubric(questions, studentAnswer);
      dispatch({ type: 'SET_EVALUATION_RESULT', payload: res });
      dispatch({ type: 'SET_EXTRACTED_TEXT', payload: studentAnswer });
      toast.success(`Question-wise Evaluation Complete! Score: ${res.marksObtained}/${res.maxMarks}`);
    } catch {
      toast.error('Question-wise rubric evaluation failed.');
    } finally {
      setIsRubricEvaluating(false);
    }
  };

  const totalRubricMaxMarks = questions.reduce((acc, q) => acc + (Number(q.maxMarks) || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6"
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            AI Answer Sheet Evaluation
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Evaluate student answers using overall semantic AI analysis or itemized question-wise rubrics.
          </p>
        </div>

        {/* Evaluation Mode Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setEvalMode('rubric')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              evalMode === 'rubric'
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            Question-wise Rubric
          </button>
          <button
            onClick={() => setEvalMode('single')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              evalMode === 'single'
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Brain className="w-4 h-4" />
            Overall AI Grading
          </button>
        </div>
      </div>

      {/* Student Details Card */}
      <StudentInfoCard />

      {/* Student Answer Text Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
        <label htmlFor="student-answer" className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
          Student's Answer Sheet Content <span className="text-gray-400 font-normal">(Extracted from OCR / ICR)</span>
        </label>
        <textarea
          id="student-answer"
          value={studentAnswer}
          onChange={(e) => setStudentAnswer(e.target.value)}
          rows={6}
          className="w-full rounded-2xl border border-gray-200 dark:border-slate-700
            bg-gray-50/50 dark:bg-slate-900/60 px-5 py-4 text-sm text-gray-800 dark:text-gray-200
            leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/50
            focus:border-primary transition-all duration-200 placeholder-gray-400 font-mono"
          placeholder="Student's extracted answer text will appear here..."
        />
      </div>

      {/* Mode 1: Question-wise Rubric Evaluator */}
      {evalMode === 'rubric' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-primary" />
                Question Paper Rubric & Mark Distribution
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Define individual questions, max marks, and optional model keywords for itemized grading.
              </p>
            </div>

            {/* Presets buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Presets:</span>
              <button
                onClick={() => handleLoadPreset('math')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 transition cursor-pointer"
              >
                📐 Math Paper
              </button>
              <button
                onClick={() => handleLoadPreset('physics')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50 hover:bg-purple-100 transition cursor-pointer"
              >
                ⚛️ Physics Paper
              </button>
              <button
                onClick={() => handleLoadPreset('geography')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 transition cursor-pointer"
              >
                🌍 Geography Paper (7 Qs)
              </button>
              <button
                onClick={() => handleLoadPreset('cs')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100 transition cursor-pointer"
              >
                💻 CS Paper
              </button>
            </div>
          </div>

          {/* Question List Table */}
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={q.qNo}
                    onChange={(e) => handleQuestionChange(q.id, 'qNo', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={q.title}
                    placeholder="Question description or title..."
                    onChange={(e) => handleQuestionChange(q.id, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Marks:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={q.maxMarks}
                    onChange={(e) => handleQuestionChange(q.id, 'maxMarks', Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    title="Remove Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-primary" /> Add Question to Rubric
            </button>

            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Total Max Marks: <strong className="text-gray-900 dark:text-white text-sm font-bold">{totalRubricMaxMarks}</strong>
              </span>

              <button
                onClick={handleEvaluateRubric}
                disabled={isRubricEvaluating}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-bold text-sm
                  bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-90 transition-all duration-300
                  shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60"
              >
                {isRubricEvaluating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Evaluating Rubric...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Evaluate Question-wise Rubric
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Overall AI Grading Input */}
      {evalMode === 'single' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div>
            <label htmlFor="max-marks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Marks
            </label>
            <input
              id="max-marks"
              type="number"
              min={1}
              max={100}
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              className="w-28 rounded-xl border border-gray-200 dark:border-slate-700
                bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-bold"
            />
          </div>
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-semibold
              bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300
              shadow-lg shadow-primary/25 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            id="evaluate-btn"
          >
            {isEvaluating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Evaluating Answer...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                Evaluate Answer
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {(isEvaluating || isRubricEvaluating) && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
          <LoadingSkeleton lines={4} />
        </div>
      )}

      {/* ===== Evaluation Results Section ===== */}
      <AnimatePresence>
        {evaluationResult && !isEvaluating && !isRubricEvaluating && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Section Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Evaluation Results</h2>
                <p className="text-xs text-gray-500">Evaluated using AI Engine ({state.settings.aiModel})</p>
              </div>
            </div>

            {/* Question-wise Breakdown Section (If available) */}
            {evaluationResult.questionBreakdown?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-3">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-emerald-500" />
                    Itemized Question Breakdown
                  </h3>
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                    Total: {evaluationResult.marksObtained} / {evaluationResult.maxMarks} Marks
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {evaluationResult.questionBreakdown.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/40 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-slate-900 text-white dark:bg-slate-700 rounded-lg text-xs font-bold font-mono">
                            {q.qNo}
                          </span>
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {q.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            q.status === 'Correct'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                              : q.status === 'Partial'
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                              : 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800'
                          }`}>
                            {q.status}
                          </span>

                          <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {q.marksObtained} <span className="text-xs font-semibold text-gray-400">/ {q.maxMarks}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex-1">
                          <ProgressBar value={q.accuracy} label="Question Accuracy" color={q.accuracy >= 80 ? 'bg-emerald-500' : q.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'} />
                        </div>
                        <span className="font-mono font-bold">{q.accuracy}%</span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 italic pt-1 border-t border-gray-200/50 dark:border-slate-800">
                        💡 {q.feedback}
                      </p>

                      {/* Diagram AI Evaluation Box */}
                      {q.diagramEvaluation && (
                        <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/60 p-3 rounded-xl border border-purple-500/30 text-purple-100 space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              🎨 Diagram AI Evaluation Engine ({q.diagramEvaluation.diagramType}):
                            </span>
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                              Score: {q.diagramEvaluation.overallDiagramScore}% (Verified)
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-purple-200">
                            <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                              <span className="text-purple-400 font-bold block">Structural Geometry:</span>
                              <span className="font-extrabold text-emerald-400">{q.diagramEvaluation.structuralScore}% Accurately Drawn</span>
                            </div>
                            <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                              <span className="text-purple-400 font-bold block">Labelling Integrity:</span>
                              <span className="font-extrabold text-emerald-400">{q.diagramEvaluation.labellingScore}% Complete</span>
                            </div>
                            <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                              <span className="text-purple-400 font-bold block">Ray / Vector Arrows:</span>
                              <span className="font-extrabold text-emerald-400">100% Direction Verified</span>
                            </div>
                            <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                              <span className="text-purple-400 font-bold block">Text-Diagram Sync:</span>
                              <span className="font-extrabold text-emerald-400">{q.diagramEvaluation.consistencyScore}% Aligned</span>
                            </div>
                          </div>

                          {q.diagramEvaluation.verifiedLabels && q.diagramEvaluation.verifiedLabels.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              <span className="font-bold text-purple-300 shrink-0">Verified Diagram Labels:</span>
                              {q.diagramEvaluation.verifiedLabels.map((lbl, lIdx) => (
                                <span key={lIdx} className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono text-[9px] border border-purple-400/20">
                                  ✓ {lbl}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics cards grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <AnalyticsCard
                title="Marks Obtained"
                value={evaluationResult.marksObtained}
                suffix={`/${evaluationResult.maxMarks}`}
                icon={<Target className="w-5 h-5" />}
                color="bg-primary/10 text-primary"
                index={0}
              />
              <AnalyticsCard
                title="Accuracy"
                value={evaluationResult.accuracy}
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500"
                index={1}
              />
              <AnalyticsCard
                title="Similarity"
                value={evaluationResult.similarity}
                icon={<BarChart3 className="w-5 h-5" />}
                color="bg-blue-100 dark:bg-blue-900/30 text-blue-500"
                index={2}
              />
              <AnalyticsCard
                title="Grammar"
                value={evaluationResult.grammar}
                icon={<Type className="w-5 h-5" />}
                color="bg-purple-100 dark:bg-purple-900/30 text-purple-500"
                index={3}
              />
              <AnalyticsCard
                title="Keyword Match"
                value={evaluationResult.keywordMatch}
                icon={<Hash className="w-5 h-5" />}
                color="bg-amber-100 dark:bg-amber-900/30 text-amber-500"
                index={4}
              />
              <AnalyticsCard
                title="Completeness"
                value={evaluationResult.completeness}
                icon={<BookOpen className="w-5 h-5" />}
                color="bg-teal-100 dark:bg-teal-900/30 text-teal-500"
                index={5}
              />
            </div>

            {/* Charts section */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Circular progress */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700
                flex flex-col items-center justify-center">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Overall Score</h3>
                <CircularProgress
                  value={Math.round((evaluationResult.marksObtained / evaluationResult.maxMarks) * 100)}
                  size={160}
                  strokeWidth={12}
                  color="#10B981"
                />
                <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                  {evaluationResult.marksObtained} <span className="text-base font-normal text-gray-400">/ {evaluationResult.maxMarks}</span>
                </p>
              </div>

              {/* Linear progress bars */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700
                space-y-5">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Detailed Breakdown</h3>
                <ProgressBar value={evaluationResult.grammar} label="Grammar" color="bg-purple-500" />
                <ProgressBar value={evaluationResult.keywordMatch} label="Keyword Match" color="bg-amber-500" />
                <ProgressBar value={evaluationResult.similarity} label="Similarity" color="bg-blue-500" />
                <ProgressBar value={evaluationResult.completeness} label="Completeness" color="bg-teal-500" />
              </div>
            </div>

            {/* Feedback section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detailed Feedback</h3>
              <FeedbackList feedback={evaluationResult.feedback} />
            </div>

            {/* Proceed to report */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => navigate('/reports')}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-semibold
                  bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-all duration-300
                  shadow-lg shadow-accent/25 hover:-translate-y-0.5 cursor-pointer"
              >
                View &amp; Export Full PDF Report Card
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!state.extractedText && !evaluationResult && !isEvaluating && !isRubricEvaluating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center text-center py-12 text-gray-400"
        >
          <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No extracted text available. Upload an answer sheet and run OCR or type above.</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 text-primary text-sm font-medium hover:underline cursor-pointer"
          >
            Go to Upload →
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
