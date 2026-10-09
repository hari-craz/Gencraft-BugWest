import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useCompetitionStore } from './store/competitionStore';
import { User, RoundConfig, Submission } from './types';
import { Navbar } from './components/navbar/Navbar';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { ParticipantDashboard } from './components/participant/ParticipantDashboard';
import { CodeEditorArena } from './components/participant/CodeEditorArena';
import { RoundResultModal } from './components/participant/RoundResultModal';
import { FinalScorecard } from './components/participant/FinalScorecard';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { OrganizerDashboard } from './components/organizer/OrganizerDashboard';

export default function App() {
  const store = useCompetitionStore();

  const currentUser = store.getCurrentUser();
  const rounds = store.getRounds();
  const allQuestions = store.getQuestions();
  const participants = store.getAllParticipants();
  const submissions = store.getSubmissions();
  const leaderboard = store.getLeaderboard();
  const isLeaderboardPublic = store.isLeaderboardEnabled();

  // Navigation view state
  const [activeView, setActiveView] = useState<string>('landing');
  const [activeRoundId, setActiveRoundId] = useState<1 | 2 | 3>(1);

  // Auth Modal state
  const [authModalRole, setAuthModalRole] = useState<'participant' | 'organizer'>('participant');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Round Result Modal state
  const [isRoundResultModalOpen, setIsRoundResultModalOpen] = useState(false);
  const [completedRoundConfig, setCompletedRoundConfig] = useState<RoundConfig | null>(null);

  // Get active participant session if logged in as participant
  const currentParticipantSession = currentUser?.role === 'participant'
    ? store.getParticipantSession(currentUser.userId)
    : undefined;

  const currentParticipantRank = currentParticipantSession
    ? leaderboard.find((e) => e.userId === currentParticipantSession.userId)?.rank || 1
    : 1;

  // Auto redirect if user role does not match active view
  useEffect(() => {
    if (activeView === 'organizer-dashboard' && currentUser?.role !== 'organizer') {
      setActiveView('landing');
    }
    if ((activeView === 'participant-dashboard' || activeView === 'coding-arena') && currentUser?.role !== 'participant') {
      setActiveView('landing');
    }
  }, [currentUser, activeView]);

  // Handlers
  const handleOpenLogin = (role: 'participant' | 'organizer') => {
    setAuthModalRole(role);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (user: User) => {
    if (user.role === 'organizer') {
      store.loginByCodeOrId(user.userId);
      setActiveView('organizer-dashboard');
    } else {
      // Participant session already set by loginParticipantWithTeamCode - just redirect
      setActiveView('participant-dashboard');
    }
  };

  const handleLogout = () => {
    store.logout();
    setActiveView('landing');
  };

  const handleStartRound = (roundId: 1 | 2 | 3) => {
    if (!currentUser || currentUser.role !== 'participant') {
      handleOpenLogin('participant');
      return;
    }
    setActiveRoundId(roundId);
    setActiveView('coding-arena');
  };

  const handleCompleteRound = () => {
    if (!currentUser || !currentParticipantSession) return;
    const roundConfig = store.getRound(activeRoundId);
    if (roundConfig) {
      setCompletedRoundConfig(roundConfig);
      store.completeRound(currentUser.userId, activeRoundId);
      setIsRoundResultModalOpen(true);
    }
  };

  const handleProceedFromRoundResult = () => {
    setIsRoundResultModalOpen(false);
    if (!completedRoundConfig) return;

    // Show Final Scorecard after completing the round
    setActiveView('final-scorecard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onNavigate={(view) => setActiveView(view)}
        activeView={activeView}
        onLogout={handleLogout}
        onOpenLogin={handleOpenLogin}
      />

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
        
        {/* VIEW 1: LANDING PAGE */}
        {activeView === 'landing' && (
          <LandingPage
            onOpenLogin={handleOpenLogin}
          />
        )}

        {/* VIEW 2: PARTICIPANT DASHBOARD */}
        {activeView === 'participant-dashboard' && currentUser && currentParticipantSession && (
          <ParticipantDashboard
            currentUser={currentUser}
            session={currentParticipantSession}
            rounds={rounds}
            onStartRound={handleStartRound}
            onViewScorecard={() => setActiveView('final-scorecard')}
            onViewLeaderboard={() => setActiveView('leaderboard')}
            userRank={currentParticipantRank}
          />
        )}

        {/* VIEW 3: CODING ARENA */}
        {activeView === 'coding-arena' && currentUser && (
          <CodeEditorArena
            round={store.getRound(activeRoundId) || rounds[0]}
            questions={store.getQuestionsByRound(activeRoundId)}
            session={currentParticipantSession || store.getOrCreateParticipantSession(currentUser)}
            onSaveDraft={(qId, code) => store.saveCodeDraft(currentUser.userId, qId, code)}
            onSubmitQuestion={(sub) => store.recordSubmission(currentUser.userId, sub)}
            onCompleteRound={handleCompleteRound}
            onBackToDashboard={() => setActiveView('participant-dashboard')}
          />
        )}

        {/* VIEW 4: FINAL SCORECARD */}
        {activeView === 'final-scorecard' && currentUser && currentParticipantSession && (
          <FinalScorecard
            currentUser={currentUser}
            session={currentParticipantSession}
            rank={currentParticipantRank}
            onViewLeaderboard={() => setActiveView('leaderboard')}
            onBackToDashboard={() => setActiveView('participant-dashboard')}
          />
        )}

        {/* VIEW 5: LEADERBOARD */}
        {activeView === 'leaderboard' && (
          <LeaderboardView
            entries={leaderboard}
            isPublicEnabled={isLeaderboardPublic}
            isOrganizer={currentUser?.role === 'organizer'}
            onToggleVisibility={(en) => store.setLeaderboardEnabled(en)}
            onBack={() => {
              if (currentUser?.role === 'organizer') setActiveView('organizer-dashboard');
              else if (currentUser?.role === 'participant') setActiveView('participant-dashboard');
              else setActiveView('landing');
            }}
          />
        )}

        {/* VIEW 6: ORGANIZER DASHBOARD */}
        {activeView === 'organizer-dashboard' && currentUser?.role === 'organizer' && (
          <OrganizerDashboard
            currentUser={currentUser}
            questions={allQuestions}
            rounds={rounds}
            participants={participants}
            submissions={submissions}
            leaderboard={leaderboard}
            isLeaderboardPublic={isLeaderboardPublic}
            onAddQuestion={(q) => store.addQuestion(q)}
            onUpdateQuestion={(id, updates) => store.updateQuestion(id, updates)}
            onDeleteQuestion={(id) => store.deleteQuestion(id)}
            onDuplicateQuestion={(id) => store.duplicateQuestion(id)}
            onResetQuestions={() => store.resetToDefaultQuestions()}
            onUpdateRound={(rId, updates) => store.updateRound(rId, updates)}
            onToggleLeaderboard={(en) => store.setLeaderboardEnabled(en)}
            onLogout={handleLogout}
          />
        )}

      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        role={authModalRole}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Round Result Summary Modal */}
      {completedRoundConfig && currentParticipantSession && (
        <RoundResultModal
          isOpen={isRoundResultModalOpen}
          round={completedRoundConfig}
          roundScore={currentParticipantSession.roundScores[completedRoundConfig.roundId] || 0}
          totalScore={currentParticipantSession.totalScore}
          questionsSolved={
            Object.values(currentParticipantSession.submissions).filter(
              (s) => s.round === completedRoundConfig.roundId && s.result === 'Passed'
            ).length
          }
          totalQuestions={completedRoundConfig.questionCount}
          accuracy={
            Object.values(currentParticipantSession.submissions).filter(
              (s) => s.round === completedRoundConfig.roundId
            ).length > 0
              ? Math.round(
                  (Object.values(currentParticipantSession.submissions).filter(
                    (s) => s.round === completedRoundConfig.roundId && s.result === 'Passed'
                  ).length /
                    Object.values(currentParticipantSession.submissions).filter(
                      (s) => s.round === completedRoundConfig.roundId
                    ).length) *
                    100
                )
              : 0
          }
          timeUsedMinutes={completedRoundConfig.durationMinutes}
          isFinalRound={completedRoundConfig.roundId === 3}
          isNextRoundUnlocked={
            completedRoundConfig.roundId < 3 &&
            (store.getRound((completedRoundConfig.roundId + 1) as 1 | 2 | 3)?.status === 'active' ||
             store.getRound((completedRoundConfig.roundId + 1) as 1 | 2 | 3)?.status === 'ready')
          }
          onProceed={handleProceedFromRoundResult}
          onClose={() => setIsRoundResultModalOpen(false)}
          onBackToDashboard={() => {
            setIsRoundResultModalOpen(false);
            setActiveView('participant-dashboard');
          }}
        />
      )}

      {/* Vercel Web Analytics */}
      <Analytics />

    </div>
  );
}
