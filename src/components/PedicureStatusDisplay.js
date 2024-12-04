import React, { useState, useEffect } from "react";
import { Armchair, User, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { supabase } from "../supabaseClient";

// Pedicure service ID constant
const PEDICURE_SERVICE_ID = "8ee040e3-1983-4f13-a432-c7644724fb1a";

const PedicureStatusDisplay = ({ facilityId }) => {
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [totalChairs, setTotalChairs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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

  const getAvailabilityDisplay = () => {
    const occupiedChairs = activeAppointments.length;
    const availableChairs = totalChairs - occupiedChairs;
    const availabilityColor =
      availableChairs === 0 ? "text-red-500" : "text-green-500";

    return (
      <div className="flex items-center space-x-2 mb-4">
        <Badge variant="outline" className={`text-base ${availabilityColor}`}>
          {availableChairs} / {totalChairs} voľných stoličiek
        </Badge>
        {availableChairs === 0 && (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
    );
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

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold text-pink-700 flex items-center">
          <Armchair className="mr-2" />
          Pedikúra
        </CardTitle>
        {getAvailabilityDisplay()}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
