import { User, BookOpen, Hash, Layers, GraduationCap, Building2, Library } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function StudentInfoCard() {
  const { state, dispatch } = useAppContext();
  const studentInfo = state.studentInfo || {
    name: '',
    rollNo: '',
    className: '',
    division: '',
    collegeName: '',
    subject: '',
  };

  const handleChange = (field, value) => {
    dispatch({
      type: 'SET_STUDENT_INFO',
      payload: { [field]: value },
    });
  };

  const handleSelectStudent = (studentId) => {
    if (!studentId) return;
    const selected = state.students.find((s) => s.id === Number(studentId));
    if (selected) {
      const collegeObj = state.colleges?.find(c => c.id === selected.collegeId);
      dispatch({
        type: 'SET_STUDENT_INFO',
        payload: {
          name: selected.name || '',
          rollNo: selected.rollNo || '',
          className: selected.year || selected.department || '',
          division: selected.division || '',
          collegeName: collegeObj?.name || studentInfo.collegeName || '',
          subject: studentInfo.subject || 'History & Social Studies',
        },
      });
    }
  };

  // Filter Quick Pick students strictly by selected college if chosen
  const selectedCollegeObj = state.colleges?.find(c => c.name === studentInfo.collegeName);
  const availableStudents = (studentInfo.collegeName && selectedCollegeObj)
    ? state.students?.filter(s => String(s.collegeId) === String(selectedCollegeObj.id))
    : state.students;

  const handleAutoFill = () => {
    dispatch({
      type: 'SET_STUDENT_INFO',
      payload: {
        name: 'Rohan Mungase',
        rollNo: '20250829',
        className: '10th (SSC)',
        division: 'Division A',
        collegeName: 'MIT College',
        subject: 'SCIENCE',
      },
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm mb-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-light border border-primary/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Student & Exam Details
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                Pre-Filled Before Upload
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Fill student name, roll no, division, college, and subject before uploading answer sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleAutoFill}
            className="text-xs px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-semibold border border-primary/20 transition-all flex items-center gap-1.5"
          >
            ⚡ Auto-Fill Rohan Details
          </button>

          {/* Preset quick selector from enrolled students */}
          {availableStudents?.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                Quick Pick:
              </span>
              <select
                onChange={(e) => handleSelectStudent(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                value=""
              >
                <option value="" disabled>Select Student Roster...</option>
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rollNo} - Div {s.division})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Student Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-primary" />
            Student Name
          </label>
          <input
            type="text"
            placeholder="e.g. Aarav Sharma"
            value={studentInfo.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/60 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 font-medium"
          />
        </div>

        {/* Roll No */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-primary" />
            Roll No
          </label>
          <input
            type="text"
            placeholder="e.g. 202301002"
            value={studentInfo.rollNo || ''}
            onChange={(e) => handleChange('rollNo', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/60 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 font-medium"
          />
        </div>

        {/* Division */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Division
          </label>
          <input
            type="text"
            placeholder="e.g. Division A"
            value={studentInfo.division || ''}
            onChange={(e) => handleChange('division', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/60 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 font-medium"
          />
        </div>

        {/* College Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            College Name
          </label>
          <select
            value={studentInfo.collegeName || ''}
            onChange={(e) => handleChange('collegeName', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/60 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
          >
            <option value="">-- Choose College --</option>
            {state.colleges?.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
            <Library className="w-3.5 h-3.5 text-primary" />
            Subject
          </label>
          <input
            type="text"
            placeholder="e.g. History & Social Studies"
            value={studentInfo.subject || ''}
            onChange={(e) => handleChange('subject', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/60 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 font-medium"
          />
        </div>

        {/* Class / Department */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            Class / Year
          </label>
          <input
            type="text"
            placeholder="e.g. FY B.Tech / Class 10"
            value={studentInfo.className || ''}
            onChange={(e) => handleChange('className', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/60 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-gray-400 font-medium"
          />
        </div>
      </div>
    </div>
  );
}
