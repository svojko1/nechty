// src/components/dashboard/employee/CurrentAppointmentCard.js
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import EnhancedAppointmentTimer from "src/components/queue/EnhancedAppointmentTimer";

export const CurrentAppointmentCard = ({
  currentAppointment,
  nextAppointment,
  onFinishAppointment,
  onAppointmentFinished,
  getClientDisplay,
}) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-6 bg-white shadow-xl rounded-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Clock className="mr-2" />
            Aktuálna rezervácia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <EnhancedAppointmentTimer
            appointment={currentAppointment}
            nextAppointment={nextAppointment}
            onAppointmentFinished={onAppointmentFinished}
          />

          {currentAppointment && (
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    Klient:{" "}
                    <span className="text-gray-700">
                      {getClientDisplay(currentAppointment)}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    Služba:{" "}
                    <span className="font-medium">
                      {currentAppointment?.services?.name}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {!currentAppointment && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">
                Momentálne nemáte žiadnu aktívnu rezerváciu
              </p>
              <p className="text-sm mt-2">Nové rezervácie sa zobrazia tu</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CurrentAppointmentCard;
