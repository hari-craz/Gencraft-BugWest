const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper function to generate unique team ID
function generateTeamId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `team-${Date.now()}-${rand}`;
}

// ----------------------------------------------------
// 1. SERVER TIME & HEALTH
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

app.get('/api/server-time', (req, res) => {
  res.json({
    serverTime: new Date().toISOString(),
    timestamp: Date.now()
  });
});

// ----------------------------------------------------
// 2. TEAM REGISTRATION (PERMANENT & LOCKED)
// ----------------------------------------------------
app.post('/api/teams/register', (req, res) => {
  try {
    const { teamName } = req.body;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: 'Team Name is required.' });
    }

    const cleanName = teamName.trim();

    // Check if team already exists (case insensitive)
    const existing = db.prepare('SELECT * FROM teams WHERE LOWER(team_name) = LOWER(?)').get(cleanName);

    if (existing) {
      // Existing team found, return locked team record
      return res.json({
        success: true,
        isExisting: true,
        team: {
          id: existing.id,
          eventId: existing.event_id,
          teamName: existing.team_name,
          locked: Boolean(existing.locked),
          createdAt: existing.created_at
        }
      });
    }

    // Create new locked team
    const newTeamId = generateTeamId();
    const eventId = 'evt-bugwest-2026';
    
    db.prepare(`
      INSERT INTO teams (id, event_id, team_name, locked, created_at)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(newTeamId, eventId, cleanName);

    const createdTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(newTeamId);

    return res.json({
      success: true,
      isExisting: false,
      team: {
        id: createdTeam.id,
        eventId: createdTeam.event_id,
        teamName: createdTeam.team_name,
        locked: true,
        createdAt: createdTeam.created_at
      }
    });
  } catch (err) {
    console.error('Error in /api/teams/register:', err);
    res.status(500).json({ error: 'Failed to register team.' });
  }
});

// Reject any attempt to modify a locked team name
app.put('/api/teams/:id', (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  if (team.locked) {
    return res.status(403).json({ error: 'Team Name is locked in the database and cannot be modified.' });
  }
  res.status(403).json({ error: 'Team Name modification is prohibited.' });
});

// ----------------------------------------------------
// 3. ROUND CODES & JOINING
// ----------------------------------------------------
app.post('/api/rounds/verify-code', (req, res) => {
  try {
    const { teamId, joinCode } = req.body;
    if (!joinCode || !joinCode.trim()) {
      return res.status(400).json({ error: 'Round join code is required.' });
    }

    const cleanCode = joinCode.trim().toUpperCase();

    // Verify round code against database
    const round = db.prepare('SELECT * FROM rounds WHERE UPPER(join_code) = ?').get(cleanCode);

    if (!round) {
      return res.status(400).json({ error: 'Invalid Bugfest Round Code. Please verify with the event coordinator.' });
    }

    if (round.status === 'finished') {
      return res.status(400).json({ error: 'This round has been finished. No new participants can log in.' });
    }

    if (round.status === 'locked') {
      return res.status(400).json({ error: `Round ${round.round_number} is currently locked by the organizer.` });
    }

    // Verify team exists if teamId provided
    let team = null;
    if (teamId) {
      team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    }

    if (teamId && !team) {
      return res.status(404).json({ error: 'Team record not found in database.' });
    }

    let teamRound = null;
    if (team) {
      // Associate team with round in team_rounds table
      const existingTR = db.prepare('SELECT * FROM team_rounds WHERE team_id = ? AND round_id = ?').get(team.id, round.id);

      if (!existingTR) {
        const trId = `tr-${team.id}-${round.id}`;
        db.prepare(`
          INSERT INTO team_rounds (id, team_id, round_id, joined_at, status, score, started_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'joined', 0, CURRENT_TIMESTAMP)
        `).run(trId, team.id, round.id);
      }
      teamRound = db.prepare('SELECT * FROM team_rounds WHERE team_id = ? AND round_id = ?').get(team.id, round.id);
    }

    return res.json({
      success: true,
      round: {
        roundId: round.id,
        roundNumber: round.round_number,
        title: round.round_name,
        joinCode: round.join_code,
        durationMinutes: round.duration_minutes,
        status: round.status,
        startTime: round.start_time,
        endTime: round.end_time
      },
      teamRound: teamRound ? {
        id: teamRound.id,
        teamId: teamRound.team_id,
        roundId: teamRound.round_id,
        joinedAt: teamRound.joined_at,
        status: teamRound.status,
        score: teamRound.score,
        startedAt: teamRound.started_at,
        submittedAt: teamRound.submitted_at
      } : null
    });
  } catch (err) {
    console.error('Error in /api/rounds/verify-code:', err);
    res.status(500).json({ error: 'Failed to verify round code.' });
  }
});

// ----------------------------------------------------
// 4. ROUND MANAGEMENT & SCHEDULE
// ----------------------------------------------------
app.get('/api/rounds', (req, res) => {
  try {
    const rounds = db.prepare('SELECT * FROM rounds ORDER BY round_number ASC').all();

    const formatted = rounds.map(r => {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as joinedCount,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgressCount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCount,
          AVG(score) as avgScore
        FROM team_rounds 
        WHERE round_id = ?
      `).get(r.id);

      return {
        roundId: r.id,
        roundNumber: r.round_number,
        title: r.round_name,
        joinCode: r.join_code,
        durationMinutes: r.duration_minutes,
        status: r.status,
        startTime: r.start_time,
        endTime: r.end_time,
        joinedCount: stats.joinedCount || 0,
        inProgressCount: stats.inProgressCount || 0,
        completedCount: stats.completedCount || 0,
        avgScore: Math.round(stats.avgScore || 0)
      };
    });

    res.json({ rounds: formatted, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error('Error fetching rounds:', err);
    res.status(500).json({ error: 'Failed to fetch rounds.' });
  }
});

