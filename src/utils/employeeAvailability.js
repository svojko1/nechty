// src/utils/employeeAvailability.js

import { se } from "date-fns/locale";
import { supabase } from "../supabaseClient";
import { createAppointmentData } from "./appointmentUtils";

/**
 * Handle employee check-in at the start of their shift
 * Assigns employee to appropriate round based on daily facility queue status
 */
export const handleEmployeeCheckIn = async (employeeId, facilityId) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Start a Supabase transaction
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const client = await supabase.rpc("begin_transaction");

    try {
      // Get or create daily facility queue
      let { data: dailyQueue } = await supabase
        .from("daily_facility_queue")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("date", today)
        .single();

      if (!dailyQueue) {
        // Initialize daily queue if it doesn't exist
        const { data: newQueue, error: initError } = await supabase
          .from("daily_facility_queue")
          .insert({
            facility_id: facilityId,
            date: today,
            current_position: 0,
            current_round: 1,
            initial_round_completed: false,
          })
          .select()
          .single();

        if (initError) throw initError;
        dailyQueue = newQueue;
      }

      // Determine queue position and round
      let queueRound = dailyQueue.current_round;
      let nextRoundPosition;

      // Get highest position in current round
      const { data: lastPosition } = await supabase
        .from("employee_queue")
        .select("position_in_queue")
        .eq("facility_id", facilityId)
        .eq("queue_round", queueRound)
        .order("position_in_queue", { ascending: false })
        .limit(1)
        .single();

      const newPosition = lastPosition ? lastPosition.position_in_queue + 1 : 1;

      // If initial round is completed, assign to next round
      if (dailyQueue.initial_round_completed) {
        queueRound = dailyQueue.current_round + 1;

        // Get highest next_round_position
        const { data: lastNextPosition } = await supabase
          .from("employee_queue")
          .select("next_round_position")
          .eq("facility_id", facilityId)
          .eq("queue_round", queueRound)
          .order("next_round_position", { ascending: false })
          .limit(1)
          .single();

        nextRoundPosition = lastNextPosition
          ? lastNextPosition.next_round_position + 1
          : 1;
      } else {
        nextRoundPosition = newPosition;
      }

      // Create queue entry for employee
      const { data: queueEntry, error: queueError } = await supabase
        .from("employee_queue")
        .insert({
          employee_id: employeeId,
          facility_id: facilityId,
          check_in_time: now.toISOString(),
          is_active: true,
          current_customer_id: null,
          queue_round: queueRound,
          position_in_queue: dailyQueue.initial_round_completed
            ? null
            : newPosition,
          next_round_position: nextRoundPosition,
        })
        .select()
        .single();

      if (queueError) throw queueError;

      // Check for waiting customers in queue
      const { data: nextCustomer } = await supabase
        .from("customer_queue")
        .select("*, services(duration)")
        .eq("facility_id", facilityId)
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (nextCustomer) {
        // Calculate service end time
        const endTime = new Date(
          now.getTime() + nextCustomer.services.duration * 60 * 1000
        );

        // Create appointment for waiting customer
        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            customer_name: nextCustomer.customer_name,
            email: nextCustomer.contact_info.includes("@")
              ? nextCustomer.contact_info
              : null,
            phone: !nextCustomer.contact_info.includes("@")
              ? nextCustomer.contact_info
              : null,
            service_id: nextCustomer.service_id,
            employee_id: employeeId,
            facility_id: facilityId,
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            status: "in_progress",
            arrival_time: now.toISOString(),
          })
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        // Update employee queue with new customer
        await supabase
          .from("employee_queue")
          .update({
            current_customer_id: appointment.id,
            last_assignment_time: now.toISOString(),
          })
          .eq("id", queueEntry.id);

        // Remove customer from queue
        await supabase
          .from("customer_queue")
          .delete()
          .eq("id", nextCustomer.id);

        // Update current position in daily queue
        await supabase
          .from("daily_facility_queue")
          .update({
            current_position: newPosition,
          })
          .eq("id", dailyQueue.id);

        await supabase.rpc("commit_transaction");
        return {
          data: {
            ...queueEntry,
            appointment,
          },
          type: "CHECKED_IN_WITH_CUSTOMER",
          error: null,
        };
      }

      await supabase.rpc("commit_transaction");
      return {
        data: queueEntry,
        type: "CHECKED_IN",
        error: null,
      };
    } catch (error) {
      await supabase.rpc("rollback_transaction");
      throw error;
    }
  } catch (error) {
    console.error("Error checking in employee:", error);
    return { data: null, error };
  }
};

/**
 * Handle employee check-out at the end of their shift
 */
