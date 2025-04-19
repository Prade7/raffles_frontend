import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Download, ChevronDown, ChevronUp, Eye, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ResumeData } from '../types';
import { updateProfile } from '../utils/resume';
import { useAuth } from '../context/AuthContext';

interface ResumeTableProps {
  data: ResumeData[];
  setData: React.Dispatch<React.SetStateAction<ResumeData[]>>;
  filtered_count?: number; // Total count from API
  total_count?: number; // Total count of all resumes
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

function ResumeTable({ data, setData, filtered_count, total_count }: ResumeTableProps) {
  // Console logs to debug the data being received
  console.log('ResumeTable data:', data);
  console.log('Data length:', data?.length);
  if (data?.length > 0) {
    console.log('First item:', data[0]);
  }
  
  const { accessToken } = useAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<ResumeData | null>(null);
  const [originalData, setOriginalData] = useState<ResumeData | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleEdit = (item: ResumeData) => {
    setEditingId(item.profile_id);
    setEditData({ ...item });
    setOriginalData({ ...item });
    setNotification(null);
  };

  const getChangedFields = () => {
    if (!editData || !originalData) return null;

    const changes: { [key: string]: any } = {};
    const fieldsToCheck = [
      'name', 'email', 'mobile_no', 'sector', 'subsector',
      'current_salary', 'expected_salary', 'experience', 'location'
    ];

    fieldsToCheck.forEach(field => {
      if (editData[field as keyof ResumeData] !== originalData[field as keyof ResumeData]) {
        changes[field] = editData[field as keyof ResumeData];
      }
    });

    return Object.keys(changes).length > 0 ? changes : null;
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000); // Hide after 5 seconds
  };

