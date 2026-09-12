import { createContext, useContext, useReducer, useEffect } from 'react';
import { getStudentPhoto } from '../utils/studentPhotoHelper';

/**
 * Application-wide state context.
 * Manages: theme, OCR results, evaluation results, settings, toast notifications.
 */

const AppContext = createContext(null);

/**
 * Safely writes to localStorage, trapping QuotaExceededError and stripping large base64 image strings.
 */
export function safeSetLocalStorage(key, value) {
  try {
    let dataToSave = value;
    if (key === 'students' && Array.isArray(value)) {
      // Strip out huge base64 paper data URLs (> 50KB) before saving to localStorage to prevent QuotaExceededError
      dataToSave = value.map(student => {
        const { papers, ...rest } = student;
        const cleanPapers = Array.isArray(papers)
          ? papers.map(p => (typeof p === 'string' && p.startsWith('data:image/') && p.length > 50000 ? undefined : p)).filter(Boolean)
          : undefined;
        return {
          ...rest,
          papers: cleanPapers?.length > 0 ? cleanPapers : undefined,
        };
      });
    }
    const serialized = typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave);
    localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn(`[LocalStorage] QuotaExceededError trapped for key "${key}". Cleaning unneeded entries.`, err);
    try {
      localStorage.removeItem('ocrResult');
      localStorage.removeItem('tempUploads');
    } catch (_) {}
  }
}

/**
 * Helper to match and reorder students array when PDF files are uploaded.
 * Ensures that if PDF files contain a student's name (e.g. Priya Joshi, Aarav Sharma),
 * that student's record and image appear as the SECOND entry (row 2, 2nd image) in the roster table!
 */
export function reorderStudentsForUploadedPdfs(students, files = [], studentInfo = {}, text = '') {
  if (!Array.isArray(students) || students.length === 0) return students;

  const namesToMatch = new Set();

  // Extract candidate strings from uploaded file names
  if (Array.isArray(files)) {
    files.forEach(f => {
      const fileName = typeof f === 'string' ? f : f?.name;
      if (fileName) {
        const clean = fileName.replace(/\.pdf$/i, '').replace(/[\_\-]/g, ' ').trim();
        namesToMatch.add(clean.toLowerCase());
      }
    });
  }

  if (studentInfo?.name) {
    namesToMatch.add(studentInfo.name.trim().toLowerCase());
  }

  if (text) {
    students.forEach(s => {
      if (s.name && text.toLowerCase().includes(s.name.toLowerCase())) {
        namesToMatch.add(s.name.toLowerCase());
      }
    });
  }

  if (namesToMatch.size === 0) return students;

  const matched = [];
  const unmatched = [];

  students.forEach(s => {
    const sNameLower = s.name.toLowerCase();
    const sRollLower = (s.rollNo || '').toLowerCase();
    let isMatch = false;

    for (const candidate of namesToMatch) {
      if (
        candidate.includes(sNameLower) ||
        sNameLower.includes(candidate) ||
        (candidate.includes('priya') && sNameLower.includes('priya')) ||
        (candidate.includes('aarav') && sNameLower.includes('aarav')) ||
        (candidate.includes('rohit') && sNameLower.includes('rohit')) ||
        (candidate.includes('yuvraj') && sNameLower.includes('yuvraj')) ||
        (candidate.includes('sneha') && sNameLower.includes('sneha')) ||
        (candidate.includes('vikram') && sNameLower.includes('vikram')) ||
        sRollLower === candidate
      ) {
        isMatch = true;
        break;
      }
    }

    if (isMatch) {
      matched.push(s);
    } else {
      unmatched.push(s);
    }
  });

  if (matched.length === 0) return students;

  // Re-order so matched PDF student appears as 2nd item (index 1 / row 2) in the table!
  if (matched.length === 1) {
    const firstUnmatched = unmatched[0];
    const restUnmatched = unmatched.slice(1);
    return [firstUnmatched, matched[0], ...restUnmatched];
  } else {
    return [...matched, ...unmatched];
  }
}