// Organizer Round Control (Start, Pause, Lock, Update Join Code, Set Times)
app.patch('/api/rounds/:id', (req, res) => {
  try {
    const roundId = parseInt(req.params.id, 10);
    const { action, status, durationMinutes, joinCode, startTime, endTime } = req.body;

    const currentRound = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);
    if (!currentRound) {
      return res.status(404).json({ error: 'Round not found.' });
    }

    let newStatus = currentRound.status;
    let newStartTime = currentRound.start_time;
    let newEndTime = currentRound.end_time;
    let newDuration = currentRound.duration_minutes;
    let newJoinCode = currentRound.join_code;

    if (durationMinutes !== undefined && durationMinutes > 0) {
      newDuration = durationMinutes;
    }

    if (joinCode && joinCode.trim()) {
      newJoinCode = joinCode.trim().toUpperCase();
    }

    if (action === 'start') {
      newStatus = 'active';
      const now = new Date();
      newStartTime = startTime || now.toISOString();
      newEndTime = endTime || new Date(now.getTime() + newDuration * 60 * 1000).toISOString();
    } else if (action === 'finish') {
      newStatus = 'finished';
    } else if (action === 'end' || action === 'complete') {
      newStatus = 'completed';
    } else if (action === 'lock') {
      newStatus = 'locked';
    } else if (action === 'ready') {
      newStatus = 'ready';
    } else if (status) {
      newStatus = status;
    }

    db.prepare(`
      UPDATE rounds 
      SET status = ?, start_time = ?, end_time = ?, duration_minutes = ?, join_code = ?
      WHERE id = ?
    `).run(newStatus, newStartTime, newEndTime, newDuration, newJoinCode, roundId);

    const updated = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);

    res.json({
      success: true,
      round: {
        roundId: updated.id,
        roundNumber: updated.round_number,
        title: updated.round_name,
        joinCode: updated.join_code,
        durationMinutes: updated.duration_minutes,
        status: updated.status,
        startTime: updated.start_time,
        endTime: updated.end_time
      }
    });
  } catch (err) {
    console.error('Error updating round:', err);
    res.status(500).json({ error: 'Failed to update round.' });
  }
});

