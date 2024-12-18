// src/components/dashboard/employee/UpcomingAppointments.js
import React from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "src/lib/utils";
import { useLanguage } from "src/components/contexts/LanguageContext";
import { sk, vi } from "date-fns/locale";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";

const UpcomingAppointments = ({
  appointments = [],
  isLoading,
  getClientDisplay,
}) => {
  const { currentLanguage, t } = useLanguage();
  const dateLocale = currentLanguage === "vi" ? vi : sk;

  // Sort and filter only upcoming appointments
  const upcomingAppointments = appointments
    .filter((app) => new Date(app.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5); // Show only next 5 appointments

  return (
    <Card className="mt-6 mb-6 bg-white shadow-xl rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
        <CardTitle className="text-2xl font-bold flex items-center">
          <CalendarClock className="mr-2" />
          {t("dashboard.nextAppointment")}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : upcomingAppointments.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.time")}</TableHead>
                  <TableHead>{t("dashboard.time")}</TableHead>
                  <TableHead>{t("dashboard.client")}</TableHead>
                  <TableHead>{t("dashboard.service")}</TableHead>
                  <TableHead>{t("dashboard.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      {format(parseISO(appointment.start_time), "dd.MM.yyyy", {
                        locale: dateLocale,
                      })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center text-gray-600">
                        <Clock className="mr-2 h-4 w-4" />
                        {format(parseISO(appointment.start_time), "HH:mm", {
                          locale: dateLocale,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{getClientDisplay(appointment)}</span>
                        {appointment.phone && (
                          <span className="text-sm text-gray-500">
                            {appointment.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {appointment.services?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn("bg-opacity-10 font-medium", {
                          "bg-yellow-500 text-yellow-700":
                            appointment.status === "scheduled",
                          "bg-green-500 text-green-700":
                            appointment.status === "confirmed",
                          "bg-blue-500 text-blue-700":
                            appointment.status === "in_progress",
                        })}
                      >
                        {t(`status.${appointment.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">
              {t("currentAppointment.noActiveAppointment")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingAppointments;
