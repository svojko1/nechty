// src/utils/availabilityUtils.js
import { supabase } from "../supabaseClient";

/**
 * Get service duration from service table
 * @param {string} serviceId
 * @returns {Promise<number>}
 */
const getServiceDuration = async (serviceId) => {
  const { data, error } = await supabase
    .from("services")
    .select("duration")
    .eq("id", serviceId)
    .single();

  if (error) throw error;
  return data.duration;
};

/**
 * Get effective duration (custom or service default)
 */
const getEffectiveDuration = async ({ duration, serviceId }) => {
  // If custom duration is provided, use it
  if (duration) {
    return parseInt(duration);
  }

  // Otherwise, get service default duration
  if (serviceId) {
    return await getServiceDuration(serviceId);
  }

  throw new Error("Either duration or serviceId must be provided");
};

/**
 * Check if an employee is available for a given time slot
 */
export const checkEmployeeAvailability = async ({
  employeeId,
  startTime,
  duration = null,
  serviceId = null,
  facilityId,
}) => {
  try {
    const effectiveDuration = await getEffectiveDuration({
      duration,
      serviceId,
    });
    const endTime = new Date(
      new Date(startTime).getTime() + effectiveDuration * 60000
    );

    const { data: existingAppointments, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("facility_id", facilityId)
      .in("status", ["scheduled", "in_progress"])
      .or(
        `start_time.lte.${endTime.toISOString()},end_time.gte.${startTime.toISOString()}`
      );

    if (error) throw error;

    return {
      isAvailable: existingAppointments.length === 0,
      conflictingAppointments: existingAppointments,
    };
  } catch (error) {
    console.error("Error checking employee availability:", error);
    throw error;
  }
};

/**
 * Get all available employees for a given time slot
 */
export const getAvailableEmployees = async ({
  startTime,
  duration = null,
  facilityId,
  serviceId = null,
}) => {
  try {
    // First get all active employees
    const { data: activeEmployees, error: employeeError } = await supabase
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
      .is("current_customer_id", null);

    if (employeeError) throw employeeError;

    const effectiveDuration = await getEffectiveDuration({
      duration,
      serviceId,
    });

    // Check availability for each employee
    const availableEmployees = await Promise.all(
      activeEmployees.map(async (employee) => {
        const { isAvailable } = await checkEmployeeAvailability({
          employeeId: employee.employees.id,
          startTime,
          duration: effectiveDuration,
          facilityId,
        });

        return isAvailable ? employee : null;
      })
    );

    return availableEmployees.filter(Boolean);
  } catch (error) {
    console.error("Error getting available employees:", error);
    throw error;
  }
};

/**
 * Get all available time slots for an employee or any employee
 */
export const getAvailableTimeSlots = async ({
  employeeId,
  date,
  duration = null,
  facilityId,
  serviceId = null,
}) => {
  try {
    const effectiveDuration = await getEffectiveDuration({
      duration,
      serviceId,
    });

    const startOfDay = new Date(date);
    startOfDay.setHours(9, 0, 0, 0); // Business starts at 9 AM
    const endOfDay = new Date(date);
    endOfDay.setHours(18, 0, 0, 0); // Business ends at 6 PM

    // Generate all possible 30-minute slots
    const slots = [];
    let currentSlot = startOfDay;
    while (currentSlot < endOfDay) {
      slots.push(currentSlot.toISOString());
      currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
    }

    // Check each slot for availability
    const availableSlots = await Promise.all(
      slots.map(async (slot) => {
        if (employeeId) {
          const { isAvailable } = await checkEmployeeAvailability({
            employeeId,
            startTime: slot,
            duration: effectiveDuration,
            facilityId,
          });
          return isAvailable ? slot : null;
        } else {
          // Check if any employee is available
          const availableEmps = await getAvailableEmployees({
            startTime: slot,
            duration: effectiveDuration,
            facilityId,
            serviceId,
          });
          return availableEmps.length > 0 ? slot : null;
        }
      })
    );

    return availableSlots.filter(Boolean);
  } catch (error) {
    console.error("Error getting available time slots:", error);
    throw error;
  }
};

/**
 * Calculate appointment end time
 */
export const calculateEndTime = async ({
  startTime,
  duration = null,
  serviceId = null,
}) => {
  const effectiveDuration = await getEffectiveDuration({ duration, serviceId });
  return new Date(new Date(startTime).getTime() + effectiveDuration * 60000);
};
