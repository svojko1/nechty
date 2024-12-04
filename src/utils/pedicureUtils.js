import { supabase } from "../supabaseClient";

function findFirstAvailableChair(totalChairs, occupiedChairs) {
  for (let chairNumber = 1; chairNumber <= totalChairs; chairNumber++) {
    if (!occupiedChairs.includes(chairNumber)) {
      return chairNumber;
    }
  }
  return null;
}

export const checkPedicureAvailability = async (
  facilityId,
  requestedStartTime,
  duration
) => {
  try {
    // Get facility's total chairs
    const { data: facility } = await supabase
      .from("facilities")
      .select("pedicure_chairs")
      .eq("id", facilityId)
      .single();

    if (!facility) throw new Error("Facility not found");

    const requestedEndTime = new Date(
      new Date(requestedStartTime).getTime() + duration * 60000
    );

    // Get overlapping appointments
    const { data: overlappingAppointments } = await supabase
      .from("appointments")
      .select("chair_number, start_time, end_time")
      .eq("facility_id", facilityId)
      .in("status", ["in_progress", "scheduled"])
      .or(
        `start_time.lte.${requestedEndTime.toISOString()},end_time.gte.${requestedStartTime.toISOString()}`
      )
      .not("chair_number", "is", null);

    // Filter appointments that overlap with requested time
    const occupiedChairsAtTime = overlappingAppointments.filter(
      (appointment) => {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        return (
          appointmentStart <= requestedEndTime &&
          appointmentEnd >= requestedStartTime
        );
      }
    );

    const occupiedChairNumbers = occupiedChairsAtTime.map(
      (a) => a.chair_number
    );
    const availableChairNumber = findFirstAvailableChair(
      facility.pedicure_chairs,
      occupiedChairNumbers
    );

    return {
      isAvailable: occupiedChairsAtTime.length < facility.pedicure_chairs,
      availableChairNumber,
      totalChairs: facility.pedicure_chairs,
      occupiedCount: occupiedChairsAtTime.length,
      nextAvailableTime: !availableChairNumber
        ? new Date(
            Math.min(
              ...overlappingAppointments.map((a) => new Date(a.end_time))
            )
          )
        : null,
    };
  } catch (error) {
    console.error("Error checking pedicure availability:", error);
    throw error;
  }
};
