import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Products from './pages/Products';
import Reviews from './pages/Reviews';
import { Leaf } from 'lucide-react';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token || role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {!isAuthPage && token && (
        <nav className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <Leaf className="w-6 h-6 text-blue-500" />
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-500 bg-clip-text text-transparent">TechBazaar Admin</span>
                </div>
                <div className="flex space-x-4">
                  <Link to="/" className="text-neutral-300 hover:bg-neutral-800 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Products</Link>
                  <Link to="/reviews" className="text-neutral-300 hover:bg-neutral-800 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">Reviews & Insights</Link>
                </div>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={handleLogout}
                  className="bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-neutral-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={!isAuthPage ? 'max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Products /></RequireAuth>} />
          <Route path="/reviews" element={<RequireAuth><Reviews /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}
