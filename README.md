# AI Interview Platform

An intelligent full-stack interview application I built that combines React, TypeScript, and AI to conduct technical assessments with automated evaluation and comprehensive candidate tracking.

🔗 **[Live Demo](https://crisp-interview-assistant.netlify.app/)** | 📂 **[GitHub Repository](https://github.com/thanseerjelani/Crisp-Interview-Assistant-)**

## 🚀 What I Built

I developed this platform to streamline technical interviews through automation while maintaining personalized candidate experiences. The system handles everything from resume parsing to detailed performance analytics.

### For Candidates

- **Smart Resume Processing**: Upload PDF/DOCX resumes with automatic data extraction
- **Interactive Onboarding**: Conversational interface fills in any missing information
- **Adaptive Interviews**: 6 questions that scale in difficulty (Easy → Medium → Hard)
- **Time Management**: Built-in timers with auto-submission (20s/60s/120s based on difficulty)
- **Instant Feedback**: Real-time scoring with personalized improvement suggestions
- **Session Recovery**: Automatic save allows candidates to continue interrupted interviews

### For Interviewers

- **Centralized Dashboard**: Searchable, sortable candidate database
- **Deep Insights**: Full interview transcripts with question-by-question analysis
- **Visual Metrics**: Color-coded performance badges and percentage scoring
- **Quick Actions**: One-click access to candidate contact information

## 💡 Technical Approach

### Question Generation System

I implemented a three-tier fallback system to ensure reliability:

**Primary Layer: AI APIs**

- OpenAI and Gemini integration for dynamic questions
- Context-aware generation based on interview progress
- Smart deduplication to avoid repetition

**Secondary Layer: Curated Bank**

- Handcrafted questions covering React, Node.js, JavaScript, TypeScript
- Calibrated by difficulty with real-world scenarios
- Quality-assured baseline when APIs are unavailable

**Tertiary Layer: Selection Algorithm**

```typescript
// My implementation ensures variety and fairness
- Tracks asked questions to prevent duplicates
- Randomizes selection within difficulty tiers
- Graceful degradation across fallback layers
```

### Answer Evaluation Engine

I designed a multi-dimensional scoring system:

**Scoring Components**:

- **Substance (40%)**: Answer depth and structure
- **Technical Precision (30%)**: Domain terminology usage
- **Practical Knowledge (30%)**: Code examples and implementation details

**Dynamic Weighting**:

```
Score adjusts based on question difficulty
Hard questions reward thoroughness
Easy questions penalize incompleteness
```

### State Architecture

I chose Redux Toolkit with persistence for:

- Type-safe, predictable state updates
- Automatic localStorage synchronization
- Optimistic UI updates with rollback capability
- Chrome DevTools integration for debugging

## 🛠️ Tech Stack

**Frontend Framework**

- React 18 with TypeScript for type safety
- Vite for lightning-fast development
- Tailwind CSS + shadcn/ui for modern UI

**State Management**

- Redux Toolkit for global state
- Redux Persist for data persistence

**AI Integration**

- OpenAI GPT-3.5/4 (when available)
- Custom fallback evaluation system

**Document Processing**

- pdfjs-dist for PDF parsing
- mammoth for Word document handling

## ⚡ Getting Started

```bash
# Clone and navigate
git clone https://github.com/thanseerjelani/Crisp-Interview-Assistant-
cd Crisp-Interview-Assistant-

# Install dependencies
npm install

# Optional: Add your API key
echo "VITE_OPENAI_API_KEY=your-key" > .env

# Launch development server
npm run dev
```

Visit `http://localhost:5173` to see it in action.

## 🏗️ Architecture Decisions

### Why I Built Fallbacks

I designed the system to work perfectly without external APIs because:

- Demonstrates algorithmic thinking and evaluation logic
- Ensures 100% reliability regardless of API status
- Provides seamless integration point when APIs are available
- Showcases problem-solving approach to constraints

### Resume Parsing Pipeline

My extraction pipeline:

```typescript
File Upload → Format Detection (PDF/DOCX)
           ↓
     Text Extraction
           ↓
  Pattern Recognition (Email, Phone, Name)
           ↓
    Structured Data
```

**Smart Extraction**:

- RFC-compliant email validation
- International phone format support
- Multi-pattern name detection with validation

### Interview State Flow

```
START → UPLOAD → INFO_COLLECTION → INTERVIEW → COMPLETE
  ↓        ↓            ↓              ↓          ↓
 Idle   Parsing   Validation    Questions    Summary
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── interviewee/     # Candidate-facing features
│   └── interviewer/     # Dashboard components
├── store/
│   ├── types.ts         # TypeScript definitions
│   ├── slices/          # Redux state slices
│   └── index.ts         # Store configuration
├── services/
│   ├── openai.service.ts      # AI + fallbacks
│   └── resumeParser.service.ts # Document parsing
├── utils/
│   ├── validators.ts    # Input validation
│   └── helpers.ts       # Utility functions
└── pages/               # Route components
```

## 🧪 Testing Coverage

I manually tested:

- ✅ Both PDF and DOCX resume uploads
- ✅ Invalid file handling
- ✅ Data extraction accuracy
- ✅ Complete interview cycles
- ✅ Timer functionality and auto-submit
- ✅ Scoring algorithm correctness
- ✅ State persistence across refreshes
- ✅ Session recovery system
- ✅ Dashboard search and filtering
- ✅ Mobile responsiveness

## 🚀 Deployment

**Netlify**:

```bash
npm run build
netlify deploy --prod
```

**Vercel**:

```bash
vercel --prod
```

Configuration: Build command `npm run build`, output directory `dist`

## 🎯 Future Roadmap

Ideas I'm considering:

- Export functionality (CSV/PDF reports)
- Email notifications for interview completion
- Customizable interview templates
- Video recording integration
- Advanced analytics with charts
- Side-by-side candidate comparison
- Custom question bank editor

## 💻 Key Implementation Details

### Evaluation Algorithm

My fallback scoring uses weighted factors:

```typescript
finalScore = (
  baseScore(wordCount, structure) × 0.4 +
  technicalAccuracy(terminology) × 0.3 +
  practicalKnowledge(codeExamples) × 0.3
) × maxPossibleScore × difficultyMultiplier
```

### Performance Optimizations

- Component lazy loading for faster initial render
- React.memo for expensive re-renders
- Search input debouncing (300ms)
- Route-based code splitting
- Strategic Redux usage (shared state only)

## 📝 Development Philosophy

I built this with clean architecture principles:

- Type safety throughout with TypeScript
- Separation of concerns (presentational vs container)
- Error boundaries for graceful failure handling
- Reusable custom hooks for business logic
- Comprehensive inline documentation

## 📄 License

MIT License - feel free to use and modify

---

**Developed by Thanseer Jelani**

_Showcasing: Modern React patterns • TypeScript proficiency • State management • AI integration • System design_
