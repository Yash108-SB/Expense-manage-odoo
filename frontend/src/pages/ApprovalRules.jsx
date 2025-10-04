import { useState, useEffect } from 'react';
import api from '../utils/axios';
import toast from 'react-hot-toast';
import { Users, Percent, CheckCircle, ArrowRight, UserCheck, Trash2, GitBranch, Zap, Settings, AlertCircle } from 'lucide-react';

const ApprovalRules = () => {
  const [rules, setRules] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFlowType, setSelectedFlowType] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'sequential',
    requireManagerFirst: true,
    approvers: [],
    percentageRequired: 60,
    excludeRolesFromPercentage: ['cfo'],
    specificApprover: null,
    amountThreshold: { min: 0, max: null },
    categories: [],
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rulesRes, usersRes] = await Promise.all([
        api.get('/approval-rules'),
        api.get('/users/managers')
      ]);
      setRules(rulesRes.data.data);
      setExecutives(usersRes.data.data);
      
      console.log('Fetched executives:', usersRes.data.data);
      console.log('Executives count:', usersRes.data.data.length);
    } catch (error) {
      console.error('Error fetching approval rules data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Find CFO user for specific/hybrid rules
    const cfoUser = executives.find(exec => exec.role === 'cfo');
    
    // Prepare data based on flow type
    const submitData = {
      ...formData,
      approvers: formData.approvers.map((a, idx) => ({
        userId: a.userId,
        sequence: idx
      })),
      // Automatically set CFO as specific approver for 'specific' or 'hybrid' types
      specificApprover: (formData.type === 'specific' || formData.type === 'hybrid') 
        ? (cfoUser?._id || null) 
        : formData.specificApprover
    };
    
    // Validate CFO exists for specific/hybrid rules
    if ((formData.type === 'specific' || formData.type === 'hybrid') && !cfoUser) {
      toast.error('CFO user not found. Please create a user with CFO role first.');
      return;
    }
    
    try {
      await api.post('/approval-rules', submitData);
      toast.success('✅ Approval rule created successfully!');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to create rule');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await api.delete(`/approval-rules/${id}`);
      toast.success('Rule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'sequential',
      requireManagerFirst: true,
      approvers: [],
      percentageRequired: 60,
      excludeRolesFromPercentage: ['cfo'],
      specificApprover: null,
      amountThreshold: { min: 0, max: null },
      categories: [],
      isActive: true
    });
    setSelectedFlowType(null);
    setShowModal(false);
  };

  const addApprover = (userId) => {
    const user = executives.find(e => e._id === userId);
    if (!user) return;
    
    setFormData({
      ...formData,
      approvers: [...formData.approvers, { userId: user._id, role: user.role }]
    });
  };
  
  const removeApprover = (index) => {
    setFormData({
      ...formData,
      approvers: formData.approvers.filter((_, i) => i !== index)
    });
  };
  
  const moveApprover = (index, direction) => {
    const newApprovers = [...formData.approvers];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newApprovers.length) return;
    
    [newApprovers[index], newApprovers[newIndex]] = [newApprovers[newIndex], newApprovers[index]];
    setFormData({ ...formData, approvers: newApprovers });
  };
  
  const selectFlowType = (type) => {
    setSelectedFlowType(type);
    if (type === 'multiple') {
      setFormData({ ...formData, type: 'sequential', requireManagerFirst: true });
    } else if (type === 'conditional') {
      setFormData({ ...formData, type: 'percentage', requireManagerFirst: false });
    }
    setShowModal(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
        <p className="text-gray-600 mt-1">Configure expense approval flows for your organization</p>
      </div>

      {/* Two Card System - Flow Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Multiple Approver (Sequential) */}
        <div 
          onClick={() => selectFlowType('multiple')}
          className="card cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-blue-500"
        >
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <GitBranch className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multiple Approver</h3>
              <p className="text-sm text-gray-600 mb-3">Sequential approval workflow with defined steps</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Manager approves first (if enabled)
                </div>
                <div className="flex items-center text-gray-700">
                  <ArrowRight className="h-4 w-4 mr-2 text-blue-600" />
                  Sequential: Define approval order
                </div>
                <div className="flex items-center text-gray-700">
                  <UserCheck className="h-4 w-4 mr-2 text-purple-600" />
                  Each approver in sequence
                </div>
              </div>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectFlowType('multiple');
                }}
                className="mt-4 btn-primary w-full text-sm"
              >
                Create Sequential Rule
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Conditional Approval */}
        <div 
          onClick={() => selectFlowType('conditional')}
          className="card cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-green-500"
        >
          <div className="flex items-start space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Conditional Approval</h3>
              <p className="text-sm text-gray-600 mb-3">Flexible approval based on conditions</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-700">
                  <Percent className="h-4 w-4 mr-2 text-blue-600" />
                  Percentage: 60% of executives
                </div>
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Specific: CFO auto-approves
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="h-4 w-4 mr-2 text-purple-600" />
                  Hybrid: Combine both rules
                </div>
              </div>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectFlowType('conditional');
                }}
                className="mt-4 btn-success w-full text-sm"
              >
                Create Conditional Rule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Rules List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Approval Rules</h2>
        {rules.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No approval rules created yet</p>
            <p className="text-sm text-gray-500">Click on a card above to create your first rule</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map(rule => (
              <div key={rule._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{rule.name}</h3>
                      <span className={`badge-info capitalize`}>
                        {rule.type === 'sequential' ? '🔄 Sequential' :
                         rule.type === 'percentage' ? '📊 Percentage' :
                         rule.type === 'specific' ? '⚡ Specific' : '🔀 Hybrid'}
                      </span>
                      <span className={rule.isActive ? 'badge-success' : 'badge-danger'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      {rule.amountThreshold && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          Amount: ${rule.amountThreshold.min} - ${rule.amountThreshold.max || '∞'}
                        </span>
                      )}
                      {rule.requireManagerFirst && (
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                          ✓ Manager First
                        </span>
                      )}
                      {rule.percentageRequired && (
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                          {rule.percentageRequired}% Required
                        </span>
                      )}
                      {rule.approvers && rule.approvers.length > 0 && (
                        <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded">
                          {rule.approvers.length} Approvers
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(rule._id)} 
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2">
              {selectedFlowType === 'multiple' ? '🔄 Multiple Approver Flow' : '⚡ Conditional Approval Flow'}
            </h2>
            <p className="text-gray-600 mb-6">
              {selectedFlowType === 'multiple' 
                ? 'Sequential approval with defined steps' 
                : 'Flexible approval based on conditions'}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Large Expense Approval"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    placeholder="Describe when this rule applies..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="input-field"
                    rows="2"
                  />
                </div>
              </div>

              {/* Multiple Approver (Sequential) Configuration */}
              {selectedFlowType === 'multiple' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <GitBranch className="h-5 w-5 mr-2" />
                    Approval Sequence
                  </h3>

                  {/* Manager First Toggle */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Require Manager Approval First</p>
                      <p className="text-sm text-gray-600">Employee's manager must approve before other approvers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requireManagerFirst}
                        onChange={(e) => setFormData({ ...formData, requireManagerFirst: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Approvers List */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Approvers in Sequence *
                    </label>
                    
                    {formData.approvers.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {formData.approvers.map((approver, idx) => {
                          const exec = executives.find(e => e._id === approver.userId);
                          return (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{exec?.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{exec?.role}</p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveApprover(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveApprover(idx, 'down')}
                                  disabled={idx === formData.approvers.length - 1}
                                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeApprover(idx)}
                                  className="p-1 text-red-500 hover:text-red-700"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addApprover(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="input-field"
                    >
                      <option value="">+ Add Approver</option>
                      {executives.length === 0 ? (
                        <option disabled>No executives/managers available. Create users with CEO, CFO, CTO, Director, or Manager roles first.</option>
                      ) : (
                        executives
                          .filter(exec => !formData.approvers.find(a => a.userId === exec._id))
                          .map(exec => (
                            <option key={exec._id} value={exec._id}>
                              {exec.name} ({exec.role.toUpperCase()})
                            </option>
                          ))
                      )}
                    </select>
                    {executives.length === 0 && (
                      <p className="text-sm text-amber-600 mt-2 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        No executives found. Go to Users page and create users with roles: CEO, CFO, CTO, Director, or Manager.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Conditional Approval Configuration */}
              {selectedFlowType === 'conditional' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Conditional Rules
                  </h3>

                  {/* Approval Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Approval Type *</label>
                    <div className="space-y-2">
                      <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="conditionalType"
                          value="percentage"
                          checked={formData.type === 'percentage'}
                          onChange={() => setFormData({ ...formData, type: 'percentage' })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <p className="font-medium text-gray-900">📊 Percentage Rule</p>
                          <p className="text-sm text-gray-600">X% of selected approvers must approve</p>
                        </div>
                      </label>

                      <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="conditionalType"
                          value="specific"
                          checked={formData.type === 'specific'}
                          onChange={() => setFormData({ ...formData, type: 'specific' })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <p className="font-medium text-gray-900">⚡ Specific Approver Rule</p>
                          <p className="text-sm text-gray-600">If CFO approves → Auto-approve</p>
                        </div>
                      </label>

                      <label className="flex items-start p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="conditionalType"
                          value="hybrid"
                          checked={formData.type === 'hybrid'}
                          onChange={() => setFormData({ ...formData, type: 'hybrid' })}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <p className="font-medium text-gray-900">🔀 Hybrid Rule</p>
                          <p className="text-sm text-gray-600">Percentage OR Specific approver (whichever first)</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Percentage Configuration */}
                  {(formData.type === 'percentage' || formData.type === 'hybrid') && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Percentage Configuration</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Percentage Required (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.percentageRequired}
                          onChange={(e) => setFormData({ ...formData, percentageRequired: parseInt(e.target.value) || 60 })}
                          className="input-field"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Example: 60% means at least 60% of selected approvers must approve
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Approvers for Percentage Voting
                        </label>
                        {formData.approvers.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {formData.approvers.map((approver, idx) => {
                              const exec = executives.find(e => e._id === approver.userId);
                              return (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                                  <span className="text-sm font-medium">{exec?.name} ({exec?.role.toUpperCase()})</span>
                                  <button
                                    type="button"
                                    onClick={() => removeApprover(idx)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addApprover(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="input-field"
                        >
                          <option value="">+ Add Approver</option>
                          {executives.length === 0 ? (
                            <option disabled>No executives/managers available</option>
                          ) : (
                            executives
                              .filter(exec => !formData.approvers.find(a => a.userId === exec._id))
                              .map(exec => (
                                <option key={exec._id} value={exec._id}>
                                  {exec.name} ({exec.role.toUpperCase()})
                                </option>
                              ))
                          )}
                        </select>
                        {executives.length === 0 && (
                          <p className="text-sm text-amber-600 mt-2 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            No executives found. Create users with roles: CEO, CFO, CTO, Director, or Manager first.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.excludeRolesFromPercentage.includes('cfo')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ 
                                  ...formData, 
                                  excludeRolesFromPercentage: [...formData.excludeRolesFromPercentage, 'cfo'] 
                                });
                              } else {
                                setFormData({ 
                                  ...formData, 
                                  excludeRolesFromPercentage: formData.excludeRolesFromPercentage.filter(r => r !== 'cfo') 
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            Exclude CFO from percentage calculation
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 ml-6">
                          CFO's vote will be tracked but not counted toward the percentage
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Specific Approver Configuration */}
                  {(formData.type === 'specific' || formData.type === 'hybrid') && (
                    <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Specific Approver Configuration</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Auto-Approve Person
                        </label>
                        <div className="p-3 bg-white border border-gray-300 rounded-lg">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-700 font-bold text-lg">CFO</span>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">Chief Financial Officer (CFO)</p>
                              <p className="text-xs text-gray-500">Automatically assigned</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          ✓ If CFO approves, the expense is immediately approved regardless of other approvers
                        </p>
                        {executives.filter(e => e.role === 'cfo').length === 0 && (
                          <p className="text-sm text-amber-600 mt-2 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Warning: No CFO user found. Create a user with CFO role first.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex-1"
                  disabled={
                    !formData.name || 
                    (selectedFlowType === 'multiple' && formData.approvers.length === 0) ||
                    (formData.type === 'percentage' && formData.approvers.length === 0) ||
                    (formData.type === 'specific' && !formData.specificApprover)
                  }
                >
                  Create Approval Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRules;
