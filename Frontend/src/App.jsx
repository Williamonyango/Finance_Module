import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { ParishDetailPage } from "./pages/ParishDetailPage";
import { CentreDetailPage } from "./pages/CentreDetailPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { MemberDetailPage } from "./pages/MemberDetailPage";
import { ContributionManagementPage } from "./pages/ContributionManagementPage";
import { EntityManagementPage } from "./pages/EntityManagementPage";
import { ParishHierarchyPage } from "./pages/ParishHierarchyPage";
import { CentreMembersPage } from "./pages/CentreMembersPage";
import { useSession } from "./context/SessionContext";

function ProtectedRoute({ children }) {
  const { session, loading } = useSession();
  if (loading)
    return <div className="empty-state">Loading your workspace…</div>;
  return session ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ roles, children }) {
  const { session, loading } = useSession();
  if (loading)
    return <div className="empty-state">Loading your workspace…</div>;
  return roles.includes(session?.role) ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parishes/:parishId"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish", "centre", "group"]}>
                  <ParishDetailPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/centres/:centreId"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish", "centre", "group"]}>
                  <CentreDetailPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:groupId"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish", "centre", "group"]}>
                  <GroupDetailPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/members/:memberId"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish", "centre", "group"]}>
                  <MemberDetailPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contributions"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish", "centre", "group"]}>
                  <ContributionManagementPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/parishes"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["owner"]}>
                  <EntityManagementPage entity="parishes" />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/centres"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish"]}>
                  <EntityManagementPage entity="centres" />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish", "centre"]}>
                  <HierarchyListPage entity="groups" />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/members"
            element={
              <ProtectedRoute>
                <RoleRoute roles={["parish", "centre", "group"]}>
                  <HierarchyListPage entity="members" />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </>
  );
}

function HierarchyListPage({ entity }) {
  const { session } = useSession();
  if (session?.role === "parish")
    return <ParishHierarchyPage entity={entity} />;
  if (session?.role === "centre" && entity === "members")
    return <CentreMembersPage />;
  return <EntityManagementPage entity={entity} />;
}

export default App;