  const handleSave = async () => {
    if (!editData || !originalData || !accessToken) return;

    const changes = getChangedFields();
    // Exit edit mode immediately
    setEditingId(null);
    setEditData(null);
    setOriginalData(null);

    // If no changes, just return
    if (!changes) {
      return;
    }

    try {
      setIsUpdating(true);

      // Optimistically update the UI
      setData(data.map(item => 
        item.profile_id === editingId ? { ...item, ...changes } : item
      ));

      const response = await updateProfile(accessToken, originalData, changes);

      if (response.statusCode === 200) {
        showNotification('success', response.body.status);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Revert the optimistic update
      setData(data.map(item => 
        item.profile_id === editingId ? originalData : item
      ));
      showNotification('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
    setOriginalData(null);
    setNotification(null);
  };

  const handleRowClick = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleDelete = (id: number) => {
    setData(data.filter(item => item.profile_id !== id));
    if (expandedRow === id) {
      setExpandedRow(null);
    }
  };

  const handleDownload = (cloudfront: string, name: string) => {
    // Create an anchor and trigger a download with filename
    const link = document.createElement('a');
    link.href = cloudfront;
    link.download = name || 'resume';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewCV = (cloudfront: string) => {
    // Get window dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Determine optimal size based on device
    let windowWidth = 0.9 * width; // 90% of screen width
    let windowHeight = 0.85 * height; // 85% of screen height
    
    // Prepare Google Docs viewer URL with responsive parameters
    const url = `https://docs.google.com/gview?url=${encodeURIComponent(cloudfront)}&embedded=true&chrome=false&devicescale=1`;
    
    // Open in a new window with specific dimensions
    const newWindow = window.open(
      url,
      '_blank',
      `width=${windowWidth},height=${windowHeight},resizable=yes,scrollbars=yes,status=yes,location=yes`
    );
    
    // Fallback if popup is blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // If popup blocked, open in a normal tab
      window.open(url, '_blank');
    }
  };

  // Mobile card view renderer
  const renderMobileCard = (item: ResumeData) => {
    return (
      <div key={item.profile_id} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 mb-3 border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-600">{item.email}</p>
            <p className="text-sm text-gray-500">{item.mobile_no}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleViewCV(item.cloudfront)}
              className="text-blue-600 hover:text-blue-900 p-1"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => handleEdit(item)}
              className="text-indigo-600 hover:text-indigo-900 p-1"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div>
            <span className="text-gray-500">Experience:</span>
            <p>
              {!item.experience || item.experience === '0' 
                ? '0 year' 
                : item.experience === '1' 
                  ? '1 year' 
                  : `${item.experience} years`}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Location:</span>
            <p>{item.location}</p>
          </div>
          <div>
            <span className="text-gray-500">Sector:</span>
            <p>{item.sector}</p>
          </div>
          <div>
            <span className="text-gray-500">Subsector:</span>
            <p>{item.subsector}</p>
          </div>
        </div>
        
        <div className="flex justify-between mt-2">
          <button
            onClick={() => handleDownload(item.cloudfront, item.name)}
            className="text-green-600 hover:text-green-900 flex items-center text-sm"
          >
            <Download size={14} className="mr-1" /> Download
          </button>
          <button
            onClick={() => handleDelete(item.profile_id)}
            className="text-red-600 hover:text-red-900 flex items-center text-sm"
          >
            <Trash2 size={14} className="mr-1" /> Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-300">
      {notification && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center space-x-2 ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {notification.type === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span className="capitalize">{notification.message}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>{notification.message}</span>
            </>
          )}
        </div>
      )}

      {/* Card showing resume count */}
      <div className="bg-white p-6 mb-4">
        <h2 className="text-xl font-medium text-gray-700">Total Resumes</h2>
        <p className="text-4xl font-bold text-blue-600 mt-2">{total_count || 0}</p>
      </div>

      {/* Mobile View */}
      {isMobileView ? (
        <div className="px-2 py-4">
          {data.length > 0 ? (
            data.map(item => renderMobileCard(item))
          ) : (
            <div className="text-center p-4 bg-white rounded-lg shadow-md">
              No resumes found. Please adjust your filters or upload new resumes.
            </div>
          )}
        </div>
      ) : (
        /* Desktop/Tablet View */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="pl-6 py-3 text-left w-auto">
                  <div className="group inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Name</span>
                    <div className="h-0.5 w-0 bg-gray-900 group-hover:w-full transition-all duration-300 mt-0.5"></div>
                  </div>
                </th>
                <th className="px-2 pr-0 py-3 text-left w-auto">
                  <div className="group inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Contact</span>
                    <div className="h-0.5 w-0 bg-gray-900 group-hover:w-full transition-all duration-300 mt-0.5"></div>
                  </div>
                </th>
                <th className="pl-0 pr-2 py-3 text-left w-auto relative">
                  <div className="group inline-flex flex-col absolute" style={{ left: "-100px", top: "18px" }}>
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Experience</span>
                    <div className="h-0.5 w-0 bg-gray-900 group-hover:w-full transition-all duration-300 mt-0.5"></div>
                  </div>
                </th>
                <th className="px-2 py-3 text-left w-auto">
                  <div className="group inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Location</span>
                    <div className="h-0.5 w-0 bg-gray-900 group-hover:w-full transition-all duration-300 mt-0.5"></div>
                  </div>
                </th>
                <th className="px-2 py-3 text-left w-auto">
                  <div className="group inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Sector</span>
                    <div className="h-0.5 w-0 bg-gray-900 group-hover:w-full transition-all duration-300 mt-0.5"></div>
                  </div>
                </th>
                <th className="pl-2 pr-6 py-3 text-left w-auto">
                  <div className="group inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</span>
                    <div className="h-0.5 w-0 bg-gray-900 group-hover:w-full transition-all duration-300 mt-0.5"></div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map(item => (
                <React.Fragment key={item.profile_id}>
                  <tr className={`hover:bg-gray-50 transition-colors border-collapse ${expandedRow === item.profile_id ? 'bg-gray-50 shadow-inner' : 'hover:shadow-md'}`}>
                    {editingId === item.profile_id ? (
                      <>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={editData?.name}
                            onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col space-y-2">
                            <input
                              type="email"
                              value={editData?.email}
                              onChange={e => setEditData(prev => prev ? { ...prev, email: e.target.value } : null)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Email"
                            />
                            <input
                              type="text"
                              value={editData?.mobile_no}
                              onChange={e => setEditData(prev => prev ? { ...prev, mobile_no: e.target.value } : null)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Mobile"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={editData?.experience}
                            onChange={e => setEditData(prev => prev ? { ...prev, experience: e.target.value } : null)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            value={editData?.location}
                            onChange={e => setEditData(prev => prev ? { ...prev, location: e.target.value } : null)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col space-y-2">
                            <input
                              type="text"
                              value={editData?.sector}
                              onChange={e => setEditData(prev => prev ? { ...prev, sector: e.target.value } : null)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Sector"
                            />
                            <input
                              type="text"
                              value={editData?.subsector}
                              onChange={e => setEditData(prev => prev ? { ...prev, subsector: e.target.value } : null)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Subsector"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right space-x-1">
                          <button
                            onClick={handleSave}
                            disabled={isUpdating}
                            className={`text-blue-600 hover:text-blue-900 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isUpdating ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <Save size={18} />
                            )}
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={isUpdating}
                            className={`text-red-600 hover:text-red-900 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <X size={18} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td 
                          className="pl-6 py-4 cursor-pointer"
                          onClick={() => handleRowClick(item.profile_id)}
                        >
                          <div className="flex items-center justify-start">
                            {expandedRow === item.profile_id ? <ChevronUp className="w-4 h-4 mr-2 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 mr-2 flex-shrink-0" />}
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-2 pr-0 py-3">
                          <div className="text-sm text-gray-900">{item.email}</div>
                          <div className="text-sm text-gray-500">{item.mobile_no}</div>
                        </td>
                        <td className="pl-0 pr-2 py-3 relative">
                          <div className="text-sm text-gray-900 absolute" style={{ left: "-100px", top: "50%", transform: "translateY(-50%)" }}>
                            {!item.experience || item.experience === '0' 
                              ? '0 year' 
                              : item.experience === '1' 
                                ? '1 year' 
                                : `${item.experience} years`}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="text-sm text-gray-900">{item.location}</div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="text-sm text-gray-900">{item.sector}</div>
                          <div className="text-sm text-gray-500">{item.subsector}</div>
                        </td>
                        <td className="pl-2 pr-6 py-3 text-left whitespace-nowrap">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleViewCV(item.cloudfront)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDownload(item.cloudfront, item.name)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.profile_id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                  {expandedRow === item.profile_id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-3 bg-gray-50 shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-2">Salary Information</h3>
                            <div className="space-y-1">
                              {editingId === item.profile_id ? (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <label className="text-sm">Current:</label>
                                    <input
                                      type="text"
                                      value={editData?.current_salary || ''}
                                      onChange={e => setEditData(prev => prev ? { ...prev, current_salary: e.target.value || null } : null)}
                                      className="w-32 px-2 py-1 text-sm border rounded"
                                      placeholder="Current Salary"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <label className="text-sm">Expected:</label>
                                    <input
                                      type="text"
                                      value={editData?.expected_salary || ''}
                                      onChange={e => setEditData(prev => prev ? { ...prev, expected_salary: e.target.value || null } : null)}
                                      className="w-32 px-2 py-1 text-sm border rounded"
                                      placeholder="Expected Salary"
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm">Current: {item.current_salary || 'Not specified'}</p>
                                  <p className="text-sm">Expected: {item.expected_salary || 'Not specified'}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-2">Additional Information</h3>
                            <div className="space-y-1">
                              <p className="text-sm">Created: {new Date(item.created_at).toLocaleDateString()}</p>
                              <p className="text-sm">Last Updated: {new Date(item.updated_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-3">
                    <div className="text-center p-4 bg-white rounded-lg shadow-md">
                      No resumes found. Please adjust your filters or upload new resumes.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ResumeTable;