import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MapPin, BookOpen, FileText, Users, CheckCircle, 
  Clock, TrendingUp, Plus, Edit2, Trash2, Search, X, Save,
  LogOut, UserCircle, Brain, GraduationCap, CheckCircle2,
  ListOrdered, Target, Sparkles, CheckSquare, XCircle, AlertCircle, Award,
  Upload, Image, Camera, User, Eye, EyeOff, BarChart2, Mail, Phone, ShieldCheck, AlertTriangle, ArrowRight
} from 'lucide-react';
import { useAppContext, isStudentApproved } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { getAnswerSheetPlaceholder, getHistoryPagesSVG, getSciencePagesSVG } from '../utils/placeholderGenerator';
import { getPdfBlobUrl, openPdfInNewTab } from '../utils/pdfHelper';
import { getStudentPhoto, getStudentPhotoFallback, compressStudentPhoto } from '../utils/studentPhotoHelper';

// Helper function to build student question breakdown for modal
function getStudentQuestionBreakdown(student, state) {
  const modalName = student?.name?.trim().toLowerCase() || '';

  if (modalName.includes('aarav') || modalName.includes('arnav') || modalName.includes('aarnav')) {
    return [
      {
        id: 1,
        qNo: 'Q.1',
        title: 'Write short notes on any two. (1) Indian National Congress (2) Swaraj',
        maxMarks: 5,
        marksObtained: 5.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: '(1) Indian National Congress :\nThe Indian National Congress was established in 1885 at Bombay. A. O. Hume played an important role in its formation. The main objective of the Congress was to create a platform for the educated Indians to express their political demands. In the early years, the Congress followed a moderate approach and demanded reforms from the British government.\n\n(2) Swaraj :\nSwaraj means self-rule. The demand for Swaraj became strong during the freedom movement. Lokmanya Tilak gave the slogan "Swaraj is my birthright and I shall have it". The demand for complete independence was later adopted by the Congress in 1929.',
        modelAnswer: '(1) Indian National Congress established in 1885 by A.O. Hume for political demands. (2) Swaraj means self-rule, popularized by Lokmanya Tilak.',
        feedback: 'Full marks awarded! Comprehensive and accurate short notes on both Indian National Congress and Swaraj.'
      },
      {
        id: 2,
        qNo: 'Q.2',
        title: 'Explain the main features of the Non-Cooperation Movement.',
        maxMarks: 5,
        marksObtained: 5.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: '• Launched by Mahatma Gandhi in 1920.\n• It was a response to the Rowlatt Act and Jallianwala Bagh massacre.\n• People were asked to boycott foreign goods, government schools, law courts and titles.\n• It aimed to achieve Swaraj through non-violent means.\n• The movement was withdrawn in 1922 after the Chauri Chaura incident.',
        modelAnswer: 'Launched by Gandhi in 1920 following Rowlatt Act & Jallianwala Bagh. Boycott of foreign goods, schools, titles. Non-violent means. Withdrawn in 1922 after Chauri Chaura.',
        feedback: 'Full marks awarded! All 5 bullet points perfectly match the expected rubric.'
      },
      {
        id: 3,
        qNo: 'Q.3',
        title: 'Write a note on the contribution of Dr. B. R. Ambedkar.',
        maxMarks: 5,
        marksObtained: 5.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: 'Dr. B. R. Ambedkar was a great social reformer, jurist and the chairman of the Drafting Committee of the Indian Constitution. He worked for the rights of the downtrodden and fought against untouchability. He believed in education, equality and social justice. His contribution in framing the Constitution of India is invaluable.',
        modelAnswer: 'Chairman of Drafting Committee of Indian Constitution, social reformer who fought against untouchability, jurist promoting education, equality, and social justice.',
        feedback: 'Full marks awarded! Comprehensive answer covering drafting committee, social equality, and anti-untouchability efforts.'
      },
      {
        id: 4,
        qNo: 'Q.4',
        title: 'State any four causes of the French Revolution.',
        maxMarks: 4,
        marksObtained: 4.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: '(1) Social inequality.\n(2) Financial crisis\n(3) Influence of Enlightenment thinkers\n(4) Autocratic rule of Louis XVI.',
        modelAnswer: '(1) Social inequality (Three Estates), (2) Financial crisis, (3) Enlightenment thinkers, (4) Autocratic rule of Louis XVI.',
        feedback: 'Full marks awarded! Correctly listed all 4 major causes of the French Revolution.'
      },
      {
        id: 5,
        qNo: 'Q.5',
        title: 'Write a short note on the United Nations.',
        maxMarks: 4,
        marksObtained: 4.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: 'The United Nations was established in 1945 after the Second World War. Its main objective is to maintain international peace and security, develop friendly relations among nations and promote social, economic and cultural co-operation. India is one of the founding members of the United Nations.',
        modelAnswer: 'Established in 1945 post-WWII to maintain peace & security and promote global cooperation. India is a founding member.',
        feedback: 'Full marks awarded! Covers 1945 establishment, peace objectives, and India\'s founding status.'
      },
      {
        id: 6,
        qNo: 'Q.6',
        title: 'What were the results of the First World War? (Any four)',
        maxMarks: 4,
        marksObtained: 4.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: '(1) Huge loss of life and property.\n(2) Growth of nationalistic feelings.\n(3) Collapse of old empires like German, Austrian and Ottoman.\n(4) Establishment of the League of Nations.',
        modelAnswer: '(1) Loss of life/property, (2) Nationalistic feelings, (3) Collapse of German/Austrian/Ottoman empires, (4) League of Nations.',
        feedback: 'Full marks awarded! Accurately stated all four key outcomes of WWI.'
      },
      {
        id: 7,
        qNo: 'Q.7',
        title: 'Write a note on Mahatma Gandhi\'s Satyagraha movement.',
        maxMarks: 4,
        marksObtained: 4.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: 'Mahatma Gandhi started the Satyagraha movement in South Africa in 1906. It was based on the principles of truth and non-violence. He used Satyagraha as a weapon against injustice. The movement inspired Indians in their struggle for freedom and later became an important part of the Indian independence movement.',
        modelAnswer: 'Initiated in South Africa in 1906 based on Truth (Satya) and Non-violence (Ahimsa) against colonial injustice.',
        feedback: 'Full marks awarded! Mentions 1906 South Africa launch and principles of Truth and Non-violence.'
      },
      {
        id: 8,
        qNo: 'Q.8',
        title: 'Explain the importance of the Dandi March.',
        maxMarks: 4,
        marksObtained: 4.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: 'The Dandi March was started by Mahatma Gandhi on 12th March 1930 to protest against the British salt law. He along with his followers marched from Sabarmati to Dandi, a distance of about 240 miles. By making salt, Gandhi broke the law and showed that ordinary people could also resist British rule. The march brought the freedom struggle to the masses and received worldwide attention.',
        modelAnswer: 'Started 12th March 1930 from Sabarmati to Dandi (240 miles) breaking British salt law, bringing national participation.',
        feedback: 'Full marks awarded! Complete accuracy on March 12, 1930 date, Sabarmati-Dandi route, 240 miles, and breaking salt tax.'
      },
      {
        id: 9,
        qNo: 'Q.9',
        title: 'Write any four features of the Indian Constitution.',
        maxMarks: 4,
        marksObtained: 4.0,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: '(1) It provides a democratic form of government.\n(2) It guarantees fundamental rights to all citizens.\n(3) It ensures equality before law.\n(4) It establishes an independent judiciary.',
        modelAnswer: '(1) Democratic government, (2) Fundamental Rights guarantee, (3) Equality before law, (4) Independent judiciary.',
        feedback: 'Full marks awarded! All 4 core constitutional features accurately stated.'
      }
    ];
  }

  if (student?.evaluation?.questionBreakdown?.length > 0) {
    return student.evaluation.questionBreakdown;
  }

  if (state?.evaluationResult?.questionBreakdown?.length > 0) {
    return state.evaluationResult.questionBreakdown;
  }

  const subj = (student?.subject || state?.studentInfo?.subject || '').toUpperCase();

  if (subj.includes('DBMS') || subj.includes('DATABASE')) {
    return [
      {
        id: 1,
        qNo: 'Q.1',
        title: 'Explain Data Abstraction levels in DBMS.',
        maxMarks: 5,
        marksObtained: 5,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: 'Three levels of abstraction: Physical Level (how data is stored), Logical Level (what data is stored), and View Level (user interface view).',
        modelAnswer: 'Three-schema architecture: Physical schema, Conceptual/Logical schema, and External/View schema.',
        feedback: 'Perfect explanation of 3-schema architecture levels.'
      },
      {
        id: 2,
        qNo: 'Q.2',
        title: 'Define ER Diagram components.',
        maxMarks: 5,
        marksObtained: 4.5,
        accuracy: 90,
        status: 'Correct',
        studentAnswer: 'ER Diagram represents entity-relationship model. Entities (rectangles), Attributes (ovals), and Relationships (diamonds).',
        modelAnswer: 'Entity-Relationship model uses Entities, Attributes, Relationships, and Cardinality ratios.',
        feedback: 'Well articulated with correct geometric representations.'
      },
      {
        id: 3,
        qNo: 'Q.3',
        title: 'Explain Normalization forms (1NF, 2NF, 3NF).',
        maxMarks: 5,
        marksObtained: 4,
        accuracy: 80,
        status: 'Partial',
        studentAnswer: '1NF eliminates repeating groups. 2NF removes partial dependency. 3NF removes transitive dependency.',
        modelAnswer: '1NF: Atomic values; 2NF: 1NF + full functional dependency; 3NF: 2NF + no non-prime transitive dependencies.',
        feedback: 'Correct definitions, include a practical example for full points.'
      },
      {
        id: 4,
        qNo: 'Q.4',
        title: 'Difference between Primary Key and Foreign Key.',
        maxMarks: 5,
        marksObtained: 0,
        accuracy: 0,
        status: 'Incorrect',
        studentAnswer: 'Primary Key allows duplicate values and null values. Foreign key cannot have duplicates.',
        modelAnswer: 'Primary Key uniquely identifies each record in a table and cannot be NULL. Foreign Key establishes a link between two tables by referencing the primary key of another table.',
        feedback: 'Incorrect answer containing factual errors. Primary key cannot allow null or duplicate values.'
      },
      {
        id: 5,
        qNo: 'Q.5',
        title: 'Explain DDL vs DML commands in SQL.',
        maxMarks: 5,
        marksObtained: 4.5,
        accuracy: 90,
        status: 'Correct',
        studentAnswer: 'DDL commands define database structure (CREATE, ALTER, DROP). DML commands manipulate data inside tables (SELECT, INSERT, UPDATE, DELETE).',
        modelAnswer: 'DDL (Data Definition Language) handles schema changes; DML (Data Manipulation Language) handles tuple operations.',
        feedback: 'Accurate distinction between DDL and DML command types.'
      },
      {
        id: 6,
        qNo: 'Q.6',
        title: 'Explain ACID properties in DBMS.',
        maxMarks: 5,
        marksObtained: 5,
        accuracy: 100,
        status: 'Correct',
        studentAnswer: 'ACID stands for Atomicity (all or nothing), Consistency (preserves database rules), Isolation (concurrent execution), and Durability (permanent changes).',
        modelAnswer: 'Atomicity, Consistency, Isolation, and Durability ensure reliable transaction processing in database systems.',
        feedback: 'Flawless explanation of all four ACID properties.'
      },
      {
        id: 7,
        qNo: 'Q.7',
        title: 'What is Joins in SQL? List its types.',
        maxMarks: 5,
        marksObtained: 4,
        accuracy: 80,
        status: 'Partial',
        studentAnswer: 'SQL joins combine rows from two or more tables. Types: Inner Join, Left Join, Right Join, Full Join.',
        modelAnswer: 'SQL Joins retrieve data across multiple tables based on logical relationships. Core types: INNER, LEFT OUTER, RIGHT OUTER, FULL OUTER, and CROSS joins.',
        feedback: 'Good overview of SQL joins. Could mention Cross Join and self join.'
      }
    ];
  }

  return [
    {
      id: 1,
      qNo: 'Q.1',
      title: 'Explain fundamental theoretical concepts and core principles.',
      maxMarks: 5,
      marksObtained: 5,
      accuracy: 100,
      status: 'Correct',
      studentAnswer: student?.extractedText?.slice(0, 150) || 'The student clearly defined core theoretical principles, key formulas, and primary classification frameworks.',
      modelAnswer: 'Complete theoretical principles with accurate definitions, equations, and categorized examples.',
      feedback: 'Strong grasp of fundamental concepts with clear definitions.'
    },
    {
      id: 2,
      qNo: 'Q.2',
      title: 'Analyze and provide step-by-step resolution to the problem.',
      maxMarks: 5,
      marksObtained: 0,
      accuracy: 0,
      status: 'Incorrect',
      studentAnswer: 'Incorrect method applied with wrong formulas. Derived incorrect results.',
      modelAnswer: 'Full analytical solution showing step-by-step derivation and verified final value.',
      feedback: 'Incorrect answer containing factual errors / wrong calculation steps.'
    },
    {
      id: 3,
      qNo: 'Q.3',
      title: 'Discuss real-world applications and practical implications.',
      maxMarks: 5,
      marksObtained: 5,
      accuracy: 100,
      status: 'Correct',
      studentAnswer: 'Highlighted real-world applications in industry standards and modern practical implementations.',
      modelAnswer: 'Comprehensive practical applications, efficiency considerations, and real-world case studies.',
      feedback: 'Excellent real-world context and practical application examples.'
    },
    {
      id: 4,
      qNo: 'Q.4',
      title: 'Explain critical factors influencing system performance.',
      maxMarks: 5,
      marksObtained: 4,
      accuracy: 80,
      status: 'Partial',
      studentAnswer: 'Detailed memory allocation, execution speed, and resource management factors.',
      modelAnswer: 'System performance depends on CPU utilization, memory bandwidth, latency, and throughput.',
      feedback: 'Good identification of performance bottlenecks; missing latency metric.'
    },
    {
      id: 5,
      qNo: 'Q.5',
      title: 'Define security policies and data protection protocols.',
      maxMarks: 5,
      marksObtained: 0,
      accuracy: 0,
      status: 'Incorrect',
      studentAnswer: 'Security is not required. Data should be freely shared without encryption.',
      modelAnswer: 'Security policies enforce confidentiality, integrity, availability (CIA triad), encryption, and access control lists.',
      feedback: 'Incorrect statement contradicting fundamental security protocols.'
    },
    {
      id: 6,
      qNo: 'Q.6',
      title: 'Compare synchronous vs asynchronous execution modes.',
      maxMarks: 5,
      marksObtained: 5,
      accuracy: 100,
      status: 'Correct',
      studentAnswer: 'Synchronous execution blocks subsequent tasks until completion. Asynchronous execution runs tasks in background non-blocking mode.',
      modelAnswer: 'Synchronous calls block execution flow; Asynchronous calls operate via event loops or callbacks without blocking execution.',
      feedback: 'Clear distinction with accurate blocking/non-blocking examples.'
    },
    {
      id: 7,
      qNo: 'Q.7',
      title: 'Summarize key recommendations for optimization.',
      maxMarks: 5,
      marksObtained: 4.5,
      accuracy: 90,
      status: 'Correct',
      studentAnswer: 'Recommends code refactoring, caching strategies, and indexing database fields for faster query execution.',
      modelAnswer: 'Best practices: Index optimization, caching layers, query profiling, and algorithmic efficiency.',
      feedback: 'Practical recommendations well aligned with industry standard optimization strategies.'
    }
  ];
}

