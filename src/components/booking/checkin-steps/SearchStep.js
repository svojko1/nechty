import React from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertCircle, ArrowLeft } from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Alert, AlertDescription } from "src/components/ui/alert";

const SearchStep = ({
  searchTerm,
  onSearchTermChange,
  onSearch,
  onBack,
  isLoading = false,
  error = null,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    onSearch(searchTerm);
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-center text-pink-700 flex-grow pr-9">
            Vyhľadať rezerváciu
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Zadajte email alebo telefónne číslo"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="flex-grow"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !searchTerm.trim()}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Search className="h-5 w-5" />
                </motion.div>
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-sm text-gray-500 text-center">
            Vyhľadajte vašu rezerváciu pomocou emailu alebo telefónneho čísla
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SearchStep;
