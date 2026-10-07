import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Products from './pages/Products';
import Reviews from './pages/Reviews';
import { Leaf, Store as StoreIcon, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore, STORES } from './context/StoreContext';

function RequireAuth({ children }: { children: ReactNode }) {
  const { getToken } = useStore();
  const token = getToken();
  const role = localStorage.getItem('role'); // Role is standardized for admin dashboard
  
  if (!token || role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const location = useLocation();
  const { currentStore, setStore, getToken, logout } = useStore();
  const token = getToken();

  const isAuthPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {!isAuthPage && token && (
        <nav className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2 mr-4">
                  <Leaf className="w-6 h-6 text-emerald-500" />
                  <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">EcoStream Admin</span>
                </div>
                
                {/* Store Switcher in Nav */}
                <div className="flex items-center bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">
                  <StoreIcon className="w-4 h-4 text-emerald-500 mr-2" />
                  <select 
                    className="bg-transparent text-sm font-medium text-white focus:outline-none border-none pr-6"
                    value={currentStore.id}
                    onChange={(e) => setStore(e.target.value)}
                  >
                    {STORES.map(s => (
                      <option key={s.id} value={s.id} className="bg-neutral-900">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-4 border-l border-neutral-800 pl-8">
                  <Link to="/" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-emerald-400'}`}>Products</Link>
                  <Link to="/reviews" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/reviews' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-emerald-400'}`}>Reviews & Insights</Link>
                </div>
              </div>
              
              <div className="flex items-center">
                <button 
                  onClick={logout}
                  className="flex items-center space-x-2 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-red-900/40 hover:border-red-900/50 px-4 py-2 rounded-md text-sm font-medium transition-all border border-neutral-700"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
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
