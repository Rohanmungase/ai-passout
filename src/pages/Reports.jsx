import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Download, Printer, Award, FileText, Brain, BarChart3,
  AlertCircle, ArrowLeft, CheckCircle, Target, Clock,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { generateReport } from '../utils/mockReportGenerator';
import { formatPercentage, getGrade, getScoreColor } from '../utils/formatters';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import FeedbackList from '../components/FeedbackList';

/**
 * Reports page — professional evaluation report card with PDF download and print.
 */
export default function Reports() {
  const { state } = useAppContext();
  const toast = useToast();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  // Empty state — no evaluation done yet
  if (!state.evaluationResult) {
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Report Available</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            Complete an evaluation first to generate a detailed report.
          </p>
          <button
            onClick={() => navigate('/evaluation')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold
              bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Evaluation
          </button>
        </div>
      </motion.div>
    );
  }

  const report = generateReport({
    studentAnswer: state.extractedText,
    correctAnswer: state.correctAnswer,
    extractedText: state.extractedText,
    evaluationResult: state.evaluationResult,
    studentInfo: state.studentInfo,
  });

  const handleDownloadPDF = async () => {
    try {
      toast.info('Generating PDF report...');
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const element = reportRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`evaluation-report-${report.studentInfo?.rollNo || report.id}.pdf`);

      toast.success('PDF report downloaded successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const percentage = report.marks.percentage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto"
    >
      {/* Page header with actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Evaluation Report
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Generated on {report.generatedAt}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold
              bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300
              shadow-md shadow-primary/20"
            id="download-pdf-btn"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
              border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            id="print-report-btn"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* ===== Printable Report Card ===== */}
      <div
        ref={reportRef}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700
          overflow-hidden"
      >
        {/* Report header */}
        <div className="bg-gradient-to-r from-primary to-secondary px-6 sm:px-8 py-6 text-white">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <Brain className="w-7 h-7" />
              <h2 className="text-xl font-bold">AI Answer Sheet Evaluation Report</h2>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium backdrop-blur-sm">
              ID: {report.id}
            </span>
          </div>
          <p className="text-blue-100 text-xs">Generated on {report.generatedAt}</p>
        </div>

        {/* Student Details Card Section */}
        <div className="bg-slate-50 dark:bg-slate-900/60 px-6 sm:px-8 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">STUDENT NAME</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                {report.studentInfo?.name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">ROLL NO</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                {report.studentInfo?.rollNo || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">DIVISION</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                {report.studentInfo?.division || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">COLLEGE</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                {report.studentInfo?.collegeName || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">SUBJECT</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                {report.studentInfo?.subject || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">CLASS / YEAR</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                {report.studentInfo?.className || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Score overview */}
        <div className="px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-slate-700">
          <div className="grid sm:grid-cols-3 gap-6 items-center">
            <div className="flex flex-col items-center">
              <CircularProgress
                value={percentage}
                size={140}
                strokeWidth={10}
                color={percentage >= 80 ? '#10B981' : percentage >= 60 ? '#F59E0B' : '#EF4444'}
              />
              <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">Overall Score</p>
            </div>

            <div className="sm:col-span-2 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.marks.obtained}</p>
                  <p className="text-xs text-gray-500">Marks Obtained</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.marks.maximum}</p>
                  <p className="text-xs text-gray-500">Maximum Marks</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                  <p className={`text-2xl font-bold ${getScoreColor(percentage)}`}>{report.marks.grade}</p>
                  <p className="text-xs text-gray-500">Grade</p>
                </div>
              </div>

              {/* Progress bars */}
              <ProgressBar value={report.analytics.grammar} label="Grammar" color="bg-purple-500" size="sm" />
              <ProgressBar value={report.analytics.keywordMatch} label="Keyword Match" color="bg-amber-500" size="sm" />
              <ProgressBar value={report.analytics.similarity} label="Similarity" color="bg-blue-500" size="sm" />
              <ProgressBar value={report.analytics.completeness} label="Completeness" color="bg-teal-500" size="sm" />
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Performance Summary
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{report.summary}</p>
        </div>

        {/* Question-wise Rubric Breakdown Table */}
        {state.evaluationResult?.questionBreakdown?.length > 0 && (
          <div className="px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" /> Itemized Question Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-700">
                    <th className="p-2.5">Q.No</th>
                    <th className="p-2.5">Question Title</th>
                    <th className="p-2.5 text-center">Marks</th>
                    <th className="p-2.5 text-center">Accuracy</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">AI Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
                  {state.evaluationResult.questionBreakdown.map((q) => (
                    <tr key={q.id}>
                      <td className="p-2.5 font-bold font-mono">{q.qNo}</td>
                      <td className="p-2.5 font-medium">{q.title}</td>
                      <td className="p-2.5 text-center font-bold">{q.marksObtained} / {q.maxMarks}</td>
                      <td className="p-2.5 text-center font-bold">{q.accuracy}%</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.status === 'Correct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                          q.status === 'Partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-500 dark:text-gray-400 italic">
                        <div>{q.feedback}</div>
                        {q.diagramEvaluation && (
                          <div className="mt-1 font-normal font-sans text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 p-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
                            <strong>🎨 Diagram AI Evaluated ({q.diagramEvaluation.diagramType}):</strong> Score {q.diagramEvaluation.overallDiagramScore}% • Verified Labels: {q.diagramEvaluation.verifiedLabels.join(', ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Answers comparison */}
        <div className="px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-slate-700">
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Correct Answer
              </h3>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300
                leading-relaxed max-h-60 overflow-y-auto">
                {report.correctAnswer || 'No correct answer provided.'}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Student's Answer (Extracted)
              </h3>
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300
                leading-relaxed max-h-60 overflow-y-auto">
                {report.studentAnswer || 'No student answer available.'}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="px-6 sm:px-8 py-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Detailed Feedback</h3>
          <FeedbackList feedback={report.feedback} />
        </div>
      </div>
    </motion.div>
  );
}
