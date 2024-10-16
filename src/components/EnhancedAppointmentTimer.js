import React, { useState, useEffect } from "react";
import {
  format,
  differenceInSeconds,
  isPast,
  isToday,
  addDays,
} from "date-fns";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Clock,
  Calendar,
  ArrowRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

const EnhancedAppointmentTimer = ({ appointment }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState("upcoming");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const start = new Date(appointment.start_time);
      const end = new Date(appointment.end_time);

      if (isPast(end)) {
        const overtimeSeconds = differenceInSeconds(now, end);
        setTimeLeft(overtimeSeconds);
        setStatus(overtimeSeconds > 900 ? "overdue" : "overtime");
      } else if (isPast(start)) {
        setTimeLeft(differenceInSeconds(end, now));
        setStatus("in-progress");
      } else {
        setTimeLeft(differenceInSeconds(now, start));
        setStatus("upcoming");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [appointment]);

  const formatTime = (seconds) => {
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const remainingSeconds = absSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "in-progress":
        return "bg-green-100 border-green-500 text-green-700";
      case "overtime":
        return "bg-yellow-100 border-yellow-500 text-yellow-700";
      case "overdue":
        return "bg-red-100 border-red-500 text-red-700";
      default:
        return "bg-blue-100 border-blue-500 text-blue-700";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "upcoming":
        return "Nadchádzajúca rezervácia";
      case "in-progress":
        return "Prebiehajúca rezervácia";
      case "overtime":
        return "Prekročený čas";
      case "overdue":
        return "Výrazne prekročený čas";
      default:
        return "";
    }
  };

  const renderTimeInfo = () => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const isUpcoming = status === "upcoming";
    const appointmentDate = isToday(start)
      ? "Dnes"
      : format(start, "dd.MM.yyyy");

    return (
      <div className="flex flex-col mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">{appointmentDate}</span>
          </div>
          <Badge variant="outline" className={getStatusColor()}>
            {status === "upcoming"
              ? "Čaká sa"
              : status === "in-progress"
              ? "Prebieha"
              : "Prekročené"}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span className="text-sm">{format(start, "HH:mm")}</span>
          </div>
          <div className="flex items-center">
            <ArrowRight className="w-4 h-4 mx-1" />
            <span className="text-sm">{format(end, "HH:mm")}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTimer = () => {
    const timerClasses = isFullscreen
      ? "text-6xl font-bold"
      : "text-2xl font-bold";

    if (status === "upcoming") {
      return (
        <div className="text-center mt-2">
          <p className="text-sm font-medium">Začína za</p>
          <p className={timerClasses}>{formatTime(timeLeft)}</p>
        </div>
      );
    } else {
      return (
        <div className="text-center mt-2">
          <p className="text-sm font-medium">
            {status === "in-progress" ? "Zostáva" : "Prekročené o"}
          </p>
          <p className={timerClasses}>
            {status === "in-progress" ? "" : "+"}
            {formatTime(timeLeft)}
          </p>
        </div>
      );
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Card
      className={`${getStatusColor()} border-l-4 transition-colors duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 flex items-center justify-center"
          : ""
      }`}
    >
      <CardContent className={`p-4 ${isFullscreen ? "text-center" : ""}`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{getStatusText()}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className={isFullscreen ? "absolute top-2 right-2" : ""}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        {renderTimeInfo()}
        {renderTimer()}
        {isFullscreen && (
          <div className="mt-4">
            <p className="text-xl font-semibold">{appointment.services.name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedAppointmentTimer;
