import React, { useState, useEffect } from "react";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  addMonths,
  subMonths,
  isSameDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { sk } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Calendar } from "./ui/calendar";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Star,
  DollarSign,
  Calendar as CalendarIcon,
  Users,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { toast } from "react-hot-toast";
import AppointmentTimer from "./AppointmentTimer";
import EnhancedAppointmentTimer from "./EnhancedAppointmentTimer";

function EmployeeDashboard({ session }) {
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
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [queueId, setQueueId] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (session && session.user) {
      console.log("Session detected, fetching data...");
      if (session && session.user) {
        fetchEmployeeData();
      }
      fetchAppointments();
    } else {
      console.log("No session, skipping data fetch");
    }
  }, [session]);

  useEffect(() => {
    if (session && session.user) {
      fetchEmployeeData();
    }
  }, [session]);

  useEffect(() => {
    if (employeeData) {
      checkEmployeeQueueStatus();
    }
  }, [employeeData]);

  const checkEmployeeQueueStatus = async () => {
    if (employeeData) {
      try {
        const { data, error } = await supabase
          .from("employee_queue")
          .select("id, is_active, check_in_time")
          .eq("employee_id", employeeData.id)
          .eq("is_active", true)
          .order("check_in_time", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // Use the most recent active entry
          setIsCheckedIn(true);
          setQueueId(data[0].id);
        } else {
          setIsCheckedIn(false);
          setQueueId(null);
        }
      } catch (error) {
        console.error("Error checking employee queue status:", error);
        toast.error("Failed to check employee status. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (appointments.length > 0) {
      updateCurrentAppointment(appointments);
    }
  }, [appointments]);

  const handleCheckIn = async () => {
    if (!employeeData) {
      toast.error("Employee data not available. Please try again.");
      return;
    }

    try {
      // First, check if there's an active entry
      const { data: existingEntries, error: fetchError } = await supabase
        .from("employee_queue")
        .select("id")
        .eq("employee_id", employeeData.id)
        .eq("is_active", true);

      if (fetchError) throw fetchError;

      if (existingEntries && existingEntries.length > 0) {
        // If there are active entries, update the most recent one
        const { error: updateError } = await supabase
          .from("employee_queue")
          .update({
            check_in_time: new Date().toISOString(),
            is_active: true,
          })
          .eq("id", existingEntries[0].id);

        if (updateError) throw updateError;

        setIsCheckedIn(true);
        setQueueId(existingEntries[0].id);
      } else {
        // If no active entries, create a new one
        const { data, error: insertError } = await supabase
          .from("employee_queue")
          .insert({
            employee_id: employeeData.id,
            facility_id: employeeData.facility_id,
            check_in_time: new Date().toISOString(),
            is_active: true,
            position_in_queue: 0, // This should be calculated based on the current queue
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setIsCheckedIn(true);
        setQueueId(data.id);
      }

      toast.success("Successfully checked in!");
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in. Please try again.");
    }
  };

  const handleCheckOut = async () => {
    try {
      const { error } = await supabase
        .from("employee_queue")
        .update({
          check_out_time: new Date().toISOString(),
          is_active: false,
        })
        .eq("id", queueId);

      if (error) throw error;

      setIsCheckedIn(false);
      setQueueId(null);
      toast.success("Successfully checked out!");
    } catch (error) {
      console.error("Error checking out:", error);
      toast.error("Failed to check out. Please try again.");
    }
  };

  const updateCurrentAppointment = (appointmentsData = []) => {
    const now = new Date();
    const current = appointmentsData.find((appointment) => {
      const start = new Date(appointment.start_time);
      const end = new Date(appointment.end_time);
      return now >= start && now < end;
    });

    setCurrentAppointment(current || null);
  };

  const fetchEmployeeData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*, users!inner(*)")
        .eq("users.id", session.user.id)
        .single();

      if (error) throw error;

      setEmployeeData(data);
      setIsApproved(data.status === "approved");
    } catch (error) {
      console.error("Error fetching employee data:", error);
      toast.error("Failed to fetch employee data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (employeeError) throw employeeError;

      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name, duration, price)
        `
        )
        .eq("employee_id", employeeData.id)
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      //       const testAppointment = {
      //   id: 'test-appointment',
      //   start_time: new Date(now.getTime() - 5 * 60000).toISOString(), // 5 minutes ago
      //   end_time: new Date(now.getTime() + 55 * 60000).toISOString(), // 55 minutes from now
      //   services: { name: 'Test Service' },
      //   customer_name: 'Test Customer',
      //   email: 'test@example.com',
      //   phone: '1234567890'
      // };

      // setAppointments([testAppointment, ...data]);
      // updateCurrentAppointment([testAppointment, ...data]);
      setAppointments(data);
      updateCurrentAppointment(data); // Pass the fetched data here
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error(`Failed to fetch appointments: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          price: parseFloat(price),
          end_time: new Date().toISOString(),
        })
        .eq("id", selectedAppointment.id)
        .select();

      if (error) throw error;

      toast.success("Appointment finished successfully");
      setIsConfirmationDialogOpen(false);
      fetchAppointments();
    } catch (error) {
      console.error("Error finishing appointment:", error);
      toast.error("Failed to finish appointment");
    }
  };

  const getClientDisplay = (appointment) => {
    return appointment.email || appointment.phone || "N/A";
  };

  const StatCard = ({ icon: Icon, title, value, change, changeType }) => (
    <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-pink-100 p-3 rounded-full">
            <Icon className="h-6 w-6 text-pink-500" />
          </div>
          {change && (
            <div
              className={`flex items-center ${
                changeType === "increase" ? "text-green-500" : "text-red-500"
              }`}
            >
              {changeType === "increase" ? (
                <ArrowUp className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm font-medium">{change}%</span>
            </div>
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );

  const filteredAppointments = appointments.filter((appointment) =>
    isSameDay(parseISO(appointment.start_time), selectedDate)
  );

  const appointmentDays = new Set(
    appointments.map((a) => format(parseISO(a.start_time), "yyyy-MM-dd"))
  );
  const renderCheckInOutButton = () => {
    if (!isApproved) {
      return (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4"
          role="alert"
        >
          <p className="font-bold">Neschválený</p>
          <p>
            Vaše konto čaká na schválenie administrátorom. Prosím, skontrolujte
            to neskôr.
          </p>
        </div>
      );
    }

    return isCheckedIn ? (
      <Button
        onClick={handleCheckOut}
        className="bg-red-500 hover:bg-red-600 text-white"
      >
        Check Out
      </Button>
    ) : (
      <Button
        onClick={handleCheckIn}
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        Check In
      </Button>
    );
  };
  return (
    <Card className="w-full  mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
      <CardContent className="p-6 space-y-8">
        <div className="p-6 min-h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Dashboard zamestnanca
          </h1>

          <Card className="mt-6 bg-white shadow-xl rounded-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
              <CardTitle className="text-2xl font-bold flex items-center">
                Employee Queue Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {renderCheckInOutButton()}
            </CardContent>
          </Card>

          {currentAppointment && (
            <Card className="mb-6 bg-white shadow-xl rounded-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <Clock className="mr-2" />
                  Aktuálna rezervácia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <EnhancedAppointmentTimer appointment={currentAppointment} />
                <div className="mt-4">
                  <p className="font-semibold">
                    Klient: {getClientDisplay(currentAppointment)}
                  </p>
                  <p>Služba: {currentAppointment?.services?.name}</p>
                </div>
                <Button
                  onClick={() => handleFinishAppointment(currentAppointment)}
                  className="mt-4 bg-green-500 hover:bg-green-600 text-white"
                >
                  Ukončiť rezerváciu
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              icon={DollarSign}
              title="Mesačný zárobok"
              value={`${employeeStats.monthlyEarnings.toFixed(2)} €`}
              change="5.2"
              changeType="increase"
            />
            <StatCard
              icon={Star}
              title="Hodnotenie"
              value={employeeStats.rating}
              change="0.3"
              changeType="increase"
            />
            <StatCard
              icon={Users}
              title="Počet rezervácií"
              value={employeeStats.totalAppointments}
              change="3.1"
              changeType="increase"
            />
            <StatCard
              icon={Briefcase}
              title="Mesačný cieľ"
              value={`${(
                (employeeStats.totalAppointments / employeeStats.monthlyGoal) *
                100
              ).toFixed(0)}%`}
              change="2.5"
              changeType="increase"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white shadow-xl rounded-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <CalendarIcon className="mr-2" />
                  Váš pracovný kalendár
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentMonth(subMonths(currentMonth, 1))
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium text-lg">
                        {format(currentMonth, "MMMM yyyy", { locale: sk })}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentMonth(addMonths(currentMonth, 1))
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border shadow"
                      modifiers={{
                        booked: (date) =>
                          appointmentDays.has(format(date, "yyyy-MM-dd")),
                      }}
                      modifiersStyles={{
                        booked: { backgroundColor: "#ec4899", color: "white" },
                      }}
                      month={currentMonth}
                      onMonthChange={setCurrentMonth}
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold mb-4">
                      Rozvrh na{" "}
                      {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
                    </h3>
                    {filteredAppointments.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Čas</TableHead>
                            <TableHead>Klient</TableHead>
                            <TableHead>Služba</TableHead>
                            <TableHead>Akcia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {format(
                                  parseISO(appointment.start_time),
                                  "HH:mm"
                                )}
                              </TableCell>
                              <TableCell>
                                {getClientDisplay(appointment)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {appointment?.services?.name}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  onClick={() =>
                                    handleFinishAppointment(appointment)
                                  }
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  disabled={appointment.status === "completed"}
                                >
                                  {appointment.status === "completed"
                                    ? "Completed"
                                    : "Finish"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-gray-500 italic">
                        Žiadne rezervácie na tento deň.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <Briefcase className="mr-2" />
                  Mesačný prehľad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">
                      {employeeStats.totalAppointments}
                    </p>
                    <p className="text-gray-600">Celkový počet rezervácií</p>
                  </div>
                  <div className="w-full">
                    <Progress
                      value={
                        (employeeStats.totalAppointments /
                          employeeStats.monthlyGoal) *
                        100
                      }
                      className="h-4"
                    />
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {employeeStats.monthlyGoal} rezervácií tento mesiac
                    </p>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-2">Top služby</h4>
                    <ul className="space-y-2">
                      {Object.entries(
                        appointments.reduce((acc, appointment) => {
                          const serviceName = appointment?.services?.name;
                          acc[serviceName] = (acc[serviceName] || 0) + 1;
                          return acc;
                        }, {})
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([service, count]) => (
                          <li
                            key={service}
                            className="flex justify-between items-center"
                          >
                            <span>{service}</span>
                            <Badge>{count}</Badge>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 bg-white shadow-xl rounded-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
              <CardTitle className="text-2xl font-bold flex items-center">
                <Clock className="mr-2" />
                Nadchádzajúce rezervácie
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <p className="text-center text-gray-500">
                  Načítavam rezervácie...
                </p>
              ) : appointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Čas</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Služba</TableHead>
                      <TableHead>Stav</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.slice(0, 5).map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {format(
                            parseISO(appointment.start_time),
                            "dd.MM.yyyy"
                          )}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(appointment.start_time), "HH:mm")}
                        </TableCell>
                        <TableCell>{getClientDisplay(appointment)}</TableCell>
                        <TableCell>{appointment?.services?.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              appointment.status === "completed"
                                ? "success"
                                : "default"
                            }
                          >
                            {appointment.status === "completed"
                              ? "Completed"
                              : "Scheduled"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-gray-500">
                  Žiadne nadchádzajúce rezervácie.
                </p>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={isFinishDialogOpen}
            onOpenChange={setIsFinishDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ukončiť rezerváciu</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="price">Zadajte cenu</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Zadajte cenu"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setIsFinishDialogOpen(false)}
                  variant="outline"
                >
                  Zrušiť
                </Button>
                <Button onClick={handlePriceSubmit}>Potvrdiť</Button>
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
              </DialogHeader>
              <div className="py-4">
                <p>Ste si istý, že chcete ukončiť túto rezerváciu?</p>
                <p>Cena: {price}€</p>
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
              </DialogHeader>
              <div className="py-4">
                <p>Ste si istý, že chcete ukončiť túto rezerváciu?</p>
                <p>Cena: {price}€</p>
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
                  Potvrdiť
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default EmployeeDashboard;
