import React, { useState, useEffect } from "react";
import { Armchair, User, Clock, AlertCircle, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import { Input } from "src/components/ui/input";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";

// Pedicure service ID constant
const PEDICURE_SERVICE_ID = "8ee040e3-1983-4f13-a432-c7644724fb1a";

const ChairGrid = ({ totalChairs, activeAppointments }) => {
  // Create array of chair numbers from 1 to totalChairs
  const chairs = Array.from({ length: totalChairs }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-gray-50 rounded-lg mb-6">
      {chairs.map((chairNumber) => {
        // Consider chair occupied if we have an active appointment for this position
        const appointment =
          chairNumber <= activeAppointments.length
            ? activeAppointments[chairNumber - 1]
            : null;
        const isOccupied = !!appointment;

        return (
          <div
            key={chairNumber}
            className="flex flex-col items-center space-y-2"
          >
            <div className="relative group">
              <Armchair
                className={`w-12 h-12 ${
                  isOccupied ? "text-red-500" : "text-green-500"
                } transition-colors duration-200`}
              />
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm font-medium">
                {chairNumber}
              </span>
              {isOccupied && appointment.customer_name && (
                <div
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                               bg-gray-800 text-white text-xs rounded px-2 py-1 
                               opacity-0 group-hover:opacity-100 transition-opacity 
                               whitespace-nowrap z-10"
                >
                  {appointment.customer_name}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PedicureStatusDisplay = ({ facilityId }) => {
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [totalChairs, setTotalChairs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchFacilityInfo();
    fetchAppointments();
    const subscription = setupSubscription();
    return () => subscription();
  }, [facilityId]);

  const fetchFacilityInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("pedicure_chairs")
        .eq("id", facilityId)
        .single();

      if (error) throw error;
      setTotalChairs(data.pedicure_chairs);
    } catch (error) {
      console.error("Error fetching facility info:", error);
      toast.error("Nepodarilo sa načítať informácie o zariadení");
    }
  };

  const fetchAppointments = async () => {
    try {
      const now = new Date().toISOString();

      // Fetch active pedicure appointments
      const { data: active, error: activeError } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name),
          employees (users (first_name, last_name))
        `
        )
        .eq("facility_id", facilityId)
        .eq("status", "in_progress")
        .eq("service_id", PEDICURE_SERVICE_ID)
        .order("start_time", { ascending: true });

      if (activeError) throw activeError;

      // Fetch upcoming pedicure appointments
      const { data: upcoming, error: upcomingError } = await supabase
        .from("appointments")
        .select(
          `
          *,
          services (name),
          employees (users (first_name, last_name))
        `
        )
        .eq("facility_id", facilityId)
        .eq("service_id", PEDICURE_SERVICE_ID)
        .eq("status", "scheduled")
        .gt("start_time", now)
        .order("start_time", { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      setActiveAppointments(active || []);
      setUpcomingAppointments(upcoming || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Nepodarilo sa načítať rezervácie");
    } finally {
      setIsLoading(false);
    }
  };

  const setupSubscription = () => {
    const subscription = supabase
      .channel("pedicure-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `facility_id=eq.${facilityId}`,
        },
        fetchAppointments
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  };

  const handleChairUpdate = (newChairCount) => {
    setTotalChairs(newChairCount);
    fetchAppointments(); // Refresh appointments after chair update
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex justify-center items-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
        </CardContent>
      </Card>
    );
  }

  const availableChairs = totalChairs - activeAppointments.length;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-4">
          <CardTitle className="text-xl font-bold text-pink-700 flex items-center">
            <Armchair className="mr-2" />
            Pedikúra
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className={`text-base ${
            availableChairs === 0 ? "text-red-500" : "text-green-500"
          }`}
        >
          {availableChairs} / {totalChairs} voľných stoličiek
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Chair Grid */}
          <ChairGrid
            totalChairs={totalChairs}
            activeAppointments={activeAppointments}
          />

          {/* Active Appointments */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">
              Aktívne pedikúry
            </h3>
            {activeAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeAppointments.map((appointment) => (
                  <Card
                    key={appointment.id}
                    className="bg-pink-50 border-pink-200"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-pink-500" />
                            <span className="font-medium">
                              {appointment.customer_name}
                            </span>
                          </div>
                          <Badge className="bg-pink-500">
                            {format(new Date(appointment.start_time), "HH:mm")}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {appointment.employees?.users?.first_name}{" "}
                          {appointment.employees?.users?.last_name}
                        </div>
                        {appointment.chair_number && (
                          <div className="text-sm text-gray-600">
                            Stolička č. {appointment.chair_number}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Žiadne aktívne pedikúry
              </p>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">
              Nadchádzajúce pedikúry
            </h3>
            {upcomingAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingAppointments.map((appointment) => (
                  <Card key={appointment.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {appointment.customer_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <Badge variant="outline">
                              {format(
                                new Date(appointment.start_time),
                                "HH:mm"
                              )}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {appointment.employees?.users?.first_name}{" "}
                          {appointment.employees?.users?.last_name}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Žiadne nadchádzajúce pedikúry
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PedicureStatusDisplay;
