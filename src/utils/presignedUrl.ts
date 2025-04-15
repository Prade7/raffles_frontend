interface PresignedUrlResponse {
  original_filename: string;
  file_name: string;
  url: string;
}

export async function getPresignedUrl(filenames: string[], accessToken: string): Promise<PresignedUrlResponse[]> {
  console.log('Requesting presigned URLs for files:', filenames);
  
  const response = await fetch('/api/presigned_url', {
    method: 'POST',
    headers: {
      'access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: filenames,
      signatureType: 'upload'
    }),
  });

  if (response.status === 400) {
    throw new Error('token_expired');
  }

  if (!response.ok) {
    throw new Error('Failed to get presigned URLs');
  }

  const data = await response.json();
  console.log('Presigned URL response:', data);
  return data;
}