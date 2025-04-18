// import type { LoginResponse } from '../types';

const API_URL = import.meta.env.VITE_MAIN_API_URL;

/**
 * Authenticates user with domain ID and password
 * @param domainId - User's domain ID
 * @param password - User's password
 * @returns LoginResponse containing access token and user role
 */
export const login = async (username: string, password: string): Promise<any> => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logs out the user by clearing session data
 * @returns Promise that resolves when logout is complete
 */
export async function logoutUser(): Promise<void> {
  console.log('Initiating user logout');
  
  // Clear local storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userRole');
  
  console.log('Session data cleared successfully');
}