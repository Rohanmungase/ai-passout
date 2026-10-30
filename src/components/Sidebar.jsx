import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Brain,
  CheckSquare,
  BarChart3,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';

/**
 * Persistent sidebar for app-shell layout.
 * Collapsible on desktop, overlay drawer on mobile.
 */
const sidebarLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload', path: '/upload', icon: Upload },
  { name: 'OCR Result', path: '/ocr-result', icon: FileText },
  { name: 'ICR Dictionary', path: '/icr-dictionary', icon: BookOpen },
  { name: 'AI Evaluation', path: '/evaluation', icon: Brain },
  { name: 'OMR Evaluation', path: '/omr-evaluation', icon: CheckSquare },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { state, dispatch } = useAppContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const collapsed = state.sidebarCollapsed;

  const toggleCollapse = () => dispatch({ type: 'TOGGLE_SIDEBAR' });

  const SidebarContent = ({ isMobile = false }) => (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800
      ${ isMobile ? 'w-64' : collapsed ? 'w-[72px]' : 'w-64'} transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
        <AnimatePresence mode="wait">
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-white whitespace-nowrap">AI Evaluator</span>
            </motion.div>
          )}
        </AnimatePresence>
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <NavLink
              key={link.name + link.path}
              to={link.path}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:text-primary-light'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                }
                ${collapsed && !isMobile ? 'justify-center' : ''}
              `}
              title={collapsed && !isMobile ? link.name : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
              {(!collapsed || isMobile) && <span className="whitespace-nowrap">{link.name}</span>}
              {isActive && (!collapsed || isMobile) && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className={`p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2 ${collapsed && !isMobile ? 'items-center' : ''}`}>
        <button
          onClick={() => {
            dispatch({ type: 'LOGOUT' });
          }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full ${collapsed && !isMobile ? 'justify-center' : ''}`}
          title={collapsed && !isMobile ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>
        {(!collapsed || isMobile) && (
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">v1.0.0 • AI Evaluator</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-slate-800
          shadow-lg border border-gray-200 dark:border-slate-700 no-print"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-0 h-screen shrink-0 no-print">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 z-50 h-screen"
            >
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
