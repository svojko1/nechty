import React from "react";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

const CheckInOutButton = ({
  isCheckedIn,
  isLoading,
  onCheckIn,
  onCheckOut,
  checkInTime,
  isApproved,
}) => {
  if (!isApproved) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded-md">
        <p className="font-bold">Neschválený účet</p>
        <p>
          Vaše konto čaká na schválenie administrátorom. Prosím, skontrolujte to
          neskôr.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Clock className="h-6 w-6 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">Pracovná zmena</h3>
            {isCheckedIn && checkInTime && (
              <p className="text-sm text-gray-500">
                Od: {format(new Date(checkInTime), "HH:mm", { locale: sk })}
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
              V práci
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
                  Check Out
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Check In
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
