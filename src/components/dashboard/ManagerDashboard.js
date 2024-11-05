import React, { useState, useEffect } from "react";

import { format, subMonths, startOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  Award,
  Calendar,
  ArrowUp,
  ArrowDown,
  UserPlus,
  Search,
  Building,
} from "lucide-react";
import { supabase } from "src/supabaseClient";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import { Progress } from "src/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { Button } from "src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "src/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "src/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/components/ui/tabs";
import { Input } from "src/components/ui/input";

// Functional Components
import EmployeeRegistration from "src/components/auth/EmployeeRegistration";

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"];

const ManagerDashboard = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("month");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedFacility, setSelectedFacility] = useState("all");
  const [isEmployeeRegistrationOpen, setIsEmployeeRegistrationOpen] =
    useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dashboardData, setDashboardData] = useState({
    revenueData: [],
    employeePerformance: [],
    servicePopularity: [],
    upcomingAppointments: [],
    totalRevenue: 0,
    totalBookings: 0,
    averagePrice: 0,
    customerSatisfaction: 0,
    appointments: [],
    facilities: [],
    facilityComparison: [],
  });
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange, selectedFacility]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const endDate = new Date();
    const startDate = getStartDate(selectedTimeRange, endDate);

    try {
      const [
        revenueData,
        employeePerformance,
        servicePopularity,
        upcomingAppointments,
        appointments,
      ] = await Promise.all([
        fetchRevenueData(startDate, endDate),
        fetchEmployeePerformance(startDate, endDate),
        fetchServicePopularity(startDate, endDate),
        fetchUpcomingAppointments(),
        fetchAllAppointments(),
      ]);

      // Calculate totals and averages
      const totalRevenue = revenueData.reduce(
        (sum, item) => sum + item.revenue,
        0
      );
      const totalBookings = revenueData.reduce(
        (sum, item) => sum + item.bookings,
        0
      );
      const averagePrice = totalBookings > 0 ? totalRevenue / totalBookings : 0;
      const customerSatisfaction =
        calculateCustomerSatisfaction(employeePerformance);

      setDashboardData({
        revenueData,
        employeePerformance,
        servicePopularity,
        upcomingAppointments,
        appointments,
        totalRevenue,
        totalBookings,
        averagePrice,
        customerSatisfaction,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name");

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error("Error fetching facilities:", error);
    }
  };

  const fetchFacilityComparison = async (startDate, endDate) => {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id, start_time, price,
        facilities (id, name)
      `
      )
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString());

    if (error) {
      console.error("Error fetching facility comparison:", error);
      return [];
    }

    const facilityData = data.reduce((acc, appointment) => {
      const facilityId = appointment.facilities.id;
      const facilityName = appointment.facilities.name;
      if (!acc[facilityId]) {
        acc[facilityId] = { name: facilityName, revenue: 0, bookings: 0 };
      }
      acc[facilityId].revenue += appointment.price;
      acc[facilityId].bookings += 1;
      return acc;
    }, {});

    return Object.values(facilityData);
  };

  const getStartDate = (range, endDate) => {
    switch (range) {
      case "week":
        return new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return startOfMonth(subMonths(endDate, 1));
      case "quarter":
        return new Date(endDate.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
      case "year":
        return new Date(
          endDate.getFullYear() - 1,
          endDate.getMonth(),
          endDate.getDate()
        );
      default:
        return startOfMonth(subMonths(endDate, 1));
    }
  };

  const fetchRevenueData = async (startDate, endDate) => {
    let query = supabase
      .from("appointments")
      .select("start_time, price, facility_id")
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString());

    if (selectedFacility !== "all") {
      query = query.eq("facility_id", selectedFacility);
    }

    const { data, error } = await query;

    if (error) throw error;

    return Object.entries(
      data.reduce((acc, appointment) => {
        const month = format(new Date(appointment.start_time), "MMM");
        if (!acc[month]) acc[month] = { revenue: 0, bookings: 0 };
        acc[month].revenue += appointment.price;
        acc[month].bookings += 1;
        return acc;
      }, {})
    ).map(([month, { revenue, bookings }]) => ({ month, revenue, bookings }));
  };

  const fetchEmployeePerformance = async (startDate, endDate) => {
    let query = supabase
      .from("appointments")
      .select(
        `
        id, employee_id, service_id, start_time, end_time, price, status, facility_id,
        employees (id, users (first_name, last_name)),
        services (name)
      `
      )
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString());

    if (selectedFacility !== "all") {
      query = query.eq("facility_id", selectedFacility);
    }

    const { data, error } = await query;

    if (error) throw error;

    const employeeStats = data.reduce((acc, appointment) => {
      const employeeId = appointment.employee_id;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          name: `${appointment.employees.users.first_name} ${appointment.employees.users.last_name}`,
          bookings: 0,
          revenue: 0,
          services: {},
        };
      }
      acc[employeeId].bookings += 1;
      acc[employeeId].revenue += appointment.price;
      const serviceName = appointment.services.name;
      acc[employeeId].services[serviceName] =
        (acc[employeeId].services[serviceName] || 0) + 1;
      return acc;
    }, {});

    return Object.values(employeeStats).map((employee) => ({
      ...employee,
      topService: Object.entries(employee.services).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0],
    }));
  };

  const fetchServicePopularity = async (startDate, endDate) => {
    let query = supabase
      .from("appointments")
      .select("service_id, services (name), facility_id")
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString());

    if (selectedFacility !== "all") {
      query = query.eq("facility_id", selectedFacility);
    }

    const { data, error } = await query;

    if (error) throw error;

    const serviceCounts = data.reduce((acc, appointment) => {
      const serviceName = appointment.services.name;
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(serviceCounts).map(([name, value]) => ({
      name,
      value,
    }));
  };

  const fetchUpcomingAppointments = async () => {
    let query = supabase
      .from("appointments")
      .select(
        `
        id, start_time, facility_id,
        services (name),
        employees (users (first_name, last_name))
      `
      )
      .gte("start_time", new Date().toISOString())
      .order("start_time")
      .limit(5);

    if (selectedFacility !== "all") {
      query = query.eq("facility_id", selectedFacility);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  };

  const fetchAllAppointments = async () => {
    let query = supabase
      .from("appointments")
      .select(
        `
        id, start_time, end_time, status, notes, email, phone, price, facility_id,
        services (name),
        employees (users (first_name, last_name))
      `
      )
      .order("start_time", { ascending: false });

    if (selectedFacility !== "all") {
      query = query.eq("facility_id", selectedFacility);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  };

  const calculateCustomerSatisfaction = (employeePerformance) => {
    const totalRatings = employeePerformance.reduce(
      (sum, employee) => sum + (employee.ratings ? employee.ratings.length : 0),
      0
    );
    const sumRatings = employeePerformance.reduce(
      (sum, employee) =>
        sum +
        (employee.ratings ? employee.ratings.reduce((a, b) => a + b, 0) : 0),
      0
    );
    const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
    return ((averageRating / 5) * 100).toFixed(1);
  };

  const groupAppointmentsByCustomer = (appointments) => {
    return appointments.reduce((acc, appointment) => {
      const key = appointment.email || appointment.phone;
      if (!acc[key]) {
        acc[key] = {
          email: appointment.email,
          phone: appointment.phone,
          appointments: [],
          totalAppointments: 0,
          totalSpent: 0,
        };
      }
      acc[key].appointments.push(appointment);
      acc[key].totalAppointments += 1;
      acc[key].totalSpent += appointment.price || 0;
      return acc;
    }, {});
  };

  const filteredAppointments = dashboardData.appointments.filter(
    (appointment) =>
      appointment.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.phone?.includes(searchTerm) ||
      appointment.services?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const groupedAppointments = groupAppointmentsByCustomer(filteredAppointments);

  const StatCard = ({ icon: Icon, title, value, change, changeType }) => (
    <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-pink-100 p-3 rounded-full">
            <Icon className="h-6 w-6 text-pink-500" />
          </div>
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
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full  mx-auto w-full bg-white shadow-2xl rounded-lg overflow-hidden">
      <CardContent className="p-6 space-y-8">
        <div className="p-6  min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">
                Dashboard manažéra
              </h1>
              <div className="flex items-center space-x-4">
                <Select
                  value={selectedTimeRange}
                  onValueChange={setSelectedTimeRange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Vyberte časové obdobie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Týždeň</SelectItem>
                    <SelectItem value="month">Mesiac</SelectItem>
                    <SelectItem value="quarter">Štvrťrok</SelectItem>
                    <SelectItem value="year">Rok</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedFacility}
                  onValueChange={setSelectedFacility}
                >
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
                <Dialog
                  open={isEmployeeRegistrationOpen}
                  onOpenChange={setIsEmployeeRegistrationOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-pink-500 hover:bg-pink-600 text-white">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                      <DialogDescription>
                        Create a new account for an employee here.
                      </DialogDescription>
                    </DialogHeader>
                    <EmployeeRegistration />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                icon={DollarSign}
                title="Celkové tržby"
                value={`${dashboardData.totalRevenue.toFixed(2)} €`}
                change="5.2"
                changeType="increase"
              />
              <StatCard
                icon={Users}
                title="Celkové rezervácie"
                value={dashboardData.totalBookings}
                change="3.1"
                changeType="increase"
              />
              <StatCard
                icon={TrendingUp}
                title="Priemerná cena"
                value={`${dashboardData.averagePrice.toFixed(2)} €`}
                change="1.5"
                changeType="increase"
              />
              <StatCard
                icon={Award}
                title="Spokojnosť zákazníkov"
                value={`${dashboardData.customerSatisfaction}%`}
                change="0.8"
                changeType="decrease"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                  <CardTitle className="text-2xl font-bold">
                    Mesačné tržby
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                  <CardTitle className="text-2xl font-bold">
                    Popularita služieb
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboardData.servicePopularity}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {dashboardData.servicePopularity.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white shadow-xl rounded-lg overflow-hidden mb-6">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                <CardTitle className="text-2xl font-bold">
                  Výkonnosť zamestnancov
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zamestnanec</TableHead>
                      <TableHead>Rezervácie</TableHead>
                      <TableHead>Tržby</TableHead>
                      <TableHead>Najčastejšia služba</TableHead>
                      <TableHead>Výkon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.employeePerformance.map(
                      (employee, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <Avatar className="h-10 w-10 mr-3">
                                <AvatarImage
                                  src={employee.avatar}
                                  alt={employee.name}
                                />
                                <AvatarFallback>
                                  {employee.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {employee.name}
                            </div>
                          </TableCell>
                          <TableCell>{employee.bookings}</TableCell>
                          <TableCell>{employee.revenue.toFixed(2)} €</TableCell>
                          <TableCell>{employee.topService}</TableCell>
                          <TableCell>
                            <Progress
                              value={
                                (employee.bookings /
                                  Math.max(
                                    ...dashboardData.employeePerformance.map(
                                      (e) => e.bookings
                                    )
                                  )) *
                                100
                              }
                              className="h-2 w-full"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-xl rounded-lg overflow-hidden mb-6">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                <CardTitle className="text-2xl font-bold">
                  Appointments and Customers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="appointments">
                  <TabsList className="mb-4">
                    <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  </TabsList>
                  <div className="mb-4 flex items-center">
                    <Search className="w-5 h-5 text-gray-400 mr-2" />
                    <Input
                      placeholder="Search appointments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-grow"
                    />
                  </div>
                  <TabsContent value="appointments">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email/Phone</TableHead>
                            <TableHead>Total Appointments</TableHead>
                            <TableHead>Total Spent</TableHead>
                            <TableHead>Last Appointment</TableHead>
                            <TableHead>Last Service</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(groupedAppointments).map(
                            (customer) => (
                              <TableRow key={customer.email || customer.phone}>
                                <TableCell>
                                  <div>{customer.email || "N/A"}</div>
                                  <div className="text-sm text-gray-500">
                                    {customer.phone || "N/A"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {customer.totalAppointments}
                                </TableCell>
                                <TableCell>
                                  {customer.totalSpent.toFixed(2)} €
                                </TableCell>
                                <TableCell>
                                  {format(
                                    new Date(
                                      customer.appointments[0].start_time
                                    ),
                                    "dd.MM.yyyy HH:mm"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {customer.appointments[0].services.name}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
                <CardTitle className="text-2xl font-bold">
                  Nadchádzajúce termíny
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {dashboardData.upcomingAppointments.map(
                    (appointment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border-b pb-4"
                      >
                        <div className="flex items-center">
                          <Calendar className="h-10 w-10 text-pink-500 mr-3" />
                          <div>
                            <p className="font-medium">
                              {appointment.services.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {`${appointment.employees.users.first_name} ${appointment.employees.users.last_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {format(
                              new Date(appointment.start_time),
                              "dd. MMMM yyyy"
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(appointment.start_time), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
                <div className="mt-6 text-center">
                  <Button variant="outline">Zobraziť všetky termíny</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManagerDashboard;
