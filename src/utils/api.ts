import type { FilterParams, ResumeListResponse } from '../types';

export * from './auth';
export * from './resume';
export * from './presignedUrl';
export * from './filters';

export async function getResumes(accessToken: string, filters?: FilterParams): Promise<ResumeListResponse> {
  console.log('Fetching resumes with filters:', filters);

  const response = await fetch('/api/list_data', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filters || {}),
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