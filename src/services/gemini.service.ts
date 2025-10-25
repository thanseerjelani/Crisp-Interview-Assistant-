import { QuestionDifficulty } from '../store/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface EvaluationResult {
  score: number;
  judgement: string;
}

interface QuestionMetrics {
  wordCount: number;
  hasCodeExample: boolean;
  technicalTermCount: number;
  hasExplanation: boolean;
  complexity: number;
}

const QUESTION_BANK = {
  [QuestionDifficulty.EASY]: [
    'What is JSX in React and why is it useful?',
    'Explain the difference between let, const, and var in JavaScript.',
    'What are props in React components?',
    'What is the purpose of the useState hook?',
    'How do you handle events in React?',
    'What is the virtual DOM in React?',
    'What is the difference between == and === in JavaScript?',
    'Explain what arrow functions are and their benefits.',
  ],
  [QuestionDifficulty.MEDIUM]: [
    'Explain how the useEffect hook works in React and its dependency array.',
    'What is the difference between controlled and uncontrolled components?',
    'How does async/await work in JavaScript?',
    'Explain React Context API and when you would use it.',
    'What are Higher Order Components (HOCs) in React?',
    'How would you optimize a React component that re-renders too often?',
    'Explain closure in JavaScript with a practical example.',
    'What is the difference between REST and GraphQL APIs?',
  ],
  [QuestionDifficulty.HARD]: [
    'How would you optimize performance in a large React application?',
    'Explain the concept of reconciliation in React and how keys work.',
    'Design a scalable folder structure for a large React/Node.js application.',
    'How would you implement server-side rendering with React?',
    'Explain memory leaks in JavaScript and how to prevent them.',
    'Design a caching strategy for a REST API with Redis.',
    'How would you implement authentication using JWT in a Node.js application?',
    'Explain the Event Loop in Node.js and how it handles asynchronous operations.',
  ],
};

const TECHNICAL_TERMS = [
  'component', 'hook', 'state', 'props', 'render', 'virtual dom',
  'async', 'await', 'promise', 'callback', 'closure', 'scope',
  'api', 'rest', 'graphql', 'middleware', 'authentication',
  'optimization', 'performance', 'memoization', 'lazy loading',
  'reconciliation', 'redux', 'context', 'useeffect', 'usestate',
  'jsx', 'typescript', 'node.js', 'express', 'mongodb', 'sql',
  'jwt', 'token', 'cache', 'redis', 'websocket', 'ssr', 'csr',
];

