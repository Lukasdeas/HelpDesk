
import { useState, useEffect } from "react";

interface RealTimeTimerProps {
  startTime: string;
  endTime?: string | null;
  label: string;
  className?: string;
}

export function RealTimeTimer({ startTime, endTime, label, className = "" }: RealTimeTimerProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (endTime) return; // Don't update if already finished

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const formatTimeDuration = (start: string, end?: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(currentTime);
    const diffMs = endDate.getTime() - startDate.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className={`text-sm ${className}`}>
      <span className="font-medium">{label}:</span>{" "}
      <span className={endTime ? "text-green-600" : "text-blue-600"}>
        {formatTimeDuration(startTime, endTime)}
      </span>
    </div>
  );
}
