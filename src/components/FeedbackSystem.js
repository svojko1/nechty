import React, { useState } from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { Star, Calendar, Clock, User, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// Mock data for employees
const employees = [
  { id: 1, name: "Jana Nováková" },
  { id: 2, name: "Eva Svobodová" },
  { id: 3, name: "Mária Kováčová" },
  { id: 4, name: "Anna Horváthová" },
];

const FeedbackPage = () => {
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send this data to your backend
    console.log({
      appointmentDate,
      appointmentTime,
      employeeId,
      rating,
      comment,
    });
    setIsSubmitted(true);
  };

  const resetForm = () => {
    setAppointmentDate("");
    setAppointmentTime("");
    setEmployeeId("");
    setRating(0);
    setComment("");
    setIsSubmitted(false);
  };

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
      <Button
        onClick={resetForm}
        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-colors"
      >
        Odoslať ďalšie hodnotenie
      </Button>
    </motion.div>
  );

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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="appointment-date">Dátum návštevy</Label>
                  <div className="relative">
                    <Input
                      id="appointment-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      className="pl-10"
                    />
                    <Calendar
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="appointment-time">Čas návštevy</Label>
                  <div className="relative">
                    <Input
                      id="appointment-time"
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      required
                      className="pl-10"
                    />
                    <Clock
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="employee-select">Zamestnanec</Label>
                  <Select
                    value={employeeId}
                    onValueChange={setEmployeeId}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Vyberte zamestnanca" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem
                          key={employee.id}
                          value={employee.id.toString()}
                        >
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Hodnotenie</Label>
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
                  <Label htmlFor="comment">Komentár (voliteľné)</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Napíšte váš komentár..."
                    className="w-full p-2 border rounded"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 transition-colors"
                >
                  Odoslať hodnotenie
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="thank-you"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <ThankYouPage />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackPage;
