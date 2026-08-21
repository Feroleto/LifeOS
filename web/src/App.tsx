import { Route, Routes } from "react-router";

import { AppLayout } from "@/components/layout/AppLayout";
import { NotFound } from "@/components/layout/NotFound";
import { AreaPage } from "@/features/areas/AreaPage";
import { AreasPage } from "@/features/areas/AreasPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { GoalsPage } from "@/features/goals/GoalsPage";
import { HabitsPage } from "@/features/habits/HabitsPage";
import { NotesPage } from "@/features/notes/NotesPage";
import { TimelinePage } from "@/features/timeline/TimelinePage";
import { RequireIdentity } from "@/identity/RequireIdentity";
import { SetupPage } from "@/identity/SetupPage";

export function App() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />

      <Route element={<RequireIdentity />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="areas" element={<AreasPage />} />
          <Route path="areas/:areaId" element={<AreaPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
