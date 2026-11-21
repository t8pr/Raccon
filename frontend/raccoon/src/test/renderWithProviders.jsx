// يلف المكوّن أو الـhook بنفس الـproviders اللي في index.js و App.js:
// QueryClient → Router → AuthProvider. التوكن يُحفظ قبل الرسم مثل مستخدم داخل فعلًا.
import { StrictMode } from "react";
import { render, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { expect } from "vitest";

import { AuthProvider } from "../shared/auth/AuthContext";
import { setToken } from "../shared/auth/tokenStore";
import { queryKeys } from "../shared/constants/queryKeys";

export const TEST_TOKEN = "test-token";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/*
  options:
    token           توكن الدخول، أو null لزائر (الافتراضي: TEST_TOKEN)
    route           الرابط الابتدائي (الافتراضي: "/")، أو { pathname, search, state }
    queryClient     لو تبي تفحص الكاش بعد الاختبار
    strict          يشغّل StrictMode مثل التطوير (الـeffects تشتغل مرتين)
*/
function setup({
  token = TEST_TOKEN,
  route = "/",
  queryClient = createTestQueryClient(),
  strict = false,
} = {}) {
  if (token) setToken(token);

  // آخر رابط وصل له التطبيق، لفحص التنقل (navigate)
  const location = { current: null };

  function LocationSpy() {
    location.current = useLocation();
    return null;
  }

  function Providers({ children }) {
    const tree = (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            {children}
            <LocationSpy />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  }

  return { Providers, queryClient, location };
}

export function renderWithProviders(ui, options) {
  const { Providers, queryClient, location } = setup(options);

  return { queryClient, location, ...render(ui, { wrapper: Providers }) };
}

// ينتظر تحميل الحساب (GET /users/me)، مثل ProtectedRoute قبل ما يعرض الصفحة
export async function waitForSignIn(queryClient, token = TEST_TOKEN) {
  await waitFor(() =>
    expect(queryClient.getQueryData(queryKeys.profile(token))).toBeDefined(),
  );
}

export function renderHookWithProviders(hook, options = {}) {
  const { Providers, queryClient, location } = setup(options);

  return {
    queryClient,
    location,
    ...renderHook(hook, {
      wrapper: Providers,
      initialProps: options.initialProps,
    }),
  };
}
