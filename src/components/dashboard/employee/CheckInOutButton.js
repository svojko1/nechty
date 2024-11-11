import React from "react";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sk, vi } from "date-fns/locale";
import { useLanguage } from "src/components/contexts/LanguageContext";

const CheckInOutButton = ({
  isCheckedIn,
  isLoading,
  onCheckIn,
  onCheckOut,
  checkInTime,
  isApproved,
}) => {
  const { currentLanguage, t } = useLanguage();

  // Select locale based on current language
  const dateLocale = currentLanguage === "vi" ? vi : sk;

  if (!isApproved) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded-md">
        <p className="font-bold">{t("checkInOut.unapprovedAccount")}</p>
        <p>{t("checkInOut.waitingForApproval")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Clock className="h-6 w-6 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">
              {t("checkInOut.workShift")}
            </h3>
            {isCheckedIn && checkInTime && (
              <p className="text-sm text-gray-500">
                {t("checkInOut.from")}:{" "}
                {format(new Date(checkInTime), "HH:mm", { locale: dateLocale })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isCheckedIn && (
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 border border-green-200"
            >
              {t("checkInOut.atWork")}
            </Badge>
          )}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={isCheckedIn ? onCheckOut : onCheckIn}
              className={`min-w-[120px] ${
                isCheckedIn
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white`}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isCheckedIn ? (
                <>
                  <LogOut className="h-5 w-5 mr-2" />
                  {t("checkInOut.checkOut")}
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  {t("checkInOut.checkIn")}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CheckInOutButton;
