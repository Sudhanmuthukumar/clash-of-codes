import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
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

const SortableLine = ({ id, content, lineNumber, isCorrectPosition, isSubmitted, isLocked }) => {
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
  if (isCorrectPosition) {
    containerClass = 'bg-gradient-to-r from-[#06331e] via-[#094127] to-[#042415] border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-emerald-100 solved-glow';
  } else if (isDragging) {
    containerClass = 'bg-gradient-to-r from-[#382012] to-[#2a170d] border-2 border-amber-400 shadow-2xl scale-[1.02]';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch rounded-xl transition-all mb-2.5 overflow-hidden select-none border-b-4 relative ${
        isCorrectPosition 
          ? 'border-b-emerald-700' 
          : 'border-b-[#0e0704]'
      } ${containerClass}`}
    >
      {/* Tactical Builder Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={`px-3.5 py-3 flex items-center justify-center bg-black/40 border-r border-[#452814] text-amber-200/70 transition-colors ${
          isSubmitted || isLocked ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing hover:text-amber-300 hover:bg-black/60'
        }`}
        title={isSubmitted ? 'Challenge submitted' : isLocked ? 'Points exhausted (0 pts) - locked' : 'Drag to swap (-1 pt)'}
      >
        <span className="font-mono text-xs select-none">🧱 ⋮⋮</span>
      </div>

      {/* Carved Line Number Tile */}
      <div className={`px-3.5 py-3 font-mono text-xs bg-black/30 select-none border-r border-[#452814] min-w-[2.75rem] text-center flex items-center justify-center font-bold ${
        isCorrectPosition ? 'text-emerald-300 font-black' : 'text-amber-400'
      }`}>
        {lineNumber}
      </div>

      {/* Code Text with JetBrains Mono */}
      <div className="flex-grow p-3 font-mono text-sm text-stone-100 overflow-x-auto whitespace-pre font-medium">
        {content}
      </div>

      {/* Correct Position Status Badge */}
      {isCorrectPosition && (
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
      setCanSwap(data.can_swap !== false);
      setCanHint(data.can_hint !== false);
    } catch (err) {
      toast.error('Failed to load question details');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || currentQ?.is_submitted || !canSwap) return;

    const oldIndex = lines.findIndex(item => item.id === active.id);
    const newIndex = lines.findIndex(item => item.id === over.id);

    const newLines = arrayMove(lines, oldIndex, newIndex);
    setLines(newLines);

    // Save arrangement to server
    const lineOrderIndices = newLines.map(l => l.origIndex);
    try {
      const res = await api.post(`/participant/code-scramble/questions/${activeId}/save`, {
        line_order: lineOrderIndices,
      });
      if (res.data.correct_positions) {
        setCorrectPositions(res.data.correct_positions);
      }
      setCanSwap(res.data.can_swap !== false);
      setCanHint(res.data.can_hint !== false);
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
      loadQuestion(activeId);
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
        toast.success('Clue applied! Correct line placed in position.');
        loadQuestion(activeId);
      } else {
        toast.info(res.data.message || res.data.error || 'No clue available');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request clue');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading Code Scramble...</div>;

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
          <div className="workbench-container p-4 mb-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <span className="rivet absolute top-2 left-2"></span>
            <span className="rivet absolute top-2 right-2"></span>

            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              {/* Clash-style Battle Challenge Badge */}
              <div className="relative resource-badge border-2 border-amber-500 shadow-xl shrink-0">
                <IconStar className="w-7 h-7 text-amber-400 filter drop-shadow" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block font-clash">
                    CHALLENGE STATUS
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-clash text-amber-100 drop-shadow">
                      {correctCount === totalCount ? 'COMPLETE' : `${correctCount}/${totalCount}`}
                    </span>
                    <span className="text-xs font-clash text-amber-400">ALIGNED</span>
                  </div>
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
                  Rearrange the scrambled Python code blocks on your workbench into the correct operational order.
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
                    title="Request clue to place next correct line"
                  >
                    <IconHammer className="w-3.5 h-3.5 text-amber-300" />
                    <span>REQUEST CLUE</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3.5 py-2 bg-stone-950/80 border border-stone-800 text-stone-500 text-xs font-clash uppercase tracking-wider rounded-xl opacity-50 cursor-not-allowed flex items-center gap-1.5"
                    title="Clue unavailable"
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
                    SWAPS LOCKED FOR THIS CHALLENGE
                  </strong>
                  Further block reordering and clues are locked. You may review and finalize your arrangement.
                </span>
              </span>
            </div>
          )}

          {/* Builder Information Strip */}
          <div className="bg-stone-900/60 border border-stone-800/80 rounded-lg px-4 py-2 mb-3 text-xs flex items-center justify-between text-stone-400">
            <div className="flex items-center gap-3">
              <span>Code Blocks: <strong className="text-amber-200 font-mono">{totalCount}</strong></span>
              <span>&bull;</span>
              <span>Correct Positions: <strong className="text-emerald-400 font-mono">{correctCount} / {totalCount}</strong></span>
            </div>
            <div className="text-[11px] text-stone-400 hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1"><IconSwap className="w-3 h-3 text-amber-400" /> Drag &amp; drop blocks to arrange</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1"><IconLightbulb className="w-3 h-3 text-amber-400" /> Clues automatically position next line</span>
            </div>
          </div>

          {/* Interactive Workspace: Draggable Building Blocks */}
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
                      isSubmitted={currentQ.is_submitted}
                      isLocked={!canSwap}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-500">
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
        title="Request Builder's Clue?"
        message="Requesting a clue will automatically identify the next unresolved line, place it in the correct position, and turn it green."
        confirmText="Use Clue"
        confirmStyle="warning"
      />
    </div>
  );
};

export default ParticipantCodeScramble;
