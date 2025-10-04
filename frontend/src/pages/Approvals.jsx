import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { CheckCircle, XCircle, Clock, User, Filter, TrendingUp, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Approvals = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalRule, setApprovalRule] = useState(null);

  useEffect(() => {
    fetchExpenses();
    fetchApprovalRule();
  }, [activeTab]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/expenses');
      
      console.log('Fetched all company expenses:', data.data.length);
      console.log('User role:', user?.role);
      
      // Store all expenses for stats calculation
      setAllExpenses(data.data);
      
      // Filter based on active tab
      let filteredExpenses = data.data;
      if (activeTab === 'pending') {
        filteredExpenses = data.data.filter(e => e.status === 'pending');
      } else if (activeTab === 'approved') {
        filteredExpenses = data.data.filter(e => e.status === 'approved');
      } else if (activeTab === 'rejected') {
        filteredExpenses = data.data.filter(e => e.status === 'rejected');
      }
      
      console.log(`Filtered expenses for tab "${activeTab}":`, filteredExpenses.length);
      setExpenses(filteredExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalRule = async () => {
    try {
      const { data } = await api.get('/approval-rules');
      // Get the first active rule (you might want to enhance this logic)
      const activeRule = data.data.find(rule => rule.isActive);
      setApprovalRule(activeRule);
    } catch (error) {
      console.error('Error fetching approval rule:', error);
    }
  };

  const handleApproval = async (expenseId, action) => {
    try {
      await api.put(`/expenses/${expenseId}/approve`, {
        action,
        comments: `${action === 'approve' ? 'Approved' : 'Rejected'} by ${user.role}`
      });
      toast.success(`Expense ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchExpenses();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error(error.response?.data?.message || 'Failed to process approval');
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    }
  };

  const getApprovalTypeLabel = (type) => {
    const labels = {
      sequential: '📋 Sequential Approval',
      percentage: '📊 Percentage-based Approval',
      specific: '⚡ Specific Approver',
      hybrid: '🔀 Hybrid Approval'
    };
    return labels[type] || type;
  };

  const stats = {
    pending: allExpenses.filter(e => e.status === 'pending').length,
    approved: allExpenses.filter(e => e.status === 'approved').length,
    rejected: allExpenses.filter(e => e.status === 'rejected').length,
    totalAmount: allExpenses.reduce((sum, e) => sum + e.convertedAmount, 0),
    uniqueEmployees: new Set(allExpenses.map(e => e.employee?._id)).size
  };

  const tabs = [
    { id: 'all', label: 'All Expenses', count: allExpenses.length, icon: Filter },
    { id: 'pending', label: 'Pending', count: stats.pending, icon: Clock, color: 'text-yellow-600' },
    { id: 'approved', label: 'Approved', count: stats.approved, icon: CheckCircle, color: 'text-green-600' },
    { id: 'rejected', label: 'Rejected', count: stats.rejected, icon: XCircle, color: 'text-red-600' }
  ];

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Expense Approvals</h1>
        <p className="text-gray-600 mt-1">
          Review and manage all company expense claims
        </p>
      </div>

      {/* Approval Rule Info */}
      {approvalRule && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Active Approval Workflow</h3>
              <p className="text-sm text-gray-700 mb-2">
                <strong>{approvalRule.name}:</strong> {getApprovalTypeLabel(approvalRule.type)}
              </p>
              {approvalRule.description && (
                <p className="text-sm text-gray-600">{approvalRule.description}</p>
              )}
              {approvalRule.type === 'sequential' && (
                <p className="text-xs text-gray-600 mt-2">
                  ℹ️ Expenses follow a sequential approval chain
                </p>
              )}
              {approvalRule.type === 'percentage' && approvalRule.percentageRequired && (
                <p className="text-xs text-gray-600 mt-2">
                  ℹ️ Requires {approvalRule.percentageRequired}% of approvers to approve
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">
                {user?.company?.currency?.symbol}{stats.totalAmount.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uniqueEmployees}</p>
            </div>
            <User className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className={`h-5 w-5 mr-2 ${tab.color || ''}`} />
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  activeTab === tab.id ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Expenses List */}
      <div className="card">
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No {activeTab} expenses</p>
            <p className="text-sm text-gray-500">
              {activeTab === 'pending' ? "You're all caught up!" : `No ${activeTab} expenses found.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expense
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
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
                {expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-700 font-semibold">
                              {expense.employee?.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {expense.employee?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {expense.employee?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {expense.title}
                      </div>
                      {expense.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {expense.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.company?.currency?.symbol}{expense.convertedAmount.toFixed(2)}
                      </div>
                      {expense.currency !== expense.companyCurrency && (
                        <div className="text-xs text-gray-500">
                          {expense.amount.toFixed(2)} {expense.currency}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                        expense.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Link
                        to={`/expenses/${expense._id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </Link>
                      {expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproval(expense._id, 'approve')}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(expense._id, 'reject')}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {(user?.role === 'admin' || expense.employee?._id === user?.id) && (
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Approvals;
