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
      
      // If it's savedAnswerKeys, strip previewUrl and try logging again!
      if (key === 'savedAnswerKeys' && Array.isArray(value)) {
         const stripped = value.map(k => ({ ...k, previewUrl: undefined }));
         localStorage.setItem(key, JSON.stringify(stripped));
         console.warn('Saved Answer Keys without PDF previews due to storage limits.');
      }
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

export const DEFAULT_SAVED_ANSWER_KEYS = [];

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
  studentInfo: (() => {
    try {
      const saved = localStorage.getItem('studentInfo');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            state: parsed.state || localStorage.getItem('selectedState') || 'Maharashtra',
            district: parsed.district || localStorage.getItem('selectedDistrict') || 'Pune',
            center: parsed.center || '',
            collegeName: parsed.collegeName || '',
            standard: parsed.standard || '',
            className: parsed.className || '',
            division: parsed.division || '',
            batch: parsed.batch || '',
            rollNo: parsed.rollNo || '',
            name: parsed.name || '',
            subject: parsed.subject || '',
          };
        }
      }
    } catch {}
    return {
      state: localStorage.getItem('selectedState') || 'Maharashtra',
      district: localStorage.getItem('selectedDistrict') || 'Pune',
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
  })(),

  // OMR State & Teacher Saved Answer Keys Repository
  omrResult: null,
  omrAnswerKey: null,
  savedAnswerKeys: (() => {
    try {
      const saved = localStorage.getItem('savedAnswerKeys');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out demo keys if present
          return parsed.filter(k => !['key-dbms-a', 'key-ml-b', 'key-cn-c', 'key-math-d'].includes(k.id));
        }
      }
    } catch {}
    return [];
  })(),

  // Settings
  settings: {
    aiModel: localStorage.getItem('aiModel') || 'gemini',
    ocrEngine: localStorage.getItem('ocrEngine') || 'tesseract',
    strictnessMode: localStorage.getItem('strictnessMode') || 'standard',
    icrMode: localStorage.getItem('icrMode') || 'neural',
    anonymousMode: localStorage.getItem('anonymousMode') === 'true',
    autoExportPdf: localStorage.getItem('autoExportPdf') === 'true',
    confidenceThreshold: localStorage.getItem('confidenceThreshold') || '75',
    autoRegrade: localStorage.getItem('autoRegrade') !== 'false',
    stepCredit: localStorage.getItem('stepCredit') !== 'false',
    soundFeedback: localStorage.getItem('soundFeedback') !== 'false',
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
  colleges: (() => {
    const defaultColleges = [
      // MAHARASHTRA - PUNE
      { id: 2, name: "MIT College", code: "MIT", state: "Maharashtra", district: "Pune", location: "Kothrud, Pune", centersCount: 4, studentsCount: 2, subjectsCount: 16, examsCount: 36, defaultDept: "Computer Engineering", defaultSubject: "DBMS", avgScore: 82.1, passRate: 94.5 },
      { id: 3, name: "VIT College", code: "VIT", state: "Maharashtra", district: "Pune", location: "Bibwewadi, Pune", centersCount: 3, studentsCount: 2, subjectsCount: 12, examsCount: 28, defaultDept: "Data Science", defaultSubject: "Machine Learning", avgScore: 76.5, passRate: 91.2 },
      { id: 4, name: "Pune University", code: "SPPU", state: "Maharashtra", district: "Pune", location: "Ganeshkhind, Pune", centersCount: 6, studentsCount: 2, subjectsCount: 20, examsCount: 45, defaultDept: "Computer Engineering", defaultSubject: "Computer Networks", avgScore: 74.0, passRate: 88.7 },
      { id: 5, name: "SPPU Affiliated College", code: "SAC", state: "Maharashtra", district: "Pune", location: "Shivajinagar, Pune", centersCount: 3, studentsCount: 2, subjectsCount: 10, examsCount: 22, defaultDept: "Information Technology", defaultSubject: "Web Technology", avgScore: 72.8, passRate: 86.4 },
      { id: 6, name: "Government Polytechnic", code: "GPP", state: "Maharashtra", district: "Pune", location: "Model Colony, Pune", centersCount: 3, studentsCount: 2, subjectsCount: 9, examsCount: 18, defaultDept: "Electronics", defaultSubject: "Data Structures", avgScore: 71.5, passRate: 85.0 },
      { id: 7, name: "DY Patil College", code: "DYP", state: "Maharashtra", district: "Pune", location: "Akurdi, Pune", centersCount: 4, studentsCount: 2, subjectsCount: 13, examsCount: 30, defaultDept: "Artificial Intelligence", defaultSubject: "Software Engineering", avgScore: 75.9, passRate: 90.1 },
      { id: 8, name: "COEP Technological University", code: "COEP", state: "Maharashtra", district: "Pune", location: "Shivajinagar, Pune", centersCount: 5, studentsCount: 2, subjectsCount: 18, examsCount: 40, defaultDept: "Computer Engineering", defaultSubject: "Operating System", avgScore: 85.2, passRate: 97.8 },
      { id: 9, name: "Symbiosis Institute of Tech", code: "SIT", state: "Maharashtra", district: "Pune", location: "Lavale, Pune", centersCount: 4, studentsCount: 2, subjectsCount: 12, examsCount: 26, defaultDept: "Data Science", defaultSubject: "Machine Learning", avgScore: 80.6, passRate: 93.4 },
      { id: 10, name: "Fergusson College", code: "FC", state: "Maharashtra", district: "Pune", location: "FC Road, Pune", centersCount: 3, studentsCount: 2, subjectsCount: 11, examsCount: 24, defaultDept: "Computer Engineering", defaultSubject: "Data Structures", avgScore: 77.3, passRate: 92.0 },
      { id: 11, name: "Modern College of Engineering", code: "MCOE", state: "Maharashtra", district: "Pune", location: "Off FC Road, Pune", centersCount: 3, studentsCount: 2, subjectsCount: 10, examsCount: 20, defaultDept: "Information Technology", defaultSubject: "Web Technology", avgScore: 73.1, passRate: 87.6 },
      { id: 12, name: "PICT Pune", code: "PICT", state: "Maharashtra", district: "Pune", location: "Dhankawadi, Pune", centersCount: 2, studentsCount: 2, subjectsCount: 14, examsCount: 34, defaultDept: "Computer Engineering", defaultSubject: "DBMS", avgScore: 84.7, passRate: 96.9 },

      // MAHARASHTRA - MUMBAI
      { id: 1, name: "St. Xavier's College", code: "SXC", state: "Maharashtra", district: "Mumbai", location: "South Mumbai", centersCount: 5, studentsCount: 2, subjectsCount: 14, examsCount: 32, defaultDept: "Computer Engineering", defaultSubject: "Operating System", avgScore: 78.4, passRate: 92.5 },
      { id: 13, name: "VJTI Mumbai", code: "VJTI", state: "Maharashtra", district: "Mumbai", location: "Matunga, Mumbai", centersCount: 4, studentsCount: 2, subjectsCount: 18, examsCount: 42, defaultDept: "Electrical Engineering", defaultSubject: "Control Systems", avgScore: 86.1, passRate: 98.2 },
      { id: 14, name: "K.J. Somaiya College", code: "KJSCE", state: "Maharashtra", district: "Mumbai", location: "Vidyavihar, Mumbai", centersCount: 3, studentsCount: 2, subjectsCount: 14, examsCount: 30, defaultDept: "Information Technology", defaultSubject: "Cloud Computing", avgScore: 81.3, passRate: 93.8 },
      { id: 15, name: "D.J. Sanghvi College of Engineering", code: "DJSCE", state: "Maharashtra", district: "Mumbai", location: "Vile Parle, Mumbai", centersCount: 3, studentsCount: 2, subjectsCount: 15, examsCount: 32, defaultDept: "Computer Science", defaultSubject: "Artificial Intelligence", avgScore: 83.5, passRate: 95.1 },

      // MAHARASHTRA - NASHIK
      { id: 16, name: "K.K. Wagh Institute of Engg", code: "KKWIEER", state: "Maharashtra", district: "Nashik", location: "Amrutdham, Nashik", centersCount: 3, studentsCount: 2, subjectsCount: 12, examsCount: 28, defaultDept: "Computer Engineering", defaultSubject: "Java Programming", avgScore: 76.8, passRate: 89.5 },
      { id: 17, name: "MET Institute of Engineering", code: "MET-BKC", state: "Maharashtra", district: "Nashik", location: "Adgaon, Nashik", centersCount: 2, studentsCount: 2, subjectsCount: 10, examsCount: 22, defaultDept: "Mechanical", defaultSubject: "Thermodynamics", avgScore: 74.2, passRate: 87.0 },
      { id: 18, name: "Sandip Institute of Tech & Research", code: "SITRC", state: "Maharashtra", district: "Nashik", location: "Mahiravani, Nashik", centersCount: 3, studentsCount: 2, subjectsCount: 11, examsCount: 25, defaultDept: "Civil Engineering", defaultSubject: "Structural Design", avgScore: 73.9, passRate: 86.2 },

      // MAHARASHTRA - NAGPUR
      { id: 19, name: "VNIT Nagpur", code: "VNIT", state: "Maharashtra", district: "Nagpur", location: "South Ambazari Road, Nagpur", centersCount: 5, studentsCount: 2, subjectsCount: 20, examsCount: 48, defaultDept: "Electronics Engineering", defaultSubject: "VLSI Design", avgScore: 87.4, passRate: 98.9 },
      { id: 20, name: "Shri Ramdeobaba College of Engg", code: "RCOEM", state: "Maharashtra", district: "Nagpur", location: "Katol Road, Nagpur", centersCount: 4, studentsCount: 2, subjectsCount: 16, examsCount: 35, defaultDept: "Computer Science", defaultSubject: "Data Warehousing", avgScore: 81.9, passRate: 94.0 },

      // MAHARASHTRA - CHHATRAPATI SAMBHAJINAGAR
      { id: 21, name: "Government College of Engg Aurangabad", code: "GECA", state: "Maharashtra", district: "Chhatrapati Sambhajinagar", location: "Osmanpura, Sambhajinagar", centersCount: 3, studentsCount: 2, subjectsCount: 12, examsCount: 26, defaultDept: "Mechanical", defaultSubject: "Fluid Dynamics", avgScore: 75.1, passRate: 88.3 },

      // MAHARASHTRA - THANE
      { id: 22, name: "Thadomal Shahani Engg College", code: "TSEC", state: "Maharashtra", district: "Thane", location: "Bandra-Thane Region", centersCount: 3, studentsCount: 2, subjectsCount: 13, examsCount: 27, defaultDept: "Information Technology", defaultSubject: "Cyber Security", avgScore: 79.5, passRate: 92.1 },

      // MAHARASHTRA - KOLHAPUR
      { id: 23, name: "Walchand College of Engineering", code: "WCE", state: "Maharashtra", district: "Kolhapur", location: "Sangli-Kolhapur Border", centersCount: 4, studentsCount: 2, subjectsCount: 15, examsCount: 33, defaultDept: "Electrical Engineering", defaultSubject: "Power Systems", avgScore: 83.0, passRate: 95.4 },

      // GUJARAT - AHMEDABAD
      { id: 24, name: "Nirma University", code: "NIRMA", state: "Gujarat", district: "Ahmedabad", location: "SG Highway, Ahmedabad", centersCount: 4, studentsCount: 2, subjectsCount: 17, examsCount: 38, defaultDept: "Computer Engineering", defaultSubject: "Compiler Design", avgScore: 84.1, passRate: 96.0 },
      { id: 25, name: "L.D. College of Engineering", code: "LDCE", state: "Gujarat", district: "Ahmedabad", location: "Navrangpura, Ahmedabad", centersCount: 5, studentsCount: 2, subjectsCount: 19, examsCount: 42, defaultDept: "Information Technology", defaultSubject: "Distributed Systems", avgScore: 82.5, passRate: 94.8 },

      // GUJARAT - SURAT
      { id: 26, name: "SVNIT Surat", code: "SVNIT", state: "Gujarat", district: "Surat", location: "Ichchhanath, Surat", centersCount: 4, studentsCount: 2, subjectsCount: 18, examsCount: 40, defaultDept: "Chemical Engineering", defaultSubject: "Heat Transfer", avgScore: 85.9, passRate: 97.2 },

      // GUJARAT - VADODARA
      { id: 27, name: "MSU Vadodara", code: "MSU", state: "Gujarat", district: "Vadodara", location: "Sayajiganj, Vadodara", centersCount: 4, studentsCount: 2, subjectsCount: 16, examsCount: 34, defaultDept: "Civil Engineering", defaultSubject: "Concrete Technology", avgScore: 78.9, passRate: 91.5 },

      // GUJARAT - RAJKOT
      { id: 28, name: "Marwadi University", code: "MU", state: "Gujarat", district: "Rajkot", location: "Morbi Road, Rajkot", centersCount: 3, studentsCount: 2, subjectsCount: 12, examsCount: 25, defaultDept: "Computer Science", defaultSubject: "Python Programming", avgScore: 76.2, passRate: 88.9 },

      // KARNATAKA - BENGALURU
      { id: 29, name: "RV College of Engineering", code: "RVCE", state: "Karnataka", district: "Bengaluru", location: "Mysore Road, Bengaluru", centersCount: 5, studentsCount: 2, subjectsCount: 22, examsCount: 46, defaultDept: "Computer Science", defaultSubject: "Design & Analysis of Algorithms", avgScore: 88.5, passRate: 99.1 },
      { id: 30, name: "BMS College of Engineering", code: "BMSCE", state: "Karnataka", district: "Bengaluru", location: "Basavanagudi, Bengaluru", centersCount: 4, studentsCount: 2, subjectsCount: 18, examsCount: 40, defaultDept: "Information Science", defaultSubject: "Big Data Analytics", avgScore: 85.0, passRate: 96.5 },
      { id: 31, name: "PES University", code: "PESU", state: "Karnataka", district: "Bengaluru", location: "Ring Road, Bengaluru", centersCount: 4, studentsCount: 2, subjectsCount: 20, examsCount: 44, defaultDept: "Artificial Intelligence", defaultSubject: "Deep Learning", avgScore: 86.8, passRate: 97.9 },

      // KARNATAKA - MYSURU
      { id: 32, name: "SJCE Mysuru", code: "SJCE", state: "Karnataka", district: "Mysuru", location: "Manasagangothri, Mysuru", centersCount: 3, studentsCount: 2, subjectsCount: 14, examsCount: 30, defaultDept: "Electronics & Comm", defaultSubject: "Signal Processing", avgScore: 81.4, passRate: 93.0 },

      // KARNATAKA - HUBBALLI
      { id: 33, name: "KLE Technological University", code: "KLE", state: "Karnataka", district: "Hubballi", location: "Vidyanagar, Hubballi", centersCount: 3, studentsCount: 2, subjectsCount: 13, examsCount: 28, defaultDept: "Robotics", defaultSubject: "Embedded Systems", avgScore: 79.8, passRate: 91.8 },

      // KARNATAKA - MANGALURU
      { id: 34, name: "NITK Surathkal", code: "NITK", state: "Karnataka", district: "Mangaluru", location: "Surathkal, Mangaluru", centersCount: 5, studentsCount: 2, subjectsCount: 22, examsCount: 50, defaultDept: "Computer Science", defaultSubject: "Distributed OS", avgScore: 89.2, passRate: 99.4 },

      // DELHI - NEW DELHI / CENTRAL DELHI / SOUTH DELHI / NORTH DELHI
      { id: 35, name: "IIT Delhi", code: "IITD", state: "Delhi", district: "New Delhi", location: "Hauz Khas, New Delhi", centersCount: 6, studentsCount: 2, subjectsCount: 25, examsCount: 60, defaultDept: "Computer Science", defaultSubject: "Advanced AI", avgScore: 91.5, passRate: 99.7 },
      { id: 36, name: "Delhi Technological University", code: "DTU", state: "Delhi", district: "North Delhi", location: "Rohini, North Delhi", centersCount: 5, studentsCount: 2, subjectsCount: 22, examsCount: 52, defaultDept: "Software Engineering", defaultSubject: "Full Stack Dev", avgScore: 87.1, passRate: 98.3 },
      { id: 37, name: "Jamia Millia Islamia", code: "JMI", state: "Delhi", district: "South Delhi", location: "Jamia Nagar, South Delhi", centersCount: 4, studentsCount: 2, subjectsCount: 16, examsCount: 36, defaultDept: "Electrical Engineering", defaultSubject: "Microprocessors", avgScore: 82.3, passRate: 94.1 },
      { id: 38, name: "Maulana Azad National Inst", code: "MAMC", state: "Delhi", district: "Central Delhi", location: "Bahadur Shah Zafar Marg", centersCount: 3, studentsCount: 2, subjectsCount: 13, examsCount: 28, defaultDept: "Biomedical Engg", defaultSubject: "Bio-Informatics", avgScore: 80.9, passRate: 92.7 },

      // TAMIL NADU - CHENNAI / COIMBATORE / MADURAI
      { id: 39, name: "Anna University", code: "ANNA", state: "Tamil Nadu", district: "Chennai", location: "Guindy, Chennai", centersCount: 6, studentsCount: 2, subjectsCount: 24, examsCount: 55, defaultDept: "Computer Science", defaultSubject: "Parallel Computing", avgScore: 88.0, passRate: 98.6 },
      { id: 40, name: "PSG College of Technology", code: "PSGTECH", state: "Tamil Nadu", district: "Coimbatore", location: "Peelamedu, Coimbatore", centersCount: 4, studentsCount: 2, subjectsCount: 18, examsCount: 40, defaultDept: "Production Engg", defaultSubject: "CAD/CAM", avgScore: 85.4, passRate: 96.8 },
      { id: 41, name: "Thiagarajar College of Engg", code: "TCE", state: "Tamil Nadu", district: "Madurai", location: "Thiruparankundram, Madurai", centersCount: 3, studentsCount: 2, subjectsCount: 13, examsCount: 29, defaultDept: "Mechatronics", defaultSubject: "Sensor Networks", avgScore: 81.0, passRate: 93.2 },

      // UTTAR PRADESH - NOIDA / LUCKNOW / KANPUR / VARANASI
      { id: 42, name: "Amity University Noida", code: "AMITY", state: "Uttar Pradesh", district: "Noida", location: "Sector 125, Noida", centersCount: 5, studentsCount: 2, subjectsCount: 21, examsCount: 48, defaultDept: "Computer Science", defaultSubject: "Cloud Architecture", avgScore: 83.2, passRate: 95.0 },
      { id: 43, name: "IET Lucknow", code: "IETL", state: "Uttar Pradesh", district: "Lucknow", location: "Sitapur Road, Lucknow", centersCount: 4, studentsCount: 2, subjectsCount: 15, examsCount: 34, defaultDept: "Information Technology", defaultSubject: "Mobile Computing", avgScore: 80.5, passRate: 92.4 },
      { id: 44, name: "IIT Kanpur", code: "IITK", state: "Uttar Pradesh", district: "Kanpur", location: "Kalyanpur, Kanpur", centersCount: 6, studentsCount: 2, subjectsCount: 26, examsCount: 62, defaultDept: "Computer Science", defaultSubject: "Quantum Computing", avgScore: 92.8, passRate: 99.8 },
      { id: 45, name: "IIT BHU Varanasi", code: "IITBHU", state: "Uttar Pradesh", district: "Varanasi", location: "BHU Campus, Varanasi", centersCount: 5, studentsCount: 2, subjectsCount: 23, examsCount: 54, defaultDept: "Ceramic Engineering", defaultSubject: "Nanotechnology", avgScore: 89.4, passRate: 99.2 },
    ];
    const saved = localStorage.getItem('colleges');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 40) return parsed.map(c => ({ ...c, studentsCount: 2 }));
        // Merge saved with default properties
        return defaultColleges.map(dc => {
          const found = parsed.find(p => p.id === dc.id);
          return found ? { ...dc, ...found, studentsCount: 2 } : { ...dc, studentsCount: 2 };
        });
      } catch {
        return defaultColleges;
      }
    }
    return defaultColleges;
  })(),
  centers: (() => {
    const defaultCenters = [
      { id: 1, collegeId: 1, name: "Kothrud", location: "Kothrud Center" },
      { id: 2, collegeId: 1, name: "Shivaji Nagar", location: "Shivaji Nagar Center" },
      { id: 3, collegeId: 2, name: "Dhankawadi", location: "Dhankawadi Center" },
      { id: 4, collegeId: 2, name: "Bibwewadi", location: "Bibwewadi Center" },
      { id: 5, collegeId: 3, name: "FC Road (Deccan)", location: "Deccan Gymkhana" },
      { id: 6, collegeId: 4, name: "Akurdi", location: "Akurdi Center" },
      { id: 7, collegeId: 5, name: "Viman Nagar", location: "Viman Nagar Center" },
      { id: 8, collegeId: 6, name: "Hinjewadi", location: "Hinjewadi Phase 1" },
      { id: 9, collegeId: 7, name: "Hadapsar", location: "Hadapsar Center" },
      { id: 10, collegeId: 8, name: "Swargate", location: "Swargate Center" },
      { id: 11, collegeId: 9, name: "Kondhwa", location: "Kondhwa Center" },
      { id: 12, collegeId: 10, name: "Pimpri-Chinchwad", location: "Pimpri Hub" },
      { id: 13, collegeId: 11, name: "Kalyani Nagar", location: "Kalyani Nagar Center" },
      { id: 14, collegeId: 12, name: "Warje", location: "Warje Center" },
      { id: 15, collegeId: 1, name: "Karve Nagar", location: "Karve Nagar Center" },
      { id: 16, collegeId: 2, name: "Model Colony", location: "Model Colony Center" },
      { id: 17, collegeId: 3, name: "Ganeshkhind", location: "Ganeshkhind Center" },
      { id: 18, collegeId: 4, name: "Katraj", location: "Katraj Center" },
      { id: 19, collegeId: 5, name: "Baner", location: "Baner Center" },
      { id: 20, collegeId: 6, name: "Wakad", location: "Wakad Center" },
      { id: 21, collegeId: 7, name: "Bawdhan", location: "Bawdhan Center" },
      { id: 22, collegeId: 8, name: "Camp", location: "Camp Center" }
    ];
    safeSetLocalStorage('centers', defaultCenters);
    return defaultCenters;
  })(),
  students: (() => {
    const saved = localStorage.getItem('students');
    const batchFallbackList = ['B-1', 'A-1', 'C-1', 'B-2', 'A-2', 'C-2', 'D-1', 'D-2'];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const cleaned = parsed
          .filter(s => {
            const n = (s.name || '').toLowerCase();
            return !n.includes('omkar') && n !== 'om';
          })
          .map((s, idx) => {
            const { papers, ...rest } = s;
            const cleanPapers = Array.isArray(papers)
              ? papers.map(p => (typeof p === 'string' && p.startsWith('data:image/') && p.length > 50000 ? undefined : p)).filter(Boolean)
              : undefined;
            const nameLower = (s.name || '').toLowerCase().trim();
            let cId = s.collegeId;
            if (nameLower.includes('aarav') || nameLower.includes('priya')) {
              cId = 2; // MIT College: ONLY Aarav & Priya
            } else if (nameLower.includes('aditya') || nameLower.includes('sneha') || nameLower.includes('vikram')) {
              cId = 3;
            } else if (!cId) {
              cId = 1;
            }
            const updatedPhoto = getStudentPhoto(s);
            let batchVal = s.batch;
            if (!batchVal || batchVal === 'Batch 2025-26' || batchVal.includes('Batch')) {
              batchVal = batchFallbackList[idx % batchFallbackList.length];
            }
            return {
              ...rest,
              collegeId: cId,
              batch: batchVal,
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
      { id: 1, collegeId: 1, rollNo: 'CS101', name: 'Rohan Sharma', prn: '202301001', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester III', division: 'A', batch: 'B-1', attendance: 88, photo: '/students/student_male_1.png' },
      { id: 2, collegeId: 1, rollNo: 'CS102', name: 'Sample Student 1', prn: '202301002', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester III', division: 'A', batch: 'A-1', attendance: 92, photo: '/students/student_male_2.png' },
      { id: 3, collegeId: 1, rollNo: 'CS103', name: 'Sample Student 2', prn: '202301003', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester III', division: 'A', batch: 'C-1', attendance: 84, photo: '/students/student_male_3.png' },
      { id: 4, collegeId: 2, rollNo: '01', name: 'Aarav Sharma', prn: '101', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester IV', division: 'A', batch: 'B-1', attendance: 75, photo: '/students/student_male_3.png' },
      { id: 5, collegeId: 2, rollNo: '02', name: 'Priya Joshi', prn: '102', department: 'Computer Engineering', year: 'Second Year', semester: 'Semester IV', division: 'A', batch: 'B-2', attendance: 83, photo: '/students/student_female_2.png' },
      { id: 6, collegeId: 3, rollNo: 'CS105', name: 'Aditya Deshmukh', prn: '202301005', department: 'Artificial Intelligence', year: 'First Year', semester: 'Semester I', division: 'A', batch: 'A-2', attendance: 95, photo: '/students/student_male_2.png' },
      { id: 7, collegeId: 3, rollNo: 'CS106', name: 'Sneha Kulkarni', prn: '202301006', department: 'Data Science', year: 'Second Year', semester: 'Semester IV', division: 'B', batch: 'C-2', attendance: 90, photo: '/students/student_female_1.png' },
      { id: 8, collegeId: 3, rollNo: 'CS107', name: 'Vikram Singh', prn: '202301007', department: 'Mechanical', year: 'Fourth Year', semester: 'Semester VII', division: 'A', batch: 'D-1', attendance: 82, photo: '/students/student_male_3.png' },
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

    case 'SET_UPLOADED_FILES':
    case 'ADD_UPLOADED_FILES': {
      const isSet = action.type === 'SET_UPLOADED_FILES';
      const newFiles = isSet ? action.payload.files : [...state.uploadedFiles, ...action.payload.files];
      const newPreviews = isSet ? action.payload.previews : [...state.imagePreviews, ...action.payload.previews];

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
      safeSetLocalStorage('studentInfo', updatedInfo);
      if (updatedInfo.state) safeSetLocalStorage('selectedState', updatedInfo.state);
      if (updatedInfo.district) safeSetLocalStorage('selectedDistrict', updatedInfo.district);

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

    case 'SAVE_ANSWER_KEY': {
      const keyToSave = action.payload;
      const existingIdx = (state.savedAnswerKeys || []).findIndex(k => k.id === keyToSave.id);
      let updatedKeys = [];
      if (existingIdx >= 0) {
        updatedKeys = (state.savedAnswerKeys || []).map((k, i) => i === existingIdx ? keyToSave : k);
      } else {
        updatedKeys = [keyToSave, ...(state.savedAnswerKeys || [])];
      }
      safeSetLocalStorage('savedAnswerKeys', updatedKeys);
      return { ...state, savedAnswerKeys: updatedKeys };
    }

    case 'DELETE_ANSWER_KEY': {
      // Handle special purge of built-in demo keys
      if (action.payload === '__PURGE_DEMO_KEYS__') {
        const cleanedKeys = (state.savedAnswerKeys || []).filter(k => {
          if (!k) return false;
          const title = (k.title || '').toLowerCase();
          const id = (k.id || '').toLowerCase();
          return !['key-dbms-a', 'key-ml-b', 'key-cn-c', 'key-math-d'].includes(id) &&
                 !title.includes('dbms unit test') &&
                 !title.includes('machine learning mid-term') &&
                 !title.includes('computer networks quiz') &&
                 !title.includes('mathematics unit 1');
        });
        safeSetLocalStorage('savedAnswerKeys', cleanedKeys);
        return { ...state, savedAnswerKeys: cleanedKeys };
      }
      const idToDelete = action.payload;
      const updatedKeys = (state.savedAnswerKeys || []).filter(k => k.id !== idToDelete);
      safeSetLocalStorage('savedAnswerKeys', updatedKeys);
      return { ...state, savedAnswerKeys: updatedKeys };
    }

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
          return { ...s, isApproved: true, status: 'Approved' };
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

    case 'FLAG_STUDENTS_AS_COPIED': {
      const { studentNames, details } = action.payload || {};
      const names = Array.isArray(studentNames) ? studentNames.map(n => String(n).toLowerCase().trim()) : [];
      
      const updatedStudents = state.students.map(s => {
        const sName = (s.name || '').toLowerCase().trim();
        const sRoll = (s.rollNo || '').toLowerCase().trim();
        const isMatch = names.some(n => (n && (sName.includes(n) || n.includes(sName))) || sRoll === n);
        if (isMatch) {
          return {
            ...s,
            isCopied: true,
            status: 'Flagged (Copied)',
            copiedDetails: details || 'Matched answers detected in visual comparison'
          };
        }
        return s;
      });

      safeSetLocalStorage('students', updatedStudents);

      const copiedList = JSON.parse(localStorage.getItem('copiedStudentNames') || '[]');
      names.forEach(n => {
        if (!copiedList.includes(n)) copiedList.push(n);
      });
      localStorage.setItem('copiedStudentNames', JSON.stringify(copiedList));

      return {
        ...state,
        students: updatedStudents,
      };
    }

    case 'CLEAR_COPIED_FLAG': {
      const studentNameOrId = action.payload;
      const targetName = (typeof studentNameOrId === 'string' ? studentNameOrId : studentNameOrId?.name || '').toLowerCase().trim();
      
      const updatedStudents = state.students.map(s => {
        const sName = (s.name || '').toLowerCase().trim();
        const isMatch = (targetName && (sName.includes(targetName) || targetName.includes(sName))) || s.id === studentNameOrId;
        if (isMatch) {
          const { isCopied, copiedDetails, ...rest } = s;
          return { ...rest, status: rest.isApproved ? 'Approved' : 'Pending' };
        }
        return s;
      });

      safeSetLocalStorage('students', updatedStudents);

      const copiedList = JSON.parse(localStorage.getItem('copiedStudentNames') || '[]');
      const filtered = copiedList.filter(n => !(targetName && (n.includes(targetName) || targetName.includes(n))));
      localStorage.setItem('copiedStudentNames', JSON.stringify(filtered));

      return {
        ...state,
        students: updatedStudents,
      };
    }

    case 'APPROVE_STUDENT_OMR_EVALUATION': {
      const omrData = action.payload;
      if (!omrData || !omrData.student) return state;

      const rollNoRaw = String(omrData.student.rollNo || '11').trim();
      const studentName = omrData.student.name || `Student ${rollNoRaw}`;
      const prnVal = omrData.student.prn || `2026${Math.floor(1000 + Math.random() * 9000)}`;
      const percentageScore = omrData.summary?.percentage !== undefined ? omrData.summary.percentage : 80;
      const totalScore = omrData.summary?.totalScore || 0;
      const maxScore = omrData.summary?.maxScore || 10;

      let found = false;
      let updatedStudents = state.students.map(s => {
        const sRoll = String(s.rollNo || '').trim().toLowerCase();
        const targetRoll = rollNoRaw.toLowerCase();
        const matchRoll = sRoll === targetRoll || (targetRoll && sRoll.includes(targetRoll)) || (targetRoll && targetRoll.includes(sRoll));
        const matchName = s.name?.toLowerCase().includes(studentName.toLowerCase()) || studentName.toLowerCase().includes(s.name?.toLowerCase());

        if (matchRoll || matchName) {
          found = true;
          return {
            ...s,
            rollNo: s.rollNo || rollNoRaw,
            name: s.name && !s.name.includes('Sample') ? s.name : studentName,
            isApproved: true,
            status: 'Approved',
            scorePercentage: percentageScore,
            attendance: percentageScore,
            evaluation: {
              marksObtained: totalScore,
              maxMarks: maxScore,
              percentage: percentageScore,
              accuracy: percentageScore,
              approved: true,
              approvedAt: new Date().toISOString(),
              questionResults: omrData.questionResults,
            },
            omrResult: omrData,
          };
        }
        return s;
      });

      if (!found) {
        const newStudent = {
          id: Date.now(),
          collegeId: 4, // Pune University
          rollNo: rollNoRaw,
          name: studentName,
          prn: prnVal,
          department: omrData.student.department || 'Computer Engineering',
          year: 'Second Year',
          semester: 'Semester IV',
          division: 'C',
          batch: 'C-1',
          attendance: percentageScore,
          photo: getStudentPhoto({ rollNo: rollNoRaw, name: studentName }),
          isApproved: true,
          status: 'Approved',
          scorePercentage: percentageScore,
          evaluation: {
            marksObtained: totalScore,
            maxMarks: maxScore,
            percentage: percentageScore,
            accuracy: percentageScore,
            approved: true,
            approvedAt: new Date().toISOString(),
            questionResults: omrData.questionResults,
          },
          omrResult: omrData,
        };
        updatedStudents = [...updatedStudents, newStudent];
      }

      safeSetLocalStorage('students', updatedStudents);

      const approvedList = JSON.parse(localStorage.getItem('approvedStudentNames') || '[]');
      const targetNameLower = studentName.toLowerCase().trim();
      const targetRollLower = rollNoRaw.toLowerCase().trim();
      if (targetNameLower && !approvedList.includes(targetNameLower)) {
        approvedList.push(targetNameLower);
      }
      if (targetRollLower && !approvedList.includes(targetRollLower)) {
        approvedList.push(targetRollLower);
      }
      localStorage.setItem('approvedStudentNames', JSON.stringify(approvedList));

      return {
        ...state,
        students: updatedStudents,
      };
    }

    case 'FLAG_STUDENTS_AS_COPIED': {
      const { studentNames, details } = action.payload || {};
      const names = Array.isArray(studentNames) ? studentNames.map(n => String(n).toLowerCase().trim()) : [];
      
      const updatedStudents = state.students.map(s => {
        const sName = (s.name || '').toLowerCase().trim();
        const sRoll = (s.rollNo || '').toLowerCase().trim();
        const isMatch = names.some(n => (n && (sName.includes(n) || n.includes(sName))) || sRoll === n);
        if (isMatch) {
          return {
            ...s,
            isCopied: true,
            status: 'Flagged (Copied)',
            copiedDetails: details || 'Matched answers detected in visual comparison'
          };
        }
        return s;
      });

      safeSetLocalStorage('students', updatedStudents);

      const copiedList = JSON.parse(localStorage.getItem('copiedStudentNames') || '[]');
      names.forEach(n => {
        if (!copiedList.includes(n)) copiedList.push(n);
      });
      localStorage.setItem('copiedStudentNames', JSON.stringify(copiedList));

      return {
        ...state,
        students: updatedStudents,
      };
    }

    case 'CLEAR_COPIED_FLAG': {
      const studentNameOrId = action.payload;
      const targetName = (typeof studentNameOrId === 'string' ? studentNameOrId : studentNameOrId?.name || '').toLowerCase().trim();
      
      const updatedStudents = state.students.map(s => {
        const sName = (s.name || '').toLowerCase().trim();
        const isMatch = (targetName && (sName.includes(targetName) || targetName.includes(sName))) || s.id === studentNameOrId;
        if (isMatch) {
          const { isCopied, copiedDetails, ...rest } = s;
          return { ...rest, status: rest.isApproved ? 'Approved' : 'Pending' };
        }
        return s;
      });

      safeSetLocalStorage('students', updatedStudents);

      const copiedList = JSON.parse(localStorage.getItem('copiedStudentNames') || '[]');
      const filtered = copiedList.filter(n => !(targetName && (n.includes(targetName) || targetName.includes(n))));
      localStorage.setItem('copiedStudentNames', JSON.stringify(filtered));

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

    case 'SET_STUDENT_INFO': {
      const updatedStudentInfo = {
        ...state.studentInfo,
        ...action.payload,
      };
      return {
        ...state,
        studentInfo: updatedStudentInfo,
      };
    }

    // NOTE: SAVE_ANSWER_KEY and DELETE_ANSWER_KEY are intentionally handled only once above (lines ~624 and ~637).
    // Duplicate cases were removed to prevent the second case from silently overriding the first.

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

/** Helper function to check if a student has been flagged for copied answers / malpractice */
export function isStudentCopied(student, state) {
  if (!student) return false;
  if (student.isCopied) return true;

  const targetName = (typeof student === 'string' ? student : student?.name || '').toLowerCase().trim();
  const targetRoll = (typeof student === 'object' ? student?.rollNo : '')?.toLowerCase().trim();
  if (!targetName && !targetRoll) return false;

  const copiedList = JSON.parse(localStorage.getItem('copiedStudentNames') || '[]');
  if (copiedList.some(item => (targetName && (targetName.includes(item) || item.includes(targetName))) || (targetRoll && targetRoll === item))) {
    return true;
  }

  const matchedStudent = state?.students?.find(s => {
    const sName = (s.name || '').toLowerCase().trim();
    const sRoll = (s.rollNo || '').toLowerCase().trim();
    return (sName && targetName && (sName.includes(targetName) || targetName.includes(sName))) || (sRoll && targetRoll && sRoll === targetRoll);
  });

  return Boolean(matchedStudent?.isCopied);
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
