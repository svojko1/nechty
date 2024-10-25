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

const EmployeeQueueDisplay = () => {
  const [queueData, setQueueData] = useState([]);
  const [employeeStats, setEmployeeStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState({
    totalEmployees: 0,
    dailyRevenue: 0,
    completedAppointments: 0,
  });

  useEffect(() => {
    fetchQueueData();
    fetchDailyStats();
  }, []);

  const fetchDailyStats = async () => {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Get all employees who worked today
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

      // Calculate percentages and prepare final stats
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
    setIsLoading(true);
    try {
      // Fetch employee queue data
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

        {/* Employee Performance Table */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            Výkon zamestnancov dnes
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zamestnanec</TableHead>
                <TableHead>Stôl</TableHead>
                <TableHead>Počet zákazníkov</TableHead>
                <TableHead>Dokončené</TableHead>
                <TableHead>Tržby</TableHead>
                <TableHead>Podiel na tržbách</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeStats.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.tableNumber}</TableCell>
                  <TableCell>{employee.totalAppointments}</TableCell>
                  <TableCell>{employee.completedAppointments}</TableCell>
                  <TableCell className="font-semibold">
                    {employee.revenue.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={employee.revenuePercentage}
                        className="w-20"
                      />
                      <span className="text-sm">
                        {employee.revenuePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Existing Queue Table */}
        {/* Existing Queue Table */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Aktuálne poradie</h3>
          {isLoading ? (
            <p className="text-center text-gray-500">Načítavam údaje...</p>
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
