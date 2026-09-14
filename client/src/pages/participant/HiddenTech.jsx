import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import api from '../../utils/api';
import CountdownTimer from '../../components/CountdownTimer';
import ConfirmDialog from '../../components/ConfirmDialog';
import TestModeGuard from '../../components/TestModeGuard';
import { 
  IconLock, 
  IconUnlock, 
  IconLightbulb, 
  IconShield, 
  IconSwords, 
  IconCheck, 
  IconCastle 
} from '../../components/FantasyIcons';

const ParticipantHiddenTech = () => {
  const [questions, setQuestions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [currentQ, setCurrentQ] = useState(null);
  const [status, setStatus] = useState(null);
  const [answers, setAnswers] = useState({});
  const [finalOutput, setFinalOutput] = useState('');
  const [submittingSubId, setSubmittingSubId] = useState(null);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeHintSubId, setActiveHintSubId] = useState(null);
  const [showFinishEventModal, setShowFinishEventModal] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleFinishEvent = async () => {
    try {
      await api.post('/participant/event/submit');
      toast.success('Your Crack the Code battle has been submitted and recorded successfully!');
      setShowFinishEventModal(false);
      navigate('/participant/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to finalize battle submission');
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get('/participant/event/status');
      setStatus(prev => ({
        ...(prev || {}),
        ...res.data,
        expires_at: res.data?.expires_at || prev?.expires_at || null,
        start_time: res.data?.start_time || prev?.start_time || null,
        server_time: res.data?.server_time || prev?.server_time || null
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async (preferredId = null) => {
    try {
      const res = await api.get('/participant/hidden-tech/questions');
      setQuestions(res.data);
      if (res.data.length > 0) {
        const nextId = preferredId || (activeId && res.data.some(q => q.id === activeId) ? activeId : res.data[0].id);
        loadQuestion(nextId);
      }
    } catch (err) {
      toast.error('Failed to load Crack the Code questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchQuestions();
  }, []);

  const loadQuestion = async (id) => {
    try {
      setActiveId(id);
      const res = await api.get(`/participant/hidden-tech/questions/${id}`);
      setCurrentQ(res.data);

      // Keep existing text inputs if user already typed, or empty
      const existingAnswers = { ...answers };
      (res.data.sub_questions || []).forEach(sq => {
        if (existingAnswers[sq.id] === undefined) {
          existingAnswers[sq.id] = '';
        }
      });
      setAnswers(existingAnswers);
    } catch (err) {
      toast.error('Failed to load question details');
    }
  };

  const handleSubAnswerChange = (subId, val) => {
    setAnswers(prev => ({ ...prev, [subId]: val }));
  };

  const submitSubAnswer = async (subId) => {
    const val = (answers[subId] || '').trim();
    if (!val) {
      toast.error('Please enter an answer before submitting.');
      return;
    }
    setSubmittingSubId(subId);
    try {
      await api.post(`/participant/hidden-tech/questions/${activeId}/sub/${subId}/submit`, {
        answer: val,
      });
      toast.success('Sub-question answer recorded.');
      // Refresh current question state and question list to update counts
      await loadQuestion(activeId);
      await fetchQuestions(activeId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmittingSubId(null);
    }
  };

  const submitFinalOutput = async (e) => {
    e.preventDefault();
    const val = finalOutput.trim();
    if (!val) {
      toast.error('Please enter the final output.');
      return;
    }
    setSubmittingFinal(true);
    try {
      await api.post(`/participant/hidden-tech/questions/${activeId}/final-output`, {
        final_output: val,
      });
      toast.success('Final output submitted.');
      await loadQuestion(activeId);
      await fetchQuestions(activeId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit final output');
    } finally {
      setSubmittingFinal(false);
    }
  };

  const confirmHint = async () => {
    if (!activeHintSubId) return;
    try {
      const res = await api.post(`/participant/hidden-tech/questions/${activeId}/sub/${activeHintSubId}/hint`);
      setActiveHintSubId(null);
      if (res.data.hint) {
        toast.info(`Hint: ${res.data.hint}`);
      } else {
        toast.info(res.data.error || 'No hint available');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to get hint');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Crack the Code...</div>;

  const subQuestions = currentQ?.sub_questions || [];
  const allAttempted = currentQ?.all_attempted || (subQuestions.length > 0 && subQuestions.every(s => s.is_attempted));
  const hasFinalOutput = !!currentQ?.has_final_output;

  return (
    <TestModeGuard
      eventName="Crack the Code"
      onSessionLoaded={(sess) => {
        if (sess) {
          setStatus(prev => ({
            ...(prev || {}),
            status: sess.status === 'ACTIVE' ? 'live' : (prev?.status || 'live'),
            server_time: sess.server_time || (prev?.server_time),
            start_time: sess.startedAt || (prev?.start_time),
            expires_at: sess.expiresAt || (prev?.expires_at),
            remaining_seconds: sess.remaining_seconds !== undefined ? sess.remaining_seconds : (prev?.remaining_seconds)
          }));
        }
      }}
      onSessionExpired={() => {
        fetchStatus();
        toast.error("TIME'S UP! The battle has concluded.");
      }}
      onSessionTerminated={() => {
        fetchStatus();
      }}
    >
      <div className="flex-grow flex flex-col h-[calc(100vh-4rem)] bg-stone-950 overflow-hidden font-sans">
      {/* Top Bar with Question Selection & Battle Timer */}
      <div className="bg-stone-900/90 border-b border-stone-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 z-10 shadow-md">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <button
            onClick={() => navigate('/participant/dashboard')}
            className="btn-secondary text-xs px-3 py-1.5 shrink-0 font-clash uppercase tracking-wider flex items-center gap-1.5"
            title="Return to Clan Camp"
          >
            <IconCastle className="w-3.5 h-3.5 text-amber-400" />
            <span>Clan Camp</span>
          </button>
          <div className="h-5 w-px bg-stone-700 mx-1"></div>
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => loadQuestion(q.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-clash tracking-wider transition-all flex items-center gap-2 ${
                activeId === q.id
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
              }`}
            >
              <IconShield className="w-3.5 h-3.5" />
              <span>Chamber {idx + 1}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                q.attempted_count === q.sub_question_count && q.sub_question_count > 0
                  ? 'bg-emerald-900/60 text-emerald-300'
                  : 'bg-stone-950 text-stone-400'
              }`}>
                {q.attempted_count}/{q.sub_question_count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <div className="w-52 shrink-0">
              <CountdownTimer
                serverTime={status.server_time}
                startTime={status.start_time}
                expiresAt={status.expires_at}
                timeLimitMinutes={status.time_limit_minutes}
                pauseDuration={status.pause_duration_seconds}
                eventStatus={status.status}
                onExpire={() => {
                  fetchStatus();
                  toast.error("TIME'S UP! The battle has concluded.");
                }}
              />
            </div>
          )}

          <button
            onClick={() => setShowFinishEventModal(true)}
            className="btn-danger text-xs px-3.5 py-2 font-bold uppercase tracking-wider shrink-0 shadow-md shadow-red-950/40"
            title="Finalize your clan's battle submission"
          >
            Submit Battle
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {currentQ ? (
        <div className="flex-grow overflow-y-auto bg-stone-950 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Main Question Title Header */}
            <div className="card-fortress border-amber-800/40 bg-stone-900/95 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-4 mb-4">
                <div>
                  <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3 py-0.5 rounded-full inline-block mb-1">
                    🏰 CODE FORTRESS &bull; CODE INVASION
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-amber-100 font-fantasy tracking-tight">
                    Challenge {currentQ.question_number}: {currentQ.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3.5 py-1 rounded-full bg-stone-950 border border-amber-900/60 font-mono text-amber-300 font-bold">
                    {subQuestions.filter(s => s.is_attempted).length} / {subQuestions.length} Defenses Breached
                  </span>
                </div>
              </div>
              <p className="text-sm text-stone-300 font-sans leading-relaxed">
                Invade the technical defenses below. Breaching each domain defense uncovers a component of the master fortress code. Once all domain defenses are breached, the Final Fortress Gate will unlock.
              </p>
            </div>

            {/* Sub-Questions List */}
            <div className="space-y-4">
              {subQuestions.map((sq, idx) => (
                <div
                  key={sq.id}
                  className={`card-fortress transition-all border-2 ${
                    sq.is_attempted
                      ? 'border-emerald-800/60 bg-stone-900/80'
                      : 'border-stone-800 bg-stone-900/95 hover:border-amber-700/60'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3 pb-2 border-b border-stone-800">
                    <div className="flex items-center gap-2.5">
                      <span className="font-fantasy text-sm font-bold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2.5 py-0.5 rounded">
                        Defense {currentQ.question_number}.{sq.sub_question_number || idx + 1}
                      </span>
                      <span className="text-xs font-extrabold px-3 py-0.5 rounded-full bg-stone-950 border border-amber-800/80 text-amber-300 font-sans tracking-wide flex items-center gap-1.5">
                        <IconShield className="w-3.5 h-3.5 text-amber-400" />
                        <span>{sq.domain}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-sans flex items-center gap-1 ${
                          sq.is_attempted
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600'
                            : 'bg-stone-950 text-stone-400 border border-stone-800'
                        }`}
                      >
                        {sq.is_attempted ? (
                          <>
                            <IconCheck className="w-3 h-3 text-emerald-400" />
                            <span>ATTEMPTED</span>
                          </>
                        ) : (
                          <span>NOT ATTEMPTED</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveHintSubId(sq.id)}
                        className="text-xs text-amber-400 hover:text-amber-300 px-2.5 py-0.5 bg-amber-950/50 border border-amber-800/60 rounded font-bold transition-colors flex items-center gap-1"
                        title="Request Battle Clue"
                      >
                        <IconLightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>Clue</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-stone-200 text-sm font-medium mb-4 whitespace-pre-wrap leading-relaxed font-sans">
                    {sq.question_text}
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field text-sm font-mono"
                      placeholder="Enter defense answer..."
                      value={answers[sq.id] || ''}
                      onChange={e => handleSubAnswerChange(sq.id, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitSubAnswer(sq.id);
                      }}
                    />
                    <button
                      type="button"
                      disabled={submittingSubId === sq.id}
                      onClick={() => submitSubAnswer(sq.id)}
                      className="btn-battle-blue text-xs px-5 whitespace-nowrap font-bold uppercase tracking-wider"
                    >
                      {submittingSubId === sq.id ? 'Attacking...' : sq.is_attempted ? 'Update' : 'Breach'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* FINAL OUTPUT SECTION: BREAK THE FINAL GATE */}
            <div
              className={`card-fortress border-2 transition-all p-6 ${
                allAttempted
                  ? 'border-amber-500/80 bg-stone-900/95 shadow-2xl shadow-amber-950/40'
                  : 'border-stone-800 bg-stone-950/70 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-stone-950 border border-amber-600/80">
                    {allAttempted ? (
                      <IconUnlock className="w-6 h-6 text-amber-400" />
                    ) : (
                      <IconLock className="w-6 h-6 text-stone-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-fantasy text-amber-200 tracking-wide">
                      {allAttempted ? 'BREAK THE FINAL GATE' : 'LOCKED FORTRESS GATE'}
                    </h3>
                    <p className="text-xs text-stone-400 font-sans">
                      Unlocks only after all domain defenses for Challenge {currentQ.question_number} are attempted.
                    </p>
                  </div>
                </div>

                {hasFinalOutput && (
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-600 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Final Output Breached</span>
                  </span>
                )}
              </div>

              {allAttempted ? (
                <form onSubmit={submitFinalOutput} className="space-y-4">
                  <div>
                    <label className="label text-xs uppercase tracking-wider text-amber-300 font-fantasy">
                      Enter Final Output
                    </label>
                    <input
                      type="text"
                      className="input-field text-base font-mono uppercase tracking-widest font-bold"
                      placeholder="ENTER DERIVED CODE / PASSWORD..."
                      value={finalOutput}
                      onChange={e => setFinalOutput(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
                    <span className="text-xs text-stone-400 font-sans">
                      Synthesize the solutions across technical domains to shatter the final gate.
                    </span>
                    <button
                      type="submit"
                      disabled={submittingFinal}
                      className="btn-battle-blue px-6 py-3 font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20"
                    >
                      {submittingFinal ? 'Breaching Gate...' : 'CRACK THE CODE'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="flex justify-center mb-2">
                    <IconLock className="w-8 h-8 text-stone-600" />
                  </div>
                  <p className="text-sm text-stone-400 font-bold font-fantasy">
                    The Fortress Gate is Sealed.
                  </p>
                  <p className="text-xs text-stone-500 mt-1 font-sans">
                    Breach all {subQuestions.length} domain defenses above to unlock the final gate.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-stone-500 font-sans">
          Select a battle challenge to begin invasion
        </div>
      )}

      {/* Hint Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!activeHintSubId}
        onClose={() => setActiveHintSubId(null)}
        onConfirm={confirmHint}
        title="Request Sub-Question Hint?"
        message="Are you sure you want to reveal the hint for this defense challenge?"
        confirmText="Reveal Hint"
        confirmStyle="warning"
      />

      {/* Overall Event Finish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showFinishEventModal}
        onClose={() => setShowFinishEventModal(false)}
        onConfirm={handleFinishEvent}
        title="Submit Crack the Code?"
        message="Your answers for all assigned chambers will be sealed and submitted. This cannot be changed afterward."
        confirmText="Submit Crack the Code"
        confirmStyle="danger"
      />
      </div>
    </TestModeGuard>
  );
};

export default ParticipantHiddenTech;
