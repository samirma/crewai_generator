// crewai-web-ui/src/app/components/Timer.tsx
"use client";

import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  isRunning: boolean;
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ isRunning, className }) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      // Reset timer only if it was not already running and just started.
      // This prevents resetting if a parent component re-renders but isRunning remains true.
      if (!intervalRef.current) {
        setSeconds(0);
      }
      // Clear any existing interval before starting a new one.
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
      // When stopping, we keep the seconds. It will be reset if started again.
      // If you want the timer to show 00:00 as soon as it stops, add setSeconds(0) here.
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  // Only render the timer if it's running, or if it has run and stopped (seconds > 0),
  // or if it's meant to be displayed even when stopped at 0 (e.g. if isRunning is true but seconds is still 0 briefly).
  // The primary condition for rendering is whether the timer is active (isRunning)
  // or if it has a non-zero value to display after stopping.
  if (!isRunning && seconds === 0) {
    return null; // Don't display anything if not running and timer is at 0 and never ran.
  }

  return (
    <span className={className || ''}>
      {formatTime(seconds)}
    </span>
  );
};

export default Timer;