export const handleEmployeeCheckOut = async (queueEntryId, facilityId) => {
  try {
    const response = await fetch("/api/employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queueEntryId,
        facilityId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to check out employee");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking out employee:", error);
    return { data: null, error };
  }
};

export const processCustomerArrival = async (customerData, facilityId) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Start transaction
    const client = await supabase.rpc("begin_transaction");

    try {
      // Get daily queue status
      let { data: dailyQueue } = await supabase
        .from("daily_facility_queue")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("date", today)
        .single();

      if (!dailyQueue) {
        // Initialize daily queue if it doesn't exist
        const { data: newQueue, error: initError } = await supabase
          .from("daily_facility_queue")
          .insert({
            facility_id: facilityId,
            date: today,
            current_position: 0, // Start with 0 to indicate no appointments yet
            current_round: 1,
            initial_round_completed: false,
          })
          .select()
          .single();

        if (initError) throw initError;
        dailyQueue = newQueue;
      }

      // Inside processCustomerArrival function, after getting daily queue:

      if (dailyQueue.current_position === 0) {
        // Check for available employees in current round
        const { data: availableInCurrentRound } = await supabase
          .from("employee_queue")
          .select("*")
          .eq("facility_id", facilityId)
          .eq("queue_round", dailyQueue.current_round)
          .eq("is_active", true)
          .is("current_customer_id", null);

        if (!availableInCurrentRound?.length) {
          // No available employees in current round, move to next round
          const nextRound = dailyQueue.current_round + 1;

          // Update daily queue to next round
          const { error: updateError } = await supabase
            .from("daily_facility_queue")
            .update({
              current_round: nextRound,
              current_position: 0,
              initial_round_completed: true,
            })
            .eq("id", dailyQueue.id);

          if (updateError) throw updateError;

          // Update daily queue reference
          dailyQueue = {
            ...dailyQueue,
            current_round: nextRound,
            current_position: 0,
            initial_round_completed: true,
          };

          // Update only round number for all active employees
          const { error: empUpdateError } = await supabase
            .from("employee_queue")
            .update({
              queue_round: nextRound,
            })
            .eq("facility_id", facilityId)
            .eq("is_active", true);

          if (empUpdateError) throw empUpdateError;
        }
      }

      // Continue with existing logic to find available employee...

      // Get all employees in current round with their positions and current status
      const { data: employeesInRound, error: empError } = await supabase
        .from("employee_queue")
        .select(
          `
          *,
          employees!inner(
            id,
            users!inner(
              first_name,
              last_name
            )
          )
        `
        )
        .eq("facility_id", facilityId)
        .eq("is_active", true)
        .eq("queue_round", dailyQueue.current_round)
        .order("position_in_queue", { ascending: true });

      if (empError) throw empError;

      // Find next available employee after the last appointment position
      const availableEmployee = employeesInRound?.find(
        (emp) =>
          emp.current_customer_id === null &&
          emp.position_in_queue > dailyQueue.current_position
      );

      // If no employee found after current position, wrap around to the beginning
      const firstAvailableEmployee = !availableEmployee
        ? employeesInRound?.find((emp) => emp.current_customer_id === null)
        : null;

      const selectedEmployee = availableEmployee || firstAvailableEmployee;

      if (selectedEmployee) {
        // Get service duration
        const { data: service } = await supabase
          .from("services")
          .select("duration")
          .eq("id", customerData.service_id)
          .single();

        const endTime = new Date(now.getTime() + service.duration * 60 * 1000);

        // Create immediate appointment
        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            customer_name: customerData.customer_name,
            email: customerData.contact_info.includes("@")
              ? customerData.contact_info
              : null,
            phone: !customerData.contact_info.includes("@")
              ? customerData.contact_info
              : null,
            service_id: customerData.service_id,
            employee_id: selectedEmployee.employee_id,
            facility_id: facilityId,
            start_time: now.toISOString(),
            end_time: endTime.toISOString(),
            status: "in_progress",
            arrival_time: now.toISOString(),
          })
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        // Update employee queue status
        await supabase
          .from("employee_queue")
          .update({
            current_customer_id: appointment.id,
            last_assignment_time: now.toISOString(),
          })
          .eq("id", selectedEmployee.id);

        // Update current_position to track this appointment's position
        await supabase
          .from("daily_facility_queue")
          .update({
            current_position: selectedEmployee.position_in_queue,
          })
          .eq("id", dailyQueue.id);

        // Check if this was the last available employee in the round
        const remainingAvailable = employeesInRound.filter(
          (emp) =>
            emp.current_customer_id === null && emp.id !== selectedEmployee.id
        );

        if (remainingAvailable.length === 0) {
          // All employees in current round are busy, start new round
          const nextRound = dailyQueue.current_round + 1;

          // For each employee in the current round, calculate their position in the next round
          const positionUpdates = employeesInRound.map((emp, index) => ({
            id: emp.id,
            next_round_position: index + 1,
            queue_round: nextRound,
          }));

          // Update daily queue to next round and reset position
          await supabase
            .from("daily_facility_queue")
            .update({
              current_round: nextRound,
              current_position: 0, // Reset position for new round
              initial_round_completed: true,
            })
            .eq("id", dailyQueue.id);

          // Update all employees for next round
          await Promise.all(
            positionUpdates.map((update) =>
              supabase
                .from("employee_queue")
                .update({
                  queue_round: update.queue_round,
                  position_in_queue: update.next_round_position,
                })
                .eq("id", update.id)
            )
          );
        }

        await supabase.rpc("commit_transaction");
        return {
          type: "IMMEDIATE_ASSIGNMENT",
          data: appointment,
        };
      }

      // No available employees, add customer to queue
      const { data: queueEntry, error: queueError } = await supabase
        .from("customer_queue")
        .insert({
          facility_id: facilityId,
          customer_name: customerData.customer_name,
          contact_info: customerData.contact_info,
          service_id: customerData.service_id,
          status: "waiting",
        })
        .select()
        .single();

      if (queueError) throw queueError;

      await supabase.rpc("commit_transaction");
      return {
        type: "ADDED_TO_QUEUE",
        data: queueEntry,
      };
    } catch (error) {
      await supabase.rpc("rollback_transaction");
      throw error;
    }
  } catch (error) {
    console.error("Error processing customer:", error);
    return { type: "ERROR", error };
  }
};

