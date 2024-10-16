import React, { useState, useEffect } from "react";
import ReceptionDashboard from "./components/ReceptionDashboard";
import { FacilityProvider, useFacility } from "./FacilityContext";
import FacilitySelector from "./components/FacilitySelector";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "./components/ui/navigation-menu";
import CheckIn from "./components/CheckIn";
import {
  Sparkles,
  Menu,
  X,
  Instagram,
  Facebook,
  Twitter,
  Calendar,
  Users,
  BarChart,
  Star,
  LogIn,
  LogOut,
  UserCheck,
  Inbox,
  Settings,
} from "lucide-react";
import { ScrollArea } from "./components/ui/scroll-area";
import { cn } from "./lib/utils";
import { supabase } from "./supabaseClient";

import BookingSystem from "./components/BookingSystem";
import ManagerDashboard from "./components/ManagerDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import FeedbackPage from "./components/FeedbackSystem";
import AuthForm from "./components/AuthForm";
import AdminDashboard from "./components/AdminDashboard";

const NavLink = ({ to, children, icon: Icon }) => {
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
      >
        <Icon className="mr-2 h-4 w-4" />
        {children}
      </Button>
    </Link>
  );
};

const BookingSystemWrapper = () => {
  const { selectedFacility } = useFacility();

  if (!selectedFacility) {
    return <FacilitySelector />;
  }

  return <BookingSystem facilityId={selectedFacility.id} />;
};

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
        <div className="text-2xl font-bold text-pink-600">Načítava sa...</div>
      </div>
    );
  }

  const headerClass = scrollY > 50 ? "py-2 shadow-lg" : "py-4";

  return (
    <FacilityProvider>
      <Router>
        <div
          className={`min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 dark:from-gray-900 dark:to-purple-900 flex flex-col transition-colors duration-300`}
        >
          <header
            className={`sticky top-0 z-50 bg-white dark:bg-gray-800 transition-all duration-300 ${headerClass}`}
          >
            <nav className="container mx-auto px-4">
              <div className="flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-2">
                  <Sparkles className="h-8 w-8 text-pink-500 dark:text-pink-400" />
                  <h1 className="text-2xl font-bold text-pink-800 dark:text-pink-200">
                    Nail Bar
                  </h1>
                </Link>
                <div className="hidden md:flex space-x-4 items-center">
                  <NavigationMenu>
                    <NavigationMenuList>
                      <NavigationMenuItem>
                        <NavLink to="/" icon={Calendar}>
                          Rezervácie
                        </NavLink>
                      </NavigationMenuItem>

                      <NavigationMenuItem>
                        <NavLink to="/checkin" icon={UserCheck}>
                          Check-in
                        </NavLink>
                      </NavigationMenuItem>

                      <NavigationMenuItem>
                        <NavLink to="/feedback" icon={Star}>
                          Hodnotenie
                        </NavLink>
                      </NavigationMenuItem>

                      {session ? (
                        <>
                          <NavigationMenuItem>
                            <NavLink to="/zamestnanec" icon={Users}>
                              Zamestnanec
                            </NavLink>
                          </NavigationMenuItem>
                          <NavigationMenuItem>
                            <NavLink to="/manazer" icon={BarChart}>
                              Manažér
                            </NavLink>
                          </NavigationMenuItem>

                          <NavigationMenuItem>
                            <NavLink to="/reception" icon={Inbox}>
                              Recepcia
                            </NavLink>
                          </NavigationMenuItem>

                          <NavigationMenuItem>
                            <NavLink to="/admin" icon={Settings}>
                              Admin
                            </NavLink>
                          </NavigationMenuItem>

                          <NavigationMenuItem>
                            <Button onClick={handleLogout} variant="ghost">
                              <LogOut className="mr-2 h-4 w-4" />
                              Odhlásiť sa
                            </Button>
                          </NavigationMenuItem>
                        </>
                      ) : (
                        <NavigationMenuItem>
                          <NavLink to="/login" icon={LogIn}>
                            Prihlásenie
                          </NavLink>
                        </NavigationMenuItem>
                      )}
                    </NavigationMenuList>
                  </NavigationMenu>
                </div>
                <Button
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? <X /> : <Menu />}
                </Button>
              </div>
            </nav>
          </header>

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
                      <li>
                        <NavLink to="/" icon={Calendar}>
                          Rezervácie
                        </NavLink>
                      </li>
                      {session ? (
                        <>
                          <li>
                            <NavLink to="/zamestnanec" icon={Users}>
                              Zamestnanec
                            </NavLink>
                          </li>
                          <li>
                            <NavLink to="/manazer" icon={BarChart}>
                              Manažér
                            </NavLink>
                          </li>
                          <li>
                            <NavLink to="/feedback" icon={Star}>
                              Hodnotenie
                            </NavLink>
                          </li>

                          <li>
                            <NavLink to="/admin" icon={Settings}>
                              Admin
                            </NavLink>
                          </li>

                          <li>
                            <Button
                              onClick={handleLogout}
                              variant="ghost"
                              className="w-full justify-start"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Odhlásiť sa
                            </Button>
                          </li>
                        </>
                      ) : (
                        <li>
                          <NavLink to="/login" icon={LogIn}>
                            Prihlásenie
                          </NavLink>
                        </li>
                      )}
                    </ul>
                  </nav>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="container justify-center items-center mx-auto mt-8 p-4 flex-grow flex ">
            <Routes>
              <Route path="/" element={<BookingSystemWrapper />} />

              <Route path="/checkin" element={<CheckIn />} />
              {session ? (
                <>
                  <Route
                    path="/zamestnanec"
                    element={<EmployeeDashboard session={session} />}
                  />
                  <Route path="/manazer" element={<ManagerDashboard />} />
                  <Route path="/reception" element={<ReceptionDashboard />} />

                  <Route
                    path="/feedback/:employeeId"
                    element={<FeedbackPage />}
                  />
                  <Route path="/admin" element={<AdminDashboard />} />
                </>
              ) : (
                <Route
                  path="/login"
                  element={<AuthForm setSession={setSession} />}
                />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </FacilityProvider>
  );
}

export default App;
