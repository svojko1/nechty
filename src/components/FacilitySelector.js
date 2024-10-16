import React, { useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { useFacility } from "../FacilityContext";
import { useNavigate, useLocation } from "react-router-dom";

const FacilitySelector = () => {
  const { facilities, selectFacility, selectedFacility, resetFacility } =
    useFacility();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (selectedFacility) {
      const nextPath = location.pathname === "/checkin" ? "/checkin" : "/";
      navigate(nextPath);
    }
  }, [selectedFacility, navigate, location.pathname]);

  const handleSelectFacility = (facility) => {
    selectFacility(facility);
    localStorage.setItem("selectedFacility", JSON.stringify(facility));
  };

  const handleResetFacility = () => {
    resetFacility();
    localStorage.removeItem("selectedFacility");
  };

  if (selectedFacility) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Current Facility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-lg">{selectedFacility.name}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleResetFacility} variant="outline">
            Change Facility
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Vyberte pobočku
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {facilities.map((facility) => (
          <Button
            key={facility.id}
            onClick={() => handleSelectFacility(facility)}
            className="w-full"
          >
            {facility.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default FacilitySelector;