// ----------------------------------------------------
// 5. QUESTIONS PER ROUND
// ----------------------------------------------------
app.get('/api/rounds/:id/questions', (req, res) => {
  try {
    const roundId = parseInt(req.params.id, 10);
    const questions = db.prepare('SELECT * FROM questions WHERE round = ? ORDER BY id ASC').all(roundId);

    const formatted = questions.map(q => ({
      id: q.id,
      round: q.round,
      title: q.title,
      language: q.language,
      difficulty: q.difficulty,
      points: q.points,
      bugDescription: q.bug_description,
      buggyCode: q.buggy_code,
      hint: q.hint,
      testCases: JSON.parse(q.test_cases || '[]')
    }));

    res.json({ questions: formatted });
  } catch (err) {
    console.error('Error fetching round questions:', err);
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

app.get('/api/questions', (req, res) => {
  try {
    const questions = db.prepare('SELECT * FROM questions ORDER BY round ASC, id ASC').all();
    const formatted = questions.map(q => ({
      id: q.id,
      round: q.round,
      title: q.title,
      language: q.language,
      difficulty: q.difficulty,
      points: q.points,
      bugDescription: q.bug_description,
      buggyCode: q.buggy_code,
      hint: q.hint,
      testCases: JSON.parse(q.test_cases || '[]')
    }));
    res.json({ questions: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

// ----------------------------------------------------
// 6. SUBMISSIONS & SCORES PER TEAM & ROUND
// ----------------------------------------------------
app.post('/api/submissions', (req, res) => {
  try {
    const { teamId, roundId, questionId, code, passedCases, totalCases, score, status } = req.body;

    if (!teamId || !roundId || !questionId) {
      return res.status(400).json({ error: 'teamId, roundId, and questionId are required.' });
    }

    // Server-side validation of official round timer
    const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);
    
    if (round && round.status === 'finished') {
      return res.status(400).json({ error: 'Round is finished. Submissions are no longer accepted.' });
    }
    
    if (round && round.end_time) {
      const nowMs = Date.now();
      const endMs = new Date(round.end_time).getTime();
      // Grace period of 10 seconds for network latency
      if (nowMs > endMs + 10000) {
        return res.status(400).json({ error: 'Round duration has ended. Submissions are no longer accepted for this round.' });
      }
    }

    const answerId = `ans-${teamId}-${roundId}-${questionId}`;
    const cleanScore = typeof score === 'number' ? score : 0;
    const cleanStatus = status || (passedCases === totalCases ? 'Passed' : 'Failed');

    // Upsert into answers table
    db.prepare(`
      INSERT INTO answers (id, team_id, round_id, question_id, code, passed_cases, total_cases, score, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(team_id, round_id, question_id) DO UPDATE SET
        code = excluded.code,
        passed_cases = excluded.passed_cases,
        total_cases = excluded.total_cases,
        score = excluded.score,
        status = excluded.status,
        submitted_at = CURRENT_TIMESTAMP
    `).run(answerId, teamId, roundId, questionId, code || '', passedCases || 0, totalCases || 0, cleanScore, cleanStatus);

    // Calculate total score for team in this round
    const totalRoundScoreObj = db.prepare(`
      SELECT SUM(score) as totalScore FROM answers WHERE team_id = ? AND round_id = ?
    `).get(teamId, roundId);

    const totalRoundScore = totalRoundScoreObj.totalScore || 0;

    // Update team_rounds record
    const trId = `tr-${teamId}-${roundId}`;
    db.prepare(`
      INSERT INTO team_rounds (id, team_id, round_id, status, score, started_at)
      VALUES (?, ?, ?, 'in_progress', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(team_id, round_id) DO UPDATE SET
        score = excluded.score,
        status = CASE WHEN status = 'completed' THEN 'completed' ELSE 'in_progress' END
    `).run(trId, teamId, roundId, totalRoundScore);

    return res.json({
      success: true,
      answer: {
        id: answerId,
        teamId,
        roundId,
        questionId,
        code,
        passedCases,
        totalCases,
        score: cleanScore,
        status: cleanStatus
      },
      roundScore: totalRoundScore
    });
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ error: 'Failed to record submission.' });
  }
});

// Complete round for team
app.post('/api/rounds/complete', (req, res) => {
  try {
    const { teamId, roundId } = req.body;
    if (!teamId || !roundId) {
      return res.status(400).json({ error: 'teamId and roundId are required.' });
    }

    db.prepare(`
      UPDATE team_rounds
      SET status = 'completed', submitted_at = CURRENT_TIMESTAMP
      WHERE team_id = ? AND round_id = ?
    `).run(teamId, roundId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete round.' });
  }
});

// ----------------------------------------------------
// 7. LEADERBOARD & ORGANIZER DASHBOARD DATA
// ----------------------------------------------------
app.get('/api/leaderboard', (req, res) => {
  try {
    const teams = db.prepare('SELECT * FROM teams ORDER BY created_at ASC').all();

    const leaderboard = teams.map((team, idx) => {
      const r1 = db.prepare('SELECT * FROM team_rounds WHERE team_id = ? AND round_id = 1').get(team.id);
      const r2 = db.prepare('SELECT * FROM team_rounds WHERE team_id = ? AND round_id = 2').get(team.id);
      const r3 = db.prepare('SELECT * FROM team_rounds WHERE team_id = ? AND round_id = 3').get(team.id);

      const r1Score = r1 ? r1.score : 0;
      const r2Score = r2 ? r2.score : 0;
      const r3Score = r3 ? r3.score : 0;
      const totalScore = r1Score + r2Score + r3Score;

      const solvedCount = db.prepare(`
        SELECT COUNT(*) as cnt FROM answers WHERE team_id = ? AND status = 'Passed'
      `).get(team.id).cnt;

      return {
        userId: team.id,
        teamName: team.team_name,
        college: 'BUGWEST Participant',
        round1Score: r1Score,
        round2Score: r2Score,
        round3Score: r3Score,
        totalScore,
        questionsSolved: solvedCount,
        timeUsedMinutes: 0,
        status: (r1 && r1.status === 'completed' && r2 && r2.status === 'completed' && r3 && r3.status === 'completed') ? 'Completed' : 'Active',
        rank: idx + 1
      };
    });

    // Sort by totalScore DESC
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    leaderboard.forEach((entry, idx) => entry.rank = idx + 1);

    res.json({ leaderboard });
  } catch (err) {
    console.error('Error generating leaderboard:', err);
    res.status(500).json({ error: 'Failed to generate leaderboard.' });
  }
});

app.get('/api/organizer/data', (req, res) => {
  try {
    const rounds = db.prepare('SELECT * FROM rounds ORDER BY round_number ASC').all();
    const questions = db.prepare('SELECT * FROM questions ORDER BY round ASC, id ASC').all();
    const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
    const teamRounds = db.prepare('SELECT * FROM team_rounds').all();
    const answers = db.prepare('SELECT * FROM answers').all();

    const formattedRounds = rounds.map(r => {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as joinedCount,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgressCount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCount,
          AVG(score) as avgScore
        FROM team_rounds 
        WHERE round_id = ?
      `).get(r.id);

      return {
        roundId: r.id,
        roundNumber: r.round_number,
        title: r.round_name,
        joinCode: r.join_code,
        durationMinutes: r.duration_minutes,
        status: r.status,
        startTime: r.start_time,
        endTime: r.end_time,
        joinedCount: stats.joinedCount || 0,
        inProgressCount: stats.inProgressCount || 0,
        completedCount: stats.completedCount || 0,
        avgScore: Math.round(stats.avgScore || 0)
      };
    });

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      round: q.round,
      title: q.title,
      language: q.language,
      difficulty: q.difficulty,
      points: q.points,
      bugDescription: q.bug_description,
      buggyCode: q.buggy_code,
      hint: q.hint,
      testCases: JSON.parse(q.test_cases || '[]')
    }));

    const participantSessions = teams.map(team => {
      const trs = teamRounds.filter(tr => tr.team_id === team.id);
      const teamAns = answers.filter(a => a.team_id === team.id);

      const roundScores = {
        1: trs.find(t => t.round_id === 1)?.score || 0,
        2: trs.find(t => t.round_id === 2)?.score || 0,
        3: trs.find(t => t.round_id === 3)?.score || 0,
      };

      const roundCompleted = {
        1: trs.find(t => t.round_id === 1)?.status === 'completed',
        2: trs.find(t => t.round_id === 2)?.status === 'completed',
        3: trs.find(t => t.round_id === 3)?.status === 'completed',
      };

      const submissionsObj = {};
      teamAns.forEach(a => {
        submissionsObj[a.question_id] = {
          id: a.id,
          questionId: a.question_id,
          round: a.round_id,
          code: a.code,
          result: a.status,
          passCount: a.passed_cases,
          totalCount: a.total_cases,
          pointsEarned: a.score,
          submittedAt: a.submitted_at
        };
      });

      const totalScore = roundScores[1] + roundScores[2] + roundScores[3];

      return {
        userId: team.id,
        teamName: team.team_name,
        locked: Boolean(team.locked),
        createdAt: team.created_at,
        currentRound: 1,
        status: 'Active',
        totalScore,
        roundScores,
        roundCompleted,
        submissions: submissionsObj
      };
    });

    res.json({
      rounds: formattedRounds,
      questions: formattedQuestions,
      participants: participantSessions,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching organizer data:', err);
    res.status(500).json({ error: 'Failed to fetch organizer data.' });
  }
});

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BUGWEST Backend API] Listening on http://0.0.0.0:${PORT}`);
});
