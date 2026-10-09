import React, { useState } from 'react';
import { 
  User, 
  Question, 
  RoundConfig, 
  ParticipantSession, 
  Submission, 
  LeaderboardEntry,
  Language,
  RoundLeaderboardFilter 
} from '../../types';
import { competitionStore } from '../../store/competitionStore';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';
import { QuestionModal } from './QuestionModal';
import { SubmissionInspectorModal } from './SubmissionInspectorModal';
import { ParticipantDetailModal } from './ParticipantDetailModal';
import { 
  Download,
  LayoutDashboard, 
  Users, 
  Key, 
  FileCode, 
  Layers, 
  CheckSquare, 
  Trophy, 
  BarChart2, 
  Settings, 
  LogOut, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders
} from 'lucide-react';

interface OrganizerDashboardProps {
  currentUser: User;
  questions: Question[];
  rounds: RoundConfig[];
  participants: ParticipantSession[];
  submissions: Submission[];
  leaderboard: LeaderboardEntry[];
  isLeaderboardPublic: boolean;
  onAddQuestion: (q: Omit<Question, 'id'> & { id?: string }) => void;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void;
  onDeleteQuestion: (id: string) => void;
  onDuplicateQuestion: (id: string) => void;
  onResetQuestions: () => void;
  onUpdateRound: (roundId: 1 | 2 | 3, updates: Partial<RoundConfig>) => void;
  onToggleLeaderboard: (enabled: boolean) => void;
  onLogout: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  currentUser,
  questions,
  rounds,
  participants,
  submissions,
  leaderboard,
  isLeaderboardPublic,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onResetQuestions,
  onUpdateRound,
  onToggleLeaderboard,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'participants' | 'rounds' | 'submissions' | 'leaderboard' | 'reports' | 'settings'>('questions');

