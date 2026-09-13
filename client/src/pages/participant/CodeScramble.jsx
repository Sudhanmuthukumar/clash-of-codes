import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import api from '../../utils/api';
import CountdownTimer from '../../components/CountdownTimer';
import ConfirmDialog from '../../components/ConfirmDialog';
import { 
  IconHammer, 
  IconStar, 
  IconLock, 
  IconCheck, 
  IconSwords, 
  IconCastle, 
  IconLightbulb,
  IconSwap 
} from '../../components/FantasyIcons';

const ScrambleLine = ({ 
  line, 
  index, 
  isCorrectPosition, 
  isSelected, 
  isLocked, 
  isEventEnded,
  onLineClick,
}) => {
  const isDisabled = isLocked || isEventEnded;

  let containerClass = 'bg-gradient-to-r from-[#20150d] via-[#1a100a] to-[#140b07] border-2 border-[#5c371f] hover:border-amber-500/80 shadow-md';
  if (isSelected) {
    containerClass = 'bg-gradient-to-r from-[#4d2d14] via-[#3a200e] to-[#2b170a] border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] ring-2 ring-amber-400 text-amber-100';
  } else if (isCorrectPosition) {
    containerClass = 'bg-gradient-to-r from-[#06331e] via-[#094127] to-[#042415] border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-emerald-100 solved-glow';
  }

  return (
    <div
      onClick={() => {
        if (!isDisabled) onLineClick(index);
      }}
      className={`flex items-stretch rounded-xl transition-colors duration-150 mb-2.5 overflow-hidden select-none border-b-4 relative ${
        isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-amber-400/90'
      } ${
        isSelected
          ? 'border-b-amber-400'
          : isCorrectPosition 
          ? 'border-b-emerald-700' 
          : 'border-b-[#0e0704]'
      } ${containerClass}`}
      title={
        isEventEnded 
          ? 'Event ended' 
          : isLocked 
          ? 'Points pool exhausted (0 pts) - swaps locked' 
          : isSelected 
          ? 'Line selected. Click another line to swap (-1 pt), or click again to deselect.' 
          : 'Click to select line for swap (-1 pt).'
      }
    >
      {/* Tactical Builder Swap Icon Tile */}
      <div
        className={`px-3.5 py-3 flex items-center justify-center bg-black/40 border-r border-[#452814] text-amber-200/70 transition-colors ${
          isDisabled ? 'cursor-not-allowed opacity-30' : 'hover:text-amber-300 hover:bg-black/60'
        }`}
        title={isSelected ? 'Selected for swap' : 'Click to select / swap (-1 pt)'}
      >
        <IconSwap className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300 animate-pulse' : 'text-amber-400/60'}`} />
      </div>

      {/* Carved Fixed Slot Number Tile */}
      <div className={`px-3.5 py-3 font-mono text-xs bg-black/30 select-none border-r border-[#452814] min-w-[2.75rem] text-center flex items-center justify-center font-bold ${
        isSelected ? 'text-amber-200 font-black bg-amber-900/60' : isCorrectPosition ? 'text-emerald-300 font-black' : 'text-amber-400'
      }`}>
        {index + 1}
      </div>

      {/* Code Text with JetBrains Mono */}
      <div className="flex-grow p-3 font-mono text-sm text-stone-100 overflow-x-auto whitespace-pre font-medium">
        {line.content}
      </div>

      {/* Selection Feedback Badge */}
      {isSelected && (
        <div className="px-3.5 py-1 flex items-center gap-1.5 text-amber-200 text-xs font-black bg-amber-900/90 border-l-2 border-amber-400 uppercase tracking-wider font-clash shadow-inner animate-pulse">
          <IconSwap className="w-3.5 h-3.5 text-amber-300" />
          <span>SWAP READY</span>
        </div>
      )}

      {/* Correct Position Status Badge */}
      {!isSelected && isCorrectPosition && (
        <div className="px-3.5 py-1 flex items-center gap-1.5 text-emerald-300 text-xs font-black bg-emerald-900/80 border-l-2 border-emerald-500 uppercase tracking-wider font-clash shadow-inner">
          <span className="text-sm">✓</span>
          <span>CORRECT</span>
        </div>
      )}
    </div>
  );
};

