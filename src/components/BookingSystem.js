import React, { useState, useEffect } from "react";

import { useFacility } from "../FacilityContext";
import FacilitySelector from "./FacilitySelector";
import { format, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Calendar } from "./ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast, Toaster } from "react-hot-toast";
import {
  CalendarIcon,
  ClockIcon,
  Sparkles,
  User,
  CheckCircle,
  Calendar as CalendarIcon2,
  Heart,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { downloadICSFile } from "../utils/calendarUtils";
import useDebounce from "../utils/useDebounce";

const steps = ["Služba", "Zamestnanec", "Dátum", "Čas", "Potvrdenie"];

const Stepper = ({ currentStep }) => (
  <div className="flex justify-between mb-8">
    {steps.map((step, index) => (
      <div
        key={step}
        className={`flex flex-col items-center ${
          index <= currentStep ? "text-pink-600" : "text-gray-400"
        }`}
      >
        <div
          className={`rounded-full transition duration-500 ease-in-out h-8 w-8 flex items-center justify-center ${
            index < currentStep
              ? "bg-pink-600 text-white"
              : index === currentStep
              ? "border-2 border-pink-600 text-pink-600"
              : "border-2 border-gray-300"
          }`}
        >
          {index < currentStep ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            index + 1
          )}
        </div>
        <div className="text-xs font-medium mt-2">{step}</div>
      </div>
    ))}
  </div>
);

const SelectionGrid = ({ items, selectedItem, onSelect, renderItem }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map((item) => (
      <motion.div
        key={item.id}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Card
          className={`cursor-pointer transition-all ${
            selectedItem?.id === item.id
              ? "border-pink-500 bg-pink-50"
              : "hover:border-pink-300"
          }`}
          onClick={() => onSelect(item)}
        >
          <CardContent className="p-6">{renderItem(item)}</CardContent>
        </Card>
      </motion.div>
    ))}
  </div>
);

