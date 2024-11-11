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
import { useLanguage } from "src/components/contexts/LanguageContext";
import { format, isToday } from "date-fns";
import { sk, vi } from "date-fns/locale";
import EnhancedAppointmentTimer from "src/components/queue/EnhancedAppointmentTimer";

export const CurrentAppointmentCard = ({
  currentAppointment,
  nextAppointment,
  onFinishAppointment,
  onAppointmentFinished,
  getClientDisplay,
}) => {
  const { currentLanguage, t } = useLanguage();
  const dateLocale = currentLanguage === "vi" ? vi : sk;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const formatAppointmentDate = (date) => {
    if (!date) return t("currentAppointment.invalidDate");
    if (isToday(new Date(date))) {
      return t("currentAppointment.today");
    }
    return format(new Date(date), "d. MMMM yyyy", { locale: dateLocale });
  };

  const formatAppointmentTime = (time) => {
    if (!time) return t("currentAppointment.invalidTime");
    try {
      return format(new Date(time), "HH:mm", { locale: dateLocale });
    } catch (error) {
      return t("currentAppointment.invalidTime");
    }
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
            {t("currentAppointment.title")}
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
                    {t("currentAppointment.client")}:{" "}
                    <span className="text-gray-700">
                      {getClientDisplay(currentAppointment)}
                    </span>
                  </p>
                  <p className="text-gray-600">
                    {t("currentAppointment.service")}:{" "}
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
                {t("currentAppointment.noActiveAppointment")}
              </p>
              <p className="text-sm mt-2">
                {t("currentAppointment.newAppointmentsNotice")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CurrentAppointmentCard;
