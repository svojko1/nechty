import React, { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { sk } from "date-fns/locale";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Toaster, toast } from "react-hot-toast";
import {
  CalendarIcon,
  ClockIcon,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  User,
  CheckCircle,
  Heart,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const services = [
  { id: 1, name: "Manikúra", duration: 60, price: 25 },
  { id: 2, name: "Pedikúra", duration: 60, price: 30 },
  { id: 3, name: "Gélové nechty", duration: 90, price: 40 },
  { id: 4, name: "Akrylové nechty", duration: 90, price: 45 },
];

const timeSlots = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

const staff = [
  { id: 1, name: "Jana", avatar: "/jana.jpg", speciality: "Manikúra" },
  { id: 2, name: "Eva", avatar: "/eva.jpg", speciality: "Pedikúra" },
  { id: 3, name: "Zuzana", avatar: "/zuzana.jpg", speciality: "Gélové nechty" },
];

const unavailableSlots = [
  { date: "2024-08-14", time: "11:00", staffId: 1 },
  { date: "2024-08-14", time: "14:00", staffId: 2 },
  { date: "2024-08-15", time: "10:00", staffId: 3 },
  { date: "2024-08-16", time: "15:00", staffId: 1 },
];

function BookingSystem() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [bookingComplete, setBookingComplete] = useState(false);

  useEffect(() => {
    setSelectedTime(null);
    setSelectedStaff(null);
  }, [selectedDate, selectedService]);

  const steps = ["Služba", "Dátum", "Zamestnanec", "Čas", "Potvrdenie"];

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

  const handleBooking = () => {
    if (selectedService && selectedDate && selectedTime && selectedStaff) {
      toast.success(
        `Rezervácia potvrdená: ${selectedService.name} dňa ${format(
          selectedDate,
          "dd.MM.yyyy"
        )} o ${selectedTime} u ${selectedStaff.name}`,
        {
          icon: "✅",
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        }
      );
      setBookingComplete(true);
      setActiveStep(5); // Move to the thank you step
    } else {
      toast.error("Prosím vyplňte všetky potrebné informácie.", {
        icon: "❌",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
    }
  };

  const resetBooking = () => {
    setSelectedService(null);
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
        Tešíme sa na vás {format(selectedDate, "d. MMMM yyyy", { locale: sk })}{" "}
        o {selectedTime}.
      </p>
      <Button
        onClick={resetBooking}
        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-colors text-lg py-4 px-8 rounded-lg shadow-lg"
      >
        Vytvoriť novú rezerváciu
      </Button>
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
                  setActiveStep(2);
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
        {staff.map((member) => (
          <motion.div
            key={member.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedStaff?.id === member.id
                  ? "border-pink-500 bg-pink-50"
                  : "hover:border-pink-300"
              }`}
              onClick={() => {
                setSelectedStaff(member);
                setActiveStep(3);
              }}
            >
              <CardContent className="p-6 flex flex-col items-center">
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name[0]}</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-sm text-gray-500">{member.speciality}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const isSlotUnavailable = (date, time, staffId) => {
    return unavailableSlots.some(
      (slot) =>
        slot.date === format(date, "yyyy-MM-dd") &&
        slot.time === time &&
        slot.staffId === staffId
    );
  };

  const renderTimeSelection = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Vyberte čas</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {timeSlots.map((time) => (
          <motion.div
            key={time}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => {
                setSelectedTime(time);
                setActiveStep(4);
              }}
              variant={selectedTime === time ? "default" : "outline"}
              className={`w-full ${
                selectedTime === time
                  ? "bg-pink-500 text-white"
                  : "hover:bg-pink-100 hover:text-pink-800"
              } transition-colors`}
              disabled={
                !selectedStaff ||
                isSlotUnavailable(selectedDate, time, selectedStaff.id)
              }
            >
              {time}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderBookingSummary = () => (
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
          <span className="text-lg">{selectedStaff.name}</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-700">
          <CheckCircle className="w-6 h-6 text-pink-500" />
          <span className="text-lg">{selectedService.name}</span>
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

  const renderContent = () => {
    switch (activeStep) {
      case 0:
        return renderStep(renderServiceSelection());
      case 1:
        return renderStep(renderDateSelection());
      case 2:
        return renderStep(renderStaffSelection());
      case 3:
        return renderStep(renderTimeSelection());
      case 4:
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

          {activeStep > 0 && activeStep < 4 && !bookingComplete && (
            <div className="mt-8 flex justify-between">
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
                  (activeStep === 1 && !selectedDate) ||
                  (activeStep === 2 && !selectedStaff) ||
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
