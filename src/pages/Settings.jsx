import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Brain, 
  ScanText, 
  Palette, 
  Sliders, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  FileSpreadsheet, 
  Volume2, 
  EyeOff, 
  Cpu, 
  Zap,
  Box
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';

/**
 * Settings page — Theme, AI Model, OCR Engine, Strictness Modes, ICR Scanning & Privacy Settings.
 */

const aiModels = [
  { id: 'gemini', name: 'Google Gemini 1.5 Flash / Pro', description: 'Advanced multimodal AI by Google with visual paper analysis', badge: 'Recommended' },
  { id: 'openai', name: 'OpenAI GPT-4o Vision', description: 'Industry-leading multimodal language & evaluation model', badge: 'High Accuracy' },
  { id: 'claude', name: 'Anthropic Claude 3.5 Sonnet', description: 'Safety-focused, high-precision academic reasoning engine', badge: 'Deep Reasoning' },
];

const ocrEngines = [
  { id: 'tesseract', name: 'Tesseract Standard', description: 'Best for general text & standard handwriting evaluation', speed: 'Default' },
  { id: 'tesseract-math', name: 'Tesseract Math/Science Pack', description: 'Tuned with specialized character mappings for numerical data and formulas', speed: 'Precise' },
  { id: 'tesseract-cursive', name: 'Tesseract English Cursive', description: 'Specialized model for English linked-cursive handwriting', speed: 'Intensive' },
  { id: 'tesseract-fast', name: 'Tesseract Fast Mode', description: 'Lightweight mode for rapid scanning of cleanly printed papers', speed: 'Fast' },
];

const strictnessModes = [
  { 
    id: 'lenient', 
    name: 'Lenient Mode', 
    description: 'Generous partial credits. Forgives minor spelling errors, OCR noise, and alternative correct phrasing.', 
    color: 'emerald' 
  },
  { 
    id: 'standard', 
    name: 'Standard Mode (Default)', 
    description: 'Balanced academic grading aligned with standard university rubrics and model answer keys.', 
    color: 'primary' 
  },
  { 
    id: 'strict', 
    name: 'Strict Technical Mode', 
    description: 'Requires exact keyword inclusion, precise mathematical formula steps, and strict diagram labels.', 
    color: 'amber' 
  },
];

const icrModes = [
  { 
    id: 'neural', 
    name: 'Neural ICR v2 (Deep Transformer)', 
    description: 'Advanced vision transformer trained on messy student handwriting and cursive scripts.' 
  },
  { 
    id: 'dictionary', 
    name: 'Standard Dictionary ICR', 
    description: 'Fast lexicon-assisted OCR pattern matcher for printed and semi-neat handwriting.' 
  },
];

