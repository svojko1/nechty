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

  useEffect(() => {
    if (session && session.user) {
      console.log("Session detected, fetching data...");
      fetchEmployeeData();
      fetchAppointments();
    } else {
      console.log("No session, skipping data fetch");
    }
  }, [session]);

  useEffect(() => {
    if (appointments.length > 0) {
      updateCurrentAppointment();
    }
  }, [appointments]);

  const updateCurrentAppointment = () => {
    const now = new Date();
    const current = appointments.find((appointment) => {
      const start = new Date(appointment.start_time);
      const end = new Date(appointment.end_time);
      return isAfter(now, start) && isBefore(now, end);
    });

    if (current) {
      setCurrentAppointment(current);
    } else {
      const upcoming = appointments.find((appointment) =>
        isAfter(new Date(appointment.start_time), now)
      );
      setCurrentAppointment(upcoming);
    }
  };

  const fetchEmployeeData = async () => {
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (employeeError) throw employeeError;

      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      const { data: appointmentsData, error: appointmentsError } =
        await supabase
          .from("appointments")
          .select("*")
          .eq("employee_id", employeeData.id)
          .gte("start_time", startDate.toISOString())
          .lte("start_time", endDate.toISOString());

      if (appointmentsError) throw appointmentsError;

      const monthlyEarnings = appointmentsData.reduce(
        (sum, appointment) => sum + (appointment.price || 0),
        0
      );
      const totalAppointments = appointmentsData.length;

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating")
        .eq("employee_id", employeeData.id);

      if (reviewsError) throw reviewsError;

      const averageRating =
        reviewsData.reduce((sum, review) => sum + review.rating, 0) /
          reviewsData.length || 0;

      setEmployeeStats({
        monthlyEarnings,
        totalAppointments,
        rating: averageRating.toFixed(1),
        monthlyGoal: 60,
      });
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching employee data...");
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (employeeError) {
        console.error("Error fetching employee data:", employeeError);
        throw employeeError;
      }

      if (!employeeData) {
        console.error("No employee data found");
        throw new Error("No employee data found");
      }

      console.log("Employee data:", employeeData);

      const now = new Date();
      const twoMonthsLater = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      console.log("Fetching appointments...");
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name, duration, price)
        `
        )
        .eq("employee_id", employeeData.id)
        .gte("start_time", now.toISOString())
        .lte("start_time", twoMonthsLater.toISOString())
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching appointments:", error);
        throw error;
      }

      console.log("Appointments fetched:", data);
      setAppointments(data);
    } catch (error) {
      console.error("Error in fetchAppointments:", error);
      toast.error(`Failed to fetch appointments: ${error.message}`);
    } finally {
      console.log("Setting isLoading to false");
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Dashboard zamestnanca
      </h1>

      {currentAppointment && (
        <Card className="mb-6 bg-white shadow-xl rounded-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
            <CardTitle className="text-2xl font-bold flex items-center">
              <Clock className="mr-2" />
              Aktuálna rezervácia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AppointmentTimer appointment={currentAppointment} />
            <div className="mt-4">
              <p className="font-semibold">
                Klient: {getClientDisplay(currentAppointment)}
              </p>
              <p>Služba: {currentAppointment.services.name}</p>
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
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-lg">
                    {format(currentMonth, "MMMM yyyy", { locale: sk })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
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
                            {format(parseISO(appointment.start_time), "HH:mm")}
                          </TableCell>
                          <TableCell>{getClientDisplay(appointment)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {appointment.services.name}
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
                      const serviceName = appointment.services.name;
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
            <p className="text-center text-gray-500">Načítavam rezervácie...</p>
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
                      {format(parseISO(appointment.start_time), "dd.MM.yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(appointment.start_time), "HH:mm")}
                    </TableCell>
                    <TableCell>{getClientDisplay(appointment)}</TableCell>
                    <TableCell>{appointment.services.name}</TableCell>
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

      <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish Appointment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="price">Enter Price</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsFinishDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handlePriceSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConfirmationDialogOpen}
        onOpenChange={setIsConfirmationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Appointment Completion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to finish this appointment?</p>
            <p>Price: {price}€</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsConfirmationDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmFinish}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmployeeDashboard;
