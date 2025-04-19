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
  const [offset, setOffset] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

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
      console.log('Loading resumes with offset:', offset);
      console.log('Current filters:', filters);
      console.log('Search query:', searchQuery);

      const response = await getResumes(
        accessToken,
        { ...filters, ...(searchQuery ? { search: searchQuery } : {}) },
        offset,
        ITEMS_PER_PAGE
      );

      if (response && Array.isArray(response.resume_data)) {
        setResumeData(response.resume_data);
        setTotalCount(response.total_count);
        setFilteredCount(response.filtered_count);
        setTotalPages(Math.ceil(response.filtered_count / ITEMS_PER_PAGE));
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

      // Upload all files at once
      await uploadResume(selectedFiles, accessToken);
      
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

  const clearFilters = async () => {
    // Clear all filters and search
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    setOffset(0);
    
    // Call getResumes with empty filters directly
    try {
      const response = await getResumes(
        accessToken,
        {}, // Empty filters
        0,  // Reset offset
        ITEMS_PER_PAGE
      );
      
      if (response && Array.isArray(response.resume_data)) {
        setResumeData(response.resume_data);
        setTotalCount(response.total_count);
        setFilteredCount(response.filtered_count);
        setTotalPages(Math.ceil(response.filtered_count / ITEMS_PER_PAGE));
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching with query:', searchQuery);
    setCurrentPage(1);
    setOffset(0);
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

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newOffset = offset + ITEMS_PER_PAGE;
      console.log('Next page clicked, increasing offset to:', newOffset);
      setOffset(newOffset);
      setCurrentPage(currentPage + 1);
      loadResumes();
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newOffset = Math.max(0, offset - ITEMS_PER_PAGE);
      console.log('Previous page clicked, decreasing offset to:', newOffset);
      setOffset(newOffset);
      setCurrentPage(currentPage - 1);
      loadResumes();
    }
  };

  const handleApplyFilters = async () => {
    if (!hasActiveFilters) return;
    console.log('Applying filters:', filters);
    setCurrentPage(1);
    setOffset(0);
    await loadResumes();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-0 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 animate-gradient">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg transform hover:translate-y-[-2px] transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl flex items-center space-x-2 animate-slide-in ${
              notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
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

        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl border border-gray-100">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 relative">
              Upload Resumes
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
            </h2>
            {selectedFiles.length > 0 && (
              <button
                onClick={handleFileUpload}
                disabled={isUploading}
                className={`px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center space-x-2 transform hover:scale-105 ${
                  isUploading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FileUpload className="w-5 h-5" />
                    <span>Upload Files</span>
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
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50 scale-[1.02] shadow-md'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileUpload className={`w-12 h-12 text-indigo-400 mx-auto mb-4 transition-transform duration-300 ${isDragging ? 'scale-110 animate-bounce' : ''}`} />
            <p className="text-md text-gray-600 mb-4">
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
              className={`text-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:translate-y-[-2px] ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isUploading}
            >
              Select Files
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-6 space-y-3 animate-fade-in">
              <h3 className="text-md font-medium text-gray-700 mb-2">Selected Files ({selectedFiles.length})</h3>
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2 rounded-lg">
                {selectedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 group border border-gray-100 shadow-sm hover:shadow animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 flex-shrink-0">
                        <FileUpload className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200 opacity-0 group-hover:opacity-100 rounded-full hover:bg-red-50"
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <h2 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 sm:mb-0">Parsed Resumes</h2>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2 sm:mt-0">
              <form onSubmit={handleSearch} className="relative w-full sm:w-auto group">
                <input
                  type="text"
                  placeholder="Search name or phone"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-4 py-2 text-sm border-0 bg-gray-50 rounded-full shadow-sm focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all duration-300 ease-in-out"
                />
                <button
                  type="submit"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    console.log('Filter button clicked');
                    setShowFilters(!showFilters);
                  }}
                  className={`p-2.5 rounded-full shadow-sm transition-all duration-300 transform hover:scale-105 ${
                    showFilters 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white animate-pulse' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-indigo-600'
                  }`}
                  aria-label="Toggle filters"
                >
                  <Filter className="w-5 h-5" />
                </button>
                {(hasActiveFilters || searchQuery.trim() !== '') && (
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium px-3 py-1.5 rounded-full text-sm shadow-sm animate-fade-in">
                    <span>{filteredCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {showFilters && filterValues && (
              <div className="hidden sm:block w-full bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl space-y-4 shadow-inner border border-indigo-100 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Filter Options</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      className={`text-sm px-3 py-1 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-white transition-all ${
                        !hasActiveFilters ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Clear filters
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      disabled={!hasActiveFilters || isLoading}
                      className={`px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center space-x-2 transform hover:translate-y-[-2px] ${
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
                  {Object.entries(filterValues).map(([key, values], index) => (
                    <div key={key} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                      </label>
                      <select
                        value={filters[key as keyof FilterParams] || ''}
                        onChange={(e) => handleFilterChange(key as keyof FilterParams, e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
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

        <ResumeTable 
          data={resumeData} 
          setData={setResumeData}
          total_count={totalCount}
        />

        <div className="flex justify-center items-center space-x-4 mt-6">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md transform hover:translate-y-[-2px]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Previous</span>
          </button>
          
          <div className="bg-white text-indigo-600 px-4 py-2 rounded-lg shadow-sm border border-indigo-100">
            <span className="font-medium">{currentPage}</span>
            <span className="text-gray-500"> of </span>
            <span className="font-medium">{totalPages}</span>
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-300 ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md transform hover:translate-y-[-2px]'
            }`}
          >
            <span>Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;