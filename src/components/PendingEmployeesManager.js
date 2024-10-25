import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { toast } from "react-hot-toast";
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
  const [tableNumber, setTableNumber] = useState("");

  useEffect(() => {
    fetchPendingEmployees();
  }, []);

  const fetchPendingEmployees = async () => {
    try {
      // Fetch all employees with status not equal to 'approved'
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          users (id, first_name, last_name, email)
        `
        )
        .neq("status", "approved");

      if (error) throw error;
      setPendingEmployees(data);
    } catch (error) {
      console.error("Chyba pri načítaní čakajúcich zamestnancov:", error);
      toast.error("Nepodarilo sa načítať čakajúcich zamestnancov");
    }
  };

  const handleConfirmEmployee = async () => {
    try {
      // First, check if the employee record already exists
      const { data: existingEmployee, error: checkError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", selectedEmployee.users.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") throw checkError;

      let employeeId;

      if (existingEmployee) {
        // If employee record exists, update it
        const { data, error } = await supabase
          .from("employees")
          .update({
            facility_id: selectedFacility,
            table_number: tableNumber,
            status: "approved",
          })
          .eq("id", existingEmployee.id)
          .select()
          .single();

        if (error) throw error;
        employeeId = data.id;
      } else {
        // If employee record doesn't exist, create it
        const { data, error } = await supabase
          .from("employees")
          .insert({
            user_id: selectedEmployee.users.id,
            facility_id: selectedFacility,

            table_number: tableNumber,
            status: "approved",
          })
          .select()
          .single();

        if (error) throw error;
        employeeId = data.id;
      }

      // Update the user's role to 'employee'
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ role: "employee" })
        .eq("id", selectedEmployee.users.id);

      if (userUpdateError) throw userUpdateError;

      setPendingEmployees(
        pendingEmployees.filter((e) => e.users.id !== selectedEmployee.users.id)
      );
      onEmployeeConfirmed({
        ...selectedEmployee,
        id: employeeId,
        facility_id: selectedFacility,

        table_number: tableNumber,
        status: "approved",
      });
      setIsConfirmDialogOpen(false);
      setSelectedEmployee(null);
      toast.success("Employee confirmed and approved successfully");
    } catch (error) {
      console.error("Error confirming employee:", error);
      toast.error("Failed to confirm employee");
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4">Čakajúci zamestnanci</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Meno</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Akcia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingEmployees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>{`${employee.users.first_name} ${employee.users.last_name}`}</TableCell>
              <TableCell>{employee.users.email}</TableCell>
              <TableCell>
                <Button
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setIsConfirmDialogOpen(true);
                  }}
                >
                  Potvrdiť
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Potvrdiť zamestnanca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="facility">Prevádzka</Label>
              <Select
                value={selectedFacility}
                onValueChange={setSelectedFacility}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte prevádzku" />
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
            <div></div>
            <div>
              <Label htmlFor="tableNumber">Číslo stola</Label>
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
              Zrušiť
            </Button>
            <Button onClick={handleConfirmEmployee}>
              Potvrdiť zamestnanca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingEmployeesManager;
