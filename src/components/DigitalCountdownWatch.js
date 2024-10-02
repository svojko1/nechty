import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "./ui/card";

const DigitalCountdownWatch = ({ startTime, duration }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60); // duration in minutes, timeLeft in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
      <CardContent className="p-6 text-center">
        <h3 className="text-2xl font-bold mb-2">Odpočítavanie času</h3>
        <p className="text-sm mb-4">
          Začiatok: {format(new Date(startTime), "HH:mm")}
        </p>
        <div className="text-4xl font-mono font-bold">
          {formatTime(timeLeft)}
        </div>
      </CardContent>
    </Card>
  );
};

export default DigitalCountdownWatch;
