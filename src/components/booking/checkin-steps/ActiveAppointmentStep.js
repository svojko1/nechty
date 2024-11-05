import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { User, Clock, Calendar, Table as TableIcon, Check } from "lucide-react";
import { supabase } from "src/supabaseClient";

// UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";

const ActiveAppointmentStep = ({
  appointment,
  autoCloseDelay = 15000,
  onComplete,
}) => {
  const [employeeDetails, setEmployeeDetails] = useState(null);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (appointment?.employee_id) {
        try {
          const { data, error } = await supabase
            .from("employees")
            .select(
              `
              id,
              table_number,
              users (
                first_name,
                last_name
              )
            `
            )
            .eq("id", appointment.employee_id)
            .single();

          if (error) throw error;
          setEmployeeDetails(data);
        } catch (error) {
          console.error("Error fetching employee details:", error);
        }
      }
    };

    fetchEmployeeDetails();
  }, [appointment?.employee_id]);

  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [onComplete, autoCloseDelay]);

  if (!appointment) return null;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center space-x-2 text-gray-700">
      <Icon className="h-4 w-4 text-pink-400" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-gray-600">{value}</p>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg mt-8 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
        <div className="flex items-center justify-center space-x-2">
          <Check className="h-6 w-6" />
          <CardTitle className="text-2xl font-bold text-center">
            Check-in úspešný
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Table Number - Made Prominent */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-pink-50 rounded-lg p-6 text-center mb-8"
          >
            <p className="text-lg text-pink-600 font-medium mb-2">Váš stôl</p>
            <div className="text-5xl font-bold text-pink-700 mb-2 flex items-center justify-center gap-2">
              <TableIcon className="h-8 w-8" />
              {employeeDetails?.table_number || "—"}
            </div>
            <p className="text-base text-pink-600">
              Prosím, prejdite k tomuto stolu
            </p>
          </motion.div>

          {/* Other Information - Made More Subtle */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-4">
              {/* Employee Info */}
              <InfoRow
                icon={User}
                label="Zamestnanec"
                value={
                  employeeDetails
                    ? `${employeeDetails.users.first_name} ${employeeDetails.users.last_name}`
                    : "Načítava sa..."
                }
              />

              {/* Customer Info */}
              <InfoRow
                icon={User}
                label="Zákazník"
                value={appointment.customer_name || "Neznámy zákazník"}
              />
            </div>

            <div className="space-y-4">
              {/* Date Info */}
              <InfoRow
                icon={Calendar}
                label="Dátum"
                value={format(
                  new Date(appointment.start_time),
                  "d. MMMM yyyy",
                  {
                    locale: sk,
                  }
                )}
              />

              {/* Time Info */}
              <InfoRow
                icon={Clock}
                label="Čas"
                value={`${format(new Date(appointment.start_time), "HH:mm")} - 
                     ${format(new Date(appointment.end_time), "HH:mm")}`}
              />
            </div>
          </div>
        </div>

        {/* Auto-close Timer */}
        <motion.div
          className="mt-6 text-center text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>Táto obrazovka sa automaticky zatvorí za 15 sekúnd</p>
          <motion.div
            className="h-1 bg-pink-500 rounded-full mt-2"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 15, ease: "linear" }}
          />
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default ActiveAppointmentStep;
