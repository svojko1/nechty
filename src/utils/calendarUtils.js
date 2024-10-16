const formatDate = (date) => date.replace(/[-:]/g, "");

const createICSContent = (appointmentData) => {
  const { service, facility, date, time, staff } = appointmentData;
  const startDate = `${date}T${time}:00`;
  const endDate = new Date(
    new Date(startDate).getTime() + service.duration * 60000
  );
  const endDateFormatted = `${date}T${endDate
    .getHours()
    .toString()
    .padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}:00`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hacksw/handcal//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${new Date().getTime()}@appointment.com
DTSTAMP:${formatDate(new Date().toISOString())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDateFormatted)}
SUMMARY:${service.name} at ${facility.name}
DESCRIPTION:Appointment with ${staff.users.first_name} ${staff.users.last_name}
LOCATION:${facility.address}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
};

export const downloadICSFile = (appointmentData) => {
  const icsContent = createICSContent(appointmentData);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "appointment.ics");
  document.body.appendChild(link);

  if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {
    window.open(url);
  } else {
    link.click();
  }

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
