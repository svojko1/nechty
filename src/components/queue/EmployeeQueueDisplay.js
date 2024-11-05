import React, { useState, useEffect } from "react";
import { format, isBefore } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Users,
  Clock,
  UserCheck,
  Coffee,
  AlertCircle,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "src/supabaseClient";

import { acceptCustomerCheckIn } from "src/utils/employeeAvailability";
import { Button } from "src/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";

const StatCard = ({
  icon: Icon,
  title,
  value,
  bgColor,
  onClick,
  isClickable,
}) => (
  <Card
    className={`${bgColor} p-4 rounded-lg transition-all duration-200 ${
      isClickable
        ? "hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95 group"
        : ""
    }`}
    onClick={onClick}
  >
    <div className="flex items-center space-x-2">
      <Icon
        className={`h-5 w-5 ${
          isClickable ? "group-hover:scale-110 transition-transform" : ""
        } text-pink-500`}
      />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <div
          className={`text-2xl font-bold flex items-center ${
            isClickable ? "group-hover:text-pink-600" : ""
          }`}
        >
          {value}
          {isClickable && (
            <span className="ml-2 text-xs bg-pink-100 text-pink-500 px-2 py-0.5 rounded-full self-center whitespace-nowrap">
              Kliknite pre detail →
            </span>
          )}
        </div>
      </div>
    </div>
  </Card>
);

