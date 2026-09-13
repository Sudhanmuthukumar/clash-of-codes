import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from './Toast';
import { IconShield, IconLock, IconTimer } from './FantasyIcons';

/**
 * TestModeGuard
 * Enforces:
 * 1. 40-minute server-authoritative TestSession activation
 * 2. Fullscreen enforcement with warning on unauthorized exit
 * 3. Document visibility monitoring (tab switch / window blur)
 * 4. Debounced violation reporting (merging co-occurring fullscreen + visibility events into ONE warning)
 * 5. 3-warning system with automatic test termination on 3rd violation
 * 6. Copy / Paste / Context-menu deterrence
 * 7. Compact Test Mode header indicator
 */
const TestModeGuard = ({ children, eventName, onSessionExpired, onSessionTerminated }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warningModal, setWarningModal] = useState(null); // { count, message }
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);

  const lastViolationTimeRef = useRef(0);
  const isReportingRef = useRef(false);
  const isTerminatedRef = useRef(false);
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Initialize or restore the 40-minute TestSession
  const initTestSession = useCallback(async () => {
    try {
      const res = await api.post('/participant/event/test-session/start');
      if (res.data) {
        setSession(res.data);
        if (res.data.status === 'TERMINATED' || res.data.is_terminated) {
          setIsTerminated(true);
          setTerminationReason(res.data.reason || 'Test terminated due to anti-cheat policy violations.');
          isTerminatedRef.current = true;
          if (onSessionTerminated) onSessionTerminated();
        } else if (res.data.status === 'EXPIRED') {
          if (onSessionExpired) onSessionExpired();
        }
      }
    } catch (err) {
      if (err.response?.data?.is_terminated) {
        setIsTerminated(true);
        setTerminationReason(err.response.data.reason || 'Test terminated due to anti-cheat policy violations.');
        isTerminatedRef.current = true;
        if (onSessionTerminated) onSessionTerminated();
      } else if (err.response?.data?.time_expired) {
        if (onSessionExpired) onSessionExpired();
      } else {
        console.error('Failed to start test session:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired, onSessionTerminated]);

  useEffect(() => {
    initTestSession();
  }, [initTestSession]);

  // 2. Request Fullscreen helper
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      setHasEnteredFullscreen(true);
      setWarningModal(null);
    } catch (err) {
      console.warn('Fullscreen request rejected or not supported:', err);
      setHasEnteredFullscreen(true);
    }
  };

  // 3. Server-Authoritative Violation Reporting (Debounced by 2.5s)
  const reportViolation = useCallback(async (reason) => {
    if (isTerminatedRef.current) return;

    const now = Date.now();
    // Debounce: Merge co-occurring fullscreen + visibility events within 2500ms
    if (now - lastViolationTimeRef.current < 2500 || isReportingRef.current) {
      return;
    }
    lastViolationTimeRef.current = now;
    isReportingRef.current = true;

    try {
      const res = await api.post('/participant/event/violation', { reason });
      const data = res.data;

      if (data.terminated) {
        setIsTerminated(true);
        setTerminationReason(data.message);
        isTerminatedRef.current = true;
        setWarningModal(null);
        if (onSessionTerminated) onSessionTerminated();
      } else {
        setWarningModal({
          count: data.violationCount,
          message: data.message
        });
        setSession(prev => prev ? { ...prev, violationCount: data.violationCount } : null);
      }
    } catch (err) {
      if (err.response?.data?.is_terminated) {
        setIsTerminated(true);
        setTerminationReason(err.response.data.message || 'Maximum violations reached.');
        isTerminatedRef.current = true;
        setWarningModal(null);
        if (onSessionTerminated) onSessionTerminated();
      }
    } finally {
      isReportingRef.current = false;
    }
  }, [onSessionTerminated]);

  // 4. Listeners for Fullscreen & Visibility
  useEffect(() => {
    if (loading || isTerminated) return;

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      // If user has already entered fullscreen once, exiting is a violation
      if (hasEnteredFullscreen && !isFs && !isTerminatedRef.current) {
        reportViolation('Exited browser fullscreen mode');
      }
    };

    // Visibility change listener (tab switch / minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasEnteredFullscreen && !isTerminatedRef.current) {
        reportViolation('Switched away from test tab / window hidden');
      }
    };

    // Window blur listener
    const handleWindowBlur = () => {
      if (hasEnteredFullscreen && !isTerminatedRef.current) {
        reportViolation('Window lost focus');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [loading, isTerminated, hasEnteredFullscreen, reportViolation]);

  // 5. Copy / Paste / Context Menu Restrictions
  useEffect(() => {
    if (isTerminated) return;

    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod) {
        const key = (e.key || '').toLowerCase();
        if (key === 'c' || key === 'v' || key === 'x' || key === 'a' || key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          toast.info('Copy / Paste is disabled during competition.');
          return false;
        }
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('copy', handleCopyPaste, true);
    window.addEventListener('paste', handleCopyPaste, true);
    window.addEventListener('cut', handleCopyPaste, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('copy', handleCopyPaste, true);
      window.removeEventListener('paste', handleCopyPaste, true);
      window.removeEventListener('cut', handleCopyPaste, true);
    };
  }, [isTerminated, toast]);

  // TERMINATION SCREEN
  if (isTerminated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
        <div className="card-fortress max-w-lg w-full border-red-800/80 bg-stone-950 p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-3xl">
            🛑
          </div>
          <div>
            <span className="text-xs font-clash uppercase tracking-widest text-red-400 bg-red-950 border border-red-800 px-3.5 py-1 rounded-full inline-block mb-3">
              ANTI-CHEAT ENFORCEMENT
            </span>
            <h2 className="text-2xl font-black text-red-100 font-clash tracking-wide uppercase">
              TEST TERMINATED
            </h2>
            <p className="text-stone-400 text-xs mt-2 font-sans leading-relaxed">
              {terminationReason || 'You have exceeded the maximum allowed violations (3/3: Leaving fullscreen or switching tabs).'}
            </p>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-xs text-stone-300 space-y-2 font-mono text-left">
            <div className="flex justify-between border-b border-stone-800 pb-1.5">
              <span className="text-stone-500">Status:</span>
              <span className="text-red-400 font-bold uppercase">Locked / Terminated</span>
            </div>
            <div className="flex justify-between border-b border-stone-800 pb-1.5">
              <span className="text-stone-500">Violations:</span>
              <span className="text-red-400 font-bold">3 / 3 (Exceeded)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Submissions:</span>
              <span className="text-amber-300 font-bold">Preserved for evaluation</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/participant/dashboard')}
            className="btn-secondary w-full py-3 text-xs uppercase tracking-wider font-clash font-bold"
          >
            RETURN TO CLAN CAMP
          </button>
        </div>
      </div>
    );
  }

  // INITIAL FULLSCREEN PROMPT MODAL (Requires user gesture)
  const showInitialFullscreenPrompt = !hasEnteredFullscreen && !loading;

  return (
    <div className="relative flex-grow flex flex-col select-none">
      {/* 1. Compact Test Mode Top Bar Indicator */}
      <div className="bg-[#120a06] border-b border-amber-900/60 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-stone-300 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-amber-400 font-clash tracking-wider uppercase">TEST MODE ACTIVE</span>
          <span className="hidden sm:inline text-stone-500">|</span>
          <span className="hidden sm:inline text-stone-400 font-sans">Strict anti-cheat monitoring engaged</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 text-[11px] uppercase">Warnings:</span>
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${
              (session?.violationCount || 0) === 0
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : (session?.violationCount || 0) === 1
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
            }`}>
              {session?.violationCount || 0} / 3
            </span>
          </div>

          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1"
            >
              <span>Full Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Children Content */}
      <div className="flex-grow flex flex-col">
        {children}
      </div>

      {/* 3. Initial Fullscreen Required Modal */}
      {showInitialFullscreenPrompt && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="card-fortress max-w-md w-full border-amber-800/80 bg-stone-950 p-6 text-center shadow-2xl space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border-2 border-amber-500 flex items-center justify-center text-2xl">
              ⚔️
            </div>
            <div>
              <span className="text-xs font-clash uppercase tracking-widest text-amber-400 bg-amber-950 border border-amber-800 px-3 py-0.5 rounded-full inline-block mb-2">
                TEST ENVIRONMENT
              </span>
              <h3 className="text-xl font-black text-amber-100 font-clash tracking-wide uppercase">
                ENTER FULLSCREEN TEST MODE
              </h3>
              <p className="text-stone-400 text-xs mt-2 font-sans leading-relaxed">
                The competition requires continuous fullscreen mode. Leaving fullscreen or switching away will trigger anti-cheat warnings (3 warnings maximum).
              </p>
            </div>

            <button
              onClick={enterFullscreen}
              className="btn-battle-gold w-full py-3 text-sm uppercase tracking-wider font-clash font-bold flex items-center justify-center gap-2"
            >
              <IconShield className="w-4 h-4 text-stone-950" />
              <span>ENGAGE TEST MODE &rarr;</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Violation Warning Modal (Warning 1 / 3 and Warning 2 / 3) */}
      {warningModal && !isTerminated && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`card-fortress max-w-md w-full p-6 text-center shadow-2xl space-y-5 ${
            warningModal.count === 1 ? 'border-amber-700 bg-stone-950' : 'border-red-600 bg-stone-950'
          }`}>
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl ${
              warningModal.count === 1 ? 'bg-amber-950 border-2 border-amber-500 text-amber-400' : 'bg-red-950 border-2 border-red-500 text-red-400 animate-pulse'
            }`}>
              ⚠️
            </div>
            <div>
              <span className={`text-xs font-clash uppercase tracking-widest px-3 py-0.5 rounded-full inline-block mb-2 font-bold ${
                warningModal.count === 1 
                  ? 'text-amber-300 bg-amber-950 border border-amber-700' 
                  : 'text-red-300 bg-red-950 border border-red-600'
              }`}>
                WARNING {warningModal.count} OF 3
              </span>
              <h3 className="text-xl font-black text-white font-clash tracking-wide uppercase">
                ANTI-CHEAT VIOLATION DETECTED
              </h3>
              <p className="text-stone-300 text-xs mt-2 font-sans leading-relaxed">
                {warningModal.message}
              </p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs text-stone-400 font-mono text-center">
              {warningModal.count === 1 ? (
                <span>⚠️ Two violations remaining before automatic test lock.</span>
              ) : (
                <span className="text-red-400 font-bold">🚨 CRITICAL: EXACTLY ONE VIOLATION REMAINS. Next violation will instantly terminate your test.</span>
              )}
            </div>

            <button
              onClick={enterFullscreen}
              className={`w-full py-3 text-sm uppercase tracking-wider font-clash font-black rounded-xl ${
                warningModal.count === 1 ? 'btn-battle-gold' : 'btn-danger'
              }`}
            >
              RETURN TO TEST &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestModeGuard;
