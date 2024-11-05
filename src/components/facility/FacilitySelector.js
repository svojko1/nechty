import React, { useEffect } from "react";

import { useFacility } from "src/FacilityContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

// UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "src/components/ui/card";
import { Button } from "src/components/ui/button";

const FacilitySelector = () => {
  const {
    facilities,
    selectFacility,
    selectedFacility,
    resetFacility,
    loading,
  } = useFacility();
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
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </CardContent>
      </Card>
    );
  }

  if (selectedFacility) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Aktuálna pobočka
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-lg font-medium text-gray-700">
            {selectedFacility.name}
          </p>
          {selectedFacility.address && (
            <p className="text-center text-sm text-gray-500 mt-2">
              {selectedFacility.address}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={resetFacility}
            variant="outline"
            className="hover:bg-pink-50"
          >
            Zmeniť pobočku
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
            className="w-full h-14 hover:bg-pink-600 transition-colors"
            variant="default"
          >
            <div className="flex flex-col items-center w-full">
              <span className="text-lg">{facility.name}</span>
              {facility.address && (
                <span className="text-sm opacity-90">{facility.address}</span>
              )}
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

export default FacilitySelector;
