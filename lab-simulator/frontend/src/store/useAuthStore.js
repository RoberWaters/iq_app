import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../api/auth';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado - IMPORTANTE: isLoading empieza en true
      user: null,
      profile: null,
      isAuthenticated: false,
      mustChangePassword: false,
      isLoading: true, // ← CAMBIO: true inicialmente
      error: null,

      // Acciones
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.login(username, password);
          
          set({
            user: response.user,
            profile: response.profile,
            isAuthenticated: true,
            mustChangePassword: response.user.must_change_password,
            isLoading: false,
            error: null,
          });

          return {
            success: true,
            mustChangePassword: response.user.must_change_password,
            user: response.user, // ← Agregar user para la redirección
          };
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Error al iniciar sesión',
          });
          return { success: false, error: error.message };
        }
      },

      logout: () => {
        authAPI.removeToken();
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          mustChangePassword: false,
          isLoading: false, // ← Resetear loading
          error: null,
        });
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        
        try {
          await authAPI.changePassword(currentPassword, newPassword);
          
          set({
            mustChangePassword: false,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Error al cambiar la contraseña',
          });
          return { success: false, error: error.message };
        }
      },

      firstLoginChange: async (newPassword) => {
        set({ isLoading: true, error: null });
        
        try {
          await authAPI.firstLoginChange(newPassword);
          
          set({
            mustChangePassword: false,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (error) {
          set({
            isLoading: false,
            error: error.message || 'Error al cambiar la contraseña',
          });
          return { success: false, error: error.message };
        }
      },

      checkAuth: async () => {
        // ← IMPORTANTE: Setear loading true al inicio
        set({ isLoading: true });
        
        const token = authAPI.getToken();
        
        if (!token) {
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            mustChangePassword: false,
            isLoading: false, // ← Terminó de cargar
          });
          return false;
        }

        try {
          const userData = await authAPI.getMe();
          
          set({
            user: {
              username: userData.username,
              role: userData.role,
              must_change_password: userData.must_change_password,
              email: userData.email,
            },
            profile: userData.teacher_profile || userData.student_profile,
            isAuthenticated: true,
            mustChangePassword: userData.must_change_password,
            isLoading: false, // ← Terminó de cargar
            error: null,
          });

          return true;
        } catch (error) {
          authAPI.removeToken();
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            mustChangePassword: false,
            isLoading: false, // ← Terminó de cargar
          });
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'lab-simulator-auth',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);

export default useAuthStore;