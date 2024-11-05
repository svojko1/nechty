import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";

export const FinishAppointmentDialog = ({
  isOpen,
  onClose,
  selectedAppointment,
  price,
  onPriceChange,
  onConfirm,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ukončiť rezerváciu</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="price">Zadajte cenu</Label>
          <Input
            id="price"
            type="number"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="Zadajte cenu"
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Zrušiť
          </Button>
          <Button onClick={onConfirm}>Potvrdiť</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
