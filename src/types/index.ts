export interface LoginResponse {
  domain_id: string;
  role: {
    role: string;
  };
  access: string;
  message?: string;
}

export interface ResumeData {
  subsector: string;
  expected_salary: string | null;
  mobile_no: string;
  created_at: string;
  current_salary: string | null;
  experience: string;
  cloudfront: string;
  filename: string;
  updated_at: string;
  profile_id: number;
  name: string;
  location: string;
  sector: string;
  email: string;
}

export interface ParsedResume {
  name: string;
  email: string;
  mobile_no: string;
  experience: string;
  sector: string;
  subsector: string;
  location: string;
  current_salary: string | null;
  expected_salary: string | null;
  filename: string;
  cloudfront: string;
}

export interface FilterValues {
  sector: string[];
  subsector: string[];
  location: string[];
  experience: string[];
}

export interface FilterParams {
  sector?: string;
  location?: string;
  experience?: string;
  subsector?: string;
  search?: string;
}