import { useState, useEffect } from 'react';
import api from '../utils/axios';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, UserCheck, UserX, Key, Mail, Copy, CheckCircle } from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    managerId: '',
    autoGeneratePassword: true,
    sendEmail: true
  });
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, managersRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/managers')
      ]);
      setUsers(usersRes.data.data);
      setManagers(managersRes.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, formData);
        toast.success('User updated successfully');
      } else {
        const response = await api.post('/users', formData);
        
        // Show generated password if auto-generated
        if (response.data.generatedPassword) {
          setGeneratedPassword(response.data.generatedPassword);
        }
        
        // Show appropriate success message
        if (response.data.emailSent) {
          toast.success('User created and credentials sent via email!');
        } else if (response.data.generatedPassword) {
          toast.success('User created! Copy the password before closing.');
          return; // Don't close modal yet
        } else {
          toast.success('User created successfully');
        }
      }
      
      if (!generatedPassword || formData.sendEmail) {
        resetForm();
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.manager?._id || '',
      autoGeneratePassword: true,
      sendEmail: true
    });
    setShowModal(true);
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await api.put(`/users/${userId}`, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Password copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'employee',
      managerId: '',
      autoGeneratePassword: true,
      sendEmail: true
    });
    setGeneratedPassword(null);
    setShowPassword(false);
    setCopied(false);
    setEditingUser(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage employees and their roles</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary inline-flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Active Users</p>
          <p className="text-2xl font-bold text-gray-900">
            {users.filter(u => u.isActive).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Admins</p>
          <p className="text-2xl font-bold text-gray-900">
            {users.filter(u => u.role === 'admin').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            System Administrators
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Leadership</p>
          <p className="text-2xl font-bold text-gray-900">
            {users.filter(u => ['manager', 'ceo', 'cfo', 'cto', 'director'].includes(u.role)).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Executives & Managers
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CEO
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CFO
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CTO
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Director
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Admin Column */}
                  <td className="px-4 py-4 text-center">
                    {user.role === 'admin' ? (
                      <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">
                        {user.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  
                  {/* CEO Column */}
                  <td className="px-4 py-4 text-center">
                    {user.role === 'ceo' ? (
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                        {user.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  
                  {/* CFO Column */}
                  <td className="px-4 py-4 text-center">
                    {user.role === 'cfo' ? (
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        {user.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  
                  {/* CTO Column */}
                  <td className="px-4 py-4 text-center">
                    {user.role === 'cto' ? (
                      <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">
                        {user.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  
                  {/* Director Column */}
                  <td className="px-4 py-4 text-center">
                    {user.role === 'director' ? (
                      <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded">
                        {user.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  
                  {/* Manager Column */}
                  <td className="px-4 py-4 text-center">
                    {user.role === 'manager' ? (
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                        {user.name}
                      </span>
                    ) : user.manager ? (
                      <span className="text-xs text-gray-700 font-medium">
                        {user.manager.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={user.isActive ? 'badge-success' : 'badge-danger'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user._id, user.isActive)}
                      className={user.isActive ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field disabled:bg-gray-100"
                />
              </div>

              {!editingUser && (
                <>
                  {/* Send Email Toggle */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Send Email Notification
                        </label>
                        <p className="text-xs text-gray-600">Email auto-generated credentials to the user</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sendEmail}
                        onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  {/* Generated Password Display */}
                  {generatedPassword && (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-yellow-900 flex items-center">
                          <Key className="h-4 w-4 mr-2" />
                          Generated Password
                        </label>
                        {copied ? (
                          <span className="text-green-600 text-sm flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Copied!
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded font-mono text-sm text-gray-900">
                          {generatedPassword}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedPassword)}
                          className="btn-secondary flex items-center"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-yellow-800 mt-2">
                        ⚠️ Save this password! It won't be shown again.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    // Clear managerId for executive roles
                    const isExecutive = ['ceo', 'cfo', 'cto', 'director'].includes(newRole);
                    setFormData({ 
                      ...formData, 
                      role: newRole,
                      managerId: isExecutive ? '' : formData.managerId
                    });
                  }}
                  className="input-field"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                  <option value="cto">CTO (Chief Technology Officer)</option>
                  <option value="cfo">CFO (Chief Financial Officer)</option>
                  <option value="ceo">CEO (Chief Executive Officer)</option>
                </select>
              </div>

              {/* Manager field - only show for employee and manager roles */}
              {(formData.role === 'employee' || formData.role === 'manager') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager
                  </label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">No Manager</option>
                    {managers.map(manager => (
                      <option key={manager._id} value={manager._id}>
                        {manager.name} ({manager.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Info message for executives */}
              {['ceo', 'cfo', 'cto', 'director'].includes(formData.role) && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Executive Role:</strong> {formData.role.toUpperCase()} does not require a manager assignment.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
