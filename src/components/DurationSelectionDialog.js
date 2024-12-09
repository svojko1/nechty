import React, { useState } from "react";
import { Clock, ChevronRight } from "lucide-react";
import { supabase } from "src/supabaseClient";

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
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "custom", label: "Custom duration" },
];

const DurationSelectionDialog = ({
  isOpen,
  onClose,
  appointmentId,
  onDurationSet,
  defaultDuration = "30",
}) => {
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
            Set Appointment Duration
          </DialogTitle>
          <DialogDescription>
            Choose how long the appointment will take
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Select
            value={isCustomDuration ? "custom" : duration}
            onValueChange={handleDurationChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATION_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
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
                placeholder="Enter duration in minutes"
                className="flex-1"
                min="1"
                max="240"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !duration || isNaN(parseInt(duration))}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Set Duration</span>
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
