import type { FilterValues } from '../types';

const API_URL = 'https://imfu5lsjndb67dohb67aaconwy0zimhy.lambda-url.ap-south-1.on.aws';

/**
 * Fetches available filter values from the API
 * @param accessToken - User's access token
 * @returns FilterValues containing available filter options
 */
export const getFilterValues = async (accessToken: string): Promise<FilterValues> => {
  try {
    const response = await fetch(`${API_URL}/filter`, {
      method: 'GET',
      headers: {
        'access': accessToken
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to fetch filter values');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching filter values:', error);
    throw error;
  }
};