import React, { useState, useEffect } from "react";
import { format, differenceInSeconds, isPast, isToday } from "date-fns";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";
import {
  Clock,
  Calendar,
  ArrowRight,
  Maximize2,
  Minimize2,
  User,
  CheckCircle,
} from "lucide-react";

const EnhancedAppointmentTimer = ({
  appointment: initialAppointment,
  onAppointmentFinished,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState("waiting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);
  const [price, setPrice] = useState("");
  const [currentAppointment, setCurrentAppointment] =
    useState(initialAppointment);

  useEffect(() => {
    // Set up real-time subscription for appointments
    const subscription = supabase
      .channel("appointment-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        async (payload) => {
          // If this is a new or updated appointment that should be current
          if (payload.new && isCurrentAppointment(payload.new)) {
            const { data: fullAppointment } = await supabase
              .from("appointments")
              .select(
                `
                *,
                services (name, duration, price),
                employees (
                  id,
                  users (first_name, last_name)
                )
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (fullAppointment) {
              setCurrentAppointment(fullAppointment);
              updateStatus(fullAppointment);
            }
          }
        }
      )
      .subscribe();

    // Check for current appointment on mount
    fetchCurrentAppointment();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCurrentAppointment = async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        services (name, duration, price),
        employees (
          id,
          users (first_name, last_name)
        )
      `
      )
      .lte("start_time", now)
      .gte("end_time", now)
      .limit(1)
      .single();

    if (data && !error) {
      setCurrentAppointment(data);
      updateStatus(data);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (currentAppointment) {
        const now = new Date();
        const start = new Date(currentAppointment.start_time);
        const end = new Date(currentAppointment.end_time);

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
      } else {
        setStatus("waiting");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentAppointment]);

  const isCurrentAppointment = (appointment) => {
    const now = new Date();
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    return now >= start && now < end;
  };

  const updateStatus = (appointment) => {
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
  };

  const formatTime = (seconds) => {
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const remainingSeconds = absSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case "in-progress":
        return "bg-green-100 border-green-500 text-green-700";
      case "overtime":
        return "bg-yellow-100 border-yellow-500 text-yellow-700";
      case "overdue":
        return "bg-red-100 border-red-500 text-red-700";
      case "waiting":
        return "bg-blue-100 border-blue-500 text-blue-700";
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
      case "waiting":
        return "Čakajte na ďalšieho zákazníka";
      default:
        return "";
    }
  };

  const renderTimeInfo = () => {
    if (!currentAppointment) return null;

    const start = new Date(currentAppointment.start_time);
    const end = new Date(currentAppointment.end_time);
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
              : status === "waiting"
              ? "Čaká sa"
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

  const formatCustomerName = (fullName) => {
    if (!fullName) return "";
    return fullName.split(" ")[0];
  };

  const renderTimer = () => {
    const timerContainerClasses = isFullscreen
      ? "w-[300px] mx-auto"
      : "w-[200px] mx-auto";

    const timerClasses = `${
      isFullscreen ? "text-6xl" : "text-2xl"
    } font-bold font-mono tabular-nums`;

    if (status === "waiting") {
      return <div className="text-center mt-2"></div>;
    } else if (status === "upcoming") {
      return (
        <div className={`text-center mt-2 ${timerContainerClasses}`}>
          <p className="text-sm font-medium">Začína za</p>
          <p className={timerClasses}>{formatTime(timeLeft)}</p>
        </div>
      );
    } else {
      return (
        <div className={`text-center mt-2 ${timerContainerClasses}`}>
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

  const handleFinishAppointment = () => {
    setIsFinishDialogOpen(true);
  };

  const handlePriceSubmit = () => {
    if (!price || isNaN(parseFloat(price))) {
      toast.error("Prosím, zadajte platnú cenu");
      return;
    }
    setIsFinishDialogOpen(false);
    setIsConfirmationDialogOpen(true);
  };

  const handleConfirmFinish = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          price: parseFloat(price),
          end_time: new Date().toISOString(),
        })
        .eq("id", currentAppointment.id)
        .select();

      if (error) throw error;

      toast.success("Rezervácia bola úspešne ukončená");
      setIsConfirmationDialogOpen(false);
      setCurrentAppointment(null);
      if (onAppointmentFinished) {
        onAppointmentFinished(data[0]);
      }
    } catch (error) {
      console.error("Error finishing appointment:", error);
      toast.error("Failed to finish appointment");
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
    <>
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
          {currentAppointment && (
            <div className="mt-4 space-y-4 flex flex-col items-center">
              <p className="text-xl font-semibold">
                {currentAppointment.services.name}
              </p>
              <p className="text-lg">
                {formatCustomerName(currentAppointment.customer_name)}
              </p>
              <Button
                onClick={handleFinishAppointment}
                className="w-full max-w-xs bg-green-500 hover:bg-green-600 text-white py-4 text-lg rounded-full"
              >
                Ukončiť rezerváciu
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ukončiť rezerváciu</DialogTitle>
            <DialogDescription>
              Zadajte konečnú cenu za službu.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Zadajte cenu"
              className="text-lg py-6"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsFinishDialogOpen(false)}
              variant="outline"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handlePriceSubmit}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Potvrdiť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConfirmationDialogOpen}
        onOpenChange={setIsConfirmationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potvrdiť ukončenie rezervácie</DialogTitle>
            <DialogDescription>
              Ste si istý, že chcete ukončiť túto rezerváciu?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-lg font-semibold">Cena: {price} €</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsConfirmationDialogOpen(false)}
              variant="outline"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleConfirmFinish}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Potvrdiť ukončenie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedAppointmentTimer;
