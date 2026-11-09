import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { accessToken, user, isRestoring, restoreError } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (isRestoring) {
    return (
      <p dir="rtl" role="status">
        جاري التحميل...
      </p>
    );
  }

  if (restoreError) {
    return (
      <div dir="rtl" role="alert">
        <p>{restoreError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!accessToken || !user) {
    const tag = searchParams.get("tag");
    if (location.pathname === "/scan" && tag) {
      const sigParam = searchParams.get("sig"); 
      if (sigParam) {
        return <Navigate to={`/login?redirect_tag=${tag}&redirect_sig=${sigParam}`} replace />;
      }
      return <Navigate to={`/login?redirect_tag=${tag}`} replace />;
    }
    
    return <Navigate to="/login" replace />;
  }

  return children;
}
