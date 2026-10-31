// userData and Token
import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser } from "../api/authApi";

const AuthContext = createContext(null); // Apply when use useAuth() outer Provider
const TOKEN_KEY = "raccoon_access_token";

export function AuthProvider({ children }) {
  // Authentication State For register
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);

  // Session Restoration State
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState("");

  // Restore session when React starts
  useEffect(() => {
    let active = true;

    const savedToken = localStorage.getItem(TOKEN_KEY); // after refresh the page it will return the tokon

    if (!savedToken) {
      setIsRestoring(false);
      return undefined;
    }

    async function restoreSession() {
      try {
        // Verify saved token with FastAPI
        const profile = await getCurrentUser(savedToken);

        if (!active) return;

        setAccessToken(savedToken);
        setUser(profile);
        setRestoreError("");
      } catch (error) {
        if (!active) return;

        if (error.status === 401 || error.status === 403) {
          // Token is invalid
          localStorage.removeItem(TOKEN_KEY);

          setAccessToken(null);
          setUser(null);
        } else {
          // Network or server error
          setRestoreError("تعذر التحقق من جلسة الدخول. حاول مرة أخرى.");
        }
      } finally {
        if (active) {
          setIsRestoring(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // Login
  function signIn(token, userData) {
    localStorage.setItem(TOKEN_KEY, token); // save the jwt token in the browser

    setAccessToken(token);
    setUser(userData);
    setRestoreError("");
  }

  // Logout
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);

    setAccessToken(null);
    setUser(null);
    setRestoreError("");
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isRestoring,
        restoreError,
        signIn,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Customize Hooks
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
