import React from "react";
import {
  BrowserRouter,
  Routes, // paths container
  Route, //ربط الباث في الاليمنت
  Navigate, //nav user to another linke
  useLocation, // hooks give u the current link
} from "react-router-dom";

// Auth (Register / login)
import RegisterPage from "../features/auth/RegisterPage";
import LoginPage from "../features/auth/LoginPage";
import ForgotPasswordPage from "../features/auth/ForgotPasswordPage";
import ResetPasswordPage from "../features/auth/ResetPasswordPage";
import { AuthProvider, useAuth } from "../shared/auth/AuthContext";
import ScanPage from "../features/journey/ScanPage";
// Home
import HomePage from "../features/home/HomePage";
import ProtectedRoute from "../shared/auth/ProtectedRoute";

// Store Page
import StorePage from "../features/store/StorePage";
import PackagesPage from "../features/packages/PackagesPage";

// Admin
import AdminRoute from "../shared/auth/AdminRoute";
import AdminExperiencesPage from "../features/admin/AdminExperiencesPage";
import CreateExperiencePage from "../features/admin/CreateExperiencePage";
import UserManagementPage from "../features/admin/UserManagementPage";

// Profile Page
import ProfilePage from "../features/profile/ProfilePage";

// Customization Page
import CustomizationPage from "../features/customization/CustomizationPage";

// ClaimPackage
import ClaimPage from "../features/claim/ClaimPage";

function AppContent() {
  const location = useLocation(); // work only insdie BrowserRouter and App create useLocation(}
  const { accessToken } = useAuth();
  // Pages without Sidebar and Topbar
  const authPaths = [
    "/register",
    "/login",
    "/forgot-password",
    "/reset-password",
  ];
  const isAuthPage = authPaths.includes(location.pathname);

  return (
    <div>
      <main className={isAuthPage ? "" : "main-content"}>
        <Routes>
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanPage />
              </ProtectedRoute>
            }
          />
          {/* Default Route */}
          <Route
            path="/"
            element={
              <Navigate to={accessToken ? "/home" : "/register"} replace />
            }
          />
          {/* Element is the jsx file*/}
          {/* Authentication */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* The email link opens /reset-password?token=... */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/*Home page*/}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage /> {/*This is the child in protectect props */}
              </ProtectedRoute>
            }
          />
          {/*Profile page*/}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          {/*Store page*/}
          <Route path="/store" element={<StorePage />} />
          <Route
            path="/packages"
            element={
              <ProtectedRoute>
                <PackagesPage />
              </ProtectedRoute>
            }
          />
          {/*customization --> التخصيص */}
          <Route
            path="/customization"
            element={
              <ProtectedRoute>
                <CustomizationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customization/:eventId"
            element={
              <ProtectedRoute>
                <CustomizationPage />
              </ProtectedRoute>
            }
          />
          <Route path="/claim/:masterAuthHash" element={<ClaimPage />} />
          {/* Admin › إدارة التجارب */}
          <Route
            path="/admin/experiences"
            element={
              <AdminRoute>
                <AdminExperiencesPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/experiences/new"
            element={
              <AdminRoute>
                <CreateExperiencePage />
              </AdminRoute>
            }
          />
          {/* Admin › إدارة المستخدمين */}
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <UserManagementPage />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
