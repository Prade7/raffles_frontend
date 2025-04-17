import type { ResumeData, ParsedResume, FilterParams } from '../types';
import { getPresignedUrl } from './presignedUrl';

export async function uploadResume(files: File[], accessToken: string): Promise<ParsedResume[]> {
  try {
    // Step 1: Get presigned URLs for all files
    console.log('Step 1: Getting presigned URLs for files:', files.map(f => f.name));
    const presignedUrls = await getPresignedUrl(files.map(f => f.name), accessToken);
    console.log('Received presigned URLs:', presignedUrls);

    // Step 2: Upload all files using presigned URLs
    console.log('Step 2: Uploading files to presigned URLs');
    const uploadPromises = files.map(async (file, index) => {
      const presignedUrl = presignedUrls[index];
      console.log('Uploading file:', file.name);
      console.log('Using presigned URL:', presignedUrl.url);
      console.log('Generated filename:', presignedUrl.file_name);
      console.log('File type:', file.type);
      console.log('File size:', file.size, 'bytes');

      try {
        const uploadResponse = await fetch(presignedUrl.url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          },
          mode: 'cors'
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed with status:', uploadResponse.status);
          console.error('Error response:', errorText);
          throw new Error(`Upload failed for ${file.name}: ${errorText}`);
        }

        console.log('File uploaded successfully:', file.name);
        return {
          original_name: file.name,
          file_name: presignedUrl.file_name
        };
      } catch (error) {
        console.error('Error during file upload:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
        throw error;
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    console.log('All files uploaded successfully:', uploadedFiles);

    // Step 3: Call parse API with the uploaded files
    console.log('Step 3: Calling parse API');
    const parseResponse = await fetch('https://tf7hw5m2253i2atsm2q3mke5em0jmxfh.lambda-url.ap-south-1.on.aws/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: uploadedFiles
      })
    });

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      console.error('Parse API failed with status:', parseResponse.status);
      console.error('Error response:', errorText);
      throw new Error(`Failed to parse resumes: ${errorText}`);
    }

    const parsedData = await parseResponse.json();
    console.log('Resumes parsed successfully:', parsedData);

    // Step 4: Call filter API to update filter values
    console.log('Step 4: Calling filter API');
    const filterResponse = await fetch('/api/filter', {
      method: 'POST',
      headers: {
        'access': accessToken,
        'Content-Type': 'application/json',
      }
    });

    if (!filterResponse.ok) {
      const errorText = await filterResponse.text();
      console.error('Filter API failed with status:', filterResponse.status);
      console.error('Error response:', errorText);
      throw new Error('Failed to update filters');
    }

    // Step 5: Fetch updated list data
    console.log('Step 5: Fetching updated list data');
    const listResponse = await fetch('/api/list_data', {
      method: 'POST',
      headers: {
        'access': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 20,
        offset: 0
      })
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Failed to fetch updated list:', errorText);
      throw new Error('Failed to fetch updated list');
    }

    const updatedList = await listResponse.json();
    console.log('Updated list fetched successfully');
    return updatedList;
  } catch (error) {
    console.error('Resume upload process failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message === 'token_expired') {
        throw error;
      }
    }
    throw error;
  }
}

export async function getResumes(
  accessToken: string, 
  filters?: FilterParams, 
  page: number = 1, 
  limit: number = 20
): Promise<{ resumes: ResumeData[]; totalCount: number }> {
  const requestBody = {
    ...filters,
    limit,
    offset: (page - 1) * limit
  };
  
  console.log('Request body:', requestBody);

  const response = await fetch('/api/list_data', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (response.status === 400) {
    throw new Error('token_expired');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to fetch resumes');
  }

  const data = await response.json();
  console.log('Raw API response:', data);

  // Handle different response formats
  if (Array.isArray(data)) {
    console.log('Response is an array');
    return {
      resumes: data,
      totalCount: data.length
    };
  } else if (typeof data === 'object' && data !== null) {
    console.log('Response is an object');
    const resumes = data.resumes || data.data || [];
    const totalCount = data.total_count || data.totalCount || resumes.length;
    console.log('Extracted resumes:', resumes);
    console.log('Extracted total count:', totalCount);
    return {
      resumes,
      totalCount
    };
  } else {
    console.error('Unexpected response format:', data);
    return {
      resumes: [],
      totalCount: 0
    };
  }
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

  const response = await fetch('/api/update_profile', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile_id: originalData.profile_id,
      ...changedFields
    }),
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