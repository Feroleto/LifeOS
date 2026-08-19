import { Outlet } from "react-router";

import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-svh">
      <Sidebar />

      {/* 48px of padding, as in the design; the content spans the full width. */}
      <main className="min-w-0 flex-1 p-6 md:p-12">
        <Outlet />
      </main>
    </div>
  );
}
