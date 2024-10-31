// src/components/WaitingCustomersDisplay.js
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { supabase } from "../supabaseClient";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const WaitingCustomersDisplay = () => {
  const [waitingCustomers, setWaitingCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWaitingCustomers = async () => {
    console.log("Fetching waiting customers...");
    try {
      const { data, error } = await supabase
        .from("customer_queue")
        .select(
          `
          *,
          services (name, duration)
        `
        )
        .eq("status", "waiting")
        .order("queue_position", { ascending: true });

      if (error) throw error;
      console.log("Received waiting customers:", data);
      setWaitingCustomers(data);
    } catch (error) {
      console.error("Error fetching waiting customers:", error);
      toast.error("Failed to fetch waiting customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitingCustomers();

    // Create and enable the channel
    const channel = supabase.channel("customer_queue_changes", {
      config: {
        broadcast: { self: true },
        presence: { key: "anonymous" },
      },
    });

    // Subscribe to all changes in the customer_queue table
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_queue",
        },
        (payload) => {
          console.log("Received real-time update:", payload);
          fetchWaitingCustomers();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to real-time changes");
        }
      });

    // Cleanup function
    return () => {
      console.log("Cleaning up subscription...");
      channel.unsubscribe();
    };
  }, []);

  // Debug log when waitingCustomers changes
  useEffect(() => {
    console.log("Waiting customers updated:", waitingCustomers);
  }, [waitingCustomers]);

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
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-pink-700 flex items-center">
          <Users className="mr-2" />
          Čakajúci zákazníci ({waitingCustomers.length})
        </CardTitle>
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
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Služba</TableHead>
                    <TableHead>Čaká od</TableHead>
                    <TableHead>Odhadovaný čas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitingCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.customer_name}</TableCell>
                      <TableCell>{customer.contact_info}</TableCell>
                      <TableCell>{customer.services?.name}</TableCell>
                      <TableCell>
                        {format(new Date(customer.created_at), "HH:mm", {
                          locale: sk,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
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
              className="text-center py-6 text-gray-500"
            >
              Momentálne nie sú žiadni čakajúci zákazníci
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default WaitingCustomersDisplay;
