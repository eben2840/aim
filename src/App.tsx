import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicOnlyRoute from "./components/common/PublicOnlyRoute";

// Auth
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";

// Dashboard
import Home from "./pages/Dashboard/Home";

// Inventory
import Products from "./pages/Inventory/Products";
import StockView from "./pages/Inventory/StockView";
import StockTransfer from "./pages/Inventory/StockTransfer";
import CategoryDashboard from "./pages/Inventory/CategoryDashboard";

// Orders
import PurchaseOrders from "./pages/Orders/PurchaseOrders";
import SalesOrders from "./pages/Orders/SalesOrders";

// Suppliers & Customers
import Suppliers from "./pages/Suppliers/Suppliers";
import Customers from "./pages/Customers/Customers";

// Locations
import Locations from "./pages/Locations/Locations";

// Receipts / OCR
import ReceiptUpload from "./pages/Receipts/ReceiptUpload";

// Alerts
import LowStockAlerts from "./pages/Alerts/LowStockAlerts";

// Reports
import Reports from "./pages/Reports/Reports";

// Profile
import UserProfiles from "./pages/UserProfiles";

// Team
import Team from "./pages/Team/Team";

// Calendar
import Calendar from "./pages/Calendar";

// Settings
import RestockSettings from "./pages/Settings/RestockSettings";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Root → sign in */}
          <Route path="/" element={<Navigate to="/abitrack/signin" replace />} />
          <Route path="/abitrack" element={<Navigate to="/abitrack/signin" replace />} />

          {/* Auth pages — public */}
          <Route
            path="/abitrack/signin"
            element={
              <PublicOnlyRoute>
                <SignIn />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/abitrack/signup"
            element={
              <PublicOnlyRoute>
                <SignUp />
              </PublicOnlyRoute>
            }
          />

          {/* App layout */}
          <Route
            path="/abitrack/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="categories/:category" element={<CategoryDashboard />} />
            <Route path="stock" element={<StockView />} />
            <Route path="stock-transfer" element={<StockTransfer />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="sales-orders" element={<SalesOrders />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="locations" element={<Locations />} />
            <Route path="receipt-upload" element={<ReceiptUpload />} />
            <Route path="low-stock-alerts" element={<LowStockAlerts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<UserProfiles />} />
            <Route path="team" element={<Team />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="settings" element={<RestockSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
