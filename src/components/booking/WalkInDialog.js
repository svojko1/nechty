import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

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

    console.log("Form Data:", formData); // Check initial form data

    if (!formData.customerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    // Require at least one contact method
    if (!formData.email && !formData.phone) {
      toast.error("Please provide either email or phone number");
      return;
    }

    // Validate email if provided
    if (formData.email && !isValidEmail(formData.email)) {
      toast.error("Please enter a valid email");
      return;
    }

    // Validate phone if provided
    if (formData.phone && !isValidPhone(formData.phone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const submissionData = {
      customer_name: formData.customerName,
      email: formData.email || null,
      phone: formData.phone || null,
      isCombo: selectedService?.isCombo || false,
      service_id: selectedService?.id,
    };

    console.log("Submission Data:", submissionData); // Check data being sent
    onSubmit(submissionData);
  };

  const handleClose = () => {
    setFormData({
      customerName: "",
      email: "",
      phone: "",
    });
    onOpenChange(false);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone) => {
    return /^\+?[\d\s-]{8,}$/.test(phone);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>
            Please provide customer information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            {/* Customer Name - Required */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                placeholder="Enter customer name"
                required
              />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="customer@example.com"
              />
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.customerName}
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
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WalkInDialog;
