import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "../api/usersApi";
import { clearToken, getToken, setToken } from "./tokenStore";
import { queryKeys } from "../constants/queryKeys";

const AuthContext = createContext(null);

function createSession(token) {
  return {
    token,
    key: crypto.randomUUID(),
  };
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const [session, setSession] = useState(() =>
    createSession(getToken()),
  );

  const [accountDeleted, setAccountDeleted] = useState(false);

  const accessToken = session.token;
  const profileKey = queryKeys.profile(accessToken);

  const profileQuery = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => getCurrentUser({ token: accessToken, signal }),
    enabled: Boolean(accessToken) && !accountDeleted,
    staleTime: 60_000,
    retry: false,
  });

  const unauthorized =
    profileQuery.error?.status === 401 || profileQuery.error?.status === 403;

  const user =
    accessToken && !unauthorized ? (profileQuery.data ?? null) : null;

  const isRestoring =
    Boolean(accessToken) && profileQuery.isPending && !accountDeleted;

  const restoreError =
    accessToken &&
    !accountDeleted &&
    !unauthorized &&
    profileQuery.isError &&
    !profileQuery.data
      ? "تعذر التحقق من جلسة الدخول. حاول مرة أخرى."
      : "";

  const clearSession = useCallback(() => {
    clearToken();
    void queryClient.cancelQueries({ queryKey: queryKeys.profile() });
    queryClient.removeQueries({ queryKey: queryKeys.profile() });
    setAccountDeleted(false);
    setSession(createSession(null));
  }, [queryClient]);

  useEffect(() => {
    if (unauthorized) {
      clearSession();
    }
  }, [unauthorized, clearSession]);

  function signIn(token, userData) {
    const nextSession = createSession(token);

    void queryClient.cancelQueries({
      queryKey: queryKeys.profile(),
    });
    queryClient.removeQueries({
      queryKey: queryKeys.profile(),
    });

    setToken(token);
    queryClient.setQueryData(queryKeys.profile(token), userData);
    setAccountDeleted(false);
    setSession(nextSession);
  }

  async function updateUser(updatedUser) {
    await queryClient.cancelQueries({
      queryKey: profileKey,
      exact: true,
    });
    queryClient.setQueryData(profileKey, updatedUser);
  }

  async function markAccountDeleted() {
    clearToken();
    setSession(createSession(null));
    setAccountDeleted(true);
    await queryClient.cancelQueries({
      queryKey: profileKey,
      exact: true,
    });
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
        updateUser,
        markAccountDeleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
