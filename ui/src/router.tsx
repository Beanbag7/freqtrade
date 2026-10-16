import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { isAuthenticated } from "@/lib/auth";
import { PageSkeleton } from "@/components/shared/states";

function requireAuth() {
  if (!isAuthenticated()) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return null;
}

function lazyPage(factory: () => Promise<{ default: React.ComponentType }>) {
  const Component = lazy(factory);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: async () => {
      const { LoginPage } = await import("@/pages/login");
      return { Component: LoginPage };
    },
  },
  {
    path: "/",
    loader: requireAuth,
    element: (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
    children: [
      { index: true, element: lazyPage(() => import("@/pages/dashboard")) },
      { path: "trades", element: lazyPage(() => import("@/pages/trades")) },
      { path: "chart", element: lazyPage(() => import("@/pages/chart")) },
      { path: "pairs", element: lazyPage(() => import("@/pages/pairs")) },
      { path: "control", element: lazyPage(() => import("@/pages/control")) },
      { path: "backtest", element: lazyPage(() => import("@/pages/backtest")) },
      { path: "analysis", element: lazyPage(() => import("@/pages/analysis")) },
      { path: "download", element: lazyPage(() => import("@/pages/download")) },
      { path: "logs", element: lazyPage(() => import("@/pages/logs")) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
