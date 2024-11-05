// src/utils/employeeAvailability.js

import { supabase } from "../supabaseClient";

/**
 * Check if an employee is available at a specific time
 * @param {string} employeeId - The ID of the employee to check
 * @param {Date} startTime - The start time to check availability for
 * @param {Date} endTime - The end time to check availability for
 * @param {string} facilityId - The facility ID
 * @returns {Promise<boolean>} - Whether the employee is available
 */
export const isEmployeeAvailable = async (
  employeeId,
  startTime,
  endTime,
  facilityId
) => {
  try {
    // Check if employee is checked in and active
    const { data: queueData, error: queueError } = await supabase
      .from("employee_queue")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("facility_id", facilityId)
      .eq("is_active", true)
      .single();

    if (queueError) return false;

    // Check if employee is on break
    const now = new Date();
    if (
      queueData.break_start &&
      (!queueData.break_end || new Date(queueData.break_end) > now)
    ) {
      return false;
    }

    // Check for overlapping appointments
    const { data: appointments, error: appointmentError } = await supabase
      .from("appointments")
      .select("*")
      .eq("employee_id", employeeId)
      .or(
        `and(start_time.gte.${startTime.toISOString()},start_time.lt.${endTime.toISOString()}),` +
          `and(end_time.gt.${startTime.toISOString()},end_time.lte.${endTime.toISOString()}),` +
          `and(start_time.lte.${startTime.toISOString()},end_time.gte.${endTime.toISOString()})`
      );

    if (appointmentError) throw appointmentError;

    return appointments.length === 0;
  } catch (error) {
    console.error("Error checking employee availability:", error);
    return false;
  }
};

// In employeeAvailability.js, add this function:

export const handleEarlyCheckIn = async (appointmentId) => {
  try {
    const now = new Date();

    // Get appointment details first
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate time difference in minutes
    const startTime = new Date(appointment.start_time);
    const timeDifference = (startTime - now) / (1000 * 60); // minutes

    // If more than 30 minutes early, set to pending
    if (timeDifference > 30) {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "pending_check_in",
          arrival_time: now.toISOString(),
        })
        .eq("id", appointmentId)
        .select()
        .single();

      if (error) throw error;
      return { status: "PENDING_APPROVAL", data };
    }

    // Otherwise proceed with normal check-in
    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "in_progress",
        arrival_time: now.toISOString(),
        start_time: now.toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) throw error;
    return { status: "CHECKED_IN", data };
  } catch (error) {
    console.error("Error handling early check-in:", error);
    return { status: "ERROR", error };
  }
};

export const confirmEarlyCheckIn = async (appointmentId) => {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "in_progress",
        start_time: now.toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) throw error;
    return { status: "CHECKED_IN", data };
  } catch (error) {
    console.error("Error confirming early check-in:", error);
    return { status: "ERROR", error };
  }
};

/**
 * Get the next available employee for a given time slot
 * @param {string} facilityId - The facility ID
 * @param {Date} startTime - The start time to check availability for
 * @param {Date} endTime - The end time to check availability for
 * @returns {Promise<Object|null>} - The next available employee or null if none found
 */
