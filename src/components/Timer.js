import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { differenceInSeconds, addMinutes, isBefore, isAfter } from "date-fns";

const Timer = ({ startTime, duration }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    const start = new Date(startTime);
    const endTime = addMinutes(start, duration);

    const timer = setInterval(() => {
      const now = new Date();

      if (isBefore(now, start)) {
        setStatus("waiting");
        setTimeLeft(differenceInSeconds(start, now));
      } else if (isBefore(now, endTime)) {
        setStatus("in-progress");
        setTimeLeft(differenceInSeconds(endTime, now));
      } else {
        clearInterval(timer);
        setTimeLeft(0);
        setStatus("completed");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, duration]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusText = () => {
    switch (status) {
      case "waiting":
        return "Čakanie na začiatok";
      case "in-progress":
        return "Zostávajúci čas";
      case "completed":
        return "Čas vypršal!";
      default:
        return "";
    }
  };

  return (
    <Card
      className={`text-center p-6 ${
        status === "completed" ? "bg-yellow-200" : ""
      }`}
    >
      <CardContent>
        <h3 className="text-2xl font-bold mb-2">{getStatusText()}</h3>
        <div className="text-4xl font-mono font-bold">
          {formatTime(timeLeft)}
        </div>
        {status === "waiting" && (
          <p className="mt-4 text-blue-600 font-semibold">
            Rezervácia ešte nezačala
          </p>
        )}
        {status === "in-progress" && (
          <p className="mt-4 text-green-600 font-semibold">
            Rezervácia prebieha
          </p>
        )}
        {status === "completed" && (
          <p className="mt-4 text-red-600 font-semibold">Rezervácia skončila</p>
        )}
      </CardContent>
    </Card>
  );
};

export default Timer;