const EarningsDialog = ({ isOpen, onClose, appointments }) => {
  // Group appointments by employee
  const employeeGroups = appointments.reduce((acc, app) => {
    const empName = `${app.employees?.users?.first_name} ${app.employees?.users?.last_name}`;
    if (!acc[empName]) {
      acc[empName] = {
        appointments: [],
        total: 0,
      };
    }
    acc[empName].appointments.push(app);
    acc[empName].total += app.price || 0;
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Detail dnešných tržieb</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {Object.entries(employeeGroups).map(([empName, data]) => (
            <Card key={empName} className="overflow-hidden">
              <CardHeader className="bg-pink-50 py-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-pink-700">
                    {empName}
                  </CardTitle>
                  <Badge variant="secondary" className="text-lg">
                    {data.total} €
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Čas</TableHead>
                      <TableHead>Služba</TableHead>
                      <TableHead>Zákazník</TableHead>
                      <TableHead className="text-right">Cena</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.appointments.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          {format(new Date(app.end_time), "HH:mm", {
                            locale: sk,
                          })}
                        </TableCell>
                        <TableCell>{app.services?.name}</TableCell>
                        <TableCell>{app.customer_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {app.price} €
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-pink-100">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Celkom za deň</span>
                <span>
                  {appointments.reduce((sum, app) => sum + (app.price || 0), 0)}{" "}
                  €
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EmployeeQueueDisplay = ({ facilityId }) => {
  const [queueData, setQueueData] = useState([]);
  const [dailyStats, setDailyStats] = useState({
    earnings: 0,
    appointments: [],
  });
  const [isEarningsDialogOpen, setIsEarningsDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onBreakEmployees: 0,
    busyEmployees: 0,
    utilization: 0,
  });

  useEffect(() => {
    if (facilityId) {
      fetchData();
      const subscription = setupRealtimeSubscription();
      const interval = setInterval(fetchData, 30000);
      return () => {
        clearInterval(interval);
        supabase.removeChannel(subscription);
      };
    }
  }, [facilityId]);

  const fetchData = async () => {
    try {
      // Fetch queue data
      const { data: queueData } = await supabase
        .from("employee_queue")
        .select(
          `
          *,
          employees(id, table_number, users(first_name, last_name)),
          current_appointment:current_customer_id(
            id, start_time, end_time,
            services(name, duration)
          )
        `
        )
        .eq("facility_id", facilityId)
        .eq("is_active", true)
        .order("queue_round", { ascending: true })
        .order("position_in_queue", { ascending: true });

      // Fetch daily earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: dailyAppointments } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services(name),
          employees(users(first_name, last_name))
        `
        )
        .eq("facility_id", facilityId)
        .eq("status", "completed")
        .gte("end_time", today.toISOString())
        .order("end_time", { ascending: false });

      // Calculate stats
      const now = new Date();
      const calculatedStats = {
        totalEmployees: queueData?.length || 0,
        activeEmployees: queueData?.filter((emp) => emp.is_active).length || 0,
        onBreakEmployees:
          queueData?.filter(
            (emp) =>
              emp.break_start &&
              (!emp.break_end || new Date(emp.break_end) > now)
          ).length || 0,
        busyEmployees:
          queueData?.filter((emp) => emp.current_customer_id).length || 0,
      };
      calculatedStats.utilization = Math.round(
        ((calculatedStats.busyEmployees + calculatedStats.onBreakEmployees) /
          calculatedStats.activeEmployees) *
          100 || 0
      );

      setQueueData(queueData || []);
      setDailyStats({
        earnings:
          dailyAppointments?.reduce((sum, app) => sum + (app.price || 0), 0) ||
          0,
        appointments: dailyAppointments || [],
      });
      setStats(calculatedStats);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch queue data");
    }
  };

  const setupRealtimeSubscription = () =>
    supabase
      .channel("queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_queue",
          filter: `facility_id=eq.${facilityId}`,
        },
        fetchData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `facility_id=eq.${facilityId}`,
        },
        fetchData
      )
      .subscribe();

  const handleStartAppointment = async (appointmentId) => {
    try {
      const result = await acceptCustomerCheckIn(appointmentId);
      if (result.error) throw result.error;

      toast.success("Appointment started successfully");
      fetchData(); // Refresh the display
    } catch (error) {
      console.error("Error starting appointment:", error);
      toast.error("Failed to start appointment");
    }
  };

  const getEmployeeStatus = (employee) => {
    const now = new Date();

    if (
      employee.break_start &&
      (!employee.break_end || new Date(employee.break_end) > now)
    ) {
      return {
        badge: <Badge className="bg-yellow-500">Na prestávke</Badge>,
        endTime: employee.break_end,
      };
    }

    if (employee.current_appointment) {
      const appointmentEnd = new Date(employee.current_appointment.end_time);
      const isOvertime = isBefore(appointmentEnd, now);

      // Check if there's a pending approval
      const isPendingApproval =
        employee.current_appointment.status === "pending_approval";

      if (isPendingApproval) {
        return {
          badge: <Badge className="bg-yellow-500">Čaká na potvrdenie</Badge>,
          isPendingApproval: true,
        };
      }

      return {
        badge: (
          <Badge className={isOvertime ? "bg-red-500" : "bg-blue-500"}>
            {isOvertime ? "Prekročený čas" : "Obsadený"}
          </Badge>
        ),
      };
    }

    return {
      badge: (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          Voľný
        </Badge>
      ),
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-pink-700 flex items-center">
          <Users className="mr-2" />
          Prehľad zamestnancov
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={UserCheck}
            title="Aktívni"
            value={`${stats.activeEmployees}/${stats.totalEmployees}`}
            bgColor="bg-pink-50"
          />
          <StatCard
            icon={Coffee}
            title="Na prestávke"
            value={stats.onBreakEmployees}
            bgColor="bg-yellow-50"
          />
          <StatCard
            icon={Clock}
            title="Obsadení"
            value={stats.busyEmployees}
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={AlertCircle}
            title="Využitie"
            value={`${stats.utilization}%`}
            bgColor="bg-green-50"
          />
          <StatCard
            icon={DollarSign}
            title="Tržby dnes"
            value={
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {dailyStats.earnings}
                </span>
                <span className="text-lg font-semibold text-gray-600">€</span>
              </div>
            }
            bgColor="bg-pink-50 hover:bg-pink-100"
            onClick={() => setIsEarningsDialogOpen(true)}
            isClickable={true}
          >
            <span className="absolute bottom-2 right-2 text-xs text-pink-600 flex items-center gap-1">
              Kliknite pre detail
              <ChevronRight className="h-4 w-4" />
            </span>
          </StatCard>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pozícia</TableHead>
              <TableHead>Kolo</TableHead>
              <TableHead>Zamestnanec</TableHead>
              <TableHead>Stôl</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Stav</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueData.map((item) => {
              const status = getEmployeeStatus(item);
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.position_in_queue}</TableCell>
                  <TableCell>Kolo {item.queue_round}</TableCell>
                  <TableCell>
                    {item.employees?.users?.first_name}{" "}
                    {item.employees?.users?.last_name}
                  </TableCell>
                  <TableCell>{item.employees?.table_number}</TableCell>
                  <TableCell>
                    {format(new Date(item.check_in_time), "HH:mm", {
                      locale: sk,
                    })}
                  </TableCell>
                  <TableCell className="space-x-2">
                    {status.isPendingApproval ? (
                      <Button
                        onClick={() =>
                          handleStartAppointment(item.current_customer_id)
                        }
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Potvrdiť a začať
                      </Button>
                    ) : null}
                    {status.badge}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <EarningsDialog
          isOpen={isEarningsDialogOpen}
          onClose={() => setIsEarningsDialogOpen(false)}
          appointments={dailyStats.appointments}
        />
      </CardContent>
    </Card>
  );
};

export default EmployeeQueueDisplay;
