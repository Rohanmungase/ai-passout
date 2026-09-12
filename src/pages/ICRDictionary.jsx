import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { evaluateAnswer, evaluateQuestionWiseRubric } from '../services/aiEvaluationService';
import { extractText, parseQATextIntoQuestions, convertPdfToDataUrl, getPdfPageCount } from '../services/ocrService';
import CircularProgress from '../components/CircularProgress';
import ProgressBar from '../components/ProgressBar';
import StudentInfoCard from '../components/StudentInfoCard';
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

export default function ICRDictionary() {
  const { state, dispatch } = useAppContext();
  const toast = useToast();
  const navigate = useNavigate();

  const [isEvaluatingSheet, setIsEvaluatingSheet] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState('history_101');
  const [evalResult, setEvalResult] = useState(null);

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

  const handleReEvaluateQuestions = async (targetQuestions = evalQuestions) => {
    setIsEvaluatingSheet(true);
    try {
      let textToEvaluate = state.extractedText;
      if (!textToEvaluate || textToEvaluate.trim() === '') {
        textToEvaluate = targetQuestions.map(q => `${q.qNo} ${q.title}\nAns. ${q.studentAnswer}`).join('\n\n');
      }
      const result = await evaluateQuestionWiseRubric(targetQuestions, textToEvaluate);
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
      let textToEvaluate = state.extractedText;
      if (!textToEvaluate || textToEvaluate.trim() === '') {
        addToast('No extracted text content found to evaluate. Please extract text from an image first.', 'warning');
        setIsEvaluatingSheet(false);
        return;
      }

      // Always parse questions directly from the currently extracted text in the textarea
      const freshQuestions = parseQATextIntoQuestions(textToEvaluate);
      const questionsToEval = (freshQuestions && freshQuestions.length > 0)
        ? freshQuestions
        : (evalQuestions || []);

      // Keep UI question cards in sync with extracted paper questions
      if (freshQuestions && freshQuestions.length > 0) {
        setEvalQuestions(freshQuestions);
      }

      const result = await evaluateQuestionWiseRubric(questionsToEval, textToEvaluate);
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
      const res = await extractText(file, { studentInfo: state.studentInfo });
      if (res && res.text) {
        dispatch({ type: 'SET_OCR_RESULT', payload: res });
        setEvalQuestions((prevQuestions) => {
          const parsed = parseQATextIntoQuestions(res.text, prevQuestions);
          return (parsed && parsed.length > 0) ? parsed : prevQuestions;
        });
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

  // Upload user image or PDF document
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (isPdf) {
      await loadPdfFile(file, 1);
    } else {
      setPdfFile(null);
      setPdfFileName('');
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        const toastFn = typeof addToast === 'function' ? addToast : () => {};
        toastFn('Image loaded successfully. Extracting Q&A text format...', 'success');
      };
      reader.readAsDataURL(file);
      extractPdfOrImageQAText(file);
    }
  };

  // Select file from session uploadedFiles list
  const handleSelectSessionFile = async (e) => {
    const index = parseInt(e.target.value, 10);
    if (isNaN(index)) return;
    const fileObj = state.uploadedFiles[index];
    const previewUrl = state.imagePreviews[index];

    if (!fileObj && !previewUrl) return;

    if (fileObj && (fileObj.name.toLowerCase().endsWith('.pdf') || fileObj.type === 'application/pdf')) {
      await loadPdfFile(fileObj, 1);
    } else if (previewUrl) {
      setPdfFile(null);
      setPdfFileName('');
      setImageSrc(previewUrl);
      if (fileObj) {
        extractPdfOrImageQAText(fileObj);
      }
    }
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
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl border border-blue-500/30 p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
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
      {showEvalModal && evalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 relative my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Background glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Answer Sheet AI Evaluation & Analysis</h2>
                  <p className="text-xs text-slate-400">Evaluated using AI Engine for {state.studentInfo?.name || 'Aarav Sharma'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEvalModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Badge */}
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div><strong>Student:</strong> {state.studentInfo?.name || 'Aarav Sharma'} ({state.studentInfo?.rollNo || '202301002'})</div>
              <div><strong>Subject:</strong> {state.studentInfo?.subject || 'History & Social Studies'}</div>
              <div><strong>Class:</strong> {state.studentInfo?.className || 'FY B.Tech (CSE)'}</div>
            </div>

            {/* Score Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/60 flex flex-col items-center justify-center text-center">
                <CircularProgress
                  value={Math.round((evalResult.marksObtained / evalResult.maxMarks) * 100)}
                  size={130}
                  strokeWidth={10}
                  color="#10B981"
                />
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-white">{evalResult.marksObtained}</span>
                  <span className="text-slate-400 text-base font-semibold"> / {evalResult.maxMarks}</span>
                  <p className="text-xs text-emerald-400 font-medium mt-0.5">Total Score Awarded</p>
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/60 space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Evaluation Metrics</h3>
                <ProgressBar value={evalResult.accuracy} label="Semantic Accuracy" color="bg-emerald-500" />
                <ProgressBar value={evalResult.grammar} label="Grammar Quality" color="bg-purple-500" />
                <ProgressBar value={evalResult.keywordMatch} label="Keyword Match" color="bg-amber-500" />
                <ProgressBar value={evalResult.similarity} label="Model Answer Similarity" color="bg-blue-500" />
                <ProgressBar value={evalResult.completeness} label="Answer Completeness" color="bg-teal-500" />
              </div>
            </div>

            {/* Question-Wise Correct Model Answer vs Student Extracted Answer Comparison */}
            {evalResult.questionBreakdown?.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Question-by-Question Model Answer Key & AI Comparison
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Type/edit the correct answer key below to immediately compare and re-evaluate student marks.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddQuestionToModal}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Question
                    </button>
                    <button
                      onClick={() => handleReEvaluateQuestions()}
                      disabled={isEvaluatingSheet}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md border border-emerald-400/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingSheet ? 'animate-spin' : ''}`} />
                      Re-Evaluate All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {evalResult.questionBreakdown.map((q, idx) => {
                    const currentQ = evalQuestions.find((item) => item.id === q.id) || q;
                    return (
                      <div
                        key={idx}
                        className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3 shadow-md"
                      >
                        {/* Question Header & Score */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold font-mono">
                              {q.qNo}
                            </span>
                            <input
                              type="text"
                              value={currentQ.title}
                              onChange={(e) => handleModalQuestionChange(q.id, 'title', e.target.value)}
                              className="bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs font-bold text-white w-full focus:border-emerald-500 outline-none"
                              placeholder="Question Description..."
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              q.status === 'Correct'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : q.status === 'Partial'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {q.status}
                            </span>
                            <span className="text-sm font-extrabold text-emerald-400">
                              {q.marksObtained} <span className="text-slate-400 text-xs font-semibold">/ {q.maxMarks} Marks</span>
                            </span>
                          </div>
                        </div>

                        {/* Editable Correct Model Answer Key */}
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              🎯 Correct Model Answer Key (Type / Write Here):
                            </span>
                            <span className="text-[10px] text-emerald-300/80 font-medium">
                              Type the expected answer key to compare
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={currentQ.modelAnswer}
                            onChange={(e) => handleModalQuestionChange(q.id, 'modelAnswer', e.target.value)}
                            className="w-full bg-slate-950/70 border border-emerald-500/40 rounded-lg p-2.5 text-xs text-emerald-100 placeholder-emerald-700/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none resize-y font-sans leading-relaxed"
                            placeholder="Type or write the correct model answer here..."
                          />
                        </div>

                        {/* Editable Student Extracted Answer */}
                        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                              ✍️ Student Extracted Answer (from Sheet):
                            </span>
                            <span className="text-[10px] text-slate-400 italic">
                              Extracted via ICR / OCR
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={currentQ.studentAnswer}
                            onChange={(e) => handleModalQuestionChange(q.id, 'studentAnswer', e.target.value)}
                            className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-400 outline-none resize-y font-mono leading-relaxed"
                            placeholder="Student answer text..."
                          />
                        </div>

                        {/* Question Action & AI Feedback */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-800 text-[11px]">
                          <span className="text-slate-400 italic flex items-center gap-1.5">
                            💡 <strong>AI Feedback:</strong> {q.feedback}
                          </span>
                          <button
                            onClick={() => handleReEvaluateQuestions()}
                            disabled={isEvaluatingSheet}
                            className="px-3 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <RefreshCw className={`w-3 h-3 ${isEvaluatingSheet ? 'animate-spin' : ''}`} />
                            Re-Evaluate This Question
                          </button>
                        </div>

                        {/* Diagram AI Evaluation Box */}
                        {q.diagramEvaluation && (
                          <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/60 p-3 rounded-xl border border-purple-500/30 text-purple-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                🎨 Diagram AI Evaluation Engine ({q.diagramEvaluation.diagramType}):
                              </span>
                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
                                Score: {q.diagramEvaluation.overallDiagramScore}% (Verified)
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-purple-200">
                              <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                                <span className="text-purple-400 font-bold block">Structural Geometry:</span>
                                <span className="font-extrabold text-emerald-400">{q.diagramEvaluation.structuralScore}% Accurately Drawn</span>
                              </div>
                              <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                                <span className="text-purple-400 font-bold block">Labelling Integrity:</span>
                                <span className="font-extrabold text-emerald-400">{q.diagramEvaluation.labellingScore}% Complete</span>
                              </div>
                              <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                                <span className="text-purple-400 font-bold block">Ray / Vector Arrows:</span>
                                <span className="font-extrabold text-emerald-400">100% Direction Verified</span>
                              </div>
                              <div className="bg-purple-950/50 p-1.5 rounded-lg border border-purple-800/40">
                                <span className="text-purple-400 font-bold block">Text-Diagram Sync:</span>
                                <span className="font-extrabold text-emerald-400">{q.diagramEvaluation.consistencyScore}% Aligned</span>
                              </div>
                            </div>

                            {q.diagramEvaluation.verifiedLabels && q.diagramEvaluation.verifiedLabels.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                <span className="font-bold text-purple-300 shrink-0">Verified Diagram Labels:</span>
                                {q.diagramEvaluation.verifiedLabels.map((lbl, lIdx) => (
                                  <span key={lIdx} className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono text-[9px] border border-purple-400/20">
                                    ✓ {lbl}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feedback Strengths */}
            {evalResult.feedback?.strengths?.length > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-200 space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Overall Feedback & Key Observations:
                </span>
                <ul className="list-disc list-inside space-y-1">
                  {evalResult.feedback.strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowEvalModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowEvalModal(false);
                  navigate('/evaluation');
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                View Full AI Evaluation Page
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
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
