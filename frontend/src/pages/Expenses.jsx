import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { Plus, Filter, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, expenses]);

  const fetchExpenses = async () => {
    try {
      const { data } = await api.get('/expenses');
      setExpenses(data.data);
      setFilteredExpenses(data.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
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

  const applyFilters = () => {
    let filtered = [...expenses];

    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.search) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredExpenses(filtered);
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
      draft: 'badge-gray'
    };
    return badges[status] || 'badge-gray';
  };

  const categories = ['Travel', 'Food', 'Office Supplies', 'Equipment', 'Utilities', 'Marketing', 'Training', 'Entertainment', 'Other'];

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
          <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
          <p className="text-gray-600 mt-1">Track and manage your expense claims</p>
        </div>
        <Link to="/expenses/new" className="btn-primary inline-flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          New Expense
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="search"
              placeholder="Search expenses..."
              value={filters.search}
              onChange={handleFilterChange}
              className="input-field pl-10"
            />
          </div>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="input-field"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
          </select>

          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="input-field"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => setFilters({ status: '', category: '', search: '' })}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="card">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No expenses found</p>
            <Link to="/expenses/new" className="btn-primary">
              Create Expense
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50">
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
                      <span className={`${getStatusBadge(expense.status)} capitalize`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                      <Link
                        to={`/expenses/${expense._id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View
                      </Link>
                      {(user?.role === 'admin' || expense.employee?._id === user?.id) && (
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center"
                          title="Delete expense"
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900">
            {user?.company?.currency?.symbol}
            {filteredExpenses.reduce((sum, e) => sum + e.convertedAmount, 0).toFixed(2)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
          <p className="text-2xl font-bold text-gray-900">
            {filteredExpenses.filter(e => e.status === 'pending').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
