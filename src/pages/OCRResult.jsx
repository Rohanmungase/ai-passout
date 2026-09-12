import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, AlertCircle, Copy, Check, RotateCcw, ScanText, Layers, CheckCircle2, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { useState, useMemo } from 'react';
import { detectQuestionAnswersFromImage } from '../services/ocrService';

/**
 * OCR Result page — displays extracted text & visual Question-to-Answer identification mapping.
 */
export default function OCRResult() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('mapping'); // 'mapping' | 'editor'
  const [selectedQuestionId, setSelectedQuestionId] = useState(1);

  // Compute question-to-answer mappings
  const identifiedQuestions = useMemo(() => {
    return detectQuestionAnswersFromImage(state.extractedText, state.uploadedFiles?.[0]);
  }, [state.extractedText, state.uploadedFiles]);

  const handleTextChange = (e) => {
    dispatch({ type: 'SET_EXTRACTED_TEXT', payload: e.target.value });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.extractedText);
      setCopied(true);
      toast.success('Text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy text.');
    }
  };

  const handleProceed = () => {
    if (!state.extractedText?.trim()) {
      toast.error('No text available. Please go back and extract text first.');
      return;
    }
    navigate('/evaluation');
  };

  // Image source to display in visual answer mapping
  const displayImageSrc = state.imagePreviews?.[0] || null;

  // Empty state — no OCR result yet
  if (!state.ocrResult && !state.extractedText) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto"
      >
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Extracted Text</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            You haven't extracted text from an answer sheet yet. Please upload an image and run OCR first.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold
              bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Go to Upload
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            OCR Extracted Text & Question Identification
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Automatically identifies which handwritten answer belongs to which question on the answer sheet.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('mapping')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'mapping'
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-primary-light shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ScanText className="w-4 h-4" />
            Question-Answer Identification ({identifiedQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-primary-light shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Raw Text Editor
          </button>
        </div>
      </div>

      {/* Stats Banner */}
      {state.ocrResult && (
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
            bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="w-3.5 h-3.5" />
            Confidence: {Math.round(state.ocrResult.confidence * 100)}%
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
            bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Layers className="w-3.5 h-3.5" />
            Identified Questions: {identifiedQuestions.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
            bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Words: {state.ocrResult.wordCount}
          </span>
        </div>
      )}

      {/* ================= TAB 1: Question-to-Answer Identification ================= */}
      {activeTab === 'mapping' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Image / Answer Sheet Bounding Box Overlay */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" />
                Answer Sheet Bounding Region Overlay
              </span>
              <span className="text-[11px] text-gray-400">Click a question to locate</span>
            </div>

            {/* Answer Sheet Preview Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-slate-950 aspect-[3/4] flex items-center justify-center">
              {displayImageSrc ? (
                <img
                  src={displayImageSrc}
                  alt="Uploaded Answer Sheet"
                  className="w-full h-full object-contain"
                />
              ) : (
                /* Synthetic Lined Paper Preview matching user screenshot */
                <div className="w-full h-full bg-[#FAF8F5] dark:bg-slate-900 p-4 relative font-sans text-slate-800 dark:text-slate-200 select-none overflow-hidden">
                  {/* Left Red Margin Lines */}
                  <div className="absolute top-0 bottom-0 left-10 w-[2px] bg-red-400/70 z-10" />
                  <div className="absolute top-0 bottom-0 left-12 w-[1px] bg-red-400/50 z-10" />

                  {/* Horizontal Notebook Lines */}
                  <div className="absolute inset-0 space-y-7 pt-4">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="w-full h-[1px] bg-blue-300/40 dark:bg-slate-700/60" />
                    ))}
                  </div>

                  {/* Bounding Boxes for identified questions */}
                  <div className="relative z-20 space-y-4 pt-1 pl-2">
                    {identifiedQuestions.map((q) => {
                      const isSelected = selectedQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          onClick={() => setSelectedQuestionId(q.id)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white shadow-md ring-2 ring-amber-400/50'
                              : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary dark:text-primary-light font-bold text-xs flex items-center justify-center shrink-0">
                              {q.marginNumber}
                            </span>
                            <div className="truncate">
                              <span className="text-xs font-bold block truncate">{q.qNo}: {q.title}</span>
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block">
                                {q.studentAnswer}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
              💡 Bounding boxes automatically map margin question numbers (1, 2, 3...) to OCR extracted answers.
            </p>
          </div>

          {/* Right Column: "Which Answer is for Which Question?" Mapping List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Which Answer is for Which Question?
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {identifiedQuestions.length} Questions Identified
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {identifiedQuestions.map((q) => {
                const isSelected = selectedQuestionId === q.id;
                return (
                  <motion.div
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    whileHover={{ scale: 1.005 }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-primary/10 text-primary dark:text-primary-light border border-primary/20">
                          Question {q.marginNumber} ({q.qNo})
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {q.title}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                        {q.status}
                      </span>
                    </div>

                    {/* Extracted Answer */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-xs font-mono text-gray-800 dark:text-gray-200 leading-relaxed">
                      <span className="font-sans font-bold text-gray-500 dark:text-gray-400 block mb-1">
                        Handwritten Student Answer Extracted:
                      </span>
                      "{q.studentAnswer}"
                    </div>

                    {/* Model Answer Key Preview */}
                    <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
                      <span>🎯 Model Key: <strong className="text-gray-700 dark:text-gray-300 truncate">{q.modelAnswer.slice(0, 75)}...</strong></span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">5 Marks</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: Editable Raw Text Area ================= */}
      {activeTab === 'editor' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="extracted-text" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Extracted Raw Text <span className="text-gray-400">(editable)</span>
            </label>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
              aria-label="Copy text"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            id="extracted-text"
            value={state.extractedText}
            onChange={handleTextChange}
            rows={14}
            className="w-full rounded-2xl border border-gray-200 dark:border-slate-700
              bg-white dark:bg-slate-800 px-5 py-4 text-sm text-gray-800 dark:text-gray-200
              leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/50
              focus:border-primary transition-all duration-200 placeholder-gray-400 font-mono"
            placeholder="Extracted text will appear here..."
            aria-label="Extracted text from OCR"
          />
        </motion.div>
      )}

      {/* Action Footer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pt-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Verified question mappings will be automatically evaluated against the AI model answer keys.
        </p>

        <button
          onClick={handleProceed}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-semibold
            bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300
            shadow-lg shadow-primary/25 hover:-translate-y-0.5 cursor-pointer shrink-0"
          id="proceed-to-evaluation-btn"
        >
          <FileText className="w-5 h-5" />
          Proceed to AI Evaluation
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}
