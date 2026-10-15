import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AppLayout from "@/components/AppLayout";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Transactions from "./pages/Transactions";
import Bills from "./pages/Bills";
import Debts from "./pages/Debts";
import Installments from "./pages/Installments";
import Insurances from "./pages/Insurances";
import Zakat from "./pages/Zakat";
import Promotions from "./pages/Promotions";
import Assets from "./pages/Assets";
import Courses from "./pages/Courses";
import Tasks from "./pages/Tasks";
import Definitions from "./pages/Definitions";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/islemler" component={Transactions} />
        <Route path="/faturalar" component={Bills} />
        <Route path="/borclar" component={Debts} />
        <Route path="/taksitler" component={Installments} />
        <Route path="/sigortalar" component={Insurances} />
        <Route path="/zekat" component={Zakat} />
        <Route path="/promosyonlar" component={Promotions} />
        <Route path="/birikimler" component={Assets} />
        <Route path="/kurslar" component={Courses} />
        <Route path="/gorevler" component={Tasks} />
        <Route path="/tanimlar" component={Definitions} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="bottom-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
