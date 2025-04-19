import type { FilterParams, ResumeListResponse, PresignedUrlResponse, ResumeData } from '../types';

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
    const filenames = files.map(file => file.name);
    const presignedUrlResponses = await fetch(`${API_URL}/presigned_url`, {
      method: 'POST',
      headers: {
        'access': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: filenames,
        signatureType: 'upload'
      })
    });

    if (!presignedUrlResponses.ok) {
      if (presignedUrlResponses.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to get presigned URLs');
    }

    const data = await presignedUrlResponses.json();
    console.log('Presigned URL response:', data);

    // Call uploadFilesToS3 to upload the files
    const results = await uploadFilesToS3(files, data, accessToken);
    return results;
  } catch (error) {
    console.error('Error getting presigned URLs:', error);
    throw error;
  }
};

export const uploadFilesToS3 = async (files: File[], presignedUrlResponses: PresignedUrlResponse[], accessToken: string) => {
  try {
    const results: ResumeData[] = [];

    // Upload each file using its presigned URL asynchronously
    const uploadPromises = files.map((file, index) => {
      const presignedUrlResponse = presignedUrlResponses[index];

      console.log(`Uploading file: ${file.name} to S3 using URL: ${presignedUrlResponse.url}`);
      return fetch(presignedUrlResponse.url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: file
      }).then(uploadResponse => {
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to S3');
        }
        console.log(`Successfully uploaded file: ${file.name}`);
      });
    });

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Send a list of file details to the /parse API
    const fileDetails = files.map((file, index) => ({
      file_name: presignedUrlResponses[index].file_name,
      original_name: file.name
    }));

    console.log(`Calling /parse API for files:`, fileDetails);
    const parseResponse = await fetch(`${PARSE_API_URL}/parse`, {
      method: 'POST',
      headers: {
        'access': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: fileDetails
      })
    });

    console.log(`Parse API response status: ${parseResponse.status}`);

    if (!parseResponse.ok) {
      if (parseResponse.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to parse resumes');
    }

    const data = await parseResponse.json();
    console.log(`Successfully parsed files:`, data);
    results.push(...data);

    return results;
  } catch (error) {
    console.error('Error during upload process:', error);
    throw error;
  }
};