import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Sun, Moon, Monitor, Brain, ScanText, Palette } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';

/**
 * Settings page — theme toggle, AI model selection, OCR engine selection.
 */

const aiModels = [
  { id: 'gemini', name: 'Google Gemini', description: 'Advanced multimodal AI by Google' },
  { id: 'openai', name: 'OpenAI GPT-4', description: 'Industry-leading language model' },
  { id: 'claude', name: 'Anthropic Claude', description: 'Safety-focused, high-quality AI' },
];

const ocrEngines = [
  { id: 'tesseract', name: 'Tesseract OCR', description: 'Open-source, runs locally' },
  { id: 'google-vision', name: 'Google Cloud Vision', description: 'Cloud-based, high accuracy' },
  { id: 'azure-ocr', name: 'Azure Computer Vision', description: 'Microsoft cloud OCR service' },
];

export default function Settings() {
  const { state, dispatch } = useAppContext();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const handleModelChange = (modelId) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { aiModel: modelId } });
    const model = aiModels.find(m => m.id === modelId);
    toast.success(`AI model changed to ${model?.name || modelId}`);
  };

  const handleEngineChange = (engineId) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { ocrEngine: engineId } });
    const engine = ocrEngines.find(e => e.id === engineId);
    toast.success(`OCR engine changed to ${engine?.name || engineId}`);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    toast.info(`Theme switched to ${newTheme} mode`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto"
    >
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" />
          Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure your evaluation preferences and application settings.
        </p>
      </div>

      {/* ===== Theme Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700
          shadow-sm p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Theme</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred appearance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'light', icon: <Sun className="w-5 h-5" />, label: 'Light' },
            { id: 'dark', icon: <Moon className="w-5 h-5" />, label: 'Dark' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => handleThemeChange(option.id)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                ${
                  theme === option.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              aria-pressed={theme === option.id}
            >
              <span className={theme === option.id ? 'text-primary' : 'text-gray-400'}>{option.icon}</span>
              <span className={`text-sm font-medium ${
                theme === option.id ? 'text-primary' : 'text-gray-600 dark:text-gray-300'
              }`}>
                {option.label}
              </span>
              {theme === option.id && (
                <motion.div
                  layoutId="theme-indicator"
                  className="ml-auto w-2 h-2 rounded-full bg-primary"
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ===== AI Model Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700
          shadow-sm p-6 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">AI Model</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Select the AI model for evaluation</p>
          </div>
        </div>

        <div className="space-y-2">
          {aiModels.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelChange(model.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  state.settings.aiModel === model.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              role="radio"
              aria-checked={state.settings.aiModel === model.id}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                ${state.settings.aiModel === model.id ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                {state.settings.aiModel === model.id && (
                  <motion.div layoutId="model-dot" className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  state.settings.aiModel === model.id ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {model.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{model.description}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ===== OCR Engine Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700
          shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <ScanText className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">OCR Engine</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Select the text extraction engine</p>
          </div>
        </div>

        <div className="space-y-2">
          {ocrEngines.map((engine) => (
            <button
              key={engine.id}
              onClick={() => handleEngineChange(engine.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200
                ${
                  state.settings.ocrEngine === engine.id
                    ? 'border-accent bg-accent/5 dark:bg-accent/10'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              role="radio"
              aria-checked={state.settings.ocrEngine === engine.id}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                ${state.settings.ocrEngine === engine.id ? 'border-accent' : 'border-gray-300 dark:border-gray-600'}`}>
                {state.settings.ocrEngine === engine.id && (
                  <motion.div layoutId="engine-dot" className="w-2 h-2 rounded-full bg-accent" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  state.settings.ocrEngine === engine.id ? 'text-accent' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {engine.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{engine.description}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