const TimeSlotGroup = ({ title, slots, selectedTime, onSelectTime }) => (
  <div className="mb-4">
    <h4 className="text-lg font-semibold mb-2">{title}</h4>
    <div className="grid grid-cols-4 gap-2">
      {slots.map((time) => (
        <Button
          key={time}
          onClick={() => onSelectTime(time)}
          variant={selectedTime === time ? "default" : "outline"}
          className={`w-full ${
            selectedTime === time
              ? "bg-pink-500 text-white"
              : "hover:bg-pink-100 hover:text-pink-800"
          }`}
        >
          {time}
        </Button>
      ))}
    </div>
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

  const debouncedCustomerName = useDebounce(customerName, 500);
  const debouncedEmail = useDebounce(email, 1000);
  const debouncedPhone = useDebounce(phone, 1000);

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
      .select("*, users (id, first_name, last_name), table_number")
      .eq("facility_id", facilityId);

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
    console.log("Fetching available slots...");
    console.log("Selected date:", selectedDate);
    console.log("Selected service:", selectedService);
    console.log("Selected staff:", selectedStaff);

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
    if (!customerName || !email || !phone) {
      toast.error("Prosím, vyplňte všetky povinné polia.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Prosím, zadajte platný email.");
      return;
    }

    // Phone validation (simple check for now)
    if (phone.length < 9) {
      toast.error("Prosím, zadajte platné telefónne číslo.");
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

      const startTime = new Date(
        `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`
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
        price: selectedService.price,
      };

      const { data, error } = await supabase
        .from("appointments")
        .insert([bookingData])
        .select();

      if (error) throw error;

      setBookingComplete(true);
      toast.success("Rezervácia bola úspešne vytvorená!");
    } catch (error) {
      console.error("Chyba pri vytváraní rezervácie:", error);
      toast.error(
        "Nastala chyba pri vytváraní rezervácie. Skúste to prosím znova."
      );
    }
  };

  const renderServiceSelection = () => (
    <SelectionGrid
      items={services}
      selectedItem={selectedService}
      onSelect={(service) => {
        setSelectedService(service);
        setActiveStep(1);
      }}
      renderItem={(service) => (
        <>
          <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
          <div className="flex justify-between items-center">
            <Badge variant="secondary">{service.duration} min</Badge>
            <span className="text-xl font-bold text-pink-600">
              {service.price}€
            </span>
          </div>
        </>
      )}
    />
  );

  const renderStaffSelection = () => (
    <SelectionGrid
      items={[
        { id: "any", name: "Ktokoľvek", speciality: "", table_number: "" },
        ...employees,
      ]}
      selectedItem={selectedStaff}
      onSelect={(staff) => {
        setSelectedStaff(staff);
        setActiveStep(2);
      }}
      renderItem={(staff) => (
        <div className="flex flex-col items-center h-full">
          <Avatar className="w-20 h-20 mb-4">
            {staff.id === "any" ? (
              <AvatarFallback>ANY</AvatarFallback>
            ) : (
              <>
                <AvatarImage
                  src={staff.avatar_url}
                  alt={staff.users.first_name}
                />
                <AvatarFallback>
                  {staff.users.first_name?.[0]}
                  {staff.users.last_name?.[0]}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <h3 className="text-lg font-semibold text-center">
            {staff.id === "any"
              ? "Ktokoľvek"
              : `${staff.users.first_name} ${staff.users.last_name}`}
          </h3>
          <p className="text-sm text-gray-500 text-center mt-2">
            {staff.id === "any" ? "\u00A0" : staff.speciality}
          </p>
          <p className="text-sm font-medium mt-auto text-center">
            {staff.id === "any"
              ? "\u00A0"
              : `Stôl: ${staff.table_number || "N/A"}`}
          </p>
        </div>
      )}
    />
  );

  const renderDateSelection = () => (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => {
        setSelectedDate(date);
        setActiveStep(3);
      }}
      className="rounded-md border"
      locale={sk}
    />
  );

  const renderTimeSelection = () => {
    const morningSlots = availableSlots.filter((slot) => slot < "12:00");
    const afternoonSlots = availableSlots.filter(
      (slot) => slot >= "12:00" && slot < "17:00"
    );
    const eveningSlots = availableSlots.filter((slot) => slot >= "17:00");

    const handleTimeSelection = (time) => {
      setSelectedTime(time);
      setActiveStep(4);
    };

    return (
      <div>
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Vyberte čas
        </h3>
        {isLoadingSlots ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : availableSlots.length > 0 ? (
          <Tabs defaultValue="morning">
            <TabsList>
              <TabsTrigger value="morning">Ráno</TabsTrigger>
              <TabsTrigger value="afternoon">Poobede</TabsTrigger>
              <TabsTrigger value="evening">Večer</TabsTrigger>
            </TabsList>
            <TabsContent value="morning">
              <TimeSlotGroup
                title="Ráno"
                slots={morningSlots}
                selectedTime={selectedTime}
                onSelectTime={handleTimeSelection}
              />
            </TabsContent>
            <TabsContent value="afternoon">
              <TimeSlotGroup
                title="Poobede"
                slots={afternoonSlots}
                selectedTime={selectedTime}
                onSelectTime={handleTimeSelection}
              />
            </TabsContent>
            <TabsContent value="evening">
              <TimeSlotGroup
                title="Večer"
                slots={eveningSlots}
                selectedTime={selectedTime}
                onSelectTime={handleTimeSelection}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg">
              Žiadne dostupné termíny pre tento deň.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderBookingSummary = () => {
    let staffName;
    if (selectedStaff.id === "any") {
      if (selectedRandomEmployee) {
        staffName = `${selectedRandomEmployee.users.first_name} ${selectedRandomEmployee.users.last_name}`;
      } else {
        staffName = "Neboli nájdení žiadni dostupní zamestnanci";
      }
    } else {
      staffName = `${selectedStaff.users.first_name} ${selectedStaff.users.last_name}`;
    }

    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Zhrnutie rezervácie
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-pink-500" />
              <span>
                {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5 text-pink-500" />
              <span>{selectedTime}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-pink-500" />
              <span>{staffName}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-pink-500" />
              <span>{selectedService.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-pink-500" />
              <span>{facility.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-purple-500 text-white">
                {selectedService.duration} min
              </Badge>
              <span className="text-xl font-bold text-pink-700">
                {selectedService.price}€
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-4 mt-6">
          <Input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Vaše meno"
            className="w-full"
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Váš email"
            className="w-full"
          />
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Vaše telefónne číslo"
            className="w-full"
          />
        </div>
        <Button
          onClick={handleBooking}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-colors text-lg py-6 rounded-lg shadow-lg"
        >
          Potvrdiť rezerváciu
        </Button>
      </div>
    );
  };

  const ThankYouPage = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="mb-8">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 1,
            ease: "easeInOut",
            times: [0, 0.2, 0.5, 0.8, 1],
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <Heart className="w-24 h-24 mx-auto text-pink-500" />
        </motion.div>
      </div>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        Ďakujeme za vašu rezerváciu!
      </h2>
      <p className="text-xl text-gray-600 mb-8">
        {customerName}, tešíme sa na vás{" "}
        {format(selectedDate, "d. MMMM yyyy", { locale: sk })} o {selectedTime}{" "}
        v prevádzke {facility.name}.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <Button
          onClick={() => {
            setActiveStep(0);
            setBookingComplete(false);
          }}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-colors text-lg py-4 px-8 rounded-lg shadow-lg"
        >
          Rezervovať ďalší termín
        </Button>
        <Button
          onClick={() => {
            const appointmentData = {
              service: selectedService,
              facility: facility,
              date: format(selectedDate, "yyyy-MM-dd"),
              time: selectedTime,
              staff: selectedStaff,
            };
            downloadICSFile(appointmentData);
          }}
          className="bg-white text-pink-600 border border-pink-600 hover:bg-pink-50 transition-colors text-lg py-4 px-8 rounded-lg shadow-lg flex items-center"
        >
          <CalendarIcon2 className="mr-2" />
          Pridať do kalendára
        </Button>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    switch (activeStep) {
      case 0:
        return renderServiceSelection();
      case 1:
        return renderStaffSelection();
      case 2:
        return renderDateSelection();
      case 3:
        return renderTimeSelection();
      case 4:
        return renderBookingSummary();
      default:
        return null;
    }
  };

  if (!facility) {
    return <div>Načítavanie informácií o prevádzke...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-center" reverseOrder={false} />
      <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
          <CardTitle className="text-3xl font-bold flex items-center">
            <Sparkles className="mr-2" />
            {bookingComplete
              ? "Rezervácia dokončená"
              : `Rezervácia termínu v ${facility.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {!bookingComplete && (
            <>
              <Stepper currentStep={activeStep} />
              <Progress value={(activeStep / (steps.length - 1)) * 100} />
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
              {bookingComplete ? <ThankYouPage /> : renderContent()}
            </motion.div>
          </AnimatePresence>

          {!bookingComplete && activeStep > 0 && activeStep < 4 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              >
                Späť
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveStep((prev) => Math.min(4, prev + 1))}
                disabled={
                  (activeStep === 0 && !selectedService) ||
                  (activeStep === 1 && !selectedStaff) ||
                  (activeStep === 2 && !selectedDate) ||
                  (activeStep === 3 && !selectedTime)
                }
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
