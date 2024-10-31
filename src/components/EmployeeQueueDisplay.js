import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { supabase } from "../supabaseClient";
import { Progress } from "./ui/progress";
import { format, startOfDay, endOfDay } from "date-fns";
import { sk } from "date-fns/locale";

// Add facilityId prop
const EmployeeQueueDisplay = ({ facilityId }) => {
  const [queueData, setQueueData] = useState([]);
  const [employeeStats, setEmployeeStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState({
    totalEmployees: 0,
    dailyRevenue: 0,
    completedAppointments: 0,
  });

  useEffect(() => {
    // Only fetch data if facilityId is provided
    if (facilityId) {
      fetchQueueData();
      fetchDailyStats();

      // Add these subscriptions
      const employeeQueueSubscription = supabase
        .channel("employee-queue-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "employee_queue",
            filter: `facility_id=eq.${facilityId}`, // Add facility filter
          },
          () => {
            fetchQueueData();
            fetchDailyStats();
          }
        )
        .subscribe();

      const appointmentsSubscription = supabase
        .channel("appointments-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `facility_id=eq.${facilityId}`, // Add facility filter
          },
          () => {
            fetchQueueData();
            fetchDailyStats();
          }
        )
        .subscribe();

      // Cleanup subscriptions
      return () => {
        supabase.removeChannel(employeeQueueSubscription);
        supabase.removeChannel(appointmentsSubscription);
      };
    }
  }, [facilityId]);

  const fetchDailyStats = async () => {
    if (!facilityId) return;

    try {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Get all employees who worked today for this facility
      const { data: activeEmployees, error: employeeError } = await supabase
        .from("employee_queue")
        .select(
          `
          employee_id,
          employees (
            id,
            table_number,
            users (
              first_name,
              last_name
            )
          )
        `
        )
        .eq("is_active", true)
        .eq("facility_id", facilityId) // Add facility filter
        .gte("check_in_time", startOfToday)
        .lte("check_in_time", endOfToday);

      if (employeeError) throw employeeError;

      // Get all completed appointments for today
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          price,
          employee_id,
          status,
          services (name)
        `
        )
        .eq("facility_id", facilityId) // Add facility filter
        .gte("start_time", startOfToday)
        .lte("end_time", endOfToday);

      if (appointmentsError) throw appointmentsError;

      // Calculate statistics per employee
      const employeeStatsMap = activeEmployees.reduce((acc, employee) => {
        const employeeAppointments = appointments.filter(
          (app) => app.employee_id === employee.employee_id
        );

        const completedAppointments = employeeAppointments.filter(
          (app) => app.status === "completed"
        );

        acc[employee.employee_id] = {
          id: employee.employee_id,
          name: `${employee.employees.users.first_name} ${employee.employees.users.last_name}`,
          tableNumber: employee.employees.table_number,
          totalAppointments: employeeAppointments.length,
          completedAppointments: completedAppointments.length,
          revenue: completedAppointments.reduce(
            (sum, app) => sum + (app.price || 0),
            0
          ),
          services: employeeAppointments.map((app) => app.services.name),
        };
        return acc;
      }, {});

      const totalRevenue = Object.values(employeeStatsMap).reduce(
        (sum, emp) => sum + emp.revenue,
        0
      );

      const employeeStatsList = Object.values(employeeStatsMap).map((emp) => ({
        ...emp,
        revenuePercentage:
          totalRevenue > 0 ? (emp.revenue / totalRevenue) * 100 : 0,
      }));

      setEmployeeStats(employeeStatsList);
      setDailyStats({
        totalEmployees: activeEmployees.length,
        dailyRevenue: totalRevenue,
        completedAppointments: appointments.filter(
          (app) => app.status === "completed"
        ).length,
      });
    } catch (error) {
      console.error("Error fetching daily stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueueData = async () => {
    if (!facilityId) return;

    setIsLoading(true);
    try {
      const { data: queueData, error: queueError } = await supabase
        .from("employee_queue")
        .select(
          `
          *,
          employees:employee_id (
            id,
            user_id,
            table_number,
            users:user_id (first_name, last_name)
          )
        `
        )
        .eq("facility_id", facilityId) // Add facility filter
        .eq("is_active", true)
        .order("position_in_queue", { ascending: true });

      if (queueError) throw queueError;

      // Fetch current appointments for each employee
      const now = new Date().toISOString();
      const employeeIds = queueData.map((item) => item.employee_id);
      const { data: appointmentsData, error: appointmentsError } =
        await supabase
          .from("appointments")
          .select("*")
          .in("employee_id", employeeIds)
          .eq("facility_id", facilityId) // Add facility filter
          .lte("start_time", now)
          .gte("end_time", now);

      if (appointmentsError) throw appointmentsError;

      // Combine queue data with current appointments
      const combinedData = queueData.map((queueItem) => {
        const currentAppointment = appointmentsData.find(
          (apt) => apt.employee_id === queueItem.employee_id
        );
        return { ...queueItem, currentAppointment };
      });

      setQueueData(combinedData);
    } catch (error) {
      console.error("Error fetching queue data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!facilityId) {
    return null; // Or return a message that facility ID is required
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-pink-700">
          Prehľad zamestnancov
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-pink-50 rounded-lg p-4">
            <p className="text-sm text-pink-600 font-medium">
              Aktívni zamestnanci dnes
            </p>
            <p className="text-2xl font-bold text-pink-700">
              {dailyStats.totalEmployees}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">
              Celkové tržby dnes
            </p>
            <p className="text-2xl font-bold text-green-700">
              {dailyStats.dailyRevenue.toFixed(2)} €
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">
              Dokončené rezervácie
            </p>
            <p className="text-2xl font-bold text-blue-700">
              {dailyStats.completedAppointments}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Aktuálne poradie</h3>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pozícia</TableHead>
                  <TableHead>Zamestnanec</TableHead>
                  <TableHead>Stôl</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Aktuálna rezervácia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {item.employees.users.first_name}{" "}
                      {item.employees.users.last_name}
                    </TableCell>
                    <TableCell>{item.employees.table_number}</TableCell>
                    <TableCell>
                      {item.currentAppointment ? (
                        <Badge variant="success">So zákazníkom</Badge>
                      ) : (
                        <Badge variant="secondary">Voľný</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.currentAppointment ? (
                        <div>
                          <p>{item.currentAppointment.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            {format(
                              new Date(item.currentAppointment.start_time),
                              "HH:mm",
                              { locale: sk }
                            )}{" "}
                            -{" "}
                            {format(
                              new Date(item.currentAppointment.end_time),
                              "HH:mm",
                              { locale: sk }
                            )}
                          </p>
                        </div>
                      ) : (
                        "Bez rezervácie"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeQueueDisplay;
