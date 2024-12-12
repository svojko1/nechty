import React, { useState } from "react";
import { Clock, ChevronRight } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "./contexts/LanguageContext";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

const DURATION_PRESETS = [
  { value: "15", duration: 15 },
  { value: "30", duration: 30 },
  { value: "45", duration: 45 },
  { value: "60", duration: 60 },
  { value: "90", duration: 90 },
  { value: "custom", duration: null },
];

const DurationSelectionDialog = ({
  isOpen,
  onClose,
  appointmentId,
  onDurationSet,
  defaultDuration = "30",
}) => {
  const { t } = useLanguage();

  const [duration, setDuration] = useState(defaultDuration);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDurationChange = (value) => {
    if (value === "custom") {
      setIsCustomDuration(true);
      setDuration("");
    } else {
      setIsCustomDuration(false);
      setDuration(value);
    }
  };

  const handleSubmit = async () => {
    if (!duration || isNaN(parseInt(duration))) {
      return;
    }

    setIsLoading(true);
    try {
      // Get the appointment's start time
      const { data: appointment, error: fetchError } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("id", appointmentId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new end time based on duration
      const startTime = new Date(appointment.start_time);
      const endTime = new Date(
        startTime.getTime() + parseInt(duration) * 60000
      );

      // Update the appointment with new duration and end time
      const { data, error } = await supabase
        .from("appointments")
        .update({
          duration: parseInt(duration),
          end_time: endTime.toISOString(),
        })
        .eq("id", appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Call the success callback with updated appointment
      if (onDurationSet) {
        onDurationSet(data);
      }

      onClose();
    } catch (error) {
      console.error("Error setting appointment duration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("currentAppointment.duration")}
          </DialogTitle>
          <DialogDescription>
            {t("currentAppointment.selectDuration")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Select
            value={isCustomDuration ? "custom" : duration}
            onValueChange={handleDurationChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={t("currentAppointment.selectDuration")}
              />
            </SelectTrigger>
            <SelectContent>
              {DURATION_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.value === "custom"
                    ? t("currentAppointment.customDuration")
                    : `${preset.duration} ${t("currentAppointment.minutes")}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isCustomDuration && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder={t("currentAppointment.enterDuration")}
                className="flex-1"
                min="1"
                max="240"
              />
              <span className="text-sm text-gray-500">
                {t("currentAppointment.minutes")}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("timer.dialog.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !duration || isNaN(parseInt(duration))}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{t("timer.saving")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{t("timer.dialog.confirm")}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DurationSelectionDialog;