export const getNextAvailableEmployee = async (
  facilityId,
  startTime,
  endTime
) => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(10, 0, 0, 0); // 10:00 AM

    // Get all active employees in queue order
    const { data: queueData, error: queueError } = await supabase
      .from("employee_queue")
      .select(
        `
        *,
        employees!inner(
          id,
          users (first_name, last_name)
        )
      `
      )
      .eq("facility_id", facilityId)
      .eq("is_active", true)
      .order("queue_round", { ascending: true })
      .order("position_in_queue", { ascending: true });

    if (queueError) throw queueError;

    // Group employees by round
    const employeesByRound = queueData.reduce((acc, emp) => {
      const round = new Date(emp.check_in_time) <= cutoffTime ? 1 : 2;
      if (!acc[round]) acc[round] = [];
      acc[round].push(emp);
      return acc;
    }, {});

    // Check availability for each employee in round order
    for (const round of Object.keys(employeesByRound).sort()) {
      for (const employee of employeesByRound[round]) {
        const isAvailable = await isEmployeeAvailable(
          employee.employee_id,
          startTime,
          endTime,
          facilityId
        );

        if (isAvailable) {
          return employee;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting next available employee:", error);
    return null;
  }
};

export const handleEmployeeCheckIn = async (employeeId, facilityId) => {
  try {
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(10, 0, 0, 0); // 10:00 AM

    // Start a Supabase transaction
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .single();

    if (employeeError) throw employeeError;

    // Determine queue round based on check-in time
    const queueRound = now <= cutoffTime ? 1 : 2;

    // Get current active employees count to determine position
    const { data: activeEmployees, error: countError } = await supabase
      .from("employee_queue")
      .select("position_in_queue")
      .eq("facility_id", facilityId)
      .eq("is_active", true)
      .order("position_in_queue", { ascending: false });

    if (countError) throw countError;

    // Calculate next position in queue
    const nextPosition =
      activeEmployees.length > 0
        ? Math.max(...activeEmployees.map((emp) => emp.position_in_queue)) + 1
        : 1;

    // Check for waiting customers
    const { data: waitingCustomer, error: waitingError } = await supabase
      .from("customer_queue")
      .select(
        `
          *,
          services (id, name, duration)
        `
      )
      .eq("facility_id", facilityId)
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    // Create employee queue entry
    const { data: queueEntry, error: queueError } = await supabase
      .from("employee_queue")
      .insert({
        employee_id: employeeId,
        facility_id: facilityId,
        check_in_time: now.toISOString(),
        is_active: true,
        queue_round: queueRound,
        position_in_queue: nextPosition,
        last_assignment_time: now.toISOString(),
      })
      .select()
      .single();

    if (queueError) throw queueError;

    // If there's a waiting customer, create an appointment
    if (waitingCustomer && !waitingError) {
      const appointmentEndTime = new Date(
        now.getTime() + waitingCustomer.services.duration * 60 * 1000
      );

      // Create appointment for waiting customer
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_name: waitingCustomer.customer_name,
          email: waitingCustomer.contact_info.includes("@")
            ? waitingCustomer.contact_info
            : null,
          phone: !waitingCustomer.contact_info.includes("@")
            ? waitingCustomer.contact_info
            : null,
          service_id: waitingCustomer.service_id,
          employee_id: employeeId,
          facility_id: facilityId,
          start_time: now.toISOString(),
          end_time: appointmentEndTime.toISOString(),
          status: "in_progress",
          arrival_time: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Update employee queue with customer assignment
      const { error: updateError } = await supabase
        .from("employee_queue")
        .update({
          current_customer_id: appointment.id,
          last_assignment_time: now.toISOString(),
        })
        .eq("id", queueEntry.id);

      if (updateError) throw updateError;

      // Remove customer from queue
      const { error: removeError } = await supabase
        .from("customer_queue")
        .delete()
        .eq("id", waitingCustomer.id);

      if (removeError) throw removeError;

      return {
        data: {
          ...queueEntry,
          assigned_customer: appointment,
        },
        error: null,
      };
    }

    return { data: queueEntry, error: null };
  } catch (error) {
    console.error("Error checking in employee:", error);
    return { data: null, error };
  }
};

// Add this new export
export const handleEmployeeCheckOut = async (queueEntryId, facilityId) => {
  try {
    // Update current employee status
    const { data: updatedEntry, error: updateError } = await supabase
      .from("employee_queue")
      .update({
        check_out_time: new Date().toISOString(),
        is_active: false,
        current_customer_id: null,
      })
      .eq("id", queueEntryId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Reorder remaining employees in the queue
    const { data: activeEmployees, error: fetchError } = await supabase
      .from("employee_queue")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("is_active", true)
      .order("queue_round", { ascending: true })
      .order("position_in_queue", { ascending: true });

    if (fetchError) throw fetchError;

    // Update positions of remaining employees
    const updatePromises = activeEmployees.map((emp, index) => {
      if (emp.position_in_queue !== index + 1) {
        return supabase
          .from("employee_queue")
          .update({ position_in_queue: index + 1 })
          .eq("id", emp.id);
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    return { data: updatedEntry, error: null };
  } catch (error) {
    console.error("Error checking out employee:", error);
    return { data: null, error };
  }
};

// In employeeAvailability.js

export const processCustomerArrival = async (customerData, facilityId) => {
  try {
    // Get the service details for duration
    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", customerData.service_id)
      .single();

    if (serviceError) throw serviceError;

    const now = new Date();
    const endTime = new Date(now.getTime() + serviceData.duration * 60 * 1000);

    // Check if this is a scheduled appointment checking in early
    if (customerData.requested_start_time) {
      const scheduledStart = new Date(customerData.requested_start_time);

      // If more than 30 mins early, require approval
      if (scheduledStart > now && scheduledStart - now > 30 * 60 * 1000) {
        // Check for available employee
        const availableEmployee = await getNextAvailableEmployee(
          facilityId,
          now,
          endTime
        );

        if (availableEmployee) {
          // Create appointment with pending_approval status
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
              employee_id: availableEmployee.employee_id,
              facility_id: facilityId,
              start_time: scheduledStart.toISOString(),
              end_time: new Date(
                scheduledStart.getTime() + serviceData.duration * 60 * 1000
              ).toISOString(),
              status: "pending_approval",
              arrival_time: now.toISOString(),
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .select()
            .single();

          if (appointmentError) throw appointmentError;

          return {
            type: "PENDING_APPROVAL",
            data: appointment,
            error: null,
          };
        }
      }
    }

    // Check for available employee for immediate service
    const availableEmployee = await getNextAvailableEmployee(
      facilityId,
      now,
      endTime
    );

    if (availableEmployee) {
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
          employee_id: availableEmployee.employee_id,
          facility_id: facilityId,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          status: "in_progress",
          arrival_time: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Update employee queue status
      const { error: queueUpdateError } = await supabase
        .from("employee_queue")
        .update({
          current_customer_id: appointment.id,
          last_assignment_time: now.toISOString(),
        })
        .eq("id", availableEmployee.id);

      if (queueUpdateError) throw queueUpdateError;

      return {
        type: "IMMEDIATE_ASSIGNMENT",
        data: appointment,
        error: null,
      };
    }

    // If no employee is available, add to queue
    // First, get or create the daily facility queue counter
    const { data: dailyQueue, error: dailyQueueError } = await supabase
      .from("daily_facility_queue")
      .select("current_position")
      .eq("facility_id", facilityId)
      .eq("date", now.toISOString().split("T")[0])
      .single();

    let nextPosition = 1;

    if (dailyQueueError && dailyQueueError.code === "PGRST116") {
      // No record exists for today, create one
      const { data: newDailyQueue, error: createError } = await supabase
        .from("daily_facility_queue")
        .insert([
          {
            facility_id: facilityId,
            date: now.toISOString().split("T")[0],
            current_position: 1,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      nextPosition = 1;
    } else if (dailyQueueError) {
      throw dailyQueueError;
    } else {
      // Increment the counter
      const { data: updatedQueue, error: updateError } = await supabase
        .from("daily_facility_queue")
        .update({ current_position: dailyQueue.current_position + 1 })
        .eq("facility_id", facilityId)
        .eq("date", now.toISOString().split("T")[0])
        .select()
        .single();

      if (updateError) throw updateError;
      nextPosition = updatedQueue.current_position;
    }

    // Add customer to queue with the next position
    const { data: queueEntry, error: insertError } = await supabase
      .from("customer_queue")
      .insert([
        {
          ...customerData,
          queue_position: nextPosition,
          status: "waiting",
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      type: "ADDED_TO_QUEUE",
      data: queueEntry,
      error: null,
    };
  } catch (error) {
    console.error("Error processing customer:", error);
    return {
      type: "ERROR",
      data: null,
      error,
    };
  }
};

export const acceptCustomerCheckIn = async (appointmentId, employeeId) => {
  try {
    const now = new Date();

    // Get appointment details
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*, services(duration)")
      .eq("id", appointmentId)
      .single();

    if (fetchError) throw fetchError;

    // Update appointment
    const endTime = new Date(
      now.getTime() + appointment.services.duration * 60 * 1000
    );

    const { data: updatedAppointment, error: updateError } = await supabase
      .from("appointments")
      .update({
        employee_id: employeeId,
        status: "in_progress",
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update employee queue
    const { error: queueError } = await supabase
      .from("employee_queue")
      .update({
        current_customer_id: appointmentId,
        last_assignment_time: now.toISOString(),
      })
      .eq("employee_id", employeeId)
      .eq("is_active", true);

    if (queueError) throw queueError;

    return {
      status: "SUCCESS",
      data: updatedAppointment,
      error: null,
    };
  } catch (error) {
    console.error("Error accepting check-in:", error);
    return {
      status: "ERROR",
      data: null,
      error,
    };
  }
};

export const finishCustomerAppointment = async (
  appointmentData,
  facilityId
) => {
  try {
    const now = new Date();

    // Update current appointment as completed
    const { data: completedAppointment, error: completionError } =
      await supabase
        .from("appointments")
        .update({
          status: "completed",
          price: appointmentData.price,
          end_time: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", appointmentData.id)
        .select(
          `
        *,
        services (id, name, duration),
        employees (
          id,
          users (first_name, last_name)
        )
      `
        )
        .single();

    if (completionError) throw completionError;

    // First check if employee is still active before assigning new customers
    const { data: activeEmployees, error: activeCheckError } = await supabase
      .from("employee_queue")
      .select("id")
      .eq("employee_id", completedAppointment.employee_id)
      .eq("is_active", true);

    if (activeCheckError) throw activeCheckError;

    // Check if there are any active entries
    if (!activeEmployees || activeEmployees.length === 0) {
      // Employee is not active anymore, just complete the appointment without assigning new customers
      return {
        status: "COMPLETED",
        completedAppointment,
        nextAppointment: null,
        error: null,
      };
    }

    // Check for waiting customers
    const { data: nextCustomer, error: queueError } = await supabase
      .from("customer_queue")
      .select(
        `
        *,
        services (id, name, duration)
      `
      )
      .eq("facility_id", facilityId)
      .eq("status", "waiting")
      .order("queue_position", { ascending: true })
      .limit(1)
      .single();

    if (queueError && queueError.code !== "PGRST116") throw queueError;

    if (nextCustomer) {
      // Calculate end time for new appointment
      const appointmentEndTime = new Date(
        now.getTime() + nextCustomer.services.duration * 60 * 1000
      );

      // Create new appointment for waiting customer
      const { data: newAppointment, error: appointmentError } = await supabase
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
          employee_id: completedAppointment.employee_id,
          facility_id: facilityId,
          start_time: now.toISOString(),
          end_time: appointmentEndTime.toISOString(),
          status: "in_progress",
          arrival_time: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Remove customer from queue
      const { error: removeError } = await supabase
        .from("customer_queue")
        .delete()
        .eq("id", nextCustomer.id);

      if (removeError) throw removeError;

      // Update employee queue status with new customer
      const { error: queueUpdateError } = await supabase
        .from("employee_queue")
        .update({
          current_customer_id: newAppointment.id,
          last_assignment_time: now.toISOString(),
        })
        .eq("employee_id", completedAppointment.employee_id)
        .eq("is_active", true);

      if (queueUpdateError) throw queueUpdateError;

      return {
        status: "NEXT_CUSTOMER_ASSIGNED",
        completedAppointment,
        nextAppointment: newAppointment,
        error: null,
      };
    } else {
      // No waiting customers, just update employee queue status
      const { error: queueUpdateError } = await supabase
        .from("employee_queue")
        .update({
          current_customer_id: null,
          last_assignment_time: now.toISOString(),
        })
        .eq("employee_id", completedAppointment.employee_id)
        .eq("is_active", true);

      if (queueUpdateError) throw queueUpdateError;

      return {
        status: "COMPLETED",
        completedAppointment,
        nextAppointment: null,
        error: null,
      };
    }
  } catch (error) {
    console.error("Error finishing appointment:", error);
    return {
      status: "ERROR",
      completedAppointment: null,
      nextAppointment: null,
      error,
    };
  }
};

// Optional: Add a function to check appointment status
export const getAppointmentStatus = async (appointmentId) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        services (name, duration),
        employees (
          users (first_name, last_name)
        )
      `
      )
      .eq("id", appointmentId)
      .single();

    if (error) throw error;

    const now = new Date();
    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);

    let status = {
      code: "SCHEDULED",
      isActive: false,
      timeRemaining: 0,
    };

    if (now < startTime) {
      status.code = "SCHEDULED";
      status.timeRemaining = (startTime - now) / 1000; // in seconds
    } else if (now >= startTime && now <= endTime) {
      status.code = "IN_PROGRESS";
      status.isActive = true;
      status.timeRemaining = (endTime - now) / 1000; // in seconds
    } else {
      status.code = "OVERTIME";
      status.timeRemaining = (now - endTime) / 1000; // seconds overtime
    }

    return { data: { ...data, status }, error: null };
  } catch (error) {
    console.error("Error checking appointment status:", error);
    return { data: null, error };
  }
};
