import React, { useState } from 'react';
import { LeaderboardEntry, RoundLeaderboardFilter } from '../../types';
import { competitionStore } from '../../store/competitionStore';
import { Trophy, Search, ShieldAlert, Award, Radio, Filter, Layers, Zap } from 'lucide-react';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  isPublicEnabled: boolean;
  isOrganizer: boolean;
  onToggleVisibility?: (enabled: boolean) => void;
  onBack: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries: initialEntries,
  isPublicEnabled,
  isOrganizer,
  onToggleVisibility,
  onBack
}) => {
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<RoundLeaderboardFilter>('overall');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch live calculated entries for the selected round
  const currentEntries = competitionStore.getLeaderboard(selectedRoundFilter);

  const filteredEntries = currentEntries.filter((e) => {
    const term = searchTerm.toLowerCase();
    return (
      e.participantName.toLowerCase().includes(term) ||
      e.userId.toLowerCase().includes(term) ||
      (e.accessCode && e.accessCode.toLowerCase().includes(term)) ||
      e.college.toLowerCase().includes(term)
    );
  });

  const roundTitles: Record<RoundLeaderboardFilter, string> = {
    overall: 'Cumulative Tournament Standings',
    1: 'Round 1: Basic Debugging Leaderboard',
    2: 'Round 2: Core Programming Leaderboard',
    3: 'Round 3: Advanced Professional Debugging Leaderboard'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE ARENA FEED</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">
              Auto-updating per round submission
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-500" />
            <span>{roundTitles[selectedRoundFilter]}</span>
          </h1>
        </div>

        {/* Organizer Visibility Control */}
        {isOrganizer && onToggleVisibility && (
          <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="font-semibold text-slate-700">Public Visibility:</span>
            <button
              onClick={() => onToggleVisibility(!isPublicEnabled)}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                isPublicEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {isPublicEnabled ? 'Public (Visible)' : 'Hidden (Review Mode)'}
            </button>
          </div>
        )}
      </div>

      {/* Notice if Leaderboard is disabled by organizer and viewer is not organizer */}
      {!isPublicEnabled && !isOrganizer ? (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-center max-w-lg mx-auto my-12">
          <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-900 mb-1">
            Leaderboard Temporarily Locked
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed mb-4">
            The symposium organizing committee has paused public leaderboard visibility while final round submissions are being audited. Please check back shortly.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-amber-800 text-white text-xs font-semibold rounded-lg hover:bg-amber-900 transition-colors"
          >
            Return to Arena
          </button>
        </div>
      ) : (
        <>
          {/* ROUND SELECTOR TABS (USER SPECIFIC FEATURE) */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setSelectedRoundFilter('overall')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                  selectedRoundFilter === 'overall'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Overall Standings</span>
              </button>

              <button
                onClick={() => setSelectedRoundFilter(1)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                  selectedRoundFilter === 1
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Round 1 (Basic Debugging)</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 px-2 py-1 bg-slate-50 rounded hidden md:block">
              Filtered by: {selectedRoundFilter === 'overall' ? 'Cumulative Points' : `Round ${selectedRoundFilter} Points`}
            </div>
          </div>

          {/* Top 3 Live Podium Cards for Selected Round */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {currentEntries.slice(0, 3).map((podium, idx) => {
              const placeColors = [
                'border-amber-400 bg-amber-50/30 text-amber-800',
                'border-slate-300 bg-slate-50 text-slate-800',
                'border-amber-700/40 bg-amber-900/5 text-amber-900'
              ];
              const medals = ['1st Place', '2nd Place', '3rd Place'];

              const displayScore = selectedRoundFilter === 'overall'
                ? podium.totalScore
                : (podium.roundScoreForFilter || 0);

              const maxScoreForRound = selectedRoundFilter === 'overall' ? 300 : 100;

              return (
                <div
                  key={podium.userId}
                  className={`p-5 rounded-xl border-2 transition-all relative overflow-hidden ${placeColors[idx]}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">
                      {medals[idx]}
                    </span>
                    <span className="text-2xl font-black font-mono">
                      #{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {podium.participantName}
                  </h3>
                  
                  <div className="text-[11px] text-slate-500 font-medium mb-3 truncate">
                    {podium.college}
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 font-sans">
                      {selectedRoundFilter === 'overall' ? 'Tournament Total:' : `Round ${selectedRoundFilter} Score:`}
                    </span>
                    <strong className="text-base text-slate-900">
                      {displayScore} <span className="text-xs text-slate-400 font-normal">/ {maxScoreForRound}</span>
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search & Metadata Bar */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidate name, college..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              />
            </div>

            <div className="text-xs text-slate-500 font-mono flex items-center gap-3">
              <span>{filteredEntries.length} Ranked Candidates</span>
              <span>·</span>
              <span className="text-emerald-700 font-bold">Live Scoring</span>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4 min-w-[140px]">Participant</th>
                    {isOrganizer && (
                      <>
                        <th className="py-3 px-4 min-w-[120px]">Access Code</th>
                        <th className="py-3 px-4 min-w-[120px]">User ID</th>
                      </>
                    )}
                    <th className="py-3 px-4">College</th>
                    
                    {selectedRoundFilter === 'overall' ? (
                      <>
                        <th className="py-3 px-4 text-center">R1 Solved</th>
                        <th className="py-3 px-4 text-center">R1 Accuracy</th>
                        <th className="py-3 px-4 text-center">Total Time R1</th>
                        <th className="py-3 px-4 text-right">Cumulative Score</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 text-center">Solved</th>
                        <th className="py-3 px-4 text-center">Accuracy</th>
                        <th className="py-3 px-4 text-right">Q1 Time</th>
                        <th className="py-3 px-4 text-right">Q2 Time</th>
                        <th className="py-3 px-4 text-right">Q3 Time</th>
                        <th className="py-3 px-4 text-right">Q4 Time</th>
                        <th className="py-3 px-4 text-right">Q5 Time</th>
                        <th className="py-3 px-4 text-right">Q6 Time</th>
                        <th className="py-3 px-4 text-right">Q7 Time</th>
                        <th className="py-3 px-4 text-right">Round 1 Score</th>
                      </>
                    )}

                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 text-center">
                        #{entry.rank}
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">
                        {entry.participantName}
                      </td>
                      {isOrganizer && (
                        <>
                          <td className="py-3 px-4 text-slate-600">
                            {entry.accessCode || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-[10px]">
                            {entry.userId}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 font-sans text-slate-600 truncate max-w-xs">
                        {entry.college}
                      </td>

                      {selectedRoundFilter === 'overall' ? (
                        <>
                          <td className="py-3 px-4 text-center tabular-nums">
                            {entry.round1QuestionsSolved}
                          </td>
                          <td className="py-3 px-4 text-center tabular-nums">
                            {entry.round1Accuracy}%
                          </td>
                          <td className="py-3 px-4 text-center tabular-nums text-slate-500">
                            {entry.totalTimeRound1Ms}ms
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-blue-600 text-sm">
                            {entry.totalScore}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-center tabular-nums font-bold text-slate-900">
                            {entry.round1QuestionsSolved} solved
                          </td>
                          <td className="py-3 px-4 text-center tabular-nums font-medium text-slate-700">
                            {entry.round1Accuracy}%
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">{entry.q1Time}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{entry.q2Time}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{entry.q3Time}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{entry.q4Time}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{entry.q5Time}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{entry.q6Time}</td>
                          <td className="py-3 px-4 text-right tabular-nums">{entry.q7Time}</td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-blue-600 text-sm">
                            {entry.round1Score} pts
                          </td>
                        </>
                      )}

                      <td className="py-3 px-4 text-center font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            entry.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.status === 'Active'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
