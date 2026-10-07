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
    <div className="min-h-screen bg-[#FAF9F6] text-[#2C2C2C] selection:bg-[#D4AF37]/20 uppercase-headings">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 px-12 py-6 flex flex-col sm:flex-row justify-between items-center gap-8 border-b border-[#E5E4E2]">
        <div className="flex flex-col items-center sm:items-start group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2C2C2C] flex items-center justify-center rounded-sm group-hover:bg-[#D4AF37] transition-colors duration-500">
              <Store className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-serif tracking-[0.05em] uppercase text-[#2C2C2C]">Style Avenue</h1>
          </div>
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#D4AF37] mt-1 ml-13 font-semibold">Exquisite Fashion</span>
        </div>

        {!isAdmin && (
          <div className="flex-1 max-w-lg w-full flex items-center border-b border-[#2C2C2C]/20 focus-within:border-[#D4AF37] transition-all duration-500 py-2">
            <Search className="w-5 h-5 text-[#2C2C2C]/40" />
            <input
              type="text"
              placeholder="Discover your next statement piece..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none ml-4 w-full text-[#2C2C2C] placeholder-[#2C2C2C]/30 italic font-serif text-lg"
            />
          </div>
        )}

        <div className="flex items-center gap-8">
          {!isAdmin && (
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-[#2C2C2C] hover:text-[#D4AF37] transition-all duration-300 group"
            >
              <ShoppingCart className="w-7 h-7 stroke-[1.5px]" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center tracking-tighter">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className="flex items-center gap-2 px-3 py-1.5 border border-[#2C2C2C]/10 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#2C2C2C] hover:text-white transition-all duration-500 rounded-full"
            >
              {isAdmin ? 'Store' : 'Admin'}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-500 hover:text-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-12">
        <header className={!isAdmin ? "text-center mb-16" : "mb-8"}>
          {!isAdmin && (
            <>
              <h2 className="text-sm uppercase tracking-[0.5em] text-[#D4AF37] font-semibold mb-4">The Selection</h2>
              <div className="w-12 h-px bg-[#D4AF37] mx-auto"></div>
            </>
          )}
        </header>

        {isAdmin ? <AdminView token={token} /> : <CustomerView token={token} onAddToCart={handleAddToCart} purchasedProductIds={purchasedProductIds} searchQuery={searchQuery} />}
      </main>

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-rose-600" />
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
                      <p className="text-rose-600 font-medium">${item.price.toFixed(2)}</p>
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
                  <span className="text-2xl font-bold text-rose-600">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => {
                    alert('Checkout successful! Thank you for your purchase.');
                    const newPurchasedIds = cartItems.map(item => item.id);
                    setPurchasedProductIds(prev => Array.from(new Set([...prev, ...newPurchasedIds])));
                    setCartItems([]);
                    setIsCartOpen(false);
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-bold text-lg transition-colors shadow-sm"
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
