import { Brain, Code2, Heart } from 'lucide-react';

/**
 * Footer component with copyright, links, and branding.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              AI Answer Sheet Evaluator
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors flex items-center gap-1"
              aria-label="GitHub"
            >
              <Code2 className="w-4 h-4" />
              GitHub
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1">
            © {currentYear} AI Evaluator. Made with <Heart className="w-3.5 h-3.5 text-red-400" /> All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
