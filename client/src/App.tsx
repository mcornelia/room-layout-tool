// Room Layout Tool — App Entry
// Philosophy: Professional Floor Plan Tool
// Light theme, single-page application

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnitProvider } from "./contexts/UnitContext";
import Home from "./pages/Home";

function AppRoutes() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Strip trailing slash so wouter base path works correctly
// e.g. "/room-layout-tool/" -> "/room-layout-tool"
const BASE_PATH = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

function App() {
  return (
    <ErrorBoundary>
      <UnitProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster position="bottom-right" />
            <Router base={BASE_PATH}>
              <AppRoutes />
            </Router>
          </TooltipProvider>
        </ThemeProvider>
      </UnitProvider>
    </ErrorBoundary>
  );
}

export default App;
