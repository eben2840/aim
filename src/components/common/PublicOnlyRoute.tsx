import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/abitrack/" replace />;
  }

  return <>{children}</>;
}
