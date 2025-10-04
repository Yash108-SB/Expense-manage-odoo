import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import NewExpense from './pages/NewExpense';
import ExpenseDetail from './pages/ExpenseDetail';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import ApprovalRules from './pages/ApprovalRules';
import Analytics from './pages/Analytics';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Private Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/expenses" element={
            <PrivateRoute>
              <Layout><Expenses /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/expenses/new" element={
            <PrivateRoute>
              <Layout><NewExpense /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/expenses/:id" element={
            <PrivateRoute>
              <Layout><ExpenseDetail /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/approvals" element={
            <PrivateRoute roles={['admin', 'manager', 'ceo', 'cfo', 'cto', 'director']}>
              <Layout><Approvals /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/users" element={
            <PrivateRoute roles={['admin']}>
              <Layout><Users /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/approval-rules" element={
            <PrivateRoute roles={['admin']}>
              <Layout><ApprovalRules /></Layout>
            </PrivateRoute>
          } />
          
          <Route path="/analytics" element={
            <PrivateRoute roles={['admin', 'manager', 'ceo', 'cfo', 'cto', 'director']}>
              <Layout><Analytics /></Layout>
            </PrivateRoute>
          } />
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
