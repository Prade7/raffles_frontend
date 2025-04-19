interface PresignedUrlResponse {
  original_filename: string;
  file_name: string;
  url: string;
}

const API_URL = "https://imfu5lsjndb37dohb67aaconwy0zimhy.lambda-url.ap-south-1.on.aws";

export const getPresignedUrl = async (filenames: string[], accessToken: string): Promise<PresignedUrlResponse[]> => {
  try {
    const response = await fetch(`${API_URL}/presigned_url`, {
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
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired');
      }
      throw new Error('Failed to get presigned URL');
    }

    const data = await response.json();
    console.log('Presigned URL response:', data);
    return data;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
};