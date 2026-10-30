import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Download, Printer, Award, FileText, Brain, BarChart3,
  AlertCircle, ArrowLeft, CheckCircle, Target, Clock,
  MapPin, Building2, Users, BookOpen, Search, Filter,
  Sparkles, CheckCircle2, ChevronRight, TrendingUp, Layers,
  Eye, Zap, GraduationCap
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DISTRICTS_MAP } from '../components/StudentInfoCard';
import { useToast } from '../hooks/useToast';
import { generateReport } from '../utils/mockReportGenerator';
import { formatPercentage, getGrade, getScoreColor } from '../utils/formatters';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import FeedbackList from '../components/FeedbackList';

/**
 * Reports page — Multi-level Institutional, District & Student Evaluation Reports.
 */
export default function Reports() {
  const { state, dispatch } = useAppContext();
  const toast = useToast();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  // Active Filter state for State & District with localStorage persistence & non-empty fallbacks
  const [selectedState, setSelectedState] = useState(() => {
    const raw = localStorage.getItem('selectedState') || state.studentInfo?.state;
    return (raw && DISTRICTS_MAP[raw]) ? raw : 'Maharashtra';
  });

  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    const rawState = localStorage.getItem('selectedState') || state.studentInfo?.state || 'Maharashtra';
    const validState = DISTRICTS_MAP[rawState] ? rawState : 'Maharashtra';
    const validDistricts = DISTRICTS_MAP[validState] || ['Pune'];
    const rawDist = localStorage.getItem('selectedDistrict') || state.studentInfo?.district;
    return (rawDist && validDistricts.includes(rawDist)) ? rawDist : validDistricts[0];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('colleges'); // 'colleges' | 'student-report' | 'college-detail'
  const [selectedCollegeDetail, setSelectedCollegeDetail] = useState(null);

  // Available states & districts
  const statesList = Object.keys(DISTRICTS_MAP);
  const availableDistricts = DISTRICTS_MAP[selectedState] || DISTRICTS_MAP['Maharashtra'] || [];

  // Cascading state change handler
  const handleStateChange = (newState) => {
    const validState = DISTRICTS_MAP[newState] ? newState : 'Maharashtra';
    setSelectedState(validState);
    localStorage.setItem('selectedState', validState);

    const districts = DISTRICTS_MAP[validState] || [];
    const newDistrict = districts[0] || 'Pune';
    setSelectedDistrict(newDistrict);
    localStorage.setItem('selectedDistrict', newDistrict);
    
    // Also sync global context state
    dispatch({
      type: 'SET_STUDENT_INFO',
      payload: { state: validState, district: newDistrict }
    });
  };

  const handleDistrictChange = (newDistrict) => {
    setSelectedDistrict(newDistrict);
    localStorage.setItem('selectedDistrict', newDistrict);
    dispatch({
      type: 'SET_STUDENT_INFO',
      payload: { district: newDistrict }
    });
  };

  // Filter colleges by State and District (case insensitive matching fallback)
  const filteredColleges = useMemo(() => {
    return (state.colleges || []).filter((college) => {
      const matchState = !selectedState || (college.state || 'Maharashtra').toLowerCase() === selectedState.toLowerCase();
      const matchDistrict = !selectedDistrict || (college.district || 'Pune').toLowerCase() === selectedDistrict.toLowerCase();
      const matchSearch = !searchQuery || 
        college.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        college.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (college.location && college.location.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchState && matchDistrict && matchSearch;
    });
  }, [state.colleges, selectedState, selectedDistrict, searchQuery]);

  // Aggregate District Statistics
  const districtStats = useMemo(() => {
    const totalColleges = filteredColleges.length;
    const totalStudents = filteredColleges.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
    const totalExams = filteredColleges.reduce((acc, c) => acc + (c.examsCount || 0), 0);
    const totalCenters = filteredColleges.reduce((acc, c) => acc + (c.centersCount || 0), 0);
    const avgScore = totalColleges > 0 
      ? (filteredColleges.reduce((acc, c) => acc + (c.avgScore || 0), 0) / totalColleges).toFixed(1)
      : '0.0';
    const avgPassRate = totalColleges > 0 
      ? (filteredColleges.reduce((acc, c) => acc + (c.passRate || 90), 0) / totalColleges).toFixed(1)
      : '0.0';

    return { totalColleges, totalStudents, totalExams, totalCenters, avgScore, avgPassRate };
  }, [filteredColleges]);

  // Calculate dynamic Divisions, Batches & Student Roster directly from Dashboard roster (state.students)
  const selectedCollegeBreakdown = useMemo(() => {
    if (!selectedCollegeDetail) return null;

    const collegeIdStr = String(selectedCollegeDetail.id);
    const colNameLower = (selectedCollegeDetail.name || '').toLowerCase();
    const colCodeLower = (selectedCollegeDetail.code || '').toLowerCase();

    // Query real students enrolled in this college from the Dashboard database
    const matchingStudents = (state.students || []).filter(s => {
      if (s.collegeId && String(s.collegeId) === collegeIdStr) return true;
      const enrolledCol = (s.enrolledCollege || s.collegeName || s.college || '').toLowerCase();
      if (enrolledCol && (enrolledCol.includes(colNameLower) || colNameLower.includes(enrolledCol) || (colCodeLower && enrolledCol.includes(colCodeLower)))) {
        return true;
      }
      return false;
    });

    const divisionMap = {};
    const batchMap = {};

    matchingStudents.forEach(student => {
      // Extract division (e.g. "Division A", "Div A", "A")
      let divName = student.division || 'Division A';
      if (!divName.toLowerCase().includes('div')) {
        divName = `Division ${divName}`;
      }

      const batchName = student.batch 
        ? (student.batch.startsWith('Batch') ? student.batch : `Batch ${student.batch}`) 
        : 'Batch A-1';

      if (!divisionMap[divName]) {
        divisionMap[divName] = {
          name: divName,
          code: divName.toUpperCase().replace(/\s+/g, '-'),
          students: [],
          batches: new Set(),
          departments: new Set()
        };
      }
      divisionMap[divName].students.push(student);
      divisionMap[divName].batches.add(batchName);
      if (student.department) divisionMap[divName].departments.add(student.department);

      if (!batchMap[batchName]) {
        batchMap[batchName] = {
          name: batchName,
          div: divName,
          students: [],
          slot: batchName.endsWith('1') ? 'Morning' : 'Afternoon'
        };
      }
      batchMap[batchName].students.push(student);
    });

    let divisionsList = Object.values(divisionMap)
      .filter(d => d.students.length > 0)
      .map(d => ({
        ...d,
        studentCount: d.students.length,
        batches: Array.from(d.batches).filter(bName => batchMap[bName] && batchMap[bName].students.length > 0),
        dept: Array.from(d.departments).join(', ') || selectedCollegeDetail.defaultDept || 'Computer Engineering'
      }));

    let batchesList = Object.values(batchMap)
      .filter(b => b.students.length > 0)
      .map(b => ({
        ...b,
        studentCount: b.students.length
      }));

    // Dynamically calculate division and batch structure based on actual college properties
    if (divisionsList.length === 0) {
      const totalCapacity = selectedCollegeDetail.studentsCount || 300;
      const deptName = selectedCollegeDetail.defaultDept || 'Computer Engineering';
      
      // Determine number of divisions based on college capacity (~120-150 students per division)
      const numDivs = Math.max(1, Math.min(4, Math.ceil(totalCapacity / 140)));
      const divLetters = ['A', 'B', 'C', 'D'].slice(0, numDivs);
      
      const basePerDiv = Math.floor(totalCapacity / numDivs);
      const rem = totalCapacity % numDivs;

      divisionsList = divLetters.map((letter, idx) => {
        const count = basePerDiv + (idx < rem ? 1 : 0);
        const divName = `Division ${letter}`;
        return {
          name: divName,
          code: `DIV-${letter}`,
          studentCount: count,
          batches: [`Batch ${letter}-1`, `Batch ${letter}-2`],
          dept: deptName
        };
      });

      batchesList = [];
      divisionsList.forEach((divObj) => {
        const letter = divObj.name.replace('Division ', '');
        const b1Count = Math.ceil(divObj.studentCount / 2);
        const b2Count = Math.floor(divObj.studentCount / 2);

        batchesList.push({
          name: `Batch ${letter}-1`,
          div: divObj.name,
          studentCount: b1Count,
          slot: 'Morning'
        });
        batchesList.push({
          name: `Batch ${letter}-2`,
          div: divObj.name,
          studentCount: b2Count,
          slot: 'Afternoon'
        });
      });
    }

    // Calculate Academic Standards & Years Breakdown
    const yearConfig = [
      { key: 'First Year', name: 'First Year (F.Y.)', standard: 'F.Y. B.Tech', sem: 'Semester I & II' },
      { key: 'Second Year', name: 'Second Year (S.Y.)', standard: 'S.Y. B.Tech', sem: 'Semester III & IV' },
      { key: 'Third Year', name: 'Third Year (T.Y.)', standard: 'T.Y. B.Tech', sem: 'Semester V & VI' },
      { key: 'Final Year', name: 'Final Year (B.Tech)', standard: 'B.Tech / B.E.', sem: 'Semester VII & VIII' },
    ];

    const yearBuckets = {
      'First Year': [],
      'Second Year': [],
      'Third Year': [],
      'Final Year': [],
    };

    if (matchingStudents.length > 0) {
      matchingStudents.forEach(student => {
        const yr = (student.year || student.standard || '').toLowerCase();
        let key = 'Second Year';
        if (yr.includes('first') || yr.includes('f.y') || yr.includes('1st')) key = 'First Year';
        else if (yr.includes('third') || yr.includes('t.y') || yr.includes('3rd')) key = 'Third Year';
        else if (yr.includes('final') || yr.includes('4th') || yr.includes('last') || yr.includes('b.tech')) key = 'Final Year';
        else key = 'Second Year';

        yearBuckets[key].push(student);
      });
    }

    const totalCap = matchingStudents.length > 0 ? matchingStudents.length : (selectedCollegeDetail.studentsCount || 300);
    const basePerYear = Math.floor(totalCap / 4);
    const remYear = totalCap % 4;

    const yearsList = yearConfig.map((cfg, idx) => {
      const realCount = yearBuckets[cfg.key]?.length || 0;
      const count = matchingStudents.length > 0 ? realCount : (basePerYear + (idx < remYear ? 1 : 0));
      return {
        name: cfg.name,
        standard: cfg.standard,
        semesters: cfg.sem,
        studentCount: count,
      };
    }).filter(y => y.studentCount > 0);

    // Helper function to check if a student passed based on roster data, evaluation, or attendance
    const isStudentPassed = (student) => {
      if (!student) return true;
      const statusStr = String(student.status || '').toLowerCase();
      if (statusStr.includes('fail') || statusStr.includes('absent') || statusStr.includes('detain')) {
        return false;
      }
      if (student.evaluation) {
        const accuracy = Number(student.evaluation.accuracy);
        const marksObtained = Number(student.evaluation.marksObtained);
        const maxMarks = Number(student.evaluation.maxMarks || 10);
        if (!isNaN(accuracy) && accuracy > 0) {
          if (accuracy < 40) return false;
        } else if (!isNaN(marksObtained) && maxMarks > 0) {
          if ((marksObtained / maxMarks) * 100 < 40) return false;
        }
      }
      if (student.attendance !== undefined && student.attendance !== null) {
        const attNum = parseFloat(String(student.attendance).replace('%', ''));
        if (!isNaN(attNum) && attNum < 40) return false;
      }
      return true;
    };

    let passedCount = 0;
    matchingStudents.forEach(s => {
      if (isStudentPassed(s)) passedCount++;
    });

    const calculatedPassRate = matchingStudents.length > 0 
      ? Number(((passedCount / matchingStudents.length) * 100).toFixed(1))
      : (selectedCollegeDetail.passRate || 90.0);

    const calculatedFailRate = Number((100 - calculatedPassRate).toFixed(1));
    const totalStudentsCount = matchingStudents.length > 0 ? matchingStudents.length : (selectedCollegeDetail.studentsCount || 0);
    const failedCount = matchingStudents.length > 0 
      ? (matchingStudents.length - passedCount)
      : Math.round((calculatedFailRate / 100) * totalStudentsCount);

    return {
      matchingStudents,
      divisionsList,
      batchesList,
      yearsList,
      passedCount,
      failedCount,
      calculatedPassRate,
      calculatedFailRate,
      totalStudentsCount,
      totalDivisionsCount: divisionsList.length,
      totalBatchesCount: batchesList.length,
      totalYearsCount: yearsList.length
    };
  }, [selectedCollegeDetail, state.students]);

  // Generate student evaluation report if available
  const report = state.evaluationResult ? generateReport({
    studentAnswer: state.extractedText,
    correctAnswer: state.correctAnswer,
    extractedText: state.extractedText,
    evaluationResult: state.evaluationResult,
    studentInfo: state.studentInfo,
  }) : null;

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
      pdf.save(`evaluation-report-${report?.studentInfo?.rollNo || report?.id || 'doc'}.pdf`);

      toast.success('PDF report downloaded successfully!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* ===== Header & Mode Navigation ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              Institutional Reports
            </span>
            {selectedState && (
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selectedState} ➔ {selectedDistrict}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            District & College Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Select State and District to explore college performance metrics and individual evaluation reports.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveTab('colleges')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'colleges'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            State & District Colleges ({filteredColleges.length})
          </button>

          {state.evaluationResult && (
            <button
              onClick={() => setActiveTab('student-report')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'student-report'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Student Evaluation Card
            </button>
          )}
        </div>
      </div>

      {/* ===== State & District Filter Bar ===== */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Filter Colleges by Location
          </h2>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Showing colleges for <strong className="text-primary">{selectedDistrict}, {selectedState}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* State Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Select State
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
            >
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* District Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Select District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
            >
              {availableDistricts.map((dst) => (
                <option key={dst} value={dst}>{dst}</option>
              ))}
            </select>
          </div>

          {/* College Name Search Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-500" /> Search College
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search college name or code..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== TAB CONTENT: Colleges Grid View ===== */}
      {activeTab === 'colleges' && (
        <div className="space-y-6">
          {/* District Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">Total Colleges</p>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">{districtStats.totalColleges}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">Active Location</p>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{selectedDistrict}, {selectedState}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold">Selection Status</p>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Ready</p>
                </div>
              </div>
            </div>
          </div>

          {/* Colleges Cards Grid */}
          {filteredColleges.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-700">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                No Colleges Found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                No colleges match the selected filter for <strong>{selectedDistrict}, {selectedState}</strong>.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:opacity-90 transition-all"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredColleges.map((college) => {
                // Dynamically compute pass rate for this college from enrolled student records
                const collegeIdStr = String(college.id);
                const colNameLower = (college.name || '').toLowerCase();
                const colCodeLower = (college.code || '').toLowerCase();
                const collegeStudents = (state.students || []).filter(s => {
                  if (s.collegeId && String(s.collegeId) === collegeIdStr) return true;
                  const enrolledCol = (s.enrolledCollege || s.collegeName || s.college || '').toLowerCase();
                  if (enrolledCol && (enrolledCol.includes(colNameLower) || colNameLower.includes(enrolledCol) || (colCodeLower && enrolledCol.includes(colCodeLower)))) {
                    return true;
                  }
                  return false;
                });

                let dynamicPassRate = college.passRate || 90.0;
                if (collegeStudents.length > 0) {
                  let passed = 0;
                  collegeStudents.forEach(s => {
                    let isPassed = true;
                    const statusStr = String(s.status || '').toLowerCase();
                    if (statusStr.includes('fail') || statusStr.includes('absent') || statusStr.includes('detain')) {
                      isPassed = false;
                    }
                    if (s.evaluation) {
                      const accuracy = Number(s.evaluation.accuracy);
                      const marksObtained = Number(s.evaluation.marksObtained);
                      const maxMarks = Number(s.evaluation.maxMarks || 10);
                      if (!isNaN(accuracy) && accuracy > 0) {
                        if (accuracy < 40) isPassed = false;
                      } else if (!isNaN(marksObtained) && maxMarks > 0) {
                        if ((marksObtained / maxMarks) * 100 < 40) isPassed = false;
                      }
                    }
                    if (s.attendance !== undefined && s.attendance !== null) {
                      const attNum = parseFloat(String(s.attendance).replace('%', ''));
                      if (!isNaN(attNum) && attNum < 40) isPassed = false;
                    }
                    if (isPassed) passed++;
                  });
                  dynamicPassRate = Number(((passed / collegeStudents.length) * 100).toFixed(1));
                }

                return (
                  <motion.div
                    key={college.id}
                    whileHover={{ y: -4 }}
                    onClick={() => {
                      setSelectedCollegeDetail(college);
                      dispatch({
                        type: 'SET_STUDENT_INFO',
                        payload: {
                          state: college.state || selectedState,
                          district: college.district || selectedDistrict,
                          collegeName: college.name,
                        }
                      });
                      toast.info(`Selected ${college.name} - Viewing Divisions & Batches`);
                    }}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer ${
                      selectedCollegeDetail?.id === college.id 
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-slate-800/90' 
                        : 'border-gray-200 dark:border-slate-700/80'
                    }`}
                  >
                    <div>
                      {/* Header: Name, Code & District */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                              {college.code}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2 leading-snug">
                            {college.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                            {college.location || `${selectedDistrict}, ${selectedState}`}
                          </p>
                        </div>
                      </div>
                    </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light border border-primary/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      View Divisions & Batches ➔
                    </button>
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== COLLEGE DETAIL MODAL / DIVISIONS & BATCHES BREAKDOWN ===== */}
      {selectedCollegeDetail && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-xl space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4 gap-4">
            <div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Institutional Structure
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mt-1.5">
                {selectedCollegeDetail.name} ({selectedCollegeDetail.code})
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                Location: {selectedCollegeDetail.location || `${selectedDistrict}, ${selectedState}`}
              </p>
            </div>
            <button
              onClick={() => setSelectedCollegeDetail(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-all self-start sm:self-auto"
            >
              Close Breakdown
            </button>
          </div>

          {/* Division, Batch, Pass & Fail Rate Overview Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold truncate">Total Divisions</p>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {selectedCollegeBreakdown?.totalDivisionsCount || 0} Div
                </p>
                <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                  {selectedCollegeBreakdown?.divisionsList.map(d => d.name).join(', ') || 'Divisions'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold truncate">Total Batches</p>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {selectedCollegeBreakdown?.totalBatchesCount || 0} Batches
                </p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                  Practical Batches
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold truncate">Enrolled Students</p>
                <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {selectedCollegeBreakdown?.totalStudentsCount || 0} Students
                </p>
                <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium truncate">
                  {selectedCollegeBreakdown?.matchingStudents?.length > 0 ? `${selectedCollegeBreakdown.matchingStudents.length} Active Records` : 'Total Capacity'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold truncate">Passing Percentage</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {selectedCollegeBreakdown?.calculatedPassRate}%
                </p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 truncate">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  {selectedCollegeBreakdown?.passedCount} Passed
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gradient-to-br from-rose-500/10 to-red-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold truncate">Fail Percentage</p>
                <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                  {selectedCollegeBreakdown?.calculatedFailRate}%
                </p>
                <p className="text-[9px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-0.5 truncate">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {selectedCollegeBreakdown?.failedCount} Failed
                </p>
              </div>
            </div>
          </div>

          {/* Academic Standards & Years Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500" /> Academic Standards & Years Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedCollegeBreakdown?.yearsList.map((yearObj) => (
                <div key={yearObj.name} className="bg-purple-500/5 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{yearObj.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {yearObj.standard}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{yearObj.semesters}</p>
                  <div className="pt-2 border-t border-purple-500/10 flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Students: <strong>{yearObj.studentCount}</strong></span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {selectedCollegeBreakdown?.calculatedPassRate}% Pass
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {selectedCollegeBreakdown?.calculatedFailRate}% Fail
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Divisions List */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> College Divisions Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedCollegeBreakdown?.divisionsList.map((div) => (
                <div key={div.code || div.name} className="bg-gray-50 dark:bg-slate-900/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{div.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {div.code}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">Dept: {div.dept}</p>
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex justify-between text-xs">
                    <span className="text-gray-500">Students: <strong>{div.studentCount}</strong></span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[120px]">
                      {div.batches.join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Batches List */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" /> Practical Batches List
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {selectedCollegeBreakdown?.batchesList.filter(b => b.studentCount > 0).map((batch) => (
                <div key={batch.name} className="bg-emerald-500/5 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20 text-center space-y-1">
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 block">{batch.name}</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 block">{batch.div}</span>
                  <span className="text-[11px] font-bold text-gray-900 dark:text-white block">{batch.studentCount} Students</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold inline-block">
                    {batch.slot} Lab
                  </span>
                </div>
              ))}
            </div>
          </div>



        </motion.div>
      )}

      {/* ===== TAB CONTENT: Individual Student Evaluation Report Card ===== */}
      {(activeTab === 'student-report' || (!state.evaluationResult && activeTab === 'student-report')) && (
        <div>
          {!state.evaluationResult ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Student Evaluation Report Available</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                Upload student answer sheets and run AI evaluation to generate detailed printable student report cards.
              </p>
              <button
                onClick={() => navigate('/evaluation')}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all"
              >
                Go to Evaluation Page ➔
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Actions */}
              <div className="flex items-center justify-between gap-4 no-print">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Student Evaluation Card
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-xs shadow-md"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
              </div>

              {/* Printable Student Report Card */}
              <div
                ref={reportRef}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
              >
                {/* Header banner */}
                <div className="bg-gradient-to-r from-primary to-secondary px-6 sm:px-8 py-5 text-white">
                  <div className="flex items-center justify-between gap-4 mb-1">
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

                {/* Student Info Card Section */}
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
                      <span className="text-gray-400 block font-medium">STATE / DISTRICT</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                        {selectedState} / {selectedDistrict}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">COLLEGE</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm truncate block">
                        {report.studentInfo?.collegeName || 'MIT College'}
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
                        value={report.marks.percentage}
                        size={130}
                        strokeWidth={10}
                        color={report.marks.percentage >= 80 ? '#10B981' : report.marks.percentage >= 60 ? '#F59E0B' : '#EF4444'}
                      />
                      <p className="mt-2 text-xs font-medium text-gray-500">Overall Score</p>
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{report.marks.obtained}</p>
                          <p className="text-[10px] text-gray-500">Marks Obtained</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{report.marks.maximum}</p>
                          <p className="text-[10px] text-gray-500">Max Marks</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                          <p className={`text-xl font-bold ${getScoreColor(report.marks.percentage)}`}>{report.marks.grade}</p>
                          <p className="text-[10px] text-gray-500">Grade</p>
                        </div>
                      </div>

                      <ProgressBar value={report.analytics.grammar} label="Grammar" color="bg-purple-500" size="sm" />
                      <ProgressBar value={report.analytics.keywordMatch} label="Keyword Match" color="bg-amber-500" size="sm" />
                      <ProgressBar value={report.analytics.similarity} label="Similarity" color="bg-blue-500" size="sm" />
                    </div>
                  </div>
                </div>

                {/* Question-wise Breakdown */}
                {state.evaluationResult?.questionBreakdown?.length > 0 && (
                  <div className="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-500" /> Itemized Question Breakdown
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-slate-900 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-700">
                            <th className="p-2">Q.No</th>
                            <th className="p-2">Question Title</th>
                            <th className="p-2 text-center">Marks</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2">AI Feedback</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
                          {state.evaluationResult.questionBreakdown.map((q) => (
                            <tr key={q.id}>
                              <td className="p-2 font-bold font-mono">{q.qNo}</td>
                              <td className="p-2 font-medium">{q.title}</td>
                              <td className="p-2 text-center font-bold">{q.marksObtained} / {q.maxMarks}</td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  q.status === 'Correct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                  q.status === 'Partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                }`}>
                                  {q.status}
                                </span>
                              </td>
                              <td className="p-2 text-gray-500 dark:text-gray-400 italic">{q.feedback}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
