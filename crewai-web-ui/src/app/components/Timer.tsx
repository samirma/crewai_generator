// crewai-web-ui/src/app/components/Timer.tsx
"use client";

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  isRunning: boolean;
  className?: string;
  duration?: number | null;
}

const Timer: React.FC<TimerProps> = ({ isRunning, className, duration }) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof duration !== 'number') {
      if (isRunning) {
        if (!intervalRef.current) {
          setSeconds(0);
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          setSeconds(prevSeconds => prevSeconds + 1);
        }, 1000);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, duration]);

  const formatTime = (totalSeconds: number): string => {
    const roundedSeconds = Math.round(totalSeconds);
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const timeToDisplay = typeof duration === 'number' ? duration : seconds;

  if (!isRunning && timeToDisplay === 0) {
    return null;
  }

  return (
    <span className={className || ''}>
      {formatTime(timeToDisplay)}
    </span>
  );
};

export default Timer;
