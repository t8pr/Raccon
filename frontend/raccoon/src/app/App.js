import React from "react";
import {
  BrowserRouter,
  Routes, // paths container
  Route, //ربط الباث في الاليمنت
  Navigate, //nav user to another linke
  useLocation, // hooks give u the current link
} from "react-router-dom";

// Auth (Register / login)
import RegisterPage from "../pages/auth/RegisterPage";
import LoginPage from "../pages/auth/LoginPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import { AuthProvider } from "../context/AuthContext";

// Home
import HomePage from "../pages/Home/HomePage";
import ProtectedRoute from "../pages/auth/ProtectedRoute";

// Store Page
import StorePage from "../pages/Store/StorePage";
import PackagesPage from "../pages/Packages/PackagesPage";
import CustomizationPage from "../pages/Customization/CustomizationPage";

// Profile Page
import ProfilePage from "../pages/Profile/ProfilePage";

function AppContent() {
  const location = useLocation(); // work only insdie BrowserRouter and App create useLocation(}

  // Pages without Sidebar and Topbar
  const authPaths = ["/register", "/login", "/forgot-password", "/reset-password"];
  const isAuthPage = authPaths.includes(location.pathname);

  return (
    <div>
      <main className={isAuthPage ? "" : "main-content"}>
        <Routes>
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/register" replace />} />{" "}
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
            path="/customization/:packageId"
            element={
              <ProtectedRoute>
                <CustomizationPage />
              </ProtectedRoute>
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
