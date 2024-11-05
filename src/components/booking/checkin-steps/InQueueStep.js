import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Users, AlertCircle } from "lucide-react";
import { supabase } from "src/supabaseClient";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";

const InQueueStep = ({
  queuePosition,
  facilityId,
  onComplete,
  autoCloseDelay = 15000,
}) => {
  const [peopleAhead, setPeopleAhead] = useState(0);

  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [onComplete, autoCloseDelay]);

  useEffect(() => {
    const fetchQueuePosition = async () => {
      try {
        const { data, error } = await supabase
          .from("customer_queue")
          .select("queue_position")
          .eq("facility_id", facilityId)
          .eq("status", "waiting")
          .lt("queue_position", queuePosition)
          .order("queue_position", { ascending: true });

        if (error) throw error;

        setPeopleAhead(data.length);
      } catch (error) {
        console.error("Error fetching queue positions:", error);
      }
    };

    fetchQueuePosition();

    // Set up real-time subscription for queue updates
    const subscription = supabase
      .channel("queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_queue",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          fetchQueuePosition();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [facilityId, queuePosition]);

  // Calculate estimated wait time (minimum 5 minutes per person)
  const estimatedWaitTime = Math.max(peopleAhead * 15, 5);

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg mt-8">
      <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
        <div className="flex items-center justify-center space-x-2">
          <Users className="h-6 w-6" />
          <CardTitle className="text-2xl font-bold text-center">
            Čakajte, pracovník vás vyzve
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Queue Position Display  */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-yellow-50 rounded-lg p-6 text-center mb-8"
          >
            <p className="text-lg text-yellow-600 font-medium mb-2">
              Vaše poradie v rade:
            </p>
            <div className="text-5xl font-bold text-yellow-700 mb-2">
              {peopleAhead + 1}.
            </div>
          </motion.div>
          {/* Waiting Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span>
                Odhadovaný čas čakania: približne {estimatedWaitTime} minút
              </span>
            </div>

            <div className="flex items-center space-x-2 text-gray-600">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span>
                {peopleAhead === 0
                  ? "Čoskoro vás zavoláme"
                  : "Budeme vás informovať, keď príde váš rad"}
              </span>
            </div>
          </div>
          {/* Auto-close Timer */}
          <motion.div
            className="mt-6 text-center text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p>Táto obrazovka sa automaticky zatvorí za 15 sekúnd</p>
            <motion.div
              className="h-1 bg-yellow-500 rounded-full mt-2"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 15, ease: "linear" }}
            />
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InQueueStep;
