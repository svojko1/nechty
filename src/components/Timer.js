import EnhancedAppointmentTimer from "./EnhancedAppointmentTimer";

// In your component
const YourComponent = () => {
  const appointment = {
    start_time: "2023-05-20T14:00:00",
    end_time: "2023-05-20T15:00:00",
    services: { name: "Haircut" },
    customer_name: "John Doe",
  };

  return <EnhancedAppointmentTimer appointment={appointment} />;
};
