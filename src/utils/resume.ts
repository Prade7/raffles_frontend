import type { ResumeData, ParsedResume, FilterParams } from '../types/index';
import { getPresignedUrl } from './presignedUrl';

const API_URL = "https://imfu5lsjndb37dohb67aaconwy0zimhy.lambda-url.ap-south-1.on.aws";
const PARSE_API_URL = "https://tf7hw5m2253i2atsm2q3mke5em0jmxfh.lambda-url.ap-south-1.on.aws";

export const uploadResume = async (files: File[], accessToken: string): Promise<ResumeData[]> => {
  try {
    // Get presigned URLs for all files
    const filenames = files.map(file => file.name);
    console.log('Requesting presigned URLs for files:', filenames);
    const presignedUrlResponses = await getPresignedUrl(filenames, accessToken);
    console.log('Received presigned URLs:', presignedUrlResponses);
    
    if (!presignedUrlResponses || presignedUrlResponses.length === 0) {
      throw new Error('Failed to get presigned URLs');
    }

    const results: ResumeData[] = [];

    // Upload each file using its presigned URL
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const presignedUrlResponse = presignedUrlResponses[i];

      console.log(`Uploading file: ${file.name} to S3 using URL: ${presignedUrlResponse.url}`);
      // Upload file to S3 using the presigned URL
      const uploadResponse = await fetch(presignedUrlResponse.url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream'  // Set to binary
        },
        body: file  // Send file as binary
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }
      console.log(`Successfully uploaded file: ${file.name}`);

      console.log(`Parsing uploaded file: ${presignedUrlResponse.file_name}`);
      // Parse the uploaded file
      const parseResponse = await fetch(`${PARSE_API_URL}/parse`, {
        method: 'POST',
        headers: {
          'access': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_name: presignedUrlResponse.file_name
        })
      });

      if (!parseResponse.ok) {
        if (parseResponse.status === 401) {
          throw new Error('Token expired');
        }
        throw new Error('Failed to parse resume');
      }

      const data = await parseResponse.json();
      console.log(`Successfully parsed file: ${presignedUrlResponse.file_name}`);
      results.push(data);
    }

    return results;
  } catch (error) {
    console.error('Error uploading resumes:', error);
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