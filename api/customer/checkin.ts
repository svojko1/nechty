// /api/customer/checkin.js
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { appointmentId, employeeQueueId } = req.body;
    const now = new Date();

    // Start transaction
    const client = await supabase.rpc("begin_transaction");

    try {
      // First check if employee is available
      const { data: employeeQueue, error: employeeError } = await supabase
        .from("employee_queue")
        .select("*, employees(*)")
        .eq("id", employeeQueueId)
        .single();

      if (employeeError) throw employeeError;

      // Validate employee isn't already with a customer
      if (employeeQueue.current_customer_id) {
        throw new Error("Employee is already assigned to a customer");
      }

      // Get the appointment to validate and associate
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Validate appointment exists and isn't already in progress
      if (!appointment) {
        throw new Error("Appointment not found");
      }

      if (appointment.status === "in_progress") {
        throw new Error("Appointment is already in progress");
      }

      // Validate appointment belongs to this employee
      if (appointment.employee_id !== employeeQueue.employee_id) {
        throw new Error("Appointment is assigned to different employee");
      }

      // Update employee queue with new customer
      const { error: updateQueueError } = await supabase
        .from("employee_queue")
        .update({
          current_customer_id: appointmentId,
          last_assignment_time: now.toISOString(),
        })
        .eq("id", employeeQueueId)
        .select()
        .single();

      if (updateQueueError) throw updateQueueError;

      // Update appointment status to in_progress
      const { data: updatedAppointment, error: updateAppointmentError } =
        await supabase
          .from("appointments")
          .update({
            status: "in_progress",
            start_time: now.toISOString(),
          })
          .eq("id", appointmentId)
          .select(
            `
          *,
          services (
            name,
            duration
          ),
          employees (
            id,
            users (
              first_name,
              last_name
            )
          )
        `
          )
          .single();

      if (updateAppointmentError) throw updateAppointmentError;

      // Commit transaction
      await supabase.rpc("commit_transaction");

      return res.status(200).json({
        status: "STARTED",
        data: {
          appointment: updatedAppointment,
          employeeQueue,
          message: "Appointment started successfully",
        },
        error: null,
      });
    } catch (error) {
      // Rollback transaction on error
      await supabase.rpc("rollback_transaction");
      throw error;
    }
  } catch (error) {
    console.error("Error accepting customer check-in:", error);
    return res.status(500).json({
      status: "ERROR",
      data: null,
      error: error.message || "Failed to start appointment",
    });
  }
}
