/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';
import LoginView from './components/LoginView';
import { Store, Shield, ShoppingCart, X, Search, LogOut } from 'lucide-react';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [purchasedProductIds, setPurchasedProductIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const handleLogin = (newToken: string, newUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAdmin(false);
  };

  if (!token) {
    return <LoginView onLogin={handleLogin} />;
  }

  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-100 font-sans selection:bg-cyan-500/30">
      <nav className="glass sticky top-0 z-50 px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-white/5">
        <div className="flex items-center gap-3 font-bold text-3xl tracking-tight">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <Store className="w-8 h-8 text-cyan-400" />
          </div>
          <span className="title-gradient">TechBazaar</span>
        </div>

        {!isAdmin && (
          <div className="flex-1 max-w-2xl w-full flex items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus-within:border-cyan-500/50 focus-within:ring-4 focus-within:ring-cyan-500/10 transition-all duration-300">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search cutting-edge technology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none ml-4 w-full text-gray-200 placeholder-gray-500 text-lg"
            />
          </div>
        )}

        <div className="flex items-center gap-5">
          {!isAdmin && (
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-cyan-400 rounded-2xl transition-all duration-300 group"
            >
              <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-cyan-400 to-green-400 text-black text-[10px] font-bold w-5 h-5 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-semibold text-gray-300"
            >
              {isAdmin ? <Store className="w-5 h-5 text-green-400" /> : <Shield className="w-5 h-5 text-cyan-400" />}
              {isAdmin ? 'Storefront' : 'Admin Panel'}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all text-sm font-semibold"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-8">
        {isAdmin ? <AdminView token={token} /> : <CustomerView token={token} onAddToCart={handleAddToCart} purchasedProductIds={purchasedProductIds} searchQuery={searchQuery} />}
      </main>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
                Your Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                  <ShoppingCart className="w-16 h-16 opacity-20" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4">
                    <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-50" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
                      <p className="text-blue-600 font-medium">${item.price.toFixed(2)}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 text-sm font-medium hover:text-red-700 transition-colors">Remove</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => {
                    alert('Checkout successful! Thank you for your purchase.');
                    const newPurchasedIds = cartItems.map(item => item.id);
                    setPurchasedProductIds(prev => Array.from(new Set([...prev, ...newPurchasedIds])));
                    setCartItems([]);
                    setIsCartOpen(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-lg transition-colors shadow-sm"
                >
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
