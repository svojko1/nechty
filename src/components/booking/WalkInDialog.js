import React, { useState } from "react";

import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";

const WalkInDialog = ({
  open,
  onOpenChange,
  onSubmit,
  selectedService,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Only validate customer name
    if (!formData.customerName.trim()) {
      toast.error("Prosím, zadajte meno zákazníka");
      return;
    }

    // Submit the data - email and phone are optional
    onSubmit({
      customer_name: formData.customerName,
      // Only include contact_info if either email or phone is provided
      contact_info: formData.email || formData.phone || "",
      service_id: selectedService?.id,
    });
  };

  const handleClose = () => {
    setFormData({
      customerName: "",
      email: "",
      phone: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Zadajte údaje</DialogTitle>
          <DialogDescription>
            Vyplňte potrebné údaje pre pokračovanie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            {/* Customer Name - Required */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Meno*
              </Label>
              <Input
                id="name"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                className="col-span-3"
                placeholder="Zadajte vaše meno"
                required
              />
            </div>

            {/* Email - Optional */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="col-span-3"
                placeholder="vas@email.com"
              />
            </div>

            {/* Phone - Optional */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefón
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="col-span-3"
                placeholder="+421 XXX XXX XXX"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Zrušiť
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-4 w-4" />
                </motion.div>
              ) : (
                "Rezerovať"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WalkInDialog;