// Helper to delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class GeminiService {
  
  private static async callGeminiAPI(prompt: string, retries = 3): Promise<string> {
    if (!API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Add delay between retries to avoid rate limiting
        if (attempt > 0) {
          await delay(2000 * attempt); // 2s, 4s delays
        }

        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 200,
            }
          })
        });

        if (!response.ok) {
          // If 503 or 429, retry
          if ((response.status === 503 || response.status === 429) && attempt < retries - 1) {
            console.warn(`API returned ${response.status}, retrying... (${attempt + 1}/${retries})`);
            continue;
          }
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid response from Gemini API');
        }

        return data.candidates[0].content.parts[0].text.trim();
      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        console.warn(`Attempt ${attempt + 1} failed, retrying...`);
      }
    }

    throw new Error('Max retries reached');
  }

  static async generateQuestion(
    difficulty: QuestionDifficulty,
    previousQuestions: string[]
  ): Promise<string> {
    if (!API_KEY) {
      return this.getFallbackQuestion(difficulty, previousQuestions);
    }

    try {
      const difficultyContext = {
        [QuestionDifficulty.EASY]: 'basic concepts like variables, functions, simple syntax',
        [QuestionDifficulty.MEDIUM]: 'intermediate topics like APIs, state management, async operations',
        [QuestionDifficulty.HARD]: 'advanced concepts like optimization, architecture, design patterns',
      };

      const prompt = `Generate ONE short ${difficulty} interview question for Full Stack Developer (React/Node.js).

Topic: ${difficultyContext[difficulty]}
${previousQuestions.length > 0 ? `Avoid: ${previousQuestions.slice(0, 3).join('; ')}` : ''}

Requirements:
- Maximum 15 words
- Clear and specific
- One question only
- No explanations

Return ONLY the question.`;

      let question = await this.callGeminiAPI(prompt);

      // Clean up the response
      question = question
        .replace(/^(Question:|Answer:|Here's a question:|Here is a question:)/i, '')
        .replace(/\n+/g, ' ')
        .replace(/^["']|["']$/g, '') // Remove quotes
        .trim();

      // If too long, truncate at sensible point
      if (question.split(' ').length > 20) {
        const words = question.split(' ');
        question = words.slice(0, 15).join(' ') + '?';
      }

      if (question && !question.endsWith('?')) {
        question += '?';
      }

      return question || this.getFallbackQuestion(difficulty, previousQuestions);
    } catch (error) {
      console.error('API error, using fallback:', error);
      return this.getFallbackQuestion(difficulty, previousQuestions);
    }
  }

  static async evaluateAnswer(
    question: string,
    answer: string,
    difficulty: QuestionDifficulty
  ): Promise<EvaluationResult> {
    const maxScore = {
      [QuestionDifficulty.EASY]: 10,
      [QuestionDifficulty.MEDIUM]: 20,
      [QuestionDifficulty.HARD]: 30,
    };

    // If no API key or answer is too short, use fallback
    if (!API_KEY || answer.trim().length < 10) {
      return this.getIntelligentEvaluation(answer, difficulty);
    }

    try {
      // Add small delay before evaluation to avoid rate limits
      await delay(1000);

      const prompt = `Evaluate this ${difficulty} interview answer.

Q: ${question}
A: ${answer}

Format:
SCORE: [0-${maxScore[difficulty]}]
FEEDBACK: [2 short sentences]`;

      const text = await this.callGeminiAPI(prompt);

      const scoreMatch = text.match(/SCORE[:\s]+(\d+)/i);
      const feedbackMatch = text.match(/FEEDBACK[:\s]+(.+)/is);

      let score = 0;
      if (scoreMatch) {
        score = Math.min(parseInt(scoreMatch[1]), maxScore[difficulty]);
      } else {
        return this.getIntelligentEvaluation(answer, difficulty);
      }

      let judgement = feedbackMatch 
        ? feedbackMatch[1].trim().substring(0, 250)
        : 'Your answer shows understanding. Consider providing more specific examples and technical details.';

      judgement = judgement
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return { score, judgement };
    } catch (error) {
      console.error('API error, using intelligent evaluation:', error);
      return this.getIntelligentEvaluation(answer, difficulty);
    }
  }

  static async generateFinalSummary(
    candidateName: string,
    questions: Array<{ 
      question: string; 
      answer: string; 
      score: number; 
      difficulty: QuestionDifficulty 
    }>,
    totalScore: number
  ): Promise<string> {
    const percentage = Math.round((totalScore / 120) * 100);

    if (!API_KEY) {
      return this.getIntelligentSummary(candidateName, questions, totalScore, percentage);
    }

    try {
      // Add delay before summary to avoid rate limits
      await delay(1500);

      const prompt = `Professional interview summary for ${candidateName}.

Score: ${totalScore}/120 (${percentage}%)
Performance: ${questions.map((q, i) => `Q${i+1}(${q.difficulty}): ${q.score}`).join(', ')}

Write 3 sentences covering:
1. Performance level
2. Key strength
3. Recommendation (Strong Yes/Yes/Maybe/No)`;

      let summary = await this.callGeminiAPI(prompt);

      summary = summary
        .replace(/^(Summary:|Here's a summary:|Interview Summary:)/i, '')
        .trim();

      return summary || this.getIntelligentSummary(candidateName, questions, totalScore, percentage);
    } catch (error) {
      console.error('API error, using intelligent summary:', error);
      return this.getIntelligentSummary(candidateName, questions, totalScore, percentage);
    }
  }

  static async chatResponse(_message: string, context: string): Promise<string> {
    const responses = {
      name: "Thank you! I've recorded your name.",
      email: "Great! Your email has been saved.",
      phone: "Perfect! Your phone number is recorded.",
    };
    
    for (const [key, response] of Object.entries(responses)) {
      if (context.includes(key)) return response;
    }
    
    return "Thank you for your response!";
  }

  private static getFallbackQuestion(
    difficulty: QuestionDifficulty, 
    previousQuestions: string[]
  ): string {
    const questions = QUESTION_BANK[difficulty];
    const availableQuestions = questions.filter(q => !previousQuestions.includes(q));
    
    const pool = availableQuestions.length > 0 ? availableQuestions : questions;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private static analyzeAnswer(answer: string): QuestionMetrics {
    const words = answer.trim().split(/\s+/);
    const wordCount = words.length;
    
    const codePatterns = [
      /```[\s\S]*?```/g,
      /`[^`]+`/g,
      /\b(function|const|let|var|if|else|return|import|export)\b/g,
      /[{}[\]();]/g,
      /=>/g,
    ];
    const hasCodeExample = codePatterns.some(pattern => pattern.test(answer));
    
    const lowerAnswer = answer.toLowerCase();
    const technicalTermCount = TECHNICAL_TERMS.filter(term => 
      lowerAnswer.includes(term)
    ).length;
    
    const explanationPatterns = [
      /\b(because|since|due to|reason|allows|enables|helps)\b/i,
      /\b(for example|such as|like|including)\b/i,
      /\b(first|second|then|finally|additionally)\b/i,
    ];
    const hasExplanation = explanationPatterns.some(pattern => pattern.test(answer));
    
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const avgSentenceLength = sentences.length > 0 
      ? words.length / sentences.length 
      : 0;
    
    const complexity = Math.min(
      (avgSentenceLength / 15) + 
      (technicalTermCount * 0.1) + 
      (hasCodeExample ? 0.3 : 0),
      1.0
    );

    return {
      wordCount,
      hasCodeExample,
      technicalTermCount,
      hasExplanation,
      complexity,
    };
  }

  private static getIntelligentEvaluation(
    answer: string,
    difficulty: QuestionDifficulty
  ): EvaluationResult {
    const maxScore = {
      [QuestionDifficulty.EASY]: 10,
      [QuestionDifficulty.MEDIUM]: 20,
      [QuestionDifficulty.HARD]: 30,
    };

    const metrics = this.analyzeAnswer(answer);
    
    let baseScore = 0;
    if (metrics.wordCount < 10) baseScore = 0.2;
    else if (metrics.wordCount < 25) baseScore = 0.4;
    else if (metrics.wordCount < 50) baseScore = 0.6;
    else if (metrics.wordCount < 100) baseScore = 0.75;
    else baseScore = 0.85;
    
    const technicalBonus = Math.min(metrics.technicalTermCount * 0.05, 0.2);
    const codeBonus = metrics.hasCodeExample ? 0.15 : 0;
    const explanationBonus = metrics.hasExplanation ? 0.1 : 0;
    const complexityBonus = metrics.complexity * 0.1;
    
    let finalScore = baseScore + technicalBonus + codeBonus + explanationBonus + complexityBonus;
    
    const difficultyMultiplier = {
      [QuestionDifficulty.EASY]: 0.9,
      [QuestionDifficulty.MEDIUM]: 0.85,
      [QuestionDifficulty.HARD]: 0.8,
    };
    finalScore *= difficultyMultiplier[difficulty];
    
    finalScore = Math.min(Math.max(finalScore, 0.15), 0.95);
    
    const score = Math.round(maxScore[difficulty] * finalScore);
    
    const feedbackParts = [];
    
    if (metrics.wordCount < 25) {
      feedbackParts.push('Consider providing more detailed explanations');
    } else if (metrics.wordCount > 100) {
      feedbackParts.push('Comprehensive answer with good depth');
    } else {
      feedbackParts.push('Good level of detail in your explanation');
    }
    
    if (metrics.hasCodeExample) {
      feedbackParts.push('excellent use of code examples to illustrate concepts');
    } else if (difficulty !== QuestionDifficulty.EASY) {
      feedbackParts.push('adding code examples would strengthen your answer');
    }
    
    if (metrics.technicalTermCount >= 3) {
      feedbackParts.push('strong technical vocabulary demonstrated');
    } else if (metrics.technicalTermCount === 0) {
      feedbackParts.push('include more technical terminology to show depth of knowledge');
    }
    
    if (metrics.hasExplanation) {
      feedbackParts.push('clear reasoning and structure');
    }
    
    const judgement = feedbackParts.slice(0, 2).join(', ') + '.';

    return { 
      score, 
      judgement: judgement.charAt(0).toUpperCase() + judgement.slice(1)
    };
  }

  private static getIntelligentSummary(
    candidateName: string,
    questions: Array<{ 
      question: string;
      answer: string;
      score: number; 
      difficulty: QuestionDifficulty 
    }>,
    totalScore: number,
    percentage: number
  ): string {
    const performanceByDifficulty = {
      [QuestionDifficulty.EASY]: { scores: [] as number[], max: 10 },
      [QuestionDifficulty.MEDIUM]: { scores: [] as number[], max: 20 },
      [QuestionDifficulty.HARD]: { scores: [] as number[], max: 30 },
    };
    
    questions.forEach(q => {
      performanceByDifficulty[q.difficulty].scores.push(q.score);
    });
    
    const getAverage = (scores: number[], max: number) => 
      scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / max) * 100) : 0;
    
    const easyPerf = getAverage(
      performanceByDifficulty[QuestionDifficulty.EASY].scores, 
      performanceByDifficulty[QuestionDifficulty.EASY].max
    );
    const mediumPerf = getAverage(
      performanceByDifficulty[QuestionDifficulty.MEDIUM].scores,
      performanceByDifficulty[QuestionDifficulty.MEDIUM].max
    );
    const hardPerf = getAverage(
      performanceByDifficulty[QuestionDifficulty.HARD].scores,
      performanceByDifficulty[QuestionDifficulty.HARD].max
    );
    
    const strengths = [];
    const weaknesses = [];
    
    if (easyPerf >= 70) strengths.push('fundamental concepts');
    else if (easyPerf < 50) weaknesses.push('basic fundamentals');
    
    if (mediumPerf >= 70) strengths.push('intermediate problem-solving');
    else if (mediumPerf < 50) weaknesses.push('intermediate topics');
    
    if (hardPerf >= 70) strengths.push('advanced architecture and optimization');
    else if (hardPerf < 50) weaknesses.push('complex system design');
    
    const answerMetrics = questions.map(q => this.analyzeAnswer(q.answer));
    const avgTechnicalTerms = answerMetrics.reduce((sum, m) => sum + m.technicalTermCount, 0) / answerMetrics.length;
    const codeExampleCount = answerMetrics.filter(m => m.hasCodeExample).length;
    
    if (avgTechnicalTerms >= 3) strengths.push('strong technical vocabulary');
    if (codeExampleCount >= 3) strengths.push('practical code examples');
    
    let performanceDesc = '';
    if (percentage >= 85) performanceDesc = 'exceptional performance';
    else if (percentage >= 75) performanceDesc = 'strong performance';
    else if (percentage >= 65) performanceDesc = 'solid performance';
    else if (percentage >= 50) performanceDesc = 'adequate performance';
    else performanceDesc = 'developing performance';
    
    let recommendation = '';
    if (percentage >= 85) recommendation = 'Strong Yes - Outstanding candidate with deep technical knowledge';
    else if (percentage >= 75) recommendation = 'Yes - Solid hire with good technical foundation';
    else if (percentage >= 60) recommendation = 'Maybe - Shows potential, needs development in specific areas';
    else recommendation = 'No - Requires significant additional experience';
    
    const strengthsText = strengths.length > 0 
      ? `Demonstrated ${strengths.slice(0, 2).join(' and ')}.`
      : 'Shows baseline technical awareness.';
    
    const weaknessText = weaknesses.length > 0
      ? ` Needs improvement in ${weaknesses[0]}.`
      : '';
    
    return `${candidateName} achieved ${totalScore}/120 (${percentage}%), demonstrating ${performanceDesc}. ${strengthsText}${weaknessText} Recommendation: ${recommendation}`;
  }
}