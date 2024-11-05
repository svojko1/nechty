import React, { useState } from "react";

import { supabase } from "src/supabaseClient";
import { toast } from "react-hot-toast";
import { AlertCircle } from "lucide-react";

//UI Components
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "src/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/components/ui/tabs";
import { Alert, AlertDescription } from "src/components/ui/alert";

//Functional Components
import EmployeeRegistration from "src/components/auth/EmployeeRegistration";

const AuthForm = ({ setSession }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEmployeeRegistered, setIsEmployeeRegistered] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user role from the users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (userError) throw userError;

      // Update the session with the user's role
      setSession({
        ...data.session,
        user: { ...data.user, role: userData.role },
      });
      toast.success(`Welcome back, ${data.user.user_metadata.first_name}!`);
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeRegistration = () => {
    setIsEmployeeRegistered(true);
  };

  return (
    <Card className="w-[350px] bg-white shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Glam Nails
        </CardTitle>
        <CardDescription className="text-center">
          Prihláste sa alebo si vytvorte nový účet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Prihlásiť</TabsTrigger>
            <TabsTrigger value="employee">Registrovať</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Heslo</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button className="w-full mt-4" type="submit" disabled={loading}>
                {loading ? "Prihlasovanie..." : "Prihlásiť"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="employee">
            {isEmployeeRegistered ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Vaša žiadosť o registráciu bola prijatá. Administrátor ju musí
                  schváliť pred tým, ako sa budete môcť prihlásiť.
                </AlertDescription>
              </Alert>
            ) : (
              <EmployeeRegistration
                onRegistrationComplete={handleEmployeeRegistration}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500 text-center">
          Registráciou súhlasíte s našimi podmienkami používania a zásadami
          ochrany osobných údajov.
        </p>
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
