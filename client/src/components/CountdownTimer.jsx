import React, { useState, useEffect, useRef } from 'react';

const CountdownTimer = ({ serverTime, startTime, timeLimitMinutes, pauseDuration = 0, eventStatus, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const prevTimeLeftRef = useRef(null);

  const normStatus = (eventStatus || '').toUpperCase();
  const isNotStarted = normStatus === 'NOT_STARTED';
  const isPaused = normStatus === 'PAUSED';
  const isEnded = normStatus === 'ENDED' || normStatus === 'TIME_EXPIRED';
  const isLive = normStatus === 'LIVE' || normStatus === 'ACTIVE';

  useEffect(() => {
    if (isNotStarted) {
      setTimeLeft((timeLimitMinutes || 45) * 60);
      return;
    }

    if (isEnded) {
      setTimeLeft(0);
      return;
    }

    const start = startTime ? new Date(startTime).getTime() : new Date().getTime();
    const serverRef = serverTime ? new Date(serverTime).getTime() : new Date().getTime();
    const localNow = new Date().getTime();
    const clientOffset = serverRef - localNow;

    const limitMs = (timeLimitMinutes || 45) * 60 * 1000;
    const pauseMs = (pauseDuration || 0) * 1000;

    const updateTimer = () => {
      const now = new Date().getTime() + clientOffset;
      if (!isPaused) {
        const elapsed = now - start - pauseMs;
        const remaining = Math.max(0, limitMs - elapsed);
        const secs = Math.floor(remaining / 1000);
        setTimeLeft(secs);

        if (secs === 0 && prevTimeLeftRef.current !== null && prevTimeLeftRef.current > 0) {
          if (onExpire) onExpire();
        }
        prevTimeLeftRef.current = secs;
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [serverTime, startTime, timeLimitMinutes, pauseDuration, eventStatus, isNotStarted, isPaused, isEnded, onExpire]);

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
        {isNotStarted && formatTime((timeLimitMinutes || 45) * 60)}
        {isPaused && <span className="text-amber-500 text-2xl font-fantasy tracking-wider">PAUSED</span>}
        {isEnded && <span className="text-red-500 text-2xl font-fantasy tracking-wider">TIME'S UP</span>}
        {isLive && (timeLeft === 0 ? <span className="text-red-500 text-2xl font-fantasy tracking-wider">TIME'S UP</span> : formatTime(timeLeft))}
      </div>
    </div>
  );
};

export default CountdownTimer;
