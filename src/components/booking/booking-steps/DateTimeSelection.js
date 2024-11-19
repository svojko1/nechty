import React from "react";
import { format, isBefore, startOfDay, addMinutes } from "date-fns";
import { sk } from "date-fns/locale";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";

import { Button } from "src/components/ui/button";
import { Calendar } from "src/components/ui/calendar";
import { Card, CardContent } from "src/components/ui/card";

const BOOKING_BUFFER_MINUTES = 30;

const TimeSlot = ({ time, isSelected, onSelect }) => (
  <Button
    onClick={() => onSelect(time)}
    variant={isSelected ? "default" : "outline"}
    className={`w-full ${
      isSelected
        ? "bg-pink-500 text-white"
        : "hover:bg-pink-100 hover:text-pink-800"
    }`}
  >
    {time}
  </Button>
);

const TimeSelection = ({
  availableSlots,
  selectedTime,
  onTimeSelect,
  isLoadingSlots,
  selectedDate,
}) => {
  const now = new Date();
  const bufferTime = addMinutes(now, BOOKING_BUFFER_MINUTES);
  const isToday =
    startOfDay(selectedDate).getTime() === startOfDay(now).getTime();

  const filteredSlots = isToday
    ? availableSlots.filter((slot) => {
        const [hours, minutes] = slot.split(":").map(Number);
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hours, minutes, 0, 0);
        return slotTime > bufferTime;
      })
    : availableSlots;

  if (isLoadingSlots) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (filteredSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 text-lg">
          Žiadne dostupné termíny pre tento deň.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {filteredSlots.map((time) => (
        <TimeSlot
          key={time}
          time={time}
          isSelected={selectedTime === time}
          onSelect={() => onTimeSelect(time)}
        />
      ))}
    </div>
  );
};

const DateTimeSelection = ({
  selectedDate,
  selectedTime,
  availableSlots,
  isLoadingSlots,
  onDateSelect,
  onTimeSelect,
}) => {
  // Ensure there's always a selected date
  const defaultDate = selectedDate || new Date();

  const disabledDates = (date) => {
    return isBefore(date, startOfDay(new Date()));
  };

  // Modified date selection handler to prevent deselection
  const handleDateSelect = (date) => {
    // If date is null or undefined, keep the current selection
    if (!date) {
      return;
    }
    onDateSelect(date);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-white shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Date Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-pink-500" />
                <h3 className="text-lg font-semibold">Vyberte dátum</h3>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Calendar
                  mode="single"
                  selected={defaultDate}
                  onSelect={handleDateSelect}
                  disabled={disabledDates}
                  className="rounded-md border"
                  locale={sk}
                  required
                />
              </motion.div>
            </div>

            {/* Time Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-pink-500" />
                <h3 className="text-lg font-semibold">Vyberte čas</h3>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <TimeSelection
                  availableSlots={availableSlots}
                  selectedTime={selectedTime}
                  onTimeSelect={onTimeSelect}
                  isLoadingSlots={isLoadingSlots}
                  selectedDate={defaultDate}
                />
              </motion.div>
              <p className="text-sm text-gray-500 mt-4">
                Vybraný deň:{" "}
                {format(defaultDate, "d. MMMM yyyy", { locale: sk })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DateTimeSelection;
