import type { FilterValues } from '../types/index';

/**
 * Fetches available filter values from the API
 * @param accessToken - User's access token
 * @returns FilterValues containing available filter options
 */
export async function getFilterValues(accessToken: string): Promise<FilterValues> {
  const response = await fetch('/api/filter', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const data = await response.json();

  if (response.status === 400) {
    throw new Error('token_expired');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch filter values');
  }

  return data;
}