import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const SortableLine = ({ 
  id, 
  content, 
  lineNumber, 
  isCorrectPosition, 
  isSelected, 
  isSubmitted, 
  isLocked, 
  onLineClick 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isSubmitted || isLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : 1,
  };

  let containerClass = 'bg-gradient-to-r from-[#20150d] via-[#1a100a] to-[#140b07] border-2 border-[#5c371f] hover:border-amber-500/80 shadow-md';
  if (isSelected) {
    containerClass = 'bg-gradient-to-r from-[#4d2d14] via-[#3a200e] to-[#2b170a] border-2 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.6)] ring-2 ring-amber-400 scale-[1.01] text-amber-100';
  } else if (isCorrectPosition) {
    containerClass = 'bg-gradient-to-r from-[#06331e] via-[#094127] to-[#042415] border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-emerald-100 solved-glow';
  } else if (isDragging) {
    containerClass = 'bg-gradient-to-r from-[#382012] to-[#2a170d] border-2 border-amber-400 shadow-2xl scale-[1.02]';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        if (!isSubmitted && !isLocked && onLineClick) {
          onLineClick(lineNumber - 1);
        }
      }}
      className={`flex items-stretch rounded-xl transition-all mb-2.5 overflow-hidden select-none border-b-4 relative ${
        isSubmitted || isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-amber-400/90'
      } ${
        isSelected
          ? 'border-b-amber-400'
          : isCorrectPosition 
          ? 'border-b-emerald-700' 
          : 'border-b-[#0e0704]'
      } ${containerClass}`}
      title={isSubmitted ? 'Challenge submitted' : isLocked ? 'Points exhausted (0 pts) - locked' : isSelected ? 'Line selected. Click another line to swap, or click again to deselect.' : 'Click to select for swap (-1 pt) or drag onto another line.'}
    >
      {/* Tactical Builder Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className={`px-3.5 py-3 flex items-center justify-center bg-black/40 border-r border-[#452814] text-amber-200/70 transition-colors ${
          isSubmitted || isLocked ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing hover:text-amber-300 hover:bg-black/60'
        }`}
        title={isSubmitted ? 'Challenge submitted' : isLocked ? 'Points exhausted (0 pts) - locked' : 'Drag onto another line to swap (-1 pt)'}
      >
        <span className="font-mono text-xs select-none">🧱 ⋮⋮</span>
      </div>

      {/* Carved Line Number Tile */}
      <div className={`px-3.5 py-3 font-mono text-xs bg-black/30 select-none border-r border-[#452814] min-w-[2.75rem] text-center flex items-center justify-center font-bold ${
        isSelected ? 'text-amber-200 font-black bg-amber-900/60' : isCorrectPosition ? 'text-emerald-300 font-black' : 'text-amber-400'
      }`}>
        {lineNumber}
      </div>

      {/* Code Text with JetBrains Mono */}
      <div className="flex-grow p-3 font-mono text-sm text-stone-100 overflow-x-auto whitespace-pre font-medium">
        {content}
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
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchStatus = async () => {
    try {
      const res = await api.get('/participant/event/status');
      setStatus(res.data);
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
    } catch (err) {
      toast.error('Failed to load question details');
    }
  };

  // TRUE PAIRWISE SWAP EXECUTION
  const executeSwap = async (indexA, indexB) => {
    if (indexA === indexB || currentQ?.is_submitted || !canSwap) return;

    // 1. Optimistic UI update: ONLY the two selected lines exchange positions
    const newLines = [...lines];
    const temp = newLines[indexA];
    newLines[indexA] = newLines[indexB];
    newLines[indexB] = temp;
    setLines(newLines);
    setSelectedLineIndex(null);

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
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to execute swap');
      loadQuestion(activeId);
    }
  };

  // Click-to-swap handler
  const handleLineClick = (idx) => {
    if (currentQ?.is_submitted || !canSwap) return;

    if (selectedLineIndex === null) {
      setSelectedLineIndex(idx);
    } else if (selectedLineIndex === idx) {
      setSelectedLineIndex(null);
    } else {
      executeSwap(selectedLineIndex, idx);
    }
  };

  // Drag-and-drop pairwise swap handler (TRUE SWAP, never shifts)
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || currentQ?.is_submitted || !canSwap) return;

    const indexA = lines.findIndex(item => item.id === active.id);
    const indexB = lines.findIndex(item => item.id === over.id);

    if (indexA !== -1 && indexB !== -1) {
      executeSwap(indexA, indexB);
    }
  };

  const handleManualSave = async () => {
    const lineOrderIndices = lines.map(l => l.origIndex);
    try {
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
      toast.success('Arrangement saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save arrangement');
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      const lineOrderIndices = lines.map(l => l.origIndex);
      await api.post(`/participant/code-scramble/questions/${activeId}/submit`, {
        line_order: lineOrderIndices,
      });
      toast.success('Question submitted.');
      setShowSubmitModal(false);
      loadQuestion(activeId);
      fetchQuestions(activeId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    }
  };

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

  if (loading) return <div className="p-8 text-center text-gray-400 font-sans">Loading Code Scramble...</div>;

  const correctCount = correctPositions.filter(Boolean).length;
  const totalCount = lines.length;

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-4rem)] bg-stone-950 overflow-hidden font-sans">
      {/* Top Bar with Question Selection and Battle Countdown */}
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
              {q.is_attempted && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              )}
            </button>
          ))}
        </div>

        {status && (
          <div className="w-52 shrink-0">
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
                    <span>BUILDER'S WORKSHOP &bull; Q{currentQ.question_number}</span>
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
              {!currentQ.is_submitted && (
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

              {/* Save button */}
              {!currentQ.is_submitted && (
                <button
                  onClick={handleManualSave}
                  className="px-3.5 py-2 bg-[#251810] hover:bg-[#382418] border border-amber-800 text-amber-200 text-xs font-clash uppercase tracking-wider rounded-xl transition-all shadow"
                >
                  SAVE WORK
                </button>
              )}

              {/* Final Submit Button */}
              {!currentQ.is_submitted ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="btn-primary text-xs px-4 py-2 font-clash uppercase tracking-wider font-black shadow-lg"
                >
                  FINALIZE CODE
                </button>
              ) : (
                <span className="px-3.5 py-2 bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-clash uppercase tracking-wider rounded-xl font-bold flex items-center gap-1.5 shadow">
                  <IconCheck className="w-4 h-4 text-emerald-400" />
                  <span>CHALLENGE SUBMITTED</span>
                </span>
              )}
            </div>
          </div>

          {/* TIME'S UP Notice */}
          {status && (status.is_expired || status.status === 'ended') && (
            <div className="bg-red-950/90 border-2 border-red-500 rounded-xl px-5 py-4 mb-3 text-red-100 flex items-center gap-3 shadow-2xl animate-pulse">
              <IconLock className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <h4 className="font-clash text-base font-black text-red-200 uppercase tracking-wider">TIME'S UP &bull; BATTLE CONCLUDED</h4>
                <p className="text-xs text-red-300">The event time has expired. New swaps, clues, and submissions are locked.</p>
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
          {!canSwap && !currentQ.is_submitted && (
            <div className="bg-gradient-to-r from-red-950 via-[#3a1014] to-red-950 border-2 border-red-600/80 rounded-xl px-4 py-3 mb-3 text-xs text-red-100 flex items-center justify-between shadow-lg">
              <span className="flex items-center gap-3">
                <IconSwords className="w-6 h-6 text-red-400 shrink-0" />
                <span>
                  <strong className="font-clash text-sm text-red-300 block uppercase tracking-wider">
                    POINT POOL EXHAUSTED (0 PTS) &bull; SWAPS LOCKED
                  </strong>
                  Further line swaps and clues are locked for this challenge. You may review and finalize your arrangement.
                </span>
              </span>
            </div>
          )}

          {/* Builder True Swap Guidance Banner */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-lg px-4 py-2 mb-2.5 text-xs flex flex-wrap items-center justify-between gap-2 text-stone-300">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">⚔️</span>
              <span>
                <strong>TRUE SWAP:</strong> Click line A then line B to exchange their positions (<strong>−1 pt</strong>), or drag line A onto line B.
              </span>
            </div>
            {selectedLineIndex !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-clash font-bold text-amber-200 bg-amber-900/80 border border-amber-400 px-2.5 py-0.5 rounded animate-pulse">
                  Line #{selectedLineIndex + 1} Selected &bull; Click second line to swap
                </span>
                <button
                  onClick={() => setSelectedLineIndex(null)}
                  className="text-xs text-stone-400 hover:text-stone-200 underline font-sans"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Interactive Workspace: Draggable & Clickable Building Blocks */}
          <div className="flex-grow overflow-y-auto bg-[#100b07] border-2 border-[#5c371f] rounded-xl p-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.85)]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lines.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {lines.map((line, index) => (
                    <SortableLine
                      key={line.id}
                      id={line.id}
                      content={line.content}
                      lineNumber={index + 1}
                      isCorrectPosition={!!correctPositions[index]}
                      isSelected={selectedLineIndex === index}
                      isSubmitted={currentQ.is_submitted}
                      isLocked={!canSwap}
                      onLineClick={handleLineClick}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-500 font-sans">
          Select a question to begin
        </div>
      )}

      {/* Confirm Submission Dialog */}
      <ConfirmDialog
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Code Scramble Arrangement?"
        message="Are you sure you want to submit your current code arrangement? You will not be able to rearrange this question after submission."
        confirmText="Yes, Submit Question"
      />

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
    </div>
  );
};

export default ParticipantCodeScramble;
