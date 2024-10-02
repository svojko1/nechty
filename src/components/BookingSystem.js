import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import useDebounce from "../utils/useDebounce";
import { Toaster, toast } from "react-hot-toast";
import {
  CalendarIcon,
  ClockIcon,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  User,
  CheckCircle,
  Calendar,
  Heart,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Progress } from "./ui/progress";
import { downloadICSFile } from "../utils/calendarUtils";
import { supabase } from "../supabaseClient";
import DigitalCountdownWatch from "./DigitalCountdownWatch";

function BookingSystem({ session }) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [bookingComplete, setBookingComplete] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [touched, setTouched] = useState({
    customerName: false,
    email: false,
    phone: false,
  });

  const debouncedCustomerName = useDebounce(customerName, 500);
  const debouncedEmail = useDebounce(email, 1000);
  const debouncedPhone = useDebounce(phone, 1000);

  useEffect(() => {
    fetchServices();
    fetchFacilities();
  }, []);

  useEffect(() => {
    if (selectedFacility) {
      fetchEmployees();
    }
  }, [selectedFacility]);

  useEffect(() => {
    if (selectedDate && selectedService && selectedStaff) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService, selectedStaff]);

  async function handleArrival(appointmentId) {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .update({ arrival_time: new Date().toISOString() })
        .eq("id", appointmentId)
        .select()
        .single();

      if (error) throw error;

      setActiveAppointment(data);
      toast.success("Príchod zaznamenaný. Odpočítavanie začalo!");
    } catch (error) {
      console.error("Error updating arrival time:", error);
      toast.error(`Chyba pri zaznamenávaní príchodu: ${error.message}`);
    }
  }

  const renderActiveAppointment = () => {
    if (!activeAppointment) return null;

    return (
      <Card className="mt-6 bg-white shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
          <CardTitle className="text-2xl font-bold">
            Aktívna rezervácia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold">
              {activeAppointment.service_name}
            </h3>
            <p>Zamestnanec: {activeAppointment.employee_name}</p>
            <p>
              Čas začiatku:{" "}
              {format(new Date(activeAppointment.start_time), "HH:mm")}
            </p>
          </div>
          <DigitalCountdownWatch
            startTime={
              activeAppointment.arrival_time || activeAppointment.start_time
            }
            duration={activeAppointment.duration}
          />
        </CardContent>
      </Card>
    );
  };

  async function fetchServices() {
    const { data, error } = await supabase.from("services").select("*");
    if (error) {
      console.error("Error fetching services:", error);
      toast.error("Chyba pri načítaní služieb.");
    } else {
      setServices(data);
    }
  }

  async function fetchFacilities() {
    const { data, error } = await supabase.from("facilities").select("*");
    if (error) {
      console.error("Error fetching facilities:", error);
      toast.error("Chyba pri načítaní prevádzok.");
    } else {
      setFacilities(data);
    }
  }

  async function fetchEmployees() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select(
        `
        *,
      users (id, first_name, last_name),
    table_number
      `
      )
      .eq("facility_id", selectedFacility.id);

    if (error) {
      console.error("Error fetching employees:", error);
      toast.error("Chyba pri načítaní zamestnancov.");
    } else {
      setEmployees(data);
    }
    setIsLoading(false);
  }

  async function fetchAvailableSlots() {
    setIsLoadingSlots(true);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      if (!selectedStaff || !selectedStaff.id) {
        throw new Error("No staff selected or invalid staff data");
      }

      const { data: bookedSlots, error } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("employee_id", selectedStaff.id)
        .gte("start_time", startOfDay.toISOString())
        .lte("end_time", endOfDay.toISOString());

      if (error) {
        console.error("Supabase error fetching booked slots:", error);
        throw error;
      }

      // Generate all possible time slots
      const allSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        allSlots.push(`${hour.toString().padStart(2, "0")}:00`);
        allSlots.push(`${hour.toString().padStart(2, "0")}:30`);
      }

      // Filter out booked slots
      const availableSlots = allSlots.filter((slot) => {
        const slotTime = new Date(selectedDate);
        const [hours, minutes] = slot.split(":");
        slotTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return !bookedSlots.some(
          (bookedSlot) =>
            slotTime >= new Date(bookedSlot.start_time) &&
            slotTime < new Date(bookedSlot.end_time)
        );
      });

      setAvailableSlots(availableSlots);
    } catch (error) {
      console.error("Error in fetchAvailableSlots:", error);
      toast.error("Chyba pri načítaní dostupných termínov. Skúste to znova.");
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone) => {
    return /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(
      phone.replace(/\s/g, "")
    );
  };

  async function handleBooking() {
    // Validation checks
    if (!customerName) {
      toast.error("Prosím, zadajte vaše meno.");
      return;
    }

    if (!selectedService) {
      toast.error("Prosím, vyberte službu.");
      return;
    }

    if (!selectedFacility) {
      toast.error("Prosím, vyberte prevádzku.");
      return;
    }

    if (!selectedDate) {
      toast.error("Prosím, vyberte dátum.");
      return;
    }

    if (!selectedTime) {
      toast.error("Prosím, vyberte čas.");
      return;
    }

    if (!selectedStaff) {
      toast.error("Prosím, vyberte zamestnanca.");
      return;
    }

    if (!email) {
      toast.error("Prosím, zadajte email.");
      return;
    }

    if (!isValidEmail(email)) {
      toast.error("Prosím, zadajte platný email.");
      return;
    }

    if (!phone) {
      toast.error("Prosím, zadajte telefónne číslo.");
      return;
    }

    if (!isValidPhone(phone)) {
      toast.error("Prosím, zadajte platné telefónne číslo.");
      return;
    }

    const startTime = new Date(
      `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`
    );
    const endTime = new Date(
      startTime.getTime() + selectedService.duration * 60000
    );

    try {
      const startTime = new Date(
        `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`
      );
      const endTime = new Date(
        startTime.getTime() + selectedService.duration * 60000
      );

      // Check for existing appointments
      const { data: existingAppointments, error: fetchError } = await supabase
        .from("appointments")
        .select("*")
        .or(`email.eq.${email},phone.eq.${phone}`)
        .gte("start_time", startTime.toISOString())
        .lte("start_time", endTime.toISOString());

      if (fetchError) {
        throw fetchError;
      }

      if (existingAppointments && existingAppointments.length > 0) {
        // Check for time conflicts
        const hasConflict = existingAppointments.some((appointment) => {
          const appointmentStart = new Date(appointment.start_time);
          const appointmentEnd = new Date(appointment.end_time);
          return startTime < appointmentEnd && endTime > appointmentStart;
        });

        if (hasConflict) {
          toast.error(
            "Prepáčte, ale v tomto čase už máte inú rezerváciu. Prosím, vyberte iný termín."
          );
          return;
        }
      }

      // Create the appointment
      const bookingData = {
        email: email,
        phone: phone,
        employee_id: selectedStaff.id,
        service_id: selectedService.id,
        facility_id: selectedFacility.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "scheduled",
        customer_name: customerName,
      };

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert([bookingData])
        .select();

      if (appointmentError) throw appointmentError;

      toast.success(
        `Rezervácia potvrdená pre ${customerName}: ${
          selectedService.name
        } dňa ${format(selectedDate, "dd.MM.yyyy")} o ${selectedTime} u ${
          selectedStaff.users.first_name
        } ${selectedStaff.users.last_name} v prevádzke ${selectedFacility.name}`
      );
      setBookingComplete(true);
      setActiveStep(6);
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error(
        `Chyba pri vytváraní rezervácie. Skúste to znova. Dôvod: ${error.message}`
      );
    }
  }

  const steps = [
    "Služba",
    "Prevádzka",
    "Dátum",
    "Zamestnanec",
    "Čas",
    "Potvrdenie",
  ];

  const ProgressBar = ({ currentStep, totalSteps }) => {
    return (
      <div className="w-full mb-8">
        <div className="relative">
          <div className="overflow-hidden mb-4 h-2 text-xs flex rounded bg-pink-200">
            <div
              style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-pink-500 to-purple-600"
            ></div>
          </div>
          <div className="flex justify-between">
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
        </div>
      </div>
    );
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedFacility(null);
    setSelectedDate(new Date());
    setSelectedTime(null);
    setSelectedStaff(null);
    setActiveStep(0);
    setBookingComplete(false);
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
        v prevádzke {selectedFacility.name}.
      </p>
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <Button
          onClick={resetBooking}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-colors text-lg py-4 px-8 rounded-lg shadow-lg"
        >
          Vytvoriť novú rezerváciu
        </Button>
        <Button
          onClick={() => {
            try {
              const appointmentData = {
                service: selectedService,
                facility: selectedFacility,
                date: format(selectedDate, "yyyy-MM-dd"),
                time: selectedTime,
                staff: selectedStaff,
              };
              downloadICSFile(appointmentData);
            } catch (error) {
              console.error("Error preparing appointment data:", error);
              toast.error(
                "Chyba pri vytváraní kalendárnej udalosti. Skúste to znova."
              );
            }
          }}
          className="bg-white text-pink-600 border border-pink-600 hover:bg-pink-50 transition-colors text-lg py-4 px-8 rounded-lg shadow-lg flex items-center"
        >
          <Calendar className="mr-2" />
          Pridať do kalendára
        </Button>
      </div>
    </motion.div>
  );

  const renderStep = (stepComponent) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {stepComponent}
    </motion.div>
  );

  const renderServiceSelection = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Vyberte službu
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedService?.id === service.id
                  ? "border-pink-500 bg-pink-50"
                  : "hover:border-pink-300"
              }`}
              onClick={() => {
                setSelectedService(service);
                setActiveStep(1);
              }}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">{service.duration} min</Badge>
                  <span className="text-xl font-bold text-pink-600">
                    {service.price}€
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderFacilitySelection = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Vyberte prevádzku
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {facilities.map((facility) => (
          <motion.div
            key={facility.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedFacility?.id === facility.id
                  ? "border-pink-500 bg-pink-50"
                  : "hover:border-pink-300"
              }`}
              onClick={() => {
                setSelectedFacility(facility);
                setActiveStep(2);
              }}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">{facility.name}</h3>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{facility.address}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderDateSelection = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Vyberte dátum
      </h3>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-lg">
          {format(currentWeekStart, "MMMM yyyy", { locale: sk })}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, index) => {
          const date = addDays(currentWeekStart, index);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => {
                  setSelectedDate(date);
                  setActiveStep(3);
                }}
                variant={isSelected ? "default" : "outline"}
                className={`w-full h-24 flex flex-col items-center justify-center p-2 ${
                  isSelected
                    ? "bg-pink-500 text-white"
                    : "hover:bg-pink-100 hover:text-pink-800"
                } transition-colors rounded-lg`}
              >
                <span className="text-xs font-medium">
                  {format(date, "EEE", { locale: sk })}
                </span>
                <span className="text-2xl font-bold mt-1">
                  {format(date, "d")}
                </span>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderStaffSelection = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Vyberte zamestnanca
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <motion.div
            key={employee.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedStaff?.id === employee.id
                  ? "border-pink-500 bg-pink-50"
                  : "hover:border-pink-300"
              }`}
              onClick={() => {
                setSelectedStaff(employee);
                setActiveStep(4);
              }}
            >
              <CardContent className="p-6 flex flex-col items-center">
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarImage
                    src={employee.avatar_url}
                    alt={employee.users.first_name}
                  />
                  <AvatarFallback>
                    {employee.users.first_name[0]}
                    {employee.users.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{`${employee.users.first_name} ${employee.users.last_name}`}</h3>
                <p className="text-sm text-gray-500">{employee.speciality}</p>
                <p className="text-sm font-medium mt-2">
                  Stôl: {employee.table_number || "N/A"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderTimeSelection = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Vyberte čas</h3>
      {isLoadingSlots ? (
        <p>Načítavam dostupné termíny...</p>
      ) : availableSlots.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {availableSlots.map((time) => (
            <motion.div
              key={time}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => {
                  setSelectedTime(time);
                  setActiveStep(5);
                }}
                variant={selectedTime === time ? "default" : "outline"}
                className={`w-full ${
                  selectedTime === time
                    ? "bg-pink-500 text-white"
                    : "hover:bg-pink-100 hover:text-pink-800"
                } transition-colors`}
              >
                {time}
              </Button>
            </motion.div>
          ))}
        </div>
      ) : (
        <p>Žiadne dostupné termíny pre tento deň.</p>
      )}
    </div>
  );

  const renderBookingSummary = () => {
    const staffName =
      selectedStaff && selectedStaff.users
        ? `${selectedStaff.users.first_name} ${selectedStaff.users.last_name}`
        : "N/A";

    return (
      <div className="mt-6 p-6 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg shadow-md">
        <h4 className="text-2xl font-semibold text-gray-800 mb-4">
          Vaša rezervácia
        </h4>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-gray-700">
            <CalendarIcon className="w-6 h-6 text-pink-500" />
            <span className="text-lg">
              {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <ClockIcon className="w-6 h-6 text-pink-500" />
            <span className="text-lg">{selectedTime}</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <User className="w-6 h-6 text-pink-500" />
            <span className="text-lg">{staffName}</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <CheckCircle className="w-6 h-6 text-pink-500" />
            <span className="text-lg">{selectedService.name}</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <MapPin className="w-6 h-6 text-pink-500" />
            <span className="text-lg">{selectedFacility.name}</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <User className="w-6 h-6 text-pink-500" />
            <div className="flex-grow">
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, customerName: true }))
                }
                placeholder="Vaše meno"
                className={
                  touched.customerName && !debouncedCustomerName
                    ? "border-red-500"
                    : ""
                }
              />
              {touched.customerName && !debouncedCustomerName && (
                <p className="text-red-500 text-sm mt-1">
                  Prosím, zadajte vaše meno
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <Mail className="w-6 h-6 text-pink-500" />
            <div className="flex-grow">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="Váš email"
                className={
                  touched.email &&
                  !isValidEmail(debouncedEmail) &&
                  debouncedEmail
                    ? "border-red-500"
                    : ""
                }
              />
              {touched.email &&
                !isValidEmail(debouncedEmail) &&
                debouncedEmail && (
                  <p className="text-red-500 text-sm mt-1">Neplatný email</p>
                )}
            </div>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <Phone className="w-6 h-6 text-pink-500" />
            <div className="flex-grow">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                placeholder="Vaše telefónne číslo"
                className={
                  touched.phone &&
                  !isValidPhone(debouncedPhone) &&
                  debouncedPhone
                    ? "border-red-500"
                    : ""
                }
              />
              {touched.phone &&
                !isValidPhone(debouncedPhone) &&
                debouncedPhone && (
                  <p className="text-red-500 text-sm mt-1">
                    Neplatné telefónne číslo
                  </p>
                )}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <Badge className="bg-purple-500 text-white px-3 py-1">
            {selectedService.duration} minút
          </Badge>
          <span className="text-3xl font-bold text-pink-700">
            {selectedService.price}€
          </span>
        </div>
        <div className="mt-8">
          <Button
            onClick={handleBooking}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-colors text-lg py-6 rounded-lg shadow-lg"
          >
            Potvrdiť rezerváciu
          </Button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeStep) {
      case 0:
        return renderStep(renderServiceSelection());
      case 1:
        return renderStep(renderFacilitySelection());
      case 2:
        return renderStep(renderDateSelection());
      case 3:
        return renderStep(renderStaffSelection());
      case 4:
        return renderStep(renderTimeSelection());
      case 5:
        return renderStep(renderBookingSummary());
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-center" reverseOrder={false} />
      <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
          <CardTitle className="text-3xl font-bold flex items-center">
            <Sparkles className="mr-2" />
            {bookingComplete ? "Rezervácia dokončená" : "Rezervácia termínu"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {!bookingComplete && (
            <ProgressBar currentStep={activeStep} totalSteps={steps.length} />
          )}

          {bookingComplete ? <ThankYouPage /> : renderContent()}

          {activeStep > 0 && activeStep < 5 && !bookingComplete && (
            <div className="mt-8 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              >
                Späť
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
                disabled={
                  (activeStep === 0 && !selectedService) ||
                  (activeStep === 1 && !selectedFacility) ||
                  (activeStep === 2 && !selectedDate) ||
                  (activeStep === 3 && !selectedStaff) ||
                  (activeStep === 4 && !selectedTime)
                }
              >
                Ďalej
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {renderActiveAppointment()}
    </div>
  );
}

export default BookingSystem;
