import type { LoginResponse } from '../types/index';

/**
 * Authenticates user with domain ID and password
 * @param domainId - User's domain ID
 * @param password - User's password
 * @returns LoginResponse containing access token and user role
 */
export async function loginUser(domainId: string, password: string): Promise<LoginResponse> {
  console.log('Attempting login for domain ID:', domainId);
  
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain_id: domainId,
      password: password
    }),
  });

  const data = await response.json();
  console.log('Login response status:', response.status);

  if (response.status === 401) {
    console.error('Authentication failed:', data.message);
    throw new Error(data.message || 'Invalid credentials');
  }

  if (!response.ok) {
    console.error('Login failed:', data.message);
    throw new Error(data.message || 'Login failed');
  }

  console.log('Login successful');
  return data;
}

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