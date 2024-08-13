import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import {
  Sparkles,
  Menu,
  X,
  Instagram,
  Facebook,
  Twitter,
  Sun,
  Moon,
  User,
  Settings,
  Calendar,
  Users,
  BarChart,
  Star,
} from "lucide-react";
import { ScrollArea } from "./components/ui/scroll-area";
import { cn } from "./lib/utils";

import BookingSystem from "./components/BookingSystem";
import ManagerDashboard from "./components/ManagerDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import FeedbackPage from "./components/FeedbackSystem";

const services = [
  {
    name: "Manikúra",
    description: "Klasická manikúra s lakom podľa výberu",
    icon: "💅",
  },
  {
    name: "Pedikúra",
    description: "Relaxačná pedikúra s masážou chodidiel",
    icon: "👣",
  },
  {
    name: "Gélové nechty",
    description: "Modeláž gélových nechtov s dizajnom",
    icon: "✨",
  },
  {
    name: "Akrylové nechty",
    description: "Profesionálna modeláž akrylových nechtov",
    icon: "💎",
  },
];

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

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

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

  const headerClass = scrollY > 50 ? "py-2 shadow-lg" : "py-4";

  return (
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
                  Glam Nails
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
                      <NavLink to="/feedback" icon={Star}>
                        Hodnotenie
                      </NavLink>
                    </NavigationMenuItem>
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
                    {services.map((service) => (
                      <li key={service.name}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left"
                        >
                          <span className="mr-2">{service.icon}</span>
                          {service.name}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="container mx-auto mt-8 p-4 flex-grow">
          <Routes>
            <Route path="/" element={<BookingSystem />} />
            <Route path="/zamestnanec" element={<EmployeeDashboard />} />
            <Route path="/manazer" element={<ManagerDashboard />} />
            <Route path="/feedback" element={<FeedbackPage />} />
          </Routes>
        </main>

        <footer className="bg-gradient-to-r from-pink-500 to-purple-600 dark:from-pink-800 dark:to-purple-900 text-white mt-12 py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Glam Nails</h2>
                <p className="text-pink-100 dark:text-pink-200">
                  Vaše krásne nechty sú našou prioritou. Navštívte nás a
                  doprajte si luxusnú starostlivosť.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Kontakt</h3>
                <p className="text-pink-100 dark:text-pink-200">
                  123 Hlavná ulica
                  <br />
                  Bratislava, 81101
                  <br />
                  Tel: +421 123 456 789
                  <br />
                  Email: info@glamnails.sk
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Sledujte nás</h3>
                <div className="flex space-x-4">
                  <a
                    href="#"
                    className="text-white hover:text-pink-200 transition-colors"
                  >
                    <Instagram />
                  </a>
                  <a
                    href="#"
                    className="text-white hover:text-pink-200 transition-colors"
                  >
                    <Facebook />
                  </a>
                  <a
                    href="#"
                    className="text-white hover:text-pink-200 transition-colors"
                  >
                    <Twitter />
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-8 text-center text-pink-100 dark:text-pink-200">
              <p>&copy; 2024 Glam Nails. Všetky práva vyhradené.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
