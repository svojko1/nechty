import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar } from "./ui/calendar";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { motion, AnimatePresence } from "framer-motion";
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
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";

// Mock data for employee schedule and earnings
const mockSchedule = [
  {
    date: "2024-08-14",
    time: "9:00",
    client: "Anna Malá",
    service: "Manikúra",
  },
  {
    date: "2024-08-14",
    time: "11:00",
    client: "Ján Veľký",
    service: "Gélové nechty",
  },
  {
    date: "2024-08-15",
    time: "10:00",
    client: "Eva Stredná",
    service: "Pedikúra",
  },
  {
    date: "2024-08-16",
    time: "14:00",
    client: "Mária Nová",
    service: "Akrylové nechty",
  },
  {
    date: "2024-08-17",
    time: "13:00",
    client: "Peter Starý",
    service: "Manikúra",
  },
];

const mockEarnings = 1250; // in euros
const mockRating = 4.8;
const mockTotalAppointments = 45;
const monthlyGoal = 60;

function EmployeeDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const filteredSchedule = mockSchedule.filter(
    (appointment) =>
      format(parseISO(appointment.date), "yyyy-MM-dd") ===
      format(selectedDate, "yyyy-MM-dd")
  );

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const appointmentDays = new Set(mockSchedule.map((a) => a.date));

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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Dashboard zamestnanca
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={DollarSign}
          title="Mesačný zárobok"
          value={`${mockEarnings} €`}
          change="5.2"
          changeType="increase"
        />
        <StatCard
          icon={Star}
          title="Hodnotenie"
          value={mockRating.toFixed(1)}
          change="0.3"
          changeType="increase"
        />
        <StatCard
          icon={Users}
          title="Počet rezervácií"
          value={mockTotalAppointments}
          change="3.1"
          changeType="increase"
        />
        <StatCard
          icon={Briefcase}
          title="Mesačný cieľ"
          value={`${((mockTotalAppointments / monthlyGoal) * 100).toFixed(0)}%`}
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
                <AnimatePresence>
                  {filteredSchedule.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Čas</TableHead>
                            <TableHead>Klient</TableHead>
                            <TableHead>Služba</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSchedule.map((appointment, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {appointment.time}
                              </TableCell>
                              <TableCell>{appointment.client}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {appointment.service}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </motion.div>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-gray-500 italic"
                    >
                      Žiadne rezervácie na tento deň.
                    </motion.p>
                  )}
                </AnimatePresence>
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
                  {mockTotalAppointments}
                </p>
                <p className="text-gray-600">Celkový počet rezervácií</p>
              </div>
              <div className="w-full">
                <Progress
                  value={(mockTotalAppointments / monthlyGoal) * 100}
                  className="h-4"
                />
                <p className="text-center text-sm text-gray-600 mt-2">
                  {mockTotalAppointments} z {monthlyGoal} rezervácií tento
                  mesiac
                </p>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-semibold mb-2">Top služby</h4>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span>Manikúra</span>
                    <Badge>15</Badge>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Gélové nechty</span>
                    <Badge>12</Badge>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Pedikúra</span>
                    <Badge>8</Badge>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-white shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 flex justify-between items-center">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Clock className="mr-2" />
            Nadchádzajúce rezervácie
          </CardTitle>
          <Button
            variant="secondary"
            onClick={() => setShowAllAppointments(!showAllAppointments)}
          >
            {showAllAppointments ? "Skryť" : "Zobraziť všetky"}
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <AnimatePresence>
            {showAllAppointments ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Čas</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Služba</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSchedule.map((appointment, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(parseISO(appointment.date), "d. MM. yyyy")}
                        </TableCell>
                        <TableCell>{appointment.time}</TableCell>
                        <TableCell>{appointment.client}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {appointment.service}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ul className="space-y-4">
                  {mockSchedule.slice(0, 5).map((appointment, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <p className="font-medium">{appointment.client}</p>
                        <p className="text-sm text-gray-500">
                          {appointment.service}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {format(parseISO(appointment.date), "d. MM. yyyy")}
                        </p>
                        <p className="text-sm text-gray-500">
                          {appointment.time}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmployeeDashboard;
