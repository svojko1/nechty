import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { useFacility } from "../FacilityContext";

const FacilitySelector = () => {
  const { facilities, selectFacility, selectedFacility, resetFacility } =
    useFacility();

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
          <Button onClick={resetFacility} variant="outline">
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
          Select Facility
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {facilities.map((facility) => (
          <Button
            key={facility.id}
            onClick={() => selectFacility(facility)}
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
