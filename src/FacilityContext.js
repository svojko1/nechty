import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "./supabaseClient";

const FacilityContext = createContext();

export const useFacility = () => useContext(FacilityContext);

export const FacilityProvider = ({ children }) => {
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeFacility = async () => {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const pobockaParam = urlParams.get("pobocka");
      const kioskParam = urlParams.get("kiosk");

      // Handle kiosk parameter
      if (kioskParam === "true" || kioskParam === "false") {
        localStorage.setItem("kiosk-mode", kioskParam);
      }

      // Check URL parameter first for facility
      if (pobockaParam) {
        const { data: facilityData, error } = await supabase
          .from("facilities")
          .select("*")
          .ilike("name", `%${pobockaParam}%`)
          .single();

        if (!error && facilityData) {
          setSelectedFacility(facilityData);
          localStorage.setItem("selectedFacilityId", facilityData.id);
          setLoading(false);
          return;
        }
      }

      // If no URL parameter or facility not found, check localStorage
      const storedFacilityId = localStorage.getItem("selectedFacilityId");
      if (storedFacilityId) {
        await fetchFacility(storedFacilityId);
      } else {
        await fetchFacilities();
      }
    };

    initializeFacility();
  }, []);

  const fetchFacility = async (facilityId) => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", facilityId)
        .single();

      if (error) throw error;
      setSelectedFacility(data);
    } catch (error) {
      console.error("Error fetching facility:", error);
      localStorage.removeItem("selectedFacilityId");
      fetchFacilities();
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setFacilities(data);
    } catch (error) {
      console.error("Error fetching facilities:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectFacility = (facility) => {
    setSelectedFacility(facility);
    localStorage.setItem("selectedFacilityId", facility.id);
    // Update URL without triggering reload
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("pobocka", facility.name.toLowerCase());
    window.history.pushState({}, "", newUrl);
  };

  const resetFacility = () => {
    setSelectedFacility(null);
    localStorage.removeItem("selectedFacilityId");
    // Remove pobocka parameter from URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete("pobocka");
    window.history.pushState({}, "", newUrl);
    fetchFacilities();
  };

  return (
    <FacilityContext.Provider
      value={{
        selectedFacility,
        facilities,
        loading,
        selectFacility,
        resetFacility,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};
