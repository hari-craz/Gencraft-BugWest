import React, { useState, useEffect } from 'react';
import { 
  Question, 
  RoundConfig, 
  Submission, 
  ExecutionResult,
  ParticipantSession,
  LiveScoreboardEntry
} from '../../types';
import { ExecutionService } from '../../services/executionService';
import { competitionStore } from '../../store/competitionStore';
import { QuestionNavigation } from './QuestionNavigation';
import { RoundTimer } from './RoundTimer';
import { 
  Play, 
  RotateCcw, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Code2, 
  FileText, 
  Terminal as TerminalIcon,
  HelpCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Zap,
  Radio,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface CodeEditorArenaProps {
  round: RoundConfig;
  questions: Question[];
  session: ParticipantSession;
  onSaveDraft: (questionId: string, code: string) => void;
  onSubmitQuestion: (submission: Submission) => void;
  onCompleteRound: () => void;
  onBackToDashboard: () => void;
}

export const CodeEditorArena: React.FC<CodeEditorArenaProps> = ({
  round,
  questions,
  session,
  onSaveDraft,
  onSubmitQuestion,
  onCompleteRound,
  onBackToDashboard
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentQuestion = questions[currentIdx] || questions[0];

  const teamName = session.teamName || session.name;

  // Active code state
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'editor' | 'results' | 'scoreboard'>('editor');
  const [showSubmitRoundConfirm, setShowSubmitRoundConfirm] = useState(false);

  // Live Scoreboard state from competition store
  const [scoreboard, setScoreboard] = useState<LiveScoreboardEntry[]>(() =>
    competitionStore.getLiveScoreboard(teamName)
  );

  // Subscribe to live scoreboard updates
  useEffect(() => {
    const updateBoard = () => {
      setScoreboard(competitionStore.getLiveScoreboard(teamName));
    };
    updateBoard();
    return competitionStore.subscribe(updateBoard);
  }, [teamName]);

  // Sync code ONLY on question change (NOT on every 2-second background session poll)
  useEffect(() => {
    if (!currentQuestion) return;
    const existingDraft = session?.codeDrafts?.[currentQuestion.id];
    const existingSubmission = session?.submissions?.[currentQuestion.id];

    if (existingSubmission && (existingSubmission.submittedCode || (existingSubmission as any).code)) {
      setCode(existingSubmission.submittedCode || (existingSubmission as any).code || '');
    } else if (existingDraft !== undefined && existingDraft !== null) {
      setCode(existingDraft);
    } else {
      setCode(currentQuestion.buggyCode || '');
    }

    setExecResult(null);
    setSubmissionFeedback(null);
  }, [currentQuestion?.id]);

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Questions in This Round</h2>
        <p className="text-slate-500 text-sm mb-4">
          The organizer has not yet published questions for Round {round.roundId}.
        </p>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const existingSubmission = session?.submissions?.[currentQuestion?.id];
  const isQuestionSubmitted = !!existingSubmission;

  // Handle code change with draft persistence
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    onSaveDraft(currentQuestion.id, val);
  };

  // Keyboard tab indentation handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '    ';
      const newCode = code.substring(0, start) + spaces + code.substring(end);
      setCode(newCode);
      onSaveDraft(currentQuestion.id, newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Reset to original buggy starter code
  const handleResetCode = () => {
    if (window.confirm('Reset this question back to the original starter buggy code?')) {
      setCode(currentQuestion.buggyCode || '');
      onSaveDraft(currentQuestion.id, currentQuestion.buggyCode || '');
      setExecResult(null);
      setSubmissionFeedback(null);
    }
  };

  // Run Code (Visible Tests Only)
  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      const result = ExecutionService.runVisibleTests(currentQuestion, code);
      setExecResult(result);
      setIsRunning(false);
      setSubmissionFeedback(result.success ? 'All visible tests passed!' : 'Some tests failed. Check diagnostic output below.');
      if (window.innerWidth < 1024) setMobileTab('results');
    }, 180);
  };

  // Submit Solution (Graded against visible + hidden tests)
  const handleSubmitCode = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const result = ExecutionService.evaluateFullSubmission(currentQuestion, code);
      setExecResult(result);

      // Create submission record
      const sub: Submission = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        participantId: session.userId,
        participantName: teamName,
        questionId: currentQuestion.id,
        questionTitle: currentQuestion.title,
        round: round.roundId,
        language: currentQuestion.language,
        submittedCode: code,
        result: result.success ? 'Passed' : result.marksEarned > 0 ? 'Partial' : 'Failed',
        marksEarned: result.marksEarned,
        maxMarks: currentQuestion.marks,
        testsPassed: result.passedTests,
        totalTests: result.totalTests,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executionTimeMs: result.executionTimeMs,
        testResults: result.testCaseResults
      };

      onSubmitQuestion(sub);
      setIsSubmitting(false);

      if (currentIdx < questions.length - 1) {
        setSubmissionFeedback(`Submitted! Opening Question ${currentIdx + 2}...`);
        setTimeout(() => {
          setCurrentIdx(currentIdx + 1);
          setSubmissionFeedback(null);
          setExecResult(null);
        }, 500);
      } else {
        setSubmissionFeedback(`Final Question Submitted! Scored ${result.marksEarned} / ${currentQuestion.marks}. Click 'Complete Round' when ready.`);
      }

      if (window.innerWidth < 1024) setMobileTab('results');
    }, 250);
  };

  // Line numbers
  const lineCount = Math.max((code || '').split('\n').length, 12);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Participant Score calculations
  const solvedCount = Object.values(session?.submissions || {}).filter(
    (s) => s.round === round?.roundId && s.result === 'Passed'
  ).length;

  const currentQuestionScore = existingSubmission
    ? (existingSubmission.marksEarned ?? (existingSubmission as any).pointsEarned ?? 0)
    : execResult
    ? execResult.marksEarned
    : 0;

  const currentQuestionTestsPassed = existingSubmission
    ? (existingSubmission.testsPassed ?? (existingSubmission as any).passCount ?? 0)
    : execResult
    ? execResult.passedTests
    : 0;

  const currentQuestionTotalTests = existingSubmission
    ? (existingSubmission.totalTests ?? (existingSubmission as any).totalCount ?? 0)
    : execResult
    ? execResult.totalTests
    : (currentQuestion?.visibleTestCases?.length || 0);

  const currentRoundScore = session?.roundScores?.[round?.roundId] || 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-100/90 text-slate-900 pb-8">
      
      {/* ==================================================== */}
      {/* TOP ARENA BAR: YOU ARE COMPETING LIVE */}
      {/* ==================================================== */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-30 shadow-md">
        
        {/* Left: Live Indicator & Round Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Return to Instructions"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Instructions</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/90 border border-red-500/50 text-red-400 text-xs font-bold tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>YOU ARE COMPETING LIVE</span>
            </span>

            <span className="text-xs font-mono font-bold text-slate-300 hidden md:inline">
              {round.title} · {round.subtitle}
            </span>
          </div>
        </div>

        {/* Center: Team Name */}
        <div className="text-xs font-mono hidden lg:flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-md border border-slate-700/60">
          <span className="text-slate-400 font-sans">Team:</span>
          <strong className="text-white font-bold">{teamName}</strong>
        </div>

        {/* Right: Timer & Finish Round */}
        <div className="flex items-center gap-3">
          <RoundTimer
            initialSeconds={round.durationMinutes * 60}
            endTime={round.endTime}
            onTimeExpired={onCompleteRound}
          />

          <button
            onClick={() => setShowSubmitRoundConfirm(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          >
            Complete Round
          </button>
        </div>

      </div>

      {/* Question Palette Navigation (1 2 3 ... 20) */}
      <QuestionNavigation
        questions={questions}
        currentQuestionIndex={currentIdx}
        onSelectQuestion={(idx) => setCurrentIdx(idx)}
        visitedQuestions={session.visitedQuestions}
        codeDrafts={session.codeDrafts}
        submissions={session.submissions}
      />

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-slate-200 bg-white shadow-2xs">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
            mobileTab === 'editor' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          Editor & Problem
        </button>
        <button
          onClick={() => setMobileTab('results')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
            mobileTab === 'results' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          Test Results & Scorecard
        </button>
        <button
          onClick={() => setMobileTab('scoreboard')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
            mobileTab === 'scoreboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
          }`}
        >
          Live Scoreboard ({scoreboard.length})
        </button>
      </div>

      {/* ==================================================== */}
      {/* MAIN ARENA WORKSPACE: SCREEN-FITTED GRID */}
      {/* ==================================================== */}
      <div className="max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ==================================================== */}
        {/* LEFT / MAIN AREA: QUESTION + CODE EDITOR (7 COLS) */}
        {/* ==================================================== */}
        <div 
          className={`lg:col-span-7 flex flex-col gap-3.5 ${
            mobileTab !== 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Problem Statement Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-blue-600 font-mono uppercase tracking-wider block">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {currentQuestion.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold font-mono rounded">
                  {currentQuestion.marks} Marks
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-mono font-bold uppercase rounded border border-blue-200">
                  {currentQuestion.language}
                </span>
              </div>
            </div>
          </div>

          {/* Monaco-Style Dark Code Editor Box */}
          <div className="flex flex-col bg-[#0D1117] rounded-xl border border-slate-800 shadow-md overflow-hidden">
            {/* Editor Top Bar */}
            <div className="bg-[#161B22] border-b border-slate-800 px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
                <span className="text-xs font-mono font-semibold text-slate-300 ml-1.5">
                  solution.{currentQuestion.language === 'c' ? 'c' : 'py'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  (GCC 13+ / Python 3.12)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetCode}
                  title="Reset to starter buggy code"
                  className="px-2 py-0.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Code</span>
                </button>
              </div>
            </div>

            {/* Editor Textarea with Line Numbers (Comfortable Height Fit) */}
            <div className="flex font-mono text-xs overflow-hidden relative min-h-[260px] max-h-[360px]">
              {/* Line Numbers Column */}
              <div className="w-10 bg-[#0D1117] select-none text-slate-600 text-right pr-2.5 pt-3 font-mono border-r border-slate-800/80 leading-5 text-[11px]">
                {lineNumbers.map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>

              {/* Code Textarea */}
              <textarea
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                className="flex-1 bg-transparent text-slate-100 p-3 leading-5 resize-none focus:outline-none selection:bg-blue-600/50 font-mono text-xs overflow-auto dark-scroll"
                style={{ tabSize: 4 }}
                placeholder="// Enter your debugged code solution here..."
              />
            </div>

            {/* Action Bar (Run / Reset / Submit) */}
            <div className="bg-[#161B22] border-t border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => {
                    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
                  }}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-25 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <button
                  disabled={currentIdx >= questions.length - 1}
                  onClick={() => {
                    if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
                  }}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-25 flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {submissionFeedback && (
                <span className="text-[11px] font-mono text-slate-300 truncate max-w-[200px] hidden md:inline">
                  {submissionFeedback}
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                  <span>{isRunning ? 'Running...' : 'RUN'}</span>
                </button>

                <button
                  onClick={handleSubmitCode}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Grading...' : 'SUBMIT'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT SIDE AREA: STATUS + TEST RESULTS + SCOREBOARD */}
        {/* ==================================================== */}
        <div 
          className={`lg:col-span-5 flex flex-col gap-3.5 ${
            mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          
          {/* ---------------------------------------------------- */}
          {/* CARD 1: CURRENT PARTICIPANT SCORE & ROUND PROGRESS */}
          {/* ---------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
              YOUR COMPETITION STATUS
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-blue-700 block mb-0.5">
                  YOUR SCORE
                </span>
                <div className="text-xl font-black font-mono text-blue-900">
                  {session.totalScore}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">
                  CURRENT ROUND
                </span>
                <div className="text-sm font-bold font-mono text-slate-900">
                  ROUND {round.roundId}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">
                  SOLVED
                </span>
                <div className="text-sm font-bold font-mono text-slate-900">
                  {solvedCount} <span className="text-[11px] text-slate-400 font-normal">/ {questions.length}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">
                  CURRENT Q
                </span>
                <div className="text-sm font-bold font-mono text-slate-900">
                  #{currentIdx + 1}
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* CARD 2: TEST CASE RESULTS & QUESTION SCORECARD */}
          {/* ---------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <TerminalIcon className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  TEST CASE RESULTS
                </span>
              </div>

              {execResult && (
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  execResult.success
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {execResult.success ? '✓ PASSED' : '✕ INCOMPLETE'}
                </span>
              )}
            </div>

            {/* Test Case Breakdown */}
            {isRunning ? (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-blue-700 mb-3 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Executing code and verifying test cases...
              </div>
            ) : execResult ? (
              <div className="space-y-2 mb-3 max-h-56 overflow-y-auto pr-1">
                {execResult.testCaseResults.map((tc, idx) => (
                  <div
                    key={tc.id || idx}
                    className={`p-2.5 rounded-lg border text-xs ${
                      tc.passed
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-red-50/50 border-red-200 text-red-950'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {tc.passed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 font-bold" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-600 shrink-0 font-bold" />
                        )}
                        <span>Test Case {idx + 1}</span>
                      </div>
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        tc.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tc.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] mt-1 pt-1 border-t border-slate-200/60">
                      <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">Expected:</span>
                        <div className="text-slate-800 whitespace-pre-wrap truncate">{tc.expectedOutput || '(none)'}</div>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">Actual Output:</span>
                        <div className={`whitespace-pre-wrap truncate font-semibold ${tc.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                          {tc.actualOutput || (tc.error ? 'Runtime Error' : '(no output)')}
                        </div>
                      </div>
                    </div>
                    {tc.error && (
                      <div className="mt-1 text-[10px] text-red-600 font-mono bg-red-100/50 p-1 rounded">
                        {tc.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500 mb-3">
                Click <strong>RUN</strong> to test against visible cases or <strong>SUBMIT</strong> to evaluate solution.
              </div>
            )}

            {/* Diagnostic Output Console */}
            {execResult && (execResult.stdout || execResult.stderr) && (
              <div className="mb-3 p-2 bg-[#0D1117] text-slate-200 rounded-lg border border-slate-800 text-[11px] font-mono max-h-24 overflow-y-auto">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Execution Log:</span>
                {execResult.stdout && <div className="text-emerald-400 whitespace-pre-wrap">{execResult.stdout}</div>}
                {execResult.stderr && <div className="text-amber-400 whitespace-pre-wrap">{execResult.stderr}</div>}
              </div>
            )}

            {/* QUESTION SCORECARD */}
            <div className="pt-2.5 border-t border-slate-100 bg-slate-50/50 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-400 block font-sans">Tests Passed</span>
                  <strong className="text-slate-900">{currentQuestionTestsPassed} / {currentQuestionTotalTests}</strong>
                </div>

                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] text-slate-400 block font-sans">Question Score</span>
                  <strong className="text-blue-700">{currentQuestionScore} / {currentQuestion.marks}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* CARD 3: LIVE SCOREBOARD (SCREEN-FITTED WITH SCROLL) */}
          {/* ---------------------------------------------------- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  LIVE SCOREBOARD
                </span>
              </div>

              <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>REAL-TIME</span>
              </div>
            </div>

            {/* Scoreboard List - Max Height Scrollable so it never overflows screen */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="max-h-44 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[9px] sticky top-0 z-10">
                    <tr>
                      <th className="py-1.5 px-3 w-12">Rank</th>
                      <th className="py-1.5 px-3">Team Name</th>
                      <th className="py-1.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {scoreboard.map((entry) => (
                      <tr
                        key={entry.teamName}
                        className={`transition-colors ${
                          entry.isCurrentTeam
                            ? 'bg-blue-50/90 font-bold text-blue-900 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50/60 text-slate-700'
                        }`}
                      >
                        <td className="py-2 px-3">
                          #{entry.rank}
                        </td>
                        <td className="py-2 px-3 truncate max-w-[130px] font-sans">
                          <span className={entry.isCurrentTeam ? 'font-bold text-blue-950' : 'font-medium'}>
                            {entry.teamName}
                          </span>
                          {entry.isCurrentTeam && (
                            <span className="ml-1 text-[8px] font-bold text-blue-600 bg-blue-100 px-1 py-0.2 rounded uppercase font-mono">
                              YOU
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums">
                          {entry.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <span className="text-[9px] text-slate-400 mt-1.5 block text-center font-mono">
              Auto-updating live competition ranking
            </span>
          </div>

        </div>

      </div>

      {/* Complete Round Confirmation Modal */}
      {showSubmitRoundConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-150">
            <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Complete {round.title}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              You have solved <strong>{solvedCount} of {questions.length}</strong> questions in this round. Submitting will finalize your round score and open the round scorecard.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowSubmitRoundConfirm(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Keep Debugging
              </button>
              <button
                onClick={() => {
                  setShowSubmitRoundConfirm(false);
                  onCompleteRound();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
              >
                Submit & Complete Round
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
