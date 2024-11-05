import React, { useEffect } from "react";

import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  Heart,
  CalendarPlus,
  Download,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// UI Components
import { Button } from "src/components/ui/button";
import { Card, CardContent } from "src/components/ui/card";

const ThankYouPage = ({
  customerName,
  selectedDate,
  selectedTime,
  facility,
  onAddToCalendar,
  onBookAnother,
  isKiosk = false,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isKiosk) {
      const timer = setTimeout(() => {
        navigate("/checkin");
      }, 15000); // 15 seconds
      return () => clearTimeout(timer);
    }
  }, [isKiosk, navigate]);

  const formatAppointmentDate = () => {
    if (!selectedDate) return "Invalid date";
    return format(selectedDate, "d. MMMM yyyy", { locale: sk });
  };

  const formatAppointmentTime = () => {
    if (!selectedTime) return "Invalid time";
    try {
      return format(new Date(`2000-01-01T${selectedTime}`), "HH:mm");
    } catch (error) {
      return "Invalid time";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center max-w-2xl mx-auto"
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
          className="inline-block"
        >
          <Heart className="w-24 h-24 text-pink-500" />
        </motion.div>
      </div>

      <Card className="bg-white shadow-xl mb-8">
        <CardContent className="p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Ďakujeme za vašu rezerváciu!
          </h2>

          <p className="text-xl text-gray-600 mb-8">
            {customerName}, tešíme sa na vás{" "}
            <span className="font-semibold">{formatAppointmentDate()}</span> o{" "}
            <span className="font-semibold">{formatAppointmentTime()}</span> v
            prevádzke{" "}
            <span className="font-semibold">{facility?.name || ""}</span>.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <CalendarIcon className="w-5 h-5" />
              <span>{formatAppointmentDate()}</span>
              <ArrowRight className="w-4 h-4" />
              <span>{formatAppointmentTime()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isKiosk && (
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Button
            onClick={onBookAnother}
            className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 
              hover:from-pink-600 hover:to-purple-700 text-white transition-colors 
              text-lg py-4 px-8 rounded-lg shadow-lg"
          >
            <CalendarPlus className="mr-2 h-5 w-5" />
            Rezervovať ďalší termín
          </Button>

          <Button
            onClick={onAddToCalendar}
            variant="outline"
            className="w-full sm:w-auto bg-white text-pink-600 border border-pink-600 
              hover:bg-pink-50 transition-colors text-lg py-4 px-8 rounded-lg shadow-lg
              flex items-center justify-center"
          >
            <Download className="mr-2 h-5 w-5" />
            Pridať do kalendára
          </Button>
        </div>
      )}

      {isKiosk && (
        <div className="mt-8 text-center text-gray-500">
          <p>Táto obrazovka sa automaticky zatvorí za 15 sekúnd</p>
          <div className="mt-2">
            <motion.div
              className="h-1 bg-pink-500 rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 15, ease: "linear" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ThankYouPage;
