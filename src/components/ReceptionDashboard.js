import React, { useState, useEffect } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { sk } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectValue,
  SelectTrigger,
} from "@radix-ui/react-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Search,
  CalendarClock,
  ChevronDown,
  User,
  Clock,
  Clipboard,
  Table as TableIcon,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import EmployeeQueueDisplay from "./EmployeeQueueDisplay";
import { toast } from "react-hot-toast";

const ReceptionDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showOlder, setShowOlder] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    fetchFacilities();
    fetchAppointments();

    // Subscribe to appointments changes
    const subscription = supabase
      .channel("appointment_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        async (payload) => {
          // Fetch the complete appointment data including related information
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

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [startDate, endDate, showOlder, selectedFacility]);

  const fetchFacilities = async () => {
    const { data, error } = await supabase
      .from("facilities")
      .select("id, name");
    if (error) {
      console.error("Error fetching facilities:", error);
    } else {
      setFacilities(data);
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("appointments")
        .select(
          `
          *,
          services (name),
          employees (id, table_number, users (first_name, last_name))
        `
        )
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

      if (selectedFacility !== "all") {
        query = query.eq("facility_id", selectedFacility);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to fetch appointments");
    } finally {
      setIsLoading(false);
    }
  };

  const getAppointmentStatus = (appointment) => {
    if (appointment.status === "completed" && !appointment.is_paid)
      return "ukoncene";
    if (appointment.status === "completed" && appointment.is_paid)
      return "zaplatene";
    if (appointment.status === "in_progress") return "nezaplatene";
    return "ukoncene";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "nezaplatene":
        return <Badge className="bg-red-500 text-white">Nezaplatené</Badge>;
      case "ukoncene":
        return <Badge className="bg-yellow-500 text-white">Dokončené</Badge>;
      case "zaplatene":
        return <Badge className="bg-green-500 text-white">Zaplatené</Badge>;
      default:
        return null;
    }
  };

  const handleMarkAsPaid = async (appointmentId) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ is_paid: true })
        .eq("id", appointmentId);

      if (error) throw error;

      // No need to fetch appointments here as the subscription will handle the update
      toast.success("Appointment marked as paid successfully");
    } catch (error) {
      console.error("Error marking appointment as paid:", error);
      toast.error("Failed to mark appointment as paid");
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

  // Rest of the component's JSX remains the same...
  return (
    <Card className="w-full">
      <EmployeeQueueDisplay className="mb-10" />

      <CardHeader>
        <CardTitle className="text-2xl font-bold text-pink-700 flex items-center">
          <CalendarClock className="mr-2" />
          Prehľad rezervácií
        </CardTitle>
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
          <Select value={selectedFacility} onValueChange={setSelectedFacility}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Vyberte zariadenie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky zariadenia</SelectItem>
              {facilities.map((facility) => (
                <SelectItem key={facility.id} value={facility.id}>
                  {facility.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={fetchAppointments}
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Search className="mr-2 h-4 w-4" /> Obnoviť
          </Button>
        </div>
        {isLoading ? (
          <p className="text-center text-gray-500">Načítavam rezervácie...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stav</TableHead>
                  <TableHead>Zamestnanec</TableHead>
                  <TableHead>Stôl</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Služba</TableHead>
                  <TableHead>Dátum a čas</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Akcia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => {
                  const status = getAppointmentStatus(appointment);
                  return (
                    <TableRow key={appointment.id}>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-gray-500" />
                          <span>
                            {appointment.employees?.users?.first_name}{" "}
                            {appointment.employees?.users?.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <TableIcon className="mr-2 h-4 w-4 text-gray-500" />
                          {appointment.employees?.table_number || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{appointment.email}</p>
                          <p className="text-sm text-gray-500">
                            {appointment.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.services?.name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-gray-500" />
                          {format(
                            new Date(appointment.start_time),
                            "d. MMMM yyyy HH:mm",
                            { locale: sk }
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clipboard className="mr-2 h-4 w-4 text-gray-500" />
                          {appointment.price ? `${appointment.price} €` : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {status === "ukoncene" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(appointment.id)}
                          >
                            Označiť ako zaplatené
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceptionDashboard;
