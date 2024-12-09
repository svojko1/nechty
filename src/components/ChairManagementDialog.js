import React, { useState, useEffect } from "react";
import { Armchair } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../supabaseClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/components/ui/tabs";

const ChairManagementDialog = ({ isOpen, onClose, facilityId, onUpdate }) => {
  const [chairs, setChairs] = useState(0);
  const [pedicureChairs, setPedicureChairs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (isOpen && facilityId) {
      fetchFacilityData();
    }
  }, [isOpen, facilityId]);

  const fetchFacilityData = async () => {
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select("total_chairs, pedicure_chairs")
        .eq("id", facilityId)
        .single();

      if (error) throw error;

      setChairs(data.total_chairs || 0);
      setPedicureChairs(data.pedicure_chairs || 0);
    } catch (error) {
      console.error("Error fetching facility data:", error);
      toast.error("Nepodarilo sa načítať údaje o prevádzke");
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (chairs < 1 || pedicureChairs < 1) {
      toast.error("Počet stoličiek musí byť aspoň 1");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("facilities")
        .update({
          total_chairs: chairs,
          pedicure_chairs: pedicureChairs,
        })
        .eq("id", facilityId);

      if (error) throw error;

      toast.success("Počet stoličiek bol úspešne aktualizovaný");
      if (onUpdate) {
        onUpdate({ totalChairs: chairs, pedicureChairs });
      }
      onClose();
    } catch (error) {
      console.error("Error updating chairs:", error);
      toast.error("Nepodarilo sa aktualizovať počet stoličiek");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            Správa stoličiek prevádzky
          </DialogTitle>
          <DialogDescription>
            Upravte počet dostupných stoličiek pre vašu prevádzku
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="regular" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="regular">Bežné stoličky</TabsTrigger>
            <TabsTrigger value="pedicure">Pedikúrne kreslá</TabsTrigger>
          </TabsList>

          <TabsContent value="regular" className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bežné stoličky</Label>
                <Input
                  type="number"
                  value={chairs}
                  onChange={(e) => setChairs(parseInt(e.target.value) || 0)}
                  min="1"
                  max="50"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Používajú sa pre bežné služby ako manikúra
              </p>
            </div>
          </TabsContent>

          <TabsContent value="pedicure" className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pedikúrne kreslá</Label>
                <Input
                  type="number"
                  value={pedicureChairs}
                  onChange={(e) =>
                    setPedicureChairs(parseInt(e.target.value) || 0)
                  }
                  min="1"
                  max="20"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Špeciálne kreslá používané pre pedikúru
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Zrušiť
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Ukladá sa..." : "Uložiť zmeny"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChairManagementDialog;
