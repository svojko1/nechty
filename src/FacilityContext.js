import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "./supabaseClient";

const FacilityContext = createContext();

export const useFacility = () => useContext(FacilityContext);

export const FacilityProvider = ({ children }) => {
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedFacilityId = localStorage.getItem("selectedFacilityId");
    if (storedFacilityId) {
      fetchFacility(storedFacilityId);
    } else {
      fetchFacilities();
    }
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
      const { data, error } = await supabase.from("facilities").select("*");

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
  };

  const resetFacility = () => {
    setSelectedFacility(null);
    localStorage.removeItem("selectedFacilityId");
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
