import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import {
  DollarSign,
  Users,
  TrendingUp,
  Award,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Progress } from "./ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

// Mock data for manager dashboard
const mockRevenueData = [
  { month: "Jan", revenue: 4000 },
  { month: "Feb", revenue: 3000 },
  { month: "Mar", revenue: 5000 },
  { month: "Apr", revenue: 4500 },
  { month: "May", revenue: 6000 },
  { month: "Jun", revenue: 5500 },
];

const mockEmployeePerformance = [
  { name: "Jana Nováková", bookings: 45, rating: 4.8, avatar: "/jana.jpg" },
  { name: "Peter Svoboda", bookings: 38, rating: 4.6, avatar: "/peter.jpg" },
  { name: "Mária Kováčová", bookings: 42, rating: 4.9, avatar: "/maria.jpg" },
];

const mockServicePopularity = [
  { name: "Manikúra", value: 30 },
  { name: "Pedikúra", value: 25 },
  { name: "Gélové nechty", value: 35 },
  { name: "Akrylové nechty", value: 10 },
];

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"];

function ManagerDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("month");

  const totalRevenue = mockRevenueData.reduce(
    (sum, item) => sum + item.revenue,
    0
  );
  const totalBookings = mockEmployeePerformance.reduce(
    (sum, employee) => sum + employee.bookings,
    0
  );

  const StatCard = ({ icon: Icon, title, value, change, changeType }) => (
    <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-pink-100 p-3 rounded-full">
            <Icon className="h-6 w-6 text-pink-500" />
          </div>
          <div
            className={`flex items-center ${
              changeType === "increase" ? "text-green-500" : "text-red-500"
            }`}
          >
            {changeType === "increase" ? (
              <ArrowUp className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-1" />
            )}
            <span className="text-sm font-medium">{change}%</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Dashboard manažéra
          </h1>
          <Select
            value={selectedTimeRange}
            onValueChange={setSelectedTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Vyberte časové obdobie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Týždeň</SelectItem>
              <SelectItem value="month">Mesiac</SelectItem>
              <SelectItem value="quarter">Štvrťrok</SelectItem>
              <SelectItem value="year">Rok</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={DollarSign}
            title="Celkové tržby"
            value={`${totalRevenue} €`}
            change="5.2"
            changeType="increase"
          />
          <StatCard
            icon={Users}
            title="Celkové rezervácie"
            value={totalBookings}
            change="3.1"
            changeType="increase"
          />
          <StatCard
            icon={TrendingUp}
            title="Priemerná cena"
            value={`${(totalRevenue / totalBookings).toFixed(2)} €`}
            change="1.5"
            changeType="increase"
          />
          <StatCard
            icon={Award}
            title="Spokojnosť zákazníkov"
            value="94%"
            change="0.8"
            changeType="decrease"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
              <CardTitle className="text-2xl font-bold">
                Mesačné tržby
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
              <CardTitle className="text-2xl font-bold">
                Popularita služieb
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockServicePopularity}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {mockServicePopularity.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white shadow-xl rounded-lg overflow-hidden mb-6">
          <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
            <CardTitle className="text-2xl font-bold">
              Výkonnosť zamestnancov
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zamestnanec</TableHead>
                  <TableHead>Rezervácie</TableHead>
                  <TableHead>Hodnotenie</TableHead>
                  <TableHead>Výkon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockEmployeePerformance.map((employee, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage
                            src={employee.avatar}
                            alt={employee.name}
                          />
                          <AvatarFallback>
                            {employee.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {employee.name}
                      </div>
                    </TableCell>
                    <TableCell>{employee.bookings}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="mr-2">{employee.rating}</span>
                        {[...Array(5)].map((_, i) => (
                          <Award
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(employee.rating)
                                ? "text-yellow-500"
                                : "text-gray-300"
                            }`}
                            fill={
                              i < Math.floor(employee.rating)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Progress
                        value={
                          (employee.bookings /
                            Math.max(
                              ...mockEmployeePerformance.map((e) => e.bookings)
                            )) *
                          100
                        }
                        className="h-2 w-full"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-xl rounded-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6">
            <CardTitle className="text-2xl font-bold">
              Nadchádzajúce termíny
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div className="flex items-center">
                    <Calendar className="h-10 w-10 text-pink-500 mr-3" />
                    <div>
                      <p className="font-medium">Manikúra</p>
                      <p className="text-sm text-gray-500">Jana Nováková</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">14. August 2024</p>
                    <p className="text-sm text-gray-500">10:00</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button variant="outline">Zobraziť všetky termíny</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ManagerDashboard;
