import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, X, FileText, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { formatFileSize } from '../utils/formatters';
import { validateUploadFile } from '../utils/validators';
import { convertPdfAllPagesToDataUrls } from '../services/ocrService';

/**
 * Drag-and-drop upload zone with file preview.
 * Accepts PNG/JPG/JPEG/PDF files.
 */
export default function UploadBox() {
  const { state, dispatch } = useAppContext();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(async (files) => {
    const validFiles = [];
    const validPreviews = [];

    for (const file of Array.from(files)) {
      const validation = validateUploadFile(file);
      if (!validation.valid) {
        toast.error(`"${file.name}": ${validation.error}`);
      } else {
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        try {
          let base64DataUrl;
          if (isPdf) {
            base64DataUrl = await convertPdfAllPagesToDataUrls(file);
          } else {
            base64DataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(file);
            });
          }
          validFiles.push(file);
          validPreviews.push(base64DataUrl);
        } catch (err) {
          // Fallback if PDF parsing fails
          const base64DataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
          validFiles.push(file);
          validPreviews.push(base64DataUrl);
        }
      }
    }

    if (validFiles.length > 0) {
      dispatch({
        type: 'ADD_UPLOADED_FILES',
        payload: { files: validFiles, previews: validPreviews },
      });
      // Clear previous extraction result so new upload extracts fresh content
      dispatch({ type: 'SET_OCR_RESULT', payload: { text: '', confidence: 0, wordCount: 0 } });
      toast.success(`${validFiles.length} file(s) uploaded successfully!`);
    }
  }, [dispatch, toast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    if (e.target.files?.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = ''; // Reset so same file can be re-selected
  }, [handleFiles]);

  const removeFile = useCallback((index) => {
    dispatch({ type: 'REMOVE_UPLOADED_FILE', payload: index });
  }, [dispatch]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ===== Drop Zone ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload answer sheet image"
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12
          flex flex-col items-center justify-center gap-4 transition-all duration-300
          ${
            isDragging
              ? 'border-primary bg-primary/5 dark:bg-primary/10 scale-[1.02]'
              : 'border-gray-300 dark:border-slate-600 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-slate-800/50'
          }`}
      >
        <motion.div
          animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center"
        >
          <Upload className="w-8 h-8 text-primary" />
        </motion.div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {isDragging ? 'Drop your files here' : 'Drag & drop your answer sheets'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            or click to browse • PNG, JPG, JPEG, PDF • Multiple files allowed
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,application/pdf"
          multiple
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />
      </motion.div>

      {/* ===== File Previews ===== */}
      <AnimatePresence>
        {state.uploadedFiles?.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Files ({state.uploadedFiles.length})</h3>
              <button 
                onClick={() => {
                  dispatch({ type: 'CLEAR_UPLOADED_FILES' });
                  dispatch({ type: 'SET_OCR_RESULT', payload: { text: '', confidence: 0, wordCount: 0 } });
                }}
                className="text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer"
              >
                Clear All
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {state.uploadedFiles.map((file, index) => {
                const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
                return (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800
                      shadow-sm overflow-hidden flex flex-col"
                  >
                  {/* Image / PDF preview */}
                  <div className="relative bg-gray-100 dark:bg-slate-900 flex items-center justify-center h-48 overflow-hidden">
                    {(() => {
                      const prevItem = state.imagePreviews[index];
                      const firstUrl = Array.isArray(prevItem) ? prevItem[0] : prevItem;
                      const hasValidImage = typeof firstUrl === 'string' && firstUrl.startsWith('data:image/');

                      if (isPdf) {
                        return (
                          <div className="relative w-full h-full flex items-center justify-center">
                            {hasValidImage ? (
                              <img
                                src={firstUrl}
                                alt={`Preview of ${file.name}`}
                                className="w-full h-full object-cover opacity-90"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-500 flex items-center justify-center mb-3">
                                  <FileText className="w-8 h-8" />
                                </div>
                              </div>
                            )}
                            <span className="absolute top-2 right-2 px-2.5 py-1 text-xs font-semibold text-red-600 bg-white/90 dark:bg-red-950/80 backdrop-blur-md rounded-full shadow border border-red-200 dark:border-red-800 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-red-500" /> PDF Document
                            </span>
                          </div>
                        );
                      }

                      return (
                        <img
                          src={firstUrl}
                          alt={`Preview of ${file.name}`}
                          className="w-full h-full object-cover opacity-90"
                        />
                      );
                    })()}
                  </div>

                  {/* File info bar */}
                  <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${isPdf ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                        {isPdf ? <FileText className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                      </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400
                      hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Remove uploaded file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