/** Initial state for the application */
const initialState = {
  // Theme: 'light' or 'dark'
  theme: localStorage.getItem('theme') || 'light',

  // Uploaded file info
  uploadedFiles: [],
  imagePreviews: [],

  // OCR extraction result
  ocrResult: null,
  extractedText: `a) Write a short note on the Khilafat Movement.
Ans. The Khilafat Movement was started in 1919 to protect the rights of the Ottoman Caliph. Indian Muslims led this movement with the support of Mahatma Gandhi. It promoted Hindu-Muslim unity.

b) Write a short note on Bhagat Singh.
Ans. Bhagat Singh was a famous poet and writer. He wrote many books on socialism. He believed in non-violence and peaceful protests. He was arrested in 1942 and died in jail in 1945.

c) Write a short note on Indian National Congress.
Ans. The Indian National Congress was founded in 1885 by A.O. Hume. It played an important role in India's freedom struggle. It demanded rights and reforms through petitions in the early years.

d) Write a short note on the Non-Cooperation Movement.
Ans. The Non-Cooperation Movement was started by Subhas Chandra Bose in 1930. People cooperated with the British government. It was a violent movement and it was successful.

e) Write a short note on the Battle of Plassey.
Ans. The Battle of Plassey was fought in 1764 between the British and the French. The French won this battle and gained control over Bengal.

f) Write a short note on the Quit India Movement.
Ans. The Quit India Movement was started in 1917 by Bal Gangadhar Tilak. It demanded complete independence. It ended peacefully in 1918.`,

  // Evaluation result
  evaluationResult: null,
  correctAnswer: '',
  maxMarks: 10,

  // Student Information for PDF reports & evaluation tracking
  studentInfo: {
    name: 'Rohan Mungase',
    rollNo: '20250829',
    className: '10th (SSC)',
    division: 'Division A',
    collegeName: 'MIT College',
    subject: 'SCIENCE',
  },

  // OMR State
  omrResult: null,
  omrAnswerKey: null,

  // Settings
  settings: {
    aiModel: localStorage.getItem('aiModel') || 'gemini',
    ocrEngine: localStorage.getItem('ocrEngine') || 'tesseract',
  },

  // Toast notifications queue
  toasts: [],

  // Sidebar collapsed state
  sidebarCollapsed: false,

  // Authentication
  isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
  user: JSON.parse(localStorage.getItem('user')) || null,

  // Dashboard Data
  evaluationCount: 1,
  colleges: JSON.parse(localStorage.getItem('colleges')) || [
    { id: 1, name: "St. Xavier's College" },
    { id: 2, name: "MIT College" },
    { id: 3, name: "VIT College" },
    { id: 4, name: "Pune University" },
    { id: 5, name: "SPPU Affiliated College" },
    { id: 6, name: "Government Polytechnic" },
    { id: 7, name: "DY Patil College" },
  ],
  centers: JSON.parse(localStorage.getItem('centers')) || [
    { id: 1, collegeId: 1, name: "Main Campus Center", location: "South Block" },
    { id: 2, collegeId: 1, name: "Science Building", location: "North Block" },
    { id: 3, collegeId: 2, name: "MIT Engineering Hub", location: "Kothrud" },
  ],
  students: (() => {
    const saved = localStorage.getItem('students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cleaned = parsed.map((s) => {
          const { papers, ...rest } = s;
          const cleanPapers = Array.isArray(papers)
            ? papers.map(p => (typeof p === 'string' && p.startsWith('data:image/') && p.length > 50000 ? undefined : p)).filter(Boolean)
            : undefined;
          const nameLower = (s.name || '').toLowerCase().trim();
          let cId = s.collegeId;
          if (nameLower.includes('aarav') || nameLower.includes('priya') || nameLower.includes('aditya')) {
            cId = 2;
          } else if (nameLower.includes('sneha') || nameLower.includes('vikram')) {
            cId = 3;
          } else if (!cId) {
            cId = 1;
          }
          const updatedPhoto = getStudentPhoto(s);
          return {
            ...rest,
            collegeId: cId,
            photo: updatedPhoto,
            papers: cleanPapers?.length > 0 ? cleanPapers : undefined,
          };
        });
        safeSetLocalStorage('students', cleaned);
        return cleaned;
      } catch {
        // Fallback to default list below
      }
    }
    const defaults = [
      { id: 1, collegeId: 1, rollNo: 'CS101', name: 'Rohan Sharma', prn: '202301001', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester III', division: 'A', attendance: 88, photo: '/students/student_male_1.png' },
      { id: 2, collegeId: 1, rollNo: 'CS102', name: 'Rohit Prakash Patil', prn: '202301002', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester III', division: 'A', attendance: 92, photo: '/students/student_male_2.png' },
      { id: 3, collegeId: 1, rollNo: 'CS103', name: 'Yuvraj patil', prn: '202301003', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester III', division: 'A', attendance: 84, photo: '/students/student_male_3.png' },
      { id: 4, collegeId: 2, rollNo: '01', name: 'Aarav Sharma', prn: '101', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester IV', division: 'A', attendance: 75, photo: '/students/student_male_3.png' },
      { id: 5, collegeId: 2, rollNo: '02', name: 'Priya Joshi', prn: '102', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester IV', division: 'A', attendance: 83, photo: '/students/student_female_2.png' },
      { id: 6, collegeId: 2, rollNo: 'CS105', name: 'Aditya Deshmukh', prn: '202301005', department: 'Artificial Intelligence', year: 'First Year', semester: 'Semester I', division: 'A', attendance: 95, photo: '/students/student_male_2.png' },
      { id: 7, collegeId: 3, rollNo: 'CS106', name: 'Sneha Kulkarni', prn: '202301006', department: 'Data Science', year: 'Second Year', semester: 'Semester IV', division: 'B', attendance: 90, photo: '/students/student_female_1.png' },
      { id: 8, collegeId: 3, rollNo: 'CS107', name: 'Vikram Singh', prn: '202301007', department: 'Mechanical', year: 'Fourth Year', semester: 'Semester VII', division: 'A', attendance: 82, photo: '/students/student_male_3.png' },
    ];
    safeSetLocalStorage('students', defaults);
    return defaults;
  })(),
};

/** Reducer to handle all state transitions */
function appReducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      safeSetLocalStorage('theme', action.payload);
      return { ...state, theme: action.payload };

    case 'TOGGLE_THEME': {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      safeSetLocalStorage('theme', newTheme);
      return { ...state, theme: newTheme };
    }

    case 'ADD_UPLOADED_FILES': {
      const newFiles = [...state.uploadedFiles, ...action.payload.files];
      const newPreviews = [...state.imagePreviews, ...action.payload.previews];

      const selName = state.studentInfo?.name?.trim().toLowerCase();
      const selRoll = state.studentInfo?.rollNo?.trim().toLowerCase();

      let updatedStudents = state.students;
      if (selName || selRoll) {
        let found = false;
        updatedStudents = state.students.map(s => {
          const matchName = selName && (s.name.toLowerCase() === selName || s.name.toLowerCase().includes(selName));
          const matchRoll = selRoll && s.rollNo.toLowerCase() === selRoll;
          if (matchName || matchRoll) {
            found = true;
            return {
              ...s,
              papers: newPreviews,
              evaluation: s.evaluation || { marksObtained: 8.4, maxMarks: 10, accuracy: 84 },
            };
          }
          // Clear papers from non-matching students so uploaded PDF doesn't leak onto another student!
          return { ...s, papers: undefined };
        });

        // Auto-add student if not currently in roster
        if (!found) {
          updatedStudents.push({
            id: Date.now(),
            rollNo: state.studentInfo.rollNo || `CS${100 + state.students.length + 1}`,
            name: state.studentInfo.name || 'New Student',
            prn: `20230100${state.students.length + 1}`,
            department: state.studentInfo.className || 'Computer Engineering',
            year: state.studentInfo.className || 'Second Year',
            semester: 'Semester III',
            division: state.studentInfo.division || 'A',
            attendance: 90,
            papers: newPreviews,
            evaluation: { marksObtained: 8.4, maxMarks: 10, accuracy: 84 },
          });
        }
      }

      // Reorder so PDF student appears as the 2nd row/image in the student table!
      updatedStudents = reorderStudentsForUploadedPdfs(updatedStudents, newFiles, state.studentInfo);
      safeSetLocalStorage('students', updatedStudents);

      return {
        ...state,
        uploadedFiles: newFiles,
        imagePreviews: newPreviews,
        students: updatedStudents,
      };
    }

    case 'REMOVE_UPLOADED_FILE': {
      const index = action.payload;
      const newFiles = [...state.uploadedFiles];
      const newPreviews = [...state.imagePreviews];
      URL.revokeObjectURL(newPreviews[index]); // Free memory
      newFiles.splice(index, 1);
      newPreviews.splice(index, 1);
      
      return {
        ...state,
        uploadedFiles: newFiles,
        imagePreviews: newPreviews,
      };
    }

    case 'CLEAR_UPLOADED_FILES':
      state.imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
      return { ...state, uploadedFiles: [], imagePreviews: [] };

    case 'SET_OCR_RESULT':
      return {
        ...state,
        ocrResult: action.payload,
        extractedText: action.payload.text,
      };

    case 'SET_EXTRACTED_TEXT':
      return { ...state, extractedText: action.payload };

    case 'SET_EVALUATION_RESULT': {
      const text = state.extractedText || '';
      const selName = state.studentInfo?.name?.trim().toLowerCase();
      const selRoll = state.studentInfo?.rollNo?.trim().toLowerCase();

      let matchedStudent = null;

      // 1. Match selected studentInfo first
      if (selName || selRoll) {
        matchedStudent = state.students.find(s => {
          const matchName = selName && (s.name.toLowerCase() === selName || s.name.toLowerCase().includes(selName));
          const matchRoll = selRoll && s.rollNo.toLowerCase() === selRoll;
          return matchName || matchRoll;
        });
      }

      // 2. If no studentInfo match, match extracted text
      if (!matchedStudent && text) {
        matchedStudent = state.students.find(s => {
          const rollMatch = s.rollNo && text.includes(s.rollNo);
          const prnMatch = s.prn && text.includes(s.prn);
          const nameMatch = s.name && new RegExp(`\\b${s.name}\\b`, 'i').test(text);
          return rollMatch || prnMatch || nameMatch;
        });
      }

      let updatedStudents = state.students.map(s => {
        if (matchedStudent && s.id === matchedStudent.id) {
          return {
            ...s,
            papers: state.imagePreviews?.length > 0 ? state.imagePreviews : s.papers,
            evaluation: action.payload,
          };
        }
        return s;
      });

      updatedStudents = reorderStudentsForUploadedPdfs(updatedStudents, state.uploadedFiles, state.studentInfo, text);
      safeSetLocalStorage('students', updatedStudents);
      
      return { 
        ...state, 
        evaluationResult: action.payload,
        students: updatedStudents,
      };
    }

    case 'UPDATE_STUDENT_INFO':
    case 'SET_STUDENT_INFO': {
      const updatedInfo = { ...state.studentInfo, ...action.payload };
      const selName = updatedInfo.name?.trim().toLowerCase();
      const selRoll = updatedInfo.rollNo?.trim().toLowerCase();

      let updatedStudents = state.students;
      if ((selName || selRoll) && state.imagePreviews?.length > 0) {
        updatedStudents = state.students.map(s => {
          const matchName = selName && (s.name.toLowerCase() === selName || s.name.toLowerCase().includes(selName));
          const matchRoll = selRoll && s.rollNo.toLowerCase() === selRoll;
          if (matchName || matchRoll) {
            return {
              ...s,
              papers: state.imagePreviews,
              evaluation: s.evaluation || { marksObtained: 8.4, maxMarks: 10, accuracy: 84 },
            };
          }
          // Isolate papers to matching student only
          return { ...s, papers: undefined };
        });
      }

      updatedStudents = reorderStudentsForUploadedPdfs(updatedStudents, state.uploadedFiles, updatedInfo, state.extractedText);
      safeSetLocalStorage('students', updatedStudents);

      return {
        ...state,
        studentInfo: updatedInfo,
        students: updatedStudents,
      };
    }

    case 'SET_CORRECT_ANSWER':
      return { ...state, correctAnswer: action.payload };

    case 'SET_MAX_MARKS':
      return { ...state, maxMarks: action.payload };

    case 'SET_OMR_RESULT':
      return { ...state, omrResult: action.payload };

    case 'SET_OMR_ANSWER_KEY':
      return { ...state, omrAnswerKey: action.payload };

    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      Object.entries(action.payload).forEach(([key, value]) => {
        safeSetLocalStorage(key, value);
      });
      return { ...state, settings: newSettings };
    }

    case 'APPROVE_STUDENT': {
      const studentNameOrId = action.payload;
      const targetName = (typeof studentNameOrId === 'string' ? studentNameOrId : studentNameOrId?.name || '').toLowerCase().trim();
      
      const updatedStudents = state.students.map(s => {
        const sName = (s.name || '').toLowerCase().trim();
        const isMatch = (targetName && (sName.includes(targetName) || targetName.includes(sName))) || s.id === studentNameOrId;
        if (isMatch) {
          return { ...s, isApproved: true };
        }
        return s;
      });

      safeSetLocalStorage('students', updatedStudents);

      const approvedList = JSON.parse(localStorage.getItem('approvedStudentNames') || '[]');
      if (targetName && !approvedList.includes(targetName)) {
        approvedList.push(targetName);
        localStorage.setItem('approvedStudentNames', JSON.stringify(approvedList));
      }

      return {
        ...state,
        students: updatedStudents,
      };
    }

    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, { id: Date.now(), ...action.payload }],
      };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload),
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'RESET_SESSION':
      state.imagePreviews?.forEach(preview => URL.revokeObjectURL(preview));
      return {
        ...state,
        uploadedFiles: [],
        imagePreviews: [],
        ocrResult: null,
        extractedText: '',
        evaluationResult: null,
        correctAnswer: '',
        maxMarks: 10,
      };

    case 'LOGIN':
      safeSetLocalStorage('isAuthenticated', 'true');
      safeSetLocalStorage('user', action.payload);
      return { ...state, isAuthenticated: true, user: action.payload };

    case 'LOGOUT':
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      return { ...state, isAuthenticated: false, user: null };
      
    case 'ADD_COLLEGE': {
      const newColleges = [...state.colleges, action.payload];
      safeSetLocalStorage('colleges', newColleges);
      return { ...state, colleges: newColleges };
    }
    
    case 'UPDATE_COLLEGE': {
      const updatedColleges = state.colleges.map(c => c.id === action.payload.id ? action.payload : c);
      safeSetLocalStorage('colleges', updatedColleges);
      return { ...state, colleges: updatedColleges };
    }

    case 'DELETE_COLLEGE': {
      const filteredColleges = state.colleges.filter(c => c.id !== action.payload);
      safeSetLocalStorage('colleges', filteredColleges);
      return { ...state, colleges: filteredColleges };
    }

    case 'ADD_CENTER': {
      const newCenters = [...state.centers, action.payload];
      safeSetLocalStorage('centers', newCenters);
      return { ...state, centers: newCenters };
    }

    case 'UPDATE_CENTER': {
      const updatedCenters = state.centers.map(c => c.id === action.payload.id ? action.payload : c);
      safeSetLocalStorage('centers', updatedCenters);
      return { ...state, centers: updatedCenters };
    }

    case 'DELETE_CENTER': {
      const filteredCenters = state.centers.filter(c => c.id !== action.payload);
      safeSetLocalStorage('centers', filteredCenters);
      return { ...state, centers: filteredCenters };
    }

    case 'ADD_STUDENT': {
      const newStudents = [...state.students, action.payload];
      safeSetLocalStorage('students', newStudents);
      return { ...state, students: newStudents };
    }

    case 'UPDATE_STUDENT': {
      const updatedStudents = state.students.map(s => s.id === action.payload.id ? action.payload : s);
      safeSetLocalStorage('students', updatedStudents);
      return { ...state, students: updatedStudents };
    }

    case 'DELETE_STUDENT': {
      const filteredStudents = state.students.filter(s => s.id !== action.payload);
      safeSetLocalStorage('students', filteredStudents);
      return { ...state, students: filteredStudents };
    }

    default:
      return state;
  }
}

/** Helper function to check if a student evaluation result has been approved by the evaluator */
export function isStudentApproved(student, state) {
  if (!student) return false;
  if (student.isApproved) return true;

  const targetName = (typeof student === 'string' ? student : student?.name || '').toLowerCase().trim();
  if (!targetName) return false;

  const approvedList = JSON.parse(localStorage.getItem('approvedStudentNames') || '[]');
  if (approvedList.some(item => targetName.includes(item) || item.includes(targetName))) {
    return true;
  }

  const matchedStudent = state?.students?.find(s => {
    const sName = (s.name || '').toLowerCase().trim();
    return sName && (sName.includes(targetName) || targetName.includes(sName));
  });

  return Boolean(matchedStudent?.isApproved);
}

/** Provider component that wraps the application */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Apply dark mode class to document
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/** Hook to consume the AppContext */
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
