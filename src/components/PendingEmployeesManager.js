import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const PendingEmployeesManager = ({ facilities, onEmployeeConfirmed }) => {
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [tableNumber, setTableNumber] = useState("");

  useEffect(() => {
    fetchPendingEmployees();
  }, []);

  const fetchPendingEmployees = async () => {
    try {
      // First, get all employee user_ids
      const { data: employeeUserIds, error: employeeError } = await supabase
        .from("employees")
        .select("user_id");

      if (employeeError) throw employeeError;

      // Extract the user_ids into an array
      const existingEmployeeIds = employeeUserIds.map((e) => e.user_id);

      // Then, get all users with role 'employee' who are not in the employees table
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "employee")
        .not("id", "in", `(${existingEmployeeIds.join(",")})`);

      if (error) throw error;
      setPendingEmployees(data);
    } catch (error) {
      console.error("Error fetching pending employees:", error);
      toast.error("Failed to fetch pending employees");
    }
  };

  const handleConfirmEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          user_id: selectedEmployee.id,
          facility_id: selectedFacility,
          speciality,
          table_number: tableNumber,
        })
        .select()
        .single();

      if (error) throw error;

      setPendingEmployees(
        pendingEmployees.filter((e) => e.id !== selectedEmployee.id)
      );
      onEmployeeConfirmed({
        ...data,
        users: {
          first_name: selectedEmployee.first_name,
          last_name: selectedEmployee.last_name,
          email: selectedEmployee.email,
        },
      });
      setIsConfirmDialogOpen(false);
      setSelectedEmployee(null);
      toast.success("Employee confirmed successfully");
    } catch (error) {
      console.error("Error confirming employee:", error);
      toast.error("Failed to confirm employee");
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Pending Employees</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setIsConfirmDialogOpen(true);
                    }}
                  >
                    Confirm
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="facility">Facility</Label>
                <Select
                  value={selectedFacility}
                  onValueChange={setSelectedFacility}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="speciality">Speciality</Label>
                <Input
                  id="speciality"
                  value={speciality}
                  onChange={(e) => setSpeciality(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tableNumber">Table Number</Label>
                <Input
                  id="tableNumber"
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setIsConfirmDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmEmployee}>Confirm Employee</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PendingEmployeesManager;
