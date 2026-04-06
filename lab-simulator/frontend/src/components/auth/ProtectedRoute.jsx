import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Componente de protección de rutas
 * 
 * Props:
 * - children: Componente hijo a renderizar
 * - requireTeacher: Si es true, solo permite acceso a docentes
 * - requireStudent: Si es true, solo permite acceso a estudiantes
 */
const ProtectedRoute = ({ 
  children, 
  requireTeacher = false, 
  requireStudent = false 
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    mustChangePassword, 
    user, 
    checkAuth, 
    isLoading 
  } = useAuthStore();
  
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // Solo verificar si no estamos autenticados
      if (!isAuthenticated) {
        await checkAuth();
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [checkAuth, isAuthenticated]);

  // Mostrar loading mientras verificamos
  if (isChecking || isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Si debe cambiar contraseña y NO está en la página de cambio de contraseña
  if (mustChangePassword && location.pathname !== '/change-password') {
    return (
      <Navigate 
        to="/change-password" 
        replace 
        state={{ firstLogin: true }} 
      />
    );
  }

  // Verificar rol de docente
  if (requireTeacher && user?.role !== 'teacher') {
    // Redirigir a prácticas si no es docente
    return <Navigate to="/practice" replace />;
  }

  // Verificar rol de estudiante
  if (requireStudent && user?.role !== 'student') {
    // Redirigir a prácticas si no es estudiante
    return <Navigate to="/practice" replace />;
  }

  // Todo bien, renderizar el componente hijo
  return children;
};

export default ProtectedRoute;
