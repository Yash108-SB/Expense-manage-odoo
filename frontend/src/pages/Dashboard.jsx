import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/axios';
import {
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  Users,
  DollarSign,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
    totalAmount: 0,
    pendingApprovals: 0
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalRule, setApprovalRule] = useState(null);
  const [pendingForApproval, setPendingForApproval] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    if (isManager) {
      fetchApprovalRule();
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [expensesRes, approvalsRes] = await Promise.all([
        api.get('/expenses'),
        isManager ? api.get('/expenses/pending-approvals') : Promise.resolve({ data: { count: 0 } })
      ]);

      const expenses = expensesRes.data.data;
      const pendingExpenses = expenses.filter(e => e.status === 'pending');

      console.log('Dashboard - Total expenses:', expenses.length);
      console.log('Dashboard - User role:', user?.role);
      console.log('Dashboard - Is Manager:', isManager);
      console.log('Dashboard - Pending expenses for approval:', pendingExpenses.length);

      setStats({
        totalExpenses: expenses.length,
        pendingExpenses: pendingExpenses.length,
        approvedExpenses: expenses.filter(e => e.status === 'approved').length,
        rejectedExpenses: expenses.filter(e => e.status === 'rejected').length,
        totalAmount: expenses.reduce((sum, e) => sum + e.convertedAmount, 0),
        pendingApprovals: approvalsRes.data.count || 0
      });

      setRecentExpenses(expenses.slice(0, 5));
      setPendingForApproval(pendingExpenses.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalRule = async () => {
    try {
      const { data } = await api.get('/approval-rules');
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
      fetchDashboardData();
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
      fetchDashboardData();
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

  const statCards = [
    {
      title: 'Total Expenses',
      value: stats.totalExpenses,
      icon: Receipt,
      color: 'bg-blue-500',
      show: true
    },
    {
      title: 'Pending',
      value: stats.pendingExpenses,
      icon: Clock,
      color: 'bg-yellow-500',
      show: true
    },
    {
      title: 'Approved',
      value: stats.approvedExpenses,
      icon: CheckCircle,
      color: 'bg-green-500',
      show: true
    },
    {
      title: 'Rejected',
      value: stats.rejectedExpenses,
      icon: XCircle,
      color: 'bg-red-500',
      show: true
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Users,
      color: 'bg-purple-500',
      show: isManager
    },
    {
      title: 'Total Amount',
      value: `${user?.company?.currency?.symbol || ''}${stats.totalAmount.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-indigo-500',
      show: true
    }
  ].filter(card => card.show);

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger'
    };
    return badges[status] || 'badge-gray';
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
      {/* Welcome Section */}
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          {isManager 
            ? "Approve/reject expenses (amounts in company's currency), view team expenses, and escalate as per rules"
            : "Here's an overview of your expense activity"
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Approval Workflow Info for Managers */}
      {isManager && approvalRule && (
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Active Approval Workflow</h3>
              <p className="text-sm text-gray-700 mb-2">
                <strong>{approvalRule.name}:</strong> {getApprovalTypeLabel(approvalRule.type)}
              </p>
              {approvalRule.description && (
                <p className="text-sm text-gray-600 mb-2">{approvalRule.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                {approvalRule.type === 'sequential' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Sequential approval chain
                  </span>
                )}
                {approvalRule.type === 'percentage' && approvalRule.percentageRequired && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    Requires {approvalRule.percentageRequired}% approval
                  </span>
                )}
                {approvalRule.requireManagerFirst && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Manager approval first
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Expenses for Approval (Managers/Executives Only) */}
      {isManager && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Review Approvals</h2>
              <p className="text-sm text-gray-600 mt-1">Pending expenses awaiting your approval</p>
            </div>
            <Link to="/approvals" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all ({stats.pendingExpenses})
            </Link>
          </div>

          {pendingForApproval.filter(expense => expense.status === 'pending').length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No pending approvals</p>
              <p className="text-sm text-gray-500">You're all caught up!</p>
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
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingForApproval.filter(expense => expense.status === 'pending').map((expense) => (
                    <tr key={expense._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {expense.employee?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {expense.employee?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                        <div className="text-xs text-gray-500">{expense.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user?.company?.currency?.symbol}{expense.convertedAmount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <Link
                          to={`/expenses/${expense._id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleApproval(expense._id, 'approve')}
                          className="text-green-600 hover:text-green-700 font-medium inline-flex items-center"
                          title="Approve"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApproval(expense._id, 'reject')}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center"
                          title="Reject"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
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
      )}

      {/* Recent Expenses */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isManager ? 'Recent Company Expenses' : 'Recent Expenses'}
          </h2>
          <Link to="/expenses" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all
          </Link>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No expenses yet</p>
            {!isManager && (
              <Link to="/expenses/new" className="btn-primary mt-4 inline-block">
                Create your first expense
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {isManager && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentExpenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50">
                    {isManager && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {expense.employee?.name}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/expenses/${expense._id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {expense.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {user?.company?.currency?.symbol}{expense.convertedAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(expense.expenseDate), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${getStatusBadge(expense.status)} capitalize`}>
                        {expense.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!isManager && (
          <Link to="/expenses/new" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Receipt className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Submit Expense</h3>
                <p className="text-sm text-gray-600">Create new expense claim</p>
              </div>
            </div>
          </Link>
        )}

        {isManager && (
          <Link to="/approvals" className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Review Approvals</h3>
                <p className="text-sm text-gray-600">Approve/reject team expenses & escalate</p>
              </div>
            </div>
          </Link>
        )}

        <Link to="/expenses" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">{isManager ? 'View Team Expenses' : 'View History'}</h3>
              <p className="text-sm text-gray-600">{isManager ? 'Company expense records' : 'All expense records'}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
