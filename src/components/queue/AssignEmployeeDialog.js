import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Clock, CheckCircle, AlertCircle } from "lucide-react";

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
import { cn } from "src/lib/utils";
import { toast } from "react-hot-toast";
import { supabase } from "../../supabaseClient";

const AssignEmployeeDialog = ({
  open,
  onClose,
  customer,
  facilityId,
  onAssignmentComplete,
}) => {
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [serviceDetails, setServiceDetails] = useState(null);

  React.useEffect(() => {
    if (open && facilityId) {
      fetchAvailableEmployees();
      if (customer?.service_id) {
        fetchServiceDetails(customer.service_id);
      }
    }
  }, [open, facilityId, customer?.service_id]);

  const fetchServiceDetails = async (serviceId) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .single();

      if (error) throw error;
      setServiceDetails(data);
    } catch (error) {
      console.error("Error fetching service details:", error);
      toast.error("Failed to fetch service details");
    }
  };

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
    if (!selectedEmployee || !customer) return;

    setIsLoading(true);
    try {
      // Fetch service details if not already available
      if (!serviceDetails) {
        const { data: service, error: serviceError } = await supabase
          .from("services")
          .select("*")
          .eq("id", customer.service_id)
          .single();

        if (serviceError) throw serviceError;
        setServiceDetails(service);
      }

      const now = new Date();
      const duration = serviceDetails?.duration || 30; // fallback to 30 minutes if no duration
      const endTime = new Date(now.getTime() + duration * 60000);

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
          arrival_time: customer.created_at,
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Priradiť zákazníka</DialogTitle>
          <DialogDescription>
            Vyberte dostupného zamestnanca pre zákazníka
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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
                      Stôl č.{employee.employees.table_number}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-yellow-500 mb-2" />
              <p className="text-gray-600">
                Momentálne nie sú dostupní žiadni zamestnanci{" "}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Zrušiť
          </Button>
          <Button
            onClick={handleAssignment}
            disabled={!selectedEmployee || isLoading}
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
            Priradiť zákazníka
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignEmployeeDialog;
