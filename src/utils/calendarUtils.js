import { format, parseISO } from "date-fns";

export function generateICSContent(appointment) {
  const { service, date, time, staff } = appointment;

  // Log the incoming data for debugging
  console.log("Appointment data:", appointment);

  let startDate;
  try {
    // Ensure the date is in the correct format (YYYY-MM-DD)
    const formattedDate = format(parseISO(date), "yyyy-MM-dd");
    startDate = new Date(`${formattedDate}T${time}`);

    // Check if startDate is valid
    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid start date");
    }
  } catch (error) {
    console.error("Error parsing date:", error);
    throw new Error("Invalid date or time format");
  }

  const endDate = new Date(startDate.getTime() + service.duration * 60000);

  const formatDate = (date) => {
    try {
      return format(date, "yyyyMMdd'T'HHmmss");
    } catch (error) {
      console.error("Error formatting date:", error);
      throw new Error("Error formatting date");
    }
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Glam Nails//Appointment//EN
BEGIN:VEVENT
UID:${Date.now()}@glamnails.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${service.name} at Glam Nails
DESCRIPTION:Appointment for ${service.name} with ${staff.users.first_name} ${
    staff.users.last_name
  }
LOCATION:Glam Nails Salon
END:VEVENT
END:VCALENDAR`;
}

export function downloadICSFile(appointment) {
  try {
    const icsContent = generateICSContent(appointment);
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "glam_nails_appointment.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error generating ICS file:", error);
    alert("There was an error creating the calendar event. Please try again.");
  }
}
