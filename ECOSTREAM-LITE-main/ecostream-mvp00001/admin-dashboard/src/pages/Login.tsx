import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Store as StoreIcon } from 'lucide-react';
import { useStore, STORES } from '../context/StoreContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentStore, setStore, getApiUrl, setToken } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.user.role !== 'admin') {
          setError('Admin access required.');
          return;
        }
        setToken(data.token);
        navigate('/');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error: Could not connect to ' + currentStore.name + ' backend (Port ' + currentStore.port + ')');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-50">
      <div className="max-w-md w-full space-y-8 bg-neutral-900 p-10 rounded-2xl border border-neutral-800 shadow-2xl">
        <div>
          <div className="mx-auto h-16 w-16 bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <Leaf className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            EcoStream Admin
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-400">
            Universal portal to manage all your stores
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="hidden">
              <label className="block text-sm font-medium text-neutral-400 mb-1">Select Store</label>
              <div className="relative">
                <StoreIcon className="absolute left-3 top-3.5 h-4 w-4 text-emerald-500" />
                <select
                  className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  value={currentStore.id}
                  onChange={(e) => setStore(e.target.value)}
                >
                  {STORES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Port {s.port})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="sr-only">Username</label>
              <input
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-neutral-700 bg-neutral-800 placeholder-neutral-500 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Admin Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div>
              <label className="sr-only">Password</label>
              <input
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-neutral-700 bg-neutral-800 placeholder-neutral-500 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-emerald-500 group-hover:text-emerald-400" />
              </span>
              Sign in to {currentStore.name}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
