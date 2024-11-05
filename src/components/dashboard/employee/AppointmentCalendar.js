// src/components/dashboard/employee/AppointmentCalendar.js
import React from "react";
import { format, subMonths, addMonths, parseISO, isSameDay } from "date-fns";
import { sk } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { motion } from "framer-motion";

import { Calendar } from "src/components/ui/calendar";
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
import { Card, CardContent } from "src/components/ui/card";

const AppointmentsList = ({
  appointments,
  onFinishAppointment,
  getClientDisplay,
}) => {
  if (!appointments?.length) {
    return (
      <p className="text-gray-500 italic text-center py-4">
        Žiadne rezervácie na tento deň.
      </p>
    );
  }

  return (
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
        {appointments.map((appointment) => (
          <TableRow key={appointment.id}>
            <TableCell className="font-medium">
              {format(parseISO(appointment.start_time), "HH:mm")}
            </TableCell>
            <TableCell>{getClientDisplay(appointment)}</TableCell>
            <TableCell>
              <Badge variant="secondary">{appointment?.services?.name}</Badge>
            </TableCell>
            <TableCell>
              <Button
                onClick={() => onFinishAppointment(appointment)}
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={appointment.status === "completed"}
              >
                {appointment.status === "completed" ? "Completed" : "Finish"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const AppointmentCalendar = ({
  selectedDate,
  currentMonth,
  onDateSelect,
  onMonthChange,
  appointments,
  appointmentDays,
  isLoading,
  getClientDisplay,
  handleFinishAppointment,
}) => {
  // Filter appointments for selected date
  const filteredAppointments = appointments.filter((appointment) =>
    isSameDay(parseISO(appointment.start_time), selectedDate)
  );

  return (
    <Card className="lg:col-span-2 bg-white shadow-xl rounded-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
          {/* Calendar Section */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-lg">
                {format(currentMonth, "MMMM yyyy", { locale: sk })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMonthChange(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateSelect}
                className="rounded-md border shadow"
                modifiers={{
                  booked: (date) =>
                    appointmentDays.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersStyles={{
                  booked: { backgroundColor: "#ec4899", color: "white" },
                }}
                month={currentMonth}
                onMonthChange={onMonthChange}
              />
            </motion.div>
          </div>

          {/* Appointments List Section */}
          <div className="flex-grow">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">
                Rozvrh na {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
              </h3>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Clock className="mr-1 h-4 w-4" />
                <span>{filteredAppointments.length} rezervácií</span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg overflow-hidden"
              >
                <AppointmentsList
                  appointments={filteredAppointments}
                  onFinishAppointment={handleFinishAppointment}
                  getClientDisplay={getClientDisplay}
                />
              </motion.div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentCalendar;
