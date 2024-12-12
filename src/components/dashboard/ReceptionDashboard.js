import React, { useState, useEffect } from "react";

import { format, startOfDay, endOfDay } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Search,
  CalendarClock,
  ChevronDown,
  User,
  Clock,
  Clipboard,
  Table as TableIcon,
  Building,
} from "lucide-react";
import { supabase } from "src/supabaseClient";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";

// Functional Components
import WaitingCustomersDisplay from "src/components/queue/WaitingCustomersDisplay";
import QueueTester from "src/components/queue/QueueTester";
import EmployeeQueueDisplay from "src/components/queue/EmployeeQueueDisplay";
import PedicureStatusDisplay from "src/components/PedicureStatusDisplay";
import ComboAppointmentsTable from "./ComboAppointmentsTable";

const ReceptionDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showOlder, setShowOlder] = useState(false);
  const [userFacilityId, setUserFacilityId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [facilityName, setFacilityName] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("users")
            .select("facility_id, role")
            .eq("id", user.id)
            .single();

          if (error) throw error;

          if (data.role !== "reception") {
            toast.error("Unauthorized access");
            navigate("/");
            return;
          }

          setCurrentUser(data);
          setUserFacilityId(data.facility_id);
          await fetchFacilityName(data.facility_id);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Error loading user data");
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    if (userFacilityId) {
      fetchAppointments();
      setupRealtimeSubscription();
    }
  }, [userFacilityId, startDate, endDate, showOlder]);

  const fetchFacilityName = async (facilityId) => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("name")
        .eq("id", facilityId)
        .single();

      if (error) throw error;
      setFacilityName(data.name);
    } catch (error) {
      console.error("Error fetching facility name:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel("appointment_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `facility_id=eq.${userFacilityId}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setAppointments((prev) =>
              prev.filter((apt) => apt.id !== payload.old.id)
            );
          } else {
            const { data: updatedAppointment, error } = await supabase
              .from("appointments")
              .select(
                `
                *,
                services (name),
                employees (id, table_number, users (first_name, last_name))
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (!error) {
              setAppointments((prev) => {
                const index = prev.findIndex(
                  (apt) => apt.id === updatedAppointment.id
                );
                if (index >= 0) {
                  const newAppointments = [...prev];
                  newAppointments[index] = updatedAppointment;
                  return newAppointments;
                } else {
                  return [...prev, updatedAppointment];
                }
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      if (!userFacilityId) {
        throw new Error("No facility assigned to user");
      }

      let query = supabase
        .from("appointments")
        .select(
          `
          *,
          services (name),
          employees (id, table_number, users (first_name, last_name))
        `
        )
        .eq("facility_id", userFacilityId)
        .order("start_time", { ascending: true });

      if (!showOlder) {
        const today = new Date();
        query = query.gte("start_time", startOfDay(today).toISOString());
        query = query.lte("start_time", endOfDay(today).toISOString());
      } else {
        if (startDate) {
          query = query.gte("start_time", `${startDate}T00:00:00`);
        }
        if (endDate) {
          query = query.lte("start_time", `${endDate}T23:59:59`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group combo services
      const processedAppointments = [];
      const comboMap = new Map();

      data.forEach((appointment) => {
        if (appointment.combo_id) {
          // Changed from is_combo to combo_id check
          if (!comboMap.has(appointment.combo_id)) {
            comboMap.set(appointment.combo_id, []);
          }
          comboMap.get(appointment.combo_id).push(appointment);
        } else {
          processedAppointments.push(appointment);
        }
      });

      comboMap.forEach((comboGroup) => {
        // Add all appointments in the combo group
        comboGroup.forEach((appointment) => {
          processedAppointments.push({
            ...appointment,
            comboGroup: comboGroup, // Add reference to full combo group if needed
          });
        });
      });

      setAppointments(processedAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to fetch appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const getAppointmentStatus = (appointment) => {
    // Check if this appointment is part of a combo
    if (appointment.combo_id) {
      // Find all appointments in the same combo group
      const comboAppointments = appointments.filter(
        (app) => app.combo_id === appointment.combo_id
      );

      // Check status of all appointments in the combo
      const allCompleted = comboAppointments.every(
        (app) => app.status === "completed"
      );
      const allPaid = comboAppointments.every((app) => app.is_paid);
      const anyInProgress = comboAppointments.some(
        (app) => app.status === "in_progress"
      );

      if (allCompleted && allPaid) return "zaplatene";
      if (allCompleted) return "ukoncene";
      if (anyInProgress) return "nezaplatene";
      return "nezaplatene";
    }

    // Handle non-combo appointments
    if (appointment.status === "completed" && appointment.is_paid)
      return "zaplatene";
    if (appointment.status === "completed") return "ukoncene";
    if (appointment.status === "in_progress") return "nezaplatene";
    return "nezaplatene";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "nezaplatene":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 border-red-200"
          >
            Nezaplatené
          </Badge>
        );
      case "ukoncene":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 border-yellow-200"
          >
            Dokončené
          </Badge>
        );
      case "zaplatene":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 border-green-200"
          >
            Zaplatené
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleMarkAsPaid = async (idOrComboId) => {
    try {
      // Check if this is a combo_id
      const appointmentsToUpdate = appointments.filter(
        (app) => app.combo_id === idOrComboId || app.id === idOrComboId
      );

      await Promise.all(
        appointmentsToUpdate.map(async (app) => {
          const { error } = await supabase
            .from("appointments")
            .update({ is_paid: true })
            .eq("id", app.id);

          if (error) throw error;
        })
      );

      toast.success(
        appointmentsToUpdate.length > 1
          ? "Combo služby boli označené ako zaplatené"
          : "Služba bola označená ako zaplatená"
      );

      fetchAppointments();
    } catch (error) {
      console.error("Error marking appointment as paid:", error);
      toast.error("Nepodarilo sa označiť služby ako zaplatené");
    }
  };

  const filteredAppointments = appointments.filter(
    (appointment) =>
      appointment.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.services?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      appointment.employees?.users?.first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      appointment.employees?.users?.last_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      appointment.employees?.table_number?.toString().includes(searchTerm)
  );

  return (
    <div className="container mx-auto max-w-[1400px] space-y-4 px-4">
      {userFacilityId && (
        <EmployeeQueueDisplay className="mb-10" facilityId={userFacilityId} />
      )}
      <QueueTester facilityId={userFacilityId} />
      {userFacilityId && <PedicureStatusDisplay facilityId={userFacilityId} />}
      <WaitingCustomersDisplay facilityId={userFacilityId} />{" "}
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-pink-700 flex items-center">
              <CalendarClock className="mr-2" />
              Prehľad rezervácií
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">{facilityName}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Vyhľadať podľa emailu, telefónu, služby, zamestnanca alebo stola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow mr-2"
            />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
              min={startDate}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[180px]">
                  {showOlder ? "Všetky rezervácie" : "Len dnešné a budúce"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setShowOlder(false)}>
                  Len dnešné a budúce
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowOlder(true)}>
                  Všetky rezervácie
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={fetchAppointments}
              className="bg-pink-500 hover:bg-pink-600"
            >
              <Search className="mr-2 h-4 w-4" /> Obnoviť
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ComboAppointmentsTable
                appointments={filteredAppointments}
                onMarkAsPaid={handleMarkAsPaid}
                getStatusBadge={getStatusBadge}
                getAppointmentStatus={getAppointmentStatus}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceptionDashboard;
