import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Home from './pages/Home';
import Upload from './pages/Upload';
import OCRResult from './pages/OCRResult';
import Evaluation from './pages/Evaluation';
import OMREvaluation from './pages/OMREvaluation';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ICRDictionary from './pages/ICRDictionary';
import { useAppContext } from './context/AppContext';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component to restrict access to logged-in users.
 */
function ProtectedRoute({ children }) {
  const { state } = useAppContext();
  
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

/**
 * AnimatedRoutes — wraps routes with Framer Motion AnimatePresence
 * for smooth page transitions.
 */
function AnimatedRoutes() {
  const location = useLocation();

  // Home page uses full-width layout (no sidebar)
  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login';

  if (isLandingPage || isAuthPage) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </AnimatePresence>
    );
  }

  // App pages use sidebar layout
  return (
    <div className="flex min-h-screen bg-background dark:bg-[#0F172A]">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/ocr-result" element={<ProtectedRoute><OCRResult /></ProtectedRoute>} />
            <Route path="/icr-dictionary" element={<ProtectedRoute><ICRDictionary /></ProtectedRoute>} />
            <Route path="/icr dictionary" element={<Navigate to="/icr-dictionary" replace />} />
            <Route path="/icr%20dictionary" element={<Navigate to="/icr-dictionary" replace />} />
            <Route path="/icrdictionary" element={<Navigate to="/icr-dictionary" replace />} />
            <Route path="/evaluation" element={<ProtectedRoute><Evaluation /></ProtectedRoute>} />
            <Route path="/omr-evaluation" element={<ProtectedRoute><OMREvaluation /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

        </AnimatePresence>
      </main>
    </div>
  );
}

/**
 * App — root component.
 * Wraps everything in providers: ErrorBoundary + BrowserRouter + AppContext.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <Toast />
          <AnimatedRoutes />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
