import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import CountdownTimer from '../../components/CountdownTimer';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../utils/api';
import { 
  IconCastle, 
  IconSwords, 
  IconShield, 
  IconHammer, 
  IconTrophy, 
  IconCheck 
} from '../../components/FantasyIcons';

const ParticipantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const fetchData = async () => {
    try {
      const [dashRes, statusRes] = await Promise.all([
        api.get('/participant/dashboard'),
        api.get('/participant/event/status')
      ]);
      setData(dashRes.data);
      setStatus(statusRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFinalSubmit = async () => {
    try {
      await api.post('/participant/event/submit');
      toast.success('Your submission has been recorded successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit event');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading arena...</div>;
  if (!data || !status) return <div className="p-8 text-center text-red-400">Failed to load data</div>;

  const isSecondYear = user?.year === '2nd Year';
  const battleName = isSecondYear ? 'CODE SCRAMBLE' : 'CRACK THE CODE';
  const battleSubtitle = isSecondYear ? "Builder's Challenge" : 'Code Invasion';
  const eventPath = isSecondYear ? '/participant/code-scramble' : '/participant/hidden-tech';

  const evStatus = (status.status || data.event_status || '').toLowerCase();
  const isEventLive = evStatus === 'live' || evStatus === 'active';
  const isEventPaused = evStatus === 'paused';
  const isEventEnded = evStatus === 'ended';
  const isEventNotStarted = evStatus === 'not_started';
  const isTeamCompleted = data?.team?.status === 'completed';

  const questionsList = data.questions || [];

  // Available rounds for this team's academic year
  const defaultR1Id = isSecondYear ? 1 : 2;
  const defaultR2Id = isSecondYear ? 3 : 4;
  const activeEventId = parseInt(sessionStorage.getItem('tech_arena_active_event_id') || data.event_id || defaultR1Id, 10);

  const switchRound = (targetEventId) => {
    sessionStorage.setItem('tech_arena_active_event_id', targetEventId.toString());
    setLoading(true);
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-800 pb-6">
        <div>
          <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-2">
            🏰 CLAN CAMP &bull; CLASH OF CODES
          </span>
          <h1 className="text-3xl font-black text-amber-100 font-fantasy tracking-tight">
            Clan: {user?.team_name || data?.team_name}
          </h1>
          <p className="text-stone-400 text-sm mt-1 font-sans">
            Battle: <strong className="text-amber-400">{data.event_name || battleName}</strong> &mdash; {battleSubtitle}
          </p>
        </div>

        {isEventLive && !isTeamCompleted && (
          <button onClick={() => setShowSubmitConfirm(true)} className="btn-danger text-sm self-start sm:self-center font-bold tracking-wide flex items-center gap-2">
            <IconSwords className="w-4 h-4 text-white" />
            <span>Finish Battle</span>
          </button>
        )}
      </div>

      {/* Round Switcher Tabs */}
      <div className="mb-6 flex gap-3 border-b border-stone-800 pb-4 font-fantasy">
        <button
          onClick={() => switchRound(defaultR1Id)}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeEventId === defaultR1Id
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800 border border-stone-700'
          }`}
        >
          <span>⚔️ ROUND 1</span>
          <span className="text-xs font-mono font-normal">
            ({isSecondYear ? 'Code Scramble' : 'Crack the Code'})
          </span>
        </button>

        <button
          onClick={() => switchRound(defaultR2Id)}
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeEventId === defaultR2Id
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'bg-stone-900/80 text-stone-300 hover:bg-stone-800 border border-stone-700'
          }`}
        >
          <span>🔥 ROUND 2</span>
          <span className="text-xs font-mono font-normal">
            ({isSecondYear ? 'Code Scramble' : 'Crack the Code'})
          </span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card-fortress md:col-span-2">
          <h2 className="text-base font-bold text-amber-200 uppercase tracking-wider mb-4 border-b border-stone-800 pb-2 flex items-center justify-between font-fantasy">
            <span className="flex items-center gap-2">
              <IconShield className="w-4 h-4 text-amber-400" />
              <span>Clan Garrison</span>
            </span>
            <span className="text-xs text-stone-500 font-mono">ID: {user?.teamId || data?.team?.id}</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="text-stone-400 text-xs block uppercase tracking-wider mb-1 font-sans">Academic Year</span>
              <span className="text-amber-100 font-medium font-sans">{user?.year || data?.year}</span>
            </div>
            <div>
              <span className="text-stone-400 text-xs block uppercase tracking-wider mb-1 font-sans">Assigned Battle</span>
              <span className="text-amber-400 font-bold font-sans">{battleName} ({battleSubtitle})</span>
            </div>
            <div>
              <span className="text-stone-400 text-xs block uppercase tracking-wider mb-1 font-sans">Warrior 1</span>
              <span className="text-amber-50 font-medium font-sans">
                {data.team?.member_1_name || data.team?.p1_name || data.p1}
                {(data.team?.member_1_section || data.team?.p1_batch) ? (
                  <span className="text-stone-400 text-xs ml-2 font-mono">
                    (Sec {data.team?.member_1_section || data.team?.p1_batch})
                  </span>
                ) : ''}
              </span>
            </div>
            <div>
              <span className="text-stone-400 text-xs block uppercase tracking-wider mb-1 font-sans">Warrior 2</span>
              <span className="text-amber-50 font-medium font-sans">
                {(data.team?.member_2_name || data.team?.p2_name || data.p2) ? (
                  <>
                    {data.team?.member_2_name || data.team?.p2_name || data.p2}
                    {(data.team?.member_2_section || data.team?.p2_batch) ? (
                      <span className="text-stone-400 text-xs ml-2 font-mono">
                        (Sec {data.team?.member_2_section || data.team?.p2_batch})
                      </span>
                    ) : ''}
                  </>
                ) : (
                  <span className="text-stone-500">—</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <CountdownTimer 
            serverTime={status.server_time}
            startTime={status.start_time}
            expiresAt={status.expires_at || data.expires_at}
            timeLimitMinutes={status.time_limit_minutes || data.time_limit_minutes || data.time_limit}
            pauseDuration={status.pause_duration || status.pause_duration_seconds}
            eventStatus={status.status}
          />
          
          <div className="card-fortress flex-grow flex flex-col justify-center items-center text-center p-6">
            {isTeamCompleted ? (
              <div className="py-2 w-full space-y-3">
                <div className="flex justify-center mb-1">
                  <IconTrophy className="w-10 h-10 text-amber-400 filter drop-shadow" />
                </div>
                <div>
                  <p className="text-amber-400 font-bold font-fantasy text-lg">Battle Finished!</p>
                  <p className="text-stone-400 text-xs font-sans">Your clan's submissions have been sealed and recorded.</p>
                </div>

                <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 text-xs text-stone-300 space-y-2 font-mono text-left max-w-xs mx-auto">
                  <div className="flex justify-between border-b border-stone-800 pb-1.5">
                    <span className="text-stone-400 font-sans">Status:</span>
                    <span className="text-emerald-400 font-bold uppercase">Completed</span>
                  </div>
                  {data.final_score !== null && (
                    <div className="flex justify-between border-b border-stone-800 pb-1.5">
                      <span className="text-stone-400 font-sans">Final Score:</span>
                      <span className="text-amber-300 font-bold">{data.final_score} PTS</span>
                    </div>
                  )}
                  {data.time_used_seconds !== null && (
                    <div className="flex justify-between border-b border-stone-800 pb-1.5">
                      <span className="text-stone-400 font-sans">Time Used:</span>
                      <span className="text-stone-200 font-bold">
                        {Math.floor(data.time_used_seconds / 60)}m {data.time_used_seconds % 60}s
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-400 font-sans">Questions Solved:</span>
                    <span className="text-emerald-400 font-bold">
                      {data.questions_solved !== undefined ? data.questions_solved : 0} / {data.allocated_count || questionsList.length || 5}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isEventNotStarted && <p className="text-stone-400 text-sm mb-4 font-sans">The battle horn has not sounded yet.</p>}
                {isEventPaused && <p className="text-amber-400 text-sm mb-4 font-sans">Battle temporarily paused.</p>}
                {isEventEnded && <p className="text-red-400 text-sm mb-4 font-sans">Battle has concluded.</p>}
                {isEventLive && <p className="text-emerald-400 text-sm font-semibold mb-4 font-sans flex items-center gap-1.5"><IconSwords className="w-4 h-4 text-emerald-400" /> Battle is LIVE!</p>}

                <button 
                  onClick={() => navigate(eventPath)}
                  disabled={!isEventLive}
                  className={`w-full py-3.5 text-base uppercase tracking-wider font-black ${
                    isSecondYear ? 'btn-battle-red' : 'btn-battle-blue'
                  }`}
                >
                  ENTER {battleName} →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card-fortress relative">
        <span className="rivet absolute top-3 left-3"></span>
        <span className="rivet absolute top-3 right-3"></span>

        <div className="flex justify-between items-center mb-6 border-b border-stone-800 pb-3">
          <div>
            <h2 className="text-xl font-black text-amber-100 font-clash tracking-wide uppercase">Battle Challenges</h2>
            <p className="text-xs text-stone-400 mt-0.5 font-sans">Attack challenges in any order. Each challenge is independently scored.</p>
          </div>
          <span className="text-xs px-3.5 py-1 rounded-full bg-stone-900 border border-amber-800/80 font-mono text-amber-300 font-bold">
            Attempted: {data.attempted_count} / {data.allocated_count || questionsList.length}
          </span>
        </div>
        
        {questionsList.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-sm font-sans">
            Battle challenges will be unlocked once the battle begins.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {questionsList.map((q, idx) => (
              <div 
                key={q.id} 
                onClick={() => isEventLive && !isTeamCompleted && navigate(eventPath)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  q.attempted 
                    ? 'bg-gradient-to-b from-[#09331e] to-[#041c10] border-emerald-500/80 hover:border-emerald-400 shadow-md shadow-emerald-950/50' 
                    : 'bg-gradient-to-b from-[#20150d] to-[#120a06] border-[#5c371f] hover:border-amber-500/80 shadow-md'
                } flex flex-col items-center justify-center text-center`}
              >
                <span className="text-xl font-black font-clash text-amber-200 mb-1 flex items-center gap-1.5">
                  {isSecondYear ? <IconHammer className="w-4 h-4 text-amber-400" /> : <IconShield className="w-4 h-4 text-blue-400" />}
                  <span>Q{idx + 1}</span>
                </span>
                <span className="text-xs text-stone-300 truncate max-w-full mb-2 font-medium font-sans">{q.title}</span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-clash flex items-center gap-1 ${
                  q.attempted ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500' : 'bg-black/50 text-stone-400 border border-stone-800'
                }`}>
                  {q.attempted ? (
                    <>
                      <IconCheck className="w-3 h-3 text-emerald-400" />
                      <span>Attempted</span>
                    </>
                  ) : (
                    <span>Not Attempted</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleFinalSubmit}
        title="Finish Battle?"
        message="Are you ready to conclude your clan's battle? All saved and submitted answers will be sealed."
        confirmText="Yes, Finish Battle"
      />
    </div>
  );
};

export default ParticipantDashboard;
