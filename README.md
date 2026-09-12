# AI Answer Sheet Evaluator

A premium SaaS-style web application that uses AI to evaluate student answer sheets. Upload a photo of an answer sheet, extract text via OCR, and get instant AI-powered evaluation with detailed marks, analytics, and feedback.

## Features

- **OCR Text Extraction**: Advanced optical character recognition from uploaded answer sheet images
- **AI Evaluation**: Semantic comparison of student answers against correct answers
- **Automatic Marks**: Weighted scoring system with multiple quality metrics
- **Detailed Feedback**: Categorized feedback — strengths, weaknesses, and suggestions
- **PDF Report Export**: Professional evaluation reports downloadable as PDF
- **Dark Mode**: Full dark theme support, persisted across sessions
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **React.js** (functional components + Hooks)
- **Tailwind CSS v4** with custom design tokens
- **Framer Motion** for animations and page transitions
- **lucide-react** for icons
- **React Router** for navigation
- **Context API** for global state management
- **jsPDF + html2canvas** for PDF generation

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
  components/      # Reusable UI components
    ├── Navbar.jsx          # Landing page navigation bar
    ├── Footer.jsx          # Landing page footer
    ├── Sidebar.jsx         # App-shell sidebar navigation
    ├── Toast.jsx           # Toast notification system
    ├── LoadingSkeleton.jsx  # Loading skeleton placeholders
    ├── UploadBox.jsx       # Drag-and-drop file upload
    ├── ProgressBar.jsx     # Animated linear progress bar
    ├── CircularProgress.jsx # Animated circular progress
    ├── AnalyticsCard.jsx   # Metric card with count-up animation
    ├── FeatureCard.jsx     # Feature card for home page
    └── FeedbackList.jsx    # Categorized feedback display

  pages/            # Route pages
    ├── Home.jsx            # Landing page with hero + features
    ├── Upload.jsx          # File upload + OCR trigger
    ├── OCRResult.jsx       # Extracted text editor
    ├── Evaluation.jsx      # AI evaluation with analytics
    ├── Reports.jsx         # PDF report card
    └── Settings.jsx        # Theme, AI model, OCR engine config

  hooks/            # Custom React hooks
    ├── useTheme.js         # Theme management
    ├── useToast.js         # Toast notifications
    └── useEvaluation.js    # OCR + evaluation flow

  context/          # Global state
    └── AppContext.jsx      # App-wide state with useReducer

  services/         # Mock API layer (swappable)
    ├── ocrService.js       # OCR text extraction
    └── aiEvaluationService.js  # AI evaluation

  utils/            # Helpers
    ├── formatters.js       # Number/text formatters
    ├── validators.js       # Form/file validators
    └── mockReportGenerator.js  # Report data generator
```

## Swapping Mock Services for Real APIs

### OCR Service (`src/services/ocrService.js`)

Replace the `extractText()` function with your real OCR API call:

```javascript
// Example: Using Tesseract.js
import Tesseract from 'tesseract.js';

export async function extractText(imageFile) {
  const result = await Tesseract.recognize(imageFile, 'eng');
  return {
    text: result.data.text,
    confidence: result.data.confidence / 100,
    wordCount: result.data.text.split(/\s+/).length,
    processingTime: Date.now() - startTime,
  };
}
```

### AI Evaluation Service (`src/services/aiEvaluationService.js`)

Replace the `evaluateAnswer()` function with your real AI API call:

```javascript
// Example: Using OpenAI API
export async function evaluateAnswer(correctAnswer, studentAnswer, maxMarks) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an answer evaluation assistant...' },
        { role: 'user', content: `Correct: ${correctAnswer}\nStudent: ${studentAnswer}\nMax Marks: ${maxMarks}` }
      ]
    })
  });
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

## License

MIT
