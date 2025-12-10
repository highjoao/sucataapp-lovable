import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminUsers from "./pages/AdminUsers";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Stock from "./pages/Stock";
import Transactions from "./pages/Transactions";
import NewTransactions from "./pages/NewTransactions";
import Materials from "./pages/Materials";
import Clients from "./pages/Clients";
import Suppliers from "./pages/Suppliers";
import CashFlow from "./pages/CashFlow";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/plans" element={<Plans />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/new-transactions" element={<NewTransactions />} />
            <Route path="/cashflow" element={<CashFlow />} />

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