  // Modals state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
  const [defaultRoundForModal, setDefaultRoundForModal] = useState<1 | 2 | 3>(1);
  const [inspectingSubmission, setInspectingSubmission] = useState<Submission | null>(null);
  const [inspectingParticipant, setInspectingParticipant] = useState<ParticipantSession | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Access Code Generator & Leaderboard Filter State
  const [organizerLeaderboardFilter, setOrganizerLeaderboardFilter] = useState<RoundLeaderboardFilter>('overall');
  const [accessCodes, setAccessCodes] = useState(competitionStore.getAccessCodes());
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateCollege, setNewCandidateCollege] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Question Filters
  const [roundFilter, setRoundFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [langFilter, setLangFilter] = useState<'all' | 'c' | 'python'>('all');
  const [searchQuestion, setSearchQuestion] = useState('');

  // Overview metrics
  const totalParticipants = participants.length;
  const activeParticipants = participants.filter((p) => p.status === 'Active').length;
  const totalSubmissionsCount = submissions.length;
  const avgScore = totalParticipants > 0
    ? Math.round(participants.reduce((acc, p) => acc + p.totalScore, 0) / totalParticipants)
    : 0;
  const topPerformer = leaderboard[0];

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    if (roundFilter !== 'all' && q.round !== Number(roundFilter)) return false;
    if (langFilter !== 'all' && q.language !== langFilter) return false;
    if (searchQuestion.trim()) {
      const term = searchQuestion.toLowerCase();
      return q.title.toLowerCase().includes(term) || q.id.toLowerCase().includes(term) || q.bugDescription.toLowerCase().includes(term);
    }
    return true;
  });

  const handleOpenAddQuestion = (roundId: 1 | 2 | 3 = 1) => {
    setQuestionToEdit(null);
    setDefaultRoundForModal(roundId);
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    setQuestionToEdit(q);
    setDefaultRoundForModal(q.round);
    setIsQuestionModalOpen(true);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-100 flex flex-col md:flex-row">
      
      {/* Organizer Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800">
        
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              ORG
            </div>
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-100">
                Command Console
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentUser.userId} · Admin
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 text-xs font-semibold flex-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'questions' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCode className="w-4 h-4" />
              <span>Question Authoring</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {questions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'participants' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Candidate Monitor</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {participants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rounds')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'rounds' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Round Configurations</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'submissions' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-4 h-4" />
              <span>Submissions Log</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {submissions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'leaderboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard Controls</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Performance Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Reset</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Organizer</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl">
        
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                Symposium Operations
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Competition Command Dashboard
              </h1>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Total Candidates</span>
                <div className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                  {totalParticipants}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Registered in symposium</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Active Solving</span>
                <div className="text-3xl font-extrabold font-mono text-emerald-600 tabular-nums">
                  {activeParticipants}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Live in arena session</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Questions Submitted</span>
                <div className="text-3xl font-extrabold font-mono text-blue-600 tabular-nums">
                  {totalSubmissionsCount}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Evaluated by test runner</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Average Score</span>
                <div className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                  {avgScore} <span className="text-xs font-normal text-slate-400 font-sans">pts</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Cohort mean across rounds</span>
              </div>
            </div>

            {/* Live Round Status Cards */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                Round Status & Progression
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rounds.map((r) => (
                  <div key={r.roundId} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        ROUND {r.roundId}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        r.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                        r.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-semibold mb-2">{r.subtitle}</div>
                    <div className="text-[11px] text-slate-500 font-mono space-y-1">
                      <div>Duration: {r.durationMinutes} mins</div>
                      <div>Problems: {questions.filter(q => q.round === r.roundId).length} in bank</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-blue-900 text-sm">Author Custom Buggy Questions</h4>
                <p className="text-xs text-blue-700 mt-0.5">
                  Plant custom syntax or logic bugs for Round 1, Round 2, or Round 3 right now.
                </p>
              </div>
              <button
                onClick={() => handleOpenAddQuestion(1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Question to Round 1</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: QUESTION AUTHORING & MANAGEMENT (USER EMPHASIS!) */}
        {/* ======================================================== */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            
            {/* Header with Quick Add Buttons for Each Round */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  Question Bank & Bug Injection Suite
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Organizer Question Authoring
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter custom problems with deliberate bugs, reference solutions, and test assertion vectors.
                </p>
              </div>

              {/* Action Buttons for Rounds */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleOpenAddQuestion(1)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Round 1 Q</span>
                </button>
                <button
                  onClick={() => handleOpenAddQuestion(2)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Round 2 Q</span>
                </button>
                <button
                  onClick={() => handleOpenAddQuestion(3)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Round 3 Q</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
              
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Round Filter */}
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500 mr-1">Round:</span>
                  {(['all', '1', '2', '3'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoundFilter(r)}
                      className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                        roundFilter === r
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r === 'all' ? 'All' : `R${r}`}
                    </button>
                  ))}
                </div>

                {/* Language Filter */}
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500 mr-1">Lang:</span>
                  {(['all', 'c', 'python'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLangFilter(lang)}
                      className={`px-2.5 py-1 rounded uppercase font-mono font-medium transition-colors ${
                        langFilter === lang
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

              </div>

              {/* Search Box */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter question title, ID, bug..."
                  value={searchQuestion}
                  onChange={(e) => setSearchQuestion(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

            </div>

            {/* Questions Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-20">ID</th>
                      <th className="py-3 px-4 w-16">Round</th>
                      <th className="py-3 px-4 w-20">Lang</th>
                      <th className="py-3 px-4">Title & Planted Bug</th>
                      <th className="py-3 px-4 w-20 text-center">Marks</th>
                      <th className="py-3 px-4 w-24 text-center">Difficulty</th>
                      <th className="py-3 px-4 w-24 text-center">Status</th>
                      <th className="py-3 px-4 w-36 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredQuestions.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {q.id}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                          R{q.round}
                        </td>
                        <td className="py-3 px-4 font-mono uppercase font-bold text-blue-700">
                          {q.language}
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block text-xs mb-0.5">{q.title}</strong>
                          <span className="text-[11px] text-amber-700 font-mono block">
                            Bug: {q.bugDescription}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {q.marks} pts
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                            q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onUpdateQuestion(q.id, { isPublished: !q.isPublished })}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                              q.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {q.isPublished ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewQuestion(q)}
                              title="Preview"
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditQuestion(q)}
                              title="Edit Problem"
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDuplicateQuestion(q.id)}
                              title="Duplicate"
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete question ${q.id}: ${q.title}?`)) {
                                  onDeleteQuestion(q.id);
                                }
                              }}
                              title="Delete"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Reset bank option */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>Showing {filteredQuestions.length} of {questions.length} questions in bank</span>
              <button
                onClick={() => {
                  if (window.confirm('Reset questions to the default official 35-problem tournament set?')) {
                    onResetQuestions();
                  }
                }}
                className="text-slate-500 hover:text-slate-900 underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Standard 35-Question Bank</span>
              </button>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PARTICIPANT MONITOR & ACCESS CODE GENERATOR */}
        {/* ======================================================== */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  Surveillance & Access Control
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Candidate Monitor & Access Code Issuer
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate random participant login codes and track active candidate progress.
                </p>
              </div>

              {/* Access Code Generation Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const newBatch = competitionStore.batchGenerateOrganizerCodes(5);
                    setAccessCodes(competitionStore.getAccessCodes());
                    alert(`Generated ${newBatch.length} new access codes: ${newBatch.map(b => b.accessCode).join(', ')}`);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>+ Batch Generate 5 Codes</span>
                </button>
              </div>
            </div>

            {/* Inline Single Code Issuer */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Issue Custom Participant Access Code</span>
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Candidate Name (e.g. Sree Prithiv)"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  className="flex-1 w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <input
                  type="text"
                  placeholder="College (e.g. PSG Tech)"
                  value={newCandidateCollege}
                  onChange={(e) => setNewCandidateCollege(e.target.value)}
                  className="flex-1 w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button
                  onClick={() => {
                    if (!newCandidateName.trim()) {
                      alert('Please provide a candidate name.');
                      return;
                    }
                    const res = competitionStore.generateRandomParticipantCode(newCandidateName, newCandidateCollege);
                    setAccessCodes(competitionStore.getAccessCodes());
                    setNewCandidateName('');
                    setNewCandidateCollege('');
                    alert(`Created Access Code: ${res.accessCode} for ${res.user.name} (${res.user.userId})`);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  Generate & Register Code
                </button>
              </div>
            </div>

            {/* Issued Access Codes Drawer */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Active Access Codes Pool ({accessCodes.length})
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Participants use these codes to enter Bug Fest
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {accessCodes.map((ac) => (
                  <div
                    key={ac.accessCode}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-2xs"
                  >
                    <strong className="text-blue-700 font-bold">{ac.accessCode}</strong>
                    <span className="text-slate-400 font-sans">({ac.name})</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ac.accessCode);
                        setCopiedCode(ac.accessCode);
                        setTimeout(() => setCopiedCode(null), 1500);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-800"
                      title="Copy Access Code"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {copiedCode === ac.accessCode && (
                      <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Progress Grid */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Participant</th>
                      <th className="py-3 px-4">Access Code</th>
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">College</th>
                      <th className="py-3 px-4 text-center">Current Round</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Submissions</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {participants.map((p) => (
                      <tr key={p.userId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                          {p.accessCode || 'BF-DEFAULT'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {p.userId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.college}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-700">
                          Round {p.currentRound}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                          {p.totalScore} pts
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {Object.keys(p.submissions).length} solved
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                            p.status === 'Completed' ? 'bg-purple-100 text-purple-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInspectingParticipant(p)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          >
                            Inspect Progress
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ROUND CONFIGURATION */}
        {/* ======================================================== */}
        {activeTab === 'rounds' && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                Progression & Timers
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Round Configurations
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Set round countdown durations, question quotas, and activate or lock rounds live during the tournament.
              </p>
            </div>

            {/* ACTIVE ROUND SPOTLIGHT BANNER (Requirement 7) */}
            {(() => {
              const activeRound = rounds.find((r) => r.status === 'active') || rounds[0];
              return (
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
                          ACTIVE COMPETITION ROUND
                        </span>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight text-white mb-1">
                        {activeRound.title}: {activeRound.subtitle}
                      </h2>
                      <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                        Provide the generated Bugfest Code below to participating teams through the organizing coordination desk.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex flex-col items-start gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 font-mono">
                        ROUND {activeRound.roundId} BUGFEST CODE
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black font-mono tracking-widest text-amber-300">
                          {activeRound.bugfestCode || 'NO CODE ACTIVE'}
                        </span>
                        {activeRound.bugfestCode && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeRound.bugfestCode!);
                              setCopiedCode(activeRound.bugfestCode!);
                              setTimeout(() => setCopiedCode(null), 1500);
                            }}
                            className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                            title="Copy Code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {copiedCode === activeRound.bugfestCode && (
                          <span className="text-[10px] text-emerald-300 font-bold">Copied!</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-4">
              {rounds.map((round) => {
                const questionCountInRound = questions.filter((q) => q.round === round.roundId).length;

                return (
                  <div key={round.roundId} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-600 font-mono">
                            ROUND {round.roundId}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{round.subtitle}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{round.title}: {round.subtitle}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{round.description}</p>
                      </div>

                      {/* Status Toggle buttons */}
                      <div className="flex items-center gap-1.5 self-start md:self-auto">
                        {(['locked', 'ready', 'active', 'completed'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              const updates: Partial<RoundConfig> = { status: st };
                              onUpdateRound(round.roundId, updates);
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase transition-colors ${
                              round.status === st
                                ? st === 'active' ? 'bg-emerald-600 text-white shadow-xs' :
                                  st === 'ready' ? 'bg-blue-600 text-white shadow-xs' :
                                  st === 'completed' ? 'bg-purple-600 text-white shadow-xs' :
                                  'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Adjustable settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Round Duration (Minutes)
                        </label>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={round.durationMinutes}
                            onChange={(e) => onUpdateRound(round.roundId, { durationMinutes: Number(e.target.value) })}
                            className="p-1.5 border border-slate-300 rounded font-mono font-bold w-24 text-slate-900"
                          />
                          <span className="text-slate-400 font-mono">minutes</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Total Marks
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={round.totalMarks}
                            onChange={(e) => onUpdateRound(round.roundId, { totalMarks: Number(e.target.value) })}
                            className="p-1.5 border border-slate-300 rounded font-mono font-bold w-24 text-slate-900"
                          />
                          <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-200">
                            {questionCountInRound > 0 ? (
                              <>⚡ {Math.round(round.totalMarks / questionCountInRound)} marks / question ({round.totalMarks} ÷ {questionCountInRound})</>
                            ) : null}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Questions in Pool
                        </label>
                        <div className="font-mono text-sm font-bold text-slate-900 pt-1">
                          {questionCountInRound} Questions
                        </div>
                      </div>
                    </div>

                    {/* Live Synchronized Timer Controller */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 p-3.5 rounded-lg border border-blue-200">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Clock className="w-3.5 h-3.5 text-blue-700" />
                          <span className="text-xs font-bold text-slate-900">
                            Tournament Clock & Global Countdown:
                          </span>
                          {round.status === 'active' && round.endTime && new Date(round.endTime).getTime() > Date.now() ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                              LIVE COUNTDOWN RUNNING
                            </span>
                          ) : round.status === 'active' ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              TIMER READY / EXPIRED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                              {round.status}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          All participants share the exact same synchronized countdown regardless of when they enter.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (window.confirm(`Start / Reset synchronized ${round.durationMinutes}-minute countdown for Round ${round.roundId} for all participants?`)) {
                              onUpdateRound(round.roundId, { action: 'restart_timer', status: 'active', durationMinutes: round.durationMinutes } as any);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Start / Reset Timer ({round.durationMinutes}m)</span>
                        </button>

                        {round.status === 'active' && (
                          <>
                            <button
                              onClick={() => {
                                onUpdateRound(round.roundId, { action: 'extend_timer', extendMinutes: 5 } as any);
                              }}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                              title="Add 5 Minutes to Round Clock"
                            >
                              +5 Min
                            </button>
                            <button
                              onClick={() => {
                                onUpdateRound(round.roundId, { action: 'extend_timer', extendMinutes: 10 } as any);
                              }}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                              title="Add 10 Minutes to Round Clock"
                            >
                              +10 Min
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bugfest Code for Round */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800">
                            Round {round.roundId} Bugfest Access Code:
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Generated randomly server-side. Provide manually to participating teams for Round {round.roundId}.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {round.bugfestCode ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 shadow-2xs">
                            <span>{round.bugfestCode}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(round.bugfestCode!);
                                setCopiedCode(round.bugfestCode!);
                                setTimeout(() => setCopiedCode(null), 1500);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-800"
                              title="Copy Bugfest Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {copiedCode === round.bugfestCode && (
                              <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-mono">No code active</span>
                        )}

                        <button
                          onClick={() => {
                            if (round.bugfestCode) {
                              const confirmed = window.confirm(
                                `⚠️ WARNING: Regenerating the Bugfest Code for Round ${round.roundId} will immediately invalidate the previous code.\n\nAll participating teams must receive the replacement code to authenticate.\n\nExisting submissions, scores, and completed progress will NOT be altered.\n\nDo you want to proceed with regeneration?`
                              );
                              if (!confirmed) return;
                            }
                            const newCode = competitionStore.generateOrRegenerateRoundCode(round.roundId);
                            onUpdateRound(round.roundId, { bugfestCode: newCode });
                          }}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{round.bugfestCode ? 'Regenerate Code' : 'GENERATE BUGFEST CODE'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: SUBMISSIONS REVIEWER */}
        {/* ======================================================== */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                Audit Trail
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Candidate Submissions
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted code, test case results, and execution speed.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Participant</th>
                      <th className="py-3 px-4">Problem</th>
                      <th className="py-3 px-4 text-center">Round</th>
                      <th className="py-3 px-4 text-center">Lang</th>
                      <th className="py-3 px-4 text-center">Result</th>
                      <th className="py-3 px-4 text-center">Marks</th>
                      <th className="py-3 px-4 text-center">Time</th>
                      <th className="py-3 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          No candidate submissions recorded yet. Once participants submit solutions, they appear here.
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {sub.participantName} ({sub.participantId})
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 truncate max-w-xs">
                            {sub.questionTitle}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            R{sub.round}
                          </td>
                          <td className="py-3 px-4 text-center font-mono uppercase font-bold text-blue-600">
                            {sub.language}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              sub.result === 'Passed' ? 'bg-emerald-100 text-emerald-800' :
                              sub.result === 'Partial' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {sub.result}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {sub.marksEarned} / {sub.maxMarks}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500">
                            {sub.timestamp}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setInspectingSubmission(sub)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            >
                              Inspect Code
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: LEADERBOARD MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  Public Standings & Live Auditing
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Leaderboard Control
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg text-xs">
                  <span className="font-semibold text-slate-700">Public Visibility:</span>
                  <button
                    onClick={() => onToggleLeaderboard(!isLeaderboardPublic)}
                    className={`px-3 py-1 rounded font-bold transition-colors ${
                      isLeaderboardPublic ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {isLeaderboardPublic ? 'Enabled (Public)' : 'Disabled (Hidden from Candidates)'}
                  </button>
                </div>
                
                <button
                  onClick={() => exportToPDF(leaderboard)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>

                <button
                  onClick={() => exportToExcel(leaderboard)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Round Filter Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl text-xs">
              <button
                onClick={() => setOrganizerLeaderboardFilter('overall')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  organizerLeaderboardFilter === 'overall'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Overall Cumulative
              </button>
              <button
                onClick={() => setOrganizerLeaderboardFilter(1)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  organizerLeaderboardFilter === 1
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Round 1 Standings
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-16">Rank</th>
                      <th className="py-3 px-4">Participant</th>
                      <th className="py-3 px-4">Access Code</th>
                      <th className="py-3 px-4">User ID</th>
                      {organizerLeaderboardFilter === 'overall' ? (
                        <>
                          <th className="py-3 px-4 text-center">R1 Solved</th>
                          <th className="py-3 px-4 text-center">R1 Accuracy</th>
                          <th className="py-3 px-4 text-center">R1 Total Time</th>
                          <th className="py-3 px-4 text-right">Total Score</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-4 text-center">Q1 Time</th>
                          <th className="py-3 px-4 text-center">Q2 Time</th>
                          <th className="py-3 px-4 text-center">Q3 Time</th>
                          <th className="py-3 px-4 text-center">Q4 Time</th>
                          <th className="py-3 px-4 text-center">Q5 Time</th>
                          <th className="py-3 px-4 text-center">Q6 Time</th>
                          <th className="py-3 px-4 text-center">Q7 Time</th>
                          <th className="py-3 px-4 text-center">Solved</th>
                          <th className="py-3 px-4 text-center">Accuracy</th>
                          <th className="py-3 px-4 text-right">Round 1 Score</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {competitionStore.getLeaderboard(organizerLeaderboardFilter as any).map((item) => (
                      <tr key={item.userId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          #{item.rank}
                        </td>
                        <td className="py-3 px-4 font-sans font-bold text-slate-900">
                          {item.participantName}
                        </td>
                        <td className="py-3 px-4 text-blue-700 font-bold">
                          {item.accessCode || 'BF-DEFAULT'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {item.userId}
                        </td>
                        {organizerLeaderboardFilter === 'overall' ? (
                          <>
                            <td className="py-3 px-4 text-center tabular-nums">
                              {item.round1QuestionsSolved}
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums">
                              {item.round1Accuracy}%
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums">
                              {item.totalTimeRound1Ms}ms
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600 text-sm">
                              {item.totalScore} pts
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 text-center tabular-nums">{item.q1Time}</td>
                            <td className="py-3 px-4 text-center tabular-nums">{item.q2Time}</td>
                            <td className="py-3 px-4 text-center tabular-nums">{item.q3Time}</td>
                            <td className="py-3 px-4 text-center tabular-nums">{item.q4Time}</td>
                            <td className="py-3 px-4 text-center tabular-nums">{item.q5Time}</td>
                            <td className="py-3 px-4 text-center tabular-nums">{item.q6Time}</td>
                            <td className="py-3 px-4 text-center tabular-nums">{item.q7Time}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">
                              {item.round1QuestionsSolved} solved
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums font-medium">
                              {item.round1Accuracy}%
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600 text-sm">
                              {item.round1Score} pts
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: REPORTS */}
        {/* ======================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                Post-Event Analytics
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Competition Reports
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 mb-2">Cohort Pass Rate</h3>
                <div className="text-3xl font-extrabold text-emerald-600 font-mono mb-2">
                  {totalSubmissionsCount > 0
                    ? Math.round(
                        (submissions.filter((s) => s.result === 'Passed').length /
                          totalSubmissionsCount) *
                          100
                      )
                    : 0}%
                </div>
                <p className="text-xs text-slate-500">
                  Percentage of test case executions that completed with 100% test pass.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 mb-2">C vs Python Distribution</h3>
                <div className="space-y-2 text-xs font-mono pt-2">
                  <div className="flex justify-between">
                    <span>C Questions:</span>
                    <strong>{questions.filter((q) => q.language === 'c').length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Python Questions:</span>
                    <strong>{questions.filter((q) => q.language === 'python').length}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="font-bold text-slate-900 mb-2">Round 3 Qualified</h3>
                <div className="text-3xl font-extrabold text-blue-600 font-mono mb-2">
                  {participants.filter((p) => p.currentRound === 3 || p.roundCompleted[2]).length}
                </div>
                <p className="text-xs text-slate-500">
                  Candidates who have unlocked or reached the final master round.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: SETTINGS */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                Environment Administration
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Tournament Settings
              </h1>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Question Bank Management</h3>
              <p className="text-xs text-slate-500">
                You can reload the initial 35-problem competition question bank or clear any custom test edits.
              </p>
              <button
                onClick={() => {
                  if (window.confirm('Reset questions to the initial 35 authentic questions?')) {
                    onResetQuestions();
                    alert('Questions reset successfully.');
                  }
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Standard 35-Problem Set (20 / 10 / 5)</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Question Authoring Modal */}
      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        questionToEdit={questionToEdit}
        defaultRound={defaultRoundForModal}
        onSaveQuestion={(savedQ) => {
          if (questionToEdit) {
            onUpdateQuestion(questionToEdit.id, savedQ);
          } else {
            onAddQuestion(savedQ);
          }
        }}
      />

      {/* Submission Inspector Modal */}
      <SubmissionInspectorModal
        submission={inspectingSubmission}
        onClose={() => setInspectingSubmission(null)}
      />

      {/* Participant Detail Modal */}
      <ParticipantDetailModal
        participant={inspectingParticipant}
        onClose={() => setInspectingParticipant(null)}
        onInspectSubmission={(sub) => {
          setInspectingParticipant(null);
          setInspectingSubmission(sub);
        }}
      />

      {/* Question Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-blue-600 font-mono uppercase">
                  Round {previewQuestion.round} · {previewQuestion.language.toUpperCase()} · {previewQuestion.marks} pts
                </span>
                <h3 className="text-base font-bold text-slate-900">{previewQuestion.title}</h3>
              </div>
              <button onClick={() => setPreviewQuestion(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-600 mb-4">{previewQuestion.description}</p>
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-700 block mb-1">Starter Buggy Code:</span>
              <pre className="p-3 bg-slate-950 text-slate-100 rounded text-xs font-mono overflow-x-auto">
                {previewQuestion.buggyCode}
              </pre>
            </div>
            <div className="mb-4">
              <span className="text-xs font-bold text-amber-800 block mb-1">Planted Bug (Internal Note):</span>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 font-mono">
                {previewQuestion.bugDescription}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
