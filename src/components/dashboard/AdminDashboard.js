import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "src/supabaseClient";
import { toast } from "react-hot-toast";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/components/ui/table";
import { Checkbox } from "src/components/ui/checkbox";
import { ScrollArea } from "src/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "src/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "src/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

// Functional Components
import PendingEmployeesManager from "src/components/facility/PendingEmployeesManager";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalAppointments: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isAddFacilityDialogOpen, setIsAddFacilityDialogOpen] = useState(false);
  const [isEditFacilityDialogOpen, setIsEditFacilityDialogOpen] =
    useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingFacility, setEditingFacility] = useState({
    id: null,
    name: "",
    address: "",
    employees: [],
  });
  const [newFacility, setNewFacility] = useState({
    name: "",
    address: "",
  });
  const [facilityEmployees, setFacilityEmployees] = useState([]);
  const handleEmployeeConfirmed = (newEmployee) => {
    setEmployees([...employees, newEmployee]);
    // You might want to refresh the users list here as well
    fetchUsers();
  };
  const navigate = useNavigate(); // Add this at the top of component

  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] =
    useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "customer",
    facility_id: "",
    table_number: "",
  });
  const [isReceptionRegistrationOpen, setIsReceptionRegistrationOpen] =
    useState(false);
  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchFacilities();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error("Chyba pri načítaní používateľov:", error);
      toast.error("Nepodarilo sa načítať používateľov");
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilityEmployees = async (facilityId) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, users (id, first_name, last_name)")
        .eq("facility_id", facilityId);

      if (error) throw error;
      setFacilityEmployees(
        data.map((emp) => ({
          value: emp.id,
          label: `${emp.users.first_name} ${emp.users.last_name}`,
        }))
      );
    } catch (error) {
      console.error("Error fetching facility employees:", error);
      toast.error("Failed to fetch facility employees");
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          users (id, first_name, last_name, email),
          facilities (id, name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees(data);
    } catch (error) {
      console.error("Chyba pri načítaní zamestnancov:", error);
      toast.error("Nepodarilo sa načítať zamestnancov");
    }
  };

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFacilities(data);
    } catch (error) {
      console.error("Chyba pri načítaní prevádzok:", error);
      toast.error("Nepodarilo sa načítať prevádzky");
    }
  };

  const checkTableNumberAvailability = async (
    tableNumber,
    facilityId,
    excludeEmployeeId = null
  ) => {
    try {
      let query = supabase
        .from("employees")
        .select("id")
        .eq("facility_id", facilityId)
        .eq("table_number", tableNumber);

      // If we're updating an existing employee, exclude them from the check
      if (excludeEmployeeId) {
        query = query.neq("id", excludeEmployeeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // If we find any employees with this table number, it's not available
      return data.length === 0;
    } catch (error) {
      console.error("Error checking table number availability:", error);
      throw error;
    }
  };

  const fetchStats = async () => {
    try {
      const { data: usersCount } = await supabase
        .from("users")
        .select("count", { count: "exact" });

      const { data: revenueData } = await supabase
        .from("appointments")
        .select("price");

      const { data: appointmentsCount } = await supabase
        .from("appointments")
        .select("count", { count: "exact" });

      const { data: ratingsData } = await supabase
        .from("reviews")
        .select("rating");

      const totalRevenue = revenueData.reduce(
        (sum, appointment) => sum + (appointment.price || 0),
        0
      );
      const averageRating =
        ratingsData.length > 0
          ? ratingsData.reduce((sum, review) => sum + review.rating, 0) /
            ratingsData.length
          : 0;

      setStats({
        totalUsers: usersCount[0].count,
        totalRevenue,
        totalAppointments: appointmentsCount[0].count,
        averageRating: averageRating.toFixed(1),
      });
    } catch (error) {
      console.error("Chyba pri načítaní štatistík:", error);
      toast.error("Nepodarilo sa načítať štatistiky");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For employee role, ensure we have a facility selected
      if (newUser.role === "employee" && !newUser.facility_id) {
        toast.error("Please select a facility for the employee");
        setLoading(false);
        return;
      }

      // If role is employee, use the employee registration endpoint
      if (newUser.role === "employee" && newUser.table_number) {
        if (
          !newUser.email ||
          !newUser.password ||
          !newUser.first_name ||
          !newUser.last_name
        ) {
          toast.error("Please fill in all required fields");
          setLoading(false);
          return;
        }

        const isTableAvailable = await checkTableNumberAvailability(
          newUser.table_number,
          newUser.facility_id
        );

        if (!isTableAvailable) {
          toast.error(
            `Stôl číslo ${newUser.table_number} je už obsadený iným zamestnancom`
          );
          setLoading(false);
          return;
        }

        const response = await fetch("/api/employee/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            phone: newUser.phone || null,
            facilityId: newUser.facility_id,
            tableNumber: newUser.table_number,
            isAdminCreated: true, // This flag indicates it's created by admin
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to register employee");
        }

        toast.success("Employee registration submitted for approval");
      } else {
        // For non-employee roles, use admin API
        // First create the user in Auth
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: newUser.email,
            password: newUser.password,
            email_confirm: true, // Auto confirm the email
            user_metadata: {
              first_name: newUser.first_name,
              last_name: newUser.last_name,
            },
          });

        if (authError) throw authError;

        // Then create the user record in the users table
        const userData = {
          id: authData.user.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role,
        };

        // Add facility_id only for reception role
        if (newUser.role === "reception" && newUser.facility_id) {
          userData.facility_id = newUser.facility_id;
        }

        const { error: userError } = await supabase
          .from("users")
          .insert([userData]);

        if (userError) throw userError;

        toast.success("User added successfully");
      }

      // Reset form
      setNewUser({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        role: "customer",
        facility_id: "",
        phone: "",
        table_number: "",
      });

      setIsAddUserDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          role: editingUser.role,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      toast.success("Používateľ bol úspešne aktualizovaný");
      setIsEditUserDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Chyba pri aktualizácii používateľa:", error);
      toast.error("Nepodarilo sa aktualizovať používateľa");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Ste si istý, že chcete vymazať tohto používateľa?")) {
      try {
        const { error } = await supabase
          .from("users")
          .delete()
          .eq("id", userId);

        if (error) throw error;

        toast.success("Používateľ bol úspešne vymazaný");
        fetchUsers();
      } catch (error) {
        console.error("Chyba pri mazaní používateľa:", error);
        toast.error("Nepodarilo sa vymazať používateľa");
      }
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee({
      ...employee,
      first_name: employee.users.first_name,
      last_name: employee.users.last_name,
    });
    setIsEditEmployeeDialogOpen(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if table number is available
      const isTableAvailable = await checkTableNumberAvailability(
        editingEmployee.table_number,
        editingEmployee.facility_id,
        editingEmployee.id
      );

      if (!isTableAvailable) {
        toast.error(
          `Stôl číslo ${editingEmployee.table_number} je už obsadený iným zamestnancom`
        );
        setLoading(false);
        return;
      }
      const { error: userError } = await supabase
        .from("users")
        .update({
          first_name: editingEmployee.first_name,
          last_name: editingEmployee.last_name,
        })
        .eq("id", editingEmployee.users.id);

      if (userError) throw userError;

      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          table_number: editingEmployee.table_number,
          facility_id: editingEmployee.facility_id,
        })
        .eq("id", editingEmployee.id);

      if (employeeError) throw employeeError;

      toast.success("Zamestnanec bol úspešne aktualizovaný");
      setIsEditEmployeeDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error("Chyba pri aktualizácii zamestnanca:", error);
      toast.error("Nepodarilo sa aktualizovať zamestnanca");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("facilities")
        .insert([newFacility])
        .select();

      if (error) throw error;

      toast.success("Prevádzka bola úspešne pridaná");
      setIsAddFacilityDialogOpen(false);
      fetchFacilities();
      setNewFacility({ name: "", address: "", google_place_id: "" }); // Update this line
    } catch (error) {
      console.error("Chyba pri pridávaní prevádzky:", error);
      toast.error("Nepodarilo sa pridať prevádzku");
    } finally {
      setLoading(false);
    }
  };

  const handleEditFacility = async (facility) => {
    setEditingFacility({
      ...facility,
      employees: [],
    });
    setIsEditFacilityDialogOpen(true);
    await fetchAllEmployees(facility.id);
  };

  const fetchAllEmployees = async (facilityId) => {
    try {
      const { data: allEmployees, error: allEmployeesError } = await supabase
        .from("employees")
        .select("id, users (id, first_name, last_name), facility_id")
        .order("users(first_name)", { ascending: true });

      if (allEmployeesError) throw allEmployeesError;

      const formattedEmployees = allEmployees.map((emp) => ({
        value: emp.id,
        label: `${emp.users.first_name} ${emp.users.last_name}`,
        isSelected: emp.facility_id === facilityId,
      }));

      setFacilityEmployees(formattedEmployees);
      setEditingFacility((prev) => ({
        ...prev,
        employees: formattedEmployees.filter((emp) => emp.isSelected),
      }));
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
      setFacilityEmployees([]);
      setEditingFacility((prev) => ({ ...prev, employees: [] }));
    }
  };

  const handleUpdateFacility = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: facilityError } = await supabase
        .from("facilities")
        .update({
          name: editingFacility.name,
          address: editingFacility.address,
        })
        .eq("id", editingFacility.id);

      if (facilityError) throw facilityError;

      // Update employee associations
      const selectedEmployeeIds = editingFacility.employees.map(
        (emp) => emp.value
      );

      // Set facility_id for selected employees
      if (selectedEmployeeIds.length > 0) {
        await supabase
          .from("employees")
          .update({ facility_id: editingFacility.id })
          .in("id", selectedEmployeeIds);
      }

      // Remove facility_id for unselected employees
      await supabase
        .from("employees")
        .update({ facility_id: null })
        .eq("facility_id", editingFacility.id)
        .not("id", "in", `(${selectedEmployeeIds.join(",")})`);

      toast.success("Facility and employees updated successfully");
      setIsEditFacilityDialogOpen(false);
      fetchFacilities();
      fetchEmployees();
    } catch (error) {
      console.error("Error updating facility:", error);
      toast.error("Failed to update facility");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFacility = async (facilityId) => {
    if (window.confirm("Ste si istý, že chcete vymazať túto prevádzku?")) {
      try {
        const { error } = await supabase
          .from("facilities")
          .delete()
          .eq("id", facilityId);

        if (error) throw error;

        toast.success("Prevádzka bola úspešne vymazaná");
        fetchFacilities();
      } catch (error) {
        console.error("Chyba pri mazaní prevádzky:", error);
        toast.error("Nepodarilo sa vymazať prevádzku");
      }
    }
  };

  const StatCard = ({ icon: Icon, title, value }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full  mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
      <CardContent className="p-6 space-y-8">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Administrátorský panel</h1>

          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">Používatelia</TabsTrigger>
              <TabsTrigger value="employees">Zamestnanci</TabsTrigger>
              <TabsTrigger value="facilities">Prevádzky</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <PendingEmployeesManager
                facilities={facilities}
                onEmployeeConfirmed={(newEmployee) => {
                  setEmployees([...employees, newEmployee]);
                  fetchEmployees();
                }}
              />

              <div className="flex justify-center items-center">
                <h2 className="text-2xl font-bold"></h2>
                <Dialog
                  open={isAddUserDialogOpen}
                  onOpenChange={setIsAddUserDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>Pridať používateľa</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pridať nového používateľa</DialogTitle>
                      <DialogDescription>
                        Vyplňte údaje pre vytvorenie nového používateľa.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">
                            Email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            className="col-span-3"
                            value={newUser.email}
                            onChange={(e) =>
                              setNewUser({ ...newUser, email: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="password" className="text-right">
                            Heslo
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            className="col-span-3"
                            value={newUser.password}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                password: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="first_name" className="text-right">
                            Meno
                          </Label>
                          <Input
                            id="first_name"
                            className="col-span-3"
                            value={newUser.first_name}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                first_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="last_name" className="text-right">
                            Priezvisko
                          </Label>
                          <Input
                            id="last_name"
                            className="col-span-3"
                            value={newUser.last_name}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                last_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role" className="text-right">
                            Rola
                          </Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) =>
                              setNewUser({ ...newUser, role: value })
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Vyberte rolu" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="reception">
                                Recepcia
                              </SelectItem>
                              <SelectItem value="employee">
                                Zamestnanec
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Show facility selection only for reception role */}
                        {
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="facility" className="text-right">
                              Zariadenie
                            </Label>
                            <Select
                              value={newUser.facility_id}
                              onValueChange={(value) =>
                                setNewUser({ ...newUser, facility_id: value })
                              }
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Vyberte zariadenie" />
                              </SelectTrigger>
                              <SelectContent>
                                {facilities.map((facility) => (
                                  <SelectItem
                                    key={facility.id}
                                    value={facility.id}
                                  >
                                    {facility.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        }
                      </div>

                      {newUser.role === "employee" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="table_number" className="text-right">
                            Číslo stola
                          </Label>
                          <Input
                            id="table_number"
                            type="number"
                            className="col-span-3"
                            value={newUser.table_number}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                table_number: e.target.value,
                              })
                            }
                            required
                            min="1"
                          />
                        </div>
                      )}

                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Pridávanie..." : "Pridať používateľa"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            <TabsContent value="employees" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Správa zamestnancov</h2>
              </div>
              <Dialog
                open={isEditEmployeeDialogOpen}
                onOpenChange={setIsEditEmployeeDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upraviť zamestnanca</DialogTitle>
                    <DialogDescription>
                      Upravte údaje zamestnanca.
                    </DialogDescription>
                  </DialogHeader>
                  {editingEmployee && (
                    <form onSubmit={handleUpdateEmployee}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="edit_employee_first_name"
                            className="text-right"
                          >
                            Meno
                          </Label>
                          <Input
                            id="edit_employee_first_name"
                            className="col-span-3"
                            value={editingEmployee.first_name}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                first_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="edit_employee_last_name"
                            className="text-right"
                          >
                            Priezvisko
                          </Label>
                          <Input
                            id="edit_employee_last_name"
                            className="col-span-3"
                            value={editingEmployee.last_name}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                last_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="edit_employee_table_number"
                            className="text-right"
                          >
                            Číslo stola
                          </Label>
                          <Input
                            id="edit_employee_table_number"
                            className="col-span-3"
                            type="number"
                            value={editingEmployee.table_number}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                table_number: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="edit_employee_facility"
                            className="text-right"
                          >
                            Prevádzka
                          </Label>
                          <Select
                            value={editingEmployee.facility_id}
                            onValueChange={(value) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                facility_id: value,
                              })
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Vyberte prevádzku" />
                            </SelectTrigger>
                            <SelectContent>
                              {facilities.map((facility) => (
                                <SelectItem
                                  key={facility.id}
                                  value={facility.id}
                                >
                                  {facility.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading
                            ? "Aktualizácia..."
                            : "Aktualizovať zamestnanca"}
                        </Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meno</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Číslo stola</TableHead>
                    <TableHead>Prevádzka</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>{`${employee.users.first_name} ${employee.users.last_name}`}</TableCell>
                      <TableCell>{employee.users.email}</TableCell>

                      <TableCell>{employee.table_number}</TableCell>
                      <TableCell>{employee.facilities?.name}</TableCell>
                      <TableCell>{employee.status}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          className="mr-2"
                          onClick={() => handleEditEmployee(employee)}
                        >
                          Upraviť
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="facilities" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Správa prevádzok</h2>
                <Dialog
                  open={isAddFacilityDialogOpen}
                  onOpenChange={setIsAddFacilityDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>Pridať prevádzku</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pridať novú prevádzku</DialogTitle>
                      <DialogDescription>
                        Vyplňte údaje pre vytvorenie novej prevádzky.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddFacility}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="facility_name" className="text-right">
                            Názov
                          </Label>
                          <Input
                            id="facility_name"
                            className="col-span-3"
                            value={newFacility.name}
                            onChange={(e) =>
                              setNewFacility({
                                ...newFacility,
                                name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="facility_address"
                            className="text-right"
                          >
                            Adresa
                          </Label>
                          <Input
                            id="facility_address"
                            className="col-span-3"
                            value={newFacility.address}
                            onChange={(e) =>
                              setNewFacility({
                                ...newFacility,
                                address: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4"></div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? "Pridávanie..." : "Pridať prevádzku"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Názov</TableHead>
                    <TableHead>Adresa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell>{facility.name}</TableCell>
                      <TableCell>{facility.address}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          className="mr-2"
                          onClick={() => handleEditFacility(facility)}
                        >
                          Upraviť
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteFacility(facility.id)}
                        >
                          Vymazať
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>

          <Dialog
            open={isEditUserDialogOpen}
            onOpenChange={setIsEditUserDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upraviť používateľa</DialogTitle>
                <DialogDescription>
                  Upravte údaje používateľa.
                </DialogDescription>
              </DialogHeader>
              {editingUser && (
                <form onSubmit={handleUpdateUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit_first_name" className="text-right">
                        Meno
                      </Label>
                      <Input
                        id="edit_first_name"
                        className="col-span-3"
                        value={editingUser.first_name}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            first_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit_last_name" className="text-right">
                        Priezvisko
                      </Label>
                      <Input
                        id="edit_last_name"
                        className="col-span-3"
                        value={editingUser.last_name}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            last_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit_role" className="text-right">
                        Rola
                      </Label>
                      <Select
                        value={editingUser.role}
                        onValueChange={(value) =>
                          setEditingUser({ ...editingUser, role: value })
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Vyberte rolu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Zákazník</SelectItem>
                          <SelectItem value="employee">Zamestnanec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Aktualizácia..." : "Aktualizovať používateľa"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          <Dialog
            open={isEditFacilityDialogOpen}
            onOpenChange={setIsEditFacilityDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upraviť prevádzku</DialogTitle>
                <DialogDescription>Upravte údaje prevádzky.</DialogDescription>
              </DialogHeader>
              {editingFacility && (
                <form onSubmit={handleUpdateFacility}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit_facility_name"
                        className="text-right"
                      >
                        Názov
                      </Label>
                      <Input
                        id="edit_facility_name"
                        className="col-span-3"
                        value={editingFacility.name}
                        onChange={(e) =>
                          setEditingFacility({
                            ...editingFacility,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit_facility_address"
                        className="text-right"
                      >
                        Adresa
                      </Label>
                      <Input
                        id="edit_facility_address"
                        className="col-span-3"
                        value={editingFacility.address}
                        onChange={(e) =>
                          setEditingFacility({
                            ...editingFacility,
                            address: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor="edit_facility_employees"
                        className="text-right"
                      >
                        Zamestnanci
                      </Label>
                      <div className="col-span-3">
                        <Popover modal={true}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              {editingFacility.employees.length > 0
                                ? `${editingFacility.employees.length} ${
                                    editingFacility.employees.length === 1
                                      ? "zamestnanec vybratý"
                                      : "zamestnanci vybratí"
                                  }`
                                : "Vybrať zamestnancov"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" sideOffset={5}>
                            <Command>
                              <CommandInput placeholder="Vyhľadať zamestnancov..." />
                              <CommandList>
                                <CommandEmpty>
                                  Žiadni zamestnanci neboli nájdení.
                                </CommandEmpty>
                                <CommandGroup>
                                  <ScrollArea className="h-[200px]">
                                    {facilityEmployees.map((employee) => (
                                      <CommandItem
                                        key={employee.value}
                                        onSelect={() => {
                                          setEditingFacility((prev) => {
                                            const isSelected =
                                              prev.employees.some(
                                                (e) =>
                                                  e.value === employee.value
                                              );
                                            const updatedEmployees = isSelected
                                              ? prev.employees.filter(
                                                  (e) =>
                                                    e.value !== employee.value
                                                )
                                              : [...prev.employees, employee];
                                            return {
                                              ...prev,
                                              employees: updatedEmployees,
                                            };
                                          });
                                        }}
                                      >
                                        <div className="flex items-center space-x-2 cursor-pointer">
                                          <Checkbox
                                            checked={editingFacility.employees.some(
                                              (e) => e.value === employee.value
                                            )}
                                            onCheckedChange={() => {}}
                                          />
                                          <span>{employee.label}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </ScrollArea>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Aktualizácia..." : "Aktualizovať prevádzku"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;
