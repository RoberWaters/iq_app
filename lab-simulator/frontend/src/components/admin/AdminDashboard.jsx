import { Navigate } from 'react-router-dom';

// Legacy admin route — import functionality now lives in SectionDetail (/teacher/section/:code)
export default function AdminDashboard() {
  return <Navigate to="/teacher" replace />;
}
