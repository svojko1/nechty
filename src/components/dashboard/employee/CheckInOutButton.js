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
  const dateLocale = currentLanguage === "vi" ? vi : sk;

  if (!isApproved) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-4">
        <p className="font-bold">{t("checkInOut.unapprovedAccount")}</p>
        <p className="text-sm">{t("checkInOut.waitingForApproval")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="bg-pink-100 p-3 rounded-full">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base">
              {t("checkInOut.workShift")}
            </h3>
            {isCheckedIn && checkInTime && (
              <p className="text-xs sm:text-sm text-gray-500">
                {t("checkInOut.from")}:{" "}
                {format(new Date(checkInTime), "HH:mm", { locale: dateLocale })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {isCheckedIn && (
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 border border-green-200 text-xs sm:text-sm px-2 py-1"
            >
              {t("checkInOut.atWork")}
            </Badge>
          )}

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto"
          >
            <Button
              onClick={isCheckedIn ? onCheckOut : onCheckIn}
              className={`w-full sm:w-auto min-w-[10px] ${
                isCheckedIn
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white text-sm sm:text-base py-2 sm:py-4 px-4 sm:px-6`}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : isCheckedIn ? (
                <>
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {t("checkInOut.checkOut")}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
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
