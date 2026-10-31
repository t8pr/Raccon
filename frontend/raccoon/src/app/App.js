import React from "react";
import {
  BrowserRouter,
  Routes, // paths container
  Route, //ربط الباث في الاليمنت
  Navigate, //nav user to another linke
  useLocation, // hooks give u the current link
} from "react-router-dom";

// Auth
import RegisterPage from "../pages/auth/RegisterPage";
import LoginPage from "../pages/auth/LoginPage";
import { AuthProvider } from "../context/AuthContext";
import ScanPage from "../pages/journey/ScanPage";
// Home
import HomePage from "../pages/Home/HomePage";
import ProtectedRoute from "../pages/auth/ProtectedRoute";

function AppContent() {
  const location = useLocation(); // work only insdie BrowserRouter and App create useLocation(}

  // Pages without Sidebar and Topbar
  const isAuthPage =
    location.pathname === "/register" || location.pathname === "/login";

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
          <Route path="/" element={<Navigate to="/register" replace />} />{" "}
          {/* Element is the jsx file*/}
          {/* Authentication */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/*Home page*/}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage /> {/*This is the child in protectect props */}
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
