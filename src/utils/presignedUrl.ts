interface PresignedUrlResponse {
  original_filename: string;
  file_name: string;
  url: string;
}

const API_URL = import.meta.env.VITE_MAIN_API_URL;

export const getPresignedUrl = async (filenames: string[], accessToken: string): Promise<PresignedUrlResponse[]> => {
  try {
    const response = await fetch(`${API_URL}/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken
      },
      body: JSON.stringify({ filenames })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to get presigned URL');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
};

export async function requestPresignedUrl(accessToken: string, filename: string): Promise<string> {
  const response = await fetch('/api/presigned_url', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filename })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to get presigned URL');
  }

  return data.url;
}