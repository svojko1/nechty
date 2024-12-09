import React from "react";
import { motion } from "framer-motion";
import { Scissors, HandMetal } from "lucide-react";

// UI Components
import { Card, CardContent } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";

const ServiceSelection = ({ services, selectedService, onServiceSelect }) => {
  // Add combined service
  const combinedService = {
    id: "combined",
    name: "Manikúra + Pedikúra",
    duration: "90",
    price: "70",
    isCombined: true,
    actualServices: [
      services.find((s) => s.name.toLowerCase().includes("manikúra")),
      services.find((s) => s.name.toLowerCase().includes("pedikúra")),
    ],
  };

  const allServices = [...services, combinedService];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 md:grid-rows-2">
        {allServices.map((service, index) => (
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
              onClick={() => onServiceSelect(service)}
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
};

export default ServiceSelection;
