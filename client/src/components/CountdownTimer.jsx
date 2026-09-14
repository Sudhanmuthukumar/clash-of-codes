import React, { useState, useEffect, useRef } from 'react';

// Module-level stable clock offset: computed ONCE, remains stable forever across renders/re-renders
let stableClockOffset = null;

export const getAuthoritativeNow = (serverTime) => {
  if (stableClockOffset === null && serverTime) {
    const serverMs = new Date(serverTime).getTime();
    if (!isNaN(serverMs)) {
      stableClockOffset = serverMs - Date.now();
    }
  }
  return Date.now() + (stableClockOffset || 0);
};

const CountdownTimer = ({ serverTime, startTime, expiresAt, timeLimitMinutes, pauseDuration = 0, eventStatus, onExpire }) => {
  const normStatus = (eventStatus || '').toUpperCase();
  const isNotStarted = normStatus === 'NOT_STARTED';
  const isPaused = normStatus === 'PAUSED';
  const isEnded = normStatus === 'ENDED' || normStatus === 'TIME_EXPIRED';
  const isLive = normStatus === 'LIVE' || normStatus === 'ACTIVE';

  // Calculate authoritative remaining seconds strictly from expiresAt
  const computeAuthoritativeRemaining = () => {
    if (isNotStarted) return (timeLimitMinutes || 40) * 60;
    if (isEnded) return 0;

    // While in-progress/live, expiresAt from server TestSession is the SOLE authoritative source
    if (!expiresAt) {
      return null;
    }

    const expMs = new Date(expiresAt).getTime();
    if (isNaN(expMs)) return null;

    const authNow = getAuthoritativeNow(serverTime);
    const remainingMs = expMs - authNow;
    return Math.max(0, Math.floor(remainingMs / 1000));
  };

  const [timeLeft, setTimeLeft] = useState(() => computeAuthoritativeRemaining());
  const prevDisplayedRef = useRef(null);
  const minDisplayedRef = useRef(null);

  useEffect(() => {
    // If paused or not started, don't run countdown interval
    if (isPaused || isNotStarted || isEnded) {
      const staticVal = computeAuthoritativeRemaining();
      setTimeLeft(staticVal);
      return;
    }

    const updateTimer = () => {
      const calculated = computeAuthoritativeRemaining();

      if (calculated === null) {
        setTimeLeft(null);
        return;
      }

      const authNow = getAuthoritativeNow(serverTime);
      const prev = prevDisplayedRef.current;

      if (prev !== null && calculated > prev && import.meta.env?.DEV) {
        console.error('[TIMER ANOMALY: INCREMENT DETECTED]', {
          previousDisplayedSeconds: prev,
          newCalculatedSeconds: calculated,
          expiresAt,
          authoritativeNow: authNow,
          stableClockOffset
        });
      }

      // Strictly monotonic enforcement:
      // Once a timer has displayed a value for an active session, it must NEVER increase.
      let finalSecs = calculated;
      if (minDisplayedRef.current === null) {
        minDisplayedRef.current = calculated;
      } else {
        if (finalSecs > minDisplayedRef.current) {
          finalSecs = minDisplayedRef.current;
        } else {
          minDisplayedRef.current = finalSecs;
        }
      }

      prevDisplayedRef.current = finalSecs;
      setTimeLeft(finalSecs);

      if (finalSecs === 0 && prev !== null && prev > 0) {
        if (onExpire) onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, eventStatus, isNotStarted, isPaused, isEnded, serverTime, onExpire]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) {
      return '--:--';
    }
    const sVal = Math.max(0, seconds || 0);
    const hrs = Math.floor(sVal / 3600);
    const m = Math.floor((sVal % 3600) / 60).toString().padStart(2, '0');
    const s = (sVal % 60).toString().padStart(2, '0');
    if (hrs > 0 || (timeLimitMinutes && timeLimitMinutes >= 60)) {
      return `${hrs.toString().padStart(2, '0')}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  const isLowTime = timeLeft !== null && timeLeft > 0 && timeLeft < 300; // < 5 mins
  const isCritical = timeLeft !== null && timeLeft > 0 && timeLeft < 60; // < 1 min

  return (
    <div className={`text-center p-4 rounded-xl border-2 bg-stone-950/80 backdrop-blur-md transition-all shadow-lg
      ${isCritical 
        ? 'border-red-600 animate-pulse text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
        : isLowTime 
        ? 'border-amber-600 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
        : 'border-amber-900/60 text-amber-300'}`}>
      <div className="text-xs text-stone-400 mb-1 tracking-widest uppercase font-bold font-fantasy flex items-center justify-center gap-1.5">
        <span>⚔</span>
        <span>BATTLE TIME</span>
      </div>
      <div className="text-3xl sm:text-4xl font-mono font-black tracking-wider text-amber-200">
        {isNotStarted && formatTime((timeLimitMinutes || 40) * 60)}
        {isPaused && <span className="text-amber-500 text-2xl font-fantasy tracking-wider">PAUSED</span>}
        {isEnded && <span className="text-red-500 text-2xl font-fantasy tracking-wider">TIME'S UP</span>}
        {isLive && (
          timeLeft === null 
            ? <span className="tracking-widest text-stone-500">--:--</span>
            : timeLeft === 0 
            ? <span className="text-red-500 text-2xl font-fantasy tracking-wider">TIME'S UP</span> 
            : formatTime(timeLeft)
        )}
      </div>
    </div>
  );
};

export default CountdownTimer;