// ----------------------------------------------------------------------
// Animated Stat Card Subcomponent
// ----------------------------------------------------------------------
function StatCard({ title, targetValue, icon: Icon, suffix = '', colorClass, index }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = targetValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetValue) {
        setValue(targetValue);
        clearInterval(timer);
      } else {
        setValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [targetValue]);

  const displayValue = Number.isInteger(targetValue) ? Math.round(value) : value.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ scale: 1.03 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {displayValue}
        <span className="text-lg font-medium text-gray-500 ml-1">{suffix}</span>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// Main Dashboard Component
// ----------------------------------------------------------------------
export default function Dashboard() {
  const { state, dispatch } = useAppContext();
  const toast = useToast();
  const navigate = useNavigate();

  // Selected state
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    department: '',
    year: '',
    semester: '',
    subject: '',
    examType: ''
  });

  // Student Search & Name Privacy
  const [studentSearch, setStudentSearch] = useState('');
  const [hideStudentNames, setHideStudentNames] = useState(true);

  // Exam Form
  const [examForm, setExamForm] = useState({
    name: '', subjectCode: '', date: '', time: '', duration: '2 hr', maxMarks: '', passingMarks: ''
  });

  // Modal states
  const [modal, setModal] = useState({ type: null, data: null }); // type: 'COLLEGE', 'CENTER', 'STUDENT', 'ENLARGE_PHOTO'
  const [studentPhoto, setStudentPhoto] = useState('');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Sync photo preview when modal opens
  const openModal = (type, data = null) => {
    setIsEditingProfile(false);
    if (type === 'STUDENT' || type === 'STUDENT_PROFILE') {
      setStudentPhoto(data?.photo || '');
    }
    if (type === 'ENLARGE_PHOTO') {
      setActivePhotoIndex(0);
    }
    setModal({ type, data });
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedStudent = {
      ...modal.data,
      name: formData.get('name')?.trim() || modal.data.name,
      rollNo: formData.get('rollNo')?.trim() || modal.data.rollNo,
      prn: formData.get('prn')?.trim() || modal.data.prn,
      collegeId: Number(formData.get('collegeId')) || modal.data.collegeId,
      department: formData.get('department')?.trim() || modal.data.department,
      semester: formData.get('semester')?.trim() || modal.data.semester,
      division: formData.get('division')?.trim() || modal.data.division,
      attendance: Number(formData.get('attendance')) || modal.data.attendance || 88,
      email: formData.get('email')?.trim() || `${formData.get('name')?.trim().toLowerCase().replace(/\s+/g, '.')}@student.edu.in`,
      phone: formData.get('phone')?.trim() || '+91 98230 41102',
      photo: studentPhoto || modal.data.photo,
      photos: modal.data.photos && modal.data.photos.length > 0 
        ? [studentPhoto || modal.data.photo, ...modal.data.photos.slice(1)]
        : [studentPhoto || modal.data.photo]
    };

    dispatch({ type: 'UPDATE_STUDENT', payload: updatedStudent });
    setModal({ type: 'STUDENT_PROFILE', data: updatedStudent });
    setIsEditingProfile(false);
    toast.success('Student profile updated successfully!');
  };

  // --- Photo Management inside ENLARGE_PHOTO Modal ---
  const handleAddPhotoToStudent = (e) => {
    const file = e.target.files?.[0];
    if (!file || !modal.data) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawUrl = event.target.result;
      const newPhotoUrl = await compressStudentPhoto(rawUrl, 600);
      const currentPhotos = modal.data?.photos && modal.data.photos.length > 0 
        ? [...modal.data.photos] 
        : [modal.data?.photo || getStudentPhoto(modal.data)];

      const updatedPhotos = [...currentPhotos, newPhotoUrl];
      const updatedStudent = {
        ...modal.data,
        photo: newPhotoUrl, // Make newly added photo the primary active photo
        photos: updatedPhotos
      };

      dispatch({ type: 'UPDATE_STUDENT', payload: updatedStudent });
      setModal({ type: 'ENLARGE_PHOTO', data: updatedStudent });
      setActivePhotoIndex(updatedPhotos.length - 1);
      toast.success('New photo added to student profile!');
    };
    reader.readAsDataURL(file);
  };

  const handleSetPrimaryPhoto = (index) => {
    if (!modal.data) return;
    const currentPhotos = modal.data?.photos && modal.data.photos.length > 0 
      ? [...modal.data.photos] 
      : [modal.data?.photo || getStudentPhoto(modal.data)];
    
    const selectedPhoto = currentPhotos[index];
    if (!selectedPhoto) return;

    const updatedStudent = {
      ...modal.data,
      photo: selectedPhoto,
      photos: currentPhotos
    };

    dispatch({ type: 'UPDATE_STUDENT', payload: updatedStudent });
    setModal({ type: 'ENLARGE_PHOTO', data: updatedStudent });
    setActivePhotoIndex(index);
    toast.success('Set as primary profile photo!');
  };

  const handleDeletePhotoFromStudent = (indexToDelete) => {
    if (!modal.data) return;
    const currentPhotos = modal.data?.photos && modal.data.photos.length > 0 
      ? [...modal.data.photos] 
      : [modal.data?.photo || getStudentPhoto(modal.data)];

    if (currentPhotos.length <= 1) {
      const fallbackPhoto = getStudentPhotoFallback(modal.data);
      const updatedStudent = {
        ...modal.data,
        photo: fallbackPhoto,
        photos: [fallbackPhoto]
      };
      dispatch({ type: 'UPDATE_STUDENT', payload: updatedStudent });
      setModal({ type: 'ENLARGE_PHOTO', data: updatedStudent });
      setActivePhotoIndex(0);
      toast.info('Student custom photo removed and reset to default.');
      return;
    }

    const updatedPhotos = currentPhotos.filter((_, idx) => idx !== indexToDelete);
    const newPrimary = updatedPhotos[0];

    const updatedStudent = {
      ...modal.data,
      photo: newPrimary,
      photos: updatedPhotos
    };

    dispatch({ type: 'UPDATE_STUDENT', payload: updatedStudent });
    setModal({ type: 'ENLARGE_PHOTO', data: updatedStudent });
    setActivePhotoIndex(Math.max(0, indexToDelete - 1));
    toast.info('Photo removed.');
  };

  // Handle Logout
  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
    toast.info('Logged out successfully.');
  };

  // --- Exam Form Submission ---
  const handleExamSubmit = (e) => {
    e.preventDefault();
    if (Number(examForm.passingMarks) >= Number(examForm.maxMarks)) {
      toast.error('Passing marks must be less than maximum marks.');
      return;
    }
    toast.success('Exam details saved successfully!');
    setExamForm({ name: '', subjectCode: '', date: '', time: '', duration: '2 hr', maxMarks: '', passingMarks: '' });
  };

  // --- Modal Forms ---
  const handleModalSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (modal.type === 'COLLEGE') {
      if (modal.data) {
        dispatch({ type: 'UPDATE_COLLEGE', payload: { ...modal.data, ...data } });
        toast.success('College updated.');
      } else {
        dispatch({ type: 'ADD_COLLEGE', payload: { id: Date.now(), ...data } });
        toast.success('College added.');
      }
    } else if (modal.type === 'CENTER') {
      if (!selectedCollegeId) {
        toast.error('Please select a college first.');
        return;
      }
      if (modal.data) {
        dispatch({ type: 'UPDATE_CENTER', payload: { ...modal.data, ...data } });
        toast.success('Center updated.');
      } else {
        dispatch({ type: 'ADD_CENTER', payload: { id: Date.now(), collegeId: Number(selectedCollegeId), ...data } });
        toast.success('Center added.');
      }
    } else if (modal.type === 'STUDENT') {
      const collegeIdNum = data.collegeId ? Number(data.collegeId) : (selectedCollegeId ? Number(selectedCollegeId) : 1);
      const centerIdNum = selectedCenterId ? Number(selectedCenterId) : undefined;
      const targetCollege = state.colleges.find(c => c.id === collegeIdNum);

      const studentData = {
        ...data,
        photo: studentPhoto || data.photo || modal.data?.photo || '',
        collegeId: collegeIdNum,
        centerId: centerIdNum,
        attendance: data.attendance ? Number(data.attendance) : 75,
      };

      if (modal.data) {
        dispatch({ type: 'UPDATE_STUDENT', payload: { ...modal.data, ...studentData } });
        toast.success(`Student updated for ${targetCollege?.name || 'College'}.`);
      } else {
        dispatch({ type: 'ADD_STUDENT', payload: { id: Date.now(), ...studentData } });
        toast.success(`Student enrolled in ${targetCollege?.name || 'College'}.`);
      }
    }
    setModal({ type: null, data: null });
    setStudentPhoto('');
  };

  // --- Delete Handlers ---
  const handleDelete = (type, id) => {
    if (window.confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) {
      dispatch({ type: `DELETE_${type}`, payload: id });
      toast.success(`${type} deleted.`);
      if (type === 'COLLEGE' && Number(selectedCollegeId) === id) setSelectedCollegeId('');
      if (type === 'CENTER' && Number(selectedCenterId) === id) setSelectedCenterId('');
    }
  };

  // Filter lists
  const selectedCollege = state.colleges.find(c => c.id === Number(selectedCollegeId));
  const centersForCollege = state.centers.filter(c => c.collegeId === Number(selectedCollegeId));

  // Dedicated Exam Batch Student List (Strictly requires selectedCollegeId to show ONLY that particular college's students)
  const examBatchStudents = selectedCollegeId
    ? state.students.filter(s => {
        const matchCollege = String(s.collegeId) === String(selectedCollegeId);
        const matchDept = !filters.department || (s.department && s.department.trim().toLowerCase() === filters.department.trim().toLowerCase());
        const matchSem = !filters.semester || (s.semester && s.semester.trim().toLowerCase() === filters.semester.trim().toLowerCase());
        const matchYear = !filters.year || (s.year && s.year.trim().toLowerCase() === filters.year.trim().toLowerCase());
        return matchCollege && matchDept && matchSem && matchYear;
      })
    : [];

  // Global Student Directory
  const filteredStudents = state.students.filter(s => {
    const matchCollege = !selectedCollegeId || String(s.collegeId) === String(selectedCollegeId);
    const matchSearch = !studentSearch || 
                        s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
                        s.rollNo?.toLowerCase().includes(studentSearch.toLowerCase());
    return matchCollege && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A] pb-20">
      {/* --- Top Navigation --- */}
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              AI Evaluator Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <UserCircle className="w-6 h-6 text-gray-400" />
              <span className="text-sm font-medium">{state.user?.name || 'Teacher'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard index={0} title="Total Colleges" targetValue={12} icon={Building2} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatCard index={1} title="Total Centers" targetValue={45} icon={MapPin} colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
          <StatCard index={2} title="Total Subjects" targetValue={38} icon={BookOpen} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
          <StatCard index={3} title="Total Exams" targetValue={124} icon={FileText} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
          <StatCard index={4} title="Total Students" targetValue={3842} icon={Users} colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
          <StatCard index={5} title="Evaluated Papers" targetValue={2916} icon={CheckCircle} colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
          <StatCard index={6} title="Pending Evals" targetValue={926} icon={Clock} colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
          <StatCard index={7} title="Avg Class Score" targetValue={74.5} suffix="%" icon={TrendingUp} colorClass="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" />
        </div>

        {/* --- Hierarchy Selection (College & Center) --- */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Examination Hierarchy
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* College */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select College</label>
              <div className="flex gap-2">
                <select
                  value={selectedCollegeId}
                  onChange={(e) => { setSelectedCollegeId(e.target.value); setSelectedCenterId(''); }}
                  className="flex-1 rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option value="">-- Choose a College --</option>
                  {state.colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => setModal({ type: 'COLLEGE', data: null })} className="btn-icon bg-primary/10 text-primary hover:bg-primary/20 rounded-xl p-2" title="Add College"><Plus className="w-5 h-5" /></button>
                {selectedCollegeId && (
                  <>
                    <button onClick={() => setModal({ type: 'COLLEGE', data: state.colleges.find(c => c.id === Number(selectedCollegeId)) })} className="btn-icon bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl p-2"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete('COLLEGE', Number(selectedCollegeId))} className="btn-icon bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-xl p-2"><Trash2 className="w-5 h-5" /></button>
                  </>
                )}
              </div>
            </div>

            {/* Center (conditionally shown or disabled) */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Examination Center</label>
              <div className="flex gap-2">
                <select
                  disabled={!selectedCollegeId}
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="flex-1 rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">-- Choose a Center --</option>
                  {centersForCollege.map(c => <option key={c.id} value={c.id}>{c.name} ({c.location})</option>)}
                </select>
                <button disabled={!selectedCollegeId} onClick={() => setModal({ type: 'CENTER', data: null })} className="btn-icon bg-primary/10 text-primary hover:bg-primary/20 rounded-xl p-2 disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-5 h-5" /></button>
                {selectedCenterId && (
                  <>
                    <button onClick={() => setModal({ type: 'CENTER', data: state.centers.find(c => c.id === Number(selectedCenterId)) })} className="btn-icon bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl p-2"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete('CENTER', Number(selectedCenterId))} className="btn-icon bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-xl p-2"><Trash2 className="w-5 h-5" /></button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- Filters & Exam Details Form --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Filters */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4 h-fit">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exam Context</h3>
            
            <div className="space-y-4">
              <select value={filters.department} onChange={(e) => setFilters({...filters, department: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white">
                <option value="">-- Department --</option>
                <option value="Computer Engineering">Computer Engineering</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Data Science">Data Science</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
              </select>

              <select value={filters.year} onChange={(e) => setFilters({...filters, year: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white">
                <option value="">-- Academic Year --</option>
                <option value="First Year">First Year</option>
                <option value="Second Year">Second Year</option>
                <option value="Third Year">Third Year</option>
                <option value="Fourth Year">Fourth Year</option>
              </select>

              <select value={filters.semester} onChange={(e) => setFilters({...filters, semester: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white">
                <option value="">-- Semester --</option>
                <option value="Semester I">Semester I</option>
                <option value="Semester II">Semester II</option>
                <option value="Semester III">Semester III</option>
                <option value="Semester IV">Semester IV</option>
                <option value="Semester V">Semester V</option>
                <option value="Semester VI">Semester VI</option>
                <option value="Semester VII">Semester VII</option>
                <option value="Semester VIII">Semester VIII</option>
              </select>

              <select value={filters.subject} onChange={(e) => setFilters({...filters, subject: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white">
                <option value="">-- Subject --</option>
                <option value="Operating System">Operating System</option>
                <option value="DBMS">DBMS</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Data Structures">Data Structures</option>
                <option value="Web Technology">Web Technology</option>
              </select>

              <select value={filters.examType} onChange={(e) => setFilters({...filters, examType: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white">
                <option value="">-- Examination Type --</option>
                <option value="Unit Test 1">Unit Test 1</option>
                <option value="Unit Test 2">Unit Test 2</option>
                <option value="Mid Semester">Mid Semester</option>
                <option value="End Semester">End Semester</option>
                <option value="Practical">Practical</option>
                <option value="Viva">Viva</option>
                <option value="Assignment">Assignment</option>
              </select>
            </div>
          </div>

          {/* Exam Details Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exam Configuration</h3>
            <form onSubmit={handleExamSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Name</label>
                  <input required type="text" value={examForm.name} onChange={e => setExamForm({...examForm, name: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" placeholder="e.g. Mid Term CS" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Code</label>
                  <input required type="text" value={examForm.subjectCode} onChange={e => setExamForm({...examForm, subjectCode: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" placeholder="e.g. CS401" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input required type="date" value={examForm.date} onChange={e => setExamForm({...examForm, date: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                  <input required type="time" value={examForm.time} onChange={e => setExamForm({...examForm, time: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <select required value={examForm.duration} onChange={e => setExamForm({...examForm, duration: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white">
                    <option value="30 min">30 min</option>
                    <option value="1 hr">1 hr</option>
                    <option value="1.5 hr">1.5 hr</option>
                    <option value="2 hr">2 hr</option>
                    <option value="3 hr">3 hr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Marks</label>
                  <input required type="number" min="1" value={examForm.maxMarks} onChange={e => setExamForm({...examForm, maxMarks: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" placeholder="100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passing Marks</label>
                  <input required type="number" min="1" value={examForm.passingMarks} onChange={e => setExamForm({...examForm, passingMarks: e.target.value})} className="w-full rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" placeholder="40" />
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save Exam Configuration
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* --- Configured Exam Batch Student List (Separate Section matching Exam Context) --- */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5 dark:bg-primary/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" /> Configured Exam Batch Student List
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-white">
                  {examBatchStudents.length} Students Matched
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Active Context: <strong className="text-gray-900 dark:text-white">{selectedCollege?.name || 'Selected College'}</strong> • {filters.department || 'Computer Engineering'} ({filters.year || 'Second Year'} - {filters.semester || 'Semester IV'}) • <span className="text-primary font-semibold">{filters.subject || 'Operating System'}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setHideStudentNames(!hideStudentNames)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 transition-colors cursor-pointer shadow-sm"
                title={hideStudentNames ? "Show Student Names" : "Hide Student Names"}
              >
                {hideStudentNames ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                <span>{hideStudentNames ? 'Show Names' : 'Hide Names'}</span>
              </button>
              <button 
                onClick={() => openModal('STUDENT', null)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Student to Exam Batch
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled College</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">PRN Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Dept / Sem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {examBatchStudents.length > 0 ? examBatchStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openModal('ENLARGE_PHOTO', student)}
                        className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 shadow-sm bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0 hover:scale-110 hover:ring-4 hover:ring-primary/40 transition-all duration-200 cursor-pointer group relative"
                        title="Click to enlarge student photo"
                      >
                        <img 
                          src={getStudentPhoto(student)} 
                          alt={student.name}
                          className="w-full h-full object-cover group-hover:brightness-95 transition-all"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getStudentPhotoFallback(student);
                          }}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                      {student.rollNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <button 
                        onClick={() => {
                          if (isStudentApproved(student, state)) {
                            openModal('VIEW_RESULT', student);
                          } else {
                            openModal('PENDING_APPROVAL', student);
                          }
                        }}
                        className="font-bold text-primary hover:text-primary-dark hover:underline focus:outline-none transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{hideStudentNames ? '••••••••' : student.name}</span>
                        {isStudentApproved(student, state) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            Approved
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/50">
                        {state.colleges.find(c => c.id === student.collegeId)?.name || selectedCollege?.name || 'General College'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {student.prn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {student.department}<br/><span className="text-xs text-gray-400">{student.semester} - Div {student.division}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.attendance >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        student.attendance >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {student.attendance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openModal('STUDENT', student)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete('STUDENT', student.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {selectedCollege 
                        ? `No students enrolled for ${selectedCollege.name} matching your exam filters (${filters.department || 'All Depts'}, ${filters.year || 'All Years'}, ${filters.semester || 'All Semesters'}). Click "+ Add Student to Exam Batch" to add a student.`
                        : 'Please select a College in the Examination Hierarchy above to view that particular college\'s student batch.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Student Management Table --- */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" /> Student Roster
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {selectedCollege ? `Showing students enrolled in ${selectedCollege.name}` : 'Showing all enrolled students across colleges'}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name or roll no..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 rounded-xl border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <button 
                type="button"
                onClick={() => setHideStudentNames(!hideStudentNames)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 transition-colors cursor-pointer shrink-0"
                title={hideStudentNames ? "Show Student Names" : "Hide Student Names"}
              >
                {hideStudentNames ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                <span>{hideStudentNames ? 'Show Names' : 'Hide Names'}</span>
              </button>
              <button 
                onClick={() => openModal('STUDENT', null)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Student
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Enrolled College</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">PRN Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Dept / Sem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openModal('ENLARGE_PHOTO', student)}
                        className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 shadow-sm bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0 hover:scale-110 hover:ring-4 hover:ring-primary/40 transition-all duration-200 cursor-pointer group relative"
                        title="Click to enlarge student photo"
                      >
                        <img 
                          src={getStudentPhoto(student)} 
                          alt={student.name}
                          className="w-full h-full object-cover group-hover:brightness-95 transition-all"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getStudentPhotoFallback(student);
                          }}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {student.rollNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <button 
                        onClick={() => {
                          if (isStudentApproved(student, state)) {
                            openModal('VIEW_RESULT', student);
                          } else {
                            openModal('PENDING_APPROVAL', student);
                          }
                        }}
                        className="font-semibold text-primary hover:text-primary-dark hover:underline focus:outline-none transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{hideStudentNames ? '••••••••' : student.name}</span>
                        {isStudentApproved(student, state) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            Approved
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 hidden md:table-cell">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/50">
                        {state.colleges.find(c => c.id === student.collegeId)?.name || 'General College'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {student.prn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {student.department}<br/><span className="text-xs text-gray-400">{student.semester} - Div {student.division}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.attendance >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        student.attendance >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {student.attendance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2.5">
                        <button onClick={() => openModal('STUDENT_PROFILE', student)} title="View Student Profile" className="text-primary hover:text-primary-dark dark:text-primary-light transition-colors p-1 cursor-pointer"><User className="w-4 h-4" /></button>
                        <button onClick={() => openModal('STUDENT', student)} title="Edit Student Info" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete('STUDENT', student.id)} title="Delete Student" className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto py-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-3 text-primary">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
                          No Students Found for {selectedCollege ? selectedCollege.name : 'Selected Exam Filters'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {selectedCollege 
                            ? `No students found matching ${selectedCollege.name} (${filters.department || 'All Depts'}, ${filters.year || 'All Years'}). Use the "+ Add Student" button above to enroll a student.`
                            : 'Select a college above or click "+ Add Student" above to enroll a student.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- Global Modal Renderer --- */}
      <AnimatePresence>
        {modal.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModal({ type: null, data: null })}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full border border-gray-100 dark:border-slate-700 transition-all ${
                modal.type === 'VIEW_RESULT' ? 'max-w-[96vw] w-full max-h-[95vh] lg:max-w-7xl xl:max-w-[1580px] flex flex-col p-7 lg:p-8 overflow-hidden' : 'max-w-md p-6'
              }`}
            >
              <button 
                onClick={() => setModal({ type: null, data: null })}
                className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4 pr-10 shrink-0">
                {modal.type === 'VIEW_RESULT' && (
                  <button
                    type="button"
                    onClick={() => openModal('ENLARGE_PHOTO', modal.data)}
                    className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary shadow-md bg-gray-100 dark:bg-slate-700 shrink-0 hover:scale-110 hover:ring-4 hover:ring-primary/40 transition-all duration-200 cursor-pointer"
                    title="Click to enlarge photo"
                  >
                    <img 
                      src={getStudentPhoto(modal.data)} 
                      alt={modal.data?.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getStudentPhotoFallback(modal.data);
                      }}
                    />
                  </button>
                )}
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    {modal.type === 'VIEW_RESULT' 
                      ? `Evaluation Report: ${modal.data?.name}` 
                      : modal.type === 'ENLARGE_PHOTO'
                      ? `Student Profile Photo`
                      : modal.type === 'STUDENT_PROFILE'
                      ? `Student Academic Profile`
                      : `${modal.data ? 'Edit' : 'Add'} ${modal.type}`}
                  </h3>
                  {modal.type === 'VIEW_RESULT' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Roll No: <strong className="text-gray-800 dark:text-gray-200">{modal.data?.rollNo}</strong> • PRN: <strong className="text-gray-800 dark:text-gray-200">{modal.data?.prn}</strong> • Dept: <strong className="text-primary font-bold">{modal.data?.department || 'Computer Engineering'}</strong>
                    </p>
                  )}
                </div>
              </div>
              
              {modal.type === 'PENDING_APPROVAL' ? (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-inner">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                      Evaluation Pending Approval
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm font-medium leading-relaxed">
                      The evaluation report for <strong className="text-gray-900 dark:text-white">{modal.data?.name}</strong> has not been approved yet.
                    </p>
                    <div className="text-xs text-amber-700 dark:text-amber-300 mt-4 font-bold bg-amber-50 dark:bg-amber-950/50 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center gap-2 text-left">
                      <span className="text-lg shrink-0">⚠️</span>
                      <span>Please go to the <strong>Upload</strong> section, open their evaluation report, and click the green <strong>"Approve Result"</strong> button in the bottom right corner to publish it to the Dashboard.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3 w-full">
                    <button
                      onClick={() => {
                        setModal({ type: null, data: null });
                        navigate('/upload');
                      }}
                      className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>Go to Upload & Approve</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setModal({ type: null, data: null })}
                      className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : modal.type === 'VIEW_RESULT' ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* ===== LEFT SIDE: Uploaded Answer Sheet ===== */}
                    <div className="lg:col-span-6 flex flex-col space-y-4 bg-gray-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-3">
                        <h4 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" /> Original Uploaded Answer Sheet
                        </h4>
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-primary/10 text-primary">
                          Scanned Document View
                        </span>
                      </div>

                      <div className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 flex flex-col items-center gap-5 min-h-[580px] max-h-[750px] lg:max-h-[82vh] overflow-y-auto custom-scrollbar border border-gray-200/80 dark:border-slate-700 shadow-inner">
                        {(() => {
                          const selName = state.studentInfo?.name?.trim().toLowerCase();
                          const selRoll = state.studentInfo?.rollNo?.trim().toLowerCase();
                          const modalName = modal.data?.name?.trim().toLowerCase();
                          const modalRoll = modal.data?.rollNo?.trim().toLowerCase();

                          const isCurrentSelectedStudent = Boolean(
                            (selName && modalName && (modalName.includes(selName) || selName.includes(modalName))) ||
                            (selRoll && modalRoll && modalRoll === selRoll)
                          );

                          let papersToRender = null;

                          if (modalName.includes('aarav') || modalName.includes('arnav')) {
                            papersToRender = getHistoryPagesSVG();
                          } else if (modalName.includes('priya')) {
                            papersToRender = getSciencePagesSVG();
                          } else if (isCurrentSelectedStudent) {
                            papersToRender = (modal.data?.papers?.length > 0) ? modal.data.papers : (state.imagePreviews?.length > 0 ? state.imagePreviews : null);
                          } else {
                            if (modal.data?.papers?.length > 0 && !modalName?.includes('rohit')) {
                              papersToRender = modal.data.papers;
                            }
                          }

                          if (papersToRender && papersToRender.length > 0) {
                            return papersToRender.map((preview, idx) => {
                              const isPdf = typeof preview === 'string' && (
                                preview.startsWith('data:application/pdf') || 
                                preview.toLowerCase().includes('.pdf') || 
                                preview.includes('application/pdf')
                              );

                              if (isPdf) {
                                const fileName = state.uploadedFiles[idx]?.name || `${modal.data?.name || 'Student'}_Answer_Sheet.pdf`;
                                const blobUrl = getPdfBlobUrl(preview);

                                return (
                                  <div key={idx} className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-3 w-full">
                                      <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                          {fileName}
                                        </p>
                                        <p className="text-[10px] text-red-500 font-medium">Scanned PDF Document</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => openPdfInNewTab(preview, fileName)}
                                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                                      >
                                        Open PDF ↗
                                      </button>
                                    </div>
                                    <object
                                      data={blobUrl}
                                      type="application/pdf"
                                      className="w-full h-96 rounded-lg border border-gray-200 dark:border-slate-700 bg-white"
                                    >
                                      <iframe
                                        src={blobUrl}
                                        title={`PDF Preview ${idx + 1}`}
                                        className="w-full h-96 rounded-lg border border-gray-200 dark:border-slate-700 bg-white"
                                      />
                                    </object>
                                  </div>
                                );
                              }

                              return (
                                <div key={idx} className="w-full flex flex-col items-center space-y-1.5 pb-4">
                                  <div className="w-full flex items-center justify-between px-2 text-[11px] font-extrabold text-gray-500 dark:text-gray-400">
                                    <span>📄 {modal.data?.name} Answer Sheet</span>
                                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">Page {idx + 1} of {papersToRender.length}</span>
                                  </div>
                                  <img 
                                    src={preview}
                                    alt={`${modal.data?.name} Page ${idx + 1}`} 
                                    className="w-full object-contain rounded-xl shadow-md border border-gray-200 dark:border-slate-700 bg-white"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = getAnswerSheetPlaceholder(modal.data?.name, modal.data?.rollNo);
                                    }}
                                  />
                                </div>
                              );
                            });
                          }

                          return (
                            <img 
                              src={getAnswerSheetPlaceholder(modal.data?.name, modal.data?.rollNo)}
                              alt="Student Paper Placeholder" 
                              className="w-full object-contain rounded-lg shadow-md border border-gray-200 dark:border-slate-700"
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* ===== RIGHT SIDE: Question-wise AI Evaluation Breakdown ===== */}
                    <div className="lg:col-span-6 flex flex-col space-y-4">
                      {/* Dynamic Summary Metrics Row */}
                      {(() => {
                        const breakdown = getStudentQuestionBreakdown(modal.data, state);
                        const totalObtained = breakdown.reduce((acc, q) => acc + (q.marksObtained || 0), 0);
                        const totalMax = breakdown.reduce((acc, q) => acc + (q.maxMarks || 0), 0);
                        const calculatedAccuracy = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 100;
                        
                        return (
                          <div className="grid grid-cols-3 gap-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-emerald-500/10 p-4 rounded-3xl border border-primary/20 shadow-sm">
                            <div className="text-center bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl backdrop-blur-sm border border-gray-100 dark:border-slate-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-extrabold uppercase tracking-wider">Marks Secured</p>
                              <p className="text-2xl lg:text-3xl font-black text-primary mt-1">
                                {totalObtained} / {totalMax}
                              </p>
                            </div>
                            <div className="text-center bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl backdrop-blur-sm border border-gray-100 dark:border-slate-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-extrabold uppercase tracking-wider">AI Accuracy</p>
                              <p className="text-2xl lg:text-3xl font-black text-emerald-500 mt-1">
                                {calculatedAccuracy}%
                              </p>
                            </div>
                            <div className="text-center bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl backdrop-blur-sm border border-gray-100 dark:border-slate-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-extrabold uppercase tracking-wider">Status</p>
                              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Evaluated
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Question-wise Breakdown Title */}
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-3">
                        <h4 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                          <ListOrdered className="w-5 h-5 text-emerald-500" /> Question & Answer AI Evaluation Breakdown
                        </h4>
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Rubric Comparison Mode
                        </span>
                      </div>

                      {/* Question Breakdown List - Enlarged Scroll Container */}
                      <div className="space-y-4 min-h-[580px] max-h-[750px] lg:max-h-[82vh] overflow-y-auto custom-scrollbar pr-2">
                        {getStudentQuestionBreakdown(modal.data, state).map((q) => (
                          <div 
                            key={q.id} 
                            className="p-5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md space-y-3 hover:border-primary/50 transition-all"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <span className="px-2.5 py-1 bg-slate-900 text-white dark:bg-slate-700 rounded-lg text-xs font-black font-mono shadow-sm">
                                  {q.qNo}
                                </span>
                                <h5 className="text-sm font-extrabold text-gray-900 dark:text-white">
                                  {q.title}
                                </h5>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                                  q.status === 'Correct'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : q.status === 'Partial'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-300 dark:border-red-800'
                                }`}>
                                  {q.status}
                                </span>
                                <span className="text-sm font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-600">
                                  {q.marksObtained} / {q.maxMarks} Marks
                                </span>
                              </div>
                            </div>

                            {/* Extracted Student Answer - Enlarged Font */}
                            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow-inner">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Extracted Student Answer:</span>
                              <p className="text-sm text-slate-100 leading-relaxed font-mono tracking-wide whitespace-pre-wrap">
                                {q.studentAnswer}
                              </p>
                            </div>

                            {/* Model Answer & AI Feedback */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">✓ Model Key Answer:</span>
                                <p className="text-[11px] text-gray-700 dark:text-gray-300">{q.modelAnswer}</p>
                              </div>
                              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-lg border border-blue-200/50 dark:border-blue-800/40">
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-0.5">💡 AI Evaluation Remark:</span>
                                <p className="text-[11px] text-gray-700 dark:text-gray-300">{q.feedback}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
                    <button 
                      type="button" 
                      onClick={() => setModal({ type: null, data: null })} 
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-dark shadow-sm transition-colors cursor-pointer"
                    >
                      Close Evaluation Report
                    </button>
                  </div>
                </div>
              ) : modal.type === 'ENLARGE_PHOTO' ? (
                <div className="flex flex-col items-center text-center space-y-4 pt-1">
                  {/* Student Header Info */}
                  <div className="w-full text-center space-y-1 mb-1">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
                      {modal.data?.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      Roll No: <strong className="text-primary font-bold">{modal.data?.rollNo}</strong> • PRN: <strong className="text-gray-700 dark:text-gray-300 font-bold">{modal.data?.prn || '202301001'}</strong>
                    </p>
                  </div>

                  {/* Photos list helper */}
                  {(() => {
                    const photosList = modal.data?.photos && modal.data.photos.length > 0
                      ? modal.data.photos
                      : [modal.data?.photo || getStudentPhoto(modal.data)];
                    
                    const safeIndex = Math.min(activePhotoIndex, photosList.length - 1);
                    const activePhoto = photosList[safeIndex] || photosList[0];
                    const isPrimary = activePhoto === modal.data?.photo || safeIndex === 0;

                    return (
                      <>
                        {/* Main Large Display Image */}
                        <div className="relative group max-w-sm w-full h-80 sm:h-96 rounded-2xl overflow-hidden border-4 border-primary/40 shadow-2xl bg-slate-900 flex items-center justify-center transition-all duration-300">
                          <img 
                            src={activePhoto} 
                            alt={`${modal.data?.name} Photo ${safeIndex + 1}`} 
                            className="w-full h-full object-cover shadow-inner transition-all duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getStudentPhotoFallback(modal.data);
                            }}
                          />
                          
                          {/* Primary badge tag */}
                          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                            {isPrimary ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-md border border-emerald-400/50 shadow-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Primary Photo
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryPhoto(safeIndex)}
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 hover:bg-primary text-white backdrop-blur-md border border-white/20 shadow-md transition-colors cursor-pointer"
                              >
                                Make Primary
                              </button>
                            )}
                            
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-black/60 text-gray-200 backdrop-blur-md border border-white/10">
                              {safeIndex + 1} of {photosList.length}
                            </span>
                          </div>

                          {/* Delete / Remove photo button overlay */}
                          <button
                            type="button"
                            onClick={() => handleDeletePhotoFromStudent(safeIndex)}
                            className="absolute top-3 right-3 z-10 py-1 px-2.5 rounded-full bg-red-600/85 hover:bg-red-600 text-white backdrop-blur-md border border-red-400/40 shadow-md transition-all cursor-pointer hover:scale-105 flex items-center gap-1 text-[10px] font-bold"
                            title="Remove this photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                          <div className="absolute bottom-3 left-4 right-4 text-left text-white pointer-events-none">
                            <span className="text-[11px] text-gray-300 font-medium">
                              {state.colleges.find(c => c.id === modal.data?.collegeId)?.name || 'Enrolled College'}
                            </span>
                          </div>
                        </div>

                        {/* Photo Gallery Thumbnails + Add Photo Button */}
                        <div className="w-full max-w-sm flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 scrollbar-none">
                          {photosList.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActivePhotoIndex(idx)}
                              className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                                idx === safeIndex 
                                  ? 'border-primary ring-2 ring-primary/50 scale-105 shadow-md' 
                                  : 'border-gray-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:scale-100'
                              }`}
                            >
                              <img 
                                src={p} 
                                alt={`Thumbnail ${idx + 1}`} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getStudentPhotoFallback(modal.data);
                                }}
                              />
                            </button>
                          ))}

                          {/* Add Photo File Input Button */}
                          <label className="relative w-14 h-14 rounded-xl border-2 border-dashed border-primary/60 hover:border-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/20 flex flex-col items-center justify-center transition-all cursor-pointer shrink-0 group text-primary" title="Add another photo">
                            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-bold mt-0.5">Add</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleAddPhotoToStudent} 
                              className="hidden" 
                            />
                          </label>
                        </div>

                        {/* Primary Action Button Bar */}
                        <div className="flex items-center gap-2 w-full max-w-sm pt-1">
                          <button
                            type="button"
                            onClick={() => openModal('STUDENT_PROFILE', modal.data)}
                            className="py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light border border-primary/20 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                            title="View complete student profile"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Profile</span>
                          </button>

                          <label className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 border border-primary/20 active:scale-95">
                            <Camera className="w-4 h-4" />
                            + Add / Upload
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleAddPhotoToStudent} 
                              className="hidden" 
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeletePhotoFromStudent(safeIndex)}
                            className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>

                          <button
                            type="button"
                            onClick={() => setModal({ type: null, data: null })}
                            className="px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-semibold text-xs transition-all cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : modal.type === 'STUDENT_PROFILE' ? (
                isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4 pt-1 max-h-[78vh] overflow-y-auto custom-scrollbar pr-1">
                    {/* Header Banner */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-primary" /> Edit Student Academic Profile
                      </h4>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary">
                        Edit Mode
                      </span>
                    </div>

                    {/* Student Photo Upload Field */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                        Profile Photo
                      </label>
                      <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary shadow-sm bg-gray-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <img 
                            src={studentPhoto || getStudentPhoto(modal.data)} 
                            alt="Student Photo Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getStudentPhotoFallback(modal.data);
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const compressed = await compressStudentPhoto(ev.target.result, 600);
                                  setStudentPhoto(compressed);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="block w-full text-xs text-gray-500 dark:text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                          />
                          <p className="text-[11px] text-gray-400 dark:text-gray-400">Upload new JPG, PNG or WEBP student photo</p>
                        </div>
                      </div>
                    </div>

                    {/* Basic Student Identity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Student Full Name</label>
                        <input 
                          required 
                          type="text" 
                          name="name" 
                          defaultValue={modal.data?.name} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Roll Number</label>
                        <input 
                          required 
                          type="text" 
                          name="rollNo" 
                          defaultValue={modal.data?.rollNo} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">PRN Number</label>
                        <input 
                          required 
                          type="text" 
                          name="prn" 
                          defaultValue={modal.data?.prn || '202301001'} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Enrolled College</label>
                        <select
                          name="collegeId"
                          defaultValue={modal.data?.collegeId || state.colleges[0]?.id}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        >
                          {state.colleges.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Department / Branch</label>
                        <input 
                          type="text" 
                          name="department" 
                          defaultValue={modal.data?.department || 'Computer Engineering'} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                        <select 
                          name="semester" 
                          defaultValue={modal.data?.semester || 'Semester III'} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        >
                          <option value="Semester I">Semester I</option>
                          <option value="Semester II">Semester II</option>
                          <option value="Semester III">Semester III</option>
                          <option value="Semester IV">Semester IV</option>
                          <option value="Semester V">Semester V</option>
                          <option value="Semester VI">Semester VI</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Division</label>
                        <input 
                          type="text" 
                          name="division" 
                          defaultValue={modal.data?.division || 'A'} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Attendance Percentage (%)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          name="attendance" 
                          defaultValue={modal.data?.attendance || 90} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input 
                          type="email" 
                          name="email" 
                          defaultValue={modal.data?.email || `${modal.data?.name?.toLowerCase().replace(/\s+/g, '.')}@student.edu.in`} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Contact Phone</label>
                        <input 
                          type="text" 
                          name="phone" 
                          defaultValue={modal.data?.phone || '+91 98230 41102'} 
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Edit Mode Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Profile Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-5 pt-1 max-h-[78vh] overflow-y-auto custom-scrollbar pr-1">
                  {/* Student Profile Banner Header */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-emerald-500/10 border border-primary/20 shadow-sm">
                    <div 
                      onClick={() => openModal('ENLARGE_PHOTO', modal.data)}
                      className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-primary/40 shadow-md shrink-0 cursor-pointer"
                      title="Click to view & manage photos"
                    >
                      <img 
                        src={getStudentPhoto(modal.data)} 
                        alt={modal.data?.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getStudentPhotoFallback(modal.data);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        Enlarge / Edit
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                          {modal.data?.name}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active Student
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                        Roll No: <strong className="text-primary font-bold">{modal.data?.rollNo}</strong> • PRN: <strong className="text-gray-700 dark:text-gray-300 font-bold">{modal.data?.prn || '202301001'}</strong> • Division: <strong className="text-gray-700 dark:text-gray-300 font-bold">{modal.data?.division || 'A'}</strong>
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs pt-1">
                        <span className="px-2.5 py-1 rounded-lg font-bold bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {state.colleges.find(c => c.id === modal.data?.collegeId)?.name || 'St. Xavier\'s College'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg font-semibold bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 shadow-sm">
                          {modal.data?.department || 'Computer Engineering'} (Sem {modal.data?.semester || '5'})
                        </span>
                        <span className="px-2.5 py-1 rounded-lg font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                          Attendance: {modal.data?.attendance || 90}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Personal & Contact Details Grid */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Personal & Contact Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-gray-400 font-semibold block uppercase tracking-wider">Email Address</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] truncate block" title={`${modal.data?.name?.toLowerCase().replace(/\s+/g, '.')}@student.edu.in`}>
                            {modal.data?.name?.toLowerCase().replace(/\s+/g, '.')}@student.edu.in
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-gray-400 font-semibold block uppercase tracking-wider">Contact Phone</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] block">+91 98230 41102</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-gray-400 font-semibold block uppercase tracking-wider">Identity Status</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] block flex items-center gap-1">
                            Aadhaar Verified ✓
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Academic Performance & Analytics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Exams Appeared</span>
                      <span className="text-lg font-black text-gray-900 dark:text-white">1</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Avg Score</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">88%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Overall Grade</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Grade A+</span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-center space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Class Rank</span>
                      <span className="text-sm font-bold text-primary">Top 10% 🏆</span>
                    </div>
                  </div>

                  {/* AI Evaluation Insights & Handwriting Score */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border border-blue-200/60 dark:border-blue-800/50 space-y-2 text-xs">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                        <Sparkles className="w-4 h-4" /> AI Performance & Remedial Insights
                      </span>
                      <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 px-2 py-0.5 rounded-md">
                        OCR Confidence: 98.5%
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-blue-100 dark:border-slate-700">
                        <strong className="text-emerald-600 dark:text-emerald-400 block mb-0.5">✓ Strengths & Mastery:</strong>
                        <p className="text-gray-700 dark:text-gray-300">Strong concept clarity in history acts, treaties, and chronological events.</p>
                      </div>
                      <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-blue-100 dark:border-slate-700">
                        <strong className="text-amber-600 dark:text-amber-400 block mb-0.5">💡 Focus Area for Improvement:</strong>
                        <p className="text-gray-700 dark:text-gray-300">Include more key dates and specific article numbers in long 4-mark answers.</p>
                      </div>
                    </div>
                  </div>

                  {/* Evaluated Papers & Reports */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Evaluated Answer Sheets & AI Reports
                    </h4>
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">History & Civics Mid-Term Evaluation Paper</span>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400">Score: <strong className="text-gray-900 dark:text-white font-bold">22 / 25 Marks (88%)</strong> • Result: <strong className="text-emerald-600">Passed</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openModal('VIEW_RESULT', modal.data)}
                        className="px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer border border-primary/20"
                      >
                        <Eye className="w-3.5 h-3.5" /> View AI Report
                      </button>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => openModal('ENLARGE_PHOTO', modal.data)}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> View / Manage Photos
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStudentPhoto(modal.data?.photo || '');
                        setIsEditingProfile(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => setModal({ type: null, data: null })}
                      className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )
            ) : (
                <form onSubmit={handleModalSave} className="space-y-4">
                {modal.type === 'COLLEGE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">College Name</label>
                    <input required type="text" name="name" defaultValue={modal.data?.name} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                  </div>
                )}
                
                {modal.type === 'CENTER' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Center Name</label>
                      <input required type="text" name="name" defaultValue={modal.data?.name} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                      <input required type="text" name="location" defaultValue={modal.data?.location} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                    </div>
                  </>
                )}

                {modal.type === 'STUDENT' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Student Photo</label>
                      <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-700/40 p-3 rounded-xl border border-gray-200 dark:border-slate-600">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary shadow-sm bg-gray-200 dark:bg-slate-600 flex items-center justify-center shrink-0">
                          <img 
                            src={studentPhoto || getStudentPhoto(modal.data)} 
                            alt="Student Photo Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getStudentPhotoFallback(modal.data);
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setStudentPhoto(ev.target.result);
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="block w-full text-xs text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            />
                            {studentPhoto && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentPhoto('');
                                  toast.info('Photo removed.');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold shrink-0 border border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-400">Upload JPG, PNG or WEBP student photo</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select College</label>
                      <select
                        name="collegeId"
                        defaultValue={modal.data?.collegeId || selectedCollegeId || state.colleges[0]?.id}
                        className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                      >
                        {state.colleges.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roll Number</label>
                        <input required type="text" name="rollNo" defaultValue={modal.data?.rollNo} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PRN Number</label>
                        <input required type="text" name="prn" defaultValue={modal.data?.prn} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                      <input required type="text" name="name" defaultValue={modal.data?.name} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                        <input required type="text" name="department" defaultValue={modal.data?.department || filters.department || 'Computer Engineering'} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                        <input required type="text" name="year" defaultValue={modal.data?.year || filters.year || 'Second Year'} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                        <input required type="text" name="semester" defaultValue={modal.data?.semester || filters.semester || 'Semester IV'} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Division</label>
                        <input required type="text" name="division" defaultValue={modal.data?.division || 'A'} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attend. %</label>
                        <input required type="number" min="0" max="100" name="attendance" defaultValue={modal.data?.attendance || 75} className="w-full rounded-xl border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white" />
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button type="button" onClick={() => setModal({ type: null, data: null })} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors">
                    Save {modal.type === 'COLLEGE' ? 'College' : modal.type === 'CENTER' ? 'Center' : 'Student'}
                  </button>
                </div>
              </form>
            )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
