import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CalendarPlus,
  ArrowLeft,
  Scissors,
  HandMetal,
} from "lucide-react";
import { supabase } from "src/supabaseClient";
import { toast } from "react-hot-toast";

// UI Components
import { Card, CardContent } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";

const NoReservationStep = ({ onWalkIn, onBook, onBack }) => {
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");

      if (error) throw error;

      // Add combined service option
      const combinedService = {
        id: "combined",
        name: "Pedikúra + Manikúra",
        duration: 90, // Example duration
        price: "70", // Example price
        actualServiceId: data.find((s) =>
          s.name.toLowerCase().includes("manikúra")
        )?.id, // Get the actual manikúra service ID
      };

      setServices([...data, combinedService]);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Nepodarilo sa načítať služby");
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    if (service.id === "combined") {
      // Find both services
      const manikuraService = services.find((s) =>
        s.name.toLowerCase().includes("manikúra")
      );
      const pedikuraService = services.find((s) =>
        s.name.toLowerCase().includes("pedikúra")
      );

      // Create a combined service object with both service IDs
      const combinedService = {
        ...service,
        id: manikuraService.id,
        secondaryServiceId: pedikuraService.id,
        name: "Manikúra + Pedikúra",
        isCombined: true,
      };
      onWalkIn(combinedService);
    } else {
      onWalkIn(service);
    }
  };

  if (showServiceSelection) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 text-center">
            Vyberte službu
          </h2>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 md:grid-rows-2">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={
                index === 2
                  ? "md:col-span-2 md:row-start-2" // Bottom item spans two columns on larger screens
                  : "col-span-1" // Each item occupies one column on mobile
              }
            >
              <Card
                className={`cursor-pointer transition-all h-full ${
                  selectedService?.id === service.id
                    ? "border-2 border-pink-500 bg-white"
                    : "hover:border-pink-300 bg-white"
                }`}
                onClick={() => handleServiceSelect(service)}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col items-center py-12 px-6">
                    <div className="flex items-center gap-2 mb-8">
                      <h3 className="text-2xl font-semibold">{service.name}</h3>
                    </div>
                    <div className="flex flex-col items-center space-y-6">
                      <Badge
                        variant="secondary"
                        className="px-4 py-1.5 text-sm font-medium bg-gray-100"
                      >
                        {service.duration} min
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">od</span>
                        <span className="text-4xl font-bold text-pink-500">
                          {service.price}
                        </span>
                        <span className="text-4xl font-bold text-pink-500">
                          €
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 max-w-2xl mx-auto">
      <motion.div
        className="flex-1 aspect-square"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-green-50 transition-colors shadow-lg"
          onClick={() => setShowServiceSelection(true)}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-8">
            <Clock className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-green-700 text-center">
              Chcem ísť hneď
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
          className="h-full cursor-pointer hover:bg-blue-50 transition-colors shadow-lg"
          onClick={onBook}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-8">
            <CalendarPlus className="w-16 h-16 text-blue-500 mb-4" />
            <h3 className="text-2xl font-bold text-blue-700 text-center">
              Objednať sa
            </h3>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default NoReservationStep;
