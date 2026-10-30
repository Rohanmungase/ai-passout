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
  Plus,
  Trash2,
  Layers,
  FileText,
  Eye,
  Key,
  Bookmark,
  Search,
} from 'lucide-react';
import { useOMR } from '../hooks/useOMR';
import {
  DEMO_OMR_SHEETS,
  DEFAULT_ANSWER_KEY,
  HISTORY_SET_A_KEY,
  HISTORY_SET_B_KEY,
  HISTORY_SET_C_KEY,
  HISTORY_SET_D_KEY,
  HISTORY_SET_E_KEY,
  extractAnswersFromImage,
  generateOMRMasterSheetImage,
  generatePhysicalHistoryOMRSheetImage
} from '../services/omrService';
import { convertPdfToDataUrl } from '../services/ocrService';
import { useToast } from '../hooks/useToast';
import StudentInfoCard from '../components/StudentInfoCard';
import { useAppContext } from '../context/AppContext';

export default function OMREvaluation() {
  const { state, dispatch } = useAppContext();
  const {
    answerKey,
    omrResult,
    savedAnswerKeys
  } = state;

  const toast = useToast();
  const {
    runOMREvaluation,
    selectSavedAnswerKey,
    loadAnswerKeyFromImage,
    updateAnswerKeyChoice,
    saveAnswerKey,
    deleteAnswerKey,
    isProcessing
  } = useOMR();
  const resultsRef = useRef(null);

  // Multi-PDF / Multi-Image student file state
  const [customFiles, setCustomFiles] = useState([]);
  const [isDraggingStudent, setIsDraggingStudent] = useState(false);
  const [studentCustomResponses, setStudentCustomResponses] = useState({});
  const [extractedContent, setExtractedContent] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState('0');
  const [answerKeyFile, setAnswerKeyFile] = useState(null);
  const [answerKeyPreviewUrl, setAnswerKeyPreviewUrl] = useState(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState('');

  // Batch evaluation results state
  const [batchResults, setBatchResults] = useState([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [approvedSheets, setApprovedSheets] = useState({});

  // Answer Key Selection & Teacher Repository State
  const [selectedSavedKeyId, setSelectedSavedKeyId] = useState('');
  const [selectedSetCode, setSelectedSetCode] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isRepositoryModalOpen, setIsRepositoryModalOpen] = useState(false);
  const [newKeyTitle, setNewKeyTitle] = useState('');
  const [newKeySubject, setNewKeySubject] = useState('');
  const [searchKeyQuery, setSearchKeyQuery] = useState('');

  // Active Answer Key Object & Preview state
  const activeKeyObj = (savedAnswerKeys || []).find(k => k.id === selectedSavedKeyId);
  const safeAnswerKey = answerKey && answerKey.length > 0 ? answerKey : (activeKeyObj?.answers || HISTORY_SET_A_KEY);

  const generatedMasterSheetImage = activeKeyObj ? generateOMRMasterSheetImage(
    safeAnswerKey,
    activeKeyObj?.setCode || selectedSetCode || 'Set A',
    activeKeyObj?.title || `Master Key (${selectedSetCode || 'Set A'})`,
    activeKeyObj?.subject || 'History (Unit Test - 1)'
  ) : null;
  const effectivePreviewUrl = answerKeyPreviewUrl || activeKeyObj?.previewUrl || generatedMasterSheetImage;

  // Helper to load and apply an Answer Key across the workspace
  const applyActiveKey = (keyObj) => {
    if (!keyObj) return;
    setSelectedSavedKeyId(keyObj.id);
    selectSavedAnswerKey(keyObj);
    if (keyObj.setCode) setSelectedSetCode(keyObj.setCode);
    setAnswerKeyPreviewUrl(keyObj.previewUrl || null);
    setAnswerKeyFile(null);

    const input = customFiles.length > 0 ? customFiles[activeFileIndex]?.file : selectedPreset;
    runOMREvaluation(input, { negativeMarking: parseFloat(negativeMarking) }, keyObj.answers);
  };

  // Helper to delete an answer key and auto-switch active key
  const handleDeleteKey = (idToDelete) => {
    const keyToDelete = (savedAnswerKeys || []).find(k => k.id === idToDelete);
    if (!keyToDelete) {
      toast.error('No stored answer key selected to remove.');
      return;
    }

    deleteAnswerKey(idToDelete);

    const remainingKeys = (savedAnswerKeys || []).filter(k => k.id !== idToDelete);
    if (remainingKeys.length > 0) {
      applyActiveKey(remainingKeys[0]);
    } else {
      setSelectedSavedKeyId('');
    }
  };

  // Ensure default History Set A - E keys exist & sync active Answer Key on page load!
  useEffect(() => {
    const defaultKeys = [
      {
        id: 'key-history-set-a',
        title: 'History key (Set A)',
        subject: 'History (Unit Test - 1)',
        setCode: 'Set A',
        totalQuestions: 15,
        answers: HISTORY_SET_A_KEY,
        created: new Date().toISOString(),
        author: 'Teacher'
      },
      {
        id: 'key-history-set-b',
        title: 'History key B (Set B)',
        subject: 'History (Unit Test - 1)',
        setCode: 'Set B',
        totalQuestions: 15,
        answers: HISTORY_SET_B_KEY,
        created: new Date().toISOString(),
        author: 'Teacher'
      },
      {
        id: 'key-history-set-c',
        title: 'History key C (Set C)',
        subject: 'History (Unit Test - 1)',
        setCode: 'Set C',
        totalQuestions: 15,
        answers: HISTORY_SET_C_KEY,
        created: new Date().toISOString(),
        author: 'Teacher'
      },
      {
        id: 'key-history-set-d',
        title: 'History key D (Set D)',
        subject: 'History (Unit Test - 1)',
        setCode: 'Set D',
        totalQuestions: 15,
        answers: HISTORY_SET_D_KEY,
        created: new Date().toISOString(),
        author: 'Teacher'
      },
      {
        id: 'key-history-set-e',
        title: 'History key E (Set E)',
        subject: 'History (Unit Test - 1)',
        setCode: 'Set E',
        totalQuestions: 15,
        answers: HISTORY_SET_E_KEY,
        created: new Date().toISOString(),
        author: 'Teacher'
      },
    ];

    defaultKeys.forEach(dk => {
      const existing = (savedAnswerKeys || []).find(k => k.id === dk.id);
      if (!existing || JSON.stringify(existing.answers) !== JSON.stringify(dk.answers)) {
        dispatch({ type: 'SAVE_ANSWER_KEY', payload: dk });
      }
    });

    dispatch({ type: 'SET_OMR_RESULT', payload: null });
    dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: null });
    setSelectedSavedKeyId('');
    setSelectedSetCode('');
    setAnswerKeyPreviewUrl(null);
    setExtractedContent(null);
    setBatchResults([]);
  }, [dispatch]);

  const handleExtractContent = async () => {
    const activeItem = customFiles.length > 0 ? (customFiles[activeFileIndex]?.file || customFiles[activeFileIndex]) : selectedPreset;
    if (!activeItem) {
      toast.warning('Please upload a student answer sheet or pick a sample sheet first.');
      return;
    }

    setIsExtracting(true);
    try {
      let choices = {};
      if (typeof activeItem === 'string') {
        const preset = DEMO_OMR_SHEETS.find(s => s.id === activeItem);
        choices = preset ? preset.responses : {};
      } else if (activeItem instanceof File) {
        choices = await extractAnswersFromImage(activeItem);
      }
      setExtractedContent(choices);
      toast.success(`Extracted options from "${typeof activeItem === 'string' ? 'Sample Sheet' : activeItem.name}"!`);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      toast.error('Failed to extract content from image.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Auto-scroll to evaluation results whenever omrResult is set or updated
  useEffect(() => {
    if (omrResult) {
      const scrollFunc = () => {
        const el = document.getElementById('omr-evaluation-results') || resultsRef.current;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
      };
      const t1 = setTimeout(scrollFunc, 50);
      const t2 = setTimeout(scrollFunc, 250);
      const t3 = setTimeout(scrollFunc, 550);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [omrResult]);

  const handleScan = async (targetIdx = null) => {
    try {
      if (customFiles.length === 0 && !selectedPreset) {
        toast.warning('Please upload a student answer sheet or pick a sample sheet to evaluate.');
        return;
      }
      const isTargetValid = typeof targetIdx === 'number';
      const activeIdx = isTargetValid ? targetIdx : activeFileIndex;
      if (isTargetValid) {
        setActiveFileIndex(targetIdx);
      }

      const currentSecondImageChoices = {};
      safeAnswerKey.forEach((_, idx) => {
        const qNo = idx + 1;
        currentSecondImageChoices[qNo] = getStudentChoiceForQuestion(qNo);
      });

      const hasManualOverrides = Object.keys(studentCustomResponses).length > 0;

      const triggerScroll = () => {
        const scrollFunc = () => {
          const el = document.getElementById('omr-evaluation-results') || resultsRef.current;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          }
        };
        setTimeout(scrollFunc, 100);
        setTimeout(scrollFunc, 350);
        setTimeout(scrollFunc, 650);
      };

      if (customFiles.length > 0) {
        toast.info(`Evaluating ${customFiles.length} student answer sheet${customFiles.length > 1 ? 's' : ''}...`);
        const results = [];
        for (let i = 0; i < customFiles.length; i++) {
          const item = customFiles[i];
          const isCurrentActive = i === activeIdx;
          const choicesOverride = (hasManualOverrides && isCurrentActive) ? studentCustomResponses : undefined;

          const res = await runOMREvaluation(
            item,
            {
              negativeMarking: parseFloat(negativeMarking),
              overrideStudentResponses: choicesOverride,
            },
            safeAnswerKey
          );
          if (res) {
            results.push({ ...res, fileName: item.name });
          }
        }
        setBatchResults(results);
        if (results.length > 0) {
          const targetResIndex = targetIdx !== null ? Math.min(targetIdx, results.length - 1) : Math.min(activeIdx, results.length - 1);
          setActiveResultIndex(targetResIndex);
          dispatch({ type: 'SET_OMR_RESULT', payload: results[targetResIndex] });
          triggerScroll();
        }
      } else {
        const res = await runOMREvaluation(
          selectedPreset,
          {
            negativeMarking: parseFloat(negativeMarking),
            overrideStudentResponses: hasManualOverrides ? studentCustomResponses : undefined,
          },
          safeAnswerKey
        );
        setBatchResults(res ? [res] : []);
        setActiveResultIndex(0);
        triggerScroll();
      }
    } catch (err) {
      console.error('handleScan error:', err);
      toast.error('Failed to evaluate answer sheet(s).');
    }
  };

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    setIsDraggingStudent(false);

    const files = Array.from(e.target?.files || e.dataTransfer?.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    for (const file of files) {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g)$/i);

      if (!isImage && !isPdf) {
        toast.error(`Invalid format: ${file.name}. Supported formats: PNG, JPG, JPEG, PDF.`);
        continue;
      }

      let previewUrl = null;
      if (isPdf) {
        try {
          previewUrl = await convertPdfToDataUrl(file);
        } catch (err) {
          console.error('PDF parsing error:', file.name, err);
        }
      } else {
        previewUrl = await fileToDataUrl(file);
      }

      const formattedSize = file.size
        ? file.size / 1024 < 1000
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : '';

      validFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: formattedSize,
        previewUrl,
      });
    }

    if (validFiles.length > 0) {
      setCustomFiles(prev => [...prev, ...validFiles]);
      dispatch({ type: 'SET_OMR_RESULT', payload: null });
      setBatchResults([]);
      toast.success(`Added ${validFiles.length} student answer sheet${validFiles.length > 1 ? 's' : ''}! Click "Evaluate Answer Sheet" to view results.`);
    }
    if (e.target && 'value' in e.target) {
      e.target.value = null;
    }
  };

  const handleRemoveFile = (idToRemove) => {
    setCustomFiles(prev => {
      const updated = prev.filter(f => f.id !== idToRemove);
      if (updated.length === 0) {
        dispatch({ type: 'SET_OMR_RESULT', payload: null });
        setBatchResults([]);
      }
      return updated;
    });
    setActiveFileIndex(0);
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
      let dataUrl = null;
      if (isPdf) {
        try {
          toast.info(`Parsing Answer Key PDF (${file.name})...`);
          dataUrl = await convertPdfToDataUrl(file);
          setAnswerKeyPreviewUrl(dataUrl);
          targetFile = new File([dataUrl], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
        } catch (err) {
          console.error('PDF parsing error for Master Key:', err);
        }
      } else {
        dataUrl = await fileToDataUrl(file);
        setAnswerKeyPreviewUrl(dataUrl);
      }
      const newKey = await loadAnswerKeyFromImage(targetFile);
      if (newKey) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const autoKeyObj = {
          id: activeKeyObj ? activeKeyObj.id : `key-uploaded-${Date.now()}`,
          title: activeKeyObj ? activeKeyObj.title : `Uploaded: ${cleanName}`,
          subject: activeKeyObj ? activeKeyObj.subject : 'Uploaded Answer Key',
          setCode: selectedSetCode || 'Set A',
          totalQuestions: newKey.length,
          answers: newKey,
          previewUrl: dataUrl,
          created: new Date().toISOString(),
          author: 'Teacher (Uploaded Sheet)'
        };
        dispatch({ type: 'SAVE_ANSWER_KEY', payload: autoKeyObj });
        setSelectedSavedKeyId(autoKeyObj.id);
        toast.success(`Answer Key "${autoKeyObj.title}" image uploaded & saved!`);

        const input = customFiles.length > 0 ? customFiles[activeFileIndex]?.file : selectedPreset;
        await runOMREvaluation(input, { negativeMarking: parseFloat(negativeMarking) }, newKey);
      }
    }
  };

  const handleKeyChoiceChange = (qNo, opt) => {
    const updatedKey = safeAnswerKey.map((q, idx) => {
      const itemQNo = q.qNo || (idx + 1);
      if (itemQNo === qNo || (idx + 1) === qNo) {
        return { ...q, qNo: qNo, answer: opt };
      }
      return { ...q, qNo: itemQNo };
    });

    dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: updatedKey });

    if (selectedSavedKeyId) {
      const keyToUpdate = (savedAnswerKeys || []).find(k => k.id === selectedSavedKeyId);
      if (keyToUpdate) {
        dispatch({
          type: 'SAVE_ANSWER_KEY',
          payload: { ...keyToUpdate, answers: updatedKey }
        });
      }
    }

    const input = customFiles.length > 0 ? customFiles[activeFileIndex] : selectedPreset;
    runOMREvaluation(
      input,
      {
        negativeMarking: parseFloat(negativeMarking),
        overrideStudentResponses: studentCustomResponses,
      },
      updatedKey
    );
  };

  const getStudentChoiceForQuestion = (qNo) => {
    if (studentCustomResponses[qNo] !== undefined) {
      return studentCustomResponses[qNo] || 'None';
    }
    if (omrResult?.responses && omrResult.responses[qNo] !== undefined) {
      return omrResult.responses[qNo] || 'None';
    }
    if (omrResult?.questionResults) {
      const qDetail = omrResult.questionResults.find(d => d.qNo === qNo);
      if (qDetail && qDetail.studentAns) return qDetail.studentAns;
    }
    const activePreset = DEMO_OMR_SHEETS.find(s => s.id === selectedPreset) || DEMO_OMR_SHEETS[0];
    return activePreset.responses[qNo] || 'A';
  };

  const handleStudentChoiceChange = (qNo, newOpt) => {
    const updatedResponses = { ...studentCustomResponses, [qNo]: newOpt };
    setStudentCustomResponses(updatedResponses);

    const input = customFiles.length > 0 ? customFiles[activeFileIndex] : selectedPreset;
    runOMREvaluation(
      input,
      {
        negativeMarking: parseFloat(negativeMarking),
        overrideStudentResponses: updatedResponses,
      },
      safeAnswerKey
    );
  };

  const handleResetStudentCustomResponses = () => {
    setStudentCustomResponses({});
    const input = customFiles.length > 0 ? customFiles[activeFileIndex] : selectedPreset;
    runOMREvaluation(input, { negativeMarking: parseFloat(negativeMarking) }, safeAnswerKey);
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
            Upload the Correct Master Answer Sheet and Student OMR Answer Sheet(s) below to extract and compare options.
          </p>
        </div>
      </div>

      {/* Student Information Form */}
      <StudentInfoCard />

      {/* Upper Master Answer Key Management Bar (Placed directly on the upper side of Sample / Master Box) */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Select Master Answer Key & Repository
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Choose an active key, create new answer sets, or manage stored exam keys for evaluation.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsRepositoryModalOpen(true)}
            className="text-xs font-extrabold text-primary hover:text-primary-dark dark:hover:text-primary-light hover:underline flex items-center gap-1.5 cursor-pointer transition shrink-0"
          >
            <BookOpen className="w-4 h-4" /> Teacher Side Repository (Show All Keys)
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Quick Paper Set Selector */}
          <div className="w-full md:w-auto shrink-0">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
              Set Selection (Paper Code):
            </label>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/80 p-1 rounded-xl border border-gray-200 dark:border-slate-600">
              {['Set A', 'Set B', 'Set C', 'Set D', 'Set E'].map(setCode => (
                <button
                  key={setCode}
                  onClick={() => {
                    setSelectedSetCode(setCode);
                    // Match key by set code or title
                    const foundKey = savedAnswerKeys.find(k =>
                      k.setCode === setCode ||
                      (k.title && k.title.toLowerCase().includes(setCode.toLowerCase()))
                    );
                    if (foundKey) {
                      applyActiveKey(foundKey);
                    } else {
                      toast.info(`Selected ${setCode}. You can save or upload an answer key for ${setCode}.`);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    selectedSetCode === setCode
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-white'
                  }`}
                >
                  {setCode}
                </button>
              ))}
            </div>
          </div>

          {/* Active Answer Key Dropdown Selector */}
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
              Select Active Answer Key:
            </label>
            <select
              value={selectedSavedKeyId}
              onChange={(e) => {
                const keyId = e.target.value;
                if (!keyId) {
                  setSelectedSavedKeyId('');
                  dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: null });
                  setAnswerKeyPreviewUrl(null);
                  return;
                }
                if (keyId === '__ADD_NEW__') {
                  setNewKeyTitle(`New Master Answer Key (${selectedSetCode || 'Set A'})`);
                  setNewKeySubject('Computer Science');
                  setIsSaveModalOpen(true);
                  return;
                }
                if (keyId === '__REMOVE_ACTIVE__') {
                  handleDeleteKey(selectedSavedKeyId);
                  return;
                }
                const foundKey = savedAnswerKeys.find(k => k.id === keyId);
                if (foundKey) {
                  applyActiveKey(foundKey);
                }
              }}
              className="w-full text-xs font-bold py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-xs"
            >
              <option value="">-- Select Master Answer Key --</option>
              <optgroup label="Stored Answer Keys">
                {savedAnswerKeys.length === 0 ? (
                  <option value="" disabled>
                    No saved answer keys yet (Click '+ Add Key' to create one)
                  </option>
                ) : (
                  savedAnswerKeys.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.title} ({k.subject})
                    </option>
                  ))
                )}
              </optgroup>
              <optgroup label="Actions">
                <option value="__ADD_NEW__">+ Add / Upload New Answer Key...</option>
                {selectedSavedKeyId && (
                  <option value="__REMOVE_ACTIVE__">🗑 Remove Selected Answer Key</option>
                )}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-4">
            <button
              onClick={() => {
                setNewKeyTitle(`New Master Answer Key (${selectedSetCode || 'Set A'})`);
                setNewKeySubject('Computer Science');
                setIsSaveModalOpen(true);
              }}
              className="flex-1 md:flex-none px-3.5 py-2.5 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Add New Answer Key to Repository"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Key</span>
            </button>

            <button
              onClick={() => {
                setNewKeyTitle(`Answer Key Set - ${new Date().toLocaleDateString()} (${selectedSetCode || 'Set A'})`);
                setNewKeySubject('Computer Science');
                setIsSaveModalOpen(true);
              }}
              className="flex-1 md:flex-none px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Save Current Answer Key Choices"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save Key</span>
            </button>

            <button
              onClick={() => handleDeleteKey(selectedSavedKeyId)}
              disabled={!selectedSavedKeyId}
              className="flex-1 md:flex-none px-3.5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Remove Currently Selected Answer Key"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove Key</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student OMR Answer Sheet Card (Full Width) */}
      <div className="w-full mb-6">
        {/* Column 2: Student OMR Answer Sheet */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Student OMR Answer Sheet(s)
                </h2>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full flex items-center gap-1">
                {customFiles.length > 1 ? `${customFiles.length} Sheets Uploaded` : 'Student Sheet Target'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Upload single or multiple student OMR sheet images/PDFs to compare against the master sheet:
            </p>

            {/* Dropzone with multiple file support */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingStudent(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingStudent(false);
              }}
              onDrop={handleFileUpload}
              className={`block p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center mb-4 ${
                isDraggingStudent
                  ? 'border-emerald-500 bg-emerald-500/20 scale-[1.01]'
                  : customFiles.length > 0
                  ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20'
                  : 'border-gray-300 dark:border-slate-600 hover:border-emerald-500 bg-gray-50/50 dark:bg-slate-800/50'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <ImageIcon className="w-8 h-8 text-emerald-500" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {customFiles.length > 0
                    ? `Uploaded ${customFiles.length} Student Answer Sheet${customFiles.length > 1 ? 's' : ''}`
                    : 'Click or Drag & Drop Multiple Student Answer Sheets (Images or PDFs)'}
                </span>
                <span className="text-xs text-gray-400">Supports selecting multiple files at once (PNG, JPG, JPEG, PDF)</span>
              </div>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="student-omr-input"
              />
            </label>

            {/* Uploaded Files List */}
            {customFiles.length > 0 && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    Uploaded Student Sheets ({customFiles.length}):
                  </span>
                  <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add More Sheets
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {customFiles.map((item, idx) => {
                    const isActive = activeFileIndex === idx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveFileIndex(idx);
                          if (batchResults.length > idx && batchResults[idx]) {
                            setActiveResultIndex(idx);
                            dispatch({ type: 'SET_OMR_RESULT', payload: batchResults[idx] });
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer text-xs ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-500/10 font-medium text-gray-900 dark:text-white ring-1 ring-emerald-500/30'
                            : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt={item.name} className="w-7 h-7 rounded object-cover border border-gray-300 dark:border-slate-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="truncate font-semibold text-xs">{item.name}</p>
                            <p className="text-[10px] text-gray-400">{item.size || 'Sheet Image'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isActive && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[9px] rounded-md">
                              Selected
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScan(idx);
                            }}
                            className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-[11px] rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition"
                            title="Compare & Evaluate this student sheet against Master Answer Key"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Compare</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(item.id);
                            }}
                            className="p-1 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove answer sheet"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Active File Image Preview */}
                {customFiles[activeFileIndex]?.previewUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 max-h-44 bg-slate-900 flex items-center justify-center mt-2">
                    <img
                      src={customFiles[activeFileIndex].previewUrl}
                      alt="Student Answer Sheet Preview"
                      className="max-h-44 object-contain"
                    />
                    <span className="absolute top-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs text-white font-medium">
                      {customFiles[activeFileIndex].name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sample Student Preset Selection */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-2">
              Or Pick Sample Student Answer Sheet:
            </span>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_OMR_SHEETS.map((preset) => {
                const isSelected = customFiles.some(f => f.id === preset.id);
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      const demoFileObj = {
                        id: preset.id,
                        name: `${preset.studentName}.pdf`,
                        size: 'Sample Sheet',
                        previewUrl: preset.image || '/omr-sample.png',
                        file: preset.id
                      };
                      setCustomFiles([demoFileObj]);
                      setActiveFileIndex(0);
                      dispatch({ type: 'SET_OMR_RESULT', payload: null });
                      setBatchResults([]);
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
      </div>

      {/* Action Bar with Evaluate Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>
            {customFiles.length === 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                ⚠️ Upload a student answer sheet (PDF or Image) above to enable evaluation.
              </span>
            ) : (
              <span>Upload student answer sheet(s) above, then click <strong>Evaluate Answer Sheet{customFiles.length > 1 ? 's' : ''}</strong>.</span>
            )}
          </span>
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
            title="Extract Content from Student Answer Sheet"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Extracting...
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
            title="Compare & Evaluate Answer Sheet against Master Answer Key"
            className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all text-white bg-gradient-to-r from-primary to-secondary hover:opacity-95 shadow-lg shadow-primary/25 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Comparing & Evaluating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {customFiles.length > 1 ? `Compare & Evaluate ${customFiles.length} Answer Sheets` : 'Compare & Evaluate Answer Sheet'}
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

      {/* Batch Results & Detailed Itemized Comparison */}
      <AnimatePresence>
        {omrResult && (
          <motion.div
            id="omr-evaluation-results"
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Batch Student Results Summary & Selector Cards */}
            {batchResults.length > 1 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-emerald-500/30 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-500" />
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">
                        Batch Evaluation Results ({batchResults.length} Student Sheets Processed Separately)
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Each student answer sheet was evaluated individually against the master answer key. Click a card to inspect its full itemized breakdown.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      batchResults.forEach((res) => {
                        const roll = res.student?.rollNo || '11';
                        dispatch({
                          type: 'APPROVE_STUDENT_OMR_EVALUATION',
                          payload: res
                        });
                        setApprovedSheets(prev => ({ ...prev, [roll]: true }));
                      });
                      toast.success(`Approved & stored all ${batchResults.length} student evaluation results in Dashboard!`);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve All ({batchResults.length}) Student Results
                  </button>
                </div>

                {/* Individual Student Result Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {batchResults.map((res, idx) => {
                    const isTabActive = activeResultIndex === idx;
                    const studentRoll = res.student?.rollNo || `${idx + 1}`;
                    const studentName = res.fileName ? res.fileName.replace(/\.[^/.]+$/, "") : res.student?.name || `Student ${idx + 1}`;
                    const isApproved = approvedSheets[studentRoll];
                    const scorePct = res.summary?.percentage || 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveResultIndex(idx);
                          setActiveFileIndex(idx);
                          setStudentCustomResponses({});
                          dispatch({ type: 'SET_OMR_RESULT', payload: res });
                        }}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                          isTabActive
                            ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-md'
                            : 'border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-750/50 hover:border-emerald-500/50 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold rounded-md block w-fit mb-0.5">
                                {res.fileName || `Student Sheet ${idx + 1}`}
                              </span>
                              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                {studentName}
                              </h4>
                              <p className="text-[11px] text-gray-400">
                                Roll: {studentRoll} • PRN: {res.student?.prn || `2026${studentRoll}`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`px-2.5 py-1 rounded-xl text-xs font-black text-white inline-block ${
                              scorePct >= 75 ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' :
                              scorePct >= 50 ? 'bg-amber-500 shadow-sm shadow-amber-500/20' :
                              'bg-rose-500 shadow-sm shadow-rose-500/20'
                            }`}>
                              {res.summary?.totalScore} / {res.summary?.maxScore} ({scorePct}%)
                            </div>
                            {isApproved && (
                              <span className="block text-[10px] text-emerald-500 font-bold mt-1">
                                Approved ✓
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Breakdown pills */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-gray-200/60 dark:border-slate-700/60 text-center text-[10px] font-bold">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            ✓ {res.summary?.correctCount || 0} Correct
                          </div>
                          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            ✗ {res.summary?.incorrectCount || 0} Mismatches
                          </div>
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            ! {res.summary?.unattemptedCount || 0} Blank
                          </div>
                        </div>

                        {/* Card action footer */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveResultIndex(idx);
                              setActiveFileIndex(idx);
                              setStudentCustomResponses({});
                              dispatch({ type: 'SET_OMR_RESULT', payload: res });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 ${
                              isTabActive
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-emerald-500 hover:text-white'
                            }`}
                          >
                            {isTabActive ? 'Currently Viewing Breakdown' : 'Inspect Breakdown'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({
                                type: 'APPROVE_STUDENT_OMR_EVALUATION',
                                payload: res
                              });
                              setApprovedSheets(prev => ({ ...prev, [studentRoll]: true }));
                              toast.success(`Evaluation for ${studentName} Approved & Saved!`);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isApproved
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                            }`}
                          >
                            {isApproved ? 'Approved ✓' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span>Extracted Image Answers vs Master Answer Key</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {omrResult.fileName || omrResult.student?.name || 'Selected Student Sheet'}
                  </span>
                </span>
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

              {/* Bottom Right Approved Action Bar */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Computer Vision Scan Verified</span>
                </div>

                <button
                  onClick={() => {
                    const studentRoll = omrResult.student?.rollNo || '11';
                    const studentName = omrResult.student?.name || `Student ${studentRoll}`;
                    
                    dispatch({
                      type: 'APPROVE_STUDENT_OMR_EVALUATION',
                      payload: omrResult
                    });

                    setApprovedSheets(prev => ({ ...prev, [studentRoll]: true }));
                    toast.success(`Evaluation for ${studentName} (Roll ${studentRoll}) Approved & Stored in Dashboard!`);
                  }}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
                    approvedSheets[omrResult.student?.rollNo || '11']
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 active:scale-95'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {approvedSheets[omrResult.student?.rollNo || '11'] ? 'Approved ✓' : 'Approve Evaluation'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Answer Key Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">Save Current Answer Key</h3>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Store the current 10-question master answer key choices into the Teacher Side Repository for future evaluations.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Answer Key Title / Exam Name:
                  </label>
                  <input
                    type="text"
                    value={newKeyTitle}
                    onChange={(e) => setNewKeyTitle(e.target.value)}
                    placeholder="e.g. DBMS Mid-Term Set A"
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Paper Set Code Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Select Question Paper Set (Set A, B, C, D...):
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['Set A', 'Set B', 'Set C', 'Set D', 'Set E', 'Set F'].map((set) => (
                      <button
                        key={set}
                        type="button"
                        onClick={() => {
                          setSelectedSetCode(set);
                          if (newKeyTitle.toLowerCase().includes('set')) {
                            setNewKeyTitle(newKeyTitle.replace(/Set\s+[A-Z]/i, set));
                          } else {
                            setNewKeyTitle(`${newKeyTitle} (${set})`);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                          selectedSetCode === set
                            ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {set}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Subject Name:
                  </label>
                  <input
                    type="text"
                    value={newKeySubject}
                    onChange={(e) => setNewKeySubject(e.target.value)}
                    placeholder="e.g. Database Systems"
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Optional Upload Answer Key Sheet inside modal */}
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Upload Master Sheet File (Optional Auto-Fill):
                  </label>
                  <label className="block p-3 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 hover:border-primary bg-gray-50/50 dark:bg-slate-750 cursor-pointer text-center transition">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Upload Image/PDF to Extract Answers
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
                          let targetFile = file;
                          if (isPdf) {
                            try {
                              const dataUrl = await convertPdfToDataUrl(file);
                              targetFile = new File([dataUrl], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' });
                            } catch (err) {}
                          }
                          const extracted = await loadAnswerKeyFromImage(targetFile);
                          if (extracted) {
                            setNewKeyTitle(`Uploaded: ${file.name.replace(/\.[^/.]+$/, '')}`);
                            dispatch({ type: 'SET_OMR_ANSWER_KEY', payload: extracted });
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Current Key Options Preview */}
                <div className="p-3 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    Key Options Preview (Q1 - Q10):
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {safeAnswerKey.slice(0, 10).map((q) => (
                      <div key={q.qNo} className="px-1.5 py-1 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[10px] font-mono">
                        <span className="text-gray-400">Q{q.qNo}:</span> <strong className="text-primary font-bold">{q.answer}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const savedObj = saveAnswerKey(newKeyTitle, newKeySubject, selectedSetCode, answerKeyPreviewUrl);
                    if (savedObj) {
                      setSelectedSavedKeyId(savedObj.id);
                      setIsSaveModalOpen(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md cursor-pointer"
                >
                  Save to Teacher Repository
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Side Answer Keys Repository Modal */}
      <AnimatePresence>
        {isRepositoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        Teacher Side Answer Keys Repository
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary">
                        {savedAnswerKeys.length} Keys Stored
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      View, manage, and click any answer key to apply it to active OMR evaluation.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsRepositoryModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Actions Bar */}
              <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchKeyQuery}
                    onChange={(e) => setSearchKeyQuery(e.target.value)}
                    placeholder="Search by key title or subject..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-slate-750 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <button
                  onClick={() => {
                    setNewKeyTitle(`New Answer Key - Set ${String.fromCharCode(65 + savedAnswerKeys.length)}`);
                    setNewKeySubject('Computer Science');
                    setIsRepositoryModalOpen(false);
                    setIsSaveModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Create New Answer Key
                </button>
              </div>

              {/* Answer Keys Cards Grid */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {savedAnswerKeys.filter(k => 
                  !searchKeyQuery || 
                  k.title.toLowerCase().includes(searchKeyQuery.toLowerCase()) || 
                  k.subject.toLowerCase().includes(searchKeyQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Key className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No Answer Keys found matching "{searchKeyQuery}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedAnswerKeys
                      .filter(k => 
                        !searchKeyQuery || 
                        k.title.toLowerCase().includes(searchKeyQuery.toLowerCase()) || 
                        k.subject.toLowerCase().includes(searchKeyQuery.toLowerCase())
                      )
                      .map((k) => {
                        const isActive = selectedSavedKeyId === k.id;
                        const keyAnswers = k.answers || DEFAULT_ANSWER_KEY;
                        return (
                          <div
                            key={k.id}
                            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                              isActive
                                ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/30 shadow-md'
                                : 'border-gray-200 dark:border-slate-700/80 bg-gray-50/50 dark:bg-slate-750/50 hover:border-primary/50 hover:shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-extrabold rounded-md uppercase tracking-wider block w-fit mb-1">
                                    {k.subject || 'Subject Key'}
                                  </span>
                                  <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                    {k.title}
                                  </h4>
                                </div>

                                {isActive && (
                                  <span className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full shrink-0 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Active Key
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
                                <span>Author: {k.author || 'Teacher'}</span>
                                <span>•</span>
                                <span>10 Questions</span>
                              </div>

                              {/* Visual 10-Question Options Strip */}
                              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-gray-400 block mb-1.5">
                                  Answer Key Choices (Q1 - Q10):
                                </span>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {keyAnswers.slice(0, 10).map((ansObj) => (
                                    <div
                                      key={ansObj.qNo}
                                      className="p-1 rounded bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-center flex items-center justify-between text-[10px]"
                                    >
                                      <span className="text-gray-400 font-medium">Q{ansObj.qNo}</span>
                                      <strong className="text-primary font-black ml-1">{ansObj.answer}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-slate-700/60">
                              <button
                                onClick={() => handleDeleteKey(k.id)}
                                className="p-2 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-xs font-semibold flex items-center gap-1"
                                title="Delete Answer Key"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>

                              <button
                                onClick={() => {
                                  applyActiveKey(k);
                                  setIsRepositoryModalOpen(false);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                                  isActive
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-primary hover:bg-primary/90 text-white'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isActive ? 'Currently Active' : 'Click to Load & Apply'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-400 shrink-0">
                <span>Click on any Answer Key to instantly populate and evaluate student OMR sheets.</span>
                <button
                  onClick={() => setIsRepositoryModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl cursor-pointer"
                >
                  Close Repository
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
