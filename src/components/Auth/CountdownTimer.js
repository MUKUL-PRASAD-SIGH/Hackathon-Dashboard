import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ 
  initialTime = 60, 
  onComplete, 
  onTick,
  autoStart = true,
  format = 'mm:ss' 
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isActive, setIsActive] = useState(autoStart);

  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          const newTime = time - 1;
          onTick?.(newTime);
          
          if (newTime === 0) {
            setIsActive(false);
            onComplete?.();
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, onComplete, onTick]);

  const start = () => setIsActive(true);
  const pause = () => setIsActive(false);
  const reset = (newTime = initialTime) => {
    setTimeLeft(newTime);
    setIsActive(false);
  };

  const formatTime = (seconds) => {
    if (format === 'mm:ss') {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    if (format === 'seconds') {
      return `${seconds}s`;
    }
    
    return seconds.toString();
  };

  return {
    timeLeft,
    formattedTime: formatTime(timeLeft),
    isActive,
    isComplete: timeLeft === 0,
    start,
    pause,
    reset
  };
};

// Hook version for easier use
export const useCountdown = (initialTime, options = {}) => {
  return CountdownTimer({ initialTime, ...options });
};

// Component version for direct rendering
export const CountdownDisplay = ({ 
  initialTime = 60, 
  onComplete, 
  className = '',
  prefix = 'Resend in ',
  suffix = '',
  completedText = 'Ready to resend'
}) => {
  const timer = useCountdown(initialTime, { onComplete });

  return (
    <span className={`countdown-timer ${className}`}>
      {timer.isComplete ? completedText : `${prefix}${timer.formattedTime}${suffix}`}
    </span>
  );
};

export default CountdownTimer;
