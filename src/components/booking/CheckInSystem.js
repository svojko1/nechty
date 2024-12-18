import React, { useState, useEffect } from "react";

import { startOfDay } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { supabase } from "src/supabaseClient";

// Import utility functions
import { processCustomerArrival } from "src/utils/employeeAvailability";
import { generateComboId } from "src/utils/comboUtils";

// Import steps
import InitialStep from "src/components/booking/checkin-steps/InitialStep";
import SearchStep from "src/components/booking/checkin-steps/SearchStep";
import SearchResultStep from "src/components/booking/checkin-steps/SearchResultStep";
import NoReservationStep from "src/components/booking/checkin-steps/NoReservationStep";
import ActiveAppointmentStep from "src/components/booking/checkin-steps/ActiveAppointmentStep";
import InQueueStep from "src/components/booking/checkin-steps/InQueueStep";

// Import components
import WalkInDialog from "src/components/booking/WalkInDialog";
import { useFacility } from "src/FacilityContext";
import FacilitySelector from "src/components/facility/FacilitySelector";

const CheckIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState("initial");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWalkInDialogOpen, setIsWalkInDialogOpen] = useState(false);
  const [queuePosition, setQueuePosition] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const { selectedFacility, resetFacility } = useFacility();

  useEffect(() => {
    if (selectedFacility) {
      setStep("initial");
    } else {
      setStep("facility");
    }
  }, [selectedFacility]);

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const now = new Date();
      const startOfToday = startOfDay(now);

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
        .gte("start_time", startOfToday.toISOString())
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

      // Start a Supabase transaction
      const client = await supabase.rpc("begin_transaction");

      try {
        // First, update the main appointment
        const { data, error: appointmentError } = await supabase
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

        if (appointmentError) throw appointmentError;

        // Update employee queue for the main appointment
        const { error: queueError } = await supabase
          .from("employee_queue")
          .update({
            current_customer_id: data.id,
            last_assignment_time: now,
          })
          .eq("employee_id", data.employee_id);

        if (queueError) throw queueError;

        await supabase.rpc("commit_transaction");

        setSearchResult({
          ...data,
          service_name: data.services.name,
          employee_name: `${data.employees.users.first_name} ${data.employees.users.last_name}`,
          table_number: data.employees.table_number,
        });

        // Show different success messages based on whether it's a combo
        toast.success(
          data.is_combo
            ? "Check-in úspešný! Pedikúra bola pridaná do čakajúceho radu."
            : "Check-in bol úspešný!"
        );

        setStep("activeAppointment");
      } catch (error) {
        await supabase.rpc("rollback_transaction");
        throw error;
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      toast.error("Nepodarilo sa vykonať check-in. Skúste to prosím znova.");
    }
  };

  const handleWalkIn = (service) => {
    setSelectedService(service);
    setIsWalkInDialogOpen(true);
  };

  const handleBookAppointment = () => {
    navigate("/");
  };

  const handleWalkInSubmit = async (customerData) => {
    console.log("Received customer data:", customerData); // Check received data

    setIsLoading(true);
    try {
      // Base data for services
      const baseData = {
        customer_name: customerData.customer_name,
        email: customerData.email,
        phone: customerData.phone,
        facility_id: selectedFacility.id,
      };

      if (selectedService.isCombined) {
        // Generate combo ID first - just like in QueueTester.js
        const comboId = generateComboId(); // Import this from comboUtils.js

        // Handle combined Manikura + Pedikura service
        const manikuraData = {
          ...baseData,
          service_id: selectedService.id,
          is_combo: true, // Add this
          combo_id: comboId, // Add this
        };

        // First process manikura
        const manikuraResult = await processCustomerArrival(
          manikuraData,
          selectedFacility.id
        );

        if (!manikuraResult || manikuraResult.type === "ERROR") {
          throw new Error(
            manikuraResult?.error || "Failed to process manikura service"
          );
        }

        // // Queue entry for pedicure - now with combo info
        // const { data: queueEntry, error: queueError } = await supabase
        //   .from("customer_queue")
        //   .insert({
        //     ...baseData,
        //     service_id: selectedService.secondaryServiceId,
        //     status: "waiting",
        //     is_combo: true, // Add this
        //     combo_id: comboId, // Add this
        //   })
        //   .select()
        //   .single();

        // if (queueError) throw queueError;

        // Handle the combined result based on manikura's status
        switch (manikuraResult.type) {
          case "IMMEDIATE_ASSIGNMENT":
            setSearchResult(manikuraResult.data);
            setStep("activeAppointment");
            toast.success(
              "Manikúra bola vytvorená okamžite a pedikúra pridaná do radu!"
            );
            break;

          case "ADDED_TO_QUEUE":
            setQueuePosition(manikuraResult.data.queue_position);
            setStep("inQueue");
            toast.success("Obe služby boli pridané do čakajúceho radu!");
            break;

          default:
            throw new Error(`Unexpected result type: ${manikuraResult.type}`);
        }
      } else {
        // Handle single service
        const walkInData = {
          ...baseData,
          service_id: selectedService.id,
        };

        console.log("Walkin data: ", walkInData);
        const result = await processCustomerArrival(
          walkInData,
          selectedFacility.id
        );

        console.log("Process result:", result); // Check result

        if (!result || result.type === "ERROR") {
          throw new Error(result?.error || "Failed to process service");
        }

        switch (result.type) {
          case "IMMEDIATE_ASSIGNMENT":
            setSearchResult(result.data);
            setStep("activeAppointment");
            toast.success("Vytvorená okamžitá rezervácia!");
            break;

          case "ADDED_TO_QUEUE":
            setQueuePosition(result.data.queue_position);
            setStep("inQueue");
            toast.success("Pridané do čakajúceho radu!");
            break;

          default:
            throw new Error(`Unknown result type: ${result.type}`);
        }
      }
    } catch (error) {
      console.error("Error processing walk-in:", error);
      toast.error(
        error.message || "Nepodarilo sa spracovať požiadavku. Skúste to znova."
      );
    } finally {
      setIsLoading(false);
      setIsWalkInDialogOpen(false);
    }
  };

  const handleCheckInComplete = () => {
    setStep("initial");
    setSearchTerm("");
    setSearchResult(null);

    const isKiosk = localStorage.getItem("kiosk-mode") === "true";
    if (isKiosk) {
      navigate("/checkin");
      window.location.reload();
    }
  };

  const renderContent = () => {
    switch (step) {
      case "facility":
        return <FacilitySelector />;

      case "initial":
        return <InitialStep onNext={setStep} />;

      case "search":
        return (
          <SearchStep
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearch={handleSearch}
            onBack={() => setStep("initial")}
            isLoading={isLoading}
            error={error}
          />
        );

      case "searchResult":
        return (
          <SearchResultStep
            appointment={searchResult}
            onCheckIn={handleCheckIn}
            onBack={() => setStep("search")}
            isLoading={isLoading}
          />
        );

      case "activeAppointment":
        return (
          <ActiveAppointmentStep
            appointment={searchResult}
            onComplete={handleCheckInComplete}
          />
        );

      case "noReservation":
        return (
          <NoReservationStep
            onWalkIn={handleWalkIn}
            onBook={handleBookAppointment}
            onBack={() => setStep("initial")}
          />
        );

      case "inQueue":
        return (
          <InQueueStep
            queuePosition={queuePosition}
            facilityId={selectedFacility.id}
            onComplete={handleCheckInComplete}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-10 text-pink-800">
        Nail Bar Rezervačný Systém
      </h1>
      {selectedFacility && step !== "facility" && (
        <p className="text-center text-lg font-semibold mb-6 text-pink-600">
          Vybraná pobočka: {selectedFacility.name}
        </p>
      )}
      {renderContent()}

      <WalkInDialog
        open={isWalkInDialogOpen}
        onOpenChange={setIsWalkInDialogOpen}
        onSubmit={handleWalkInSubmit}
        selectedService={selectedService}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CheckIn;
