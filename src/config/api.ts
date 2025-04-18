const isDevelopment = import.meta.env.DEV;

export const API_URL = isDevelopment 
  ? '/api'  // Uses proxy in development
  : import.meta.env.VITE_API_URL;  // Uses environment variable in production

export const PARSE_API_URL = isDevelopment
  ? '/parse'  // Uses proxy in development
  : import.meta.env.VITE_PARSE_API_URL;  // Uses environment variable in production 