// Helper function to initialize employee positions for a new round
export const initializeEmployeePositions = async (facilityId) => {
  const { data: employees } = await supabase
    .from("employee_queue")
    .select("*")
    .eq("facility_id", facilityId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (employees?.length) {
    await Promise.all(
      employees.map((emp, index) =>
        supabase
          .from("employee_queue")
          .update({
            position_in_queue: index + 1,
            queue_round: 1,
            next_round_position: index + 1,
          })
          .eq("id", emp.id)
      )
    );
  }
};

/**
 * Complete a customer appointment and check for next customer in queue
 */
export const finishCustomerAppointment = async (
  appointmentData,
  facilityId
) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Start transaction
    const client = await supabase.rpc("begin_transaction");

    try {
      // Get daily queue status first
      const { data: dailyQueue } = await supabase
        .from("daily_facility_queue")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("date", today)
        .single();

      // Get employee queue entry
      const { data: employeeQueue } = await supabase
        .from("employee_queue")
        .select("*")
        .eq("employee_id", appointmentData.employee_id)
        .eq("is_active", true)
        .single();

      // Mark current appointment as completed
      const { data: completedAppointment } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          price: appointmentData.price,
          end_time: now.toISOString(),
        })
        .eq("id", appointmentData.id)
        .select()
        .single();

      // Check queue for next customer
      const { data: nextCustomer } = await supabase
        .from("customer_queue")
        .select("*, services(duration)")
        .eq("facility_id", facilityId)
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      //zatial vymazeme a nepriradime zakaznika automaticky - bude sa to robit cez recepiu
      // if (nextCustomer) {
      //   // Calculate end time based on service duration
      //   const endTime = new Date(
      //     now.getTime() + nextCustomer.services.duration * 60 * 1000
      //   );

      //   // Create new appointment for waiting customer
      //   const { data: newAppointment } = await supabase
      //     .from("appointments")
      //     .insert({
      //       customer_name: nextCustomer.customer_name,
      //       email: nextCustomer.contact_info.includes("@")
      //         ? nextCustomer.contact_info
      //         : null,
      //       phone: !nextCustomer.contact_info.includes("@")
      //         ? nextCustomer.contact_info
      //         : null,
      //       service_id: nextCustomer.service_id,
      //       employee_id: completedAppointment.employee_id,
      //       facility_id: facilityId,
      //       start_time: now.toISOString(),
      //       end_time: endTime.toISOString(),
      //       status: "in_progress",
      //       arrival_time: nextCustomer.created_at,
      //     })
      //     .select()
      //     .single();

      //   // Remove customer from queue
      //   await supabase
      //     .from("customer_queue")
      //     .delete()
      //     .eq("id", nextCustomer.id);

      //   // Update employee queue with new customer
      //   await supabase
      //     .from("employee_queue")
      //     .update({
      //       current_customer_id: newAppointment.id,
      //       last_assignment_time: now.toISOString(),
      //     })
      //     .eq("id", employeeQueue.id);

      //   // Update current position in daily queue
      //   await supabase
      //     .from("daily_facility_queue")
      //     .update({
      //       current_position: employeeQueue.position_in_queue,
      //     })
      //     .eq("id", dailyQueue.id);

      //   await supabase.rpc("commit_transaction");

      //   return {
      //     status: "NEXT_CUSTOMER_ASSIGNED",
      //     completedAppointment,
      //     nextAppointment: newAppointment,
      //   };
      // } else {
      // No waiting customers, update employee queue to show availability

      //koniec pre : %zatial vymazeme a nepriradime zakaznika automaticky - bude sa to robit cez recepiu

      await supabase
        .from("employee_queue")
        .update({
          current_customer_id: null,
          last_assignment_time: now.toISOString(),
        })
        .eq("id", employeeQueue.id);

      // Get all employees in current round to check if round is complete
      const { data: employeesInRound } = await supabase
        .from("employee_queue")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("queue_round", dailyQueue.current_round)
        .eq("is_active", true);

      // Check if all employees in round are now free
      const allEmployeesFree = employeesInRound?.every(
        (emp) => emp.current_customer_id === null
      );

      if (allEmployeesFree) {
        // Reset current_position to 0 when all employees are free
        await supabase
          .from("daily_facility_queue")
          .update({
            current_position: 0,
          })
          .eq("id", dailyQueue.id);
      }

      await supabase.rpc("commit_transaction");

      return {
        status: "COMPLETED",
        completedAppointment,
        nextAppointment: null,
      };
    } catch (error) {
      await supabase.rpc("rollback_transaction");
      throw error;
    }
  } catch (error) {
    console.error("Error finishing appointment:", error);
    return { status: "ERROR", error };
  }
};

