import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageSquarePlus, Send, Star } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  averageRating: number;
  reviewCount: number;
}

interface CustomerViewProps {
  token: string;
  onAddToCart: (product: Product) => void;
  purchasedProductIds: number[];
  searchQuery: string;
}

export default function CustomerView({ token, onAddToCart, purchasedProductIds, searchQuery }: CustomerViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Error fetching products:', err));
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetch(`/api/products/${selectedProduct}/reviews`)
        .then(res => res.json())
        .then(data => setReviews(data))
        .catch(err => console.error('Error fetching reviews:', err));
    }
  }, [selectedProduct]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !reviewText.trim()) return;

    setIsSubmitting(true);
    try {
      let sentiment = 'Neutral';
      try {
        const res = await fetch('/api/ai/analyze-sentiment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reviewText }),
        });
        const data = await res.json();
        sentiment = data.sentiment || 'Neutral';
      } catch (aiError) {
        console.error('AI Sentiment Analysis failed, defaulting to Neutral:', aiError);
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: selectedProduct, text: reviewText, sentiment, rating: reviewRating }),
      });
      
      if (res.ok) {
        setReviewText('');
        setReviewRating(5);
        const updatedReviews = await fetch(`/api/products/${selectedProduct}/reviews`).then(r => r.json());
        setReviews(updatedReviews);
        
        // Refresh products to update average rating
        const updatedProducts = await fetch('/api/products').then(r => r.json());
        setProducts(updatedProducts);
      } else {
        alert('Failed to submit review.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner (Only show if no search query) */}
      {!searchQuery && (
        <div className="relative h-[600px] mb-20 overflow-hidden flex items-center justify-center">
          <img 
            src="/images/hero.png" 
            alt="StyleAvenue Luxury Hero" 
            className="absolute inset-0 w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-1000" 
          />
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 max-w-4xl px-6 text-center">
            <h2 className="text-xs uppercase tracking-[1em] text-[#C5A059] mb-8 font-bold">The 2026 Collection</h2>
            <h1 className="text-7xl md:text-8xl font-serif text-white mb-8 leading-tight italic">Elegance Redefined</h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto font-light leading-relaxed mb-10 serif">
              Curated haute couture for the sophisticated individual. A masterpiece in every stitch.
            </p>
            <div className="w-px h-24 bg-[#C5A059] mx-auto"></div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col items-center mb-16">
          <h2 className="text-3xl font-serif text-[#2C2C2C] mb-4">
            {searchQuery ? `Search: ${searchQuery}` : 'The Boutique'}
          </h2>
          <div className="w-24 h-[1px] bg-[#D4AF37]"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {filteredProducts.map((product) => {
            const hasPurchased = purchasedProductIds.includes(product.id);
            return (
              <div key={product.id} className="luxury-card flex flex-col group cursor-pointer" onClick={() => setSelectedProduct(product.id)}>
                <div className="aspect-[3/4] overflow-hidden mb-8 bg-[#FAF9F6] relative">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute inset-0 border border-white/20 m-4 group-hover:m-2 transition-all duration-500 pointer-events-none"></div>
                </div>
                
                <div className="flex-1 flex flex-col px-2">
                  <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-[#2C2C2C] mb-3 group-hover:text-[#D4AF37] transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-lg font-serif italic text-[#2C2C2C]/70">
                      ${product.price.toLocaleString()}
                    </span>
                    <div className="w-8 h-[1px] bg-[#D4AF37]/30"></div>
                    <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">
                      {product.averageRating > 0 ? `${product.averageRating.toFixed(1)} Rating` : 'New Piece'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-[#2C2C2C]/50 font-light line-clamp-2 leading-relaxed mb-8 italic font-serif">
                    {product.description}
                  </p>
                  
                  <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                      }}
                      className="btn-luxe w-full text-xs py-4"
                    >
                      Acquire
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Details & Review Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Side: Product Details */}
            {products.find(p => p.id === selectedProduct) && (
              <div className="md:w-1/2 bg-gray-50 p-6 overflow-y-auto border-r border-gray-100">
                <div className="aspect-square rounded-xl overflow-hidden mb-6 bg-white">
                  <img 
                    src={products.find(p => p.id === selectedProduct)?.imageUrl} 
                    alt={products.find(p => p.id === selectedProduct)?.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {products.find(p => p.id === selectedProduct)?.name}
                </h3>
                <div className="flex items-center gap-2 mb-4">
                  {renderStars(Math.round(products.find(p => p.id === selectedProduct)?.averageRating || 0))}
                  <span className="text-sm text-gray-600 font-medium">
                    {products.find(p => p.id === selectedProduct)?.averageRating.toFixed(1)} out of 5
                  </span>
                  <span className="text-sm text-gray-400">
                    ({products.find(p => p.id === selectedProduct)?.reviewCount} reviews)
                  </span>
                </div>
                <p className="text-2xl font-bold text-rose-600 mb-4">
                  ${products.find(p => p.id === selectedProduct)?.price.toFixed(2)}
                </p>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {products.find(p => p.id === selectedProduct)?.description}
                </p>
                <button
                  onClick={() => {
                    const product = products.find(p => p.id === selectedProduct);
                    if (product) onAddToCart(product);
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
              </div>
            )}

            {/* Right Side: Reviews */}
            <div className="md:w-1/2 flex flex-col h-full max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="text-xl font-bold text-gray-900">Customer Reviews</h3>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 bg-white rounded-xl border border-gray-100">No reviews yet. Be the first!</p>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-bold">
                              U
                            </div>
                            <span className="font-medium text-gray-900 flex items-center gap-1">
                              Verified Buyer
                              <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </div>
                          {renderStars(review.rating)}
                        </div>
                      <p className="text-gray-700 mt-2">{review.text}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white">
                {purchasedProductIds.includes(selectedProduct) ? (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-8 h-8 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your thoughts about this product..."
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        disabled={isSubmitting}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || !reviewText.trim()}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? 'Submitting...' : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-600 font-medium">You must purchase this product to write a review.</p>
                    <p className="text-sm text-gray-500 mt-1">Add it to your cart and checkout to become a Verified Buyer.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
