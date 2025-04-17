import type { FilterParams, ResumeListResponse } from '../types';

export * from './auth';
export * from './resume';
export * from './presignedUrl';
export * from './filters';

export async function getResumes(
  accessToken: string, 
  filters?: FilterParams,
  page: number = 1,
  limit: number = 20
): Promise<ResumeListResponse> {
  console.log('Fetching resumes with filters:', filters);
  console.log('Page:', page, 'Limit:', limit);

  const offset = (page - 1) * limit;
  const requestBody = {
    ...filters,
    limit,
    offset
  };

  const response = await fetch('/api/list_data', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  console.log('Raw API response:', data);

  if (response.status === 400) {
    throw new Error('token_expired');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch resumes');
  }

  return data;
}