/**
 * Accept and start a customer appointment after check-in
 * @param {string} appointmentId - ID of the appointment to start
 * @param {string} employeeQueueId - ID of the employee queue entry
 * @param {string} facilityId - ID of the facility
 */
export const acceptCustomerCheckIn = async (
  appointmentId,
  employeeQueueId,
  facilityId
) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

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

      // Get daily queue status
      const { data: dailyQueue } = await supabase
        .from("daily_facility_queue")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("date", today)
        .single();

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

      // Update current position in daily queue if we're tracking positions
      if (dailyQueue && employeeQueue.position_in_queue) {
        await supabase
          .from("daily_facility_queue")
          .update({
            current_position: employeeQueue.position_in_queue,
          })
          .eq("id", dailyQueue.id);
      }

      await supabase.rpc("commit_transaction");

      return {
        status: "STARTED",
        data: {
          appointment: updatedAppointment,
          employeeQueue,
          message: "Appointment started successfully",
        },
        error: null,
      };
    } catch (error) {
      await supabase.rpc("rollback_transaction");
      throw error;
    }
  } catch (error) {
    console.error("Error accepting customer check-in:", error);
    return {
      status: "ERROR",
      data: null,
      error: error.message || "Failed to start appointment",
    };
  }
};

export const getNextQueueEmployee = async (facilityId) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // First get the daily queue status
    const { data: dailyQueue } = await supabase
      .from("daily_facility_queue")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("date", today)
      .single();

    if (!dailyQueue) {
      // If no daily queue exists, we would get the first employee in round 1
      const { data: firstEmployee } = await supabase
        .from("employee_queue")
        .select(
          `
          *,
          employees!inner (
            id,
            table_number,
            users!inner (
              first_name,
              last_name
            )
          )
        `
        )
        .eq("facility_id", facilityId)
        .eq("is_active", true)
        .eq("queue_round", 1)
        .order("position_in_queue", { ascending: true })
        .limit(1)
        .single();

      return { data: firstEmployee, error: null };
    }

    // Get next available employee in current round
    const { data: nextInRound } = await supabase
      .from("employee_queue")
      .select(
        `
        *,
        employees!inner (
          id,
          table_number,
          users!inner (
            first_name,
            last_name
          )
        )
      `
      )
      .eq("facility_id", facilityId)
      .eq("is_active", true)
      .eq("queue_round", dailyQueue.current_round)
      .is("current_customer_id", null)
      .order("position_in_queue", { ascending: true })
      .limit(1)
      .single();

    if (nextInRound) {
      return { data: nextInRound, error: null };
    }

    // If no one available in current round, look for next round
    const { data: nextRoundEmployee } = await supabase
      .from("employee_queue")
      .select(
        `
        *,
        employees!inner (
          id,
          table_number,
          users!inner (
            first_name,
            last_name
          )
        )
      `
      )
      .eq("facility_id", facilityId)
      .eq("is_active", true)
      .eq("queue_round", dailyQueue.current_round + 1)
      .is("current_customer_id", null)
      .order("next_round_position", { ascending: true })
      .limit(1)
      .single();

    return { data: nextRoundEmployee, error: null };
  } catch (error) {
    console.error("Error getting next queue employee:", error);
    return { data: null, error };
  }
};
