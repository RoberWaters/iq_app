/**
 * API Client para autenticación
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class AuthAPI {
  constructor() {
    this.baseURL = API_URL;
  }

  /**
   * Realiza el login de un usuario
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} - Respuesta del servidor con token
   */
  async login(username, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al iniciar sesión');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  /**
   * Cambia la contraseña del usuario (requiere contraseña actual)
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<Object>} - Respuesta del servidor
   */
  async changePassword(currentPassword, newPassword) {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al cambiar la contraseña');
    }

    return response.json();
  }

  /**
   * Cambia la contraseña en el primer login
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<Object>} - Respuesta del servidor
   */
  async firstLoginChange(newPassword) {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/auth/first-login-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ new_password: newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al cambiar la contraseña');
    }

    return response.json();
  }

  /**
   * Obtiene la información del usuario autenticado
   * @returns {Promise<Object>} - Información del usuario
   */
  async getMe() {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al obtener información del usuario');
    }

    return response.json();
  }

  /**
   * Refresca el token JWT
   * @returns {Promise<Object>} - Nuevo token
   */
  async refreshToken() {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al refrescar el token');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  /**
   * Guarda el token en localStorage
   * @param {string} token - Token JWT
   */
  setToken(token) {
    localStorage.setItem('lab_simulator_token', token);
  }

  /**
   * Obtiene el token de localStorage
   * @returns {string|null} - Token JWT o null
   */
  getToken() {
    return localStorage.getItem('lab_simulator_token');
  }

  /**
   * Elimina el token de localStorage
   */
  removeToken() {
    localStorage.removeItem('lab_simulator_token');
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} - true si hay token
   */
  isAuthenticated() {
    return !!this.getToken();
  }
}

// Exportar instancia única
export const authAPI = new AuthAPI();
export default authAPI;
