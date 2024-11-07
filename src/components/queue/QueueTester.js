import React, { useState, useEffect } from "react";

import {
  handleEmployeeCheckIn,
  handleEmployeeCheckOut,
  processCustomerArrival,
  finishCustomerAppointment,
} from "src/utils/employeeAvailability";
import { supabase } from "src/supabaseClient";
import { toast } from "react-hot-toast";
import {
  UserPlus,
  RefreshCcw,
  Trash2,
  Power,
  CheckCircle,
  Users,
} from "lucide-react";
import { getNextQueueEmployee } from "src/utils/employeeAvailability";

// UI Components
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/components/ui/tabs";

const NextEmployeeCard = ({ employee }) => {
  if (!employee) return null;

  return (
    <Card className="mb-6 bg-gradient-to-r from-pink-50 to-purple-50">
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-white p-3 rounded-full shadow">
              <Users className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Nasledujúci v rade
              </h3>
              <p className="text-sm text-gray-500">
                {employee.employees.users.first_name}{" "}
                {employee.employees.users.last_name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="mb-2">
              Kolo {employee.queue_round}
            </Badge>
            <p className="text-sm text-gray-500">
              Stôl #{employee.employees.table_number}
            </p>
            <p className="text-xs text-gray-400">
              Pozícia:{" "}
              {employee.position_in_queue || employee.next_round_position}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QueueTester = ({ facilityId }) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [customerQueue, setCustomerQueue] = useState([]);
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [numCustomers, setNumCustomers] = useState(1);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [nextQueueEmployee, setNextQueueEmployee] = useState(null);

  // Initial data load
  useEffect(() => {
    if (facilityId) {
      refreshAllData();
    }
  }, [facilityId]);

  // Data fetching functions
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to fetch services");
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          users!inner (
            first_name,
            last_name
          )
        `
        )
        .eq("facility_id", facilityId)
        .order("users(first_name)");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    }
  };

  const fetchActiveEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_queue")
        .select(
          `
          *,
          employees!inner(
            id,
            users!inner(first_name, last_name)
          )
        `
        )
        .eq("facility_id", facilityId)
        .eq("is_active", true)
        .order("position_in_queue");

      if (error) throw error;
      setActiveEmployees(data || []);
    } catch (error) {
      console.error("Error fetching active employees:", error);
      toast.error("Failed to fetch active employees");
    }
  };

  const fetchCustomerQueue = async () => {
    try {
      const { data, error } = await supabase
        .from("customer_queue")
        .select(
          `
          *,
          services (name)
        `
        )
        .eq("facility_id", facilityId)
        .order("created_at");

      if (error) throw error;
      setCustomerQueue(data || []);
    } catch (error) {
      console.error("Error fetching customer queue:", error);
      toast.error("Failed to fetch customer queue");
    }
  };

  const fetchActiveAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name, duration),
          employees (
            id,
            users (first_name, last_name)
          )
        `
        )
        .eq("facility_id", facilityId)
        .eq("status", "in_progress")
        .order("start_time");

      if (error) throw error;
      setActiveAppointments(data || []);
    } catch (error) {
      console.error("Error fetching active appointments:", error);
      toast.error("Failed to fetch active appointments");
    }
  };

  const handleFinishInitialCheckIn = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get current daily queue
      const { data: dailyQueue } = await supabase
        .from("daily_facility_queue")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("date", today)
        .single();

      if (dailyQueue) {
        // Update daily queue to mark initial round as completed
        const { error: updateError } = await supabase
          .from("daily_facility_queue")
          .update({
            initial_round_completed: true,
          })
          .eq("id", dailyQueue.id);

        if (updateError) throw updateError;
        toast.success("Initial check-in phase completed");
        await refreshAllData();
      } else {
        toast.error("No active daily queue found");
      }
    } catch (error) {
      console.error("Error finishing initial check-in:", error);
      toast.error("Failed to complete initial check-in phase");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchServices(),
        fetchEmployees(),
        fetchActiveEmployees(),
        fetchCustomerQueue(),
        fetchActiveAppointments(),
        fetchNextEmployee(), // Add this line
      ]);
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh some data");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this new function
  const fetchNextEmployee = async () => {
    try {
      const { data, error } = await getNextQueueEmployee(facilityId);
      if (error) throw error;
      setNextQueueEmployee(data);
    } catch (error) {
      console.error("Error fetching next employee:", error);
      toast.error("Failed to fetch next employee");
    }
  };

  // Action handlers
  const handleCheckIn = async (employeeId) => {
    setIsLoading(true);
    try {
      const { error } = await handleEmployeeCheckIn(employeeId, facilityId);
      if (error) throw error;
      toast.success("Employee checked in successfully");
      await refreshAllData();
    } catch (error) {
      toast.error("Failed to check in employee");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (queueEntryId) => {
    setIsLoading(true);
    try {
      const { error } = await handleEmployeeCheckOut(queueEntryId, facilityId);
      if (error) throw error;
      toast.success("Employee checked out successfully");
      await refreshAllData();
    } catch (error) {
      toast.error("Failed to check out employee");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTestCustomers = async () => {
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }

    setIsLoading(true);
    try {
      const customers = Array.from({ length: numCustomers }, () => ({
        customer_name: `Test Customer ${Math.floor(Math.random() * 1000)}`,
        contact_info: `test${Math.floor(Math.random() * 1000)}@example.com`,
        service_id: selectedService,
        facility_id: facilityId,
        status: "waiting",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const results = await Promise.all(
        customers.map((customer) =>
          processCustomerArrival(customer, facilityId)
        )
      );

      const summary = results.reduce((acc, result) => {
        acc[result.type] = (acc[result.type] || 0) + 1;
        return acc;
      }, {});

      toast.success(
        `Processed ${numCustomers} customers:\n` +
          `${summary.APPOINTMENT_CREATED || 0} appointments\n` +
          `${summary.ADDED_TO_QUEUE || 0} queued`
      );

      await refreshAllData();
    } catch (error) {
      toast.error("Failed to add test customers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTestCustomers = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("customer_queue")
        .delete()
        .like("customer_name", "Test Customer%");

      if (error) throw error;
      toast.success("Cleared all test customers");
      await refreshAllData();
    } catch (error) {
      toast.error("Failed to clear test customers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishAppointment = async (appointment, inputPrice) => {
    setIsLoading(true);
    try {
      const { status, completedAppointment, nextAppointment, error } =
        await finishCustomerAppointment(
          { ...appointment, price: parseFloat(inputPrice) },
          facilityId
        );

      if (error) throw error;

      if (status === "NEXT_CUSTOMER_ASSIGNED") {
        toast.success("Appointment completed and new customer assigned!");
      } else {
        toast.success("Appointment completed successfully!");
      }

      setIsFinishDialogOpen(false);
      setSelectedAppointment(null);
      setPrice("");
      await refreshAllData();
    } catch (error) {
      console.error("Error finishing appointment:", error);
      toast.error("Failed to complete appointment");
    } finally {
      setIsLoading(false);
    }
  };

  // Render helper functions
  const renderEmployeeTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Queue Position</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => {
          const queueEntry = activeEmployees.find(
            (ae) => ae.employee_id === employee.id
          );
          const isActive = Boolean(queueEntry);

          return (
            <TableRow key={employee.id}>
              <TableCell>
                {employee.users.first_name} {employee.users.last_name}
              </TableCell>
              <TableCell>
                <Badge
                  variant={isActive ? "success" : "secondary"}
                  className={
                    isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{queueEntry?.position_in_queue || "-"}</TableCell>
              <TableCell>
                <Button
                  onClick={() =>
                    isActive
                      ? handleCheckOut(queueEntry.id)
                      : handleCheckIn(employee.id)
                  }
                  variant={isActive ? "destructive" : "outline"}
                  size="sm"
                  disabled={isLoading}
                >
                  <Power className="w-4 h-4 mr-2" />
                  {isActive ? "Check Out" : "Check In"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderActiveAppointments = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Appointments</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeAppointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>{appointment.customer_name}</TableCell>
                <TableCell>{appointment.services.name}</TableCell>
                <TableCell>
                  {`${appointment.employees.users.first_name} ${appointment.employees.users.last_name}`}
                </TableCell>
                <TableCell>
                  {new Date(appointment.start_time).toLocaleTimeString()}
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setIsFinishDialogOpen(true);
                    }}
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finish
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {activeAppointments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No active appointments
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderCustomerQueue = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Input
          type="number"
          min="1"
          max="50"
          value={numCustomers}
          onChange={(e) => setNumCustomers(e.target.value)}
          className="w-32"
          placeholder="Number of customers"
        />
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAddTestCustomers}
          disabled={isLoading || !selectedService}
          className="bg-green-500 hover:bg-green-600"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Test Customers
        </Button>
        <Button
          onClick={handleClearTestCustomers}
          variant="destructive"
          disabled={isLoading}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Test Customers
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Waiting Since</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customerQueue.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.customer_name}</TableCell>
              <TableCell>{customer.services?.name}</TableCell>
              <TableCell>{customer.contact_info}</TableCell>
              <TableCell>
                {new Date(customer.created_at).toLocaleTimeString()}
              </TableCell>
            </TableRow>
          ))}
          {customerQueue.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500">
                No customers in queue
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Main render
  return (
    <Card className="bg-white shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-pink-700">
            Queue Testing Tools
          </CardTitle>
          <div className="flex space-x-2">
            {" "}
            {/* Changed to div with flex */}
            <Button
              onClick={handleFinishInitialCheckIn}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
            >
              Ukončit Checkin zamestnancov
            </Button>
            <Button
              onClick={refreshAllData}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="employees">
          <TabsList className="mb-4">
            <TabsTrigger value="employees">
              <UserPlus className="w-4 h-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <CheckCircle className="w-4 h-4 mr-2" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="queue">
              <Users className="w-4 h-4 mr-2" />
              Queue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">{renderEmployeeTable()}</TabsContent>

          <TabsContent value="appointments">
            {renderActiveAppointments()}
          </TabsContent>
          <TabsContent value="employees">
            {renderEmployeeTable()}
            <NextEmployeeCard employee={nextQueueEmployee} />
          </TabsContent>
          <TabsContent value="queue">{renderCustomerQueue()}</TabsContent>
        </Tabs>

        {/* Finish Appointment Dialog */}
        <Dialog
          open={isFinishDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsFinishDialogOpen(false);
              setSelectedAppointment(null);
              setPrice("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finish Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedAppointment && (
                <div className="grid gap-4">
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Customer:</strong>{" "}
                      {selectedAppointment.customer_name}
                    </p>
                    <p>
                      <strong>Service:</strong>{" "}
                      {selectedAppointment.services.name}
                    </p>
                    <p>
                      <strong>Employee:</strong>{" "}
                      {`${selectedAppointment.employees.users.first_name} ${selectedAppointment.employees.users.last_name}`}
                    </p>
                    <p>
                      <strong>Start Time:</strong>{" "}
                      {new Date(
                        selectedAppointment.start_time
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Enter price"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFinishDialogOpen(false);
                  setSelectedAppointment(null);
                  setPrice("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  handleFinishAppointment(selectedAppointment, price)
                }
                disabled={!price || isLoading}
                className="bg-green-500 hover:bg-green-600"
              >
                {isLoading ? "Processing..." : "Complete Appointment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default QueueTester;
