import React, { useState, useEffect } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  parseISO,
  isToday,
  isFuture,
} from "date-fns";
import { sk } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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

const ReceptionDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [showOlder, setShowOlder] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [startDate, endDate, showOlder]);

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
        query = query.gte("start_time", startOfDay(new Date()).toISOString());
      } else if (startDate) {
        query = query.gte(
          "start_time",
          startOfDay(parseISO(startDate)).toISOString()
        );
      }

      if (endDate) {
        query = query.lte(
          "start_time",
          endOfDay(parseISO(endDate)).toISOString()
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
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

  const getAppointmentStatus = (appointment) => {
    const appointmentDate = new Date(appointment.start_time);
    if (appointment.status === "completed") return "completed";
    if (isToday(appointmentDate)) return "today";
    if (isFuture(appointmentDate)) return "upcoming";
    return "past";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Dokončené</Badge>;
      case "today":
        return (
          <Badge variant="warning" className="bg-yellow-500">
            Dnes
          </Badge>
        );
      case "upcoming":
        return (
          <Badge variant="default" className="bg-blue-500">
            Naplánované
          </Badge>
        );
      case "past":
        return <Badge variant="destructive">Zmeškané</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment, index) => {
                  const status = getAppointmentStatus(appointment);
                  return (
                    <TableRow
                      key={appointment.id}
                      className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
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
