import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import './ChangePassword.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { changePassword, firstLoginChange, logout, isLoading, error, clearError } = useAuthStore();

  // Detectar si es primer login
  const isFirstLogin = location.state?.firstLogin === true;

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Validaciones de contraseña
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 6) {
      errors.push('Mínimo 6 caracteres');
    }
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Al menos una letra');
    }
    if (!/\d/.test(password)) {
      errors.push('Al menos un número');
    }
    return errors;
  };

  const validateForm = () => {
    const errors = {};

    // Validar contraseña actual (solo si no es primer login)
    if (!isFirstLogin && !formData.currentPassword) {
      errors.currentPassword = 'La contraseña actual es requerida';
    }

    // Validar nueva contraseña
    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      errors.newPassword = passwordErrors.join(', ');
    }

    // Validar confirmación
    if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar error del campo
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    // Limpiar mensajes
    if (error) clearError();
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    let result;

    if (isFirstLogin) {
      // Cambio de contraseña en primer login
      result = await firstLoginChange(formData.newPassword);
    } else {
      // Cambio de contraseña normal
      result = await changePassword(formData.currentPassword, formData.newPassword);
    }

    if (result.success) {
      setSuccessMessage('Contraseña cambiada exitosamente');
      
      // Redirigir después de un breve delay
      setTimeout(() => {
        navigate('/practices');
      }, 1500);
    }
  };

  const handleCancel = () => {
    if (isFirstLogin) {
      // En primer login, cancelar hace logout
      logout();
      navigate('/login');
    } else {
      navigate('/practices');
    }
  };

  // Calcular fortaleza de la contraseña
  const getPasswordStrength = (password) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    if (/[a-zA-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);
  const strengthLabels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte', 'Muy fuerte'];
  const strengthColors = ['#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a', '#15803d'];

  return (
    <div className="change-password-container">
      <motion.div
        className="change-password-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="change-password-header">
          <div className="change-password-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
              <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="change-password-title">
            {isFirstLogin ? 'Bienvenido' : 'Cambiar Contraseña'}
          </h1>
          <p className="change-password-subtitle">
            {isFirstLogin 
              ? 'Establezca una nueva contraseña para continuar'
              : 'Actualice su contraseña de acceso'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="change-password-form">
          {/* Error global */}
          {error && (
            <motion.div
              className="error-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <svg className="error-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              {error}
            </motion.div>
          )}

          {/* Success message */}
          {successMessage && (
            <motion.div
              className="success-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <svg className="success-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {successMessage}
            </motion.div>
          )}

          {/* Current password (solo si no es primer login) */}
          {!isFirstLogin && (
            <div className="input-group">
              <label htmlFor="currentPassword">Contraseña Actual</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Ingrese su contraseña actual"
                  disabled={isLoading}
                  className={formErrors.currentPassword ? 'error' : ''}
                  autoComplete="current-password"
                />
              </div>
              {formErrors.currentPassword && (
                <span className="error-message">{formErrors.currentPassword}</span>
              )}
            </div>
          )}

          {/* New password */}
          <div className="input-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Ingrese su nueva contraseña"
                disabled={isLoading}
                className={formErrors.newPassword ? 'error' : ''}
                autoComplete="new-password"
              />
            </div>
            {formErrors.newPassword && (
              <span className="error-message">{formErrors.newPassword}</span>
            )}

            {/* Password strength indicator */}
            {formData.newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`strength-segment ${passwordStrength >= level ? 'active' : ''}`}
                      style={{
                        backgroundColor: passwordStrength >= level ? strengthColors[passwordStrength] : '#e5e7eb'
                      }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColors[passwordStrength] }}>
                  {strengthLabels[passwordStrength]}
                </span>
              </div>
            )}

            {/* Password requirements */}
            <div className="password-requirements">
              <p>La contraseña debe tener:</p>
              <ul>
                <li className={formData.newPassword.length >= 6 ? 'met' : ''}>
                  <svg viewBox="0 0 24 24" fill="none">
                    {formData.newPassword.length >= 6 ? (
                      <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    ) : (
                      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                    )}
                  </svg>
                  Mínimo 6 caracteres
                </li>
                <li className={/[a-zA-Z]/.test(formData.newPassword) ? 'met' : ''}>
                  <svg viewBox="0 0 24 24" fill="none">
                    {/[a-zA-Z]/.test(formData.newPassword) ? (
                      <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    ) : (
                      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                    )}
                  </svg>
                  Al menos una letra
                </li>
                <li className={/\d/.test(formData.newPassword) ? 'met' : ''}>
                  <svg viewBox="0 0 24 24" fill="none">
                    {/\d/.test(formData.newPassword) ? (
                      <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    ) : (
                      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                    )}
                  </svg>
                  Al menos un número
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm password */}
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirme su nueva contraseña"
                disabled={isLoading}
                className={formErrors.confirmPassword ? 'error' : ''}
                autoComplete="new-password"
              />
            </div>
            {formErrors.confirmPassword && (
              <span className="error-message">{formErrors.confirmPassword}</span>
            )}
          </div>

          {/* Buttons */}
          <div className="button-group">
            <motion.button
              type="submit"
              className="btn btn-primary change-password-btn"
              disabled={isLoading || successMessage}
              whileHover={{ scale: isLoading || successMessage ? 1 : 1.02 }}
              whileTap={{ scale: isLoading || successMessage ? 1 : 0.98 }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar Contraseña</span>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </motion.button>

            {isFirstLogin && (
              <motion.button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                Cancelar
              </motion.button>
            )}
          </div>
        </form>

        {/* Info */}
        <div className="change-password-info">
          <p>
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {isFirstLogin 
              ? 'Debe cambiar su contraseña temporal antes de continuar'
              : 'Su contraseña debe cumplir con los requisitos de seguridad'
            }
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
