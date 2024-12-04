import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { User, Clock, CheckCircle, AlertCircle, Timer } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { RadioGroup, RadioGroupItem } from "src/components/ui/radio-group";
import { Label } from "src/components/ui/label";
import { Input } from "src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { supabase } from "src/supabaseClient";
import { cn } from "src/lib/utils";

const DURATION_PRESETS = [
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

const AssignEmployeeDialog = ({
  open,
  onClose,
  customer,
  facilityId,
  onAssignmentComplete,
}) => {
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [duration, setDuration] = useState("30"); // default 30 minutes
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && facilityId) {
      fetchAvailableEmployees();
    }
  }, [open, facilityId]);

  useEffect(() => {
    // If we have a service duration from the customer, set it as initial value
    if (customer?.service?.duration) {
      setDuration(customer.service.duration.toString());
    }
  }, [customer]);

  const fetchAvailableEmployees = async () => {
    try {
      const { data: employees, error } = await supabase
        .from("employee_queue")
        .select(
          `
          *,
          employees!inner(
            id,
            table_number,
            users!inner(first_name, last_name)
          )
        `
        )
        .eq("facility_id", facilityId)
        .eq("is_active", true)
        .is("current_customer_id", null)
        .order("position_in_queue", { ascending: true });

      if (error) throw error;
      setAvailableEmployees(employees || []);
    } catch (error) {
      console.error("Error fetching available employees:", error);
      toast.error("Failed to fetch available employees");
    }
  };

  const handleAssignment = async () => {
    if (!selectedEmployee || !customer || !duration) return;

    setIsLoading(true);
    try {
      const now = new Date();
      const durationInMinutes = parseInt(duration);
      const endTime = new Date(now.getTime() + durationInMinutes * 60000);

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_name: customer.customer_name,
          email: customer.contact_info.includes("@")
            ? customer.contact_info
            : null,
          phone: !customer.contact_info.includes("@")
            ? customer.contact_info
            : null,
          service_id: customer.service_id,
          employee_id: selectedEmployee.employees.id,
          facility_id: facilityId,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          status: "in_progress",
          arrival_time: now.toISOString(),
          duration: durationInMinutes, // Store the actual duration used
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Update employee queue
      const { error: queueError } = await supabase
        .from("employee_queue")
        .update({
          current_customer_id: appointment.id,
          last_assignment_time: now.toISOString(),
        })
        .eq("id", selectedEmployee.id);

      if (queueError) throw queueError;

      // Remove customer from queue
      const { error: removeError } = await supabase
        .from("customer_queue")
        .delete()
        .eq("id", customer.id);

      if (removeError) throw removeError;

      toast.success("Customer assigned successfully!");
      onAssignmentComplete(appointment);
      onClose();
    } catch (error) {
      console.error("Error assigning customer:", error);
      toast.error("Failed to assign customer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDurationChange = (value) => {
    if (value === "custom") {
      setIsCustomDuration(true);
      setDuration("");
    } else {
      setIsCustomDuration(false);
      setDuration(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Customer to Employee</DialogTitle>
          <DialogDescription>
            Select an available employee and set service duration
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>Service Duration</Label>
            <div className="flex gap-2 items-center">
              <Select
                value={isCustomDuration ? "custom" : duration}
                onValueChange={handleDurationChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom duration</SelectItem>
                </SelectContent>
              </Select>

              {isCustomDuration && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-24"
                    min="1"
                    max="120"
                  />
                  <span className="text-sm text-gray-500">min</span>
                </div>
              )}
            </div>
          </div>

          {/* Employee Selection */}
          {availableEmployees.length > 0 ? (
            <RadioGroup
              value={selectedEmployee?.id}
              onValueChange={(value) =>
                setSelectedEmployee(
                  availableEmployees.find((emp) => emp.id === value)
                )
              }
            >
              {availableEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={cn(
                    "flex items-center space-x-2 rounded-lg border p-4 mb-2",
                    selectedEmployee?.id === employee.id &&
                      "border-pink-500 bg-pink-50"
                  )}
                >
                  <RadioGroupItem value={employee.id} id={employee.id} />
                  <Label
                    htmlFor={employee.id}
                    className="flex flex-1 items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-pink-500" />
                      <span>
                        {employee.employees.users.first_name}{" "}
                        {employee.employees.users.last_name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      Table #{employee.employees.table_number}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-yellow-500 mb-2" />
              <p className="text-gray-600">
                No employees available at the moment
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignment}
            disabled={!selectedEmployee || !duration || isLoading}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Clock className="h-4 w-4" />
              </motion.div>
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Assign Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignEmployeeDialog;
