
import { useState, useEffect } from "react";

interface RealTimeTimerProps {
  startTime: string;
  endTime?: string | null;
  label: string;
  className?: string;
  updateInterval?: number; // Intervalo de atualização em ms (padrão: 1s para tempo real)
}

export function RealTimeTimer({ 
  startTime, 
  endTime, 
  label, 
  className = "", 
  updateInterval = 1000 // Padrão de 1 segundo para tempo real
}: RealTimeTimerProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (endTime) return; // Don't update if already finished

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [endTime, updateInterval]);

  const formatTimeDuration = (start: string, end?: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(currentTime);
    const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
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
