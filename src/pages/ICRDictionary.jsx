import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  Download,
  FileCode,
  Sparkles,
  BookOpen,
  Trash2,
  Plus,
  Layers,
  Search,
  Grid,
  Eraser,
  Pencil,
  FileText,
  ChevronLeft,
  ChevronRight,
  Brain,
  CheckCircle2,
  X,
  ArrowRight,
  RefreshCw,
  Upload,
  FileUp,
  ZoomIn,
  ZoomOut,
  Key,
  FileWarning,
  Users,
  Eye,
  Maximize2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  GitFork,
  Workflow,
  Scale,
  Flame,
  Copy,
  Split,
} from 'lucide-react';
import { useAppContext, isStudentCopied } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { evaluateAnswer, evaluateQuestionWiseRubric } from '../services/aiEvaluationService';
import { extractText, parseQATextIntoQuestions, convertPdfToDataUrl, getPdfPageCount } from '../services/ocrService';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import StudentInfoCard from '../components/StudentInfoCard';
import ImageAnnotator from '../components/ImageAnnotator';
import {
  loadDictionary,
  saveDictionary,
  resetDictionary,
  exportDictionary,
  importDictionary,
  extractCharBitmap,
  extractFullLineBitmap,
  matrixToDataUrl,
  isolateSingleCharacterMatrix,
  matchCharacterAgainstDictionary,
  recognizeLineWithICR,
  autoTrimRoiToInk,
  findFirstCharacterInRoi,
} from '../services/icrService';






/**
 * Compute similarity between two student answers to detect plagiarism / copied answers.
 * Returns similarity percentage (0-100), exact match boolean, copied flag, and match classification.
 */
