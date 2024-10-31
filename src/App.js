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
  useNavigate,
} from "react-router-dom";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import { supabase } from "./supabaseClient";
import { toast } from "react-hot-toast";
import MainNavbar from "./components/MainNavbar";
import { ArrowLeft, Home, RotateCw } from "lucide-react";

// Import components
import CheckIn from "./components/CheckIn";
import BookingSystem from "./components/BookingSystem";
import ManagerDashboard from "./components/ManagerDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import FeedbackPage from "./components/FeedbackSystem";
import AuthForm from "./components/AuthForm";
import AdminDashboard from "./components/AdminDashboard";

// Navigation Controls Component
const NavigationControls = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isKiosk = localStorage.getItem("kiosk-mode") === "true";

  const handleReset = () => {
    // Navigate to check-in and refresh the page
    navigate("/checkin");
    window.location.reload();
  };

  // Show navigation buttons in kiosk mode for specific routes
  const showKioskNav =
    isKiosk && (location.pathname === "/" || location.pathname === "/checkin");

  // Don't show navigation on home page in non-kiosk mode
  if (location.pathname === "/" && !isKiosk) return null;

  // Different navigation for kiosk mode
  if (showKioskNav) {
    return (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 z-50">
        <Button
          variant="secondary"
          size="lg"
          className="shadow-lg bg-white hover:bg-gray-100 text-lg font-semibold px-8 py-6"
          onClick={handleReset}
        >
          <RotateCw className="mr-2 h-5 w-5" />
          Začať odznova
        </Button>
      </div>
    );
  }

  return null;
};

// KioskRedirect component
const KioskRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isKiosk = localStorage.getItem("kiosk-mode") === "true";
    if (isKiosk && location.pathname !== "/checkin") {
      navigate("/checkin");
    }
  }, []);

  return null;
};

// NavLink component with active state handling
const NavLink = ({ to, children, icon: Icon, disabled = false }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  if (disabled) return null;

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

// Layout component with navigation
const Layout = ({ session, handleLogout, children }) => {
  const location = useLocation();
  const isKiosk = localStorage.getItem("kiosk-mode") === "true";

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const kioskParam = searchParams.get("kiosk");

    if (kioskParam === "true") {
      localStorage.setItem("kiosk-mode", "true");
    } else if (kioskParam === "false") {
      localStorage.setItem("kiosk-mode", "false");
    }
  }, [location.search]);

  if (isKiosk) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <main className="container mx-auto p-4 relative">
          {children}
          <NavigationControls />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 dark:from-gray-900 dark:to-purple-900 flex flex-col transition-colors duration-300">
      <MainNavbar session={session} handleLogout={handleLogout} />
      <main className="container justify-center items-center mx-auto mt-8 p-4 flex-grow flex relative">
        {children}
        <NavigationControls />
      </main>
    </div>
  );
};

const KioskRouteGuard = ({ children }) => {
  const location = useLocation();
  const isKiosk = localStorage.getItem("kiosk-mode") === "true";
  const allowedKioskPaths = ["/checkin", "/"];

  useEffect(() => {
    // Add kiosk parameter to URL when navigating in kiosk mode
    if (isKiosk && !location.search.includes("kiosk=true")) {
      const newUrl = `${location.pathname}${
        location.search ? "&" : "?"
      }kiosk=true`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [location, isKiosk]);

  if (isKiosk && !allowedKioskPaths.includes(location.pathname)) {
    return <Navigate to="/checkin?kiosk=true" replace />;
  }

  return children;
};

// BookingSystem wrapper component
const BookingSystemWrapper = () => {
  const { selectedFacility } = useFacility();
  if (!selectedFacility) {
    return <FacilitySelector />;
  }
  return <BookingSystem facilityId={selectedFacility.id} />;
};

// Main App component
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
      toast.error("Failed to fetch user role");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
        <div className="text-2xl font-bold text-pink-600">Načítava sa...</div>
      </div>
    );
  }

  return (
    <FacilityProvider>
      <Router>
        <KioskRedirect />
        <Layout
          session={session}
          userRole={userRole}
          handleLogout={handleLogout}
        >
          <KioskRouteGuard>
            <Routes>
              {userRole === "reception" ? (
                <>
                  <Route path="/reception" element={<ReceptionDashboard />} />
                  <Route
                    path="*"
                    element={<Navigate to="/reception" replace />}
                  />
                </>
              ) : userRole === "employee" ? (
                <>
                  <Route
                    path="/zamestnanec"
                    element={<EmployeeDashboard session={session} />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/zamestnanec" replace />}
                  />
                </>
              ) : (
                <>
                  <Route path="/" element={<BookingSystemWrapper />} />
                  <Route path="/checkin" element={<CheckIn />} />
                  <Route
                    path="/feedback/:appointmentId"
                    element={<FeedbackPage />}
                  />
                  {session && (
                    <>
                      {userRole === "employee" && (
                        <Route
                          path="/zamestnanec"
                          element={<EmployeeDashboard session={session} />}
                        />
                      )}
                      {userRole === "manager" && (
                        <Route path="/manazer" element={<ManagerDashboard />} />
                      )}
                      {userRole === "admin" && (
                        <>
                          <Route
                            path="/zamestnanec"
                            element={<EmployeeDashboard session={session} />}
                          />
                          <Route
                            path="/manazer"
                            element={<ManagerDashboard />}
                          />
                          <Route
                            path="/reception"
                            element={<ReceptionDashboard />}
                          />
                          <Route path="/admin" element={<AdminDashboard />} />
                        </>
                      )}
                    </>
                  )}
                  {!session && (
                    <Route
                      path="/login"
                      element={<AuthForm setSession={setSession} />}
                    />
                  )}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </KioskRouteGuard>
        </Layout>
      </Router>
    </FacilityProvider>
  );
}

export default App;
