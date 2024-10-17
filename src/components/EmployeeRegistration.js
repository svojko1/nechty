import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "react-hot-toast";

const EmployeeRegistration = ({ onRegistrationComplete }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [facilityId, setFacilityId] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      // Create user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Insert additional user information into public.users table
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        role: "employee",
      });

      if (userError) throw userError;

      // Create employee record with pending status
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .insert({
          user_id: authData.user.id,

          facility_id: facilityId,
          status: "pending",
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      toast.success("Registration submitted. Waiting for admin approval.");
      onRegistrationComplete(); // Call the callback function to update parent component
      // Reset form
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setPhone("");

      setFacilityId("");
    } catch (error) {
      console.error("Error creating employee account:", error);
      toast.error("Failed to submit registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
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
          <Label htmlFor="password">Heslo</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="firstName">Meno</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Priezvisko</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Telefón</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="facility">Preferovaná prevádzka</Label>
          <Select value={facilityId} onValueChange={setFacilityId} required>
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Odosielam..." : "Odoslať registráciu"}
        </Button>
      </form>
    </div>
  );
};

export default EmployeeRegistration;
