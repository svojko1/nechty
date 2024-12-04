// src/utils/appointmentUtils.js
import { addMinutes } from "date-fns";

export const calculateAppointmentEndTime = (startTime, duration) => {
  if (!startTime || !duration) {
    throw new Error("Start time and duration are required");
  }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    throw new Error("Invalid start time");
  }

  return addMinutes(start, parseInt(duration)).toISOString();
};

export const createAppointmentData = ({
  customerName,
  email,
  phone,
  serviceId,
  employeeId,
  facilityId,
  startTime,
  duration,
  status = "scheduled",
  arrivalTime = null,
  price = null,
}) => {
  const endTime = calculateAppointmentEndTime(startTime, duration);

  return {
    customer_name: customerName,
    email: email?.includes("@") ? email : null,
    phone: !email?.includes("@") ? email : phone,
    service_id: serviceId,
    employee_id: employeeId,
    facility_id: facilityId,
    start_time: new Date(startTime).toISOString(),
    end_time: endTime,
    status,
    arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
    price,
  };
};
