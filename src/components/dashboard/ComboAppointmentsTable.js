import React from "react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import {
  User,
  Clock,
  Clipboard,
  Table as TableIcon,
  Layers,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { cn } from "src/lib/utils";

const ComboAppointmentsTable = ({
  appointments,
  onMarkAsPaid,
  getStatusBadge,
  getAppointmentStatus,
}) => {
  // Group appointments by combo_id or individual appointments
  const groupedAppointments = React.useMemo(() => {
    const groups = {};

    appointments.forEach((appointment) => {
      const key = appointment.combo_id || appointment.id;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(appointment);
    });

    // Sort appointments within each group by service name
    // Usually we want pedicure to appear after manikura
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => {
        if (a.services.name.toLowerCase().includes("pedikúra")) return 1;
        if (b.services.name.toLowerCase().includes("pedikúra")) return -1;
        return 0;
      });
    });

    return groups;
  }, [appointments]);

  // Helper to determine if appointment group is a combo
  const isComboGroup = (group) => {
    return group.length > 1 && group[0].combo_id;
  };

  // Helper to calculate total price for a combo group
  const calculateComboPrice = (group) => {
    return group.reduce((total, app) => total + (app.price || 0), 0);
  };

  // Helper to determine if the mark as paid button should be shown
  // In ComboAppointmentsTable component
  const shouldShowMarkAsPaid = (group, status) => {
    if (status !== "ukoncene") return false;

    if (isComboGroup(group)) {
      // Show button if:
      // 1. All appointments in group are completed
      // 2. At least one is not paid
      return (
        group.every((app) => app.status === "completed") &&
        group.some((app) => !app.is_paid)
      );
    }

    // For non-combo appointments
    return !group[0].is_paid;
  };

  // Helper to get row styling based on combo status
  const getRowClassName = (group, appointment, index) => {
    const isCombo = isComboGroup(group);
    if (!isCombo) return "";

    const isFirstInGroup = index === 0;
    const isLastInGroup = index === group.length - 1;

    return cn("border-l-2 border-r-2 border-pink-200 bg-pink-50/30", {
      "border-t-2": isFirstInGroup,
      "border-b-2": isLastInGroup,
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Stav</TableHead>
          <TableHead>Zamestnanec</TableHead>
          <TableHead>Stôl</TableHead>
          <TableHead>Klient</TableHead>
          <TableHead>Služba</TableHead>
          <TableHead>Dátum a čas</TableHead>
          <TableHead>Cena</TableHead>
          <TableHead>Akcia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(groupedAppointments).map(([key, group]) => {
          const isCombo = isComboGroup(group);
          const status = getAppointmentStatus(group[0]);
          const totalComboPrice = isCombo ? calculateComboPrice(group) : null;

          return group.map((appointment, index) => {
            const isFirstInGroup = index === 0;

            return (
              <TableRow
                key={appointment.id}
                className={getRowClassName(group, appointment, index)}
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(status)}
                    {isCombo && isFirstInGroup && (
                      <Badge
                        variant="outline"
                        className="bg-pink-50 text-pink-700 border-pink-200 flex items-center w-fit"
                      >
                        <Layers className="mr-1 h-3 w-3" />
                        Combo
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {appointment.employees?.users?.first_name}{" "}
                      {appointment.employees?.users?.last_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <TableIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {appointment.employees?.table_number || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p>{appointment.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {appointment.email || appointment.phone}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {appointment.services?.name}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-500" />
                    {format(
                      new Date(appointment.start_time),
                      "d. MMMM yyyy HH:mm",
                      {
                        locale: sk,
                      }
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Clipboard className="mr-2 h-4 w-4 text-gray-500" />
                    {isCombo ? (
                      isFirstInGroup ? (
                        <div>
                          <span className="font-semibold text-green-600">
                            {totalComboPrice} €
                          </span>
                          <span className="text-xs text-gray-500 block">
                            (Combo cena)
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">v cene combo</span>
                      )
                    ) : appointment.price ? (
                      `${appointment.price} €`
                    ) : (
                      "-"
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {isFirstInGroup && shouldShowMarkAsPaid(group, status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onMarkAsPaid(
                          isCombo ? group[0].combo_id : appointment.id
                        )
                      }
                      className="whitespace-nowrap"
                    >
                      Označiť ako zaplatené
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          });
        })}
        {appointments.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-6 text-gray-500">
              Žiadne rezervácie na zobrazenie
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default ComboAppointmentsTable;
