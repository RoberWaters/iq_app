import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';

// Layout components
import Header from './components/layout/Header';
import StepIndicator from './components/layout/StepIndicator';

// Auth components
import LoginForm from './components/auth/LoginForm';
import ChangePassword from './components/auth/ChangePassword';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Simulator stages (student)
import S1_PracticeSelect from './components/stages/S1_PracticeSelect';
import S2_MaterialSetup from './components/stages/S2_MaterialSetup';
import S3_Measurement from './components/stages/S3_Measurement';
import S4_Assembly from './components/stages/S4_Assembly';
import S5_Execution from './components/stages/S5_Execution';
import S6_Recording from './components/stages/S6_Recording';
import S7_Calculation from './components/stages/S7_Calculation';
import S8_TitrationCurve from './components/stages/S8_TitrationCurve';
import S9_Evaluation from './components/stages/S9_Evaluation';

// Teacher components
import TeacherDashboard from './components/teacher/TeacherDashboard';
import SectionDetail from './components/teacher/SectionDetail';
import AdminDashboard from './components/admin/AdminDashboard';

// Store
import useSimulatorStore from './store/useSimulatorStore';

// Placeholder components
const Unauthorized = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Acceso No Autorizado</h1>
    <p>No tiene permisos para acceder a esta página.</p>
  </div>
);

const NotFound = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Página No Encontrada</h1>
    <p>La ruta solicitada no existe.</p>
  </div>
);

// Componente de redirección basado en rol - ESPERA a que cargue la auth
const RoleBasedRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  
  // Mientras carga, mostrar nada o un spinner
  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>;
  }
  
  // Si no está autenticado, ir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Si está autenticado, redirigir según rol
  if (user?.role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }
  
  return <Navigate to="/practice" replace />;
};

function App() {
  const { practiceId } = useSimulatorStore();
  const location = useLocation();
  const { checkAuth } = useAuthStore();

  // Verificar autenticación al cargar la app
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Determinar si es ruta de teacher (sin header ni step indicator)
  const isTeacherRoute = location.pathname.startsWith('/teacher') || 
                         location.pathname.startsWith('/admin');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isTeacherRoute && <Header />}
      {!isTeacherRoute && practiceId && <StepIndicator />}
      
      <main style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            
            {/* ========== RUTAS PÚBLICAS ========== */}
            <Route path="/login" element={<LoginForm />} />

            {/* ========== RUTAS PROTEGIDAS (TODOS LOS ROLES) ========== */}
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              }
            />

            {/* ========== RUTA BASE DEL ESTUDIANTE ========== */}
            <Route
              path="/practice"
              element={
                <ProtectedRoute>
                  <S1_PracticeSelect />
                </ProtectedRoute>
              }
            />
            
            {/* ========== RUTAS DE ESTUDIANTE (ETAPAS) ========== */}
            <Route
              path="/practice/:id/stage/2"
              element={
                <ProtectedRoute>
                  <S2_MaterialSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:id/stage/3"
              element={
                <ProtectedRoute>
                  <S3_Measurement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:id/stage/4"
              element={
                <ProtectedRoute>
                  <S4_Assembly />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:id/stage/5"
              element={
                <ProtectedRoute>
                  <S5_Execution />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:id/stage/6"
              element={
                <ProtectedRoute>
                  <S6_Recording />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:id/stage/7"
              element={
                <ProtectedRoute>
                  <S7_Calculation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:id/stage/8"
              element={
                <ProtectedRoute>
                  <S8_TitrationCurve />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:id/stage/9"
              element={
                <ProtectedRoute>
                  <S9_Evaluation />
                </ProtectedRoute>
              }
            />

            {/* ========== RUTAS DE DOCENTE ========== */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute requireTeacher={true}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/section/:sectionId"
              element={
                <ProtectedRoute requireTeacher={true}>
                  <SectionDetail />
                </ProtectedRoute>
              }
            />
            
            {/* Admin/CSV Import - También solo para docentes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireTeacher={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* ========== RUTAS DE ERROR ========== */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* ========== REDIRECCIONES ========== */}
            {/* Redirección principal basada en rol - ESPERA a que cargue la auth */}
            <Route path="/" element={<RoleBasedRedirect />} />

            {/* Redirección de /practices antiguo a /practice nuevo */}
            <Route path="/practices" element={<Navigate to="/practice" replace />} />

            {/* ========== 404 ========== */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;