// Admin pages only: signed-in users who aren't admins go back to their homes.
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "./AuthContext";

function AdminOnly({ children }) {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <AdminOnly>{children}</AdminOnly>
    </ProtectedRoute>
  );
}
