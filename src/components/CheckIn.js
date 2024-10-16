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
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Search,
  AlertCircle,
  Scissors,
  MapPin,
  Calendar,
  Clock,
  Badge,
  User,
  PlusCircle,
  CheckCircle,
} from "lucide-react";

const CheckIn = () => {
  const [step, setStep] = useState("initial");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const navigate = useNavigate();
  const [isWalkInDialogOpen, setIsWalkInDialogOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInContact, setWalkInContact] = useState("");
  const [queuePosition, setQueuePosition] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    fetchFacilities();
    fetchServices();
    const storedFacility = localStorage.getItem("selectedFacility");
    if (storedFacility) {
      setSelectedFacility(JSON.parse(storedFacility));
      setStep("initial");
    }
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase.from("services").select("*");
      if (error) throw error;
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services");
    }
  };

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
    setStep("initial");
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
            table_number,
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
        const appointment = data[0];
        setSearchResult({
          ...appointment,
          service_name: appointment.services.name,
          employee_name: `${appointment.employees.users.first_name} ${appointment.employees.users.last_name}`,
          table_number: appointment.employees.table_number,
        });
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
            table_number,
            users (first_name, last_name)
          )
        `
        )
        .single();

      if (error) throw error;

      setActiveAppointment({
        ...data,
        service_name: data.services.name,
        employee_name: `${data.employees.users.first_name} ${data.employees.users.last_name}`,
        table_number: data.employees.table_number,
      });
      toast.success("Check-in bol úspešný!");
      setStep("activeAppointment");
    } catch (error) {
      console.error("Error during check-in:", error);
      toast.error("Nepodarilo sa vykonať check-in. Skúste to prosím znova.");
    }
  };

  const renderServiceSelection = () => (
    <Card className="w-full max-w-xl mx-auto shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-pink-700">
          Vyberte službu
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((service) => (
          <Button
            key={service.id}
            onClick={() => handleServiceSelect(service)}
            className="h-24 flex flex-col items-center justify-center text-center p-2"
            variant="outline"
          >
            <span className="font-semibold">{service.name}</span>
            <span className="text-sm text-gray-500">
              {service.duration} min
            </span>
            <span className="text-sm font-medium">{service.price} €</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );

  const handleWalkInClick = () => {
    setStep("selectService");
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setIsWalkInDialogOpen(true);
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    setIsWalkInDialogOpen(false);
    await handleWalkIn(walkInName, walkInContact);
  };

  const handleWalkIn = async (customerName, phoneOrEmail) => {
    setIsLoading(true);
    try {
      // Find an available employee
      const { data: availableEmployee, error: employeeError } = await supabase
        .from("employee_queue")
        .select(
          `
          id,
          employee_id,
          employees (
            id,
            table_number,
            users (first_name, last_name)
          )
        `
        )
        .eq("facility_id", selectedFacility.id)
        .eq("is_active", true)
        .is("current_customer_id", null)
        .order("last_assignment_time", { ascending: true })
        .limit(1)
        .single();

      if (employeeError && employeeError.code !== "PGRST116") {
        throw employeeError;
      }

      if (availableEmployee) {
        const now = new Date();
        const appointmentEnd = new Date(
          now.getTime() + selectedService.duration * 60 * 1000
        );

        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            employee_id: availableEmployee.employee_id,
            facility_id: selectedFacility.id,
            customer_name: customerName,
            email: phoneOrEmail.includes("@") ? phoneOrEmail : null,
            phone: phoneOrEmail.includes("@") ? null : phoneOrEmail,
            start_time: now.toISOString(),
            end_time: appointmentEnd.toISOString(),
            status: "in_progress",
            arrival_time: now.toISOString(),
            service_id: selectedService.id,
          })
          .select(
            `
            *,
            services (name, duration),
            employees (
              table_number,
              users (first_name, last_name)
            )
          `
          )
          .single();

        if (appointmentError) throw appointmentError;

        // Update the employee_queue to show the employee is now busy
        const { error: updateError } = await supabase
          .from("employee_queue")
          .update({
            last_assignment_time: now.toISOString(),
            current_customer_id: appointment.id,
          })
          .eq("id", availableEmployee.id);

        if (updateError) throw updateError;

        setActiveAppointment({
          ...appointment,
          service_name: appointment.services.name,
          employee_name: `${appointment.employees.users.first_name} ${appointment.employees.users.last_name}`,
          table_number: appointment.employees.table_number,
        });

        toast.success(
          "Našli sme pre vás voľného zamestnanca. Prosím, počkajte na ďalšie inštrukcie."
        );
        setStep("activeAppointment");
      } else {
        // Add customer to the queue (this part remains the same)
        const { data: queueData, error: queueError } = await supabase
          .from("customer_queue")
          .insert({
            facility_id: selectedFacility.id,
            customer_name: customerName,
            contact_info: phoneOrEmail,
            status: "waiting",
            service_id: selectedService.id,
          })
          .select()
          .single();

        if (queueError) throw queueError;

        // Get the queue position
        const { count, error: countError } = await supabase
          .from("customer_queue")
          .select("*", { count: "exact" })
          .eq("facility_id", selectedFacility.id)
          .eq("status", "waiting")
          .lte("created_at", queueData.created_at);

        if (countError) throw countError;

        setQueuePosition(count);
        toast.success(
          "Boli ste pridaný do čakacieho radu. Prosím, počkajte na ďalšie inštrukcie."
        );
        setStep("inQueue");
      }
    } catch (error) {
      console.error("Error handling walk-in request:", error);
      toast.error(
        "Nepodarilo sa spracovať vašu žiadosť. Skúste to prosím znova."
      );
    } finally {
      setIsLoading(false);
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

  const renderInQueue = () => (
    <Card className="w-full max-w-xl mx-auto shadow-lg mt-8">
      <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
        <CardTitle className="text-2xl font-bold text-center">
          V čakacom rade
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold">
            Ste v čakacom rade
          </p>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Vaša pozícia v rade</p>
            <p className="text-4xl font-bold text-yellow-600">
              {queuePosition}
            </p>
          </div>
          <p className="text-center text-gray-600">
            Prosím, počkajte kým vás zavoláme. Odhadovaný čas čakania je
            približne {queuePosition * 15} minút.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderInitialChoice = () => (
    <div className="flex flex-col sm:flex-row gap-6 max-w-4xl mx-auto">
      <motion.div
        className="flex-1"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-pink-50 transition-colors shadow-lg"
          onClick={() => setStep("search")}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center h-full">
            <Calendar className="w-16 h-16 text-pink-500 mb-4" />
            <h3 className="text-2xl font-bold text-pink-700 text-center">
              Mám rezerváciu
            </h3>
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
          onClick={() => setStep("noReservation")}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center h-full">
            <User className="w-16 h-16 text-purple-500 mb-4" />
            <h3 className="text-2xl font-bold text-purple-700 text-center">
              Nemám rezerváciu
            </h3>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  const renderNoReservationChoice = () => (
    <div className="flex flex-col sm:flex-row gap-6 max-w-4xl mx-auto">
      <motion.div
        className="flex-1"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-green-50 transition-colors shadow-lg"
          onClick={handleWalkInClick}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center h-full">
            <Clock className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-green-700 text-center">
              Chcem ísť hneď
            </h3>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        className="flex-1"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className="h-full cursor-pointer hover:bg-blue-50 transition-colors shadow-lg"
          onClick={() => navigate("/")}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center h-full">
            <PlusCircle className="w-16 h-16 text-blue-500 mb-4" />
            <h3 className="text-2xl font-bold text-blue-700 text-center">
              Objednať sa
            </h3>
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
    if (!activeAppointment) return null;

    return (
      <Card className="w-full max-w-xl mx-auto shadow-lg mt-8 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
          <CardTitle className="text-2xl font-bold text-center">
            Aktívna rezervácia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <Badge className="text-lg px-3 py-1 bg-green-500 text-white">
                Aktívna
              </Badge>
            </div>

            <div className="bg-pink-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-500">Zákazník</p>
                  <p className="font-semibold">
                    {activeAppointment.customer_name || "Neznámy zákazník"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Scissors className="h-6 w-6 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-500">Služba</p>
                  <p className="font-semibold">
                    {activeAppointment.service_name || "Neznáma služba"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-500">Zamestnanec</p>
                  <p className="font-semibold">
                    {activeAppointment.employee_name || "Nepriradený"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="h-6 w-6 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-500">Stôl číslo</p>
                  <p className="font-semibold text-2xl">
                    {activeAppointment.table_number || "Neznámy"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-500">Dátum</p>
                  <p className="font-semibold">
                    {format(
                      new Date(activeAppointment.start_time),
                      "d. MMMM yyyy",
                      { locale: sk }
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-500">Čas</p>
                  <p className="font-semibold">
                    {format(new Date(activeAppointment.start_time), "HH:mm", {
                      locale: sk,
                    })}{" "}
                    -
                    {format(new Date(activeAppointment.end_time), "HH:mm", {
                      locale: sk,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                Prosím, prejdite k stolu číslo{" "}
                <span className="font-bold text-pink-600">
                  {activeAppointment.table_number || "Neznámy"}
                </span>
              </p>
              <p className="text-gray-500 mt-2">
                Váš kaderník {activeAppointment.employee_name || "Nepriradený"}{" "}
                vás tam bude čakať.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderWalkInDialog = () => (
    <Dialog open={isWalkInDialogOpen} onOpenChange={setIsWalkInDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Zadajte vaše údaje</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleWalkInSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Meno
              </Label>
              <Input
                id="name"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right">
                Telefón/Email
              </Label>
              <Input
                id="contact"
                value={walkInContact}
                onChange={(e) => setWalkInContact(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Potvrdiť</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const renderWalkInConfirmation = () => (
    <Card className="w-full max-w-xl mx-auto shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-green-700">
          Žiadosť prijatá
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold">
            Váš požiadavok bol zaznamenaný
          </p>
          <p className="text-center">
            Prosím, počkajte na ďalšie inštrukcie od personálu. Budeme sa vám
            venovať čo najskôr.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (step) {
      case "facility":
        return renderFacilitySelection();
      case "initial":
        return renderInitialChoice();
      case "search":
        return renderSearch();
      case "searchResult":
        return renderSearchResult();
      case "activeAppointment":
        return renderActiveAppointment();
      case "noReservation":
        return renderNoReservationChoice();
      case "selectService":
        return renderServiceSelection();
      case "walkInConfirmation":
        return renderWalkInConfirmation();
      case "inQueue":
        return renderInQueue();
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-center" reverseOrder={false} />
      <h1 className="text-4xl font-bold text-center mb-10 text-pink-800">
        Nail Bar Rezervačný Systém
      </h1>
      {selectedFacility && step !== "facility" && (
        <p className="text-center text-lg font-semibold mb-6 text-pink-600">
          Vybraná pobočka: {selectedFacility.name}
        </p>
      )}
      {renderContent()}

      {renderWalkInDialog()}
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
