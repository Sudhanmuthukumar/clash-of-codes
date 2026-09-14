import React, { useState, useEffect, useRef } from 'react';

// Module-level cached client offset to prevent jitter across re-renders
let cachedClientOffset = null;

const CountdownTimer = ({ serverTime, startTime, expiresAt, timeLimitMinutes, pauseDuration = 0, eventStatus, onExpire }) => {
  const normStatus = (eventStatus || '').toUpperCase();
  const isNotStarted = normStatus === 'NOT_STARTED';
  const isPaused = normStatus === 'PAUSED';
  const isEnded = normStatus === 'ENDED' || normStatus === 'TIME_EXPIRED';
  const isLive = normStatus === 'LIVE' || normStatus === 'ACTIVE';
  const targetExpiry = expiresAt ? new Date(expiresAt).getTime() : null;

  // Compute and memoize stable client offset
  if (serverTime && cachedClientOffset === null) {
    const serverRef = new Date(serverTime).getTime();
    const localNow = Date.now();
    cachedClientOffset = serverRef - localNow;
  }

  const computeRemainingSeconds = () => {
    if (isNotStarted) return (timeLimitMinutes || 40) * 60;
    if (isEnded) return 0;

    const offset = cachedClientOffset !== null ? cachedClientOffset : 0;
    const now = Date.now() + offset;
    const targetExpiry = expiresAt ? new Date(expiresAt).getTime() : null;

    if (targetExpiry) {
      return Math.max(0, Math.floor((targetExpiry - now) / 1000));
    }

    if (startTime) {
      const start = new Date(startTime).getTime();
      const limitMs = (timeLimitMinutes || 40) * 60 * 1000;
      const pauseMs = (pauseDuration || 0) * 1000;
      const elapsed = now - start - pauseMs;
      return Math.max(0, Math.floor((limitMs - elapsed) / 1000));
    }

    return (timeLimitMinutes || 40) * 60;
  };

  // Synchronous state initialization - NEVER starts at 0 or flashes 40:00 if an active session exists
  const [timeLeft, setTimeLeft] = useState(computeRemainingSeconds);
  const prevTimeLeftRef = useRef(null);
  const minTimeSeenRef = useRef(null);

  useEffect(() => {
    console.log('[TIMER MOUNT]', { startTime, expiresAt, status: eventStatus });
    return () => {
      console.log('[TIMER UNMOUNT]', { startTime, expiresAt, status: eventStatus });
    };
  }, []);

  useEffect(() => {
    if (serverTime && cachedClientOffset === null) {
      const serverRef = new Date(serverTime).getTime();
      const localNow = Date.now();
      cachedClientOffset = serverRef - localNow;
    }

    const updateTimer = () => {
      let secs = computeRemainingSeconds();

      // MONOTONIC CLAMP: For an active running session, the visible timer must ONLY decrease or stay equal.
      // It must never increase due to millisecond jitter or clock skew, and never flash higher.
      if (isLive && targetExpiry) {
        if (minTimeSeenRef.current === null) {
          minTimeSeenRef.current = secs;
        } else {
          secs = Math.min(secs, minTimeSeenRef.current);
          minTimeSeenRef.current = secs;
        }
      }

      setTimeLeft(secs);

      if (secs === 0 && prevTimeLeftRef.current !== null && prevTimeLeftRef.current > 0) {
        if (onExpire) onExpire();
      }
      prevTimeLeftRef.current = secs;
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, startTime, eventStatus, timeLimitMinutes, pauseDuration, isNotStarted, isEnded, isPaused]);

  const formatTime = (seconds) => {
    const sVal = Math.max(0, seconds || 0);
    const hrs = Math.floor(sVal / 3600);
    const m = Math.floor((sVal % 3600) / 60).toString().padStart(2, '0');
    const s = (sVal % 60).toString().padStart(2, '0');
    if (hrs > 0 || (timeLimitMinutes && timeLimitMinutes >= 60)) {
      return `${hrs.toString().padStart(2, '0')}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  const isLowTime = timeLeft > 0 && timeLeft < 300; // < 5 mins
  const isCritical = timeLeft > 0 && timeLeft < 60; // < 1 min

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
        {isLive && (timeLeft === 0 ? <span className="text-red-500 text-2xl font-fantasy tracking-wider">TIME'S UP</span> : formatTime(timeLeft))}
      </div>
    </div>
  );
};

export default CountdownTimer;
