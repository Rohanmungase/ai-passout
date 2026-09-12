import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Upload,
  RefreshCw,
  Award,
  BarChart2,
  FileCheck2,
  Check,
  X,
  User,
  Hash,
  BookOpen,
  Image as ImageIcon,
  ArrowRightLeft,
} from 'lucide-react';
import { useOMR } from '../hooks/useOMR';
import { DEMO_OMR_SHEETS, DEFAULT_ANSWER_KEY, extractAnswersFromImage } from '../services/omrService';
import { convertPdfToDataUrl } from '../services/ocrService';
import { useToast } from '../hooks/useToast';
import StudentInfoCard from '../components/StudentInfoCard';
import { useAppContext } from '../context/AppContext';
import { FileText, Eye } from 'lucide-react';

export default function OMREvaluation() {
  const { dispatch } = useAppContext();
  const {
    isProcessing,
    answerKey,
    omrResult,
    runOMREvaluation,
    updateAnswerKeyChoice,
    loadAnswerKeyFromImage
  } = useOMR();
  
  const toast = useToast();
  const resultsRef = useRef(null);
  const [selectedPreset, setSelectedPreset] = useState('sheet-rohan');
  const [customFile, setCustomFile] = useState(null);
  const [customPreviewUrl, setCustomPreviewUrl] = useState(null);
  const [answerKeyFile, setAnswerKeyFile] = useState(null);
  const [answerKeyPreviewUrl, setAnswerKeyPreviewUrl] = useState(null);
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [extractedContent, setExtractedContent] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Clear evaluation result and reset Master Answer Key to DEFAULT_ANSWER_KEY (A, B, C, D, A, C, B, D, A, C) on page load!
  useEffect(() => {
    dispatch({ type: 'SET_OMR_RESULT', payload: null });
    dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: DEFAULT_ANSWER_KEY });
    setExtractedContent(null);
  }, [dispatch]);

  const handleExtractContent = async () => {
    const input = customFile || selectedPreset;
    setIsExtracting(true);
    try {
      let choices = {};
      if (typeof input === 'string') {
        const preset = DEMO_OMR_SHEETS.find(s => s.id === input);
        choices = preset ? preset.responses : {};
      } else if (input instanceof File) {
        choices = await extractAnswersFromImage(input);
      }
      setExtractedContent(choices);
      toast.success('Successfully extracted options from OMR sheet image!');
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      toast.error('Failed to extract content from image.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleScan = async () => {
    const input = customFile || selectedPreset;
    const res = await runOMREvaluation(input, { negativeMarking: parseFloat(negativeMarking) });
    if (res) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g)$/i);

      if (!isImage && !isPdf) {
        toast.error('Please upload an image or PDF file (PNG, JPG, JPEG, PDF).');
        return;
      }
      setCustomFile(file);
      dispatch({ type: 'SET_OMR_RESULT', payload: null });
      if (isPdf) {
        try {
          const pdfDataUrl = await convertPdfToDataUrl(file);
          setCustomPreviewUrl(pdfDataUrl);
        } catch (err) {
          toast.error('Failed to parse PDF document.');
        }
      } else {
        setCustomPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleAnswerKeyImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g)$/i);

      if (!isImage && !isPdf) {
        toast.error('Please upload an image or PDF file for Answer Key.');
        return;
      }
      setAnswerKeyFile(file);
      let targetFile = file;
      if (isPdf) {
        try {
          toast.info(`Parsing Answer Key PDF (${file.name})...`);
          const dataUrl = await convertPdfToDataUrl(file);
          setAnswerKeyPreviewUrl(dataUrl);
          targetFile = new File([dataUrl], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
        } catch (err) {
          console.error('PDF parsing error for Master Key:', err);
        }
      } else {
        setAnswerKeyPreviewUrl(URL.createObjectURL(file));
      }
      const newKey = await loadAnswerKeyFromImage(targetFile);
      if (newKey) {
        const input = customFile || selectedPreset;
        await runOMREvaluation(input, { negativeMarking: parseFloat(negativeMarking) }, newKey);
      }
    }
  };

  const handleKeyChoiceChange = (qNo, opt) => {
    updateAnswerKeyChoice(qNo, opt);
    // If result is already rendered, automatically re-run evaluation comparison with updated key
    const input = customFile || selectedPreset;
    runOMREvaluation(input, { negativeMarking: parseFloat(negativeMarking) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full flex items-center gap-1.5 w-fit">
              <CheckSquare className="w-3.5 h-3.5" />
              Computer Vision OMR v2.5
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            OMR Image vs Image Answer Comparison
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Upload the Correct OMR Answer Sheet and Student OMR Answer Sheet below to extract and compare options.
          </p>
        </div>
      </div>

      {/* Student Information Form */}
      <StudentInfoCard />

      {/* Student OMR Answer Sheet Upload Section */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col justify-between mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Student OMR Answer Sheet
              </h2>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full">
              Student Sheet Target
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Upload student OMR sheet image/PDF to compare against the master answer key:
          </p>

          {/* Upload Dropzone for Student Sheet */}
          <label className={`block p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center mb-4 ${
            customFile
              ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20'
              : 'border-gray-300 dark:border-slate-600 hover:border-emerald-500 bg-gray-50/50 dark:bg-slate-800/50'
          }`}>
            <div className="flex flex-col items-center justify-center space-y-2">
              <ImageIcon className="w-8 h-8 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {customFile ? customFile.name : 'Click to Upload Student OMR Answer Sheet (Image or PDF)'}
              </span>
              <span className="text-xs text-gray-400">Supports PNG, JPG, JPEG, PDF</span>
            </div>
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Image Preview if uploaded */}
          {customPreviewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 max-h-56 bg-slate-900 flex items-center justify-center mb-4">
              <img
                src={customPreviewUrl}
                alt="Student Answer Sheet Preview"
                className="max-h-56 object-contain"
              />
              <span className="absolute top-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs text-white font-medium">
                Student Sheet Loaded
              </span>
            </div>
          )}
        </div>

        {/* Sample Student Preset Selection */}
        <div className="pt-3 border-t border-gray-100 dark:border-slate-700/60">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-2">
            Or Pick Sample Student Answer Sheet:
          </span>
          <div className="grid grid-cols-3 gap-3">
            {DEMO_OMR_SHEETS.map((preset) => {
              const isSelected = selectedPreset === preset.id && !customFile;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setCustomFile(null);
                    setCustomPreviewUrl(null);
                    dispatch({ type: 'SET_OMR_RESULT', payload: null });
                  }}
                  className={`p-3 rounded-xl border text-center transition-all duration-150 cursor-pointer text-xs flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <User className="w-4 h-4 text-emerald-500" />
                  <span className="truncate w-full text-xs">{preset.studentName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Bar with Evaluate Button on Right Bottom */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>Upload or select student answer sheet above, then click <strong>Evaluate Answer Sheet</strong>.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Negative:
            </label>
            <select
              value={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.value)}
              className="text-xs px-2.5 py-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-white"
            >
              <option value="0">None (0.0)</option>
              <option value="0.25">-0.25</option>
              <option value="0.5">-0.50</option>
            </select>
          </div>

          <button
            onClick={handleExtractContent}
            disabled={isExtracting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Extracting Content...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Extract Content
              </>
            )}
          </button>

          <button
            onClick={handleScan}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-white font-bold text-xs sm:text-sm
              bg-gradient-to-r from-primary to-secondary hover:opacity-95 transition-all shadow-lg shadow-primary/25
              disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Evaluating Answer Sheet...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Evaluate Answer Sheet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Extracted Content Breakdown Panel */}
      <AnimatePresence>
        {extractedContent && !omrResult && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-emerald-500/30 shadow-lg mb-8 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    Extracted Content from Answer Sheet Image
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Option choices extracted directly from computer vision bubble scan:
                  </p>
                </div>
              </div>
              <button
                onClick={handleScan}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Evaluate These Answers
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {Array.from({ length: 10 }).map((_, idx) => {
                const qNo = idx + 1;
                const opt = extractedContent[qNo] || extractedContent[String(qNo)] || 'None';
                return (
                  <div
                    key={qNo}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-700"
                  >
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Q{qNo}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Option {opt}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {omrResult && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Header Result */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <User className="w-7 h-7 text-primary-light" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{omrResult.student.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-300">
                    <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> PRN: {omrResult.student.prn}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Roll: {omrResult.student.rollNo}</span>
                    <span>{omrResult.student.department}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-white">
                    {omrResult.summary.totalScore} / {omrResult.summary.maxScore}
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                    {omrResult.summary.percentage}% Score Comparison
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>


            {/* Extracted Image Answers vs Master Answer Key Comparison Table */}
            <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <span>Extracted Image Answers vs Master Answer Key</span>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  Itemized Question Comparison
                </span>
              </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <th className="pb-3">Q.No</th>
                        <th className="pb-3">Extracted Image Choice</th>
                        <th className="pb-3">Master Key Choice</th>
                        <th className="pb-3">Comparison Status</th>
                        <th className="pb-3 text-right">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                      {omrResult.questionResults.map((q) => (
                        <tr key={q.qNo} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                          <td className="py-3 font-semibold text-gray-800 dark:text-gray-200">
                            Q{q.qNo}
                          </td>
                          <td className="py-3 font-bold">
                            <span className={`px-2.5 py-1 rounded-md text-xs ${
                              q.status === 'correct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                              q.status === 'incorrect' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' :
                              'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                            }`}>
                              {q.studentAns}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-gray-600 dark:text-gray-300">
                            {q.correctAns}
                          </td>
                          <td className="py-3">
                            {q.status === 'correct' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Match
                              </span>
                            )}
                            {q.status === 'incorrect' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                <XCircle className="w-3.5 h-3.5" /> Mismatch
                              </span>
                            )}
                            {q.status === 'unattempted' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <AlertCircle className="w-3.5 h-3.5" /> Blank
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right font-bold text-gray-900 dark:text-white">
                            {q.score > 0 ? `+${q.score}` : q.score} / {q.maxMarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
