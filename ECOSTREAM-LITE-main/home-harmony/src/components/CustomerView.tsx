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
        <div className="relative h-[500px] rounded-[48px] overflow-hidden mb-20 group">
          <img 
            src="/images/hero.png" 
            alt="HomeHarmony Hero" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-900/40 via-transparent to-transparent flex flex-col justify-center px-16 space-y-6">
            <h2 className="text-white/90 font-bold uppercase tracking-[0.4em] text-xs">The Art of Living</h2>
            <h1 className="text-6xl font-bold text-white leading-tight drop-shadow-lg">
              Sanctuary Found.
            </h1>
            <p className="text-xl text-white max-w-lg leading-relaxed font-medium drop-shadow-md">
              Handcrafted comforts and timeless furniture designed to turn every house into a home.
            </p>
            <div className="pt-4">
              <button className="bg-white text-orange-950 px-10 py-4 rounded-full font-bold text-lg hover:bg-orange-50 transition-all shadow-xl">
                Explore The Collection
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-6 mb-12">
          <h2 className="text-3xl font-bold text-[#3C3C3C]">
            {searchQuery ? `Searching for "${searchQuery}"` : 'Shop by Category'}
          </h2>
          <div className="h-px bg-[#8A9A5B]/20 flex-1"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredProducts.map((product) => {
            const hasPurchased = purchasedProductIds.includes(product.id);
            return (
              <div key={product.id} className="cozy-card group flex flex-col bg-white">
                <div className="aspect-square relative cursor-pointer overflow-hidden p-6" onClick={() => setSelectedProduct(product.id)}>
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover rounded-[20px] transition-transform duration-500 group-hover:scale-105" 
                    referrerPolicy="no-referrer" 
                  />
                  {product.averageRating >= 4.5 && (
                    <span className="absolute top-10 left-10 bg-white shadow-lg text-[#E2725B] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-[#E2725B]/10">
                      Editor's Choice
                    </span>
                  )}
                </div>
                <div className="px-8 pb-8 pt-2 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-[#3C3C3C] mb-2 group-hover:text-[#8A9A5B] transition-colors cursor-pointer" onClick={() => setSelectedProduct(product.id)}>
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-3 mb-4">
                    {renderStars(Math.round(product.averageRating))}
                    <span className="text-xs font-bold text-[#3C3C3C]/40">
                      ({product.reviewCount} REVIEWS)
                    </span>
                  </div>

                  <p className="text-[#3C3C3C]/60 text-sm line-clamp-2 mb-6 font-medium leading-relaxed">
                    {product.description}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#3C3C3C]">${product.price.toFixed(2)}</span>
                    <button
                      onClick={() => onAddToCart(product)}
                      className="p-4 bg-[#8A9A5B]/10 group-hover:bg-[#8A9A5B] hover:scale-110 text-[#8A9A5B] group-hover:text-white rounded-[18px] transition-all duration-300 shadow-sm border border-[#8A9A5B]/10"
                    >
                      <ShoppingCart className="w-6 h-6" />
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
                <p className="text-2xl font-bold text-amber-600 mb-4">
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
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
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
                            <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold">
                              U
                            </div>
                            <span className="font-medium text-gray-900 flex items-center gap-1">
                              Verified Buyer
                              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
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
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        disabled={isSubmitting}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || !reviewText.trim()}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
