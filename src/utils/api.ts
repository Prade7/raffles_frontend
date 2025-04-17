import type { FilterParams, ResumeListResponse, ResumeData } from '../types';

export * from './auth';
export * from './resume';
export * from './presignedUrl';
export * from './filters';

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

  // Handle the response format with resume_data and total_count
  if (data.resume_data) {
    console.log('Found resume_data in response');
    return {
      resumes: data.resume_data,
      totalCount: data.total_count
    };
  }

  // Fallback to other formats if needed
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