import React from "react";

import { motion } from "framer-motion";

// UI Components
import { Card, CardContent } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";

const ServiceSelection = ({ services, selectedService, onServiceSelect }) => {
  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {services.map((service) => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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
                  <h3 className="text-2xl font-semibold mb-8">
                    {service.name}
                  </h3>
                  <div className="flex flex-col items-center space-y-6">
                    <Badge
                      variant="secondary"
                      className="px-4 py-1.5 text-sm font-medium bg-gray-100"
                    >
                      30-60 min
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
