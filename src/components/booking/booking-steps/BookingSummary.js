import React from "react";

import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";

// UI Components
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Badge } from "src/components/ui/badge";
import { Card, CardContent } from "src/components/ui/card";

const SummaryItem = ({ icon: Icon, children }) => (
  <div className="flex items-center space-x-2">
    <Icon className="w-5 h-5 text-pink-500" />
    <span>{children}</span>
  </div>
);

const BookingSummary = ({
  selectedService,
  selectedStaff,
  selectedDate,
  selectedTime,
  facility,
  customerName,
  email,
  phone,
  onCustomerNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
  isSubmitting = false,
}) => {
  const getStaffName = () => {
    if (selectedStaff.id === "any") {
      return "Prvý dostupný zamestnanec";
    }
    return `${selectedStaff.users.first_name} ${selectedStaff.users.last_name}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6  mx-auto"
    >
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">
        Zhrnutie rezervácie
      </h3>

      <Card className="bg-white ">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Appointment Details */}
            <div className="space-y-4">
              <SummaryItem icon={CalendarIcon}>
                {format(selectedDate, "d. MMMM yyyy", { locale: sk })}
              </SummaryItem>
              <SummaryItem icon={Clock}>
                {format(new Date(`2000-01-01T${selectedTime}`), "HH:mm")}
              </SummaryItem>
              <SummaryItem icon={User}>{getStaffName()}</SummaryItem>
            </div>

            {/* Right Column - Service Details */}
            <div className="space-y-4">
              <SummaryItem icon={CheckCircle}>
                {selectedService.name}
              </SummaryItem>
              <SummaryItem icon={MapPin}>{facility.name}</SummaryItem>
              <Badge className="bg-purple-500 text-white">
                {selectedService.duration} min
              </Badge>
            </div>
          </div>
          {/* Contact Form */}

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Vaše meno *"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Váš email *"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="Vaše telefónne číslo (voliteľné)"
                className="w-full"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 
              hover:from-pink-600 hover:to-purple-700 text-white transition-colors 
              text-lg py-6 rounded-lg shadow-lg"
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              "Potvrdiť rezerváciu"
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BookingSummary;
