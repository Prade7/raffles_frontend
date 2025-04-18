import React, { useState, useEffect } from 'react';
import { FileUp as FileUpload, Table as TableIcon, LogOut, Search, Filter, X, CheckCircle, AlertCircle } from 'lucide-react';
import ResumeTable from './ResumeTable';
import { useAuth } from '../context/AuthContext';
import { getResumes, loginUser, logoutUser, uploadResume } from '../utils/api';
import { getFilterValues } from '../utils/filters';
import type { ResumeData, FilterValues, FilterParams } from '../types';

interface Notification {
  type: 'success' | 'error';
  message: string;
}

function Dashboard() {
  const { accessToken, logout } = useAuth();
  const [resumeData, setResumeData] = useState<ResumeData[]>([]);
  const [filterValues, setFilterValues] = useState<FilterValues | null>(null);
  const [filters, setFilters] = useState<FilterParams>({});
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<Notification | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (accessToken) {
      loadFilters();
      loadResumes();
    }
  }, [accessToken, currentPage]);

  useEffect(() => {
    const hasFilters = Object.values(filters).some(value => value !== undefined && value !== '');
    setHasActiveFilters(hasFilters);
  }, [filters]);

  const loadFilters = async () => {
    try {
      if (!accessToken) return;
      const values = await getFilterValues(accessToken);
      console.log('Loaded filter values:', values);
      setFilterValues(values);
    } catch (err) {
      if (err instanceof Error && err.message === 'token_expired') {
        handleTokenExpired();
      } else {
        console.error('Failed to load filters:', err);
      }
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Processing logout request');
      await logoutUser();
      logout();
      console.log('Logout successful, redirecting to login page');
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Failed to logout');
    }
  };

  const handleTokenExpired = () => {
    setError('Session expired. Please login again.');
    logout();
  };

  const loadResumes = async () => {
    try {
      if (!accessToken) return;
      setIsLoading(true);
      setError(null);

      console.log('Loading resumes for page:', currentPage);
      console.log('Current filters:', filters);
      console.log('Search query:', searchQuery);

      const response = await getResumes(
        accessToken,
        {
          ...filters,
          ...(searchQuery ? { search: searchQuery } : {})
        },
        currentPage,
        ITEMS_PER_PAGE
      );

      console.log('API Response:', response);
      
      if (response && Array.isArray(response.resume_data)) {
        setResumeData(response.resume_data);
        setTotalCount(response.total_count);
        setTotalPages(Math.ceil(response.total_count / ITEMS_PER_PAGE));
      } else {
        console.error('Invalid response format:', response);
        setError('Failed to load resumes: Invalid response format');
      }
    } catch (err) {
      console.error('Error loading resumes:', err);
      if (err instanceof Error) {
        if (err.message === 'Token expired') {
          handleTokenExpired();
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load resumes');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      if (allowedTypes.includes(file.type)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid file type(s): ${invalidFiles.join(', ')}. Please upload only PDF, DOC, or DOCX files.`);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const handleFileUpload = async () => {
    if (!accessToken || selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setError(null);

      // Upload each file individually
      for (const file of selectedFiles) {
        await uploadResume([file], accessToken);
      }
      
      // Clear the selected files and reset the file input
      setSelectedFiles([]);
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Show success notification
      showNotification('success', `Successfully uploaded ${selectedFiles.length} file(s)`);
      
      // Refresh the data
      await loadResumes();
    } catch (err) {
      if (err instanceof Error && err.message === 'Token expired') {
        handleTokenExpired();
      } else {
        setError('Failed to upload resumes');
        console.error(err);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilterChange = (key: keyof FilterParams, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    loadResumes();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching with query:', searchQuery);
    setCurrentPage(1);
    loadResumes();
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      loadResumes();
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handlePageChange = (newPage: number) => {
    console.log('Changing to page:', newPage, 'Total pages:', totalPages);
    if (newPage < 1 || newPage > totalPages) {
      console.log('Invalid page number');
      return;
    }
    setCurrentPage(newPage);
  };

  const handleApplyFilters = async () => {
    if (!hasActiveFilters) return;
    console.log('Applying filters:', filters);
    setCurrentPage(1);
    await loadResumes();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        {notification && (
          <div
            className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in ${
              notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-4 transform transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upload Resumes</h2>
            {selectedFiles.length > 0 && (
              <button
                onClick={handleFileUpload}
                disabled={isUploading}
                className={`px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center space-x-2 transform hover:scale-105 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FileUpload className="w-4 h-4" />
                    <span>Upload</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileSelect(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 scale-105'
                : 'border-gray-300 hover:border-indigo-500'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileUpload className={`w-8 h-8 text-gray-400 mx-auto mb-2 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`} />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop your resumes here, or click to select files
            </p>
            <input
              type="file"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="fileInput"
              multiple
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isUploading}
            />
            <button
              onClick={() => document.getElementById('fileInput')?.click()}
              className={`text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isUploading}
            >
              Select Files
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2 animate-fade-in">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileUpload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Parsed Resumes</h2>
              <div className="flex items-center space-x-4">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-64 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
                <TableIcon className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {showFilters && filterValues && (
                <div className="w-full bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700">Filter Options</h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className={`text-sm text-gray-600 hover:text-gray-800 ${
                          !hasActiveFilters ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Clear filters
                      </button>
                      <button
                        onClick={handleApplyFilters}
                        disabled={!hasActiveFilters || isLoading}
                        className={`px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all flex items-center space-x-2 ${
                          !hasActiveFilters || isLoading ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <span>Apply Filters</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(filterValues).map(([key, values]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                        </label>
                        <select
                          value={filters[key as keyof FilterParams] || ''}
                          onChange={(e) => handleFilterChange(key as keyof FilterParams, e.target.value || undefined)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">All {key.replace('_', ' ')}</option>
                          {values.filter(Boolean).map((value: string) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <ResumeTable data={resumeData} setData={setResumeData} />
        </div>

        <div className="flex justify-center items-center space-x-2 mt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors duration-200"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors duration-200"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;