import React from "react";

import { motion } from "framer-motion";

// UI Components
import { Card, CardContent } from "src/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "src/components/ui/avatar";

const StaffSelection = ({ employees, selectedStaff, onStaffSelect }) => {
  const allEmployees = [
    { id: "any", name: "Ktokoľvek", table_number: "" },
    ...employees,
  ];

  return (
    <div className="max-w-3xl mx-auto ">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allEmployees.map((staff) => (
          <motion.div
            key={staff.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`cursor-pointer transition-all h-full ${
                selectedStaff?.id === staff.id
                  ? "border-2 border-pink-500 bg-white"
                  : "hover:border-pink-300 bg-white shadow-md"
              }`}
              onClick={() => onStaffSelect(staff)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center py-6 px-4">
                  <div className="mb-3">
                    <Avatar className="w-16 h-16">
                      {staff.id === "any" ? (
                        <AvatarFallback className="text-lg font-medium bg-gray-100">
                          ANY
                        </AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage
                            src={staff.avatar_url}
                            alt={staff.users?.first_name}
                          />
                          <AvatarFallback className="text-lg font-medium bg-gray-100">
                            {`${staff.users?.first_name?.[0]}${staff.users?.last_name?.[0]}`}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                  </div>
                  <h3 className="text-lg font-medium mb-1 text-center">
                    {staff.id === "any"
                      ? "Ktokoľvek"
                      : `${staff.users?.first_name} ${staff.users?.last_name}`}
                  </h3>
                  {staff.id !== "any" && staff.table_number && (
                    <p className="text-sm text-gray-500">
                      Stôl: {staff.table_number}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StaffSelection;
