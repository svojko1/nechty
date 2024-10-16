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

const EmployeeQueueDisplay = () => {
  const [queueData, setQueueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQueueData();
  }, []);

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
            speciality,
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
          Employee Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-gray-500">Loading queue data...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Speciality</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Appointment</TableHead>
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
                  <TableCell>{item.employees.speciality}</TableCell>
                  <TableCell>{item.employees.table_number}</TableCell>
                  <TableCell>
                    {item.currentAppointment ? (
                      <Badge variant="success">With Client</Badge>
                    ) : (
                      <Badge variant="secondary">Available</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.currentAppointment ? (
                      <div>
                        <p>{item.currentAppointment.customer_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(
                            item.currentAppointment.start_time
                          ).toLocaleTimeString()}{" "}
                          -
                          {new Date(
                            item.currentAppointment.end_time
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    ) : (
                      "No current appointment"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeQueueDisplay;
