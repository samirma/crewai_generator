// crewai-web-ui/src/app/components/Timer.tsx
"use client";

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  isRunning: boolean;
  className?: string;
  duration?: number | null;
  startTime?: number | null;
}

const Timer: React.FC<TimerProps> = ({ isRunning, className, duration, startTime }) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const internalStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // If a fixed duration is provided, we don't need a running timer.
    if (typeof duration === 'number') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    if (isRunning) {
      const updateTimer = () => {
        let start = startTime;
        if (!start) {
          if (!internalStartTimeRef.current) {
            internalStartTimeRef.current = Date.now();
          }
          start = internalStartTimeRef.current;
        } else {
          // If props provide startTime, ensure internal ref is synced or ignored
          internalStartTimeRef.current = start;
        }

        const now = Date.now();
        const elapsed = (now - start) / 1000;
        setSeconds(elapsed);
      };

      // Update immediately
      updateTimer();

      intervalRef.current = setInterval(updateTimer, 100); // Update frequently for smoothness, formatted seconds will handle display
    } else {
      // Not running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // If we have a startTime and we stopped, we might want to show final time? 
      // But usually isRunning=false means stopped/paused. 
      // If duration is passed, that takes precedence.
      internalStartTimeRef.current = null;
      setSeconds(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, duration, startTime]);

  const formatTime = (totalSeconds: number): string => {
    const roundedSeconds = Math.floor(totalSeconds); // Floor for timer usually
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const timeToDisplay = typeof duration === 'number' ? duration : seconds;

  if (!isRunning && timeToDisplay === 0 && !duration) {
    // If not running and 0, and no duration, maybe standard behavior is hidden or 00:00?
    // Previous code returned null. Use 00:00 if you want visibility, or null.
    // Let's stick to returning formatted 00:00 if visible or null if strictly hidden.
    // Previous: if (!isRunning && timeToDisplay === 0) return null;
    return null;
  }

  return (
    <span className={className || ''}>
      {formatTime(timeToDisplay)}
    </span>
  );
};

export default Timer;
