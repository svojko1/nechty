import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Star, Calendar, Clock, User, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const ThankYouPage = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="text-center"
  >
    <CheckCircle className="w-24 h-24 mx-auto text-green-500 mb-6" />
    <h2 className="text-3xl font-bold text-gray-800 mb-4">
      Ďakujeme za vaše hodnotenie!
    </h2>
    <p className="text-xl text-gray-600 mb-8">
      Vaša spätná väzba nám pomáha zlepšovať naše služby.
    </p>
    <p className="text-gray-500">Budete presmerovaný na hlavnú stránku...</p>
  </motion.div>
);

const FeedbackPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [appointmentData, setAppointmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          employees (
            id,
            users (
              first_name,
              last_name
            )
          ),
          services (
            name
          )
        `
        )
        .eq("id", appointmentId)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Rezervácia nebola nájdená");
        return;
      }

      setAppointmentData(data);
    } catch (err) {
      console.error("Chyba pri načítaní rezervácie:", err);
      setError("Nepodarilo sa načítať detaily rezervácie");
      toast.error("Nepodarilo sa načítať detaily rezervácie");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Prosím, vyberte hodnotenie");
      return;
    }

    try {
      const { error } = await supabase.from("feedback").insert({
        employee_id: appointmentData.employee_id,
        appointment_date: appointmentData.start_time,
        rating,
        comment,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Ďakujeme za vaše hodnotenie!");

      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      console.error("Chyba pri odosielaní hodnotenia:", error);
      toast.error("Nepodarilo sa odoslať hodnotenie");
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          Načítavanie detailov rezervácie...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Späť na hlavnú stránku
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!appointmentData) return null;

  return (
    <AnimatePresence mode="wait">
      {!isSubmitted ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              <CardTitle className="text-2xl font-bold">
                Ohodnoťte vašu návštevu
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-pink-500" />
                    <span>
                      {format(
                        new Date(appointmentData.start_time),
                        "d. MMMM yyyy",
                        { locale: sk }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-pink-500" />
                    <span>
                      {format(new Date(appointmentData.start_time), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-pink-500" />
                    <span>
                      {appointmentData.employees.users.first_name}{" "}
                      {appointmentData.employees.users.last_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-pink-500" />
                    <span>{appointmentData.services.name}</span>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">Hodnotenie</p>
                  <div className="flex mb-2">
                    {[...Array(5)].map((_, index) => {
                      const ratingValue = index + 1;
                      return (
                        <label key={index} className="cursor-pointer">
                          <input
                            type="radio"
                            name="rating"
                            className="hidden"
                            value={ratingValue}
                            onClick={() => setRating(ratingValue)}
                          />
                          <Star
                            className={`transition-colors ${
                              ratingValue <= (hover || rating)
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                            onMouseEnter={() => setHover(ratingValue)}
                            onMouseLeave={() => setHover(0)}
                            fill={
                              ratingValue <= (hover || rating)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">Komentár (voliteľné)</p>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Zdieľajte vašu skúsenosť..."
                    className="w-full p-2 border rounded"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-colors"
                >
                  Odoslať hodnotenie
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <ThankYouPage />
      )}
    </AnimatePresence>
  );
};

export default FeedbackPage;