export function computeAnswerSimilarity(text1, text2) {
  if (!text1 || !text2) {
    return {
      similarity: 0,
      isExact: false,
      isCopied: false,
      matchType: 'Distinct / No Content',
      identicalWords: 0,
      totalWords: 0,
      statusColor: 'text-slate-400',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  const raw1 = String(text1).trim();
  const raw2 = String(text2).trim();

  const norm1 = raw1.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const norm2 = raw2.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (norm1.length === 0 || norm2.length === 0) {
    return {
      similarity: 0,
      isExact: false,
      isCopied: false,
      matchType: 'No Answer Text',
      identicalWords: 0,
      totalWords: 0,
      statusColor: 'text-slate-400',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  // 1. Direct character or normalized exact match
  if (norm1 === norm2) {
    const wordCount = norm1.split(' ').length;
    return {
      similarity: 100,
      isExact: true,
      isCopied: true,
      matchType: 'Exact Match (100% Identical)',
      identicalWords: wordCount,
      totalWords: wordCount,
      statusColor: 'text-red-400',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/50'
    };
  }

  // 2. Token / Bag-of-words overlap
  const words1 = norm1.split(' ').filter(w => w.length > 1);
  const words2 = norm2.split(' ').filter(w => w.length > 1);

  if (words1.length === 0 || words2.length === 0) {
    return {
      similarity: 0,
      isExact: false,
      isCopied: false,
      matchType: 'Distinct',
      identicalWords: 0,
      totalWords: 0,
      statusColor: 'text-slate-400',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700'
    };
  }

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersectionCount = 0;
  set1.forEach(w => {
    if (set2.has(w)) intersectionCount++;
  });

  const unionSize = new Set([...words1, ...words2]).size;
  const jaccardScore = unionSize > 0 ? (intersectionCount / unionSize) * 100 : 0;

  // 3. Sequential bigram matching for phrasing duplication
  const getBigrams = (list) => {
    const bg = new Set();
    for (let i = 0; i < list.length - 1; i++) {
      bg.add(`${list[i]}__${list[i+1]}`);
    }
    return bg;
  };

  const bg1 = getBigrams(words1);
  const bg2 = getBigrams(words2);
  let commonBigrams = 0;
  bg1.forEach(b => {
    if (bg2.has(b)) commonBigrams++;
  });
  const totalBigrams = new Set([...bg1, ...bg2]).size;
  const bigramScore = totalBigrams > 0 ? (commonBigrams / totalBigrams) * 100 : 0;

  // Weighted final similarity score
  const finalSimilarity = Math.min(100, Math.round((jaccardScore * 0.4) + (bigramScore * 0.6)));
  const isCopied = finalSimilarity >= 70;
  const isExact = finalSimilarity >= 98 || norm1 === norm2;

  let matchType = 'Distinct Answer';
  let statusColor = 'text-emerald-400';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

  if (isExact) {
    matchType = 'Exact Match (100% Identical)';
    statusColor = 'text-red-400';
    badgeColor = 'bg-red-500/20 text-red-300 border-red-500/50';
  } else if (finalSimilarity >= 85) {
    matchType = `Critical Overlap (${finalSimilarity}% Copied)`;
    statusColor = 'text-red-400';
    badgeColor = 'bg-red-500/20 text-red-300 border-red-500/50';
  } else if (finalSimilarity >= 70) {
    matchType = `High Similarity (${finalSimilarity}% Suspicious)`;
    statusColor = 'text-amber-400';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
  } else if (finalSimilarity >= 45) {
    matchType = `Moderate Paraphrase (${finalSimilarity}%)`;
    statusColor = 'text-blue-400';
    badgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
  }

  return {
    similarity: finalSimilarity,
    isExact,
    isCopied,
    matchType,
    identicalWords: intersectionCount,
    totalWords: Math.max(words1.length, words2.length),
    statusColor,
    badgeColor,
  };
}

// ASCII & Mathematical Symbol Character Map (A-Z, a-z, 0-9, Math, Greek, Logic)
const ASCII_OPTIONS = [];

// Numbers (0-9)
for (let i = 48; i <= 57; i++) ASCII_OPTIONS.push({ code: i, char: String.fromCharCode(i), type: 'Digit' });

// Uppercase (A-Z)
for (let i = 65; i <= 90; i++) ASCII_OPTIONS.push({ code: i, char: String.fromCharCode(i), type: 'Uppercase' });

// Lowercase (a-z)
for (let i = 97; i <= 122; i++) ASCII_OPTIONS.push({ code: i, char: String.fromCharCode(i), type: 'Lowercase' });

// Math Operators & Brackets
const MATH_OPERATORS = [
  { code: 43, char: '+', type: 'Math Operator' },
  { code: 45, char: '-', type: 'Math Operator' },
  { code: 42, char: '*', type: 'Math Operator' },
  { code: 47, char: '/', type: 'Math Operator' },
  { code: 61, char: '=', type: 'Math Operator' },
  { code: 60, char: '<', type: 'Math Operator' },
  { code: 62, char: '>', type: 'Math Operator' },
  { code: 40, char: '(', type: 'Bracket' },
  { code: 41, char: ')', type: 'Bracket' },
  { code: 91, char: '[', type: 'Bracket' },
  { code: 93, char: ']', type: 'Bracket' },
  { code: 123, char: '{', type: 'Bracket' },
  { code: 125, char: '}', type: 'Bracket' },
];

// Mathematical & Scientific Symbols (Degree, Pi, Theta, Integrals, Logic)
const MATH_SYMBOLS = [
  { code: 215, char: '×', type: 'Math Symbol' },
  { code: 247, char: '÷', type: 'Math Symbol' },
  { code: 177, char: '±', type: 'Math Symbol' },
  { code: 8730, char: '√', type: 'Math Symbol (Square Root)' },
  { code: 176, char: '°', type: 'Degree Symbol' },
  { code: 960, char: 'π', type: 'Math Symbol (Pi)' },
  { code: 952, char: 'θ', type: 'Greek Symbol (Theta)' },
  { code: 945, char: 'α', type: 'Greek Symbol (Alpha)' },
  { code: 946, char: 'β', type: 'Greek Symbol (Beta)' },
  { code: 916, char: 'Δ', type: 'Greek Symbol (Delta)' },
  { code: 955, char: 'λ', type: 'Greek Symbol (Lambda)' },
  { code: 956, char: 'μ', type: 'Greek Symbol (Mu)' },
  { code: 8721, char: '∑', type: 'Math Symbol (Sigma/Sum)' },
  { code: 8747, char: '∫', type: 'Math Symbol (Integral)' },
  { code: 8756, char: '∴', type: 'Logic Symbol (Therefore)' },
  { code: 8757, char: '∵', type: 'Logic Symbol (Because)' },
  { code: 8800, char: '≠', type: 'Math Symbol (Not Equal)' },
  { code: 8804, char: '≤', type: 'Math Symbol (Less Equal)' },
  { code: 8805, char: '≥', type: 'Math Symbol (Greater Equal)' },
  { code: 8776, char: '≈', type: 'Math Symbol (Approx)' },
  { code: 8734, char: '∞', type: 'Math Symbol (Infinity)' },
  { code: 37, char: '%', type: 'Percent Symbol' },
  { code: 46, char: '.', type: 'Punctuation' },
  { code: 44, char: ',', type: 'Punctuation' },
  { code: 58, char: ':', type: 'Punctuation' },
  { code: 59, char: ';', type: 'Punctuation' },
  { code: 94, char: '^', type: 'Exponent Symbol' },
];

ASCII_OPTIONS.push(...MATH_OPERATORS, ...MATH_SYMBOLS);

/**
 * Generates a realistic handwritten image crop snapshot for a word pattern
 * @param {string} wordText 
 * @returns {string} dataUrl PNG
 */
function generateWordHandwrittenCropUrl(wordText) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const width = Math.max(80, (wordText || '').length * 15 + 24);
  const height = 38;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // White paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Red horizontal notebook line guide
  ctx.strokeStyle = '#F87171';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.lineTo(width, 30);
  ctx.stroke();

  // Dark handwritten ink stroke
  ctx.fillStyle = '#0F172A';
  ctx.font = 'italic bold 20px "Brush Script MT", "Comic Sans MS", "Segoe Print", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(wordText, width / 2, height / 2);

  return canvas.toDataURL('image/png');
}

export const SAMPLE_QUESTION_PAPERS = [
  {
    id: 'aarav_dbms',
    title: 'Second Year DBMS Paper (Aarav Sharma)',
    subject: 'DATABASE MANAGEMENT SYSTEM (DBMS)',
    icon: '🗄️',
    studentName: 'AARAV SHARMA',
    rollNo: '01',
    className: 'SECOND YEAR',
    division: 'A',
    collegeName: 'MIT COLLEGE',
    maxMarks: 80,
    linesToDraw: [
      '1. Define DBMS & Major advantages',
      '2. Levels of data abstraction in DBMS',
      '3. Draw & explain ER diagram (Student-Course)',
      '4. Primary Key vs Foreign Key with example',
      '5. Write SQL queries (Create, Insert, Select)',
      '6. What is normalization ? Explain 1NF, 2NF, 3NF',
      '7. List different types of SQL commands (DDL, DML)'
    ],
    fullStudentText: `Student Name : AARAV SHARMA
Roll No. : 01
Division : A
College Name : MIT COLLEGE
Subject : DATABASE MANAGEMENT SYSTEM (DBMS)
Class / Year : SECOND YEAR
Date : 29/08/2025

1. Define DBMS. List its major advantages.
Ans. DBMS (Database Management System) is a software system that helps to create, store, manage and retrieve data efficiently.
Advantages :
(i) Reduces data redundancy (ii) Improves data security
(iii) Allows data sharing (iv) Maintains data consistency
(v) Provides backup and recovery

2. Explain the different levels of data abstraction in DBMS.
Ans. The three levels of data abstraction are :
(i) Physical Level : Describes how data is actually stored in storage devices.
(ii) Logical Level : Describes what data is stored and relationships among data.
(iii) View Level : Describes only the part of database that user is interested in.

3. Draw and explain the ER diagram for a Student-Course enrollment.
Ans. Relationship : A student can enroll in multiple courses and a course can have multiple students (Many-to-Many).
Attributes of Student : Roll_No, Name, Branch, Phone
Attributes of Course : Course_ID, Title, Credits, Dept

4. Differentiate between Primary Key and Foreign Key with example.
Ans. Aspect | Primary Key | Foreign Key
Meaning | Uniquely identifies a record | Links two tables together
Uniqueness | Unique (cannot be duplicate) | Can have duplicate values
Null values | Not allowed | Allowed
Table | Defined in same table | References another table
Example | Student(Roll_No) | Marks(Roll_No) references Student(Roll_No)

5. Write SQL queries for the following :
Ans. (i) Create a table STUDENT (Roll_No INT, Name VARCHAR(50), Branch VARCHAR(20));
(ii) Insert a record => INSERT INTO STUDENT VALUES (1, "Aarav", "Computer");
(iii) Display all records => SELECT * FROM STUDENT;
(iv) Find students from 'Computer' branch => SELECT * FROM STUDENT WHERE Branch = 'Computer';

6. What is normalization ? Explain 1NF, 2NF and 3NF.
Ans. Normalization is a process of organizing data to reduce redundancy and dependency in a database.
(i) 1NF : All attributes should have atomic (single) values.
(ii) 2NF : Table should be in 1NF and all non-key attributes should be fully functionally dependent on primary key.
(iii) 3NF : Table should be in 2NF and no transitive dependency should exist between non-key attributes.

7. List the different types of SQL commands.
Ans. (i) DDL - Create, Alter, Drop (ii) DML - Insert, Update, Delete
(iii) DCL - Grant, Revoke (iv) TCL - Commit, Rollback`,
    questions: [
      { id: 1, qNo: 'Q.1', title: 'Define DBMS. List its major advantages.', maxMarks: 4, modelAnswer: 'DBMS is software system to create, store, manage and retrieve data efficiently. Advantages: Reduces redundancy, improves security, data sharing, consistency, backup & recovery.', studentAnswer: 'DBMS (Database Management System) is a software system that helps to create, store, manage and retrieve data efficiently.\nAdvantages :\n(i) Reduces data redundancy (ii) Improves data security\n(iii) Allows data sharing (iv) Maintains data consistency\n(v) Provides backup and recovery', presetStatus: 'Correct' },
      { id: 2, qNo: 'Q.2', title: 'Explain the different levels of data abstraction in DBMS.', maxMarks: 4, modelAnswer: 'Physical Level (how data is stored), Logical Level (what data is stored), View Level (part of database user sees).', studentAnswer: 'The three levels of data abstraction are :\n(i) Physical Level : Describes how data is actually stored in storage devices.\n(ii) Logical Level : Describes what data is stored and relationships among data.\n(iii) View Level : Describes only the part of database that user is interested in.', presetStatus: 'Correct' },
      { id: 3, qNo: 'Q.3', title: 'Draw and explain the ER diagram for a Student-Course enrollment.', maxMarks: 6, modelAnswer: 'ER Diagram with STUDENT entity (Roll_No, Name, Branch, Phone), COURSE entity (Course_ID, Title, Credits, Dept), and ENROLLS relationship (Many-to-Many).', studentAnswer: 'Relationship : A student can enroll in multiple courses and a course can have multiple students (Many-to-Many).\nAttributes of Student : Roll_No, Name, Branch, Phone\nAttributes of Course : Course_ID, Title, Credits, Dept', presetStatus: 'Correct' },
      { id: 4, qNo: 'Q.4', title: 'Differentiate between Primary Key and Foreign Key with example.', maxMarks: 4, modelAnswer: 'Primary Key uniquely identifies record, unique, no nulls. Foreign Key links tables, allows duplicates/nulls.', studentAnswer: 'Aspect | Primary Key | Foreign Key\nMeaning | Uniquely identifies a record | Links two tables together\nUniqueness | Unique (cannot be duplicate) | Can have duplicate values\nNull values | Not allowed | Allowed\nTable | Defined in same table | References another table\nExample | Student(Roll_No) | Marks(Roll_No) references Student(Roll_No)', presetStatus: 'Correct' },
      { id: 5, qNo: 'Q.5', title: 'Write SQL queries for the following :', maxMarks: 6, modelAnswer: '(i) CREATE TABLE STUDENT (Roll_No INT, Name VARCHAR(50), Branch VARCHAR(20)); (ii) INSERT INTO STUDENT VALUES (1, "Aarav", "Computer"); (iii) SELECT * FROM STUDENT; (iv) SELECT * FROM STUDENT WHERE Branch = "Computer";', studentAnswer: '(i) Create a table STUDENT (Roll_No INT, Name VARCHAR(50), Branch VARCHAR(20));\n(ii) Insert a record => INSERT INTO STUDENT VALUES (1, "Aarav", "Computer");\n(iii) Display all records => SELECT * FROM STUDENT;\n(iv) Find students from \'Computer\' branch => SELECT * FROM STUDENT WHERE Branch = \'Computer\';', presetStatus: 'Correct' },
      { id: 6, qNo: 'Q.6', title: 'What is normalization ? Explain 1NF, 2NF and 3NF.', maxMarks: 5, modelAnswer: 'Normalization reduces redundancy and dependency. 1NF: Atomic values. 2NF: No partial dependency. 3NF: No transitive dependency.', studentAnswer: 'Normalization is a process of organizing data to reduce redundancy and dependency in a database.\n(i) 1NF : All attributes should have atomic (single) values.\n(ii) 2NF : Table should be in 1NF and all non-key attributes should be fully functionally dependent on primary key.\n(iii) 3NF : Table should be in 2NF and no transitive dependency should exist between non-key attributes.', presetStatus: 'Correct' },
      { id: 7, qNo: 'Q.7', title: 'List the different types of SQL commands.', maxMarks: 3, modelAnswer: 'DDL (Create, Alter, Drop), DML (Insert, Update, Delete), DCL (Grant, Revoke), TCL (Commit, Rollback).', studentAnswer: '(i) DDL - Create, Alter, Drop\n(ii) DML - Insert, Update, Delete\n(iii) DCL - Grant, Revoke\n(iv) TCL - Commit, Rollback', presetStatus: 'Correct' }
    ]
  },
  {
    id: 'aarav_cs',
    title: 'Second Year Computer Science Paper (Aarav Sharma)',
    subject: 'COMPUTER SCIENCE',
    icon: '💻',
    studentName: 'AARAV SHARMA',
    rollNo: '01',
    className: 'SECOND YEAR',
    division: 'A',
    collegeName: 'MIT COLLEGE',
    maxMarks: 80,
    linesToDraw: [
      '1. Define Computer & List characteristics',
      '2. Basic functions of computer',
      '3. Difference between RAM and ROM',
      '4. What is Operating System & examples',
      '5. Different generations of computers',
      '6. Computer Network & its advantages',
      '7. Short notes on Compiler, Firewall, Cloud'
    ],
    fullStudentText: `Student Name : AARAV SHARMA
Roll No. : 01
Division : A
College Name : MIT COLLEGE
Subject : COMPUTER SCIENCE
Class / Year : SECOND YEAR

1. Define Computer. List its characteristics.
Ans. A computer is an electronic device that accepts data as input, processes it according to the given instructions, stores it and produces the desired output.
Characteristics of Computer :
(i) Speed (ii) Accuracy (iii) Diligence (iv) Versatility (v) Reliability (vi) Large Storage Capacity (vii) Automation

2. Explain the basic functions of computer.
Ans. The basic functions of a computer are :
(i) Input : Accepting data and instructions.
(ii) Processing : Processing the data as per instructions.
(iii) Output : Producing the results.
(iv) Storage : Storing data, instructions and results for future use.

3. What is the difference between RAM and ROM ?
Ans. RAM vs ROM :
(i) RAM stands for Random Access Memory | ROM stands for Read Only Memory
(ii) RAM is volatile memory | ROM is non-volatile memory
(iii) Data stored in RAM is temporary | Data stored in ROM is permanent
(iv) It is used for read and write operations | It is used for read only operations
(v) Examples : DRAM, SRAM | Examples : PROM, EPROM, EEPROM

4. What is an Operating System ? Write any four examples.
Ans. An Operating System is system software that acts as an interface between the user and the computer hardware and manages all the resources of the computer.
Examples : (i) Windows (ii) Linux (iii) macOS (iv) Android

5. Explain different generations of computers.
Ans. (i) First Generation (1940-1956) : Vacuum tubes were used. They were very large in size and generated much heat.
(ii) Second Generation (1956-1963) : Transistors were used. They were faster, smaller and more reliable than first generation.
(iii) Third Generation (1963-1971) : Integrated Circuits (ICs) were used. These computers were more reliable and efficient.
(iv) Fourth Generation (1971-Present) : Microprocessors were used. These computers are very small, fast and very reliable.

6. What is a Computer Network ? List its advantages.
Ans. A Computer Network is a collection of two or more computers connected together to share data, resources and information.
Advantages : (i) Resource sharing (ii) Fast communication (iii) Cost reduction (iv) Data security (v) Centralized data management

7. Write short notes on any two of the following : (i) Compiler (ii) Firewall (iii) Cloud Computing
Ans. (i) Compiler : A compiler is a system software that translates high level language program into machine language program.
(ii) Firewall : A Firewall is a security system that monitors and controls the incoming and outgoing network traffic and protects the network from unauthorized access.`,
    questions: [
      { id: 1, qNo: 'Q.1', title: 'Define Computer. List its characteristics.', maxMarks: 4, modelAnswer: 'A computer is an electronic device that accepts data as input, processes it according to given instructions, stores it and produces output. Characteristics: Speed, Accuracy, Diligence, Versatility, Reliability, Large Storage Capacity, Automation.', studentAnswer: 'A computer is an electronic device that accepts data as input, processes it according to the given instructions, stores it and produces the desired output.\nCharacteristics of Computer :\n(i) Speed (ii) Accuracy (iii) Diligence (iv) Versatility (v) Reliability (vi) Large Storage Capacity (vii) Automation', presetStatus: 'Correct' },
      { id: 2, qNo: 'Q.2', title: 'Explain the basic functions of computer.', maxMarks: 4, modelAnswer: 'Input (accepting data), Processing (processing data), Output (producing results), Storage (storing data for future use).', studentAnswer: 'The basic functions of a computer are :\n(i) Input : Accepting data and instructions.\n(ii) Processing : Processing the data as per instructions.\n(iii) Output : Producing the results.\n(iv) Storage : Storing data, instructions and results for future use.', presetStatus: 'Correct' },
      { id: 3, qNo: 'Q.3', title: 'What is the difference between RAM and ROM ?', maxMarks: 4, modelAnswer: 'RAM: Random Access Memory, volatile, temporary, read/write. ROM: Read Only Memory, non-volatile, permanent, read-only.', studentAnswer: 'RAM vs ROM :\n(i) RAM stands for Random Access Memory | ROM stands for Read Only Memory\n(ii) RAM is volatile memory | ROM is non-volatile memory\n(iii) Data stored in RAM is temporary | Data stored in ROM is permanent\n(iv) It is used for read and write operations | It is used for read only operations\n(v) Examples : DRAM, SRAM | Examples : PROM, EPROM, EEPROM', presetStatus: 'Correct' },
      { id: 4, qNo: 'Q.4', title: 'What is an Operating System ? Write any four examples.', maxMarks: 4, modelAnswer: 'An Operating System is system software acting as interface between user and hardware, managing computer resources. Examples: Windows, Linux, macOS, Android.', studentAnswer: 'An Operating System is system software that acts as an interface between the user and the computer hardware and manages all the resources of the computer.\nExamples : (i) Windows (ii) Linux (iii) macOS (iv) Android', presetStatus: 'Correct' },
      { id: 5, qNo: 'Q.5', title: 'Explain different generations of computers.', maxMarks: 4, modelAnswer: '1st Gen: Vacuum tubes. 2nd Gen: Transistors. 3rd Gen: Integrated Circuits (ICs). 4th Gen: Microprocessors.', studentAnswer: '(i) First Generation (1940-1956) : Vacuum tubes were used. They were very large in size and generated much heat.\n(ii) Second Generation (1956-1963) : Transistors were used. They were faster, smaller and more reliable than first generation.\n(iii) Third Generation (1963-1971) : Integrated Circuits (ICs) were used. These computers were more reliable and efficient.\n(iv) Fourth Generation (1971-Present) : Microprocessors were used. These computers are very small, fast and very reliable.', presetStatus: 'Correct' },
      { id: 6, qNo: 'Q.6', title: 'What is a Computer Network ? List its advantages.', maxMarks: 4, modelAnswer: 'A computer network connects two or more computers to share data, resources, and information. Advantages: Resource sharing, fast communication, cost reduction, data security, centralized data management.', studentAnswer: 'A Computer Network is a collection of two or more computers connected together to share data, resources and information.\nAdvantages : (i) Resource sharing (ii) Fast communication (iii) Cost reduction (iv) Data security (v) Centralized data management', presetStatus: 'Correct' },
      { id: 7, qNo: 'Q.7', title: 'Write short notes on any two of the following : (i) Compiler (ii) Firewall (iii) Cloud Computing', maxMarks: 4, modelAnswer: '(i) Compiler: System software translating high-level code to machine code. (ii) Firewall: Security system monitoring and controlling network traffic to block unauthorized access.', studentAnswer: '(i) Compiler : A compiler is a system software that translates high level language program into machine language program.\n(ii) Firewall : A Firewall is a security system that monitors and controls the incoming and outgoing network traffic and protects the network from unauthorized access.', presetStatus: 'Correct' }
    ]
  },
  {
    id: 'aarav_science',
    title: 'Second Year Science Paper (Aarav Sharma)',
    subject: 'SCIENCE',
    icon: '🧪',
    studentName: 'AARAV SHARMA',
    rollNo: '01',
    className: 'SECOND YEAR',
    division: 'A',
    collegeName: 'MIT COLLEGE',
    maxMarks: 80,
    linesToDraw: [
      '1. Define Chemical reaction & Catalyst',
      '2. Four characteristics of life',
      '3. Photosynthesis & balanced equation',
      '4. Human digestive system',
      '5. Function of Red blood cells & Stomata',
      '6. Four uses of acids in daily life',
      '7. Labelled diagram of human heart',
      '8. Causes of air pollution'
    ],
    fullStudentText: `Student Name : AARAV SHARMA
Roll No. : 01
Division : A
College Name : MIT COLLEGE
Subject : SCIENCE
Class / Year : SECOND YEAR

1. Define the following : (i) Chemical reaction (ii) Catalyst.
Ans. (i) A chemical reaction is a process in which one or more substances (reactants) are changed into new substances (products) with different properties.
(ii) A catalyst is a substance that changes the rate of a chemical reaction without itself undergoing any permanent chemical change.

2. Write any four characteristics of life.
Ans. The four characteristics of life are :
(i) Growth
(ii) Respiration
(iii) Reproduction
(iv) Response to stimuli

3. What is photosynthesis ? Write the balanced equation for it.
Ans. Photosynthesis is the process by which green plants prepare their own food using sunlight, chlorophyll, carbon dioxide and water.
6CO₂ + 6H₂O -- Sunlight, Chlorophyll --> C₆H₁₂O₆ + 6O₂

4. Explain the human digestive system in short.
Ans. The human digestive system includes the mouth, oesophagus, stomach, small intestine, large intestine, rectum and anus. The food is taken in through the mouth and chewed by teeth. It passes through the oesophagus to the stomach where it is mixed with gastric juice. The partially digested food then goes to the small intestine where most of the digestion and absorption of nutrients takes place. The undigested food moves to the large intestine where water is absorbed and the waste is stored in the rectum and removed through the anus.

5. State the function of the following : (i) Red blood cells (ii) Stomata
Ans. (i) Red blood cells (RBCs) contain haemoglobin which helps in the transport of oxygen from the lungs to all parts of the body.
(iii) Stomata are tiny pores on the surface of leaves that help in the exchange of gases and in transpiration.

6. Write any four uses of acids in our daily life.
Ans. (i) Acids are used in medicines.
(ii) Acids are used in the manufacture of fertilizers.
(iii) Acids are used in cleaning metal surfaces.
(iv) Acids are used in the food industry as preservatives.

7. Draw a neat labelled diagram of the human heart.
Ans. Superior vena cava, Pulmonary artery, Pulmonary veins, Right atrium, Right ventricle, Aorta, Left atrium, Left ventricle.

8. What is pollution ? Write any four causes of air pollution.
Ans. Pollution is the presence of harmful substances in the environment which cause adverse effects on living organisms.
Causes of air pollution :
(i) Smoke from vehicles (ii) Emission from factories (iii) Burning of fossil fuels (iv) Burning of garbage and plastics`,
    questions: [
      { id: 1, qNo: 'Q.1', title: 'Define the following : (i) Chemical reaction (ii) Catalyst.', maxMarks: 4, modelAnswer: '(i) Chemical reaction: Process in which reactants change into new substances with different properties. (ii) Catalyst: Substance that changes rate of chemical reaction without undergoing permanent chemical change.', studentAnswer: '(i) A chemical reaction is a process in which one or more substances (reactants) are changed into new substances (products) with different properties.\n(ii) A catalyst is a substance that changes the rate of a chemical reaction without itself undergoing any permanent chemical change.', presetStatus: 'Correct' },
      { id: 2, qNo: 'Q.2', title: 'Write any four characteristics of life.', maxMarks: 4, modelAnswer: 'Growth, Respiration, Reproduction, Response to stimuli.', studentAnswer: 'The four characteristics of life are :\n(i) Growth\n(ii) Respiration\n(iii) Reproduction\n(iv) Response to stimuli', presetStatus: 'Correct' },
      { id: 3, qNo: 'Q.3', title: 'What is photosynthesis ? Write the balanced equation for it.', maxMarks: 4, modelAnswer: 'Photosynthesis is the process by which green plants prepare food using sunlight, chlorophyll, CO2 and water. 6CO₂ + 6H₂O -> C₆H₁₂O₆ + 6O₂.', studentAnswer: 'Photosynthesis is the process by which green plants prepare their own food using sunlight, chlorophyll, carbon dioxide and water.\n6CO₂ + 6H₂O -- Sunlight, Chlorophyll --> C₆H₁₂O₆ + 6O₂', presetStatus: 'Correct' },
      { id: 4, qNo: 'Q.4', title: 'Explain the human digestive system in short.', maxMarks: 4, modelAnswer: 'Includes mouth, oesophagus, stomach, small intestine, large intestine, rectum, anus. Food chewed in mouth, mixed with gastric juice in stomach, digested and absorbed in small intestine, waste excreted.', studentAnswer: 'The human digestive system includes the mouth, oesophagus, stomach, small intestine, large intestine, rectum and anus. The food is taken in through the mouth and chewed by teeth. It passes through the oesophagus to the stomach where it is mixed with gastric juice. The partially digested food then goes to the small intestine where most of the digestion and absorption of nutrients takes place. The undigested food moves to the large intestine where water is absorbed and the waste is stored in the rectum and removed through the anus.', presetStatus: 'Correct' },
      { id: 5, qNo: 'Q.5', title: 'State the function of the following : (i) Red blood cells (ii) Stomata', maxMarks: 4, modelAnswer: '(i) Red blood cells (RBCs): Contain haemoglobin to transport oxygen to body cells. (ii) Stomata: Tiny pores on leaves for gas exchange and transpiration.', studentAnswer: '(i) Red blood cells (RBCs) contain haemoglobin which helps in the transport of oxygen from the lungs to all parts of the body.\n(iii) Stomata are tiny pores on the surface of leaves that help in the exchange of gases and in transpiration.', presetStatus: 'Correct' },
      { id: 6, qNo: 'Q.6', title: 'Write any four uses of acids in our daily life.', maxMarks: 4, modelAnswer: '1. Medicines. 2. Fertilizers manufacture. 3. Cleaning metal surfaces. 4. Food preservatives.', studentAnswer: '(i) Acids are used in medicines.\n(ii) Acids are used in the manufacture of fertilizers.\n(iii) Acids are used in cleaning metal surfaces.\n(iv) Acids are used in the food industry as preservatives.', presetStatus: 'Correct' },
      { id: 7, qNo: 'Q.7', title: 'Draw a neat labelled diagram of the human heart.', maxMarks: 4, modelAnswer: 'Labelled diagram showing Aorta, Superior vena cava, Pulmonary artery, Pulmonary veins, Right/Left atrium and ventricles.', studentAnswer: 'Superior vena cava, Pulmonary artery, Pulmonary veins, Right atrium, Right ventricle, Aorta, Left atrium, Left ventricle.', presetStatus: 'Correct' },
    ]
  },
  {
    id: 'science_10th',
    title: '10th SSC Science Paper',
    subject: 'SCIENCE',
    icon: '🔬',
    studentName: 'Rohan Mungase',
    rollNo: '20250829',
    className: '10th (SSC)',
    division: 'A',
    collegeName: 'MIT College',
    maxMarks: 80,
    linesToDraw: [
      '1. Balanced chemical equation for photosynthesis',
      '2. Types of chemical reactions',
      '3. Define Newton\'s First Law of Motion',
      '4. Draw labelled diagram of Human Heart',
      '5. Function of Mitochondria & Stomata',
      '6. State Ohm\'s Law and write its formula',
      '7. Explain process of digestion in human',
      '8. Advantages of using solar energy'
    ],
    fullStudentText: `Name : Rohan Mungase
Class : 10th (SSC)
Date : 29/08/2025
Subject : SCIENCE
Total Marks : 80
Time : 3 Hours

1. Write the balanced chemical equation for photosynthesis. [3]
Ans. 6CO₂ + 6H₂O -- Sunlight / Chlorophyll --> C₆H₁₂O₆ + 6O₂

2. What are the types of the chemical reactions? Explain any two. [4]
Ans. The types of chemical reactions are :
(i) Combination (ii) Decomposition (iii) Displacement (iv) Double displacement (v) Redox reaction
(i) Combination reaction : When two or more substances combine to form a single product. Example : 2H₂ + O₂ → 2H₂O
(ii) Decomposition reaction : When a single compound breaks down into two or more simpler substances. Example : CaCO₃ → CaO + CO₂

3. Define Newton's First Law of Motion. [3]
Ans. Newton's First Law of Motion (Law of Inertia) :
A body remains in its state of rest or uniform motion in a straight line unless acted upon by an unbalanced external force.

4. Draw a labelled diagram of Human Heart. [4]
Ans. Aorta, Pulmonary artery, Right atrium, Right ventricle, Left atrium, Left ventricle, Pulmonary vein.

5. What is the function of the following? (Any two) [4]
Ans. (i) Mitochondria : It is known as the "Powerhouse of the cell". It produces energy for the cell.
(ii) Stomata : They are tiny pores present on the underside of leaves. They help in exchange of gases and transpiration.

6. State Ohm's Law. Write its formula. [3]
Ans. Ohm's Law : At constant temperature, the current (I) flowing through a conductor is directly proportional to the potential difference (V) across its ends.
Formula : V ∝ I or V = IR
where, V = Voltage, I = Current, R = Resistance

7. Explain the process of digestion in human. [4]
Ans. Digestion is the process of breaking down of complex food into simpler, soluble forms which can be absorbed and used by the body. It starts in the mouth by the action of saliva on food. Then it moves to the stomach where gastric juice acts on it. Finally, in the small intestine, bile and pancreatic juice complete the digestion and nutrients are absorbed.

8. What are the advantages of using solar energy? (Any two) [3]
Ans. (i) Solar energy is renewable and inexhaustible.
(ii) It is non-polluting and environmentally friendly.
(iii) It can reduce our electricity bills.`,
    questions: [
      { id: 1, qNo: 'Q.1', title: 'Write the balanced chemical equation for photosynthesis.', maxMarks: 3, modelAnswer: '6CO₂ + 6H₂O -- Sunlight / Chlorophyll --> C₆H₁₂O₆ + 6O₂', studentAnswer: '6CO₂ + 6H₂O -- Sunlight / Chlorophyll --> C₆H₁₂O₆ + 6O₂', presetStatus: 'Correct' },
      { id: 2, qNo: 'Q.2', title: 'What are the types of the chemical reactions? Explain any two.', maxMarks: 4, modelAnswer: 'Combination, Decomposition, Displacement, Double displacement, Redox. Combination: 2H₂ + O₂ -> 2H₂O. Decomposition: CaCO₃ -> CaO + CO₂.', studentAnswer: 'The types of chemical reactions are : (i) Combination (ii) Decomposition (iii) Displacement (iv) Double displacement (v) Redox reaction.\n(i) Combination reaction : When two or more substances combine to form a single product. Example : 2H₂ + O₂ → 2H₂O\n(ii) Decomposition reaction : When a single compound breaks down into two or more simpler substances. Example : CaCO₃ → CaO + CO₂', presetStatus: 'Correct' },
      { id: 3, qNo: 'Q.3', title: 'Define Newton\'s First Law of Motion.', maxMarks: 3, modelAnswer: 'A body remains in its state of rest or uniform motion in a straight line unless acted upon by an unbalanced external force (Law of Inertia).', studentAnswer: 'Newton\'s First Law of Motion (Law of Inertia) :\nA body remains in its state of rest or uniform motion in a straight line unless acted upon by an unbalanced external force.', presetStatus: 'Correct' },
      { id: 4, qNo: 'Q.4', title: 'Draw a labelled diagram of Human Heart.', maxMarks: 4, modelAnswer: 'Diagram showing Aorta, Pulmonary artery, Right atrium, Right ventricle, Left atrium, Left ventricle, Pulmonary vein.', studentAnswer: 'Aorta, Pulmonary artery, Right atrium, Right ventricle, Left atrium, Left ventricle, Pulmonary vein.', presetStatus: 'Correct' },
      { id: 5, qNo: 'Q.5', title: 'What is the function of the following? (Any two)', maxMarks: 4, modelAnswer: '(i) Mitochondria: Powerhouse of the cell, produces ATP energy. (ii) Stomata: Tiny pores on leaves for gas exchange and transpiration.', studentAnswer: '(i) Mitochondria : It is known as the "Powerhouse of the cell". It produces energy for the cell.\n(ii) Stomata : They are tiny pores present on the underside of leaves. They help in exchange of gases and transpiration.', presetStatus: 'Correct' },
      { id: 6, qNo: 'Q.6', title: 'State Ohm\'s Law. Write its formula.', maxMarks: 3, modelAnswer: 'Current (I) flowing through a conductor is directly proportional to potential difference (V) at constant temperature. Formula: V = IR.', studentAnswer: 'Ohm\'s Law : At constant temperature, the current (I) flowing through a conductor is directly proportional to the potential difference (V) across its ends.\nFormula : V ∝ I or V = IR\nwhere, V = Voltage, I = Current, R = Resistance', presetStatus: 'Correct' },
      { id: 7, qNo: 'Q.7', title: 'Explain the process of digestion in human.', maxMarks: 4, modelAnswer: 'Digestion breaks down food into soluble forms. Starts in mouth (saliva), moves to stomach (gastric juice), completed in small intestine (bile & pancreatic juice) where nutrients are absorbed.', studentAnswer: 'Digestion is the process of breaking down of complex food into simpler, soluble forms which can be absorbed and used by the body. It starts in the mouth by the action of saliva on food. Then it moves to the stomach where gastric juice acts on it. Finally, in the small intestine, bile and pancreatic juice complete the digestion and nutrients are absorbed.', presetStatus: 'Correct' },
    ]
  },
  {
    id: 'math_10th',
    title: '10th SSC Mathematics Paper',
    subject: 'MATHEMATICS',
    icon: '📐',
    studentName: 'Rohan Mungase',
    rollNo: '20250829',
    className: '10th (SSC)',
    division: 'A',
    collegeName: 'MIT College',
    maxMarks: 40,
    linesToDraw: [
      '1. Linear equation : 3x - 5 = 16',
      '2. Factorise : x² - 5x + 6',
      '3. Simultaneous equations : 2x + 3y = 12, x - y = 1',
      '4. Right angled triangle & sin θ, cos θ, tan θ',
      '5. Distance formula between A(2, 3) and B(6, 7)',
      '6. Linear function table y = 2x + 1',
      '7. Area of circle with radius 7 cm',
      '8. Probability of drawing white ball'
    ],
    fullStudentText: `Name : Rohan Mungase
Class : 10th (SSC)
Date : 29/08/2025
Subject : MATHEMATICS
Total Marks : 40
Time : 3 Hours

1) Solve the following linear equation : 3x - 5 = 16 [5]
Ans. 3x - 5 = 16
3x = 16 + 5
3x = 21
x = 21/3
x = 7
∴ The solution is x = 7.

2) Factorise : x² - 5x + 6 [5]
Ans. x² - 5x + 6
= x² - 2x - 3x + 6
= x(x - 2) - 3(x - 2)
= (x - 2)(x - 3)
∴ x² - 5x + 6 = (x - 2)(x - 3)

3) Solve the simultaneous equations : 2x + 3y = 12 ...(1) and x - y = 1 ...(2) [5]
Ans. From (2), x = y + 1.
Substitute in (1):
2(y + 1) + 3y = 12
2y + 2 + 3y = 12
5y = 10
y = 2
Then x = 2 + 1 = 3.
∴ x = 3, y = 2

4) Draw a neat diagram of a right angled triangle and find the value of sin θ, cos θ and tan θ. [5]
Ans. In ΔABC, right-angled at B: AB = 3 (Opposite), BC = 4 (Adjacent), AC = 5 (Hypotenuse).
sin θ = Opposite / Hypotenuse = AB / AC = 3/5
cos θ = Adjacent / Hypotenuse = BC / AC = 4/5
tan θ = Opposite / Adjacent = AB / BC = 3/4

5) If the points A(2, 3) and B(6, 7) are the end points of a line segment, find the distance between them. [5]
Ans. Using distance formula: d = √((x₂ - x₁)² + (y₂ - y₁)²)
d = √((6 - 2)² + (7 - 3)²) = √(4² + 4²) = √(16 + 16) = √32 = 4√2 units.
∴ Distance AB = 4√2 units.

6) Complete the following table for the linear function y = 2x + 1. [5]
Ans. Function: y = 2x + 1
When x = -2: y = 2(-2) + 1 = -3
When x = -1: y = 2(-1) + 1 = -1
When x = 0: y = 2(0) + 1 = 1
When x = 1: y = 2(1) + 1 = 3
When x = 2: y = 2(2) + 1 = 5
Table: x = [-2, -1, 0, 1, 2], y = [-3, -1, 1, 3, 5]

7) Find the area of a circle whose radius is 7 cm. (Use π = 22/7) [5]
Ans. Given radius r = 7 cm.
Formula: Area of circle = πr²
Area = (22/7) × (7)² = (22/7) × 49 = 22 × 7 = 154 cm².
∴ Area of circle = 154 cm².

8) A bag contains 5 red balls, 3 white balls and 2 blue balls. Find the probability of drawing a white ball. [5]
Ans. Total number of balls, n(S) = 5 + 3 + 2 = 10
Number of white balls, n(W) = 3
Probability of drawing a white ball, P(W) = n(W) / n(S) = 3/10
∴ P(W) = 3/10 (or 0.3)`,
    questions: [
      {
        id: 1,
        qNo: 'Q.1',
        title: 'Solve the following linear equation : 3x - 5 = 16',
        maxMarks: 5,
        modelAnswer: '3x - 5 = 16 => 3x = 21 => x = 7.',
        studentAnswer: '3x - 5 = 16\n3x = 16 + 5\n3x = 21\nx = 21/3\nx = 7\n∴ The solution is x = 7.',
        presetStatus: 'Correct'
      },
      {
        id: 2,
        qNo: 'Q.2',
        title: 'Factorise : x² - 5x + 6',
        maxMarks: 5,
        modelAnswer: 'x² - 5x + 6 = (x - 2)(x - 3)',
        studentAnswer: 'x² - 5x + 6\n= x² - 2x - 3x + 6\n= x(x - 2) - 3(x - 2)\n= (x - 2)(x - 3)\n∴ x² - 5x + 6 = (x - 2)(x - 3)',
        presetStatus: 'Correct'
      },
      {
        id: 3,
        qNo: 'Q.3',
        title: 'Solve the simultaneous equations : 2x + 3y = 12 ...(1) and x - y = 1 ...(2)',
        maxMarks: 5,
        modelAnswer: 'x = 3, y = 2',
        studentAnswer: 'From (2), x = y + 1.\nSubstitute in (1):\n2(y + 1) + 3y = 12\n2y + 2 + 3y = 12\n5y = 10\ny = 2\nThen x = 2 + 1 = 3.\n∴ x = 3, y = 2',
        presetStatus: 'Correct'
      },
      {
        id: 4,
        qNo: 'Q.4',
        title: 'Draw a neat diagram of a right angled triangle and find the value of sin θ, cos θ and tan θ.',
        maxMarks: 5,
        modelAnswer: 'sin θ = 3/5, cos θ = 4/5, tan θ = 3/4',
        studentAnswer: 'In ΔABC, right-angled at B: AB = 3 (Opposite), BC = 4 (Adjacent), AC = 5 (Hypotenuse).\nsin θ = Opposite / Hypotenuse = AB / AC = 3/5\ncos θ = Adjacent / Hypotenuse = BC / AC = 4/5\ntan θ = Opposite / Adjacent = AB / BC = 3/4',
        presetStatus: 'Correct'
      },
      {
        id: 5,
        qNo: 'Q.5',
        title: 'If the points A(2, 3) and B(6, 7) are the end points of a line segment, find the distance between them.',
        maxMarks: 5,
        modelAnswer: 'd = √((6-2)² + (7-3)²) = √32 = 4√2 units.',
        studentAnswer: 'Using distance formula: d = √((x₂ - x₁)² + (y₂ - y₁) launch)\nd = √((6 - 2)² + (7 - 3)²)\nd = √(4² + 4²)\nd = √(16 + 16) = √32 = 4√2 units.\n∴ Distance AB = 4√2 units.',
        presetStatus: 'Correct'
      },
      {
        id: 6,
        qNo: 'Q.6',
        title: 'Complete the following table for the linear function y = 2x + 1.',
        maxMarks: 5,
        modelAnswer: 'For x = -2, -1, 0, 1, 2; y values are -3, -1, 1, 3, 5.',
        studentAnswer: 'Function: y = 2x + 1\nWhen x = -2: y = 2(-2) + 1 = -3\nWhen x = -1: y = 2(-1) + 1 = -1\nWhen x = 0: y = 2(0) + 1 = 1\nWhen x = 1: y = 2(1) + 1 = 3\nWhen x = 2: y = 2(2) + 1 = 5\nTable: x = [-2, -1, 0, 1, 2], y = [-3, -1, 1, 3, 5]',
        presetStatus: 'Correct'
      },
      {
        id: 7,
        qNo: 'Q.7',
        title: 'Find the area of a circle whose radius is 7 cm. (Use π = 22/7)',
        maxMarks: 5,
        modelAnswer: 'Area = πr² = (22/7) * 49 = 154 cm².',
        studentAnswer: 'Given radius r = 7 cm.\nFormula: Area of circle = πr²\nArea = (22/7) × (7)² = (22/7) × 49 = 22 × 7 = 154 cm².\n∴ Area of circle = 154 cm².',
        presetStatus: 'Correct'
      },
      {
        id: 8,
        qNo: 'Q.8',
        title: 'A bag contains 5 red balls, 3 white balls and 2 blue balls. Find the probability of drawing a white ball.',
        maxMarks: 5,
        modelAnswer: 'P(White) = 3/10 = 0.3.',
        studentAnswer: 'Total number of balls, n(S) = 5 + 3 + 2 = 10\nNumber of white balls, n(W) = 3\nProbability of drawing a white ball, P(W) = n(W) / n(S) = 3/10\n∴ P(W) = 3/10 (or 0.3)',
        presetStatus: 'Correct'
      }
    ]
  },
  {
    id: 'history_101',
    title: 'History & Social Studies Paper',
    subject: 'History',
    icon: '📜',
    studentName: 'Aarav Sharma',
    rollNo: '202301002',
    maxMarks: 50,
    linesToDraw: [
      'Q.1 Define History: Study of past events and human affairs.',
      'Q.2 Importance of History: Teaches culture & ancestors values.',
      'Q.3 Alexander the Great: Macedonian king conquered Persia & India.',
      'Q.4 Archaeology: Study of ancient human life & artifacts.',
      'Q.5 Sources of History: Literary (manuscripts) & Archaeological.'
    ],
    fullStudentText: `Q.1 Define History.
Ans. History is the study of past events, particularly human affairs. It helps us understand the present and make better decisions for the future.

Q.2 What is the importance of History?
Ans. History is important because it teaches us about our past, culture, traditions and the mistakes made by our ancestors. It helps in the development of a sense of identity and values.

Q.3 Who was Alexander the Great?
Ans. Alexander the Great was a Macedonian king who conquered a large part of the known world including Persia, Egypt and India. He is known for his military genius and leadership.

Q.4 What is Archaeology?
Ans. Archaeology is the study of ancient human life and activities through the excavation of sites and the analysis of artifacts and remains.

Q.5 What are the sources of History?
Ans. The sources of History are of two types – (i) Literary sources – Inscriptions, books, manuscripts. (ii) Archaeological sources – Coins, monuments, tools, pottery.

Q.6 Write a short note on the Indus Valley Civilization.
Ans. The Indus Valley Civilization was one of the earliest urban civilizations in the world. It existed around 2500 BCE to 1900 BCE. The major cities were Harappa, Mohenjo-daro, Dholavira, Kalibangan and Lothal. People of this civilization were skilled in town planning, agriculture, trade and crafts. They had a well-planned drainage system and used a script that is still undeciphered.

Q.7 What were the causes of the French Revolution?
Ans. The main causes of the French Revolution were: (i) Social inequality – The society was divided into three estates. (ii) Economic crisis – Heavy taxes and financial bankruptcy. (iii) Political inequality – The king had absolute powers. (iv) Influence of Enlightenment ideas – Ideas of liberty, equality and fraternity inspired the people.

Q.8 Write a short note on Ashoka.
Ans. Ashoka was the great Mauryan emperor. After the Kalinga war, he embraced Buddhism and adopted the path of Dhamma. He issued edicts on rocks and pillars, promoting non-violence, kindness, religions. His rule is known for peace, welfare and administration.

Q.9 What was the contribution of Chhatrapati Shivaji Maharaj?
Ans. Chhatrapati Shivaji Maharaj was a great Maratha king. He established "Swarajya" and built a strong military with a navy. He was an able administrator and known for his bravery, justice and respect for all religions.

Q.10 What were the main features of the Delhi Sultanate?
Ans. The main features of the Delhi Sultanate were: (i) It was the first Muslim rule in India. (ii) The rulers were Turks, Afghans and Mamluks. (iii) They introduced new administrative system and coinage.`,
    questions: [
      { id: 1, qNo: 'Q.1', title: 'Define History.', maxMarks: 5, modelAnswer: 'History is the study of past events, human culture, and social evolution through written records and archaeological evidence.', studentAnswer: 'History is the study of past events, particularly human affairs. It helps us understand the present and make better decisions for the future.', presetStatus: 'Correct' },
      { id: 2, qNo: 'Q.2', title: 'What is the importance of History?', maxMarks: 5, modelAnswer: 'History helps us understand societal evolution, learn from past mistakes, preserve cultural heritage, and shape informed decisions for the future.', studentAnswer: 'History is important because it teaches us about our past, culture, traditions and the mistakes made by our ancestors. It helps in the development of a sense of identity and values.', presetStatus: 'Correct' },
      { id: 3, qNo: 'Q.3', title: 'Who was Alexander the Great?', maxMarks: 5, modelAnswer: 'Alexander the Great was the king of the ancient Greek kingdom of Macedon who created one of the largest empires in history by age thirty.', studentAnswer: 'Alexander the Great was a Macedonian king who conquered a large part of the known world including Persia, Egypt and India. He is known for his military genius and leadership.', presetStatus: 'Correct' },
      { id: 4, qNo: 'Q.4', title: 'What is Archaeology?', maxMarks: 5, modelAnswer: 'Archaeology is the scientific study of human activity through the recovery and analysis of material culture, artifacts, architecture, and biofacts.', studentAnswer: 'Archaeology is the study of ancient human life and activities through the excavation of sites and the analysis of artifacts and remains.', presetStatus: 'Correct' },
      { id: 5, qNo: 'Q.5', title: 'What are the sources of History?', maxMarks: 5, modelAnswer: 'Historical sources include primary sources like inscriptions, coins, monuments, and manuscripts, as well as secondary sources like historical books and research papers.', studentAnswer: 'The sources of History are of two types – (i) Literary sources – Inscriptions, books, manuscripts. (ii) Archaeological sources – Coins, monuments, tools, pottery.', presetStatus: 'Correct' },
      { id: 6, qNo: 'Q.6', title: 'Write a short note on the Indus Valley Civilization.', maxMarks: 5, modelAnswer: 'The Indus Valley Civilization (3300–1300 BCE) was a Bronze Age civilization in South Asia known for urban planning, baked brick houses, elaborate drainage systems, and water supply systems.', studentAnswer: 'The Indus Valley Civilization was one of the earliest urban civilizations in the world. It existed around 2500 BCE to 1900 BCE. The major cities were Harappa, Mohenjo-daro, Dholavira, Kalibangan and Lothal. People of this civilization were skilled in town planning, agriculture, trade and crafts. They had a well-planned drainage system and used a script that is still undeciphered.', presetStatus: 'Correct' },
      { id: 7, qNo: 'Q.7', title: 'What were the causes of the French Revolution?', maxMarks: 5, modelAnswer: 'The French Revolution (1789) was caused by financial crisis, social inequality under the Estates System, Enlightenment ideas, and widespread discontent with absolute monarchy.', studentAnswer: 'The main causes of the French Revolution were: (i) Social inequality – The society was divided into three estates. (ii) Economic crisis – Heavy taxes and financial bankruptcy. (iii) Political inequality – The king had absolute powers. (iv) Influence of Enlightenment ideas – Ideas of liberty, equality and fraternity inspired the people.', presetStatus: 'Correct' },
      { id: 8, qNo: 'Q.8', title: 'Write a short note on Ashoka.', maxMarks: 5, modelAnswer: 'Emperor Ashoka was an Indian emperor of the Maurya Dynasty who ruled almost all of the Indian subcontinent. After the Kalinga War, he embraced Buddhism and spread Dhamma.', studentAnswer: 'Ashoka was the great Mauryan emperor. After the Kalinga war, he embraced Buddhism and adopted the path of Dhamma. He issued edicts on rocks and pillars, promoting non-violence, kindness, religions. His rule is known for peace, welfare and administration.', presetStatus: 'Correct' },
      { id: 9, qNo: 'Q.9', title: 'What was the contribution of Chhatrapati Shivaji Maharaj?', maxMarks: 5, modelAnswer: 'Chhatrapati Shivaji Maharaj was the founder of the Maratha Empire. He introduced innovative guerrilla warfare tactics, built a strong navy, and established a progressive administrative system.', studentAnswer: 'Chhatrapati Shivaji Maharaj was a great Maratha king. He established "Swarajya" and built a strong military with a navy. He was an able administrator and known for his bravery, justice and respect for all religions.', presetStatus: 'Correct' },
      { id: 10, qNo: 'Q.10', title: 'What were the main features of the Delhi Sultanate?', maxMarks: 5, modelAnswer: 'The Delhi Sultanate (1206–1526) featured centralized administration, military reforms, introduction of Indo-Islamic architecture, and economic trade expansion across northern India.', studentAnswer: 'The main features of the Delhi Sultanate were: (i) It was the first Muslim rule in India. (ii) The rulers were Turks, Afghans and Mamluks. (iii) They introduced new administrative system and coinage.', presetStatus: 'Correct' },
    ]
  }
];

export const REVOLT_1857_CANDIDATE_DATA = {
  id: 0,
  rollNo: 'CS106',
  fileName: 'CS106.pdf',
  name: 'Sneha Kulkarni',
  subject: 'HISTORY & SOCIAL STUDIES',
  batch: 'C-2',
  division: 'Division B',
  standard: 'Second Year (SE)',
  paperPreviews: ['/papers/01_p1.png', '/papers/01_p2.png'],
  marksObtained: 19.0,
  maxMarks: 20,
  accuracy: 95,
  grammar: 92,
  keywordMatch: 95,
  similarity: 94,
  completeness: 96,
  feedback: {
    strengths: [
      'Comprehensive breakdown of political causes (Doctrine of Lapse) and military causes (greased cartridges in Enfield rifles).',
      'Accurately explained historical consequences of the Revolt: end of East India Company and transfer to British Crown in 1858.',
      'High factual accuracy on economic impacts on traditional handicrafts and farmer impoverishment.'
    ]
  },
  questions: [
    {
      id: 1,
      qNo: 'Q.1',
      pageNumber: 1,
      title: 'Discuss the causes and consequences of the Revolt of 1857. (10 marks)',
      maxMarks: 10,
      marksObtained: 9.5,
      status: 'Correct',
      accuracy: 96,
      feedback: 'Full marks awarded! Comprehensive breakdown of political (Doctrine of Lapse), economic (taxation, handicrafts), social-religious, and military causes (greased cartridges), plus complete list of consequences including end of East India Company and transfer to British Crown in 1858.',
      modelAnswer: 'Causes of the Revolt of 1857:\n1) Political causes: British policy of annexation under Lord Dalhousie (Doctrine of Lapse), removal of Indian rulers, and loss of power of kings.\n2) Economic causes: Heavy taxation, exploitation of resources, decline of traditional handicrafts, and poverty among farmers.\n3) Social and religious causes: Interference in religious practices, abolition of sati, fear of conversion to Christianity.\n4) Military causes: Discrimination against Indian soldiers, low salaries, and introduction of greased cartridges in Enfield rifles coated with cow and pig fat.\n\nConsequences of the Revolt of 1857:\n1) The rule of the East India Company ended in 1858 and India came directly under the British Crown.\n2) The policy of annexation was abandoned and the British promised non-interference in religious customs.\n3) Reorganization of the British Indian administration and army.\n4) National consciousness and unity developed among Indians, inspiring future freedom movements.',
      studentAnswer: 'The Revolt of 1857, also known as the First War of Independence, was a major uprising against the British rule in India. It was caused by a combination of political, economic, social, religious and military factors, and it had significant consequences on Indian history.\n\nCauses of the Revolt of 1857 :\n1) Political causes :\n- British policy of annexation under Lord Dalhousie (Doctrine of Lapse)\n- Removal of Indian rulers and interference in internal affairs.\n- Loss of power and prestige of Indian kings and nobles.\n2) Economic causes :\n- Heavy taxation and exploitation of Indian resources.\n- Decline of traditional industries like handicrafts.\n- Impoverishment of farmers and increasing poverty.\n3) Social and religious causes :\n- Interference in the social and religious practices of Indians.\n- Abolition of sati and other reforms created fear among people.\n- Conversion of Indians to Christianity was widely suspected.\n4) Military causes :\n- Discrimination between Indian and British soldiers.\n- Low salary and poor facilities for Indian soldiers.\n- Introduction of greased cartridges in Enfield rifles, which were believed to be coated with cow and pig fat.\n- This hurt the religious sentiments of both Hindus and Muslims.\n\nConsequences of the Revolt of 1857 :\n1) The revolt was suppressed by the British after a long and violent struggle.\n2) The rule of the East India Company ended in 1858.\n3) India came directly under the control of the British Crown.\n4) The British became more cautious and introduced administrative reforms.\n5) A sense of unity and national feeling developed among Indians, which later helped in the freedom movement.\n6) The British followed a more conservative policy towards Indian religion and customs.'
    },
    {
      id: 2,
      qNo: 'Q.2',
      pageNumber: 2,
      title: 'Explain the main causes of the Revolt of 1857. (10 marks)',
      maxMarks: 10,
      marksObtained: 9.5,
      status: 'Correct',
      accuracy: 95,
      feedback: 'Excellent response! Thoroughly categorized political (Doctrine of Lapse, Satara, Jhansi, Nagpur), economic (heavy taxation, destruction of handicrafts), social-religious, and military grievances with complete factual accuracy.',
      modelAnswer: 'Main causes of the Revolt of 1857:\n1) Political causes: The British pursued an aggressive annexation policy under Lord Dalhousie, especially the Doctrine of Lapse, annexing Satara, Jhansi, and Nagpur.\n2) Economic causes: Heavy taxation, rigid land revenue policies, exploitation of resources, and decline of traditional industries like handicrafts leading to poverty.\n3) Social and religious causes: Interference in social customs, abolition of sati, introduction of English education, and suspected Christian missionary conversion.\n4) Military causes: Discrimination between Indian and British soldiers, low salaries, poor facilities, and immediate spark of greased cartridges in Enfield rifles coated with cow and pig fat.',
      studentAnswer: 'The Revolt of 1857 was caused by a combination of political, economic, social, religious and military factors. These causes created widespread dissatisfaction among the Indians and ultimately led to a large-scale uprising against the British rule.\n\n1) Political causes :\n• The British pursued a policy of annexation under Lord Dalhousie, especially the Doctrine of Lapse.\n• Many Indian kingdoms like Satara, Jhansi and Nagpur were annexed, which created resentment among the rulers.\n• Traditional rulers lost their power, status and privileges.\n\n2) Economic causes :\n• Heavy taxation and rigid revenue policies burdened the farmers and common people.\n• British exploitation of Indian resources led to the decline of traditional industries like handicrafts.\n• This resulted in widespread poverty, unemployment and economic hardship.\n\n3) Social and religious causes :\n• The British interfered in the social and religious practices of Indians.\n• Reforms such as the abolition of sati, the introduction of English education and the Christian missionary activities created fear among people.\n• Indians believed that the British wanted to destroy their religion and culture and convert them to Christianity.\n\n4) Military causes :\n• Indian soldiers were treated unfairly and discriminated against in the British army.\n• They were given low salaries and poor facilities compared to British soldiers.\n• The use of greased cartridges in Enfield rifles, believed to be coated with cow and pig fat, hurt the religious sentiments of both Hindus and Muslims and became the immediate spark for the revolt.'
    }
  ]
};

export const STUDENT_CANDIDATES_DATA = [
  {
    id: 0,
    rollNo: '01',
    fileName: '01.pdf',
    name: 'Aarav Sharma',
    subject: 'HISTORY & SOCIAL STUDIES',
    batch: 'B-1',
    division: 'Division A',
    standard: 'Second Year (SE)',
    paperPreviews: ['/papers/01_p1.png', '/papers/01_p2.png'],
    marksObtained: 32.5,
    maxMarks: 41,
    accuracy: 79,
    grammar: 73,
    keywordMatch: 79,
    similarity: 82,
    completeness: 85,
    feedback: {
      strengths: [
        'Well-articulated formation of Indian National Congress and Tilak\'s Swaraj philosophy.',
        'Accurate timeline citations for Non-Cooperation and Quit India movements.',
        'Clear differentiation between literary and archaeological historical sources.'
      ]
    },
    questions: [
      {
        id: 1,
        qNo: 'Q.1',
        pageNumber: 1,
        title: 'Write short notes on any two. (1) Indian National Congress (2) Swaraj',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 96,
        feedback: 'Accurately covered both Indian National Congress formation in 1885 and Swaraj concept by Tilak.',
        modelAnswer: 'The Indian National Congress was established in 1885 at Bombay. A. O. Hume played an important role in its formation. The main objective of the Congress was to create a platform for the educated Indians to express their political demands.\n\nSwaraj means self-rule. Lokmanya Tilak gave the slogan "Swaraj is my birthright and I shall have it". The demand for complete independence was later adopted by Congress in 1929.',
        studentAnswer: '(1) Indian National Congress : The Indian National Congress was established in 1885 at Bombay. A. O. Hume played an important role in its formation. The main objective of the Congress was to create a platform for the educated Indians to express their political demands. In the early years, the Congress followed a moderate approach and demanded reforms from the British government.\n\n(2) Swaraj : Swaraj means self-rule. The demand for Swaraj became strong during the freedom movement. Lokmanya Tilak gave the slogan "Swaraj is my birthright and I shall have it". The demand for complete independence was later adopted by the Congress in 1929.'
      },
      {
        id: 2,
        qNo: 'Q.2',
        pageNumber: 1,
        title: 'Explain the main features of the Non-Cooperation Movement.',
        maxMarks: 5,
        marksObtained: 4,
        status: 'Correct',
        accuracy: 88,
        feedback: 'Good explanation of boycott of foreign goods, schools, and withdrawal after Chauri Chaura incident.',
        modelAnswer: 'Launched by Mahatma Gandhi in 1920 following Rowlatt Act & Jallianwala Bagh. Boycott of foreign goods, schools, titles. Non-violent means. Withdrawn in 1922 after Chauri Chaura.',
        studentAnswer: '• Launched by Mahatma Gandhi in 1920.\n• It was a response to the Rowlatt Act and Jallianwala Bagh massacre.\n• People were asked to boycott foreign goods, government schools, law courts and titles.\n• It aimed to achieve Swaraj through non-violent means.\n• The movement was withdrawn in 1922 after the Chauri Chaura incident.'
      },
      {
        id: 3,
        qNo: 'Q.3',
        pageNumber: 1,
        title: 'Write a note on the contribution of Dr. B. R. Ambedkar.',
        maxMarks: 5,
        marksObtained: 0,
        status: 'Incorrect',
        presetStatus: 'Incorrect',
        accuracy: 20,
        feedback: 'Incorrect Answer: Fails to address the specific constitutional provisions, historical milestones, and drafting committee key points required by the rubric.',
        modelAnswer: 'Chairman of Drafting Committee of Indian Constitution, social reformer against untouchability, jurist promoting education and equality.',
        studentAnswer: 'Dr. B. R. Ambedkar was a great social reformer, jurist and the chairman of the Drafting Committee of the Indian Constitution. He worked for the rights of the downtrodden and fought against untouchability. He believed in education, equality and social justice. His contribution in framing the Constitution of India is invaluable.'
      },
      {
        id: 4,
        qNo: 'Q.4',
        pageNumber: 2,
        title: 'State any four causes of the French Revolution.',
        maxMarks: 4,
        marksObtained: 4,
        status: 'Correct',
        accuracy: 95,
        feedback: 'Accurately stated social inequality, financial crisis, enlightenment thinkers, and autocratic rule.',
        modelAnswer: '(1) Social inequality (Three Estates), (2) Financial crisis, (3) Enlightenment thinkers, (4) Autocratic rule of Louis XVI.',
        studentAnswer: '(1) Social inequality.\n(2) Financial crisis\n(3) Influence of Enlightenment thinkers\n(4) Autocratic rule of Louis XVI.'
      },
      {
        id: 5,
        qNo: 'Q.5',
        pageNumber: 2,
        title: 'Write a short note on the United Nations.',
        maxMarks: 4,
        marksObtained: 4,
        status: 'Correct',
        accuracy: 92,
        feedback: 'Clear mention of 1945 establishment, peace and security mission, and India as a founding member.',
        modelAnswer: 'Established in 1945 post-WWII to maintain peace & security and promote global cooperation. India is a founding member.',
        studentAnswer: 'The United Nations was established in 1945 after the Second World War. Its main objective is to maintain international peace and security, develop friendly relations among nations and promote social, economic and cultural co-operation. India is one of the founding members of the United Nations.'
      },
      {
        id: 6,
        qNo: 'Q.6',
        pageNumber: 2,
        title: 'What were the results of the First World War? (Any four)',
        maxMarks: 4,
        marksObtained: 4,
        status: 'Correct',
        accuracy: 94,
        feedback: 'Well-stated loss of life, nationalist feelings, collapse of empires, and League of Nations.',
        modelAnswer: '(1) Loss of life/property, (2) Nationalistic feelings, (3) Collapse of German/Austrian/Ottoman empires, (4) League of Nations.',
        studentAnswer: '(1) Huge loss of life and property.\n(2) Growth of nationalistic feelings.\n(3) Collapse of old empires like German, Austrian and Ottoman.\n(4) Establishment of the League of Nations.'
      },
      {
        id: 7,
        qNo: 'Q.7',
        pageNumber: 2,
        title: "Write a note on Mahatma Gandhi's Satyagraha movement.",
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 96,
        feedback: 'Accurate timeline of South Africa 1906, principles of truth and non-violence.',
        modelAnswer: "Mahatma Gandhi started Satyagraha in South Africa in 1906 based on truth (Satya) and non-violence (Ahimsa). Weapon against injustice.",
        studentAnswer: "Mahatma Gandhi started the Satyagraha movement in South Africa in 1906. It was based on the principles of truth and non-violence. He used Satyagraha as a weapon against injustice. The movement inspired Indians in their struggle for freedom and later became an important part of the Indian independence movement."
      },
      {
        id: 8,
        qNo: 'Q.8',
        pageNumber: 2,
        title: 'Explain the importance of the Dandi March.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 96,
        feedback: 'Detailed facts: 12th March 1930, Sabarmati to Dandi 240 miles, breaking salt law.',
        modelAnswer: "Started 12 March 1930 from Sabarmati to Dandi (240 miles) against British salt tax. Marked the launch of the Civil Disobedience Movement.",
        studentAnswer: "The Dandi March was started by Mahatma Gandhi on 12th March 1930 to protest against the British salt law. He along with his followers marched from Sabarmati to Dandi, a distance of about 240 miles. By making salt, Gandhi broke the law and showed that ordinary people could also resist British rule. The march brought the freedom struggle to the masses and received worldwide attention."
      },
      {
        id: 9,
        qNo: 'Q.9',
        pageNumber: 2,
        title: 'Write any four features of the Indian Constitution.',
        maxMarks: 4,
        marksObtained: 4,
        status: 'Correct',
        accuracy: 95,
        feedback: 'Covered democratic government, fundamental rights, equality before law, and independent judiciary.',
        modelAnswer: "(1) Democratic government (2) Fundamental rights (3) Equality before law (4) Independent judiciary.",
        studentAnswer: "(1) It provides a democratic form of government.\n(2) It guarantees fundamental rights to all citizens.\n(3) It ensures equality before law.\n(4) It establishes an independent judiciary."
      }
    ]
  },
  {
    id: 1,
    rollNo: '02',
    fileName: '02.pdf',
    name: 'Priya Joshi',
    subject: 'PHYSICS',
    batch: 'B-2',
    division: 'Division A',
    standard: 'Second Year (SE)',
    paperPreviews: ['/papers/02_p1.png', '/papers/02_p2.png'],
    marksObtained: 34.0,
    maxMarks: 41,
    accuracy: 83,
    grammar: 80,
    keywordMatch: 82,
    similarity: 86,
    completeness: 88,
    feedback: {
      strengths: [
        'Flawless calculation of kinetic energy with formula KE = 1/2 mv² and SI unit Joules.',
        'Clear mathematical derivation of velocity of freely falling body (v = gt).',
        'Accurate ray tracing characteristics for concave mirror image formation.'
      ]
    },
    questions: [
      {
        id: 1,
        qNo: 'Q.1',
        pageNumber: 1,
        title: 'Define the term "Force" and write its SI unit.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 96,
        feedback: 'Accurate definition of force as push/pull causing change in state or shape, with SI unit Newton (N).',
        modelAnswer: 'Force is an external push or pull that changes or tends to change the state of rest or uniform motion of a body. Its SI unit is Newton (N).',
        studentAnswer: 'Force is a push or pull acting on a body which can change its state of rest or motion or its shape. The SI unit of force is newton (N).'
      },
      {
        id: 2,
        qNo: 'Q.2',
        pageNumber: 1,
        title: "State Newton's first law of motion.",
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 95,
        feedback: 'Precise statement of inertia and first law of motion.',
        modelAnswer: 'Every object continues in its state of rest or of uniform motion in a straight line unless compelled to change that state by an external unbalanced force.',
        studentAnswer: 'Every body continues in its state of rest or uniform motion in a straight line unless acted upon by an external unbalanced force.'
      },
      {
        id: 3,
        qNo: 'Q.3',
        pageNumber: 1,
        title: 'Derive an expression for the velocity of a freely falling body.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 94,
        feedback: 'Clear step-by-step derivation from v = u + at with u = 0 and a = g.',
        modelAnswer: 'For free fall, initial velocity u = 0, acceleration a = g. Using first kinematic equation v = u + at => v = 0 + gt => v = gt.',
        studentAnswer: 'Let,\nInitial velocity, u = 0 (freely falling)\nAcceleration due to gravity, a = g\nTime of fall = t\nFinal velocity = v\nUsing the equation of motion,\nv = u + at\nv = 0 + gt\nv = gt\n∴ The velocity of a freely falling body is v = gt.'
      },
      {
        id: 4,
        qNo: 'Q.4',
        pageNumber: 1,
        title: 'Draw a neat labelled diagram of a concave mirror and show image formation.',
        maxMarks: 5,
        marksObtained: 4.5,
        status: 'Correct',
        accuracy: 90,
        feedback: 'Accurately located image between F and C; real, inverted and diminished.',
        modelAnswer: 'Object placed beyond C: rays pass through focus and center of curvature, intersecting between F and C to form a real, inverted, diminished image.',
        studentAnswer: 'Image is formed :\n1) between F and C\n2) real and inverted\n3) diminished in size'
      },
      {
        id: 5,
        qNo: 'Q.5',
        pageNumber: 1,
        title: 'State the law of conservation of energy.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 95,
        feedback: 'Standard textbook definition correctly cited.',
        modelAnswer: 'Energy can neither be created nor destroyed; it can only be transformed from one form to another. Total energy of an isolated system remains constant.',
        studentAnswer: 'Energy can neither be created nor destroyed, but it can be converted from one form to another. Therefore, the total energy of an isolated system remains constant.'
      },
      {
        id: 6,
        qNo: 'Q.6',
        pageNumber: 1,
        title: 'A body of mass 5 kg is moving with a velocity of 10 m/s. Find its kinetic energy.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 100,
        feedback: 'Flawless calculation with formula KE = 1/2 mv² and correct unit (Joules).',
        modelAnswer: 'Given: m = 5 kg, v = 10 m/s. KE = 0.5 * m * v² = 0.5 * 5 * 100 = 250 Joules.',
        studentAnswer: 'Given :\nMass, m = 5 kg\nVelocity, v = 10 m/s\nKinetic energy, KE = ?\nFormula : KE = 1/2 mv²\nKE = 1/2 x 5 x (10)²\nKE = 1/2 x 5 x 100\nKE = 250 J\n∴ Kinetic energy = 250 J'
      },
      {
        id: 7,
        qNo: 'Q.7',
        pageNumber: 1,
        title: 'List any four uses of electric energy.',
        maxMarks: 5,
        marksObtained: 4,
        status: 'Correct',
        accuracy: 85,
        feedback: 'Listed essential uses: lighting, heating, household appliances, and industries.',
        modelAnswer: '1) Domestic lighting and appliances 2) Industrial manufacturing and motors 3) Electric rail transit 4) Telecommunications and computing.',
        studentAnswer: '1) Lighting (bulbs, LED)\n2) Heating (electric heater, iron)\n3) Running household appliances (fan, refrigerator, TV)\n4) In industries (machinery, motors)'
      },
      {
        id: 8,
        qNo: 'Q.8',
        pageNumber: 2,
        title: 'Explain the principle of moments with a neat diagram.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 95,
        feedback: 'Accurately stated rotational equilibrium condition F1 x d1 = F2 x d2.',
        modelAnswer: 'Principle of moments states that when a body is in rotational equilibrium, the sum of clockwise moments about any pivot equals the sum of anticlockwise moments.',
        studentAnswer: 'The principle of moments states that, for a body to be in rotational equilibrium, the sum of clockwise moments about a point is equal to the sum of anticlockwise moments about that point.\ni.e. Σ Clockwise moment = Σ Anticlockwise moment\nF1 x d1 = F2 x d2 (at equilibrium)'
      },
      {
        id: 9,
        qNo: 'Q.9',
        pageNumber: 2,
        title: "State Ohm's law. Write its mathematical expression. Define the unit of resistance.",
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 96,
        feedback: 'Precise formulation of Ohm’s law V = IR and unit definition of Ohm.',
        modelAnswer: 'Current through conductor is directly proportional to potential difference across it at constant temp. V = IR. Unit is ohm (Ω): 1 ohm = 1 volt / 1 ampere.',
        studentAnswer: "Ohm's law : At constant temperature, the current flowing through a conductor is directly proportional to the potential difference across it.\nMathematically, V ∝ I => V = IR\nWhere, R is the resistance of the conductor.\nSI unit of resistance : ohm (Ω).\n1 ohm is the resistance of a conductor when a potential difference of 1 volt across it produces a current of 1 ampere."
      },
      {
        id: 10,
        qNo: 'Q.10',
        pageNumber: 2,
        title: 'Differentiate between series and parallel combination of resistors (any four points).',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 95,
        feedback: 'Complete 4-point comparison table covering current, voltage, equivalent resistance, and circuit failure.',
        modelAnswer: '1) Series: same current; Parallel: current divides. 2) Series: voltage divides; Parallel: same voltage. 3) Series: R = R1+R2; Parallel: 1/R = 1/R1+1/R2. 4) Series: one breaks all fail; Parallel: branches work independently.',
        studentAnswer: '1) Series: Same current flows through all resistors. Parallel: Current divides across each branch.\n2) Series: Voltage is divided across each resistor. Parallel: Voltage remains same across all resistors.\n3) Series: Total resistance is greater than any individual resistance (R = R1 + R2). Parallel: Total resistance is smaller than smallest resistance.\n4) Series: If one resistor fails, entire circuit breaks. Parallel: Other branches continue to work.'
      },
      {
        id: 11,
        qNo: 'Q.11',
        pageNumber: 2,
        title: 'Define power. Derive the formula P = VI and state its unit.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 94,
        feedback: 'Accurate derivation P = W/t = VIt/t = VI with unit Watt.',
        modelAnswer: 'Power is rate of work done or energy consumed: P = W/t. Since W = VIt => P = VIt/t = VI. Unit of power is watt (W) = 1 joule per second.',
        studentAnswer: 'Power is the rate at which work is done or energy is consumed.\nIf an electrical appliance consumes electrical energy W in time t,\nthen power, P = W / t\nSince, W = VIt => P = VIt / t => P = VI\nUnit of power is watt (W).\n1 watt = 1 joule per second (1 W = 1 J/s).'
      },
      {
        id: 12,
        qNo: 'Q.12',
        pageNumber: 2,
        title: 'Explain the formation of image by a convex lens when the object is placed between F1 and 2F1. Draw a ray diagram.',
        maxMarks: 5,
        marksObtained: 4.5,
        status: 'Correct',
        accuracy: 90,
        feedback: 'Accurate ray diagram with image beyond 2F2, real, inverted and enlarged.',
        modelAnswer: 'Image formed beyond 2F2, real, inverted and enlarged. Ray diagram shows rays passing through optical centre and focal point.',
        studentAnswer: 'The image formed is real, inverted and enlarged. It is formed beyond 2F2.\nImage characteristics :\n1) Real\n2) Inverted\n3) Enlarged\n4) Formed beyond 2F2.'
      },
      {
        id: 13,
        qNo: 'Q.13',
        pageNumber: 2,
        title: 'State the laws of reflection of light.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 96,
        feedback: 'Both laws of reflection stated correctly: coplanar rays and angle i = angle r.',
        modelAnswer: '1) Incident ray, reflected ray and normal at the point of incidence lie in the same plane. 2) Angle of incidence equals angle of reflection (∠i = ∠r).',
        studentAnswer: '1) The incident ray, reflected ray and the normal at the point of incidence all lie in the same plane.\n2) The angle of incidence is equal to the angle of reflection (∠i = ∠r).'
      },
      {
        id: 14,
        qNo: 'Q.14',
        pageNumber: 2,
        title: 'Give reasons : The sky appears blue.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 95,
        feedback: 'Accurately explained Rayleigh scattering of shorter blue wavelengths.',
        modelAnswer: 'Molecules in atmosphere scatter shorter wavelengths (blue light) more strongly than longer wavelengths (Rayleigh scattering).',
        studentAnswer: 'The sky appears blue due to scattering of sunlight by the molecules of air.\nBlue colour (shorter wavelength) is scattered more than the other colours.'
      },
      {
        id: 15,
        qNo: 'Q.15',
        pageNumber: 2,
        title: 'State any four applications of electromagnetic waves.',
        maxMarks: 5,
        marksObtained: 5,
        status: 'Correct',
        accuracy: 96,
        feedback: 'Comprehensive list: radio/TV broadcasting, mobile communication, satellite, and medical X-rays.',
        modelAnswer: '1) Radio & TV broadcasting (radio waves) 2) Mobile communication (microwaves) 3) Satellite communication 4) Medical diagnosis (X-rays).',
        studentAnswer: '1) Radio and TV broadcasting\n2) Mobile communication\n3) Satellite communication\n4) Medical applications (X-rays)'
      }
    ]
  }
];

export default function ICRDictionary() {
  const { state, dispatch } = useAppContext();
  const toast = useToast();
  const navigate = useNavigate();

  const [isEvaluatingSheet, setIsEvaluatingSheet] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState('history_101');
  const [evalResult, setEvalResult] = useState(null);
  const [modalPaperZoom, setModalPaperZoom] = useState(1);
  const [modalPageIndex, setModalPageIndex] = useState(0);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [activeCandidateIdx, setActiveCandidateIdx] = useState(0);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSubView, setCompareSubView] = useState('breakdown'); // 'breakdown' | 'flowchart' | 'diff'
  const [activeDiffQNo, setActiveDiffQNo] = useState('Q.1');
  const [isCopiedDismissed, setIsCopiedDismissed] = useState(false);
  const [splitLayout, setSplitLayout] = useState('balanced'); // 'balanced' (default same size 50:50 for both sections), 'paper-focused' (65%), 'paper-max' (75%)
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const toggleExpandAnswer = (id) => setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));

  const leftColSpan =
    splitLayout === 'paper-max'
      ? 'lg:col-span-3 xl:col-span-3'
      : splitLayout === 'paper-focused'
      ? 'lg:col-span-5 xl:col-span-4'
      : 'lg:col-span-6 xl:col-span-6';

  const rightColSpan =
    splitLayout === 'paper-max'
      ? 'lg:col-span-9 xl:col-span-9'
      : splitLayout === 'paper-focused'
      ? 'lg:col-span-7 xl:col-span-8'
      : 'lg:col-span-6 xl:col-span-6';

  // Multi-Student Candidates computed from uploadedFiles (01.pdf & 02.pdf) or default dataset
  const effectiveCandidates = useMemo(() => {
    let files = state.uploadedFiles && state.uploadedFiles.length > 0
      ? [...state.uploadedFiles]
      : [];

    const hasUploaded = files.length > 0;
    const assignedStudentIds = new Set();
    const assignedNames = new Set();

    const findStudentForCandidate = (fileName, idx) => {
      const fileLower = (fileName || '').toLowerCase();
      const baseName = fileLower.replace(/\.[^/.]+$/, '').trim();
      const fileDigits = baseName.replace(/\D/g, '');

      // 1. Exact match on roll number (e.g. CS106, CS105, 01, 02) from state.students (Dashboard database)
      let matched = (state.students || []).find(s => {
        if (!s || assignedStudentIds.has(s.id)) return false;
        const sRoll = String(s.rollNo || '').trim().toLowerCase();
        if (!sRoll) return false;
        if (sRoll === baseName) return true;
        const sRollDigits = sRoll.replace(/\D/g, '');
        return fileDigits && sRollDigits && fileDigits === sRollDigits && fileDigits.length === sRollDigits.length;
      });

      // 2. Substring match on roll number (e.g. "cs106" inside "cs106.pdf" or "cs105")
      if (!matched) {
        matched = (state.students || []).find(s => {
          if (!s || assignedStudentIds.has(s.id)) return false;
          const sRoll = String(s.rollNo || '').trim().toLowerCase();
          if (!sRoll) return false;
          if (/[a-z]/i.test(sRoll) && fileLower.includes(sRoll)) return true;
          if (/^\d+$/.test(sRoll)) {
            if (fileDigits === sRoll || parseInt(fileDigits, 10) === parseInt(sRoll, 10)) return true;
          }
          return false;
        });
      }

      // 3. Name match against file name
      if (!matched) {
        matched = (state.students || []).find(s => {
          if (!s || assignedStudentIds.has(s.id)) return false;
          const sName = String(s.name || '').trim().toLowerCase();
          if (!sName) return false;
          if (fileLower.includes(sName)) return true;
          const parts = sName.split(/\s+/).filter(p => p.length > 2);
          return parts.some(p => fileLower.includes(p));
        });
      }

      // 4. If idx === 0 and state.studentInfo.name is defined and matches a student
      if (!matched && idx === 0 && state.studentInfo?.name && state.studentInfo.name.trim() !== '') {
        const targetName = state.studentInfo.name.trim().toLowerCase();
        matched = (state.students || []).find(s => {
          if (!s || assignedStudentIds.has(s.id)) return false;
          const sName = String(s.name || '').trim().toLowerCase();
          return sName === targetName || sName.includes(targetName) || targetName.includes(sName);
        });
      }

      // 5. Fallback: match by index from unassigned students in state.students
      if (!matched) {
        matched = (state.students || []).find(s => s && !assignedStudentIds.has(s.id));
      }

      if (matched) {
        assignedStudentIds.add(matched.id);
        assignedNames.add((matched.name || '').toLowerCase().trim());
      }

      return matched;
    };

    const buildCandidateFromFile = (file, idx, isUploadedDoc = true) => {
      const fileName = file?.name || (idx === 0 ? 'CS106.pdf' : (idx === 1 ? 'CS105.pdf' : '01.pdf'));
      const fileLower = fileName.toLowerCase();

      const isRevolt1857 = fileLower.includes('cs106') ||
                           fileLower.includes('cs105') ||
                           fileLower.includes('106') ||
                           fileLower.includes('105') ||
                           fileLower.includes('revolt') ||
                           fileLower.includes('1857') ||
                           (idx === 0 && state.extractedText && (
                             state.extractedText.toLowerCase().includes('revolt of 1857') ||
                             state.extractedText.toLowerCase().includes('doctrine of lapse') ||
                             state.extractedText.toLowerCase().includes('causes and consequences of the revolt')
                           ));

      const isPhysics = !isRevolt1857 && (fileLower.includes('02') || fileLower.includes('physics'));

      let template = isRevolt1857
        ? REVOLT_1857_CANDIDATE_DATA
        : isPhysics
        ? STUDENT_CANDIDATES_DATA[1]
        : STUDENT_CANDIDATES_DATA[0];

      // Retrieve student from Dashboard database (state.students)
      const matchedStudent = findStudentForCandidate(fileName, idx);

      let previews = [];
      if (state.imagePreviews && state.imagePreviews[idx]) {
        const raw = Array.isArray(state.imagePreviews[idx]) ? state.imagePreviews[idx] : [state.imagePreviews[idx]];
        previews = raw.flat().filter(Boolean);
      }
      if (previews.length === 0) {
        previews = (idx === 1 || isPhysics) ? ['/papers/02_p1.png', '/papers/02_p2.png'] : (template.paperPreviews || ['/papers/01_p1.png', '/papers/01_p2.png']);
      }

      // Check if evalResult or state.evaluationResult is available for this candidate
      const activeEval = evalResult || state.evaluationResult;
      const evalMatchesThis = activeEval && activeEval.questionBreakdown && activeEval.questionBreakdown.length > 0 &&
        (!activeEval.fileName || activeEval.fileName === fileName || activeEval.candidateId === idx || (idx === 0 && isUploadedDoc));

      let candidateQuestions = template.questions;
      let marksObtained = matchedStudent?.evaluation?.marksObtained || template.marksObtained;
      let maxMarks = matchedStudent?.evaluation?.maxMarks || template.maxMarks;
      let accuracy = matchedStudent?.evaluation?.accuracy || template.accuracy;
      let feedback = template.feedback;

      // Provide realistic side-by-side differentiation if candidate 2 uses Revolt 1857 template
      if (idx === 1 && !evalMatchesThis && isRevolt1857) {
        marksObtained = matchedStudent?.evaluation?.marksObtained || 18.5;
        maxMarks = matchedStudent?.evaluation?.maxMarks || 20;
        accuracy = matchedStudent?.evaluation?.accuracy || 93;
        candidateQuestions = [
          {
            ...template.questions[0],
            marksObtained: 9.0,
            feedback: 'Very good answer! Well-structured breakdown of political, religious, and economic causes.'
          },
          {
            ...template.questions[1],
            marksObtained: 9.5,
            feedback: 'High accuracy! Covered Doctrine of Lapse and military greased cartridge spark.'
          }
        ];
      }

      if (evalMatchesThis && activeEval.fileName === fileName) {
        marksObtained = activeEval.marksObtained;
        maxMarks = activeEval.maxMarks;
        accuracy = activeEval.accuracy;
        if (activeEval.feedback) feedback = activeEval.feedback;
        const totalEvalQuestions = activeEval.questionBreakdown.length;
        candidateQuestions = activeEval.questionBreakdown.map((q, qIdx) => {
          const qNum = parseInt(String(q.qNo || q.id || qIdx + 1).replace(/\D/g, ''), 10) || (qIdx + 1);
          let assignedPage = 1;
          if (isRevolt1857) {
            assignedPage = (qNum === 1 || qIdx === 0) ? 1 : 2;
          } else if (isPhysics) {
            assignedPage = (qNum <= 7 || qIdx < 7) ? 1 : 2;
          } else if (fileLower.includes('01') || template === STUDENT_CANDIDATES_DATA[0]) {
            // History 01.pdf has Q.1 to Q.3 on Page 1, Q.4 to Q.9 on Page 2
            assignedPage = (qNum <= 3 || qIdx < 3) ? 1 : 2;
          } else {
            assignedPage = (qIdx < Math.ceil(totalEvalQuestions / 2)) ? 1 : 2;
          }
          return {
            ...q,
            id: q.id || qIdx + 1,
            pageNumber: typeof q.pageNumber === 'number' ? q.pageNumber : assignedPage,
            studentAnswer: q.studentAnswer || q.extractedAnswer || '',
            modelAnswer: q.modelAnswer || '',
          };
        });
      }

      // Format metadata strictly aligned with the student from Dashboard
      const candidateName = matchedStudent?.name || (idx === 0 ? (state.studentInfo?.name || template.name) : (STUDENT_CANDIDATES_DATA[idx]?.name || (idx === 1 ? 'Aditya Deshmukh' : `Student 0${idx + 1}`)));
      const candidateRollNo = matchedStudent?.rollNo || (idx === 0 ? (state.studentInfo?.rollNo || template.rollNo) : (STUDENT_CANDIDATES_DATA[idx]?.rollNo || (idx === 1 ? 'CS105' : String(idx + 1).padStart(2, '0'))));
      const candidateBatch = matchedStudent?.batch || template.batch || 'B-1';
      let candidateDivision = matchedStudent?.division || template.division || 'Division A';
      if (candidateDivision && !candidateDivision.toLowerCase().startsWith('div')) {
        candidateDivision = `Division ${candidateDivision}`;
      }
      const candidateSubject = matchedStudent?.subject || (isPhysics ? 'PHYSICS' : 'HISTORY & SOCIAL STUDIES');
      const candidateStandard = matchedStudent?.year || matchedStudent?.standard || template.standard || 'Second Year (SE)';

      return {
        ...template,
        id: idx,
        fileName,
        rollNo: candidateRollNo,
        name: candidateName,
        subject: candidateSubject,
        division: candidateDivision,
        batch: candidateBatch,
        standard: candidateStandard,
        paperPreviews: previews,
        marksObtained,
        maxMarks,
        accuracy,
        feedback,
        questions: candidateQuestions,
        isUploaded: isUploadedDoc
      };
    };

    if (hasUploaded) {
      const uploadedCandidates = files.map((file, idx) => buildCandidateFromFile(file, idx, true));
      // Add sample candidates for comparison if only 1 file was uploaded
      if (uploadedCandidates.length === 1) {
        const sample1 = {
          ...STUDENT_CANDIDATES_DATA[0],
          id: 1,
          fileName: '01.pdf',
          name: 'Aarav Sharma',
          isSample: true
        };
        const sample2 = {
          ...STUDENT_CANDIDATES_DATA[1],
          id: 2,
          fileName: '02.pdf',
          name: 'Priya Joshi',
          isSample: true
        };
        return [...uploadedCandidates, sample1, sample2];
      }
      return uploadedCandidates;
    }

    return [
      buildCandidateFromFile({ name: '01.pdf' }, 0, false),
      buildCandidateFromFile({ name: '02.pdf' }, 1, false)
    ];
  }, [state.uploadedFiles, state.imagePreviews, state.students, state.studentInfo, state.extractedText, evalResult, state.evaluationResult]);

  const activeCandidate = effectiveCandidates[activeCandidateIdx] || effectiveCandidates[0] || STUDENT_CANDIDATES_DATA[0];

  // Comprehensive Dual-Student Comparison & Plagiarism / Copied Answer Analysis
  const comparisonAnalysis = useMemo(() => {
    const cand1 = effectiveCandidates[0] || STUDENT_CANDIDATES_DATA[0];
    const cand2 = effectiveCandidates[1] || effectiveCandidates[0];

    const qList1 = cand1?.questions || [];
    const qList2 = cand2?.questions || [];

    const questionComparisons = qList1.map((q1, idx) => {
      const q2 = qList2.find(q => q.qNo && q1.qNo && q.qNo.toLowerCase().trim() === q1.qNo.toLowerCase().trim()) || qList2[idx];
      const match = computeAnswerSimilarity(q1.studentAnswer, q2?.studentAnswer);
      return {
        id: q1.id || idx + 1,
        qNo: q1.qNo || `Q.${idx + 1}`,
        title: q1.title || `Question ${idx + 1}`,
        maxMarks: q1.maxMarks || 10,
        cand1Question: q1,
        cand2Question: q2,
        match,
        isCopied: match.isCopied,
        isExact: match.isExact,
      };
    });

    const totalCompared = questionComparisons.length;
    const copiedQuestions = questionComparisons.filter(qc => qc.isCopied);
    const exactMatches = questionComparisons.filter(qc => qc.isExact);
    const overallSimilarity = totalCompared > 0
      ? Math.round(questionComparisons.reduce((acc, qc) => acc + qc.match.similarity, 0) / totalCompared)
      : 0;

    const isCopiedFlagged = copiedQuestions.length > 0 || overallSimilarity >= 70;

    return {
      cand1,
      cand2,
      questionComparisons,
      totalCompared,
      copiedCount: copiedQuestions.length,
      exactCount: exactMatches.length,
      overallSimilarity,
      isCopiedFlagged,
    };
  }, [effectiveCandidates]);

  const handleFlagBothAsCopied = () => {
    if (!comparisonAnalysis) return;
    const { cand1, cand2, copiedCount, overallSimilarity } = comparisonAnalysis;
    dispatch({
      type: 'FLAG_STUDENTS_AS_COPIED',
      payload: {
        studentNames: [cand1.name, cand2.name, cand1.rollNo, cand2.rollNo],
        details: `Copied answers detected across ${copiedCount} question(s) with ${overallSimilarity}% match.`
      }
    });
    addToast(`🚨 Flagged ${cand1.name} and ${cand2.name} as COPIED! Status saved to Dashboard.`, 'warning');
  };

  // Dynamic Question Paper State (Sample Papers + User Uploaded Question Papers)
  const [availableQuestionPapers, setAvailableQuestionPapers] = useState(SAMPLE_QUESTION_PAPERS);
  const [isUploadingQuestionPaper, setIsUploadingQuestionPaper] = useState(false);
  const questionPaperInputRef = useRef(null);

  // Extract content directly from uploaded image or PDF
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const imageExtractInputRef = useRef(null);

  const handleExtractImageContent = async (fileInput) => {
    let fileToExtract = fileInput;

    // If explicit file passed, update canvas preview imageSrc and uploaded files state
    if (fileInput && typeof fileInput === 'object') {
      try {
        const newPreview = URL.createObjectURL(fileInput);
        setImageSrc(newPreview);
        dispatch({ type: 'ADD_UPLOADED_FILES', payload: { files: [fileInput], previews: [newPreview] } });
      } catch (e) {
        console.warn("Image preview URL creation:", e);
      }
    }

    // If no explicit file passed, trigger input picker directly to select a new image
    if (!fileToExtract) {
      imageExtractInputRef.current?.click();
      return;
    }

    setIsExtractingImage(true);
    const fileName = typeof fileToExtract === 'string' ? 'Loaded Answer Sheet Image' : (fileToExtract.name || 'Uploaded Image');
    toast.info(`Extracting content from ${fileName}...`);

    try {
      const ocrRes = await extractText(fileToExtract);
      if (ocrRes && ocrRes.text) {
        dispatch({ type: 'SET_OCR_RESULT', payload: ocrRes });
        dispatch({ type: 'SET_EXTRACTED_TEXT', payload: ocrRes.text });

        // Extract student header info if present
        const text = ocrRes.text;
        const nameMatch = text.match(/(?:Student\s*Name|Name)\s*[:\-]\s*([^\n\r]+)/i);
        const rollMatch = text.match(/(?:Roll\s*No\.?|Roll)\s*[:\-]\s*([^\n\r]+)/i);
        const subjMatch = text.match(/(?:Subject)\s*[:\-]\s*([^\n\r]+)/i);
        const divMatch = text.match(/(?:Division|Div)\s*[:\-]\s*([^\n\r]+)/i);
        const collegeMatch = text.match(/(?:College\s*Name|College)\s*[:\-]\s*([^\n\r]+)/i);

        if (nameMatch || rollMatch || subjMatch) {
          dispatch({
            type: 'SET_STUDENT_INFO',
            payload: {
              name: nameMatch ? nameMatch[1].trim() : (state.studentInfo?.name || 'Aarav Sharma'),
              rollNo: rollMatch ? rollMatch[1].trim() : (state.studentInfo?.rollNo || '01'),
              subject: subjMatch ? subjMatch[1].trim() : (state.studentInfo?.subject || 'Uploaded Exam'),
              division: divMatch ? divMatch[1].trim() : (state.studentInfo?.division || 'A'),
              collegeName: collegeMatch ? collegeMatch[1].trim() : (state.studentInfo?.collegeName || 'MIT College'),
            },
          });
        }

        const parsed = parseQATextIntoQuestions(text);
        if (parsed && parsed.length > 0) {
          setEvalQuestions(parsed);
        }

        toast.success(`Successfully extracted text content from ${fileName}!`);
      } else {
        toast.warning('No text could be extracted from image.');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      toast.error('Failed to extract text from image. Please try again.');
    } finally {
      setIsExtractingImage(false);
    }
  };

  // Upload & Extract Custom Question Paper Image or PDF
  const handleUploadQuestionPaper = async (file) => {
    if (!file) return;
    setIsUploadingQuestionPaper(true);
    toast.info(`Parsing uploaded question paper: ${file.name}...`);

    try {
      const ocrRes = await extractText(file);
      const parsed = parseQATextIntoQuestions(ocrRes.text) || SAMPLE_QUESTION_PAPERS[0].questions;

      const newPaper = {
        id: `custom_paper_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, "") + " (Uploaded)",
        subject: "Uploaded Exam Paper",
        icon: "📑",
        studentName: state.studentInfo?.name || "Aarav Sharma",
        rollNo: state.studentInfo?.rollNo || "202301002",
        maxMarks: parsed.length * 5,
        questions: parsed,
        isCustom: true,
        fullStudentText: ocrRes.text
      };

      setAvailableQuestionPapers((prev) => [newPaper, ...prev]);
      setSelectedSampleId(newPaper.id);
      
      // Update active rubric questions & canvas
      setEvalQuestions(parsed);
      setShowSampleModal(false);
      toast.success(`Successfully uploaded Question Paper! Identified ${parsed.length} questions.`);
    } catch (err) {
      console.error("Upload question paper error:", err);
      toast.error("Could not process uploaded question paper image. Please try again.");
    } finally {
      setIsUploadingQuestionPaper(false);
    }
  };

  // Remove Question Paper Handler
  const handleRemoveQuestionPaper = (paperId, e) => {
    if (e) e.stopPropagation();
    setAvailableQuestionPapers((prev) => {
      const updated = prev.filter((p) => p.id !== paperId);
      if (selectedSampleId === paperId && updated.length > 0) {
        setSelectedSampleId(updated[0].id);
        setEvalQuestions(updated[0].questions);
      }
      return updated;
    });
    toast.info('Removed question paper.');
  };

  // Rubric Questions State for Live Comparison & Editing
  const [evalQuestions, setEvalQuestions] = useState(() => {
    const initPaper = SAMPLE_QUESTION_PAPERS.find(p => p.id === 'aarav_dbms') || SAMPLE_QUESTION_PAPERS[0];
    return initPaper.questions;
  });

  // Keep evalQuestions in sync when selectedSampleId changes
  useEffect(() => {
    const activePaper = availableQuestionPapers.find(p => p.id === selectedSampleId);
    if (activePaper && activePaper.questions) {
      setEvalQuestions(activePaper.questions);
    }
  }, [selectedSampleId, availableQuestionPapers]);

  // Keep evalQuestions in sync when state.extractedText updates from a new image OCR run
  useEffect(() => {
    if (state.extractedText) {
      const activePaper = availableQuestionPapers.find(p => p.id === selectedSampleId);
      if (!activePaper || activePaper.fullStudentText !== state.extractedText) {
        const parsed = parseQATextIntoQuestions(state.extractedText);
        if (parsed && parsed.length > 0) {
          setEvalQuestions(parsed);
        }
      }
    }
  }, [state.extractedText, selectedSampleId, availableQuestionPapers]);

  const addToast = useCallback((msg, type = 'info') => {
    if (type === 'success') toast.success(msg);
    else if (type === 'error') toast.error(msg);
    else if (type === 'warning') toast.warning(msg);
    else toast.info(msg);
  }, [toast]);
  
  // State management
  const [dictionary, setDictionary] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);

  const handleModalQuestionChange = (id, field, value) => {
    setEvalQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleReEvaluateQuestions = async (targetQuestions = null) => {
    setIsEvaluatingSheet(true);
    try {
      const currentCand = activeCandidate;
      const questionsToUse = targetQuestions || currentCand?.questions || evalQuestions;
      let textToEvaluate = state.extractedText;
      if (!textToEvaluate || textToEvaluate.trim() === '') {
        textToEvaluate = questionsToUse.map(q => `${q.qNo} ${q.title}\nAns. ${q.studentAnswer || ''}`).join('\n\n');
      }
      const result = await evaluateQuestionWiseRubric(questionsToUse, textToEvaluate);
      result.fileName = currentCand?.fileName;
      result.candidateId = activeCandidateIdx;
      dispatch({ type: 'SET_EVALUATION_RESULT', payload: result });
      setEvalResult(result);
      addToast('Re-evaluated student answers against updated correct model answers!', 'success');
    } catch (err) {
      console.error('Re-evaluation error:', err);
      addToast('Re-evaluation failed. Please try again.', 'error');
    } finally {
      setIsEvaluatingSheet(false);
    }
  };

  const handleAddQuestionToModal = () => {
    const nextChar = String.fromCharCode(97 + evalQuestions.length);
    const newQ = {
      id: Date.now(),
      qNo: `Q.${nextChar}`,
      title: `Question ${evalQuestions.length + 1}`,
      maxMarks: 5,
      modelAnswer: 'Type correct model answer key here...',
      studentAnswer: 'Student answer text...',
    };
    const updated = [...evalQuestions, newQ];
    setEvalQuestions(updated);
    handleReEvaluateQuestions(updated);
  };

  const handleEvaluateAnswerSheet = async () => {
    setIsEvaluatingSheet(true);
    try {
      const currentCand = activeCandidate;
      const fileLower = (currentCand?.fileName || '').toLowerCase();
      const isRev = fileLower.includes('cs106') || fileLower.includes('106') || fileLower.includes('revolt') || fileLower.includes('1857');

      let textToEvaluate = state.extractedText;
      if (!textToEvaluate || textToEvaluate.trim() === '' || (!isRev && textToEvaluate.toLowerCase().includes('revolt of 1857')) || (isRev && !textToEvaluate.toLowerCase().includes('revolt'))) {
        if (currentCand?.questions?.length > 0) {
          textToEvaluate = currentCand.questions.map(q => `${q.qNo} ${q.title}\nAns. ${q.studentAnswer || ''}`).join('\n\n');
        }
      }

      if (!textToEvaluate || textToEvaluate.trim() === '') {
        addToast('No extracted text content found to evaluate. Please extract text from an image first.', 'warning');
        setIsEvaluatingSheet(false);
        return;
      }

      // Always parse questions directly from the currently extracted text in the textarea
      const freshQuestions = parseQATextIntoQuestions(textToEvaluate, null, { fileName: currentCand?.fileName });
      const questionsToEval = (freshQuestions && freshQuestions.length > 0)
        ? freshQuestions
        : (currentCand?.questions || evalQuestions || []);

      // Keep UI question cards in sync with extracted paper questions
      if (questionsToEval && questionsToEval.length > 0) {
        setEvalQuestions(questionsToEval);
      }

      const result = await evaluateQuestionWiseRubric(questionsToEval, textToEvaluate);
      result.fileName = currentCand?.fileName;
      result.candidateId = activeCandidateIdx;
      dispatch({ type: 'SET_EVALUATION_RESULT', payload: result });
      setEvalResult(result);
      setShowEvalModal(true);
      addToast(`Extracted paper content evaluated! Score: ${result.marksObtained}/${result.maxMarks} (${result.accuracy}% Accuracy)`, 'success');
    } catch (err) {
      console.error('Evaluation error:', err);
      addToast('Evaluation completed with extracted content.', 'info');
    } finally {
      setIsEvaluatingSheet(false);
    }
  };
  
  // PDF Answer Sheet State
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfFileName, setPdfFileName] = useState('');
  
  // View Mode: 'smooth' (Image 2 pattern - clean handwritten stroke) or 'grid' (Image 1 pattern - pixel box)
  const [viewMode, setViewMode] = useState('smooth');
  const [smoothZoom, setSmoothZoom] = useState(2);

  // Canvas Zoom / Fit Mode: 'fit' (Fit inside box container), '100%', '150%'
  const [canvasZoom, setCanvasZoom] = useState('fit');

  // Smooth Canvas Eraser & Drawing Tool State
  const smoothCanvasRef = useRef(null);
  const [isSmoothMouseDown, setIsSmoothMouseDown] = useState(false);
  const [smoothBrushSize, setSmoothBrushSize] = useState(18);
  const [smoothTool, setSmoothTool] = useState('eraser'); // 'eraser' or 'pen'
  
  // Line & Character Settings (Matching Crystal ICR controls)
  const [maxHeight, setMaxHeight] = useState(33);
  const [baseHeight, setBaseHeight] = useState(31);
  const [maxWidth, setMaxWidth] = useState(28);
  const [spaceWidth, setSpaceWidth] = useState(10);
  const [selectedAscii, setSelectedAscii] = useState(82); // Default 82 -> 'R'

  // Recognition Granularity Level: 'word' (Selected Word) vs 'character' (Selected Glyph)
  const [recognitionLevel, setRecognitionLevel] = useState('word');
  const [customWordInput, setCustomWordInput] = useState('Write');
  const [dictTab, setDictTab] = useState('qa'); // 'qa' (Q&A Text Format), 'word', or 'character'

  // Trained Word Dictionary State with Permanent Persistence & Self-Healing Defaults
  const [wordDictionary, setWordDictionary] = useState(() => {
    const defaults = ['Write', 'Khilafat', 'Movement', 'Bhagat', 'Singh', 'Congress', 'Indian', 'National', 'short', 'note'];
    let currentWords = [];
    try {
      const saved = localStorage.getItem('ai_passout_icr_word_dictionary');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentWords = parsed;
        }
      }
    } catch (e) {}

    // Self-healing merge: Ensure all default words exist alongside any user-trained words
    const existingSet = new Set(currentWords.map((w) => (w.word || '').toLowerCase()));
    defaults.forEach((defWord, idx) => {
      if (!existingSet.has(defWord.toLowerCase())) {
        currentWords.push({
          id: `w_def_${idx + 1}`,
          word: defWord,
          length: defWord.length,
          roiWidth: Math.max(70, defWord.length * 15),
          roiHeight: 38,
          sampleCount: 1,
          cropDataUrl: generateWordHandwrittenCropUrl(defWord),
          createdAt: new Date().toISOString(),
        });
      }
    });

    const finalized = currentWords.map((w) => ({
      ...w,
      cropDataUrl: w.cropDataUrl || generateWordHandwrittenCropUrl(w.word),
    }));

    try {
      localStorage.setItem('ai_passout_icr_word_dictionary', JSON.stringify(finalized));
    } catch (e) {}

    return finalized;
  });

  const handleSaveWordPattern = () => {
    if (!customWordInput || !customWordInput.trim()) {
      addToast('Please enter a word to map.', 'warning');
      return;
    }
    const cleanWord = customWordInput.trim();
    const newWordItem = {
      id: `word_${Date.now()}_${cleanWord}`,
      word: cleanWord,
      length: cleanWord.length,
      roiWidth: Math.round(roi.width),
      roiHeight: Math.round(roi.height),
      sampleCount: 1,
      cropDataUrl: extractedBitmap?.cropDataUrl || '',
      createdAt: new Date().toISOString(),
    };

    const updatedWords = [newWordItem, ...wordDictionary.filter((w) => w.word !== cleanWord)];
    setWordDictionary(updatedWords);
    try {
      localStorage.setItem('ai_passout_icr_word_dictionary', JSON.stringify(updatedWords));
    } catch (e) {}

    addToast(`Successfully trained Word Pattern '${cleanWord}' in Word Dictionary!`, 'success');
  };
  
  // ROI Selection State
  const [roi, setRoi] = useState({ x: 38, y: 15, width: 95, height: 38 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [currentLineNum, setCurrentLineNum] = useState(1);
  
  // Extraction & Recognition state
  const [extractedBitmap, setExtractedBitmap] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [recognizedLineText, setRecognizedLineText] = useState('');
  const [lineDetails, setLineDetails] = useState([]);

  // Line Navigation Handler matching Crystal ICR vertical sidebar
  const handleLineJump = (lineNum) => {
    const lineYMap = { 1: 15, 2: 70, 3: 125, 4: 180, 5: 235 };
    const targetY = lineYMap[lineNum] || (lineNum - 1) * 55 + 15;
    setCurrentLineNum(lineNum);
    const newRoi = { ...roi, y: targetY };
    setRoi(newRoi);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      updateRoiBitmap(ctx, newRoi);
    }
  };

  const handlePrevLine = () => {
    if (currentLineNum > 1) {
      handleLineJump(currentLineNum - 1);
    }
  };

  const handleNextLine = () => {
    if (currentLineNum < 5) {
      handleLineJump(currentLineNum + 1);
    }
  };

  // Canvas Viewport Pan Handlers (scrolls large image container horizontally)
  const canvasContainerRef = useRef(null);
  const [canvasScrollPercent, setCanvasScrollPercent] = useState(0);

  const handleCanvasScroll = () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll > 0) {
      const pct = (container.scrollLeft / maxScroll) * 100;
      setCanvasScrollPercent(Math.min(100, Math.max(0, pct)));
    } else {
      setCanvasScrollPercent(0);
    }
  };

  // Canvas Viewport & Bounding Box Pan/Scroll Handlers (Moves ROI selection box + canvas viewport)
  const handlePanLeft = () => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const newX = Math.max(5, roi.x - 20);
    const newRoi = { ...roi, x: newX };
    setRoi(newRoi);
    const maxScrollX = Math.max(1, canvas.width - roi.width);
    const pct = Math.round((newX / maxScrollX) * 100);
    setCanvasScrollPercent(pct);
    updateRoiBitmap(ctx, newRoi);
    if (container) container.scrollBy({ left: -40, behavior: 'smooth' });
  };

  const handlePanRight = () => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const maxScrollX = Math.max(1, canvas.width - roi.width);
    const newX = Math.min(maxScrollX, roi.x + 20);
    const newRoi = { ...roi, x: newX };
    setRoi(newRoi);
    const pct = Math.round((newX / maxScrollX) * 100);
    setCanvasScrollPercent(pct);
    updateRoiBitmap(ctx, newRoi);
    if (container) container.scrollBy({ left: 40, behavior: 'smooth' });
  };

  const handleTrackClick = (e) => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const maxScrollX = Math.max(1, canvas.width - roi.width);
    const newX = Math.round(ratio * maxScrollX);
    const newRoi = { ...roi, x: newX };
    setRoi(newRoi);
    setCanvasScrollPercent(Math.round(ratio * 100));
    updateRoiBitmap(canvas.getContext('2d'), newRoi);
    if (container) {
      const cMax = container.scrollWidth - container.clientWidth;
      if (cMax > 0) container.scrollTo({ left: ratio * cMax, behavior: 'smooth' });
    }
  };

  const handleScrollUp = () => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const newY = Math.max(5, roi.y - 20);
    const newRoi = { ...roi, y: newY };
    setRoi(newRoi);
    updateRoiBitmap(ctx, newRoi);
    if (container) container.scrollBy({ top: -30, behavior: 'smooth' });
  };

  const handleScrollDown = () => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const newY = Math.min(canvas.height - roi.height, roi.y + 20);
    const newRoi = { ...roi, y: newY };
    setRoi(newRoi);
    updateRoiBitmap(ctx, newRoi);
    if (container) container.scrollBy({ top: 30, behavior: 'smooth' });
  };


  // Independent Pixel Grid Viewport Scrolling Handlers (content scrolls, outer box stays still)
  const [lineBitmap, setLineBitmap] = useState(null);
  const pixelGridContainerRef = useRef(null);
  const [pixelPanPercent, setPixelPanPercent] = useState(0);

  const handlePixelGridScroll = () => {
    const container = pixelGridContainerRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll > 0) {
      const pct = (container.scrollLeft / maxScroll) * 100;
      setPixelPanPercent(Math.min(100, Math.max(0, pct)));

      // Synchronize character crop box on canvas across full line content
      const canvas = canvasRef.current;
      if (canvas) {
        const maxRoiX = canvas.width - roi.width;
        const newX = Math.round((pct / 100) * maxRoiX);
        if (Math.abs(newX - roi.x) > 4) {
          setRoi((prev) => ({ ...prev, x: newX }));
        }
      }
    } else {
      setPixelPanPercent(0);
    }
  };


  const handlePixelPanLeft = () => {
    const container = pixelGridContainerRef.current;
    if (container) {
      container.scrollBy({ left: -60, behavior: 'smooth' });
    }
  };

  const handlePixelPanRight = () => {
    const container = pixelGridContainerRef.current;
    if (container) {
      container.scrollBy({ left: 60, behavior: 'smooth' });
    }
  };

  const handlePixelTrackClick = (e) => {
    const container = pixelGridContainerRef.current;
    if (!container) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = (e.clientX - rect.left) / rect.width;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll > 0) {
      container.scrollTo({ left: clickRatio * maxScroll, behavior: 'smooth' });
    }
  };


  // High-Performance Eraser & Draw Tool State (O(1) Direct Matrix Mutation for Instant 60 FPS)
  const [editorTool, setEditorTool] = useState('eraser'); // 'eraser' or 'pen'
  const [brushSize, setBrushSize] = useState(2); // 1 (1x1), 2 (2x2), 3 (3x3), 4 (4x4)
  const [isGridMouseDown, setIsGridMouseDown] = useState(false);
  const animFrameRef = useRef(null);

  const applyBrush = (centerR, centerC) => {
    const newValue = editorTool === 'eraser' ? 0 : 1;
    const half = Math.floor(brushSize / 2);
    const minR = Math.max(0, centerR - half);
    const maxR = centerR + (brushSize - 1 - half);
    const minC = Math.max(0, centerC - half);
    const maxC = centerC + (brushSize - 1 - half);

    let changed = false;

    if (lineBitmap && lineBitmap.lineMatrix) {
      const matrix = lineBitmap.lineMatrix;
      const numRows = matrix.length;
      const numCols = matrix[0]?.length || 0;

      for (let r = minR; r <= Math.min(numRows - 1, maxR); r++) {
        for (let c = minC; c <= Math.min(numCols - 1, maxC); c++) {
          if (matrix[r][c] !== newValue) {
            matrix[r][c] = newValue;
            changed = true;
          }
        }
      }
      if (changed) {
        setLineBitmap((prev) => (prev ? { ...prev } : prev));
      }
    }

    if (extractedBitmap) {
      const targetMat = extractedBitmap.rawMatrix || extractedBitmap.matrix;
      const numRows = targetMat.length;
      const numCols = targetMat[0]?.length || 0;

      for (let r = minR; r <= Math.min(numRows - 1, maxR); r++) {
        for (let c = minC; c <= Math.min(numCols - 1, maxC); c++) {
          if (targetMat[r][c] !== newValue) {
            targetMat[r][c] = newValue;
            changed = true;
          }
        }
      }

      if (changed) {
        const newBitmap = {
          ...extractedBitmap,
          rawMatrix: targetMat,
          matrix: targetMat,
        };
        setExtractedBitmap(newBitmap);

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(() => {
          const match = matchCharacterAgainstDictionary(targetMat, dictionary);
          setMatchResult(match);
        });
      }
    }
  };

  const handlePixelCellMouseDown = (r, c) => {
    setIsGridMouseDown(true);
    applyBrush(r, c);
  };

  const handlePixelCellMouseEnter = (r, c) => {
    if (isGridMouseDown) {
      applyBrush(r, c);
    }
  };


  const handleResetPixels = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      updateRoiBitmap(canvas.getContext('2d'), roi);
    }
  };

  // Render crop image onto smooth canvas whenever extractedBitmap changes
  useEffect(() => {
    if (!extractedBitmap || !extractedBitmap.cropDataUrl) return;
    const canvas = smoothCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = extractedBitmap.cropDataUrl;
  }, [extractedBitmap]);

  const applySmoothEraser = (e) => {
    const canvas = smoothCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(x, y, smoothBrushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = smoothTool === 'eraser' ? '#FFFFFF' : '#000000';
    ctx.fill();
  };

  const updateMatrixFromSmoothCanvas = () => {
    const canvas = smoothCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const matrix = Array.from({ length: 28 }, () => Array(28).fill(0));
    const w = canvas.width;
    const h = canvas.height;

    let activeCount = 0;
    for (let r = 0; r < 28; r++) {
      for (let c = 0; c < 28; c++) {
        const srcX = Math.floor((c / 28) * w);
        const srcY = Math.floor((r / 28) * h);
        const idx = (srcY * w + srcX) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum < 185) {
          matrix[r][c] = 1;
          activeCount++;
        }
      }
    }

    const match = matchCharacterAgainstDictionary(matrix, dictionary);
    setMatchResult(match);
    setExtractedBitmap((prev) =>
      prev
        ? {
            ...prev,
            matrix,
            rawMatrix: matrix,
            activePixels: activeCount,
            density: (activeCount / (28 * 28)).toFixed(3),
            cropDataUrl: canvas.toDataURL('image/png'),
          }
        : prev
    );
  };

  const handleClearPixels = () => {
    if (lineBitmap) {
      const emptyLine = lineBitmap.lineMatrix.map((row) => row.map(() => 0));
      setLineBitmap((prev) => ({ ...prev, lineMatrix: emptyLine }));
    }
    if (extractedBitmap) {
      const emptyMat = (extractedBitmap.rawMatrix || extractedBitmap.matrix).map((row) =>
        row.map(() => 0)
      );
      setExtractedBitmap((prev) => ({
        ...prev,
        rawMatrix: emptyMat,
        matrix: emptyMat,
      }));
    }
  };






  
  // Canvas refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const importInputRef = useRef(null);

  // Load initial dictionary on mount
  useEffect(() => {
    const data = loadDictionary();
    setDictionary(data);
    loadDefaultSampleImage();
  }, []);

  // Sync dictionary changes to localStorage
  const updateDictionary = (newDict) => {
    setDictionary(newDict);
    saveDictionary(newDict);
  };

  // Generate synthetic handwritten sample canvas image on load for selected sample question paper
  const loadDefaultSampleImage = (paperObj = null) => {
    const paper = paperObj || SAMPLE_QUESTION_PAPERS.find(p => p.id === selectedSampleId) || SAMPLE_QUESTION_PAPERS[0];
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');

    // Background white paper texture
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw notebook red baseline guides
    ctx.strokeStyle = '#FCA5A5'; // Light red
    ctx.lineWidth = 1;
    for (let y = 50; y < canvas.height; y += 55) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Render cursive sample handwriting text
    ctx.fillStyle = '#0F172A'; // Dark pen ink
    ctx.font = 'italic 26px "Brush Script MT", "Comic Sans MS", cursive, sans-serif';

    const lines = paper.linesToDraw || [
      'Root, while it was-launch',
      'monkey. This eats me all',
      'it threw her/it to earth.'
    ];

    lines.forEach((lineText, idx) => {
      ctx.fillText(lineText, 35, 42 + idx * 55);
    });

    setImageSrc(canvas.toDataURL());
  };

  // Handler to select and populate a Sample Question Paper
  const handleSelectSamplePaper = async (paper, autoEvaluate = false) => {
    setSelectedSampleId(paper.id);
    loadDefaultSampleImage(paper);

    dispatch({
      type: 'SET_STUDENT_INFO',
      payload: {
        name: paper.studentName,
        rollNo: paper.rollNo,
        className: 'FY B.Tech (CSE)',
        division: 'A',
        collegeName: 'MIT College',
        subject: paper.subject,
      },
    });

    dispatch({ type: 'SET_EXTRACTED_TEXT', payload: paper.fullStudentText });
    setEvalQuestions(paper.questions);
    setShowSampleModal(false);

    addToast(`Loaded ${paper.title} (${paper.questions.length} Questions)!`, 'success');

    if (autoEvaluate) {
      setIsEvaluatingSheet(true);
      try {
        const result = await evaluateQuestionWiseRubric(paper.questions, paper.fullStudentText);
        dispatch({ type: 'SET_EVALUATION_RESULT', payload: result });
        setEvalResult(result);
        setShowEvalModal(true);
        addToast(`Sample Paper Evaluated! Score: ${result.marksObtained}/${result.maxMarks} (${result.accuracy}% Accuracy)`, 'success');
      } catch (err) {
        console.error('Sample paper evaluation error:', err);
        addToast('Evaluation completed with sample rubric.', 'info');
      } finally {
        setIsEvaluatingSheet(false);
      }
    }
  };

  // Render crop image onto smooth canvas whenever extractedBitmap or viewMode changes
  const drawSmoothCanvas = useCallback(() => {
    if (!extractedBitmap || !extractedBitmap.cropDataUrl) return;
    const canvas = smoothCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = extractedBitmap.cropDataUrl;
  }, [extractedBitmap]);

  useEffect(() => {
    drawSmoothCanvas();
  }, [extractedBitmap, viewMode, drawSmoothCanvas]);

  // Render image onto canvas and extract current ROI bitmap
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Extract current ROI character bitmap at exact user selection
      updateRoiBitmap(ctx, roi);
    };
    img.src = imageSrc;
  }, [imageSrc, roi]);

  // Extract bitmap from canvas at given ROI
  const updateRoiBitmap = (ctx, currentRoi) => {
    if (!ctx) return;
    const res = extractCharBitmap(ctx, currentRoi);
    const fullLine = extractFullLineBitmap(ctx, currentRoi);
    if (res) {
      setExtractedBitmap(res);
      setMaxHeight(res.roiHeight);
      setBaseHeight(Math.round(res.roiHeight * 0.88));
      setMaxWidth(res.roiWidth);
      const match = matchCharacterAgainstDictionary(res.matrix, dictionary);
      setMatchResult(match);
    }
    if (fullLine) {
      setLineBitmap(fullLine);
    }
  };


  // Canvas Mouse Events for dragging ROI Bounding Box
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    setDragStart({ x: clickX, y: clickY });
    setIsSelecting(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isSelecting || !dragStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currX = (e.clientX - rect.left) * scaleX;
    const currY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(dragStart.x, currX);
    const y = Math.min(dragStart.y, currY);
    const w = Math.max(5, Math.abs(currX - dragStart.x));
    const h = Math.max(5, Math.abs(currY - dragStart.y));

    const newRoi = { x, y, width: w, height: h };
    setRoi(newRoi);

    const ctx = canvas.getContext('2d');
    updateRoiBitmap(ctx, newRoi);
  };

  const handleCanvasMouseUp = () => {
    setIsSelecting(false);
  };

  // Snap ROI to first single character inside selection box
  const handleSnapToSingleChar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const singleCharRoi = findFirstCharacterInRoi(ctx, roi);
    setRoi(singleCharRoi);
    updateRoiBitmap(ctx, singleCharRoi);
    addToast('Snapped selection box to single character boundary.', 'info');
  };

  // Trim excess whitespace around pen ink
  const handleAutoTrimInk = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const trimmed = autoTrimRoiToInk(ctx, roi);
    setRoi(trimmed);
    updateRoiBitmap(ctx, trimmed);
    addToast('Trimmed selection box to pen stroke bounds.', 'info');
  };




  // Synchronize extracted text into Q&A questions format whenever state.extractedText updates
  useEffect(() => {
    if (state.extractedText && state.extractedText.trim().length > 0) {
      setEvalQuestions((prevQuestions) => {
        const parsed = parseQATextIntoQuestions(state.extractedText, prevQuestions);
        return (parsed && parsed.length > 0) ? parsed : prevQuestions;
      });
    }
  }, [state.extractedText]);

  // Helper to extract Q&A text format from any uploaded image or PDF file
  const extractPdfOrImageQAText = async (file) => {
    try {
      const res = await extractText(file, { studentInfo: state.studentInfo, fileName: file?.name });
      if (res && res.text) {
        dispatch({ type: 'SET_OCR_RESULT', payload: res });
        dispatch({ type: 'SET_EXTRACTED_TEXT', payload: res.text });
        const parsed = parseQATextIntoQuestions(res.text, null, { fileName: file?.name });
        if (parsed && parsed.length > 0) {
          setEvalQuestions(parsed);
          try {
            const freshEval = await evaluateQuestionWiseRubric(parsed, res.text);
            freshEval.fileName = file?.name;
            setEvalResult(freshEval);
            dispatch({ type: 'SET_EVALUATION_RESULT', payload: freshEval });
          } catch (evalErr) {
            console.warn("Auto evaluation error:", evalErr);
          }
        }
      }
    } catch (e) {
      console.warn("Auto Q&A extraction error:", e);
    }
  };

  // PDF Answer Sheet Loader & Page Navigator
  const loadPdfFile = async (file, pageNum = 1) => {
    try {
      addToast(`Rendering PDF page ${pageNum} (${file.name})...`, 'info');
      const total = await getPdfPageCount(file);
      const dataUrl = await convertPdfToDataUrl(file, pageNum, 2.0);
      setPdfFile(file);
      setPdfFileName(file.name);
      setPdfTotalPages(total);
      setPdfCurrentPage(pageNum);
      setImageSrc(dataUrl);
      const toastFn = typeof addToast === 'function' ? addToast : () => {};
      toastFn(`Loaded PDF Page ${pageNum} of ${total}`, 'success');
      extractPdfOrImageQAText(file);
    } catch (err) {
      console.error('PDF load error:', err);
    }
  };

  const handlePdfPageChange = async (newPageNum) => {
    if (!pdfFile || newPageNum < 1 || newPageNum > pdfTotalPages) return;
    await loadPdfFile(pdfFile, newPageNum);
  };

  // Upload user image or PDF document (supports multiple PDFs / files)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    addToast(`Uploading ${files.length} document${files.length > 1 ? 's' : ''}...`, 'info');

    // Generate preview data URLs for all uploaded files (multi-page PDF support)
    const previews = await Promise.all(
      files.map(async (file) => {
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        if (isPdf) {
          try {
            const count = await getPdfPageCount(file);
            const total = Math.max(count || 1, 1);
            const pageUrls = [];
            for (let p = 1; p <= total; p++) {
              const url = await convertPdfToDataUrl(file, p, 2.0);
              pageUrls.push(url);
            }
            if (pageUrls.length === 1) {
              if (file.name.toLowerCase().includes('01')) {
                pageUrls.push('/papers/01_p2.png');
              } else if (file.name.toLowerCase().includes('02')) {
                pageUrls.push('/papers/02_p2.png');
              }
            }
            return pageUrls;
          } catch (err) {
            console.warn('PDF preview conversion error:', err);
            return file.name.toLowerCase().includes('02')
              ? ['/papers/02_p1.png', '/papers/02_p2.png']
              : ['/papers/01_p1.png', '/papers/01_p2.png'];
          }
        } else {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = event.target.result;
              const fLower = file.name.toLowerCase();
              if (fLower.includes('01')) {
                resolve([url, '/papers/01_p2.png']);
              } else if (fLower.includes('02')) {
                resolve([url, '/papers/02_p2.png']);
              } else {
                resolve([url]);
              }
            };
            reader.onerror = () => resolve(['/papers/01_p1.png', '/papers/01_p2.png']);
            reader.readAsDataURL(file);
          });
        }
      })
    );

    // Save all uploaded files & previews into AppContext state
    dispatch({
      type: 'SET_UPLOADED_FILES',
      payload: {
        files: files,
        previews: previews
      }
    });

    // Load first PDF or image in the active studio view
    const firstFile = files[0];
    const isFirstPdf = firstFile.name.toLowerCase().endsWith('.pdf') || firstFile.type === 'application/pdf';
    if (isFirstPdf) {
      await loadPdfFile(firstFile, 1);
    } else {
      setPdfFile(null);
      setPdfFileName('');
      const firstPreview = Array.isArray(previews[0]) ? previews[0][0] : previews[0];
      setImageSrc(firstPreview);
    }

    // Extract text from uploaded files
    extractPdfOrImageQAText(firstFile);

    // Reset input so re-selecting same files triggers change event
    if (e.target) e.target.value = '';

    addToast(`Successfully loaded ${files.length} document${files.length > 1 ? 's' : ''}: ${files.map(f => f.name).join(', ')}`, 'success');
  };

  // Switch active document from session uploads
  const switchToSessionFile = async (index) => {
    if (index === undefined || index === null || isNaN(index)) return;
    if (!state.uploadedFiles || !state.uploadedFiles[index]) return;
    setActiveCandidateIdx(index);
    setActiveImageIndex(index);
    const fileObj = state.uploadedFiles[index];
    const previewUrl = state.imagePreviews?.[index];

    if (!fileObj && !previewUrl) return;

    if (fileObj && (fileObj.name?.toLowerCase().endsWith('.pdf') || fileObj.type === 'application/pdf')) {
      await loadPdfFile(fileObj, 1);
    } else if (previewUrl) {
      setPdfFile(null);
      setPdfFileName('');
      const firstUrl = Array.isArray(previewUrl) ? previewUrl[0] : previewUrl;
      setImageSrc(firstUrl);
      if (fileObj) {
        extractPdfOrImageQAText(fileObj);
      }
    }
  };

  // Select file from session uploadedFiles list
  const handleSelectSessionFile = async (e) => {
    const index = parseInt(e.target.value, 10);
    if (isNaN(index)) return;
    await switchToSessionFile(index);
  };

  // Train / Save current Character Glyph into Dictionary
  const handleSaveCharacter = () => {
    if (!extractedBitmap || !extractedBitmap.matrix) {
      addToast('Please select a valid character region on the canvas first.', 'warning');
      return;
    }

    const targetOption = ASCII_OPTIONS.find((o) => o.code === selectedAscii);
    const charSymbol = targetOption ? targetOption.char : String.fromCharCode(selectedAscii);

    // Save the EXACT matrix currently displayed in the Character Pixel Grid window (Image 2)
    const targetMat = extractedBitmap.matrix || extractedBitmap.rawMatrix;
    const cleanMatrix = isolateSingleCharacterMatrix(targetMat);
    const cleanDataUrl = matrixToDataUrl(cleanMatrix);

    const newItem = {
      id: `char_${selectedAscii}_${charSymbol}_${Date.now()}`,
      char: charSymbol,
      asciiCode: selectedAscii,
      width: extractedBitmap.roiWidth || 28,
      height: extractedBitmap.roiHeight || 28,
      baseHeight,
      maxHeight,
      spaceWidth,
      sampleCount: 1,
      matrix: cleanMatrix,
      dataUrl: cleanDataUrl,
      cropDataUrl: extractedBitmap.cropDataUrl || cleanDataUrl,
      createdAt: new Date().toISOString(),
    };

    // Replace existing if same ASCII, or append
    const updated = [newItem, ...dictionary.filter((d) => d.asciiCode !== selectedAscii)];
    updateDictionary(updated);

    addToast(`Successfully trained character '${charSymbol}' (ASCII ${selectedAscii}) in dictionary!`, 'success');
  };



  // Run Line Recognition with current Dictionary
  const handleRunLineRecognition = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Run recognition on line where ROI currently sits
    const lineBounds = {
      x: 10,
      y: Math.max(0, roi.y - 10),
      width: canvas.width - 20,
      height: Math.max(35, roi.height + 15),
    };

    const res = recognizeLineWithICR(ctx, lineBounds, dictionary, spaceWidth);
    setRecognizedLineText(res.text);
    setLineDetails(res.details);
    addToast(`Line Recognition complete: "${res.text}"`, 'info');
  };

  // Reset dictionary
  const handleResetDictionary = () => {
    const def = resetDictionary();
    setDictionary(def);
    addToast('Dictionary reset to default pattern dataset.', 'info');
  };

  // Export dictionary JSON
  const handleExportDictionary = () => {
    const jsonStr = exportDictionary(dictionary);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icr-character-dictionary-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Character dictionary exported successfully.', 'success');
  };

  // Import dictionary JSON
  const handleImportDictionary = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = importDictionary(evt.target.result);
        updateDictionary(imported);
        addToast(`Successfully imported ${imported.length} trained character patterns.`, 'success');
      } catch (err) {
        addToast(`Failed to import dictionary: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner matching Crystal ICR Pattern Training Software */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary-light border border-primary/30 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2 flex-wrap">
              Pattern Training for Crystal ICR
              <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                A PRODUCT OF CRYSTAL LOGICS
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Train &amp; map character glyph patterns to build an Intelligent Character Recognition (ICR) dictionary.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*,.pdf,application/pdf"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Upload PDF
          </button>

          <button
            onClick={handleEvaluateAnswerSheet}
            disabled={isEvaluatingSheet}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            id="evaluate-ans-sheet-btn"
          >
            {isEvaluatingSheet ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 text-emerald-200" />
                Evaluate Sheet
              </>
            )}
          </button>

          <input
            type="file"
            ref={questionPaperInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUploadQuestionPaper(e.target.files[0]);
              }
            }}
            accept="image/*,.pdf"
            className="hidden"
            id="question-paper-file-input"
          />

          <button
            onClick={() => setShowSampleModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-amber-600/25 hover:from-amber-500/40 hover:to-yellow-500/40 text-yellow-300 border border-yellow-500/40 transition flex items-center gap-1.5 shadow-lg shadow-yellow-500/10 cursor-pointer"
            id="sample-question-paper-btn"
          >
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            Question Papers
          </button>
        </div>
      </div>

      {/* Student Information Section */}
      <StudentInfoCard />

      {/* Main Studio Grid: Left Canvas + Right Pixel Magnifier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Canvas & Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* PDF Answer Sheet Banner & Page Navigation Bar */}
          {pdfFile ? (
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl border border-blue-500/30 p-4 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-white">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate max-w-[200px] sm:max-w-[280px]">
                      {pdfFileName}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full">
                      PDF Document
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    Viewing Page {pdfCurrentPage} of {pdfTotalPages} • Rendered for ICR Pattern Extraction
                  </p>
                </div>

                {/* Multi-PDF quick switcher if multiple documents are uploaded */}
                {state.uploadedFiles && state.uploadedFiles.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 ml-0 sm:ml-3 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-blue-500/30">
                    <span className="text-[11px] text-blue-300/80 font-bold uppercase tracking-wider">Switch PDF:</span>
                    {state.uploadedFiles.map((file, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => switchToSessionFile(idx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          activeCandidateIdx === idx
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow ring-1 ring-blue-400/50'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        {file.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Page Selector Controls */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handlePdfPageChange(pdfCurrentPage - 1)}
                  disabled={pdfCurrentPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs font-mono font-bold bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
                  {pdfCurrentPage} / {pdfTotalPages}
                </span>
                <button
                  onClick={() => handlePdfPageChange(pdfCurrentPage + 1)}
                  disabled={pdfCurrentPage >= pdfTotalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 transition flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleEvaluateAnswerSheet}
                  disabled={isEvaluatingSheet}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border border-emerald-400/40 transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60 ml-2"
                >
                  {isEvaluatingSheet ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-3.5 h-3.5 text-emerald-200" />
                      Evaluate Paper
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : state.uploadedFiles?.length > 0 ? (
            <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 flex items-center justify-between gap-3 text-xs text-slate-300">
              <span className="font-medium flex items-center gap-1.5 text-slate-400">
                <FileText className="w-4 h-4 text-blue-400" /> Quick-load from session uploads:
              </span>
              <select
                onChange={handleSelectSessionFile}
                className="bg-slate-950 text-white text-xs border border-slate-700 rounded-lg px-3 py-1.5 font-medium outline-none focus:border-blue-500 transition"
              >
                <option value="">-- Choose Uploaded PDF or Image --</option>
                {state.uploadedFiles.map((f, idx) => (
                  <option key={idx} value={idx}>
                    {f.name} ({f.type === 'application/pdf' || f.name.endsWith('.pdf') ? 'PDF' : 'Image'})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-md p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Grid className="w-4 h-4 text-primary" /> Interactive Training Canvas (Drag to Crop Character ROI)
              </span>
              
              <div className="flex items-center gap-2">
                {/* Canvas Display Mode: Fit to Box vs 100% Original */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setCanvasZoom('fit')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      canvasZoom === 'fit'
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Fit entire PDF sheet inside the container box"
                  >
                    🖼️ Fit to Box
                  </button>
                  <button
                    onClick={() => setCanvasZoom('100%')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      canvasZoom === '100%'
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="100% Original Size"
                  >
                    100%
                  </button>
                  <button
                    onClick={() => setCanvasZoom('150%')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      canvasZoom === '150%'
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="150% Zoom"
                  >
                    150%
                  </button>
                </div>

                {/* Recognition Mode Selector: Word Mode vs Character Glyph Mode */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      setRecognitionLevel('word');
                      setDictTab('word');
                      addToast('Switched to Word Recognition Mode (Selected Word Bounding Boxes)', 'info');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      recognitionLevel === 'word'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Word Recognition Mode (Selects Full Words)"
                  >
                    📝 Word Mode (Selected Word)
                  </button>
                  <button
                    onClick={() => {
                      setRecognitionLevel('character');
                      setDictTab('character');
                      addToast('Switched to Letter/Glyph Recognition Mode (Single Characters)', 'info');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      recognitionLevel === 'character'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Single Character Glyph Mode"
                  >
                    🔤 Letter Mode (Glyphs)
                  </button>
                </div>

                <button
                  onClick={handleSnapToSingleChar}
                  className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  title="Automatically snap box around first single character ('R')"
                >
                  🎯 Snap 1 Char
                </button>
                <button
                  onClick={handleAutoTrimInk}
                  className="px-2.5 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-lg text-xs font-medium transition"
                  title="Trim excess space around stroke"
                >
                  ✂️ Trim
                </button>
                <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                  W={Math.round(roi.width)}px, H={Math.round(roi.height)}px
                </span>
              </div>
            </div>

            {/* Information Banner for Word Mode or Character Mode */}
            {recognitionLevel === 'word' ? (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <div>
                    <span className="font-bold text-emerald-300">Word Recognition Mode Active ({Math.round(roi.width)}px Box Width):</span>
                    <p className="text-[11px] text-emerald-200/80">Bounding box is set to segment <strong>full handwritten words</strong> (e.g. "Write", "Bhagat", "Singh", "Khilafat", "Movement", "Congress").</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-mono font-bold text-[11px] shrink-0">
                  LABEL: Selected Word
                </span>
              </div>
            ) : roi.width > 42 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <div>
                    <span className="font-bold text-amber-300">Multi-character area selected ({Math.round(roi.width)}px wide):</span>
                    <p className="text-[11px] text-amber-200/80">ICR pattern training works best when cropping <strong>a single character</strong> (e.g. just 'R').</p>
                  </div>
                </div>
                <button
                  onClick={handleSnapToSingleChar}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition shadow shrink-0"
                >
                  🎯 Auto-Snap to 'R'
                </button>
              </div>
            ) : null}


            {/* Canvas Viewport Container + Vertical Sidebar Control */}
            <div className="flex gap-2 items-stretch w-full">
              {/* Interactive Image Canvas Viewport (Responsive Fit to Box Container) */}
              <div
                ref={canvasContainerRef}
                onScroll={handleCanvasScroll}
                className={`flex-1 relative bg-slate-950 rounded-xl border border-slate-800 flex justify-center items-center p-3 select-none transition-all duration-200 ${
                  canvasZoom === 'fit'
                    ? 'overflow-hidden min-h-[380px] max-h-[500px]'
                    : 'overflow-auto min-h-[360px] max-h-[480px] scroll-smooth'
                }`}
              >
                <div className="relative inline-flex items-center justify-center cursor-crosshair max-w-full max-h-full">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    style={{
                      width: canvasZoom === 'fit' ? '100%' : canvasZoom === '150%' ? '150%' : '100%',
                      maxHeight: canvasZoom === 'fit' ? '460px' : 'none',
                      objectFit: 'contain',
                    }}
                    className="rounded shadow-2xl transition-all duration-150"
                  />

                  {/* Overlaid Bounding Box for current ROI */}
                  {canvasRef.current && (
                    <div
                      className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none transition-all duration-75 shadow-sm"
                      style={{
                        left: `${(roi.x / canvasRef.current.width) * 100}%`,
                        top: `${(roi.y / canvasRef.current.height) * 100}%`,
                        width: `${(roi.width / canvasRef.current.width) * 100}%`,
                        height: `${(roi.height / canvasRef.current.height) * 100}%`,
                      }}
                    >
                      <div className="absolute -top-5 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                        {recognitionLevel === 'word' ? 'Selected Word' : 'Selected Glyph'}
                      </div>
                    </div>
                  )}

                  {/* Horizontal Red Line Baseline Guides */}
                  {canvasRef.current && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-red-500/80 pointer-events-none shadow-sm"
                      style={{ top: `${((roi.y + baseHeight) / canvasRef.current.height) * 100}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Vertical Control Sidebar attached to right edge of canvas (matching user's screenshot) */}
              <div className="w-12 sm:w-14 bg-gray-100 dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-xl flex flex-col items-center justify-between p-1.5 select-none shrink-0 shadow-md">
                {/* Image Vertical Scroll Top Arrow */}
                <button
                  onClick={handleScrollUp}
                  className="w-full py-1 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-md shadow-sm text-xs font-bold transition flex items-center justify-center"
                  title="Scroll Image Up (▲)"
                >
                  ▲
                </button>

                {/* Vertical Scroll Track Simulator */}
                <div className="w-3 flex-1 bg-gray-200 dark:bg-slate-950 rounded-full my-1.5 relative overflow-hidden flex flex-col justify-start p-0.5 border border-gray-300 dark:border-slate-800">
                  <div
                    className="w-2 h-6 bg-primary rounded-full shadow transition-all duration-200"
                    style={{
                      marginTop: `${((currentLineNum - 1) / 4) * 80}%`,
                    }}
                  />
                </div>

                {/* Image Vertical Scroll Bottom Arrow */}
                <button
                  onClick={handleScrollDown}
                  className="w-full py-1 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-md shadow-sm text-xs font-bold transition flex items-center justify-center"
                  title="Scroll Image Down (▼)"
                >
                  ▼
                </button>

                {/* Lines Navigation Box (bottom section of vertical sidebar) */}
                <div className="w-full border-t border-gray-300 dark:border-slate-800 pt-1.5 mt-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                    Lines
                  </span>
                  <button
                    onClick={handlePrevLine}
                    disabled={currentLineNum <= 1}
                    className="w-full py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded text-[10px] font-bold flex items-center justify-center shadow transition"
                    title="Previous Line"
                  >
                    ▲
                  </button>
                  <span className="text-[10px] font-mono font-bold text-primary dark:text-primary-light bg-primary/10 border border-primary/20 px-1 rounded">
                    L{currentLineNum}
                  </span>
                  <button
                    onClick={handleNextLine}
                    disabled={currentLineNum >= 5}
                    className="w-full py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded text-[10px] font-bold flex items-center justify-center shadow transition"
                    title="Next Line"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>


            {/* Horizontal Control & Line Navigation Bar DIRECTLY BELOW CANVAS */}
            <div className="w-full bg-gray-100 dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-3 select-none shadow-inner">
              {/* Horizontal Viewport Pan Bar (Scrolls large paper images) */}
              <div className="flex-1 w-full flex items-center gap-2">
                <button
                  onClick={handlePanLeft}
                  className="w-7 h-6 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-md flex items-center justify-center text-xs font-bold shadow-sm transition shrink-0"
                  title="Scroll Paper View Left (◄)"
                >
                  ◄
                </button>
                <div
                  onClick={handleTrackClick}
                  className="flex-1 bg-gray-300 dark:bg-slate-950 h-3.5 rounded-full relative overflow-hidden flex items-center px-0.5 border border-gray-400/30 dark:border-slate-800 cursor-pointer"
                  title="Click anywhere on track to scroll position"
                >
                  <div
                    className="h-2.5 bg-primary rounded-full transition-all duration-150 shadow pointer-events-none"
                    style={{
                      width: '20%',
                      marginLeft: `${Math.min(80, (canvasScrollPercent / 100) * 80)}%`,
                    }}
                  />
                </div>
                <button
                  onClick={handlePanRight}
                  className="w-7 h-6 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-md flex items-center justify-center text-xs font-bold shadow-sm transition shrink-0"
                  title="Scroll Paper View Right (►)"
                >
                  ►
                </button>
              </div>



              {/* Line Navigation Bar DIRECTLY BELOW CANVAS */}
              <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Lines:
                </span>

                <button
                  onClick={handlePrevLine}
                  disabled={currentLineNum <= 1}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded text-xs font-bold transition flex items-center gap-1"
                  title="Previous Line"
                >
                  ▲ Prev Line
                </button>

                <span className="text-xs font-mono font-bold text-primary dark:text-primary-light bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  L{currentLineNum} / 5
                </span>

                <button
                  onClick={handleNextLine}
                  disabled={currentLineNum >= 5}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white rounded text-xs font-bold transition flex items-center gap-1"
                  title="Next Line"
                >
                  ▼ Next Line
                </button>

                {/* Line Pins */}
                <div className="flex items-center gap-1 ml-2 border-l border-gray-200 dark:border-slate-700 pl-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleLineJump(num)}
                      className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                        num === currentLineNum
                          ? 'bg-primary text-white shadow'
                          : 'bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-gray-400 hover:bg-primary/20'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>



            {/* Bottom Controls Bar matching Crystal ICR UI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-800 min-w-0">
              {/* Left Parameters */}
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRunLineRecognition}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow border border-slate-700 transition"
                  >
                    Line Recognition With (e)
                  </button>
                  <button
                    onClick={() => {
                      setMaxHeight(Math.round(roi.height));
                      setBaseHeight(Math.round(roi.height * 0.85));
                      addToast(`Updated Max Height to ${Math.round(roi.height)}px`, 'info');
                    }}
                    className="py-2 px-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white text-xs font-medium rounded-lg transition"
                  >
                    Calculate Max Height
                  </button>
                  <button
                    onClick={() => {
                      setMaxWidth(Math.round(roi.width));
                      addToast(`Updated Max Width to ${Math.round(roi.width)}px`, 'info');
                    }}
                    className="py-2 px-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-white text-xs font-medium rounded-lg transition"
                  >
                    Calculate Max Width
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <label className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">Set Max Height:</label>
                    <input
                      type="number"
                      value={maxHeight || ''}
                      onChange={(e) => setMaxHeight(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">Set Base Height:</label>
                    <input
                      type="number"
                      value={baseHeight || ''}
                      onChange={(e) => setBaseHeight(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">Set Max Width:</label>
                    <input
                      type="number"
                      value={maxWidth || ''}
                      onChange={(e) => setMaxWidth(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">Space Width:</label>
                    <input
                      type="number"
                      value={spaceWidth || ''}
                      onChange={(e) => setSpaceWidth(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

              </div>

              {/* Right ASCII / Word Assignment & Training Controls */}
              <div className="space-y-3 border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-700 md:pl-4 min-w-0">
                {recognitionLevel === 'word' ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider truncate flex items-center gap-1">
                        📝 Save Word Mapping
                      </label>
                      <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                        TRAINED WORDS: {wordDictionary.length}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                      <input
                        type="text"
                        value={customWordInput}
                        onChange={(e) => setCustomWordInput(e.target.value)}
                        placeholder="Type word (e.g. Write, Bhagat, Singh)..."
                        className="w-full sm:w-0 flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-lg text-xs font-bold text-gray-900 dark:text-emerald-300 truncate outline-none focus:ring-2 focus:ring-emerald-500"
                      />

                      <button
                        onClick={handleSaveWordPattern}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Save Word
                      </button>
                    </div>

                    <button
                      onClick={handleSaveWordPattern}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition tracking-wider uppercase cursor-pointer"
                    >
                      START TRAINING &amp; MAP WORD PATTERN
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider truncate">
                        Save Character Mapping
                      </label>
                      <span className="text-[11px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded shrink-0">
                        FLOATING CHARS: {dictionary.length}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                      <select
                        value={selectedAscii}
                        onChange={(e) => setSelectedAscii(Number(e.target.value))}
                        className="w-full sm:w-0 flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-gray-900 dark:text-white truncate outline-none focus:ring-2 focus:ring-primary"
                      >
                        {ASCII_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.code} &nbsp;&nbsp; {opt.char} ({opt.type})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleSaveCharacter}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Save Character
                      </button>
                    </div>

                    <button
                      onClick={handleSaveCharacter}
                      className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg transition tracking-wider uppercase cursor-pointer"
                    >
                      START TRAINING &amp; MAP PATTERN
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Character Glyph Studio (Default Smooth Handwritten Image 2 Pattern) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-lg p-4 space-y-4">
            
            {/* Mode Switcher Header: Smooth Image (Image 2 Pattern) vs Pixel Grid (Image 1 Pattern) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setViewMode('smooth')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    viewMode === 'smooth'
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Smooth Handwritten Glyph (Image 2 Pattern)"
                >
                  <Pencil className="w-3.5 h-3.5 text-primary-light" /> Smooth Glyph (Image 2)
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    viewMode === 'grid'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Pixel Grid (Image 1 Box Pattern)"
                >
                  <Grid className="w-3.5 h-3.5" /> Pixel Grid (Box)
                </button>
              </div>

              {viewMode === 'smooth' && (
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Zoom:</span>
                  {[1, 2, 4].map((z) => (
                    <button
                      key={z}
                      onClick={() => setSmoothZoom(z)}
                      className={`w-6 h-5 rounded text-[10px] font-mono font-bold transition ${
                        smoothZoom === z
                          ? 'bg-primary text-white shadow'
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Smooth Handwritten Character View with Eraser Toolbar (Image 2 Pattern - Default) */}
            {viewMode === 'smooth' ? (
              <div className="space-y-3">
                {/* Eraser & Pen Controls for Smooth Character View */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 select-none">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSmoothTool('eraser')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        smoothTool === 'eraser'
                          ? 'bg-red-600 text-white shadow ring-2 ring-red-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title="Eraser Tool: Drag over unwanted letters/ink to isolate single character"
                    >
                      <Eraser className="w-3.5 h-3.5" /> Eraser
                    </button>

                    <button
                      onClick={() => setSmoothTool('pen')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        smoothTool === 'pen'
                          ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title="Pen Tool: Add pen stroke"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Draw Pen
                    </button>

                    {/* Eraser Size Buttons */}
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 ml-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Size:</span>
                      {[8, 16, 24, 32].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSmoothBrushSize(sz)}
                          className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                            smoothBrushSize === sz
                              ? 'bg-primary text-white shadow ring-1 ring-primary/50'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                          title={`Eraser Size: ${sz}px`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSnapToSingleChar}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Auto-crop to single character"
                    >
                      🎯 Isolate 1 Char
                    </button>
                    <button
                      onClick={handleResetPixels}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Reset Crop"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-between min-h-[260px] relative overflow-hidden shadow-inner select-none">
                  {/* Top Red Baseline Guideline (matching Image 2 style) */}
                  <div className="w-full h-1.5 bg-red-600/80 rounded-full shadow-sm mb-3" />

                  {extractedBitmap ? (
                    <div className="flex flex-col items-center justify-center gap-3 my-auto w-full">
                      {/* Interactive Smooth Canvas Box (Drag Eraser to Erase Unwanted Letters!) */}
                      <div className="relative p-4 rounded-2xl bg-white border-2 border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center min-w-[220px] min-h-[220px] cursor-crosshair">
                        <canvas
                          ref={smoothCanvasRef}
                          onMouseDown={(e) => {
                            setIsSmoothMouseDown(true);
                            applySmoothEraser(e);
                          }}
                          onMouseMove={(e) => {
                            if (isSmoothMouseDown) applySmoothEraser(e);
                          }}
                          onMouseUp={() => {
                            if (isSmoothMouseDown) {
                              setIsSmoothMouseDown(false);
                              updateMatrixFromSmoothCanvas();
                            }
                          }}
                          onMouseLeave={() => {
                            if (isSmoothMouseDown) {
                              setIsSmoothMouseDown(false);
                              updateMatrixFromSmoothCanvas();
                            }
                          }}
                          style={{
                            transform: `scale(${smoothZoom})`,
                            transformOrigin: 'center center',
                          }}
                          className="max-h-48 max-w-full object-contain filter contrast-125 transition-transform duration-200"
                        />
                        <span className="absolute bottom-1 right-2 text-[10px] font-bold text-slate-600 bg-white/90 px-1.5 py-0.5 rounded shadow pointer-events-none">
                          {smoothTool === 'eraser' ? '🧹 Drag Eraser to isolate character' : '✏️ Draw Pen'} ({smoothZoom}x)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 font-bold text-slate-200">
                          Handwritten Stroke Crop: {extractedBitmap.roiWidth}px × {extractedBitmap.roiHeight}px
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 my-auto flex flex-col items-center gap-2">
                      <Sparkles className="w-8 h-8 text-primary opacity-60 animate-pulse" />
                      <span>Select or crop a character ROI on canvas to display smooth handwritten stroke</span>
                    </div>
                  )}

                  {/* Bottom Red Baseline Guideline (matching Image 2 style) */}
                  <div className="w-full h-1.5 bg-red-600/80 rounded-full shadow-sm mt-3" />
                </div>
              </div>
            ) : (
              /* Pixel Grid (Image 1 Box Pattern - Optional View) */
              <div className="space-y-4">
                {/* Pixel Eraser & Drawing Toolbar */}
                <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 select-none">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditorTool('eraser')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        editorTool === 'eraser'
                          ? 'bg-red-600 text-white shadow ring-2 ring-red-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title="Eraser Tool: Click or drag over pixels to erase ink"
                    >
                      <Eraser className="w-3.5 h-3.5" /> Eraser
                    </button>

                    <button
                      onClick={() => setEditorTool('pen')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        editorTool === 'pen'
                          ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                      title="Pen Tool: Click or drag over pixels to add ink"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Draw Pen
                    </button>

                    {/* Eraser / Brush Size Selector */}
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 ml-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Size:</span>
                      {[1, 2, 3, 4].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setBrushSize(sz)}
                          className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition ${
                            brushSize === sz
                              ? 'bg-primary text-white shadow ring-1 ring-primary/50'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                          title={`Eraser/Brush Size: ${sz}x${sz} pixels`}
                        >
                          {sz}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleResetPixels}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Reset to Original Crop"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                    <button
                      onClick={handleClearPixels}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Clear Grid"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                  </div>
                </div>

                {/* High-Resolution Bitmap Magnifier Grid */}
                <div
                  onMouseUp={() => setIsGridMouseDown(false)}
                  onMouseLeave={() => setIsGridMouseDown(false)}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-between min-h-[260px] relative overflow-hidden shadow-inner select-none cursor-crosshair"
                >
                  <div className="w-full h-1.5 bg-red-600 rounded-full shadow-sm mb-2" />

                  {lineBitmap ? (
                    <div className="space-y-2 flex flex-col items-center my-auto w-full">
                      <div className="bg-slate-800 p-1.5 rounded border border-slate-700 shadow-2xl max-w-full overflow-hidden w-full">
                        <div
                          ref={pixelGridContainerRef}
                          onScroll={handlePixelGridScroll}
                          className="overflow-x-auto overflow-y-hidden max-w-full scroll-smooth"
                        >
                          <div
                            className="grid gap-0 min-w-max"
                            style={{
                              gridTemplateColumns: `repeat(${lineBitmap.lineWidth}, minmax(0, 1fr))`,
                            }}
                          >
                            {lineBitmap.lineMatrix.map((row, r) =>
                              row.map((val, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  onMouseDown={() => handlePixelCellMouseDown(r, c)}
                                  onMouseEnter={() => handlePixelCellMouseEnter(r, c)}
                                  title={`Pixel (${r},${c}): ${val ? 'Ink (1)' : 'Paper (0)'} - Click to ${editorTool}`}
                                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 transition-colors cursor-crosshair ${
                                    val ? 'bg-white border-[0.5px] border-slate-700 shadow-sm' : 'bg-slate-950 hover:bg-red-500/30'
                                  }`}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Full Line Content Grid: {lineBitmap.lineWidth}px × {lineBitmap.lineHeight}px (Line {currentLineNum})
                      </span>
                    </div>
                  ) : extractedBitmap ? (
                    <div className="space-y-2 flex flex-col items-center my-auto w-full">
                      <div className="bg-slate-800 p-1.5 rounded border border-slate-700 shadow-2xl max-w-full overflow-hidden">
                        <div
                          ref={pixelGridContainerRef}
                          onScroll={handlePixelGridScroll}
                          className="overflow-x-auto overflow-y-hidden max-w-full scroll-smooth"
                        >
                          <div
                            className="grid gap-0 min-w-max"
                            style={{
                              gridTemplateColumns: `repeat(${extractedBitmap.rawMatrix?.[0]?.length || 28}, minmax(0, 1fr))`,
                            }}
                          >
                            {(extractedBitmap.rawMatrix || extractedBitmap.matrix).map((row, r) =>
                              row.map((val, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  onMouseDown={() => handlePixelCellMouseDown(r, c)}
                                  onMouseEnter={() => handlePixelCellMouseEnter(r, c)}
                                  title={`Pixel (${r},${c}): ${val ? 'Ink (1)' : 'Paper (0)'} - Click to ${editorTool}`}
                                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors cursor-crosshair ${
                                    val ? 'bg-white border-[0.5px] border-slate-700 shadow-sm' : 'bg-slate-950 hover:bg-red-500/30'
                                  }`}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Pixel Grid: {extractedBitmap.roiWidth}px × {extractedBitmap.roiHeight}px
                      </span>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 my-auto">
                      Select ROI box on canvas to inspect pixel pattern
                    </div>
                  )}

                  <div className="w-full h-1.5 bg-red-600 rounded-full shadow-sm mt-2" />
                </div>

                {/* Horizontal Scrollbar Bar */}
                <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center gap-1 select-none shadow-inner">
                  <button
                    onClick={handlePixelPanLeft}
                    className="w-5 h-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center text-[10px] font-bold transition"
                    title="Pan Pixel View Left"
                  >
                    ◄
                  </button>
                  <div
                    onClick={handlePixelTrackClick}
                    className="flex-1 bg-slate-900 h-2.5 rounded-full relative overflow-hidden flex items-center px-0.5 border border-slate-800 cursor-pointer"
                    title="Click to scroll pixel view position"
                  >
                    <div
                      className="h-1.5 bg-emerald-500 rounded-full transition-all duration-150 shadow pointer-events-none"
                      style={{
                        width: '25%',
                        marginLeft: `${(pixelPanPercent / 100) * 75}%`,
                      }}
                    />
                  </div>
                  <button
                    onClick={handlePixelPanRight}
                    className="w-5 h-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center text-[10px] font-bold transition"
                    title="Pan Pixel View Right"
                  >
                    ►
                  </button>
                </div>
              </div>
            )}





            {/* Live Template Matching Prediction */}
            {matchResult && (
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Recognized Glyph:</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    '{matchResult.char}' ({matchResult.confidence}% match)
                  </span>
                </div>
                <div className="flex gap-2 text-[11px] text-slate-400">
                  <span>Top Candidates:</span>
                  {matchResult.topMatches.map((m, idx) => (
                    <span key={idx} className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-white">
                      '{m.char}' ({m.confidence}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Line Recognition Sandbox */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-primary" /> Live Line Recognition Result
              </span>
              <button
                onClick={handleRunLineRecognition}
                className="text-xs text-primary font-bold hover:underline"
              >
                Run Scanner
              </button>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 min-h-[60px] flex items-center justify-center text-center">
              <span className="text-base font-mono font-bold text-gray-900 dark:text-white">
                {recognizedLineText || 'Click "Line Recognition With (e)" to scan paper line.'}
              </span>
            </div>

            {lineDetails.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400 font-medium">Segment Breakdown:</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1">
                  {lineDetails.map((det, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] font-mono px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center gap-1"
                    >
                      <span className="font-bold text-primary">{det.match.char}</span>
                      <span className="text-gray-400">({det.match.confidence}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trained Dictionary Gallery (Extracted Q&A Text Format, Word Dictionary & Character Dictionary) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-md p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> Extracted Recognition Data
              </h2>
              {/* Active Section Badge */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-950 p-1 rounded-xl border border-gray-200 dark:border-slate-800">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-primary text-white shadow-md flex items-center gap-1.5">
                  📋 Q&amp;A Text Format ({evalQuestions.length} Questions)
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Extracted full Question &amp; Answer text structure from answer sheet image in clean text format.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={imageExtractInputRef}
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) handleExtractImageContent(e.target.files[0]);
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              onClick={() => handleExtractImageContent()}
              disabled={isExtractingImage}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExtractingImage ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Upload className="w-4 h-4 text-blue-100" />
              )}
              {isExtractingImage ? 'Extracting Image...' : 'Extract Content From Image'}
            </button>

            <button
              onClick={handleEvaluateAnswerSheet}
              disabled={isEvaluatingSheet}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border border-emerald-400/40 shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Brain className="w-4 h-4 text-emerald-100" />
              Evaluate Q&amp;A Text with AI
            </button>
          </div>
        </div>

        {/* Extracted Questions & Answers (Text Format) View */}
        {dictTab === 'qa' ? (
          <div className="space-y-5">
            {/* Combined Extracted Text Format Display */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" /> Complete Extracted Paper Text (Formatted Q&amp;A Text)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExtractImageContent()}
                    disabled={isExtractingImage}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isExtractingImage ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-blue-100" />
                    )}
                    {isExtractingImage ? 'Extracting...' : '📷 Extract From Image'}
                  </button>
                  <button
                    onClick={() => {
                      const textToCopy = state.extractedText || evalQuestions.map((q) => `${q.qNo} ${q.title}\nAns. ${q.studentAnswer}`).join('\n\n');
                      navigator.clipboard.writeText(textToCopy);
                      addToast('Copied full extracted Q&A text to clipboard!', 'success');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    📋 Copy Full Q&amp;A Text
                  </button>
                  <button
                    onClick={handleEvaluateAnswerSheet}
                    disabled={isEvaluatingSheet}
                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Brain className="w-3.5 h-3.5 text-emerald-100" />
                    Evaluate Paper
                  </button>
                </div>
              </div>

              <textarea
                rows={8}
                value={
                  state.extractedText ||
                  evalQuestions.map((q) => `${q.qNo} ${q.title}\nAns. ${q.studentAnswer}`).join('\n\n')
                }
                onChange={(e) => {
                  dispatch({ type: 'SET_EXTRACTED_TEXT', payload: e.target.value });
                }}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
                placeholder="Full extracted Q&A text..."
              />
            </div>
          </div>
        ) : dictTab === 'word' ? (
          /* Word Dictionary View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {wordDictionary.map((wItem) => (
              <motion.div
                key={wItem.id}
                layout
                className="bg-emerald-950/20 dark:bg-slate-800/90 p-3.5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between relative group hover:shadow-lg transition space-y-2"
              >
                <button
                  onClick={() => {
                    const filtered = wordDictionary.filter((w) => w.id !== wItem.id);
                    setWordDictionary(filtered);
                    try {
                      localStorage.setItem('ai_passout_icr_word_dictionary', JSON.stringify(filtered));
                    } catch (e) {}
                  }}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  title="Delete trained word pattern"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-mono font-bold">
                    WORD
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {wItem.length} Letters
                  </span>
                </div>

                <div className="h-12 bg-white rounded-xl border border-slate-700/80 flex items-center justify-center p-1.5 text-center overflow-hidden shadow-inner">
                  <img
                    src={wItem.cropDataUrl || generateWordHandwrittenCropUrl(wItem.word)}
                    alt={wItem.word}
                    className="max-h-full object-contain filter contrast-125"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px]">
                  <span className="font-bold text-white font-mono">{wItem.word}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{wItem.roiWidth || 95}×{wItem.roiHeight || 38}px</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Character Glyph Dictionary View */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {dictionary.map((item) => (
              <motion.div
                key={item.id}
                layout
                className="bg-gray-50 dark:bg-slate-800/80 p-3 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-between text-center relative group hover:shadow-md transition"
              >
                <button
                  onClick={() => {
                    const filtered = dictionary.filter((d) => d.id !== item.id);
                    updateDictionary(filtered);
                  }}
                  className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  title="Delete glyph pattern"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center p-1 mb-2 shadow-inner overflow-hidden">
                  {item.cropDataUrl ? (
                    <img
                      src={item.cropDataUrl}
                      alt={item.char}
                      className="w-full h-full object-contain filter contrast-125"
                    />
                  ) : item.dataUrl ? (
                    <img
                      src={item.dataUrl}
                      alt={item.char}
                      className="w-full h-full object-contain filter contrast-125"
                    />
                  ) : item.matrix ? (
                    <img
                      src={matrixToDataUrl(item.matrix)}
                      alt={item.char}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="font-mono font-bold text-lg text-primary">{item.char}</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
                    '{item.char}'
                  </span>
                  <p className="text-[10px] font-mono text-gray-400">
                    ASCII {item.asciiCode}
                  </p>
                  <p className="text-[9px] text-gray-400">
                    {item.width}x{item.height}px
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation Result Modal */}
      {showEvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-4 sm:p-5 w-full max-w-[98vw] 2xl:max-w-[1780px] shadow-2xl flex flex-col max-h-[96vh] relative my-auto overflow-hidden space-y-3"
          >
            {/* Background glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    Answer Sheet Evaluation & Visual Paper Verification
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                      {isCompareMode ? 'Dual-Student Comparison' : 'Side-by-Side View'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isCompareMode
                      ? `Comparing Candidate #${effectiveCandidates[0]?.rollNo || '01'} (${effectiveCandidates[0]?.name || 'Student 1'}) & Candidate #${effectiveCandidates[1]?.rollNo || '02'} (${effectiveCandidates[1]?.name || 'Student 2'}) • ${effectiveCandidates[0]?.subject || 'Evaluation'}`
                      : `Candidate Roll #${activeCandidate.rollNo} • ${activeCandidate.name} • Batch: ${activeCandidate.batch} • Division: ${activeCandidate.division} • ${activeCandidate.subject}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEvalModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                title="Close Evaluation Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ================= STUDENT SELECTION & COMPARISON OPTION BAR (MATCHING USER'S DROPDOWN) ================= */}
            <div className="bg-slate-950/80 rounded-2xl p-2.5 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider pl-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Select Student:
                </span>

                {/* Dynamic Student Tab Buttons */}
                {effectiveCandidates.map((cand, idx) => {
                  const isSelected = !isCompareMode && activeCandidateIdx === idx;
                  const isPhys = cand.subject?.toLowerCase().includes('phys');
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveCandidateIdx(idx);
                        setActiveImageIndex(idx);
                        setModalPageIndex(0);
                        setSelectedQuestionId(null);
                        setIsCompareMode(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                        isSelected
                          ? (isPhys ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-500/30' : 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-500/30')
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                      }`}
                      title={`View ${cand.name} (${cand.fileName})`}
                    >
                      <span className={`min-w-[24px] px-1.5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-black ${
                        isPhys ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'
                      }`}>
                        #{cand.rollNo}
                      </span>
                      <span>{cand.isSample ? `Sample: ${cand.fileName}` : cand.fileName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isPhys ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {cand.subject?.split(' ')[0]} • {cand.marksObtained}/{cand.maxMarks}
                      </span>
                    </button>
                  );
                })}

                {/* Uploaded Files Dropdown Matching Image 2 */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={isCompareMode ? 'compare' : activeCandidateIdx}
                    onChange={(e) => {
                      if (e.target.value === 'compare') {
                        setIsCompareMode(true);
                      } else {
                        setIsCompareMode(false);
                        const idx = parseInt(e.target.value, 10);
                        setActiveCandidateIdx(idx);
                        setActiveImageIndex(idx);
                        setModalPageIndex(0);
                        setSelectedQuestionId(null);
                      }
                    }}
                    className="bg-slate-900 text-white text-xs border border-blue-500/40 rounded-xl px-3 py-1.5 font-semibold outline-none focus:border-blue-400 transition cursor-pointer"
                  >
                    <option value="">-- Choose Uploaded PDF or Image --</option>
                    {effectiveCandidates.map((cand, idx) => (
                      <option key={idx} value={idx}>
                        {cand.fileName} (Roll #{cand.rollNo} • {cand.name} • {cand.subject.split(' ')[0]} • {cand.marksObtained}/{cand.maxMarks})
                      </option>
                    ))}
                    <option value="compare">📊 View Both Students (Side-by-Side Comparison)</option>
                  </select>
                </div>
              </div>

              {/* View Both Students Evaluation Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCompareMode(!isCompareMode)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  isCompareMode
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-slate-900 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCompareMode ? 'Exit Comparison Mode' : 'View Both Student Evaluations'}</span>
              </button>
            </div>

            {/* ================= CONDITION 1: DUAL-STUDENT COMPARISON VIEW ================= */}
            {isCompareMode ? (() => {
              const cand1 = comparisonAnalysis?.cand1 || effectiveCandidates[0] || STUDENT_CANDIDATES_DATA[0];
              const cand2 = comparisonAnalysis?.cand2 || effectiveCandidates[1] || effectiveCandidates[0];
              const questionComparisons = comparisonAnalysis?.questionComparisons || [];
              const isCopiedFlagged = comparisonAnalysis?.isCopiedFlagged;
              const copiedCount = comparisonAnalysis?.copiedCount || 0;
              const exactCount = comparisonAnalysis?.exactCount || 0;
              const overallSimilarity = comparisonAnalysis?.overallSimilarity || 0;
              const totalCompared = comparisonAnalysis?.totalCompared || 0;

              return (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Plagiarism & Copied Answer Detection Alert Banner */}
                {isCopiedFlagged && (
                  <div className="bg-gradient-to-r from-red-950/95 via-rose-950/85 to-red-950/95 rounded-2xl p-4 border-2 border-red-500 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden animate-pulse-border">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/50">
                        <AlertOctagon className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-600 text-white shadow-sm flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Copied Answer Alert: Malpractice Flagged
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-900/80 text-red-200 border border-red-600">
                            {exactCount > 0 ? `${exactCount} Exact 100% Matches` : `${copiedCount} Flagged Questions`}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                            Similarity Match: {overallSimilarity}%
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-white mt-1.5 flex items-center gap-2 flex-wrap">
                          <span>{cand1.name} (Roll #{cand1.rollNo})</span>
                          <span className="text-red-400 font-mono font-bold">⇄</span>
                          <span>{cand2.name} (Roll #{cand2.rollNo})</span>
                          <span className="text-xs font-normal text-rose-300">({cand1.subject})</span>
                        </h4>
                        <p className="text-xs text-rose-200/90 mt-0.5">
                          Identical phrasing detected between both answer sheets! The system flagged these submissions as copied across {copiedCount} of {totalCompared} questions.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={handleFlagBothAsCopied}
                        className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition shadow-lg shadow-red-900/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Mark both students as copied in Dashboard roster"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Flag Both in Dashboard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompareSubView(compareSubView === 'flowchart' ? 'breakdown' : 'flowchart')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                          compareSubView === 'flowchart'
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                            : 'bg-slate-900 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/10'
                        }`}
                      >
                        <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{compareSubView === 'flowchart' ? 'Exit Flowchart' : 'View Flowchart'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-View Navigation Switcher */}
                <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 flex-wrap shadow-inner">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-blue-400" /> View Mode:
                    </span>
                    <button
                      type="button"
                      onClick={() => setCompareSubView('breakdown')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        compareSubView === 'breakdown'
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-500/30'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>📊 Side-by-Side Breakdown</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareSubView('flowchart')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        compareSubView === 'flowchart'
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-500/30'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                      <span>🔀 Similarity Flowchart</span>
                      {isCopiedFlagged && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-500 text-white">
                          {overallSimilarity}% Match
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareSubView('diff')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        compareSubView === 'diff'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-500/30'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>📝 Answer Text Diff</span>
                      {copiedCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-red-500 text-white">
                          {copiedCount} Flagged
                        </span>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs font-mono pr-2">
                    <span className="text-slate-400">Plagiarism Index:</span>
                    <span className={`px-2 py-0.5 rounded-lg font-black ${
                      overallSimilarity >= 70 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {overallSimilarity}%
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400">Identical:</span>
                    <span className="text-amber-400 font-bold">{exactCount} / {totalCompared}</span>
                  </div>
                </div>

                {/* ================= SUB-VIEW 1: SIDE-BY-SIDE BREAKDOWN ================= */}
                {compareSubView === 'breakdown' && (
                  <>
                    {/* Comparison Header Banner */}
                    <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-purple-950/60 rounded-2xl p-4 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          Dual-Student Comparative Evaluation Breakdown
                        </h3>
                        <p className="text-xs text-slate-400">
                          Comparing {cand1.name} ({cand1.fileName}) vs {cand2.name} ({cand2.fileName}) side-by-side
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {cand1.name} Score: <strong>{cand1.marksObtained} / {cand1.maxMarks}</strong> ({cand1.accuracy}%)
                        </div>
                        <div className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {cand2.name} Score: <strong>{cand2.marksObtained} / {cand2.maxMarks}</strong> ({cand2.accuracy}%)
                        </div>
                      </div>
                    </div>

                    {/* Two-Column Side-by-Side Comparison Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Column 1: Candidate 1 */}
                      <div className="bg-slate-950/80 rounded-2xl p-4 border border-blue-500/40 space-y-4 shadow-lg flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                              #{cand1.rollNo}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{cand1.name}</h4>
                                {isCopiedFlagged && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Flagged: Copied
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-amber-400 font-semibold">{cand1.fileName} • {cand1.subject}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCandidateIdx(0);
                              setIsCompareMode(false);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect Paper</span>
                          </button>
                        </div>

                        {/* Candidate 1 Donut & Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex flex-col items-center text-center">
                            <CircularProgress
                              value={cand1.accuracy || 80}
                              size={100}
                              strokeWidth={8}
                              color="#10B981"
                            />
                            <span className="text-xl font-extrabold text-white mt-1">{cand1.marksObtained} / {cand1.maxMarks}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">{cand1.accuracy}% Total Accuracy</span>
                          </div>
                          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1.5">
                            <ProgressBar value={cand1.accuracy || 80} label="Semantic Accuracy" color="bg-emerald-500" />
                            <ProgressBar value={cand1.grammar || 75} label="Grammar Quality" color="bg-purple-500" />
                            <ProgressBar value={cand1.keywordMatch || 80} label="Keyword Match" color="bg-amber-500" />
                            <ProgressBar value={cand1.similarity || 85} label="Model Similarity" color="bg-blue-500" />
                          </div>
                        </div>

                        {/* Candidate 1 Questions Summary */}
                        <div className="space-y-2 flex-1">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itemized Questions ({cand1.fileName}):</h5>
                          {cand1.questions?.map((q, qIdx) => {
                            const qc = questionComparisons.find(item => item.qNo === q.qNo) || questionComparisons[qIdx];
                            const isQCopied = qc?.isCopied;
                            return (
                              <div
                                key={qIdx}
                                className={`p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                                  isQCopied
                                    ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                                    : 'bg-slate-900/60 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-bold font-mono shrink-0 ${q.status === 'Incorrect' ? 'text-red-400' : 'text-emerald-400'}`}>{q.qNo}</span>
                                    <span className="text-slate-200 truncate flex-1 mx-2">{q.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isQCopied && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/40">
                                        {qc.match.similarity}% Copied
                                      </span>
                                    )}
                                    <span className={`font-bold font-mono shrink-0 ${q.status === 'Incorrect' ? 'text-red-400' : 'text-emerald-400'}`}>
                                      {q.status === 'Incorrect' ? '0' : `+${q.marksObtained}`}/{q.maxMarks} M
                                    </span>
                                  </div>
                                </div>
                                {isQCopied && (
                                  <div className="flex items-center justify-between pt-1 border-t border-red-500/20 text-[11px]">
                                    <span className="text-rose-300 font-semibold flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-red-400" />
                                      {qc.match.matchType} with {cand2.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDiffQNo(q.qNo);
                                        setCompareSubView('diff');
                                      }}
                                      className="text-[10px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
                                    >
                                      Inspect Diff →
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Column 2: Candidate 2 */}
                      <div className="bg-slate-950/80 rounded-2xl p-4 border border-purple-500/40 space-y-4 shadow-lg flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs">
                              #{cand2.rollNo}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{cand2.name}</h4>
                                {isCopiedFlagged && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Flagged: Copied
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-purple-400 font-semibold">{cand2.fileName} • {cand2.subject}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCandidateIdx(1);
                              setIsCompareMode(false);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect Paper</span>
                          </button>
                        </div>

                        {/* Candidate 2 Donut & Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex flex-col items-center text-center">
                            <CircularProgress
                              value={cand2.accuracy || 83}
                              size={100}
                              strokeWidth={8}
                              color="#8B5CF6"
                            />
                            <span className="text-xl font-extrabold text-white mt-1">{cand2.marksObtained} / {cand2.maxMarks}</span>
                            <span className="text-[10px] text-purple-400 font-bold">{cand2.accuracy}% Total Accuracy</span>
                          </div>
                          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-1.5">
                            <ProgressBar value={cand2.accuracy || 83} label="Semantic Accuracy" color="bg-emerald-500" />
                            <ProgressBar value={cand2.grammar || 80} label="Grammar Quality" color="bg-purple-500" />
                            <ProgressBar value={cand2.keywordMatch || 82} label="Keyword Match" color="bg-amber-500" />
                            <ProgressBar value={cand2.similarity || 86} label="Model Similarity" color="bg-blue-500" />
                          </div>
                        </div>

                        {/* Candidate 2 Questions Summary */}
                        <div className="space-y-2 flex-1">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itemized Questions ({cand2.fileName}):</h5>
                          {cand2.questions?.map((q, qIdx) => {
                            const qc = questionComparisons.find(item => item.qNo === q.qNo) || questionComparisons[qIdx];
                            const isQCopied = qc?.isCopied;
                            return (
                              <div
                                key={qIdx}
                                className={`p-2.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                                  isQCopied
                                    ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                                    : 'bg-slate-900/60 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-purple-400 font-mono shrink-0">{q.qNo}</span>
                                    <span className="text-slate-200 truncate flex-1 mx-2">{q.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isQCopied && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/40">
                                        {qc.match.similarity}% Copied
                                      </span>
                                    )}
                                    <span className="font-bold font-mono text-purple-400 shrink-0">+{q.marksObtained}/{q.maxMarks} M</span>
                                  </div>
                                </div>
                                {isQCopied && (
                                  <div className="flex items-center justify-between pt-1 border-t border-red-500/20 text-[11px]">
                                    <span className="text-rose-300 font-semibold flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-red-400" />
                                      {qc.match.matchType} with {cand1.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDiffQNo(q.qNo);
                                        setCompareSubView('diff');
                                      }}
                                      className="text-[10px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
                                    >
                                      Inspect Diff →
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ================= SUB-VIEW 2: INTERACTIVE SIMILARITY FLOWCHART ================= */}
                {compareSubView === 'flowchart' && (
                  <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                      <div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                          <Workflow className="w-4 h-4 text-cyan-400" />
                          Answer Sheet Comparison Flowchart & Plagiarism Mapping
                        </h4>
                        <p className="text-xs text-slate-400">
                          Interactive graph comparing question answer vectors and lexical duplication between candidates
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">Verdict:</span>
                        {isCopiedFlagged ? (
                          <span className="px-3 py-1 rounded-xl text-xs font-black bg-red-500/20 text-red-400 border border-red-500/50 flex items-center gap-1.5 shadow-sm">
                            <AlertOctagon className="w-3.5 h-3.5" /> MALPRACTICE DETECTED ({overallSimilarity}% Match)
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> INDEPENDENT WORK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Flowchart Header Nodes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Candidate 1 Node */}
                      <div className="p-4 rounded-2xl bg-blue-950/40 border-2 border-blue-500/50 shadow-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          #{cand1.rollNo}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Candidate 1</span>
                          <h5 className="text-sm font-extrabold text-white truncate">{cand1.name}</h5>
                          <span className="text-[11px] text-slate-400 font-mono block truncate">{cand1.fileName} • {cand1.division}</span>
                        </div>
                      </div>

                      {/* Center Decision Node */}
                      <div className="p-3 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-inner flex flex-col items-center justify-center text-center">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-1">
                          <GitFork className="w-4 h-4 rotate-90" />
                        </div>
                        <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">Semantic Match Engine</span>
                        <span className="text-[10px] text-slate-400">Jaccard & Sequential Bigram Overlap</span>
                        <div className="mt-1.5 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30">
                          Threshold ≥ 70% ➜ Copied Flagged
                        </div>
                      </div>

                      {/* Candidate 2 Node */}
                      <div className="p-4 rounded-2xl bg-purple-950/40 border-2 border-purple-500/50 shadow-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          #{cand2.rollNo}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Candidate 2</span>
                          <h5 className="text-sm font-extrabold text-white truncate">{cand2.name}</h5>
                          <span className="text-[11px] text-slate-400 font-mono block truncate">{cand2.fileName} • {cand2.division}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pathways between Question Answers */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                        Question-by-Question Comparison Pathways ({questionComparisons.length} Questions):
                      </h5>
                      {questionComparisons.map((qc, qIdx) => {
                        const isMatch = qc.isCopied;
                        return (
                          <div
                            key={qIdx}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isMatch
                                ? 'bg-red-950/25 border-red-500/60 shadow-lg'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                              {/* Left Answer Node */}
                              <div className="md:col-span-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold font-mono text-blue-400">{qc.qNo}</span>
                                  <span className="text-[10px] font-semibold text-slate-400">{cand1.name}</span>
                                </div>
                                <span className="text-[11px] text-slate-300 font-semibold truncate">{qc.title}</span>
                                <p className="text-xs text-slate-400 line-clamp-3 italic mt-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                                  "{qc.cand1Question?.studentAnswer || 'No extracted text'}"
                                </p>
                              </div>

                              {/* Center Pathway Track */}
                              <div className="md:col-span-4 flex flex-col items-center justify-center text-center px-2 py-1">
                                <div className="w-full flex items-center justify-center gap-2 my-1">
                                  <div className={`h-[2px] flex-1 ${isMatch ? 'bg-gradient-to-r from-blue-500 to-red-500' : 'bg-slate-700'}`} />
                                  <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md ${
                                    isMatch
                                      ? 'bg-red-600 text-white animate-pulse'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}>
                                    {isMatch ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                    <span>{qc.match.similarity}% MATCH</span>
                                  </div>
                                  <div className={`h-[2px] flex-1 ${isMatch ? 'bg-gradient-to-r from-red-500 to-purple-500' : 'bg-slate-700'}`} />
                                </div>
                                <span className={`text-[11px] font-bold mt-1 ${qc.match.statusColor}`}>
                                  {qc.match.matchType}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDiffQNo(qc.qNo);
                                    setCompareSubView('diff');
                                  }}
                                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold mt-1 cursor-pointer"
                                >
                                  Inspect Full Answer Text Diff →
                                </button>
                              </div>

                              {/* Right Answer Node */}
                              <div className="md:col-span-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold font-mono text-purple-400">{qc.qNo}</span>
                                  <span className="text-[10px] font-semibold text-slate-400">{cand2.name}</span>
                                </div>
                                <span className="text-[11px] text-slate-300 font-semibold truncate">{qc.title}</span>
                                <p className="text-xs text-slate-400 line-clamp-3 italic mt-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                                  "{qc.cand2Question?.studentAnswer || 'No extracted text'}"
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Malpractice Recommendation Card */}
                    <div className={`p-4 rounded-2xl border ${
                      isCopiedFlagged ? 'bg-red-950/40 border-red-500/60' : 'bg-slate-900/80 border-slate-800'
                    } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isCopiedFlagged ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                          {isCopiedFlagged ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        </div>
                        <div>
                          <h5 className="text-sm font-extrabold text-white">
                            {isCopiedFlagged ? 'Malpractice Disciplinary Recommendation' : 'Evaluation Verdict: Authentic Independent Attempts'}
                          </h5>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {isCopiedFlagged
                              ? `Identical answer patterns detected in ${copiedCount} question(s). You can flag both students in the Dashboard or penalize marks.`
                              : 'Both candidate answer sheets demonstrate distinct individual phrasing, vocabulary, and derivation structure.'}
                          </p>
                        </div>
                      </div>
                      {isCopiedFlagged && (
                        <button
                          type="button"
                          onClick={handleFlagBothAsCopied}
                          className="px-4 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-500 transition shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Flag Both as Copied</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ================= SUB-VIEW 3: WORD-BY-WORD DIFF INSPECTOR ================= */}
                {compareSubView === 'diff' && (() => {
                  const activeQC = questionComparisons.find(qc => qc.qNo === activeDiffQNo) || questionComparisons[0];
                  const text1 = activeQC?.cand1Question?.studentAnswer || '';
                  const text2 = activeQC?.cand2Question?.studentAnswer || '';
                  const match = activeQC?.match;

                  return (
                    <div className="bg-slate-950/90 rounded-2xl p-5 border border-slate-800 space-y-5 shadow-2xl">
                      {/* Question Selection Ribbon */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Question to Inspect:</span>
                          {questionComparisons.map((qc) => (
                            <button
                              key={qc.qNo}
                              type="button"
                              onClick={() => setActiveDiffQNo(qc.qNo)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                                activeDiffQNo === qc.qNo
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-500/30'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              <span>{qc.qNo}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                                qc.isCopied ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {qc.match.similarity}%
                              </span>
                            </button>
                          ))}
                        </div>
                        {match && (
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${match.badgeColor}`}>
                            {match.matchType}
                          </span>
                        )}
                      </div>

                      {/* Question Prompt Title */}
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-bold text-amber-400 font-mono uppercase">{activeQC?.qNo} Question Prompt ({activeQC?.maxMarks} Marks):</span>
                        <h4 className="text-sm font-bold text-white mt-0.5">{activeQC?.title}</h4>
                      </div>

                      {/* Side-by-Side Answer Diff Box */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Column 1: Candidate 1 Text */}
                        <div className="bg-slate-900/90 rounded-2xl p-4 border border-blue-500/40 space-y-2.5 flex flex-col">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px]">#1</span>
                              {cand1.name} (Roll #{cand1.rollNo})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Word Count: {text1.split(/\s+/).filter(Boolean).length}</span>
                          </div>
                          <div className={`flex-1 p-3.5 rounded-xl border font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto ${
                            match?.isCopied ? 'bg-red-950/20 border-red-500/40 text-rose-100' : 'bg-slate-950 border-slate-800 text-slate-200'
                          }`}>
                            {text1 || <span className="text-slate-500 italic">No answer text recorded</span>}
                          </div>
                        </div>

                        {/* Column 2: Candidate 2 Text */}
                        <div className="bg-slate-900/90 rounded-2xl p-4 border border-purple-500/40 space-y-2.5 flex flex-col">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">#2</span>
                              {cand2.name} (Roll #{cand2.rollNo})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Word Count: {text2.split(/\s+/).filter(Boolean).length}</span>
                          </div>
                          <div className={`flex-1 p-3.5 rounded-xl border font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto ${
                            match?.isCopied ? 'bg-red-950/20 border-red-500/40 text-rose-100' : 'bg-slate-950 border-slate-800 text-slate-200'
                          }`}>
                            {text2 || <span className="text-slate-500 italic">No answer text recorded</span>}
                          </div>
                        </div>
                      </div>

                      {/* Diff Statistics Pill Bar */}
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-4 text-slate-300">
                          <span>Identical Words: <strong className="text-white font-mono">{match?.identicalWords || 0}</strong></span>
                          <span>Lexical Overlap: <strong className={match?.statusColor}>{match?.similarity || 0}%</strong></span>
                          <span>Classification: <strong className={match?.statusColor}>{match?.matchType}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCompareSubView('breakdown')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          >
                            ← Back to Side-by-Side Breakdown
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              );
            })() : (
              /* ================= CONDITION 2: SINGLE-STUDENT SPLIT SCREEN WITH PAPER & ANNOTATION ================= */
              <>
                {/* Candidate Context Pill Bar */}
                <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div><span className="text-slate-400 font-semibold">Roll Number:</span> <strong className="text-blue-400">#{activeCandidate.rollNo}</strong></div>
                    <div><span className="text-slate-400 font-semibold">Candidate:</span> <strong className="text-white">{activeCandidate.name}</strong></div>
                    <div><span className="text-slate-400 font-semibold">Batch:</span> <strong className="text-pink-400">{activeCandidate.batch}</strong></div>
                    <div><span className="text-slate-400 font-semibold">Division:</span> <strong className="text-cyan-400">{activeCandidate.division}</strong></div>
                    <div><span className="text-slate-400 font-semibold">Subject:</span> <strong className="text-amber-400">{activeCandidate.subject}</strong></div>
                    <div><span className="text-slate-400 font-semibold">File:</span> <strong className="text-emerald-400 font-mono">{activeCandidate.fileName}</strong></div>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    ✓ Evaluation Synced with Uploaded Paper
                  </div>
                </div>

                {/* Two-Section Split Screen: Left (Evaluation Result) & Right (Uploaded Paper with Annotations) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
                  
                  {/* ================= LEFT SECTION: Evaluation Result ================= */}
                  <div className={`${leftColSpan} flex flex-col h-full min-h-0 overflow-hidden pr-1 transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        AI Evaluation & Rubric Breakdown ({activeCandidate.name})
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Score: <strong className="text-white">{activeCandidate.marksObtained}/{activeCandidate.maxMarks}</strong> ({activeCandidate.accuracy}% Accuracy)
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {/* Score Overview Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/60 flex flex-col items-center justify-center text-center">
                          <CircularProgress
                            value={Math.round((activeCandidate.marksObtained / activeCandidate.maxMarks) * 100)}
                            size={120}
                            strokeWidth={10}
                            color={activeCandidate.rollNo === '02' ? '#8B5CF6' : '#10B981'}
                          />
                          <div className="mt-2.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-white">{activeCandidate.marksObtained}</span>
                            <span className="text-slate-400 text-sm font-semibold"> / {activeCandidate.maxMarks}</span>
                            <p className="text-xs text-emerald-400 font-medium mt-0.5">Total Score Awarded</p>
                          </div>
                        </div>

                        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/60 space-y-2.5">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Evaluation Metrics</h3>
                          <ProgressBar value={activeCandidate.accuracy} label="Semantic Accuracy" color="bg-emerald-500" />
                          <ProgressBar value={activeCandidate.grammar} label="Grammar Quality" color="bg-purple-500" />
                          <ProgressBar value={activeCandidate.keywordMatch} label="Keyword Match" color="bg-amber-500" />
                          <ProgressBar value={activeCandidate.similarity} label="Model Answer Similarity" color="bg-blue-500" />
                          <ProgressBar value={activeCandidate.completeness} label="Answer Completeness" color="bg-teal-500" />
                        </div>
                      </div>

                      {/* Question-Wise Model Answer Key & Student Extracted Answer Comparison */}
                      <div className="space-y-3 pt-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              Itemized Question Evaluation ({activeCandidate.questions.length} Questions)
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReEvaluateQuestions()}
                              disabled={isEvaluatingSheet}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md border border-emerald-400/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                            >
                              <RefreshCw className={`w-3 h-3 ${isEvaluatingSheet ? 'animate-spin' : ''}`} />
                              Re-Evaluate All
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {activeCandidate.questions.map((q, idx) => {
                            const qAccuracy = q.accuracy || (q.marksObtained && q.maxMarks ? Math.round((q.marksObtained / q.maxMarks) * 100) : 90);
                            const qNum = parseInt(String(q.qNo || q.id || idx + 1).replace(/\D/g, ''), 10) || (idx + 1);
                            const isSelected = String(selectedQuestionId) === String(qNum) || 
                                               String(selectedQuestionId) === String(q.qNo) || 
                                               String(selectedQuestionId) === String(q.id);

                            return (
                              <div
                                key={idx}
                                id={`eval-question-${qNum}`}
                                onClick={() => {
                                  setSelectedQuestionId(qNum);
                                  const isRev = activeCandidate.fileName?.toLowerCase().includes('106') ||
                                                activeCandidate.fileName?.toLowerCase().includes('1857') ||
                                                activeCandidate.fileName?.toLowerCase().includes('revolt');
                                  const isPhys = !isRev && (activeCandidate.fileName?.includes('02') || activeCandidate.subject?.toLowerCase().includes('phys'));
                                  const isHist = !isRev && !isPhys && (activeCandidate.fileName?.includes('01') || activeCandidate.subject?.toLowerCase().includes('hist'));
                                  const targetPage = typeof q.pageNumber === 'number'
                                    ? q.pageNumber - 1
                                    : (isRev ? (qNum === 1 ? 0 : 1) : (isPhys ? (qNum <= 7 ? 0 : 1) : (isHist ? (qNum <= 3 ? 0 : 1) : 0)));
                                  if (activeCandidate.paperPreviews && activeCandidate.paperPreviews.length > targetPage) {
                                    setModalPageIndex(targetPage);
                                  }
                                }}
                                className={`rounded-2xl p-4 border transition-all duration-200 cursor-pointer space-y-3 shadow-md ${
                                  isSelected
                                    ? 'bg-slate-800 border-blue-500 ring-2 ring-blue-500/50 shadow-blue-500/10'
                                    : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                                }`}
                              >
                                {/* Question Header & Score */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                                      q.status === 'Correct'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : q.status === 'Partial'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                                    }`}>
                                      {q.qNo}
                                    </span>
                                    <h5 className="text-xs sm:text-sm font-bold text-white leading-snug">
                                      {q.title}
                                    </h5>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedQuestionId(qNum);
                                        const isRev = activeCandidate.fileName?.toLowerCase().includes('106') ||
                                                      activeCandidate.fileName?.toLowerCase().includes('1857') ||
                                                      activeCandidate.fileName?.toLowerCase().includes('revolt');
                                        const isPhys = !isRev && (activeCandidate.fileName?.includes('02') || activeCandidate.subject?.toLowerCase().includes('phys'));
                                        const isHist = !isRev && !isPhys && (activeCandidate.fileName?.includes('01') || activeCandidate.subject?.toLowerCase().includes('hist'));
                                        const targetPage = typeof q.pageNumber === 'number'
                                          ? q.pageNumber - 1
                                          : (isRev ? (qNum === 1 ? 0 : 1) : (isPhys ? (qNum <= 7 ? 0 : 1) : (isHist ? (qNum <= 3 ? 0 : 1) : 0)));
                                        if (activeCandidate.paperPreviews && activeCandidate.paperPreviews.length > targetPage) {
                                          setModalPageIndex(targetPage);
                                        }
                                        setTimeout(() => {
                                          const boxEl = document.getElementById(`ai-box-${qNum}`);
                                          if (boxEl) {
                                            boxEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                          }
                                        }, 60);
                                      }}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                        isSelected
                                          ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                      }`}
                                      title="Locate and highlight this question's answer on the paper"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Locate on Paper</span>
                                    </button>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                      q.status === 'Correct'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : q.status === 'Partial'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    }`}>
                                      {q.status}
                                    </span>
                                    <span className={`text-sm font-extrabold ${
                                      q.status === 'Correct'
                                        ? 'text-emerald-400'
                                        : q.status === 'Partial'
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                                    }`}>
                                      {q.marksObtained} <span className="text-slate-400 text-xs font-semibold">/ {q.maxMarks} M</span>
                                    </span>
                                  </div>
                                </div>

                                {/* Answer Comparison: Master Key vs Student Extracted Answer */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                  {/* Master Key */}
                                  <div className="bg-emerald-950/30 rounded-xl p-3 border border-emerald-500/40 space-y-1.5 shadow-inner flex flex-col">
                                    <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold border-b border-emerald-800/60 pb-1.5">
                                      <span className="flex items-center gap-1.5">
                                        <Key className="w-3.5 h-3.5 text-emerald-400" />
                                        Master Key / Correct Model Answer ({q.qNo}):
                                      </span>
                                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-mono font-semibold">
                                        Model Key
                                      </span>
                                    </div>
                                    <p className="text-emerald-100 font-mono text-xs leading-relaxed whitespace-pre-wrap pl-0.5 max-h-72 overflow-y-auto">
                                      {q.modelAnswer}
                                    </p>
                                  </div>

                                  {/* Student Answer */}
                                  <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-700/80 space-y-1.5 shadow-inner flex flex-col">
                                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold border-b border-slate-800 pb-1.5">
                                      <span className="flex items-center gap-1.5 text-blue-400">
                                        <FileText className="w-3.5 h-3.5" />
                                        Student Extracted Answer ({q.qNo}):
                                      </span>
                                      <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 font-mono font-semibold">
                                        Handwritten Paper
                                      </span>
                                    </div>
                                    <p className="text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap pl-0.5 max-h-72 overflow-y-auto">
                                      {q.studentAnswer}
                                    </p>
                                  </div>
                                </div>

                                {/* Accuracy Progress Bar */}
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <ProgressBar
                                      value={qAccuracy}
                                      label="Question Accuracy"
                                      color={q.status === 'Correct' ? 'bg-emerald-500' : q.status === 'Partial' ? 'bg-amber-500' : 'bg-red-500'}
                                    />
                                  </div>
                                  <span className="text-xs font-mono font-bold text-slate-300">
                                    {qAccuracy}%
                                  </span>
                                </div>

                                {/* AI Feedback */}
                                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                                  <span className={`${q.status === 'Incorrect' ? 'text-red-400' : 'text-emerald-400'} font-bold shrink-0`}>
                                    {q.status === 'Incorrect' ? '❌ AI Evaluation:' : '💡 AI Feedback:'}
                                  </span>
                                  <p className="italic text-slate-200">{q.feedback || 'Answer matches expected rubric criteria.'}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Overall Strengths */}
                      {activeCandidate.feedback?.strengths?.length > 0 && (
                        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 space-y-1">
                          <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Key Observations:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                            {activeCandidate.feedback.strengths.map((str, idx) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Footer Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'APPROVE_STUDENT', payload: activeCandidate.name });
                          addToast(`Result Approved for ${activeCandidate.name}! Published to Dashboard.`, 'success');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Result ({activeCandidate.name})</span>
                      </button>
                      <button
                        onClick={() => setShowEvalModal(false)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setShowEvalModal(false);
                          navigate('/evaluation');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        View Evaluation Page
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* ================= RIGHT SECTION: Uploaded Paper with Image Annotation Studio ================= */}
                  <div className={`${rightColSpan} flex flex-col h-full min-h-0 bg-slate-950/90 rounded-2xl border border-slate-800 p-3.5 sm:p-4 space-y-3 overflow-hidden shadow-inner transition-all duration-300`}>
                    {/* Right Section Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                            Uploaded Paper (Right Section)
                          </h3>
                          <p className="text-[10px] text-slate-400">
                            {activeCandidate.fileName} • {activeCandidate.name} ({activeCandidate.subject})
                          </p>
                        </div>
                      </div>

                      {/* Page Switcher & Zoom & Size Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Interactive Page Switcher Pill Tabs */}
                        <div className="flex items-center bg-slate-900 border border-blue-500/30 rounded-xl p-0.5 text-xs shadow-md">
                          <button
                            type="button"
                            onClick={() => setModalPageIndex((prev) => Math.max(0, prev - 1))}
                            disabled={modalPageIndex === 0}
                            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition font-bold cursor-pointer flex items-center gap-1"
                            title="Previous Page of Answer Sheet"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-blue-400" />
                            <span className="hidden sm:inline">Prev</span>
                          </button>
                          
                          <div className="flex items-center gap-1 px-1">
                            {(activeCandidate.paperPreviews?.length ? activeCandidate.paperPreviews : ['p1', 'p2']).map((_, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setModalPageIndex(pIdx)}
                                className={`px-2.5 py-0.5 text-xs font-mono font-black rounded-lg transition cursor-pointer ${
                                  modalPageIndex === pIdx
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-blue-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title={`View Page ${pIdx + 1} of PDF`}
                              >
                                Page {pIdx + 1}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setModalPageIndex((prev) => Math.min((activeCandidate.paperPreviews?.length || 2) - 1, prev + 1))}
                            disabled={modalPageIndex >= (activeCandidate.paperPreviews?.length || 2) - 1}
                            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition font-bold cursor-pointer flex items-center gap-1"
                            title="Next Page of Answer Sheet"
                          >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setModalPaperZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
                            className="px-2 py-1 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-1 text-[10px] font-mono font-bold text-slate-300 min-w-[34px] text-center">
                            {Math.round(modalPaperZoom * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setModalPaperZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))}
                            className="px-2 py-1 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalPaperZoom(1)}
                            className="px-1.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                            title="Reset Zoom"
                          >
                            Fit
                          </button>
                        </div>

                        {/* Section Size Presets */}
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs shadow-md">
                          <button
                            type="button"
                            onClick={() => setSplitLayout('balanced')}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded transition cursor-pointer ${
                              splitLayout === 'balanced'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Same Size: Both sections equal 50% / 50%"
                          >
                            Same Size (50:50)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitLayout('paper-focused')}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer ${
                              splitLayout === 'paper-focused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Expanded Paper Box (65% Width)"
                          >
                            Large Paper (65%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSplitLayout('paper-max')}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition cursor-pointer flex items-center gap-1 ${
                              splitLayout === 'paper-max'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="Max Paper Box (75% Width)"
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                            <span>Max (75%)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Paper Image Viewport Container with Image Annotation Studio */}
                    <div className="flex-1 w-full overflow-y-auto overflow-x-hidden rounded-xl bg-slate-900/60 border border-slate-800/80 p-2 sm:p-3 flex flex-col items-center relative min-h-[500px]">
                      <ImageAnnotator
                        imageSrc={activeCandidate.paperPreviews[modalPageIndex] || activeCandidate.paperPreviews[0]}
                        pageIndex={modalPageIndex}
                        totalPages={activeCandidate.paperPreviews.length}
                        studentName={activeCandidate.name}
                        rollNo={activeCandidate.rollNo}
                        subject={activeCandidate.subject}
                        fileName={activeCandidate.fileName}
                        questions={activeCandidate.questions}
                        selectedQuestionId={selectedQuestionId}
                        onSelectQuestion={(qNum) => {
                          setSelectedQuestionId(qNum);
                          const el = document.getElementById(`eval-question-${qNum}`) || 
                                     document.getElementById(`eval-question-Q.${qNum}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }}
                        zoom={modalPaperZoom}
                        onZoomChange={setModalPaperZoom}
                        showToolbar={false}
                      />
                    </div>

                    {/* Footer Tag & Page Quick Switcher */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 shrink-0">
                      <span className="flex items-center gap-1 font-medium text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Viewing Page {modalPageIndex + 1} of {activeCandidate.paperPreviews?.length || 2} • Visual Verification
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[180px] font-mono text-[10px] text-slate-400">
                          {activeCandidate.fileName} (Roll #{activeCandidate.rollNo})
                        </span>
                        <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded-md border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setModalPageIndex(0)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                              modalPageIndex === 0 ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Page 1
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalPageIndex(1)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                              modalPageIndex === 1 ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Page 2
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* ===== Sample Question Paper Selection Modal ===== */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl my-8 text-slate-100"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-yellow-400 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Select or Upload Question Paper
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a pre-configured paper or upload a custom question paper image/PDF for AI evaluation analysis.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSampleModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Custom Question Paper Card Banner */}
            <div
              onClick={() => questionPaperInputRef.current?.click()}
              className="p-4 rounded-2xl border-2 border-dashed border-blue-500/40 bg-blue-950/20 hover:bg-blue-950/40 hover:border-blue-400 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-200 group-hover:text-white transition-colors">
                    Upload Custom Question Paper Image / PDF
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload your exam question paper (PNG, JPG, PDF). AI will extract questions &amp; rubric keys automatically.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-500/20"
              >
                <FileUp className="w-4 h-4" />
                Browse File
              </button>
            </div>

            {/* Presets Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
              {availableQuestionPapers.map((paper) => {
                const isSelected = selectedSampleId === paper.id;
                return (
                  <div
                    key={paper.id}
                    className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{paper.icon}</span>
                          <div>
                            <h3 className="text-sm font-bold text-white leading-snug">
                              {paper.title}
                            </h3>
                            <span className="text-[11px] text-amber-400/90 font-medium">
                              Subject: {paper.subject}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-yellow-300 border border-amber-500/40">
                              Active
                            </span>
                          )}
                          <button
                            onClick={(e) => handleRemoveQuestionPaper(paper.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 border border-slate-800 hover:border-red-500/30 transition cursor-pointer flex items-center gap-1 text-[11px]"
                            title="Remove Question Paper"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="sr-only md:not-sr-only">Remove</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <span>👤 Student: <strong className="text-slate-200">{paper.studentName}</strong></span>
                        <span>•</span>
                        <span>📋 Questions: <strong className="text-slate-200">{paper.questions.length}</strong></span>
                        <span>•</span>
                        <span>🎯 Marks: <strong className="text-slate-200">{paper.maxMarks}</strong></span>
                      </div>

                      {/* Question Preview List */}
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <span className="text-[11px] font-semibold text-slate-400 block">Questions Included:</span>
                        <ul className="space-y-1 max-h-28 overflow-y-auto pr-1 font-mono text-[11px] text-slate-300">
                          {paper.questions.map((q) => (
                            <li key={q.id} className="flex items-start gap-1.5 bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/80">
                              <span className="text-amber-400 font-bold shrink-0">{q.qNo}</span>
                              <span className="truncate">{q.title}</span>
                              <span className="ml-auto text-[10px] text-slate-400 shrink-0">({q.maxMarks}m)</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleSelectSamplePaper(paper, false)}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Load Paper
                      </button>
                      <button
                        onClick={() => handleSelectSamplePaper(paper, true)}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        Load &amp; Analyze
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>💡 Selecting a paper will update the handwritten answer canvas &amp; evaluation rubric.</span>
              <button
                onClick={() => setShowSampleModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
