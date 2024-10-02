import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { toast, Toaster } from "react-hot-toast";
import {
  Search,
  AlertCircle,
  MapPin,
  Calendar,
  Clock,
  User,
  PlusCircle,
  CheckCircle,
} from "lucide-react";
import Timer from "./Timer";

const CheckIn = () => {
  const [step, setStep] = useState("facility");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFacilities();
    const storedFacility = localStorage.getItem("selectedFacility");
    if (storedFacility) {
      setSelectedFacility(JSON.parse(storedFacility));
      setStep("choice");
    }
  }, []);

  const fetchFacilities = async () => {
    const { data, error } = await supabase.from("facilities").select("*");
    if (error) {
      console.error("Error fetching facilities:", error);
    } else {
      setFacilities(data);
    }
  };

  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
    localStorage.setItem("selectedFacility", JSON.stringify(facility));
    setStep("choice");
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name, duration),
          employees (
            users (first_name, last_name)
          )
        `
        )
        .eq("facility_id", selectedFacility.id)
        .or(`email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order("start_time", { ascending: true })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setSearchResult(data[0]);
        setStep("searchResult");
      } else {
        setError(
          "Rezervácia nebola nájdená. Skontrolujte prosím váš email alebo telefónne číslo."
        );
      }
    } catch (error) {
      console.error("Error searching for appointment:", error);
      setError(
        "Chyba pri vyhľadávaní rezervácie. Skúste to prosím znova neskôr."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      // First, get the current state of the appointment
      const { data: currentAppointment, error: fetchError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", searchResult.id)
        .single();

      if (fetchError) throw fetchError;

      if (currentAppointment.status === "completed") {
        toast.error("Táto rezervácia už bola dokončená.");
        return;
      }

      if (currentAppointment.arrival_time) {
        setActiveAppointment(currentAppointment);
        toast.success("Klient už je prihlásený.");
        setStep("activeAppointment");
        return;
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("appointments")
        .update({ arrival_time: now })
        .eq("id", searchResult.id)
        .select(
          `
        *,
        services (name, duration),
        employees (
          users (first_name, last_name)
        )
      `
        )
        .single();

      if (error) throw error;

      setActiveAppointment(data);
      toast.success("Check-in bol úspešný!");
      setStep("activeAppointment");
    } catch (error) {
      console.error("Error during check-in:", error);
      toast.error("Nepodarilo sa vykonať check-in. Skúste to prosím znova.");
    }
  };

  const refreshAppointmentData = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name, duration),
          employees (
            users (first_name, last_name)
          )
        `
        )
        .eq("id", searchResult.id)
        .single();

      if (error) throw error;

      setSearchResult(data);
      if (data.status === "in_progress") {
        setActiveAppointment(data);
        setStep("activeAppointment");
      }
    } catch (error) {
      console.error("Error refreshing appointment data:", error);
      toast.error(
        "Nepodarilo sa aktualizovať údaje o rezervácii. Prosím, skúste vyhľadať rezerváciu znova."
      );
    }
  };

  const renderFacilitySelection = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {facilities.map((facility) => (
        <motion.div
          key={facility.id}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className="cursor-pointer hover:bg-pink-50 transition-colors shadow-lg"
            onClick={() => handleFacilitySelect(facility)}
          >
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3 text-pink-700">
                {facility.name}
              </h3>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2 text-pink-500" />
                <span>{facility.address}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  const renderChoice = () => (
    <div className="flex flex-col sm:flex-row gap-6 max-w-4xl mx-auto">
      <motion.div
        className="flex-1"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-pink-50 transition-colors shadow-lg"
          onClick={() => navigate("/", { state: { selectedFacility } })}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center h-full">
            <PlusCircle className="w-16 h-16 text-pink-500 mb-4" />
            <h3 className="text-2xl font-bold text-pink-700 text-center">
              Nová rezervácia
            </h3>
            <p className="mt-2 text-gray-600 text-center">
              Vytvorte novú rezerváciu termínu
            </p>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        className="flex-1"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-purple-50 transition-colors shadow-lg"
          onClick={() => setStep("search")}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center h-full">
            <CheckCircle className="w-16 h-16 text-purple-500 mb-4" />
            <h3 className="text-2xl font-bold text-purple-700 text-center">
              Check-in
            </h3>
            <p className="mt-2 text-gray-600 text-center">
              Prihláste sa na existujúcu rezerváciu
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  const renderSearch = () => (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-pink-700">
          Vyhľadať rezerváciu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Zadajte email alebo telefónne číslo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Button
              onClick={handleSearch}
              disabled={isLoading || !searchTerm.trim()}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Search className="h-5 w-5" />
                </motion.div>
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );

  const renderSearchResult = () => (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-pink-700">
          Detaily rezervácie
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-gray-700">
            <Calendar className="h-5 w-5 text-pink-500" />
            <span>
              {format(new Date(searchResult.start_time), "d. MMMM yyyy", {
                locale: sk,
              })}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <Clock className="h-5 w-5 text-pink-500" />
            <span>{format(new Date(searchResult.start_time), "HH:mm")}</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <User className="h-5 w-5 text-pink-500" />
            <span>{`${searchResult.employees.users.first_name} ${searchResult.employees.users.last_name}`}</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <AlertCircle className="h-5 w-5 text-pink-500" />
            <span>{searchResult.services.name}</span>
          </div>
        </div>
        <Button
          className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white"
          onClick={handleCheckIn}
        >
          Potvrdiť check-in
        </Button>
      </CardContent>
    </Card>
  );

  const renderActiveAppointment = () => {
    if (!activeAppointment || !activeAppointment.services) {
      return (
        <Card className="w-full max-w-xl mx-auto shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-pink-700">
              Chyba pri načítaní rezervácie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Nepodarilo sa načítať detaily rezervácie. Skúste to prosím znova.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-full max-w-xl mx-auto shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-pink-700">
            Aktívna rezervácia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Timer
            startTime={
              activeAppointment.arrival_time || activeAppointment.start_time
            }
            duration={activeAppointment.services.duration}
          />
        </CardContent>
      </Card>
    );
  };

  const renderContent = () => {
    switch (step) {
      case "facility":
        return renderFacilitySelection();
      case "choice":
        return renderChoice();
      case "search":
        return renderSearch();
      case "searchResult":
        return renderSearchResult();
      case "activeAppointment":
        return renderActiveAppointment();
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-center" reverseOrder={false} />
      <h1 className="text-4xl font-bold text-center mb-10 text-pink-800">
        Glam Nails Rezervačný Systém
      </h1>
      {selectedFacility && step !== "facility" && (
        <p className="text-center text-lg font-semibold mb-6 text-pink-600">
          Vybraná pobočka: {selectedFacility.name}
        </p>
      )}
      {renderContent()}
      {step !== "facility" && (
        <Button
          onClick={() => setStep("facility")}
          className="mt-8 bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          Zmeniť pobočku
        </Button>
      )}
    </div>
  );
};

export default CheckIn;
