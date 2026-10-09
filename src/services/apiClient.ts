import { Question, RoundConfig, LeaderboardEntry, User, ParticipantSession, Submission } from '../types';

// Support external backend URL via VITE_API_URL if deployed on Render/Railway/Fly/VPS.
// Defaults to '/api' for same-origin or Vercel serverless functions.
const RAW_API_URL = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined;
const API_BASE = (RAW_API_URL ? RAW_API_URL.replace(/\/+$/, '') : '') + '/api';

const LOCAL_STORAGE_KEYS = {
  TEAMS: 'gencraft_local_teams_v1',
  ROUNDS: 'gencraft_local_rounds_v1',
  SUBMISSIONS: 'gencraft_local_submissions_v1'
};

function getLocalData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[ApiClient] Failed to save localStorage (${key}):`, e);
  }
}

export interface RegisterTeamResponse {
  success: boolean;
  isExisting?: boolean;
  team?: {
    id: string;
    eventId: string;
    teamName: string;
    locked: boolean;
    createdAt: string;
  };
  error?: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  round?: RoundConfig;
  teamRound?: any;
  error?: string;
}

export interface OrganizerDataResponse {
  rounds: RoundConfig[];
  questions: Question[];
  participants: ParticipantSession[];
  serverTime: string;
  error?: string;
}

export const apiClient = {
  // 1. Register or Retrieve Locked Team
  async registerTeam(teamName: string): Promise<RegisterTeamResponse> {
    const cleanName = teamName.trim();
    if (!cleanName) {
      return { success: false, error: 'Team Name is required.' };
    }

    try {
      const res = await fetch(`${API_BASE}/teams/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName: cleanName })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to register team.' };
        }
        if (data.team) {
          const teams = getLocalData<Record<string, any>>(LOCAL_STORAGE_KEYS.TEAMS, {});
          teams[data.team.id] = data.team;
          saveLocalData(LOCAL_STORAGE_KEYS.TEAMS, teams);
        }
        return data;
      }

      // If backend returned non-JSON (e.g. Vercel 404 HTML), seamlessly fall back to local mode
      console.warn('[ApiClient] Backend returned non-JSON response. Activating local session mode.');
      return this.localRegisterTeam(cleanName);
    } catch (err: any) {
      console.warn('[ApiClient] Network error connecting to backend. Activating local session mode:', err.message);
      return this.localRegisterTeam(cleanName);
    }
  },

  localRegisterTeam(cleanName: string): RegisterTeamResponse {
    const teams = getLocalData<Record<string, any>>(LOCAL_STORAGE_KEYS.TEAMS, {});
    const existing = Object.values(teams).find(
      (t: any) => t.teamName && t.teamName.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return { success: true, isExisting: true, team: existing };
    }

    const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const teamId = `team-${Date.now()}-${randStr}`;
    const newTeam = {
      id: teamId,
      eventId: 'evt-bugwest-2026',
      teamName: cleanName,
      locked: true,
      createdAt: new Date().toISOString()
    };

    teams[teamId] = newTeam;
    saveLocalData(LOCAL_STORAGE_KEYS.TEAMS, teams);
    return { success: true, isExisting: false, team: newTeam };
  },

  // 2. Verify Common Round Code
  async verifyRoundCode(teamId: string, joinCode: string): Promise<VerifyCodeResponse> {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Bugfest code is required.' };
    }

    try {
      const res = await fetch(`${API_BASE}/rounds/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, joinCode: cleanCode })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Invalid round code.' };
        }
        return data;
      }

      // Backend returned non-JSON (e.g. Vercel 404 HTML) -> fallback to local validation
      console.warn('[ApiClient] Backend verify-code returned non-JSON. Fallback to local code validation.');
      return this.localVerifyCode(cleanCode);
    } catch (err: any) {
      console.warn('[ApiClient] Network error verifying code. Fallback to local code validation:', err.message);
      return this.localVerifyCode(cleanCode);
    }
  },

  localVerifyCode(cleanCode: string): VerifyCodeResponse {
    const storedRounds = getLocalData<RoundConfig[] | null>(LOCAL_STORAGE_KEYS.ROUNDS, null)
      || getLocalData<RoundConfig[] | null>('gencraft_bugfest_rounds_v5', null);
    const storedCode = (storedRounds?.[0]?.bugfestCode || storedRounds?.[0]?.joinCode || 'BF-R1-8K9M3P').toUpperCase();

    if (cleanCode !== storedCode) {
      return {
        success: false,
        error: 'Invalid Bugfest Code. Please enter the active code provided by the organizer.'
      };
    }

    const defaultRound: RoundConfig = {
      roundId: 1,
      title: 'ROUND 1 - BugFest Technical Arena',
      subtitle: 'Championship Debugging Arena',
      description: 'Find basic syntax flaws, uninitialized variables, indentation errors, and logic bugs in C & Python.',
      durationMinutes: 30,
      totalMarks: 35,
      questionCount: 7,
      status: 'active',
      allowedLanguage: 'all',
      bugfestCode: storedCode,
      joinCode: storedCode
    };

    return {
      success: true,
      round: storedRounds?.[0] || defaultRound,
      teamRound: {
        roundId: 1,
        status: 'joined',
        score: 0
      }
    };
  },

  // 3. Fetch all rounds
  async fetchRounds(): Promise<{ rounds: RoundConfig[]; serverTime: string }> {
    try {
      const res = await fetch(`${API_BASE}/rounds`);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') && res.ok) {
        return await res.json();
      }
      return { rounds: [], serverTime: new Date().toISOString() };
    } catch {
      return { rounds: [], serverTime: new Date().toISOString() };
    }
  },

  // 4. Update round
  async updateRound(roundId: number, updates: any): Promise<{ success: boolean; round?: RoundConfig; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/rounds/${roundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to update round.' };
        }
        return data;
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  // 5. Submit Question Answer
  async submitAnswer(payload: {
    teamId: string;
    roundId: number;
    questionId: string;
    code: string;
    passedCases: number;
    totalCases: number;
    score: number;
    status: string;
  }): Promise<{ success: boolean; answer?: any; roundScore?: number; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to submit answer.' };
        }
        return data;
      }
      return { success: true, roundScore: payload.score };
    } catch {
      return { success: true, roundScore: payload.score };
    }
  },

  // 6. Complete Round for Team
  async completeRound(teamId: string, roundId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/rounds/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, roundId })
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  // 7. Fetch Live Leaderboard
  async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') && res.ok) {
        const data = await res.json();
        return data.leaderboard || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  // 8. Fetch Full Organizer Data
  async fetchOrganizerData(): Promise<OrganizerDataResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/organizer/data`);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') && res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  // 9. Fetch Official Server Clock
  async fetchServerTime(): Promise<{ serverTime: string; timestamp: number }> {
    try {
      const res = await fetch(`${API_BASE}/server-time`);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') && res.ok) {
        return await res.json();
      }
      return { serverTime: new Date().toISOString(), timestamp: Date.now() };
    } catch {
      return { serverTime: new Date().toISOString(), timestamp: Date.now() };
    }
  }
};
