import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ScanText, Brain, Award, MessageSquareText, Download, Zap,
  ArrowRight, Sparkles, BookOpen, GraduationCap, CheckCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FeatureCard from '../components/FeatureCard';

const features = [
  {
    icon: <ScanText className="w-6 h-6" />,
    title: 'OCR Text Extraction',
    description: 'Advanced optical character recognition extracts handwritten and printed text from answer sheet images with high accuracy.',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'AI Evaluation',
    description: 'Powered by state-of-the-art language models, our AI understands context and semantics — not just keywords.',
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: 'Automatic Marks',
    description: 'Instantly receive accurate marks based on a weighted scoring system that considers multiple quality metrics.',
  },
  {
    icon: <MessageSquareText className="w-6 h-6" />,
    title: 'Detailed Feedback',
    description: 'Get categorized feedback with strengths, weaknesses, and actionable suggestions for improvement.',
  },
  {
    icon: <Download className="w-6 h-6" />,
    title: 'Download Report',
    description: 'Generate professional PDF evaluation reports with complete analytics, ready to share or archive.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Fast Processing',
    description: 'Lightning-fast evaluation pipeline — from image upload to detailed results in under 5 seconds.',
  },
];

const stats = [
  { value: '99%', label: 'OCR Accuracy' },
  { value: '< 5s', label: 'Processing Time' },
  { value: '6+', label: 'Quality Metrics' },
  { value: 'PDF', label: 'Report Export' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white overflow-hidden transition-colors duration-500">
      <Navbar />

      {/* ===== Hero Section ===== */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Dynamic Glowing Mesh Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 -right-20 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/20 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-40 -left-20 w-[500px] h-[500px] bg-indigo-500/20 dark:bg-indigo-600/20 rounded-full blur-[100px]" 
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Text content */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-blue-600 dark:text-blue-400 text-sm font-semibold mb-8"
              >
                <Sparkles className="w-4 h-4" />
                Next-Gen AI Evaluation Platform
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
                Automate Grading with <br />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  AI Precision
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-10">
                Instantly extract text from student answer sheets and evaluate them against model answers with semantic AI. Save hundreds of hours on grading.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                <Link
                  to="/dashboard"
                  className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative flex items-center gap-2">
                    Start Evaluating <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-500/50 transition-all duration-300 shadow-sm"
                >
                  See How It Works
                </a>
              </div>

              {/* Stats */}
              <div className="mt-14 pt-10 border-t border-slate-200/50 dark:border-slate-800/50 grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="text-center lg:text-left"
                  >
                    <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: Premium Glassmorphism Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.3, type: "spring" }}
              className="relative hidden lg:block perspective-[2000px]"
            >
              {/* Floating Element 1 */}
              <motion.div
                animate={{ y: [-15, 15, -15], rotateZ: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-8 -left-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-2xl shadow-blue-900/5 border border-white/50 dark:border-slate-600/50 z-20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Score: 8.5/10</p>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">92% Semantic Match</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating Element 2 */}
              <motion.div
                animate={{ y: [15, -15, 15], rotateZ: [2, -2, 2] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-8 -right-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-2xl shadow-indigo-900/5 border border-white/50 dark:border-slate-600/50 z-20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Brain className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">AI Evaluating...</p>
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Processing vectors</p>
                  </div>
                </div>
              </motion.div>

              {/* Main Dashboard Mockup Glass Panel */}
              <div className="relative bg-white/40 dark:bg-slate-800/40 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/60 dark:border-slate-700/50 shadow-2xl shadow-blue-500/10 rotate-y-[-10deg] transform-style-3d">
                
                {/* Mock Browser Header */}
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
                  <div className="ml-4 h-6 flex-1 bg-white/50 dark:bg-slate-900/50 rounded-full" />
                </div>

                <div className="space-y-6">
                  {/* Mock Upload Box */}
                  <div className="bg-white/70 dark:bg-slate-900/70 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Answer Sheet Extracted</span>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-full" />
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5" />
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-11/12" />
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
                    </div>
                  </div>

                  {/* Mock Progress Bars */}
                  <div className="bg-white/70 dark:bg-slate-900/70 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Evaluation Metrics</span>
                    </div>
                    <div className="space-y-5">
                      {[
                        { label: 'Keyword Match', val: 85, color: 'from-blue-400 to-blue-600' },
                        { label: 'Grammar', val: 92, color: 'from-emerald-400 to-emerald-600' },
                        { label: 'Completeness', val: 78, color: 'from-amber-400 to-orange-500' },
                      ].map((metric, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                            <span>{metric.label}</span>
                            <span>{metric.val}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${metric.val}%` }}
                              transition={{ duration: 1.5, delay: 1 + i * 0.2 }}
                              className={`h-full rounded-full bg-gradient-to-r ${metric.color}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== Features Section ===== */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-6">
              Powerful <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Features</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              A complete toolkit engineered for educators to evaluate papers with AI precision, unmatched speed, and perfect consistency.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== About / Trust Section ===== */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-blue-50/50 dark:bg-slate-900/50 border-y border-blue-100 dark:border-slate-800" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-8">
                Why Educators Trust Our{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  AI Platform
                </span>
              </h2>
              <div className="space-y-6">
                {[
                  'Deep semantic understanding over simple keyword matching.',
                  'Agnostic AI engine supporting Gemini, OpenAI, and Claude.',
                  'Auto-generates stunning PDF reports with analytics.',
                  'Privacy-first architecture ensures data stays secure.',
                  'Reduces average grading time per paper from 10m to <5s.',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="text-lg font-medium text-slate-700 dark:text-slate-300">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-6"
            >
                {[
                  { icon: <ScanText className="w-8 h-8" />, label: 'OCR Engine', desc: 'Flawless extraction', color: 'blue' },
                  { icon: <Brain className="w-8 h-8" />, label: 'AI Model', desc: 'Semantic reasoning', color: 'indigo' },
                  { icon: <Award className="w-8 h-8" />, label: 'Analytics', desc: 'Deep insights', color: 'purple' },
                  { icon: <Download className="w-8 h-8" />, label: 'Reports', desc: '1-click export', color: 'emerald' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 text-center shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700"
                  >
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-${item.color}-100 dark:bg-${item.color}-900/30 flex items-center justify-center text-${item.color}-600 dark:text-${item.color}-400 mb-5 shadow-inner`}>
                      {item.icon}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.label}</h4>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </motion.div>
                ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== Contact/CTA Section ===== */}
      <section id="contact" className="py-32 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded-[3rem] p-12 sm:p-20 shadow-2xl relative overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-6xl font-black text-white mb-6">
                Ready to Upgrade Your Grading?
              </h2>
              <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
                Join thousands of educators saving countless hours by letting AI handle the heavy lifting. Start evaluating for free today.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-xl font-bold text-indigo-700 bg-white hover:bg-slate-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Launch Dashboard
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
