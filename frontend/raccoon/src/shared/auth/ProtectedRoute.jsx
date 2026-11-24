import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";

export default function ProtectedRoute({ children }) {
  const { t } = useTranslation();
  const { accessToken, user, isRestoring, restoreError } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (isRestoring) {
    return (
      <p role="status">
        {t("common.loading")}
      </p>
    );
  }

  if (restoreError) {
    return (
      <div role="alert">
        <p>{restoreError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          {t("common.retry")}
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
