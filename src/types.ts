export interface FilterParams {
  sector?: string;
  subsector?: string;
  location?: string;
  experience?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ResumeData {
  profile_id: number;
  name: string;
  email: string;
  mobile_no: string;
  sector: string;
  subsector: string;
  current_salary: string | null;
  expected_salary: string | null;
  experience: string;
  location: string;
  created_at: string;
  updated_at: string;
  cloudfront: string;
  filename: string;
}

export interface ResumeListResponse {
  resumes: ResumeData[];
  total_count: number;
} 