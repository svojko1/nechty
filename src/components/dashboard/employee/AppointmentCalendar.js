import React from "react";
import { format, subMonths, addMonths, parseISO, isSameDay } from "date-fns";
import { sk, vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, User, Calendar } from "lucide-react";
import { useLanguage } from "src/components/contexts/LanguageContext";

import { Calendar as CalendarComponent } from "src/components/ui/calendar";
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
import { Card } from "src/components/ui/card";

const AppointmentsList = ({
  appointments,
  onFinishAppointment,
  getClientDisplay,
  dateLocale,
  t,
}) => {
  if (!appointments?.length) {
    return (
      <div className="text-center py-6 text-gray-500">
        {t("calendar.noAppointments")}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("calendar.time")}</TableHead>
            <TableHead>{t("dashboard.client")}</TableHead>
            <TableHead className="hidden sm:table-cell">
              {t("dashboard.service")}
            </TableHead>
            <TableHead>{t("calendar.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell className="whitespace-nowrap">
                {format(parseISO(appointment.start_time), "HH:mm", {
                  locale: dateLocale,
                })}
              </TableCell>
              <TableCell>{getClientDisplay(appointment)}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="secondary">{appointment?.services?.name}</Badge>
              </TableCell>
              <TableCell>
                <Button
                  onClick={() => onFinishAppointment(appointment)}
                  className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto"
                  disabled={appointment.status === "completed"}
                >
                  {appointment.status === "completed"
                    ? t("calendar.completed")
                    : t("calendar.finish")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
  const { currentLanguage, t } = useLanguage();
  const dateLocale = currentLanguage === "vi" ? vi : sk;

  const filteredAppointments = appointments.filter((appointment) =>
    isSameDay(parseISO(appointment.start_time), selectedDate)
  );

  return (
    <Card className="w-full bg-white shadow-xl rounded-lg overflow-hidden p-4 md:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Section */}

        <div className="flex justify-center items-center">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            className="rounded-md"
            modifiers={{
              booked: (date) => appointmentDays.has(format(date, "yyyy-MM-dd")),
            }}
            modifiersStyles={{
              booked: { backgroundColor: "#ec4899", color: "white" },
            }}
            month={currentMonth}
            onMonthChange={onMonthChange}
            locale={dateLocale}
          />
        </div>

        {/* Appointments List Section */}
        {/* Appointments List Section */}
        <div className="flex-grow">
          <div className="mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(selectedDate, "d. MMMM yyyy", { locale: dateLocale })}
            </h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Clock className="mr-1 h-4 w-4" />
              <span>
                {filteredAppointments.length} {t("calendar.appointments")}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      {t("calendar.time")}
                    </TableHead>
                    <TableHead>{t("dashboard.client")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("dashboard.service")}
                    </TableHead>
                    <TableHead className="w-auto md:w-[120px]">
                      {t("calendar.action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(parseISO(appointment.start_time), "HH:mm", {
                          locale: dateLocale,
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getClientDisplay(appointment)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        <Badge
                          variant="secondary"
                          className="truncate max-w-[150px]"
                        >
                          {appointment?.services?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleFinishAppointment(appointment)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm py-1 px-2 h-auto"
                          disabled={appointment.status === "completed"}
                        >
                          {appointment.status === "completed"
                            ? t("calendar.completed")
                            : t("calendar.finish")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentCalendar;
