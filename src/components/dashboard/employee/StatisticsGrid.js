import React from "react";
import { motion } from "framer-motion";
import { Euro, Star, Users, Briefcase, Calendar } from "lucide-react";
import { Card, CardContent } from "src/components/ui/card";
import { useLanguage } from "src/components/contexts/LanguageContext";
import { sk, vi } from "date-fns/locale";

const StatCard = ({
  icon: Icon,
  title,
  value,
  gradientColors = "from-pink-500 to-purple-600",
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`
        relative overflow-hidden shadow-lg hover:shadow-xl 
        transition-shadow duration-300 h-54  ${className}
      `}
      >
        {/* Gradient Background */}
        <div
          className={`
          absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8
          rounded-full opacity-10 bg-gradient-to-br ${gradientColors}
        `}
        />

        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-pink-100 dark:bg-pink-900/50 p-3 rounded-full">
              <Icon className="h-6 w-6 text-pink-500 dark:text-pink-400" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
            {title}
          </h3>

          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const StatisticsGrid = ({ stats }) => {
  const { currentLanguage, t } = useLanguage();

  // Format currency with Euro symbol based on locale
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currentLanguage === "vi" ? "vi-VN" : "sk-SK", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate goal completion percentage
  const goalProgress = Math.min(
    (stats.totalAppointments / stats.monthlyGoal) * 100,
    100
  );

  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 pb-6 md:grid-cols-2 lg:grid-cols-5 gap-6"
    >
      {/* Monthly Earnings Card */}
      <StatCard
        icon={Euro}
        title={t("dashboard.monthlyEarnings")}
        value={formatCurrency(stats.monthlyEarnings)}
        trend={stats.earningsTrend}
        gradientColors="from-green-500 to-emerald-600"
      />

      {/* Daily Earnings Card */}
      <StatCard
        icon={Calendar}
        title={t("dashboard.dailyEarnings")}
        value={formatCurrency(stats.dailyEarnings)}
        gradientColors="from-blue-500 to-indigo-600"
      />

      {/* Rating Card */}
      <StatCard
        icon={Star}
        title={t("dashboard.rating")}
        value={stats.rating > 0 ? `${stats.rating}/5` : "-"}
        gradientColors="from-yellow-500 to-amber-600"
      />

      {/* Appointments Card */}
      <StatCard
        icon={Users}
        title={t("dashboard.appointmentsCount")}
        value={stats.totalAppointments}
        gradientColors="from-purple-500 to-indigo-600"
      />

      {/* Monthly Goal Card */}
      <StatCard
        icon={Briefcase}
        title={t("dashboard.monthlyGoal")}
        value={`${Math.round(goalProgress)}%`}
        gradientColors="from-pink-500 to-purple-600"
      />
    </motion.div>
  );
};

export default StatisticsGrid;