export default function Settings() {
  const { state, dispatch } = useAppContext();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const handleSettingToggle = (key, currentVal, label) => {
    const newVal = !currentVal;
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: newVal } });
    toast.success(`${label} ${newVal ? 'Enabled' : 'Disabled'}`);
  };

  const handleSettingChange = (key, value, label) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
    toast.success(`${label} updated to ${value}`);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    toast.info(`Theme switched to ${newTheme} mode`);
  };

  const currentSettings = state.settings || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <SettingsIcon className="w-6 h-6" />
            </div>
            Settings & Evaluation Modes
          </h1>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
            Configure AI model parameters, grading strictness, OCR engines, and privacy modes.
          </p>
        </div>

        {/* Status Indicator Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm text-xs font-semibold text-gray-700 dark:text-slate-300 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active: {aiModels.find(m => m.id === currentSettings.aiModel)?.name.split(' ')[1] || 'Gemini'}</span>
        </div>
      </div>

      {/* ===== 1. Theme & Appearance Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Theme & Appearance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Choose your visual theme mode</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'light', icon: <Sun className="w-5 h-5" />, label: 'Light Mode', desc: 'Clean high-contrast theme' },
            { id: 'dark', icon: <Moon className="w-5 h-5" />, label: 'Dark Mode', desc: 'Sleek low-light theme' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => handleThemeChange(option.id)}
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  theme === option.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
            >
              <span className={`p-2 rounded-lg ${theme === option.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}>
                {option.icon}
              </span>
              <div>
                <p className={`text-sm font-bold ${theme === option.id ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ===== 2. Evaluation Strictness & Precision Modes ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Evaluation Strictness Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Controls how strictly the AI evaluates partial answers and technical terms</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {strictnessModes.map((mode) => {
            const isSelected = (currentSettings.strictnessMode || 'standard') === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleSettingChange('strictnessMode', mode.id, 'Grading strictness')}
                className={`p-4 rounded-xl border-2 text-left flex flex-col justify-between transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                    }`}>
                      {mode.name.split(' ')[0]}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1">{mode.name}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{mode.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feature Switches */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Auto-Regrade Low Confidence Scores</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Automatically re-evaluates answer sheets with confidence &lt; 50% using dual prompt verification</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingToggle('autoRegrade', currentSettings.autoRegrade !== false, 'Auto-Regrade')}
              className={`w-11 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                currentSettings.autoRegrade !== false ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                currentSettings.autoRegrade !== false ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Step-by-Step Intermediate Partial Credit</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Grades step calculations and formula derivations in mathematics and engineering questions</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingToggle('stepCredit', currentSettings.stepCredit !== false, 'Step-by-Step Credit')}
              className={`w-11 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                currentSettings.stepCredit !== false ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                currentSettings.stepCredit !== false ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <Box className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">OpenCV Diagram Verification</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Enables geometric validation for hand-drawn scientific schemas</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingToggle('verifyDiagrams', currentSettings.verifyDiagrams !== false, 'Diagram Verification')}
              className={`w-11 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                currentSettings.verifyDiagrams !== false ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                currentSettings.verifyDiagrams !== false ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ===== 3. AI Model Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">AI Evaluation Engine</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Select the LLM backend for subject evaluation</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {aiModels.map((model) => {
            const isSelected = (currentSettings.aiModel || 'gemini') === model.id;
            return (
              <button
                key={model.id}
                onClick={() => handleSettingChange('aiModel', model.id, 'AI model')}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                      {model.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{model.description}</p>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                  {model.badge}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ===== 4. OCR & ICR Scanning Modes ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ScanText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">OCR & Handwriting ICR Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Text extraction engine for scanned student answer sheets</p>
          </div>
        </div>

        {/* OCR Engines */}
        <div className="space-y-2">
          {ocrEngines.map((engine) => {
            const isSelected = (currentSettings.ocrEngine || 'tesseract') === engine.id;
            return (
              <button
                key={engine.id}
                onClick={() => handleSettingChange('ocrEngine', engine.id, 'OCR engine')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all duration-200
                  ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                      {engine.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{engine.description}</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  {engine.speed}
                </span>
              </button>
            );
          })}
        </div>

        {/* ICR Mode Selection */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-700/60">
          <label className="text-xs font-bold text-gray-900 dark:text-white mb-2 block flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" /> Handwriting Recognition Engine (ICR)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {icrModes.map((icr) => {
              const isSelected = (currentSettings.icrMode || 'neural') === icr.id;
              return (
                <button
                  key={icr.id}
                  onClick={() => handleSettingChange('icrMode', icr.id, 'Handwriting ICR Mode')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                    {icr.name}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{icr.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ===== 5. Privacy & System Modes ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700/80 shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Privacy & System Preferences</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure data anonymity, report exports, and notifications</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Anonymous Roster Mode */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <EyeOff className="w-4 h-4 text-teal-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Anonymous Roster Mode</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Displays roll numbers and PRNs instead of student names across Dashboard and Reports</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingToggle('anonymousMode', currentSettings.anonymousMode === true, 'Anonymous Mode')}
              className={`w-11 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                currentSettings.anonymousMode === true ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                currentSettings.anonymousMode === true ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Auto Export PDF */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Auto Export PDF Reports</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Automatically downloads evaluated report card PDF upon completing AI grading</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingToggle('autoExportPdf', currentSettings.autoExportPdf === true, 'Auto PDF Export')}
              className={`w-11 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                currentSettings.autoExportPdf === true ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                currentSettings.autoExportPdf === true ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Sound Feedback */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Audio Feedback & Sound Effects</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Plays audio chime upon successful AI evaluation completion</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingToggle('soundFeedback', currentSettings.soundFeedback !== false, 'Sound Feedback')}
              className={`w-11 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                currentSettings.soundFeedback !== false ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                currentSettings.soundFeedback !== false ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
