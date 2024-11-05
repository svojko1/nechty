import React from "react";
import { motion } from "framer-motion";
import { Calendar, User } from "lucide-react";

// UI Components
import { Card, CardContent } from "src/components/ui/card";

const InitialStep = ({ onNext }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-6 max-w-2xl mx-auto">
      <motion.div
        className="flex-1 aspect-square"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-pink-50 transition-colors shadow-lg"
          onClick={() => onNext("search")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-8">
            <Calendar className="w-16 h-16 text-pink-500 mb-4" />
            <h3 className="text-2xl font-bold text-pink-700 text-center">
              Mám rezerváciu
            </h3>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="flex-1 aspect-square"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-purple-50 transition-colors shadow-lg"
          onClick={() => onNext("noReservation")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-8">
            <User className="w-16 h-16 text-purple-500 mb-4" />
            <h3 className="text-2xl font-bold text-purple-700 text-center">
              Nemám rezerváciu
            </h3>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default InitialStep;
