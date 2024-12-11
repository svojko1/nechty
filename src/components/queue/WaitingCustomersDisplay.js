import React, { useState, useEffect } from "react";
import { format, startOfToday, endOfToday } from "date-fns";
import { sk } from "date-fns/locale";
import { Users, Clock, AlertCircle } from "lucide-react";
import { supabase } from "src/supabaseClient";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";

const WaitingCustomersDisplay = ({ facilityId }) => {
  const [waitingCustomers, setWaitingCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWaitingCustomers = async () => {
    try {
      const today = startOfToday();
      const todayEnd = endOfToday();

      const { data, error } = await supabase
        .from("customer_queue")
        .select(
          `
          *,
          services (name, duration)
        `
        )
        .eq("status", "waiting")
        .eq("facility_id", facilityId)
        .gte("created_at", today.toISOString())
        .lte("created_at", todayEnd.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      setWaitingCustomers(data || []);
    } catch (error) {
      console.error("Error fetching waiting customers:", error);
      toast.error("Failed to fetch waiting customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (facilityId) {
      fetchWaitingCustomers();

      // Set up real-time subscription
      const channel = supabase
        .channel("waiting-customers-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customer_queue",
            filter: `facility_id=eq.${facilityId}`,
          },
          (payload) => {
            // Check if the change is for today
            const changeDate = new Date(
              payload.new?.created_at || payload.old?.created_at
            );
            const today = startOfToday();
            const todayEnd = endOfToday();

            if (changeDate >= today && changeDate <= todayEnd) {
              fetchWaitingCustomers();
            }
          }
        )
        .subscribe();

      // Cleanup subscription
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [facilityId]);

  const calculateWaitTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMinutes = Math.floor((now - created) / 1000 / 60);

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
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
        <div className="flex items-center space-x-4">
          <CardTitle className="text-xl font-bold text-pink-700 flex items-center">
            <Users className="mr-2" />
            Čakajúci zákazníci
          </CardTitle>
          <Badge variant="outline" className="ml-2">
            {waitingCustomers.length} zákazníkov
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {waitingCustomers.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zákazník</TableHead>
                    <TableHead>Služba</TableHead>
                    <TableHead>Čaká</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Trvanie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitingCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.customer_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {customer.services?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{calculateWaitTime(customer.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {customer.email && <p>{customer.email}</p>}
                          {customer.phone && (
                            <p className="text-sm text-gray-500">
                              {customer.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>{" "}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            calculateWaitTime(customer.created_at).includes("h")
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-green-100 text-green-800 border-green-200"
                          }
                        >
                          ~{customer.services?.duration || 30} min
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-gray-500"
            >
              <AlertCircle className="h-8 w-8 mb-2 text-gray-400" />
              <p className="text-lg">
                Momentálne nie sú žiadni čakajúci zákazníci
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default WaitingCustomersDisplay;
