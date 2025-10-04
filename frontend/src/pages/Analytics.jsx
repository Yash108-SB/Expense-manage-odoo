import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';

const Analytics = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data } = await api.get('/expenses');
      setExpenses(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryData = expenses.reduce((acc, exp) => {
    const cat = exp.category;
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += exp.convertedAmount;
    return acc;
  }, {});

  const chartData = Object.entries(categoryData).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

  const stats = {
    total: expenses.reduce((sum, e) => sum + e.convertedAmount, 0),
    approved: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.convertedAmount, 0),
    pending: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.convertedAmount, 0),
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics & Insights</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card"><p className="text-sm text-gray-600">Total Spent</p><p className="text-2xl font-bold">{user?.company?.currency?.symbol}{stats.total.toFixed(2)}</p></div>
        <div className="card"><p className="text-sm text-gray-600">Approved</p><p className="text-2xl font-bold text-green-600">{user?.company?.currency?.symbol}{stats.approved.toFixed(2)}</p></div>
        <div className="card"><p className="text-sm text-gray-600">Pending</p><p className="text-2xl font-bold text-yellow-600">{user?.company?.currency?.symbol}{stats.pending.toFixed(2)}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
