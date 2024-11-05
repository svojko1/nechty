import React from "react";

import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Clock,
  Calendar,
  User,
  Scissors,
  ArrowLeft,
  CheckCircle,
  Table as TableIcon,
} from "lucide-react";

// UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";

const SearchResultStep = ({
  appointment,
  onCheckIn,
  onBack,
  isLoading = false,
}) => {
  if (!appointment) return null;

  const InfoRow = ({ icon: Icon, label }) => (
    <div className="flex items-center space-x-3 text-gray-700">
      <Icon className="h-5 w-5 text-pink-500 shrink-0" />
      <span>{label}</span>
    </div>
  );

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-center text-pink-700 flex-grow pr-9">
            Detaily rezervácie
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-pink-50 rounded-lg p-6 text-center">
            <p className="text-lg text-pink-600 font-medium mb-2">Váš stôl</p>
            <div className="text-5xl font-bold text-pink-700 mb-2 flex items-center justify-center gap-2">
              <TableIcon className="h-8 w-8" />
              {appointment.table_number || "—"}
            </div>
          </div>

          <div className="space-y-4">
            <InfoRow
              icon={Calendar}
              label={format(new Date(appointment.start_time), "d. MMMM yyyy", {
                locale: sk,
              })}
            />

            <InfoRow
              icon={Clock}
              label={format(new Date(appointment.start_time), "HH:mm")}
            />

            <InfoRow icon={Scissors} label={appointment.service_name} />

            <InfoRow icon={User} label={appointment.employee_name} />

            {appointment.email && (
              <Badge variant="secondary" className="mb-2">
                {appointment.email}
              </Badge>
            )}

            {appointment.phone && (
              <Badge variant="secondary">{appointment.phone}</Badge>
            )}
          </div>

          <Button
            className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white"
            onClick={() => onCheckIn(appointment)}
            disabled={isLoading}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Clock className="h-5 w-5" />
              </motion.div>
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            Potvrdiť check-in
          </Button>

          <p className="text-sm text-gray-500 text-center mt-4">
            Prosím, potvrďte vašu rezerváciu kliknutím na tlačidlo vyššie
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default SearchResultStep;
