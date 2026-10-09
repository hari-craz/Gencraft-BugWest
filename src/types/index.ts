export type Language = 'c' | 'python';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type QuestionStatus = 'not_visited' | 'visited' | 'answered' | 'submitted';

export type RoundStatus = 'locked' | 'ready' | 'active' | 'completed';

export type ParticipantStatus = 'Not Started' | 'Active' | 'Completed' | 'Disconnected';

export type RoundLeaderboardFilter = 'overall' | 1;

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden?: boolean;
  buggyOutput?: string;
}

export interface Question {
  id: string;
  round: 1 | 2 | 3;
  language: Language;
  title: string;
  description: string;
  bugDescription: string;
  buggyCode: string;
  correctSolution: string;
  expectedOutput: string;
  marks: number;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  visibleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  isPublished: boolean;
  author?: string;
  topics?: string[];
}

export interface TestCaseResult {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  isHidden: boolean;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  testCaseResults: TestCaseResult[];
  passedTests: number;
  totalTests: number;
  marksEarned: number;
  maxMarks: number;
}

export interface Submission {
  id: string;
  participantId: string;
  participantName: string;
  questionId: string;
  questionTitle: string;
  round: 1 | 2 | 3;
  language: Language;
  submittedCode: string;
  result: 'Passed' | 'Partial' | 'Failed';
  marksEarned: number;
  maxMarks: number;
  testsPassed: number;
  totalTests: number;
  timestamp: string;
  executionTimeMs: number;
  testResults: TestCaseResult[];
}

export interface User {
  id: string;
  userId: string;
  name: string;
  teamName?: string;
  role: 'participant' | 'organizer';
  college?: string;
  avatar?: string;
  accessCode?: string;
  authenticatedRound?: 1 | 2 | 3;
}

export interface ParticipantSession {
  userId: string;
  name: string;
  teamName: string;
  college: string;
  accessCode: string;
  currentRound: 1 | 2 | 3;
  status: ParticipantStatus;
  currentQuestionId?: string;
  totalScore: number;
  roundScores: {
    1: number;
    2: number;
    3: number;
  };
  roundCompleted: {
    1: boolean;
    2: boolean;
    3: boolean;
  };
  codeDrafts: Record<string, string>; // questionId -> code
  submissions: Record<string, Submission>; // questionId -> Submission
  visitedQuestions: string[];
  timeRemainingSeconds: Record<number, number>; // round -> seconds
  lastActive: string;
  sessionExpiresAt?: number;
}

export interface RoundConfig {
  roundId: 1 | 2 | 3;
  title: string;
  subtitle: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  status: RoundStatus;
  allowedLanguage: 'all' | 'c' | 'python';
  joinCode?: string;
  bugfestCode?: string;
  bugfestCodeGeneratedAt?: string;
  startTime?: string;
  endTime?: string;
}

export interface LeaderboardEntry {
  rank: number;
  participantName: string;
  teamName?: string;
  userId: string;
  accessCode?: string;
  college: string;
  
  // Round 1 and cumulative metrics
  round1Score: number;
  round2Score: number; // Preserving historical
  round3Score: number; // Preserving historical
  totalScore: number;
  accuracy: number; // Overall accuracy
  questionsSolved: number;
  
  round1QuestionsSolved: number;
  round1Accuracy: number;
  
  // Fastest valid submission time for each of the 7 questions
  q1Time?: string;
  q2Time?: string;
  q3Time?: string;
  q4Time?: string;
  q5Time?: string;
  q6Time?: string;
  q7Time?: string;
  
  totalTimeRound1Ms: number;
  
  roundQuestionsSolved?: number;
  roundScoreForFilter?: number;
  status: ParticipantStatus;
  lastActive: string;
}

export interface LiveScoreboardEntry {
  rank: number;
  teamName: string;
  score: number;
  isCurrentTeam?: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: 'CODE_GENERATION' | 'CODE_REGENERATION' | 'ROUND_ACTIVATION' | 'ROUND_DEACTIVATION';
  timestamp: string;
  roundId: 1 | 2 | 3;
  details: string;
  performedBy: string;
}

export interface AccessCodeRecord {
  accessCode: string;
  userId: string;
  name: string;
  teamName?: string;
  college: string;
  createdAt: string;
  isUsed: boolean;
}
