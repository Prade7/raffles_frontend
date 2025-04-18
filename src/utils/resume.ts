import type { ResumeData, ParsedResume, FilterParams } from '../types/index';
import { getPresignedUrl } from './presignedUrl';

const API_URL = import.meta.env.VITE_MAIN_API_URL;
const PARSE_API_URL = import.meta.env.VITE_PARSE_API_URL;

export const uploadResume = async (file: File, accessToken: string): Promise<ResumeData> => {
  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'access': accessToken
      },
      body: file
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

export const parseResume = async (file: File, accessToken: string): Promise<ResumeData> => {
  try {
    const response = await fetch(`${PARSE_API_URL}/parse`, {
      method: 'POST',
      headers: {
        'access': accessToken
      },
      body: file
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to parse resume');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
};

export async function getResumes(accessToken: string, filters?: FilterParams): Promise<ResumeData[]> {
  console.log('Fetching resumes with filters:', filters);

  const response = await fetch('/api/list_data', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const data = await response.json();
  console.log('Resume list response:', data);

  if (response.status === 400) {
    throw new Error('token_expired');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch resumes');
  }

  return data;
}

interface UpdateProfileData {
  profile_id: number;
  name?: string;
  email?: string;
  mobile_no?: string;
  sector?: string;
  subsector?: string;
  current_salary?: string | null;
  expected_salary?: string | null;
  experience?: string;
  location?: string;
}

interface UpdateProfileResponse {
  statusCode: number;
  body: {
    status: string;
  };
}

export async function updateProfile(
  accessToken: string, 
  originalData: ResumeData,
  changedFields: Partial<UpdateProfileData>
): Promise<UpdateProfileResponse> {
  console.log('Updating profile with changed fields:', changedFields);

  const response = await fetch(`${API_URL}/update_profile`, {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_id: originalData.profile_id,
      ...changedFields
    })
  });

  const responseData = await response.json();
  console.log('Update profile response:', responseData);

  if (response.status === 400) {
    throw new Error('token_expired');
  }

  if (!response.ok) {
    throw new Error(responseData.body?.status || 'Failed to update profile');
  }

  return responseData;
}