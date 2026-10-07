import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, MessageSquare, ThumbsUp, ThumbsDown, Minus, Pencil, X, Star, Trash2 } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
}

interface Review {
  id: number;
  productId: number;
  productName: string;
  text: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  rating: number;
  createdAt: string;
}

interface AdminViewProps {
  token: string;
}

export default function AdminView({ token }: AdminViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  // New Product Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImage, setNewImage] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Draft Reply State
  const [draftReplies, setDraftReplies] = useState<Record<number, string>>({});
  const [isDrafting, setIsDrafting] = useState<Record<number, boolean>>({});

  const fetchData = () => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
    fetch('/api/reviews').then(res => res.json()).then(setReviews);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateDescription = async () => {
    if (!newName) {
      alert('Please enter a product name first.');
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName, currentDescription: newDesc, imageUrl: newImage }),
      });
      const data = await res.json();
      if (data.description) {
        setNewDesc(data.description);
      }
    } catch (error) {
      console.error('Failed to generate description:', error);
      alert('Failed to generate description. Please check your API key.');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) return;
    
    setIsAddingProduct(true);
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newName, price: newPrice, description: newDesc, imageUrl: newImage }),
      });
      if (res.ok) {
        handleCancelEdit();
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setNewName(product.name);
    setNewPrice(product.price.toString());
    setNewDesc(product.description || '');
    setNewImage(product.imageUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewPrice('');
    setNewDesc('');
    setNewImage('');
  };

  const handleDeleteProduct = async (id: number) => {
    // We cannot use window.confirm in iframe, so we'll use a custom modal or just delete directly for now.
    // Given the constraints, we'll implement a direct delete with a fallback or a custom state-based confirmation if needed.
    // For simplicity and avoiding window.confirm, we'll just delete directly.
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        if (editingId === id) {
          handleCancelEdit();
        }
        fetchData();
      } else {
        const data = await res.json();
        console.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleDraftReply = async (reviewId: number, reviewText: string) => {
    setIsDrafting(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch('/api/ai/generate-reply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewText, rating: reviews.find(r => r.id === reviewId)?.rating || 5 }),
      });
      const data = await res.json();
      if (data.reply) {
        setDraftReplies(prev => ({ ...prev, [reviewId]: data.reply }));
      }
    } catch (error) {
      console.error('Failed to draft reply:', error);
      alert('Failed to draft reply. Please check your API key.');
    } finally {
      setIsDrafting(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><ThumbsUp className="w-3 h-3" /> Positive</span>;
      case 'Negative':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><ThumbsDown className="w-3 h-3" /> Negative</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Minus className="w-3 h-3" /> Neutral</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Left Column: Inventory Management */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            {editingId ? (
              <>
                <Pencil className="w-5 h-5 text-indigo-600" />
                Edit Product
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-indigo-600" />
                Add New Inventory
              </>
            )}
          </h2>
          
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Bamboo Toothbrush"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDesc || !newName}
                  className="text-xs flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  {isGeneratingDesc ? 'Generating...' : '✨ Auto-Description'}
                </button>
              </div>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Product description..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {newImage && (
                <div className="mt-2">
                  <img src={newImage} alt="Preview" className="h-32 w-auto object-cover rounded-lg border border-gray-200" />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isAddingProduct}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isAddingProduct ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Product')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Current Inventory ({products.length})</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {products.map(product => (
              <div key={product.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-md object-cover border border-gray-200" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{product.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-700">${product.price.toFixed(2)}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(product)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Edit Product"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Customer Feedback */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          Customer Feedback
        </h2>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No feedback yet.</p>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="p-4 border border-gray-200 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {review.productName}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {getSentimentBadge(review.sentiment)}
                </div>
                
                <p className="text-gray-800 text-sm italic">"{review.text}"</p>
                <p className="text-xs text-gray-400">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                </p>
                
                <div className="pt-2">
                  {!draftReplies[review.id] ? (
                    <button
                      onClick={() => handleDraftReply(review.id, review.text)}
                      disabled={isDrafting[review.id]}
                      className="text-sm flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50 bg-indigo-50 px-3 py-1.5 rounded-lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isDrafting[review.id] ? 'Drafting...' : '🤖 Draft Reply'}
                    </button>
                  ) : (
                    <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg space-y-2">
                      <p className="text-sm text-indigo-900">{draftReplies[review.id]}</p>
                      <button 
                        onClick={() => navigator.clipboard.writeText(draftReplies[review.id])}
                        className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
