import type { FilterParams, ResumeListResponse } from '../types';

export * from './auth';
export * from './resume';
export * from './presignedUrl';
export * from './filters';

const API_URL = 'https://imfu5lsjndb37dohb67aaconwy0zimhy.lambda-url.ap-south-1.on.aws';
const PARSE_API_URL = 'https://tf7hw5m2253i2atsm2q3mke5em0jmxfh.lambda-url.ap-south-1.on.aws';

// Helper function to get the correct API URL
const getApiUrl = (endpoint: string, isParseApi: boolean = false) => {
  const baseUrl = isParseApi ? PARSE_API_URL : API_URL;
  return `${baseUrl}${endpoint}`;
};

export const getResumes = async (accessToken: string, filters?: FilterParams, page: number = 1, limit: number = 10): Promise<ResumeListResponse> => {
  try {
    console.log('Making API call to:', `${API_URL}/list_data`);
    console.log('With filters:', filters);
    console.log('Page:', page, 'Limit:', limit);

    const response = await fetch(`${API_URL}/list_data`, {
      method: 'POST',
      headers: {
        'access': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...filters,
        page,
        limit
      })
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to fetch resumes');
    }

    const data = await response.json();
    console.log('API Response data:', data);

    if (!data.resume_data || !Array.isArray(data.resume_data)) {
      throw new Error('Invalid response format');
    }

    return {
      resume_data: data.resume_data,
      total_count: data.total_count || data.resume_data.length
    };
  } catch (error) {
    console.error('Error fetching resumes:', error);
    throw error;
  }
};

export const loginUser = async (domainId: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain_id: domainId, password })
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

export const logoutUser = async () => {
  // Clear local storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userRole');
};

export const uploadResume = async (files: File[], accessToken: string) => {
  try {
    const response = await fetch(`${API_URL}/presigned_url`, {
      method: 'POST',
      headers: {
        'access': accessToken
      },
      body: files[0]
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to upload resume');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading resume:', error);
    throw error;
  }
};