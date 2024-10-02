import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "react-hot-toast";

const EmployeeRegistration = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    const { data, error } = await supabase
      .from("facilities")
      .select("id, name");
    if (error) {
      console.error("Error fetching facilities:", error);
      toast.error("Failed to load facilities");
    } else {
      setFacilities(data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
          },
        },
      });

      if (authError) throw authError;

      // 2. Create employee record
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .insert({
          user_id: authData.user.id,
          speciality,
          facility_id: facilityId,
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      toast.success("Employee account created successfully");
      // Reset form
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setSpeciality("");
      setFacilityId("");
    } catch (error) {
      console.error("Error creating employee account:", error);
      toast.error("Failed to create employee account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Register New Employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="speciality">Speciality</Label>
            <Input
              id="speciality"
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="facility">Facility</Label>
            <Select value={facilityId} onValueChange={setFacilityId} required>
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Employee Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeRegistration;
