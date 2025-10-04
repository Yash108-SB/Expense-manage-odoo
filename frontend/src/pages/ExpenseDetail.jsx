import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { ArrowLeft, Calendar, DollarSign, FileText, User, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      const { data } = await api.get(`/expenses/${id}`);
      setExpense(data.data);
    } catch (error) {
      console.error('Error fetching expense:', error);
      toast.error('Failed to load expense details');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (action) => {
    if (!comments.trim() && action === 'reject') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/expenses/${id}/approve`, {
        action,
        comments: comments.trim()
      });
      toast.success(`Expense ${action}d successfully!`);
      fetchExpense();
      setComments('');
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.response?.data?.message || `Failed to ${action} expense`);
    } finally {
      setActionLoading(false);
    }
  };

  const canApprove = () => {
    if (!expense) return false;
    
    // Check if user is an executive role (can approve)
    const canApproveRoles = ['admin', 'manager', 'ceo', 'cfo', 'cto', 'director'];
    if (!canApproveRoles.includes(user?.role)) return false;
    
    // Find if there's a pending approval for this user
    const userApproval = expense.approvals?.find(
      a => a.approver._id === user.id && a.status === 'pending'
    );
    
    return expense.status === 'pending' && userApproval;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', icon: null },
      approved: { class: 'badge-success', icon: CheckCircle },
      rejected: { class: 'badge-danger', icon: XCircle }
    };
    return badges[status] || { class: 'badge-gray', icon: null };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Expense not found</p>
      </div>
    );
  }

  const statusBadge = getStatusBadge(expense.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/expenses')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{expense.title}</h1>
          <p className="text-gray-600 mt-1">Expense Details</p>
        </div>
        <div className="flex items-center space-x-2">
          {StatusIcon && <StatusIcon className="h-5 w-5" />}
          <span className={`${statusBadge.class} capitalize`}>
            {expense.status}
          </span>
        </div>
      </div>

      {/* Main Details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-3">
            <DollarSign className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.company?.currency?.symbol}{expense.convertedAmount.toFixed(2)}
              </p>
              {expense.currency !== expense.companyCurrency && (
                <p className="text-sm text-gray-500">
                  Original: {expense.amount.toFixed(2)} {expense.currency}
                  {' '}(Rate: {expense.exchangeRate.toFixed(4)})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {format(new Date(expense.expenseDate), 'MMMM dd, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="text-lg font-semibold text-gray-900">{expense.category}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Submitted By</p>
              <p className="text-lg font-semibold text-gray-900">{expense.employee.name}</p>
              <p className="text-sm text-gray-500">{expense.employee.email}</p>
            </div>
          </div>
        </div>

        {expense.description && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Description</p>
            <p className="text-gray-900">{expense.description}</p>
          </div>
        )}

        {expense.merchantName && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">Merchant</p>
            <p className="text-gray-900">{expense.merchantName}</p>
          </div>
        )}
      </div>

      {/* Line Items */}
      {expense.expenseLines && expense.expenseLines.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>
          <div className="space-y-3">
            {expense.expenseLines.map((line, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{line.description}</p>
                  <p className="text-sm text-gray-500">{line.category}</p>
                </div>
                <p className="font-semibold text-gray-900">
                  {user?.company?.currency?.symbol}{line.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approval Workflow */}
      {expense.approvals && expense.approvals.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval Workflow</h2>
          
          {/* Current Status Banner */}
          {expense.status === 'pending' && (
            <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p className="text-sm font-medium text-yellow-800">
                ⏳ Pending Approval
                {expense.currentApprovalStep !== undefined && expense.approvalRule && (
                  <span className="ml-2">
                    (Step {expense.currentApprovalStep + 1} of {expense.approvals.length})
                  </span>
                )}
              </p>
              {(() => {
                const nextApprover = expense.approvals.find(a => 
                  a.status === 'pending' && 
                  (expense.currentApprovalStep === undefined || a.sequence === expense.currentApprovalStep)
                );
                if (nextApprover) {
                  return (
                    <p className="text-sm text-yellow-700 mt-1">
                      Waiting for: <strong>{nextApprover.approver.name}</strong> ({nextApprover.approver.role.toUpperCase()})
                    </p>
                  );
                }
              })()}
            </div>
          )}

          {expense.status === 'rejected' && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded">
              <p className="text-sm font-medium text-red-800">
                ❌ Expense Rejected
              </p>
              {(() => {
                const rejectedBy = expense.approvals.find(a => a.status === 'rejected');
                if (rejectedBy) {
                  return (
                    <p className="text-sm text-red-700 mt-1">
                      Rejected by: <strong>{rejectedBy.approver.name}</strong> ({rejectedBy.approver.role.toUpperCase()})
                    </p>
                  );
                }
              })()}
            </div>
          )}

          {expense.status === 'approved' && (
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded">
              <p className="text-sm font-medium text-green-800">
                ✅ Expense Approved
              </p>
              <p className="text-sm text-green-700 mt-1">
                All required approvals completed
              </p>
            </div>
          )}

          {/* Approval Timeline */}
          <div className="space-y-4">
            {expense.approvals.map((approval, index) => {
              const approvalStatus = getStatusBadge(approval.status);
              const isCurrentStep = expense.status === 'pending' && 
                                   approval.status === 'pending' &&
                                   (expense.currentApprovalStep === undefined || 
                                    approval.sequence === expense.currentApprovalStep);
              
              return (
                <div key={index} className={`flex items-start space-x-4 pb-4 border-b border-gray-200 last:border-0 ${
                  isCurrentStep ? 'bg-blue-50 -mx-4 px-4 py-4 rounded-lg' : ''
                }`}>
                  {/* Step Number or Status Icon */}
                  <div className="flex-shrink-0">
                    {approval.sequence !== undefined ? (
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                        approval.status === 'approved' ? 'bg-green-500 text-white' :
                        approval.status === 'rejected' ? 'bg-red-500 text-white' :
                        isCurrentStep ? 'bg-blue-500 text-white animate-pulse' :
                        'bg-gray-300 text-gray-600'
                      }`}>
                        {approval.status === 'approved' ? '✓' :
                         approval.status === 'rejected' ? '✗' :
                         index + 1}
                      </div>
                    ) : (
                      <div className={`h-10 w-10 rounded-full ${
                        approval.status === 'approved' ? 'bg-green-100' :
                        approval.status === 'rejected' ? 'bg-red-100' :
                        'bg-yellow-100'
                      } flex items-center justify-center`}>
                        <span className="text-sm font-semibold">
                          {approval.approver.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Approval Details */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-medium text-gray-900 flex items-center">
                          {approval.approver.name}
                          {isCurrentStep && (
                            <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                              Current Step
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 capitalize flex items-center">
                          {approval.approver.role}
                          {approval.sequence !== undefined && (
                            <span className="ml-2 text-xs text-gray-400">
                              • Step {approval.sequence + 1}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`${approvalStatus.class} capitalize flex items-center`}>
                        {approval.status === 'approved' && <CheckCircle className="h-4 w-4 mr-1" />}
                        {approval.status === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
                        {approval.status}
                      </span>
                    </div>

                    {approval.comments && (
                      <div className="mt-2 text-sm text-gray-700 bg-white border border-gray-200 p-3 rounded-lg">
                        <p className="font-medium text-gray-900 mb-1">Comments:</p>
                        {approval.comments}
                      </div>
                    )}

                    {approval.approvedAt && (
                      <p className="mt-2 text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(approval.approvedAt), 'MMM dd, yyyy hh:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Approval Rule Info */}
          {expense.approvalRule && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Approval Rule:</strong> {expense.approvalRule.name}
                <span className="ml-2 text-xs badge-info capitalize">
                  {expense.approvalRule.type}
                </span>
              </p>
              {expense.approvalRule.description && (
                <p className="text-xs text-gray-500 mt-1">{expense.approvalRule.description}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Approval Actions */}
      {canApprove() && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Take Action</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows="3"
                className="input-field"
                placeholder="Add your comments here..."
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleApproval('approve')}
                disabled={actionLoading}
                className="btn-success flex items-center disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Approve
              </button>
              <button
                onClick={() => handleApproval('reject')}
                disabled={actionLoading}
                className="btn-danger flex items-center disabled:opacity-50"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseDetail;
