// src/components/dialogs/ConfirmationDialog.js
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  price,
  title = "Potvrdiť ukončenie rezervácie",
  description = "Ste si istý, že chcete ukončiť túto rezerváciu?",
  confirmText = "Potvrdiť",
  cancelText = "Zrušiť",
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-lg font-semibold">Cena: {price} €</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
