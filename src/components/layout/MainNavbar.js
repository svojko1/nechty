import React, { useState, useEffect } from "react";
import { supabase } from "src/supabaseClient";
import {
  Sparkles,
  Menu,
  X,
  Calendar,
  Users,
  BarChart,
  LogIn,
  LogOut,
  UserCheck,
  Inbox,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "src/components/ui/scroll-area";
import { cn } from "src/lib/utils";

import { Button } from "src/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "src/components/ui/navigation-menu";

// NavLink subcomponent
const NavLink = ({ to, children, icon: Icon, onClick = null }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to}>
      <Button
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start text-left font-normal",
          isActive
            ? "bg-pink-500 text-white"
            : "text-pink-800 hover:text-pink-500 hover:bg-pink-100"
        )}
        onClick={onClick}
      >
        <Icon className="mr-2 h-4 w-4" />
        {children}
      </Button>
    </Link>
  );
};

const MainNavbar = ({ session, handleLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();
  const isKiosk =
    ["/checkin", "/"].includes(location.pathname) &&
    (localStorage.getItem("kiosk-mode") === "true" ||
      location.search.includes("kiosk=true"));

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (session?.user?.id) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (error) throw error;
          setUserRole(data.role);
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [session]);

  if (isKiosk) return null;

  const headerClass = scrollY > 50 ? "py-4 shadow-lg" : "py-4";

  // Only show login button when no session exists
  const publicNavigationItems = [];

  const getNavigationItems = () => {
    if (!session) {
      return publicNavigationItems;
    }

    switch (userRole) {
      case "employee":
        return [{ to: "/zamestnanec", label: "Zamestnanec", icon: Users }];
      case "reception":
        return [{ to: "/reception", label: "Recepcia", icon: Inbox }];
      case "admin":
        return [
          { to: "/manazer", label: "Manažér", icon: BarChart },
          { to: "/admin", label: "Admin", icon: Settings },
        ];
      case "manager":
        return [
          { to: "/", label: "Rezervácie", icon: Calendar },
          { to: "/checkin", label: "Check-in", icon: UserCheck },
          { to: "/manazer", label: "Manažér", icon: BarChart },
        ];
      default:
        return session
          ? [
              { to: "/", label: "Rezervácie", icon: Calendar },
              { to: "/checkin", label: "Check-in", icon: UserCheck },
            ]
          : [];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <header
      className={`sticky top-0 z-50 bg-white dark:bg-gray-800 transition-all duration-300 ${headerClass}`}
    >
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-pink-500 dark:text-pink-400" />
            <h1 className="text-2xl font-bold text-pink-800 dark:text-pink-200">
              Nail Bar
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-4 items-center">
            <NavigationMenu>
              <NavigationMenuList>
                {navigationItems.map((item) => (
                  <NavigationMenuItem key={item.to}>
                    <NavLink to={item.to} icon={item.icon}>
                      {item.label}
                    </NavLink>
                  </NavigationMenuItem>
                ))}

                {/* Login/Logout button */}
                <NavigationMenuItem>
                  {session ? (
                    <div className="flex items-center gap-4 pl-4">
                      <span className="text-sm text-gray-600">
                        {session.user.email}
                      </span>
                      <Button onClick={handleLogout} variant="ghost">
                        <LogOut className="mr-2 h-4 w-4" />
                        Odhlásiť sa
                      </Button>
                    </div>
                  ) : (
                    //empty div
                    <div></div>
                  )}
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-800 shadow-md"
          >
            <ScrollArea className="h-[300px]">
              <nav className="container mx-auto px-4 py-4">
                <ul className="space-y-2">
                  {navigationItems.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        icon={item.icon}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}

                  {/* Login/Logout button */}
                  <li>
                    {session ? (
                      <>
                        <li className="px-4 py-2 text-sm text-gray-600">
                          {session.user.email}
                        </li>
                        <li>
                          <Button
                            onClick={() => {
                              handleLogout();
                              setIsMenuOpen(false);
                            }}
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Odhlásiť sa
                          </Button>
                        </li>
                      </>
                    ) : (
                      <NavLink
                        to="/login"
                        icon={LogIn}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Prihlásenie
                      </NavLink>
                    )}
                  </li>
                </ul>
              </nav>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default MainNavbar;
