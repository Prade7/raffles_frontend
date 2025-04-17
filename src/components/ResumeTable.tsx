import React, { useState } from 'react';
import { Edit2, Save, X, Download, ChevronDown, ChevronUp, Eye, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ResumeData } from '../types';
import { updateProfile } from '../utils/resume';
import { useAuth } from '../context/AuthContext';

interface ResumeTableProps {
  data: ResumeData[];
  setData: React.Dispatch<React.SetStateAction<ResumeData[]>>;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

function ResumeTable({ data, setData }: ResumeTableProps) {
  const { accessToken } = useAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<ResumeData | null>(null);
  const [originalData, setOriginalData] = useState<ResumeData | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  console.log('ResumeTable received data:', data);
  console.log('Data length:', data.length);
  if (data.length > 0) {
    console.log('First item:', data[0]);
  }

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
    window.open(cloudfront, '_blank');
  };

  const handleViewCV = (cloudfront: string) => {
    window.open(cloudfront, '_blank');
  };

  return (
    <div className="overflow-x-auto">
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
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Experience
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sector/Sub-sector
            </th>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map(item => (
            <React.Fragment key={item.profile_id}>
              <tr className="hover:bg-gray-50 transition-colors">
                {editingId === item.profile_id ? (
                  <>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editData?.name}
                        onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <input
                          type="tel"
                          value={editData?.mobile_no}
                          onChange={e => setEditData(prev => prev ? { ...prev, mobile_no: e.target.value } : null)}
                          className="w-full px-2 py-1 border rounded"
                        />
                        <input
                          type="email"
                          value={editData?.email}
                          onChange={e => setEditData(prev => prev ? { ...prev, email: e.target.value } : null)}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editData?.experience}
                        onChange={e => setEditData(prev => prev ? { ...prev, experience: e.target.value } : null)}
                        className="w-32 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editData?.location}
                        onChange={e => setEditData(prev => prev ? { ...prev, location: e.target.value } : null)}
                        className="w-32 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editData?.sector}
                          onChange={e => setEditData(prev => prev ? { ...prev, sector: e.target.value } : null)}
                          className="w-32 px-2 py-1 border rounded"
                          placeholder="Sector"
                        />
                        <input
                          type="text"
                          value={editData?.subsector}
                          onChange={e => setEditData(prev => prev ? { ...prev, subsector: e.target.value } : null)}
                          className="w-32 px-2 py-1 border rounded"
                          placeholder="Sub-sector"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSave}
                          disabled={isUpdating}
                          className={`text-green-600 hover:text-green-800 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isUpdating ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isUpdating}
                          className={`text-red-600 hover:text-red-800 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td 
                      className="px-6 py-4 flex items-center space-x-2 cursor-pointer"
                      onClick={() => handleRowClick(item.profile_id)}
                    >
                      {expandedRow === item.profile_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{item.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">{item.mobile_no}</div>
                        <div className="text-sm text-gray-600">{item.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{item.experience} years</td>
                    <td className="px-6 py-4">{item.location}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          item.sector === 'IT' ? 'bg-blue-100 text-blue-800' :
                          item.sector === 'Healthcare' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.sector}
                        </span>
                        <div className="text-sm text-gray-600">{item.subsector}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewCV(item.cloudfront)}
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDownload(item.cloudfront, item.name)}
                          className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.profile_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
              {expandedRow === item.profile_id && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
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
                      <div>
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
        </tbody>
      </table>
    </div>
  );
}

export default ResumeTable;