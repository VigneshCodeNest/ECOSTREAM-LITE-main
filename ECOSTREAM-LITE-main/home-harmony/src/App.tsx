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
    <div className="min-h-screen bg-[#FDFBF7] text-[#3C3C3C] font-sans selection:bg-[#8A9A5B]/20">
      <nav className="bg-white/70 backdrop-blur-lg sticky top-0 z-50 px-10 py-5 flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-[#8A9A5B]/10">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 bg-[#8A9A5B]/10 flex items-center justify-center rounded-[18px] group-hover:bg-[#8A9A5B] transition-all duration-500">
            <Store className="w-7 h-7 text-[#8A9A5B] group-hover:text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3C3C3C]">HomeHarmony</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8A9A5B] font-bold">Curated Comforts</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="flex-1 max-w-2xl w-full flex items-center bg-white border border-[#8A9A5B]/20 rounded-full px-6 py-3 shadow-sm focus-within:ring-4 focus-within:ring-[#8A9A5B]/10 transition-all">
            <Search className="w-5 h-5 text-[#8A9A5B]/50" />
            <input
              type="text"
              placeholder="What makes your house a home?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none ml-4 w-full text-[#3C3C3C] placeholder-[#3C3C3C]/40 text-lg"
            />
          </div>
        )}

        <div className="flex items-center gap-6">
          {!isAdmin && (
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-3 bg-white hover:bg-[#FDFBF7] border border-[#8A9A5B]/10 text-[#8A9A5B] rounded-2xl transition-all shadow-sm"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E2725B] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-[#8A9A5B]/20 text-[#8A9A5B] hover:bg-[#8A9A5B] hover:text-white transition-all"
            >
              {isAdmin ? 'Visit Store' : 'Staff Login'}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-10">
        {isAdmin ? <AdminView token={token} /> : <CustomerView token={token} onAddToCart={handleAddToCart} purchasedProductIds={purchasedProductIds} searchQuery={searchQuery} />}
      </main>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-amber-600" />
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
                      <p className="text-amber-600 font-medium">${item.price.toFixed(2)}</p>
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
                  <span className="text-2xl font-bold text-amber-600">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => {
                    alert('Checkout successful! Thank you for your purchase.');
                    const newPurchasedIds = cartItems.map(item => item.id);
                    setPurchasedProductIds(prev => Array.from(new Set([...prev, ...newPurchasedIds])));
                    setCartItems([]);
                    setIsCartOpen(false);
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl font-bold text-lg transition-colors shadow-sm"
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
