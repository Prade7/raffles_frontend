import type { FilterValues } from '../types';

/**
 * Fetches available filter values from the API
 * @param accessToken - User's access token
 * @returns FilterValues containing available filter options
 */
export async function getFilterValues(accessToken: string): Promise<FilterValues> {
  console.log('Fetching filter values');
  
  const response = await fetch('/api/filter', {
    method: 'GET',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json',
    }
  });

  const data = await response.json();
  console.log('Filter values response:', data);

  if (response.status === 400) {
    throw new Error('token_expired');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch filter values');
  }

  // The API response already matches our FilterValues interface
  return data;
}