const ParticipantCodeScramble = () => {
  const [questions, setQuestions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [currentQ, setCurrentQ] = useState(null);
  const [lines, setLines] = useState([]); // [{ id, content, origIndex }]
  const [correctPositions, setCorrectPositions] = useState([]);
  const [startingPoints, setStartingPoints] = useState(100);
  const [currentPoints, setCurrentPoints] = useState(100);
  const [swapsCount, setSwapsCount] = useState(0);
  const [hintsCount, setHintsCount] = useState(0);
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);
  const [canSwap, setCanSwap] = useState(true);
  const [canHint, setCanHint] = useState(true);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showFinishEventModal, setShowFinishEventModal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saved' | 'saving'
  const navigate = useNavigate();
  const toast = useToast();

  const fetchStatus = async () => {
    try {
      const res = await api.get('/participant/event/status');
      setStatus(res.data);
      if (res.data.is_expired || res.data.status === 'ended' || res.data.team_status === 'completed') {
        setCanSwap(false);
        setCanHint(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async (preferredId = null) => {
    try {
      const res = await api.get('/participant/code-scramble/questions');
      setQuestions(res.data);
      if (res.data.length > 0) {
        const nextId = preferredId || (activeId && res.data.some(q => q.id === activeId) ? activeId : res.data[0].id);
        loadQuestion(nextId);
      }
    } catch (err) {
      toast.error('Failed to load assigned questions');
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
      setSelectedLineIndex(null);
      const res = await api.get(`/participant/code-scramble/questions/${id}`);
      const data = res.data;
      setCurrentQ(data);

      const shuffled = data.shuffled_lines || [];
      const order = data.current_arrangement || shuffled.map((_, i) => i);

      const mappedLines = order.map((origIdx) => ({
        id: `line-${origIdx}`,
        content: shuffled[origIdx] || '',
        origIndex: origIdx,
      }));

      setLines(mappedLines);
      setCorrectPositions(data.correct_positions || []);
      setStartingPoints(typeof data.starting_points === 'number' ? data.starting_points : 100);
      setCurrentPoints(typeof data.current_points === 'number' ? data.current_points : 100);
      setSwapsCount(data.swaps_count || 0);
      setHintsCount(data.hints_count || 0);
      setCanSwap(data.can_swap !== false);
      setCanHint(data.can_hint !== false);
      setAutoSaveStatus('saved');
    } catch (err) {
      toast.error('Failed to load question details');
    }
  };

  const isEventEnded = status && (status.is_expired || status.status === 'ended' || status.team_status === 'completed');

  // TRUE PAIRWISE SWAP EXECUTION (ZERO intermediate line movement)
  const executeSwap = async (indexA, indexB) => {
    if (indexA === indexB || isEventEnded || !canSwap) return;

    // 1. Optimistic UI update: ONLY lines indexA and indexB exchange places
    const newLines = [...lines];
    const temp = newLines[indexA];
    newLines[indexA] = newLines[indexB];
    newLines[indexB] = temp;
    setLines(newLines);
    setSelectedLineIndex(null);
    setAutoSaveStatus('saving');

    // 2. Server validation and score deduction (-1 point)
    try {
      const res = await api.post(`/participant/code-scramble/questions/${activeId}/swap`, {
        indexA,
        indexB,
        line_order: newLines.map(l => l.origIndex),
      });

      if (res.data.correct_positions) {
        setCorrectPositions(res.data.correct_positions);
      }
      if (typeof res.data.current_points === 'number') {
        setCurrentPoints(res.data.current_points);
      }
      if (typeof res.data.swaps_count === 'number') {
        setSwapsCount(res.data.swaps_count);
      }
      setCanSwap(res.data.can_swap !== false);
      setCanHint(res.data.can_hint !== false);
      setAutoSaveStatus('saved');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to execute swap');
      loadQuestion(activeId);
    }
  };

  // Click-to-swap handler
  const handleLineClick = (idx) => {
    if (isEventEnded || !canSwap) return;

    if (selectedLineIndex === null) {
      setSelectedLineIndex(idx);
    } else if (selectedLineIndex === idx) {
      setSelectedLineIndex(null); // Deselect with zero penalty
    } else {
      executeSwap(selectedLineIndex, idx);
    }
  };

  // Manual save option
  const handleManualSave = async () => {
    const lineOrderIndices = lines.map(l => l.origIndex);
    try {
      setAutoSaveStatus('saving');
      const res = await api.post(`/participant/code-scramble/questions/${activeId}/save`, {
        line_order: lineOrderIndices,
      });
      if (res.data.correct_positions) {
        setCorrectPositions(res.data.correct_positions);
      }
      if (typeof res.data.current_points === 'number') {
        setCurrentPoints(res.data.current_points);
      }
      setCanSwap(res.data.can_swap !== false);
      setCanHint(res.data.can_hint !== false);
      setAutoSaveStatus('saved');
      toast.success('Arrangement saved successfully');
    } catch (err) {
      setAutoSaveStatus('saved');
      toast.error(err.response?.data?.error || 'Failed to save arrangement');
    }
  };

  // Request Builder's Clue (-5 pts)
  const handleRequestHint = async () => {
    try {
      const res = await api.post(`/participant/code-scramble/questions/${activeId}/hint`);
      setShowHintModal(false);
      if (res.data.success) {
        toast.success('Clue applied! Correct line placed in position (-5 pts).');
        if (typeof res.data.current_points === 'number') {
          setCurrentPoints(res.data.current_points);
        }
        loadQuestion(activeId);
      } else {
        toast.info(res.data.message || res.data.error || 'No clue available');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request clue');
    }
  };

  // Overall Event Final Submission
  const handleFinishEvent = async () => {
    try {
      await api.post('/participant/event/submit');
      toast.success('Your Code Scramble battle has been submitted and recorded successfully!');
      setShowFinishEventModal(false);
      navigate('/participant/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to finalize battle submission');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400 font-sans">Loading Code Scramble...</div>;

  const currentQuestionIndex = questions.findIndex(q => q.id === activeId);
  const isFirstQuestion = currentQuestionIndex <= 0;
  const isLastQuestion = currentQuestionIndex >= 0 && currentQuestionIndex === questions.length - 1;

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      loadQuestion(questions[currentQuestionIndex - 1].id);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      loadQuestion(questions[currentQuestionIndex + 1].id);
    }
  };

  const correctCount = correctPositions.filter(Boolean).length;
  const totalCount = lines.length;

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-4rem)] bg-stone-950 overflow-hidden font-sans">
      {/* Top Bar with Question Navigation and Countdown */}
      <div className="bg-[#18110a] border-b-2 border-[#5c371f] px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 z-10 shadow-md">
        <div className="flex items-center gap-2.5 overflow-x-auto py-1">
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
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-clash tracking-wider transition-all flex items-center gap-1.5 shadow-sm ${
                activeId === q.id
                  ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 font-black border-2 border-amber-200 shadow-md scale-105'
                  : 'bg-stone-900/90 text-stone-300 hover:bg-stone-800 border border-stone-700'
              }`}
            >
              <IconHammer className="w-3 h-3" />
              <span>Q{idx + 1}</span>
              {q.is_saved && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Arrangement saved"></span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <div className="w-48 sm:w-52 shrink-0">
              <CountdownTimer
                serverTime={status.server_time}
                startTime={status.start_time}
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
        </div>
      </div>

      {/* Main Builder Workspace */}
      {currentQ ? (
        <div className="flex-grow flex flex-col overflow-hidden max-w-5xl mx-auto w-full p-4">
          
          {/* Header & Controls inside Workbench Container */}
          <div className="workbench-container p-4 mb-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <span className="rivet absolute top-2 left-2"></span>
            <span className="rivet absolute top-2 right-2"></span>

            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              {/* RESTORED CODE SCRAMBLE SCORE CARD */}
              <div className="relative resource-badge border-2 border-amber-500 shadow-xl shrink-0 bg-gradient-to-b from-[#2a170d] via-[#1a0e07] to-[#120904] px-4 py-2 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                  <IconStar className="w-7 h-7 text-amber-400 filter drop-shadow" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block font-clash">
                    CHALLENGE SCORE
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black font-clash text-amber-100 drop-shadow">
                      {currentPoints}
                    </span>
                    <span className="text-xs font-clash text-amber-400 font-bold">
                      / {startingPoints} PTS
                    </span>
                  </div>
                </div>
              </div>

              {/* Tactical Alignment Badge */}
              <div className="resource-badge border border-[#5c371f] bg-black/40 px-3 py-2 rounded-xl shrink-0 hidden sm:flex items-center gap-2">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-stone-400 block font-clash">
                    ALIGNMENT
                  </span>
                  <span className="text-sm font-black font-clash text-emerald-400">
                    {correctCount}/{totalCount} ALIGNED
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-clash uppercase tracking-wider text-amber-200 bg-red-950 border border-red-600 px-2.5 py-0.5 rounded shadow flex items-center gap-1.5">
                    <IconHammer className="w-3 h-3 text-amber-300" />
                    <span>BUILDER'S WORKSHOP &bull; Q{currentQuestionIndex + 1}</span>
                  </span>
                  {currentQ.title && (
                    <h3 className="text-base font-black font-clash text-amber-100 tracking-wide">{currentQ.title}</h3>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-1 font-sans">
                  Rearrange the scrambled Python code blocks into the correct operational order.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Clue button */}
              {!isEventEnded && (
                canHint ? (
                  <button
                    onClick={() => setShowHintModal(true)}
                    className="px-3.5 py-2 bg-gradient-to-b from-[#3a2517] to-[#24150c] hover:from-[#4d3220] hover:to-[#331e12] border-2 border-amber-500 text-amber-300 text-xs font-clash uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 active:translate-y-0.5 transition-all"
                    title="Request clue to place next correct line (-5 pts)"
                  >
                    <IconLightbulb className="w-3.5 h-3.5 text-amber-300" />
                    <span>REQUEST CLUE (-5 PTS)</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3.5 py-2 bg-stone-950/80 border border-stone-800 text-stone-500 text-xs font-clash uppercase tracking-wider rounded-xl opacity-50 cursor-not-allowed flex items-center gap-1.5"
                    title={currentPoints <= 5 ? "Insufficient points for clue (≤5 pts)" : "Clue unavailable"}
                  >
                    <IconLock className="w-3.5 h-3.5 text-stone-500" />
                    <span>CLUE UNAVAILABLE</span>
                  </button>
                )
              )}

              {/* Auto-save badge + Save Work button */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-clash tracking-wider px-2.5 py-1 rounded bg-stone-900/90 border border-stone-700 text-emerald-400 flex items-center gap-1">
                  <IconCheck className="w-3 h-3 text-emerald-400" />
                  <span>{autoSaveStatus === 'saving' ? 'SAVING...' : 'AUTO-SAVED'}</span>
                </span>

                <button
                  onClick={handleManualSave}
                  disabled={isEventEnded}
                  className="px-3 py-2 bg-[#251810] hover:bg-[#382418] border border-amber-800 text-amber-200 text-xs font-clash uppercase tracking-wider rounded-xl transition-all shadow disabled:opacity-50"
                  title="Manually save current arrangement to server"
                >
                  SAVE WORK
                </button>
              </div>
            </div>
          </div>

          {/* TIME'S UP Notice */}
          {isEventEnded && (
            <div className="bg-red-950/90 border-2 border-red-500 rounded-xl px-5 py-4 mb-3 text-red-100 flex items-center gap-3 shadow-2xl animate-pulse">
              <IconLock className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <h4 className="font-clash text-base font-black text-red-200 uppercase tracking-wider">BATTLE CONCLUDED</h4>
                <p className="text-xs text-red-300">The event has concluded or your final submission was recorded. New swaps and clues are locked.</p>
              </div>
            </div>
          )}

          {/* Problem Description Card */}
          {currentQ.problem_description && (
            <div className="bg-[#1c130b] border-2 border-[#5c371f] rounded-xl p-3.5 mb-3 shadow-md relative overflow-hidden">
              <div className="text-[11px] font-clash uppercase tracking-wider text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                <IconHammer className="w-3.5 h-3.5 text-amber-400" />
                <span>PROBLEM DESCRIPTION &bull; OBJECTIVE</span>
              </div>
              <p className="text-sm text-stone-200 font-sans leading-relaxed whitespace-pre-wrap">
                {currentQ.problem_description}
              </p>
            </div>
          )}

          {/* Alert if swaps locked */}
          {!canSwap && !isEventEnded && (
            <div className="bg-gradient-to-r from-red-950 via-[#3a1014] to-red-950 border-2 border-red-600/80 rounded-xl px-4 py-3 mb-3 text-xs text-red-100 flex items-center justify-between shadow-lg">
              <span className="flex items-center gap-3">
                <IconSwords className="w-6 h-6 text-red-400 shrink-0" />
                <span>
                  <strong className="font-clash text-sm text-red-300 block uppercase tracking-wider">
                    POINT POOL EXHAUSTED (0 PTS) &bull; SWAPS LOCKED
                  </strong>
                  Further line swaps and clues are locked for this challenge. Your arrangement is preserved and will be graded.
                </span>
              </span>
            </div>
          )}

          {/* Builder True Swap Guidance Banner - Fixed height & no wrapping to prevent ANY vertical layout shift */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-lg px-4 py-2 mb-2.5 text-xs flex items-center justify-between gap-3 text-stone-300 min-h-[42px] h-[42px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-amber-400 text-sm shrink-0">⚔️</span>
              <span className="truncate">
                <strong>TRUE SWAP:</strong> Click Line A then Line B to exchange positions (<strong>−1 pt</strong>). Surrounding lines remain stationary.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedLineIndex !== null ? (
                <>
                  <span className="text-xs font-clash font-bold text-amber-200 bg-amber-900/80 border border-amber-400 px-2 py-0.5 rounded animate-pulse whitespace-nowrap">
                    Line #{selectedLineIndex + 1} Selected &bull; Click Line B
                  </span>
                  <button
                    onClick={() => setSelectedLineIndex(null)}
                    className="text-xs text-stone-400 hover:text-stone-200 underline font-sans ml-1 whitespace-nowrap"
                  >
                    Cancel (0 pt)
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-stone-500 font-clash tracking-wider uppercase whitespace-nowrap">
                  CLICK LINE TO SELECT
                </span>
              )}
            </div>
          </div>

          {/* Interactive Workspace: Pure Pairwise Swap Lines (Fixed Slots, Zero Shifting) */}
          <div className="flex-grow overflow-y-auto bg-[#100b07] border-2 border-[#5c371f] rounded-xl p-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.85)]">
            <div className="space-y-1">
              {lines.map((line, index) => (
                <ScrambleLine
                  key={`slot-${index}`}
                  line={line}
                  index={index}
                  isCorrectPosition={!!correctPositions[index]}
                  isSelected={selectedLineIndex === index}
                  isLocked={!canSwap}
                  isEventEnded={isEventEnded}
                  onLineClick={handleLineClick}
                />
              ))}
            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="mt-3.5 pt-3 border-t border-[#3d2415] flex items-center justify-between gap-4 bg-[#140c07]/90 px-4 py-3 rounded-xl border border-[#422513]">
            <button
              onClick={handlePreviousQuestion}
              disabled={isFirstQuestion}
              className={`px-4 py-2 rounded-lg font-clash text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 ${
                isFirstQuestion
                  ? 'bg-stone-900/50 text-stone-600 border border-stone-800/50 cursor-not-allowed'
                  : 'bg-[#251810] hover:bg-[#382418] text-amber-200 border border-amber-800/80 shadow'
              }`}
            >
              <span>&larr; PREVIOUS</span>
            </button>

            <div className="text-xs font-clash tracking-wider text-amber-400 font-bold uppercase">
              QUESTION {currentQuestionIndex + 1} OF {questions.length}
            </div>

            <div className="flex items-center gap-2">
              {!isLastQuestion ? (
                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-clash text-xs font-bold uppercase tracking-wider rounded-lg border border-amber-400 shadow-md flex items-center gap-1.5 transition-all"
                >
                  <span>NEXT &rarr;</span>
                </button>
              ) : (
                !isEventEnded && (
                  <button
                    onClick={() => setShowFinishEventModal(true)}
                    className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-clash text-xs font-black uppercase tracking-wider rounded-lg border border-red-400 shadow-lg flex items-center gap-1.5 animate-pulse transition-all"
                    title="Submit all assigned questions and conclude Code Scramble"
                  >
                    <IconSwords className="w-4 h-4" />
                    <span>SUBMIT CODE SCRAMBLE</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-500 font-sans">
          Select a question to begin
        </div>
      )}

      {/* Clue Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showHintModal}
        onClose={() => setShowHintModal(false)}
        onConfirm={handleRequestHint}
        title="Request Builder's Clue (-5 Points)?"
        message={`Requesting a clue will deduct 5 points from this challenge (from ${currentPoints} to ${Math.max(0, currentPoints - 5)} PTS) and automatically position the next correct line.`}
        confirmText="Use Clue (-5 Pts)"
        confirmStyle="warning"
      />

      {/* Overall Event Finish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showFinishEventModal}
        onClose={() => setShowFinishEventModal(false)}
        onConfirm={handleFinishEvent}
        title="Submit Code Scramble?"
        message="Your answers for all assigned questions will be submitted and cannot be changed afterward."
        confirmText="Submit Code Scramble"
        confirmStyle="danger"
      />
    </div>
  );
};

export default ParticipantCodeScramble;

