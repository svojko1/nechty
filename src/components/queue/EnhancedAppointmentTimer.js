import React, { useState, useEffect } from "react";

import { format, differenceInSeconds, isPast, isToday } from "date-fns";
import { toast } from "react-hot-toast";
import { supabase } from "src/supabaseClient";
import {
  Clock,
  Calendar,
  ArrowRight,
  Maximize2,
  Minimize2,
  UserCheck,
} from "lucide-react";
import { sk, vi } from "date-fns/locale";
import { useLanguage } from "src/components/contexts/LanguageContext";

// UI Components
import { Card, CardContent } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";

// Functional Components
import { finishCustomerAppointment } from "src/utils/employeeAvailability";
import { acceptCustomerCheckIn } from "src/utils/employeeAvailability";

// Constants
const APPOINTMENT_STATUS = {
  WAITING: "waiting",
  UPCOMING: "upcoming",
  IN_PROGRESS: "in-progress",
  OVERTIME: "overtime",
  OVERDUE: "overdue",
};

const NextAppointmentCard = ({ appointment }) => {
  const { currentLanguage, t } = useLanguage();
  const dateLocale = currentLanguage === "vi" ? vi : sk;
  if (!appointment) return null;

  return (
    <div className="mt-6">
      <div className="text-blue-600 text-sm font-medium mb-2">
        {t("timer.nextAppointment")}
      </div>
      <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-center mb-1">
          <span className="text-gray-600 text-sm">
            {format(new Date(appointment.start_time), "HH:mm", {
              locale: dateLocale,
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 ">
            <h4 className="font-medium text-gray-900">
              {appointment.services?.name}
            </h4>
            <p className="text-gray-500 text-sm">{appointment.customer_name}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const EnhancedAppointmentTimer = ({
  appointment: initialAppointment,
  nextAppointment,
  onAppointmentFinished,
}) => {
  // State management
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState(APPOINTMENT_STATUS.WAITING);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentAppointment, setCurrentAppointment] =
    useState(initialAppointment);

  // Dialog states
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);
  const [price, setPrice] = useState("");

  const { t, currentLanguage } = useLanguage();
  const dateLocale = currentLanguage === "vi" ? vi : sk;

  // Add this after the state declarations
  const updateStatus = (appointment) => {
    if (!appointment) {
      setStatus(APPOINTMENT_STATUS.WAITING);
      return;
    }

    const now = new Date();
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);

    if (isPast(end)) {
      const overtimeSeconds = differenceInSeconds(now, end);
      setTimeLeft(overtimeSeconds);
      setStatus(
        overtimeSeconds > 900
          ? APPOINTMENT_STATUS.OVERDUE
          : APPOINTMENT_STATUS.OVERTIME
      );
    } else if (isPast(start)) {
      setTimeLeft(differenceInSeconds(end, now));
      setStatus(APPOINTMENT_STATUS.IN_PROGRESS);
    } else {
      setTimeLeft(differenceInSeconds(now, start));
      setStatus(APPOINTMENT_STATUS.UPCOMING);
    }
  };

  // Subscription management
  useEffect(() => {
    fetchCurrentAppointment();

    // Set up real-time subscription for appointments
    const appointmentSubscription = supabase
      .channel("appointments-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          // Refresh the current appointment when changes occur
          fetchCurrentAppointment();
        }
      )
      .subscribe();

    return () => {
      // Cleanup subscription
      supabase.removeChannel(appointmentSubscription);
    };
  }, []);

  // Timer management
  useEffect(() => {
    const timer = setInterval(updateTimerStatus, 1000);
    return () => clearInterval(timer);
  }, [currentAppointment]);

  // Data fetching
  const fetchCurrentAppointment = async () => {
    try {
      const now = new Date().toISOString();

      // Get the current user's employee record first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (employeeError) throw employeeError;
      if (!employeeData) throw new Error("Employee record not found");

      // Then fetch the current appointment for this employee
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
        .eq("employee_id", employeeData.id)
        .lte("start_time", now)
        .gte("end_time", now)
        .order("start_time", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCurrentAppointment(data);
        updateStatus(data);
      } else {
        setCurrentAppointment(null);
        updateStatus(null);
      }
    } catch (error) {
      console.error("Error fetching current appointment:", error);
      setCurrentAppointment(null);
      updateStatus(null);
    }
  };

  const handleCheckInNext = async () => {
    const nextAppointmentToProcess = nextAppointment || currentAppointment;

    if (!nextAppointmentToProcess) {
      toast.error("No appointment to process");
      return;
    }

    try {
      // Start a Supabase transaction
      const client = await supabase.rpc("begin_transaction");

      try {
        if (nextAppointmentToProcess.status === "pending_approval") {
          // Handle pending approval case
          const result = await acceptCustomerCheckIn(
            nextAppointmentToProcess.id
          );
          if (result.error) throw result.error;

          // Update employee queue
          const { error: queueError } = await supabase
            .from("employee_queue")
            .update({
              current_customer_id: nextAppointmentToProcess.id,
              last_assignment_time: new Date().toISOString(),
            })
            .eq("employee_id", nextAppointmentToProcess.employee_id)
            .eq("is_active", true);

          if (queueError) throw queueError;

          await supabase.rpc("commit_transaction");
          toast.success("Appointment started successfully");
        } else if (!nextAppointmentToProcess.arrival_time) {
          // Handle new arrival check-in
          const { data, error } = await supabase
            .from("appointments")
            .update({
              arrival_time: new Date().toISOString(),
              status: "pending_approval",
            })
            .eq("id", nextAppointmentToProcess.id)
            .select()
            .single();

          if (error) throw error;

          // Update employee queue to show this pending customer
          const { error: queueError } = await supabase
            .from("employee_queue")
            .update({
              current_customer_id: nextAppointmentToProcess.id,
              last_assignment_time: new Date().toISOString(),
            })
            .eq("employee_id", nextAppointmentToProcess.employee_id)
            .eq("is_active", true);

          if (queueError) throw queueError;

          await supabase.rpc("commit_transaction");
          toast.success("Customer checked in successfully");
        } else {
          // Start appointment for already checked-in customer
          const now = new Date();
          const { data, error } = await supabase
            .from("appointments")
            .update({
              status: "in_progress",
              start_time: now.toISOString(),
            })
            .eq("id", nextAppointmentToProcess.id)
            .select()
            .single();

          if (error) throw error;

          // Update employee queue with the current customer
          const { error: queueError } = await supabase
            .from("employee_queue")
            .update({
              current_customer_id: nextAppointmentToProcess.id,
              last_assignment_time: now.toISOString(),
            })
            .eq("employee_id", nextAppointmentToProcess.employee_id)
            .eq("is_active", true);

          if (queueError) throw queueError;

          await supabase.rpc("commit_transaction");
          toast.success("Appointment started successfully");
        }

        // Refresh data
        await fetchCurrentAppointment();
      } catch (error) {
        await supabase.rpc("rollback_transaction");
        throw error;
      }
    } catch (error) {
      console.error("Error processing appointment:", error);
      toast.error(error.message || "Failed to process appointment");
    }
  };

  // Appointment completion
  const handleConfirmFinish = async () => {
    try {
      if (!price || isNaN(parseFloat(price))) {
        toast.error("Please enter a valid price");
        return;
      }

      const { status, completedAppointment, nextAppointment, error } =
        await finishCustomerAppointment(
          { ...currentAppointment, price: parseFloat(price) },
          currentAppointment.facility_id
        );

      if (error) throw error;

      // Show appropriate success message based on whether a new customer was assigned
      toast.success(
        status === "NEXT_CUSTOMER_ASSIGNED"
          ? "Appointment completed and new customer assigned!"
          : "Appointment completed successfully!"
      );

      // Close dialogs and reset state
      setIsFinishDialogOpen(false);
      setIsConfirmationDialogOpen(false);
      setPrice("");

      // Notify parent component if callback exists
      if (onAppointmentFinished) {
        onAppointmentFinished(completedAppointment);
      }
    } catch (error) {
      console.error("Error finishing appointment:", error);
      toast.error("Failed to complete appointment");
    }
  };

  // UI helpers
  const updateTimerStatus = () => {
    if (!currentAppointment) return;

    const now = new Date();
    const start = new Date(currentAppointment.start_time);
    const end = new Date(currentAppointment.end_time);

    if (isPast(end)) {
      const overtimeSeconds = differenceInSeconds(now, end);
      setTimeLeft(overtimeSeconds);
      setStatus(
        overtimeSeconds > 900
          ? APPOINTMENT_STATUS.OVERDUE
          : APPOINTMENT_STATUS.OVERTIME
      );
    } else if (isPast(start)) {
      setTimeLeft(differenceInSeconds(end, now));
      setStatus(APPOINTMENT_STATUS.IN_PROGRESS);
    } else {
      setTimeLeft(differenceInSeconds(now, start));
      setStatus(APPOINTMENT_STATUS.UPCOMING);
    }
  };

  const isCurrentAppointment = (appointment) => {
    const now = new Date();
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    return now >= start && now < end;
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
    const statusColors = {
      [APPOINTMENT_STATUS.IN_PROGRESS]:
        "bg-green-100 border-green-500 text-green-700",
      [APPOINTMENT_STATUS.OVERTIME]:
        "bg-yellow-100 border-yellow-500 text-yellow-700",
      [APPOINTMENT_STATUS.OVERDUE]: "bg-red-100 border-red-500 text-red-700",
      [APPOINTMENT_STATUS.WAITING]: "bg-blue-100 border-blue-500 text-blue-700",
    };
    return statusColors[status] || statusColors[APPOINTMENT_STATUS.WAITING];
  };

  const getStatusText = () => {
    const statusTexts = {
      [APPOINTMENT_STATUS.UPCOMING]: t("timer.status.upcoming"),
      [APPOINTMENT_STATUS.IN_PROGRESS]: t("timer.status.inProgress"),
      [APPOINTMENT_STATUS.OVERTIME]: t("timer.status.overtime"),
      [APPOINTMENT_STATUS.OVERDUE]: t("timer.status.overdue"),
      [APPOINTMENT_STATUS.WAITING]: t("timer.status.waiting"),
    };
    return statusTexts[status] || "";
  };

  const formatCustomerName = (fullName) => {
    if (!fullName) return "";
    return fullName.split(" ")[0];
  };

  // Render functions
  const renderTimeInfo = () => {
    if (!currentAppointment) return null;

    const start = new Date(currentAppointment.start_time);
    const appointmentDate = isToday(start)
      ? t("currentAppointment.today")
      : format(start, "dd.MM.yyyy", { locale: dateLocale });

    return (
      <div className="flex flex-col mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">{appointmentDate}</span>
          </div>
          <Badge variant="outline" className={getStatusColor()}>
            {status === APPOINTMENT_STATUS.UPCOMING
              ? t("timer.status.waiting")
              : status === APPOINTMENT_STATUS.IN_PROGRESS
              ? t("timer.status.inProgress")
              : status === APPOINTMENT_STATUS.WAITING
              ? t("timer.status.waiting")
              : t("timer.status.overtime")}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span className="text-sm">{format(start, "HH:mm")}</span>
          </div>
          <div className="flex items-center">
            <ArrowRight className="w-4 h-4 mx-1" />
            <span className="text-sm">
              {format(new Date(currentAppointment.end_time), "HH:mm")}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTimer = () => {
    const timerContainerClasses = isFullscreen
      ? "w-[300px] mx-auto"
      : "w-[200px] mx-auto";
    const timerClasses = `${
      isFullscreen ? "text-6xl" : "text-2xl"
    } font-bold font-mono tabular-nums`;

    if (status === APPOINTMENT_STATUS.WAITING) {
      return <div className="text-center mt-2"></div>;
    }

    return (
      <div className={`text-center mt-2 ${timerContainerClasses}`}>
        <p className="text-sm font-medium">
          {status === APPOINTMENT_STATUS.IN_PROGRESS
            ? t("timer.remaining")
            : status === APPOINTMENT_STATUS.UPCOMING
            ? t("timer.startsIn")
            : t("timer.overtime")}
        </p>
        <p className={timerClasses}>
          {status !== APPOINTMENT_STATUS.IN_PROGRESS &&
          status !== APPOINTMENT_STATUS.UPCOMING
            ? "+"
            : ""}
          {formatTime(timeLeft)}
        </p>
      </div>
    );
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Main render
  return (
    <>
      <Card
        className={`${getStatusColor()} border-l-4 transition-colors duration-300 
        ${
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
                onClick={() => setIsFinishDialogOpen(true)}
                className="w-full max-w-xs bg-green-500 hover:bg-green-600 text-white py-4 text-lg rounded-full"
              >
                {t("timer.finishAppointment")}
              </Button>
            </div>
          )}

          {nextAppointment && (
            <div className="w-full max-w-xs mt-2">
              {/* Arrival Status Badge */}
              <div className="flex justify-center mb-2">
                <Badge
                  variant="outline"
                  className={`${
                    nextAppointment.arrival_time
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                  }`}
                >
                  {nextAppointment.arrival_time
                    ? `${t("timer.customerArrived")}: ${format(
                        new Date(nextAppointment.arrival_time),
                        "HH:mm",
                        { locale: dateLocale }
                      )}`
                    : t("timer.waitingForCustomer")}
                </Badge>
              </div>
              {/* Action Button */}
              {nextAppointment.arrival_time && !currentAppointment && (
                <Button
                  onClick={handleCheckInNext}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 text-lg rounded-full"
                >
                  <UserCheck className="w-5 h-5 mr-2" />
                  {nextAppointment.arrival_time
                    ? t("timer.startNext")
                    : t("timer.checkInNext")}
                </Button>
              )}
            </div>
          )}

          {nextAppointment && (
            <NextAppointmentCard appointment={nextAppointment} />
          )}
        </CardContent>
      </Card>

      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("timer.dialog.finishTitle")}</DialogTitle>
            <DialogDescription>
              {t("timer.dialog.enterPrice")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("timer.dialog.pricePlaceholder")}
              className="text-lg py-6"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsFinishDialogOpen(false)}
              variant="outline"
            >
              {t("timer.dialog.cancel")}
            </Button>
            <Button
              onClick={() => {
                setIsFinishDialogOpen(false);
                setIsConfirmationDialogOpen(true);
              }}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {t("timer.dialog.confirm")}
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
            <DialogTitle>{t("timer.confirmDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("timer.confirmDialog.message")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-lg font-semibold">
              {t("timer.confirmDialog.price")}: {price} €
            </p>{" "}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsConfirmationDialogOpen(false)}
              variant="outline"
            >
              {t("timer.confirmDialog.cancel")}
            </Button>
            <Button
              onClick={handleConfirmFinish}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {t("timer.confirmDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedAppointmentTimer;
