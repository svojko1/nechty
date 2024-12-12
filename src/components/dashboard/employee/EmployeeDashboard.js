import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "react-hot-toast";
import { supabase } from "src/supabaseClient";

// Components
import { Card, CardContent } from "src/components/ui/card";
import { CurrentAppointmentCard } from "src/components/dashboard/employee/CurrentAppointmentCard";
import { FinishAppointmentDialog } from "src/components/dashboard/employee/FinishAppointmentDialog";

import StatisticsGrid from "src/components/dashboard/employee/StatisticsGrid";
import AppointmentCalendar from "src/components/dashboard/employee/AppointmentCalendar";
import ConfirmationDialog from "src/components/dashboard/employee/ConfirmationDialog";
import CheckInOutButton from "src/components/dashboard/employee/CheckInOutButton";
import {
  handleEmployeeCheckIn,
  handleEmployeeCheckOut,
} from "src/utils/employeeAvailability";
import UpcomingAppointments from "src/components/dashboard/employee/UpcomingAppointments";
import { useLanguage } from "src/components/contexts/LanguageContext";
import LanguageSwitcher from "src/components/dashboard/employee/LanguageSwitcher";

const EmployeeDashboard = ({ session }) => {
  // State Management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [employeeStats, setEmployeeStats] = useState({
    monthlyEarnings: 0,
    totalAppointments: 0,
    rating: 0,
    monthlyGoal: 60,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [price, setPrice] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [isApproved, setIsApproved] = useState(null);
  const [appointmentDays, setAppointmentDays] = useState(new Set());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [queueId, setQueueId] = useState(null);
  const [checkInTime, setCheckInTime] = useState(null);
  const { t } = useLanguage();

  const getCurrentAndNextAppointment = (appointmentsList) => {
    const now = new Date();

    // Sort appointments by start time
    const sortedAppointments = [...appointmentsList].sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time)
    );

    // Find current appointment
    const current = sortedAppointments.find((appointment) => {
      const start = new Date(appointment.start_time);
      const end = new Date(appointment.end_time);
      return now >= start && now <= end;
    });

    // Find next appointment (first appointment that starts after now)
    const next = sortedAppointments.find((appointment) => {
      const start = new Date(appointment.start_time);
      return start > now;
    });

    return { current, next };
  };

  const { current, next } = getCurrentAndNextAppointment(appointments);

  useEffect(() => {
    const checkEmployeeQueueStatus = async () => {
      if (employeeData?.id) {
        try {
          const { data, error } = await supabase
            .from("employee_queue")
            .select("id, is_active, check_in_time")
            .eq("employee_id", employeeData.id)
            .eq("is_active", true)
            .order("check_in_time", { ascending: false })
            .single();

          if (error && error.code !== "PGRST116") throw error;

          if (data) {
            setIsCheckedIn(true);
            setQueueId(data.id);
            setCheckInTime(data.check_in_time);
          }
        } catch (error) {
          console.error("Error checking queue status:", error);
        }
      }
    };

    checkEmployeeQueueStatus();
  }, [employeeData]);

  // Fetch Initial Data
  useEffect(() => {
    if (session?.user) {
      fetchEmployeeData();
      setupRealtimeSubscription();
    }
  }, [session]);

  useEffect(() => {
    if (employeeData?.id) {
      fetchAppointments();
      const cleanup = setupRealtimeSubscription();
      return () => {
        cleanup();
      };
    }
  }, [employeeData]);

  // Update Current Appointment
  useEffect(() => {
    if (appointments.length > 0) {
      updateCurrentAppointment(appointments);
    }
  }, [appointments]);

  const setupRealtimeSubscription = () => {
    // Existing appointment subscription
    const appointmentSubscription = supabase
      .channel(`employee_appointments_${employeeData?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `employee_id=eq.${employeeData?.id}`,
        },
        async (payload) => {
          console.log("Appointment change detected:", payload);

          // Handle different types of changes
          switch (payload.eventType) {
            case "INSERT":
              // Existing insert logic...
              break;

            case "UPDATE":
              // Update existing appointment
              setAppointments((prev) =>
                prev.map((apt) =>
                  apt.id === payload.new.id ? { ...apt, ...payload.new } : apt
                )
              );

              // If the appointment status changed to completed, recalculate stats
              if (
                payload.new.status === "completed" &&
                payload.old.status !== "completed"
              ) {
                await calculateMonthlyStats(employeeData.id);
              }
              break;

            case "DELETE":
              // Existing delete logic...
              break;
          }

          // Update current appointment status
          updateCurrentAppointment(appointments);
        }
      )
      .subscribe();

    // Existing queue subscription...
    const queueSubscription = supabase
      .channel(`employee_queue_${employeeData?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_queue",
          filter: `facility_id=eq.${employeeData?.facility_id}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentSubscription);
      supabase.removeChannel(queueSubscription);
    };
  };

  // Data Fetching Functions
  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*, users!inner(*)")
        .eq("users.id", session.user.id)
        .single();

      if (error) throw error;

      setEmployeeData(data);
      setIsApproved(data.status === "approved");
      await calculateMonthlyStats(data.id);
    } catch (error) {
      console.error("Error fetching employee data:", error);
      toast.error("Failed to fetch employee data");
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      if (!employeeData?.id) return;

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name, duration, price)
        `
        )
        .eq("employee_id", employeeData.id)
        .order("start_time", { ascending: true });

      if (error) throw error;

      setAppointments(data);
      updateCurrentAppointment(data);

      // Update appointment days
      const days = new Set(
        data.map((a) => format(parseISO(a.start_time), "yyyy-MM-dd"))
      );
      setAppointmentDays(days);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to fetch appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMonthlyStats = async (employeeId) => {
    try {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: todayAppointments, error: todayError } = await supabase
        .from("appointments")
        .select(
          `
        *,
        services (
          name,
          price,
          duration
        )
      `
        )
        .eq("employee_id", employeeId)
        .gte("start_time", startOfToday.toISOString())
        .lte("start_time", endOfToday.toISOString());

      if (todayError) throw todayError;

      // Calculate daily earnings
      const dailyEarnings = todayAppointments
        .filter((app) => app.status === "completed" && app.price)
        .reduce((sum, app) => sum + (app.price || 0), 0);

      // Fetch appointments for current month
      const { data: monthlyAppointments, error: appointmentsError } =
        await supabase
          .from("appointments")
          .select(
            `
          *,
          services (
            name,
            price,
            duration
          )
        `
          )
          .eq("employee_id", employeeId)
          .gte("start_time", firstDayOfMonth.toISOString())
          .lte("start_time", lastDayOfMonth.toISOString());

      if (appointmentsError) throw appointmentsError;

      // Fetch feedback/ratings
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("rating")
        .eq("employee_id", employeeId);

      if (feedbackError) throw feedbackError;

      // Calculate total earnings from completed appointments
      const monthlyEarnings = monthlyAppointments
        .filter((app) => app.status === "completed" && app.price)
        .reduce((sum, app) => sum + (app.price || 0), 0);

      // Calculate average rating
      const averageRating =
        feedbackData.length > 0
          ? Number(
              (
                feedbackData.reduce(
                  (sum, feedback) => sum + feedback.rating,
                  0
                ) / feedbackData.length
              ).toFixed(1)
            )
          : 0;

      // Count total appointments and categorize them
      const appointmentStats = monthlyAppointments.reduce(
        (stats, app) => {
          stats.total += 1;

          if (app.status === "completed") {
            stats.completed += 1;
          } else if (app.status === "cancelled") {
            stats.cancelled += 1;
          }

          // Group by service
          const serviceName = app.services?.name || "Unknown";
          stats.byService[serviceName] =
            (stats.byService[serviceName] || 0) + 1;

          return stats;
        },
        {
          total: 0,
          completed: 0,
          cancelled: 0,
          byService: {},
        }
      );

      // Calculate completion rate
      const completionRate =
        appointmentStats.total > 0
          ? (appointmentStats.completed / appointmentStats.total) * 100
          : 0;

      // Calculate monthly target progress
      const monthlyGoal = 60; // This could be fetched from settings or passed as parameter
      const monthProgress = (appointmentStats.total / monthlyGoal) * 100;

      // Get previous month's stats for comparison
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const { data: prevMonthData, error: prevMonthError } = await supabase
        .from("appointments")
        .select("price, status")
        .eq("employee_id", employeeId)
        .gte("start_time", prevMonthStart.toISOString())
        .lte("start_time", prevMonthEnd.toISOString());

      if (prevMonthError) throw prevMonthError;

      const prevMonthEarnings = prevMonthData
        .filter((app) => app.status === "completed" && app.price)
        .reduce((sum, app) => sum + (app.price || 0), 0);

      // Calculate earnings trend (percentage change)
      const earningsTrend =
        prevMonthEarnings > 0
          ? ((monthlyEarnings - prevMonthEarnings) / prevMonthEarnings) * 100
          : 0;

      // Update employeeStats state
      setEmployeeStats({
        monthlyEarnings,
        dailyEarnings,
        dailyAppointments: todayAppointments.length,
        completedDailyAppointments: todayAppointments.filter(
          (app) => app.status === "completed"
        ).length,
        totalAppointments: appointmentStats.total,
        completedAppointments: appointmentStats.completed,
        cancelledAppointments: appointmentStats.cancelled,
        completionRate,
        monthlyGoal,
        monthProgress,
        rating: averageRating,
        totalRatings: feedbackData.length,
        earningsTrend,
        serviceBreakdown: appointmentStats.byService,
        previousMonthEarnings: prevMonthEarnings,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error calculating monthly stats:", error);
      toast.error("Failed to load monthly statistics");

      // Set default values in case of error
      setEmployeeStats({
        monthlyEarnings: 0,
        dailyEarnings: 0,
        dailyAppointments: 0,
        completedDailyAppointments: 0,
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        completionRate: 0,
        monthlyGoal: 60,
        monthProgress: 0,
        rating: 0,
        totalRatings: 0,
        earningsTrend: 0,
        serviceBreakdown: {},
        previousMonthEarnings: 0,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        error: error.message,
      });
    }
  };

  // Event Handlers
  const handleFinishAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setPrice(appointment.price ? appointment.price.toString() : "");
    setIsFinishDialogOpen(true);
  };

  const handlePriceSubmit = () => {
    if (!price || isNaN(parseFloat(price))) {
      toast.error("Please enter a valid price");
      return;
    }
    setIsFinishDialogOpen(false);
    setIsConfirmationDialogOpen(true);
  };

  const handleConfirmFinish = async () => {
    try {
      const now = new Date();
      const { data: updatedAppointment, error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          price: parseFloat(price),
          end_time: now.toISOString(),
        })
        .eq("id", selectedAppointment.id)
        .select()
        .single();

      if (error) throw error;

      setIsConfirmationDialogOpen(false);
      toast.success("Appointment completed successfully!");
      fetchAppointments();
      setSelectedAppointment(null);
      setPrice("");
    } catch (error) {
      console.error("Error completing appointment:", error);
      toast.error("Failed to complete appointment");
    }
  };

  const updateCurrentAppointment = (appointmentsData) => {
    const now = new Date();
    const current = appointmentsData.find((appointment) => {
      const start = new Date(appointment.start_time);
      const end = new Date(appointment.end_time);
      return now >= start && now < end;
    });

    setCurrentAppointment(current || null);
  };

  // Utility Functions
  const getClientDisplay = (appointment) => {
    return appointment.email || appointment.phone || "N/A";
  };

  const handleCheckIn = async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes; // Convert to minutes

    const startTime = 5 * 60; // 5:00 in minutes
    const endTime = 21 * 60 + 30; // 21:30 in minutes

    if (currentTime < startTime || currentTime > endTime) {
      toast.error("Check-in je možný len medzi 5:00 a 21:30");
      return;
    }

    try {
      const { data, error } = await handleEmployeeCheckIn(
        employeeData.id,
        employeeData.facility_id
      );
      if (error) throw error;

      setIsCheckedIn(true);
      setQueueId(data.id);
      setCheckInTime(new Date().toISOString());
      toast.success("Successfully checked in!");
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error(error.message || "Failed to check in. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    try {
      const { data, error } = await handleEmployeeCheckOut(
        queueId,
        employeeData.facility_id
      );
      if (error) throw error;

      setIsCheckedIn(false);
      setQueueId(null);
      setCheckInTime(null);
      toast.success("Successfully checked out!");
    } catch (error) {
      console.error("Error checking out:", error);
      toast.error("Failed to check out. Please try again.");
    }
  };

  // Render Function
  return (
    <Card className="w-full mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
      <CardContent className="p-6 space-y-8">
        <div className="p-0 min-h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            {t("dashboard.title")}
          </h1>

          <LanguageSwitcher />

          <CheckInOutButton
            isCheckedIn={isCheckedIn}
            isLoading={isLoading}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            checkInTime={checkInTime}
            isApproved={isApproved}
          />

          <CurrentAppointmentCard
            currentAppointment={current}
            nextAppointment={next}
            onFinishAppointment={handleFinishAppointment}
            getClientDisplay={getClientDisplay}
            facilityId={employeeData?.facility_id}
          />
          <UpcomingAppointments
            appointments={appointments}
            isLoading={isLoading}
            onFinishAppointment={handleFinishAppointment}
            getClientDisplay={getClientDisplay}
          />

          <StatisticsGrid stats={employeeStats} />

          <AppointmentCalendar
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            onDateSelect={setSelectedDate}
            onMonthChange={setCurrentMonth}
            appointments={appointments}
            appointmentDays={appointmentDays}
            isLoading={isLoading}
            getClientDisplay={getClientDisplay}
            handleFinishAppointment={handleFinishAppointment}
          />

          <FinishAppointmentDialog
            isOpen={isFinishDialogOpen}
            onClose={() => setIsFinishDialogOpen(false)}
            price={price}
            onPriceChange={setPrice}
            onConfirm={handlePriceSubmit}
          />

          <ConfirmationDialog
            isOpen={isConfirmationDialogOpen}
            onClose={() => setIsConfirmationDialogOpen(false)}
            onConfirm={handleConfirmFinish}
            price={price}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeDashboard;
