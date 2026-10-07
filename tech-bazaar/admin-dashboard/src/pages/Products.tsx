import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Sparkles, Upload, X } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ name: '', description: '', price: '', imageUrl: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
        return;
      }
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        imageUrl: product.imageUrl || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', imageUrl: '' });
    }
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const token = localStorage.getItem('token');
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
         if (res.status === 401 || res.status === 403) {
           localStorage.removeItem('token');
           localStorage.removeItem('role');
           window.location.href = '/login';
           return;
         }
         const errTxt = await res.text();
         setSaveError(`Failed to save! Status: ${res.status}. Message: ${errTxt}`);
         return;
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setSaveError(`Network error saving product: ${err}`);
    }
  };

  const generateDescription = async () => {
    if (!formData.name && !formData.imageUrl) {
      alert("Please enter a product name or upload an image first!");
      return;
    }
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: formData.name, 
          currentDescription: formData.description,
          imageUrl: formData.imageUrl
        })
      });

      if (!res.ok) {
         if (res.status === 401 || res.status === 403) {
           localStorage.removeItem('token');
           localStorage.removeItem('role');
           window.location.href = '/login';
           throw new Error('Session expired. Redirecting to login...');
         }
         const errorData = await res.json().catch(() => null);
         const errorMessage = errorData?.error || await res.text();
         throw new Error(errorMessage || `API error: ${res.status}`);
      }

      const data = await res.json();
      
      const updates: any = {};
      
      if (data.description) {
        let cleanDesc = data.description;
        // Aggressively strip markdown on the frontend for immediate effect
        cleanDesc = cleanDesc.replace(/\*\*/g, '');
        cleanDesc = cleanDesc.replace(/### /g, '');
        cleanDesc = cleanDesc.replace(/## /g, '');
        cleanDesc = cleanDesc.replace(/# /g, '');
        cleanDesc = cleanDesc.replace(/^[\*\-]\s/gm, '• ');
        updates.description = cleanDesc.trim();
      }
      
      if (data.name && !formData.name) {
        updates.name = data.name;
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message || "Failed to generate description"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSaveError("Image too large. Please select an image under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
        setSaveError(''); // Clear error if successful
      };
      reader.onerror = () => {
        setSaveError("Failed to read file.");
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="text-center py-20 text-blue-500 flex justify-center"><Sparkles className="animate-spin" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button 
          onClick={() => openModal()}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-neutral-900 overflow-hidden shadow-lg ring-1 ring-neutral-800 sm:rounded-lg">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-950">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Product Name</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Price</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">Description</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-900">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-neutral-800/50 transition-colors">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                  {product.name}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-300">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-3 py-4 text-sm text-neutral-400 max-w-xs truncate">
                  {product.description}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  <button onClick={() => openModal(product)} className="text-blue-400 hover:text-blue-300 mr-4 transition-colors">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}>
              <div className="absolute inset-0 bg-black opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div 
              className="relative z-10 inline-block align-bottom bg-neutral-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-neutral-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-xl leading-6 font-bold text-white mb-6">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <form onSubmit={handleSave}>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
                      <input 
                        type="text" 
                        required
                        className="block w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        className="block w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: e.target.value})}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-neutral-300">Description</label>
                        <button 
                          type="button" 
                          onClick={generateDescription}
                          disabled={isGenerating}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                          title="Enhance description using AI"
                        >
                          <Sparkles size={14} />
                          <span>{isGenerating ? 'Generating...' : 'Enhance with AI'}</span>
                        </button>
                      </div>
                      <textarea 
                        rows={5}
                        className="block w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Product Image</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-700 border-dashed rounded-lg hover:border-blue-500 transition-colors bg-neutral-800 relative group">
                        {formData.imageUrl ? (
                           <div className="relative w-full flex justify-center">
                             <img src={formData.imageUrl} alt="Preview" className="max-h-48 rounded object-contain" />
                             <button
                               type="button"
                               onClick={(e) => { e.preventDefault(); setFormData({...formData, imageUrl: ''}); }}
                               className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all translate-x-2 -translate-y-2 focus:opacity-100 z-10 shadow-lg"
                               title="Remove image"
                             >
                                <X size={14} />
                             </button>
                           </div>
                        ) : (
                          <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-12 w-12 text-neutral-500" />
                            <div className="flex text-sm text-neutral-400 justify-center mt-2">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer rounded-md font-medium text-blue-500 hover:text-blue-400 focus-within:outline-none"
                              >
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
                              </label>
                            </div>
                            <p className="text-xs text-neutral-500 mt-2">PNG, JPG, GIF up to 5MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {saveError && (
                    <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                      {saveError}
                    </div>
                  )}
                  <div className="mt-8 sm:flex sm:flex-row-reverse border-t border-neutral-800 pt-5">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-6 py-2.5 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                      Save Product
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-lg shadow-sm px-6 py-2.5 bg-neutral-800 text-base font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
