import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import { format, parse, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import { Sparkles, CheckCircle } from "lucide-react";
import { cn } from "src/lib/utils";

// UI components
import { Button } from "src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import { Progress } from "src/components/ui/progress";

// Functional components
import { useFacility } from "src/FacilityContext";
import FacilitySelector from "src/components/facility/FacilitySelector";
import { supabase } from "src/supabaseClient";
import ServiceSelection from "src/components/booking/booking-steps/ServiceSelection";
import StaffSelection from "src/components/booking/booking-steps/StaffSelection";
import DateTimeSelection from "src/components/booking/booking-steps/DateTimeSelection";
import BookingSummary from "src/components/booking/booking-steps/BookingSummary";
import ThankYouPage from "src/components/booking/booking-steps/ThankYouPage";
import { downloadICSFile } from "src/utils/calendarUtils";

const steps = ["Služba", "Zamestnanec", "Termín", "Potvrdenie"];

const Stepper = ({ currentStep }) => (
  <div className="flex items-center justify-between mb-8 px-2 overflow-x-auto">
    {steps.map((step, index) => (
      <div key={step} className="flex items-center">
        <div className="relative">
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-colors duration-300 ${
              index <= currentStep
                ? "border-pink-500 bg-pink-500 text-white"
                : "border-gray-300 text-gray-300"
            }`}
          >
            {index < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-sm font-semibold">{index + 1}</span>
            )}
          </div>
        </div>
        <div className="ml-3 hidden sm:block">
          <p
            className={`text-xs font-medium transition-colors duration-300 ${
              index <= currentStep ? "text-pink-600" : "text-gray-500"
            }`}
          >
            {step}
          </p>
        </div>
      </div>
    ))}
  </div>
);

function BookingSystem({ facilityId }) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [facility, setFacility] = useState(null);
  const [availableEmployees, setAvailableEmployees] = useState({});
  const [selectedRandomEmployee, setSelectedRandomEmployee] = useState(null);
  const { selectedFacility, loading } = useFacility();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFacilityInfo();
    fetchServices();
  }, [facilityId]);

  useEffect(() => {
    if (facility) {
      fetchEmployees();
    }
  }, [facility]);

  useEffect(() => {
    if (
      selectedDate &&
      selectedService &&
      facility &&
      (selectedStaff || selectedStaff === "any")
    ) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService, facility, selectedStaff]);

  useEffect(() => {
    if (
      selectedStaff?.id === "any" &&
      selectedTime &&
      availableEmployees[selectedTime]
    ) {
      const availableEmployeesForSlot = availableEmployees[selectedTime];
      if (availableEmployeesForSlot && availableEmployeesForSlot.length > 0) {
        const randomEmployee =
          availableEmployeesForSlot[
            Math.floor(Math.random() * availableEmployeesForSlot.length)
          ];
        setSelectedRandomEmployee(randomEmployee);
      }
    } else {
      setSelectedRandomEmployee(null);
    }
  }, [selectedStaff, selectedTime, availableEmployees]);

  const fetchFacilityInfo = async () => {
    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .eq("id", facilityId)
      .single();

    if (error) {
      console.error("Chyba pri načítaní informácií o prevádzke:", error);
      toast.error("Chyba pri načítaní informácií o prevádzke");
    } else {
      setFacility(data);
    }
  };

  const fetchServices = async () => {
    const { data, error } = await supabase.from("services").select("*");
    if (error) {
      console.error("Chyba pri načítaní služieb:", error);
      toast.error("Chyba pri načítaní služieb");
    } else {
      setServices(data);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*, users (id, first_name, last_name)")
      .eq("facility_id", facilityId)
      .eq("status", "approved"); // Only fetch approved employees

    if (error) {
      console.error("Chyba pri načítaní zamestnancov:", error);
      toast.error("Chyba pri načítaní zamestnancov");
    } else {
      setEmployees(data);
    }
    setIsLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!selectedFacility) {
    return <FacilitySelector />;
  }

  async function fetchAvailableSlots() {
    if (!selectedDate || !selectedService) {
      console.log("Not all necessary selections have been made");
      return;
    }

    setIsLoadingSlots(true);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // Fetch all appointments for the day, regardless of employee
      const { data: bookedSlots, error } = await supabase
        .from("appointments")
        .select("start_time, end_time, employee_id")
        .eq("facility_id", facilityId)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());

      if (error) {
        console.error("Supabase error fetching booked slots:", error);
        throw error;
      }

      // Generate all possible time slots
      const allSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          allSlots.push(
            `${hour.toString().padStart(2, "0")}:${minute
              .toString()
              .padStart(2, "0")}`
          );
        }
      }

      // Filter out booked slots and track available employees
      const availableSlots = [];
      const availableEmployeesPerSlot = {};

      allSlots.forEach((slot) => {
        const slotTime = new Date(selectedDate);
        const [hours, minutes] = slot.split(":");
        slotTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const slotEndTime = new Date(
          slotTime.getTime() + selectedService.duration * 60000
        );

        const availableEmployeesForSlot = employees.filter((employee) => {
          const conflictingAppointment = bookedSlots.find((bookedSlot) => {
            const bookedStart = new Date(bookedSlot.start_time);
            const bookedEnd = new Date(bookedSlot.end_time);
            return (
              bookedSlot.employee_id === employee.id &&
              ((slotTime >= bookedStart && slotTime < bookedEnd) ||
                (slotEndTime > bookedStart && slotEndTime <= bookedEnd) ||
                (slotTime <= bookedStart && slotEndTime >= bookedEnd))
            );
          });

          return !conflictingAppointment;
        });

        if (availableEmployeesForSlot.length > 0) {
          if (
            selectedStaff.id === "any" ||
            availableEmployeesForSlot.some((emp) => emp.id === selectedStaff.id)
          ) {
            availableSlots.push(slot);
            availableEmployeesPerSlot[slot] = availableEmployeesForSlot;
          }
        }
      });

      console.log("Booked slots:", bookedSlots);
      console.log("All slots:", allSlots);
      console.log("Available slots:", availableSlots);
      console.log("Available employees per slot:", availableEmployeesPerSlot);

      setAvailableSlots(availableSlots);
      setAvailableEmployees(availableEmployeesPerSlot);
    } catch (error) {
      console.error("Error in fetchAvailableSlots:", error);
      toast.error("Chyba pri načítaní dostupných termínov. Skúste to znova.");
      setAvailableSlots([]);
      setAvailableEmployees({});
    } finally {
      setIsLoadingSlots(false);
    }
  }

  const handleBooking = async () => {
    // Validation
    if (!customerName || !email) {
      toast.error("Prosím, vyplňte všetky povinné polia.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Prosím, zadajte platný email.");
      return;
    }

    try {
      let selectedEmployeeId;
      if (selectedStaff.id === "any") {
        if (selectedRandomEmployee) {
          selectedEmployeeId = selectedRandomEmployee.id;
        } else {
          throw new Error("No available employee selected");
        }
      } else {
        selectedEmployeeId = selectedStaff.id;
      }

      // Ensure we have valid date and time
      const appointmentDate = selectedDate
        ? new Date(selectedDate)
        : new Date();
      const appointmentTime = selectedTime
        ? parse(selectedTime, "HH:mm", new Date())
        : new Date();

      if (!isValid(appointmentDate) || !isValid(appointmentTime)) {
        throw new Error("Invalid date or time selected");
      }

      // Combine date and time
      const startTime = new Date(
        appointmentDate.getFullYear(),
        appointmentDate.getMonth(),
        appointmentDate.getDate(),
        appointmentTime.getHours(),
        appointmentTime.getMinutes()
      );

      const endTime = new Date(
        startTime.getTime() + selectedService.duration * 60000
      );

      const bookingData = {
        customer_name: customerName,
        email: email,
        phone: phone,
        service_id: selectedService.id,
        employee_id: selectedEmployeeId,
        facility_id: facility.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "scheduled",
        // price: selectedService.price,
      };

      const { data, error } = await supabase
        .from("appointments")
        .insert([bookingData])
        .select();

      if (error) throw error;

      setBookingComplete(true);
      toast.success("Rezervácia bola úspešne vytvorená!");

      const isKiosk = localStorage.getItem("kiosk-mode") === "true";

      setTimeout(() => {
        //refresh page

        window.location.reload();
      }, 15000);
    } catch (error) {
      console.error("Chyba pri vytváraní rezervácie:", error);
      toast.error(
        "Nastala chyba pri vytváraní rezervácie. Skúste to prosím znova."
      );
    }
  };

  const renderContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <ServiceSelection
            services={services}
            selectedService={selectedService}
            onServiceSelect={(service) => {
              setSelectedService(service);
              setActiveStep(1);
            }}
          />
        );
      case 1:
        return (
          <StaffSelection
            employees={employees}
            selectedStaff={selectedStaff}
            onStaffSelect={(staff) => {
              setSelectedStaff(staff);
              setActiveStep(2);
            }}
          />
        );
      case 2:
        return (
          <DateTimeSelection
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            availableSlots={availableSlots}
            isLoadingSlots={isLoadingSlots}
            onDateSelect={setSelectedDate}
            onTimeSelect={(time) => {
              setSelectedTime(time);
              setActiveStep(3);
            }}
          />
        );
      case 3:
        return (
          <BookingSummary
            selectedService={selectedService}
            selectedStaff={selectedStaff}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            facility={facility}
            customerName={customerName}
            email={email}
            phone={phone}
            onCustomerNameChange={setCustomerName}
            onEmailChange={setEmail}
            onPhoneChange={setPhone}
            onSubmit={handleBooking}
            isSubmitting={isLoading}
          />
        );
      default:
        return null;
    }
  };

  if (!facility) {
    return (
      <div className="text-center py-8">
        Načítavanie informácií o prevádzke...
      </div>
    );
  }

  const handleAddToCalendar = () => {
    const appointmentData = {
      service: selectedService,
      facility: facility,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime,
      staff: selectedStaff,
    };
    downloadICSFile(appointmentData);
  };

  const handleBookAnother = () => {
    window.location.reload();
  };

  return (
    <div className=" w-full max-w-3xl mx-auto">
      <Toaster position="top-center" reverseOrder={false} />
      <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold flex items-center justify-center">
            <Sparkles className="mr-2" />
            {bookingComplete
              ? "Rezervácia dokončená"
              : `Rezervácia termínu v ${facility.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6 sm:space-y-8">
          {!bookingComplete && (
            <>
              <Stepper currentStep={activeStep} />
              <Progress
                value={(activeStep / (steps.length - 1)) * 100}
                className="w-full"
              />
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {bookingComplete ? (
                <ThankYouPage
                  customerName={customerName}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  facility={facility}
                  onAddToCalendar={handleAddToCalendar}
                  onBookAnother={handleBookAnother}
                  isKiosk={localStorage.getItem("kiosk-mode") === "true"}
                />
              ) : (
                renderContent()
              )}
            </motion.div>
          </AnimatePresence>

          {!bookingComplete && activeStep > 0 && activeStep < 3 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 text-sm sm:text-base"
              >
                Späť
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveStep((prev) => Math.min(4, prev + 1))}
                disabled={
                  (activeStep === 0 && !selectedService) ||
                  (activeStep === 1 && !selectedStaff) ||
                  (activeStep === 2 && (!selectedDate || !selectedTime)) // Added condition for date/time
                }
                className={cn(
                  "px-4 py-2 text-sm sm:text-base",
                  // Add visual feedback for disabled state
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                )}
              >
                Ďalej
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BookingSystem;
