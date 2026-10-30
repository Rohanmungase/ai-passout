import { useState } from 'react';
import { 
  MapPin, Building2, GraduationCap, Layers, Calendar, Hash, 
  User, CheckCircle2, ChevronRight, Zap, Filter, Award
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// State <-> District cascading data map
export const DISTRICTS_MAP = {
  'Maharashtra': ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Chhatrapati Sambhajinagar', 'Thane', 'Kolhapur'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru'],
  'Delhi': ['Central Delhi', 'South Delhi', 'North Delhi', 'New Delhi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Noida']
};

export default function StudentInfoCard() {
  const { state, dispatch } = useAppContext();
  const districtsMap = DISTRICTS_MAP;

  const studentInfo = state.studentInfo || {
    state: '',
    district: '',
    center: '',
    collegeName: '',
    standard: '',
    className: '',
    division: '',
    batch: '',
    rollNo: '',
    name: '',
    subject: '',
  };

  const currentStates = Object.keys(districtsMap);
  const currentDistricts = studentInfo.state 
    ? (districtsMap[studentInfo.state] || []) 
    : Array.from(new Set(Object.values(districtsMap).flat()));

  const centersList = [
    'Kothrud',
    'Shivaji Nagar',
    'Dhankawadi',
    'Bibwewadi',
    'FC Road (Deccan)',
    'Akurdi',
    'Viman Nagar',
    'Hinjewadi',
    'Hadapsar',
    'Swargate',
    'Kondhwa',
    'Pimpri-Chinchwad',
    'Kalyani Nagar',
    'Warje',
    'Karve Nagar',
    'Model Colony',
    'Ganeshkhind',
    'Katraj',
    'Baner',
    'Wakad',
    'Bawdhan',
    'Camp'
  ];

  const standardsList = [
    '10th (SSC)',
    '12th (HSC)',
    'First Year (FE)',
    'Second Year (SE)',
    'Third Year (TE)',
    'Final Year (BE/B.Tech)'
  ];

  const divisionsList = [
    'Division A',
    'Division B',
    'Division C',
    'Division D'
  ];

  const batchesList = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
    .flatMap(letter => [1, 2, 3, 4].map(num => `${letter}-${num}`));

  const handleChange = (field, value) => {
    const payload = { [field]: value };
    
    // Auto cascade district if state changes
    if (field === 'state') {
      const availDistricts = districtsMap[value] || [];
      payload.district = availDistricts[0] || '';
    }

    // Keep standard and className synced
    if (field === 'standard') {
      payload.className = value;
    }

    dispatch({
      type: 'SET_STUDENT_INFO',
      payload,
    });
  };

  const handleAutoFillDefault = () => {
    dispatch({
      type: 'SET_STUDENT_INFO',
      payload: {
        state: 'Maharashtra',
        district: 'Pune',
        center: 'Kothrud',
        collegeName: 'MIT College',
        standard: '10th (SSC)',
        className: '10th (SSC)',
        division: 'Division A',
        batch: 'B-1',
        rollNo: '20250829',
        name: 'Student User',
        subject: 'SCIENCE',
      },
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800/95 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-md backdrop-blur-sm transition-all space-y-5">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-700/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Institutional & Candidate Hierarchy
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                Sequential Filter Hierarchy
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Select State ➔ District ➔ Center ➔ College ➔ Standard ➔ Division ➔ Batch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleAutoFillDefault}
            className="text-xs px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-bold border border-primary/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-primary" />
            Auto-Fill Defaults
          </button>
        </div>
      </div>

      {/* Sequential Hierarchy Selectors Grid (7 Fields) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. STATE */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            1. State
          </label>
          <select
            value={studentInfo.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">-- Select State --</option>
            {currentStates.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* 2. DISTRICT */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            2. District
          </label>
          <select
            value={studentInfo.district || ''}
            onChange={(e) => handleChange('district', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">-- Select District --</option>
            {currentDistricts.map((dst) => (
              <option key={dst} value={dst}>{dst}</option>
            ))}
          </select>
        </div>

        {/* 3. CENTER */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
            3. Examination Center
          </label>
          <select
            value={studentInfo.center || ''}
            onChange={(e) => handleChange('center', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">-- Select Center --</option>
            {centersList.map((cnt) => (
              <option key={cnt} value={cnt}>{cnt}</option>
            ))}
          </select>
        </div>

        {/* 4. COLLEGE */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
            4. College Name
          </label>
          <select
            value={studentInfo.collegeName || ''}
            onChange={(e) => handleChange('collegeName', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">-- Select College --</option>
            {state.colleges?.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 5. STANDARD */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
            5. Standard / Class
          </label>
          <select
            value={studentInfo.standard || studentInfo.className || ''}
            onChange={(e) => handleChange('standard', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">-- Select Standard --</option>
            {standardsList.map((std) => (
              <option key={std} value={std}>{std}</option>
            ))}
          </select>
        </div>

        {/* 6. DIVISION */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
            6. Division
          </label>
          <select
            value={studentInfo.division || ''}
            onChange={(e) => handleChange('division', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">-- Select Division --</option>
            {divisionsList.map((div) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        {/* 7. BATCH */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-pink-500" />
            7. Batch
          </label>
          <select
            value={studentInfo.batch || ''}
            onChange={(e) => handleChange('batch', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          >
            <option value="">-- Select Batch --</option>
            {batchesList.map((bt) => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Selected Route Breadcrumb Summary */}
      <div className="p-3 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs font-mono flex flex-wrap items-center gap-2 shadow-inner">
        <span className="text-slate-400 font-sans font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active Context:
        </span>
        {studentInfo.state && <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-bold">{studentInfo.state}</span>}
        {studentInfo.district && <><ChevronRight className="w-3 h-3 text-slate-600" /><span className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded font-bold">{studentInfo.district}</span></>}
        {studentInfo.center && <><ChevronRight className="w-3 h-3 text-slate-600" /><span className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-bold">{studentInfo.center}</span></>}
        {studentInfo.collegeName && <><ChevronRight className="w-3 h-3 text-slate-600" /><span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-bold">{studentInfo.collegeName}</span></>}
        {studentInfo.standard && <><ChevronRight className="w-3 h-3 text-slate-600" /><span className="bg-slate-800 text-purple-300 px-2 py-0.5 rounded font-bold">{studentInfo.standard}</span></>}
        {studentInfo.division && <><ChevronRight className="w-3 h-3 text-slate-600" /><span className="bg-slate-800 text-cyan-300 px-2 py-0.5 rounded font-bold">{studentInfo.division}</span></>}
        {studentInfo.batch && <><ChevronRight className="w-3 h-3 text-slate-600" /><span className="bg-slate-800 text-pink-300 px-2 py-0.5 rounded font-bold">{studentInfo.batch}</span></>}
        {!studentInfo.state && !studentInfo.district && !studentInfo.center && !studentInfo.collegeName && !studentInfo.standard && !studentInfo.division && !studentInfo.batch && (
          <span className="text-slate-500 italic">No filters selected yet. Choose options above or click "Auto-Fill Defaults".</span>
        )}
      </div>
    </div>
  );
}
