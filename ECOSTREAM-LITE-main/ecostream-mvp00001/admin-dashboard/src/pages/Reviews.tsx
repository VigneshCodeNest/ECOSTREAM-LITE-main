import { useState, useEffect } from 'react';
import { MessageSquare, Sparkles, Send, BarChart2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface Review {
  id: number;
  productId: number;
  productName: string;
  text: string;
  sentiment: string;
  rating: number;
  adminReply?: string;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
}

export default function Reviews() {
  const { getApiUrl, getToken } = useStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Analysis Panel State
  const [selectedProductForAnalysis, setSelectedProductForAnalysis] = useState<string>('');
  const [analysisText, setAnalysisText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reply State
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

  useEffect(() => {
    fetchData();
  }, [getApiUrl]); // Re-fetch if store changes

  const fetchData = async () => {
    try {
      const [revRes, prodRes] = await Promise.all([
        fetch(getApiUrl('/api/reviews')),
        fetch(getApiUrl('/api/products'))
      ]);
      const revData = await revRes.json();
      const prodData = await prodRes.json();
      setReviews(revData);
      setProducts(prodData);
      if (prodData.length > 0) {
        setSelectedProductForAnalysis(prodData[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeProductReviews = async () => {
    if (!selectedProductForAnalysis) return;
    setIsAnalyzing(true);
    setAnalysisText('');
    try {
      const token = getToken();
      const res = await fetch(getApiUrl('/api/ai/analyze-reviews'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: selectedProductForAnalysis })
      });
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      setAnalysisText(data.analysis || 'No analysis available.');
    } catch (err) {
      console.error(err);
      setAnalysisText('Failed to analyze reviews.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateReply = async (review: Review) => {
    setIsGeneratingReply(true);
    try {
      const token = getToken();
      const res = await fetch(getApiUrl('/api/ai/generate-reply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewText: review.text, rating: review.rating })
      });
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      setReplyText(data.reply);
    } catch (err) {
      console.error(err);
      alert('Failed to generate AI reply');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const saveReply = async (reviewId: number) => {
    try {
      const token = getToken();
      const res = await fetch(getApiUrl(`/api/reviews/${reviewId}/reply`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminReply: replyText })
      });
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        window.location.href = '/login';
        return;
      }
      setReplyingTo(null);
      setReplyText('');
      fetchData(); // Refresh reviews
    } catch (err) {
      console.error(err);
      alert('Failed to save reply');
    }
  };

  if (loading) return <div className="text-center py-20 text-emerald-500 flex justify-center"><Sparkles className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reviews & Customer Insights</h1>
      </div>

      {/* Analysis Panel */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 shadow-lg">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-emerald-900/40 rounded-lg">
            <BarChart2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold">AI Sentiment Analysis</h2>
        </div>
        
        <div className="flex space-x-4 mb-6">
          <select 
            className="flex-1 max-w-sm px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            value={selectedProductForAnalysis}
            onChange={(e) => setSelectedProductForAnalysis(e.target.value)}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            onClick={analyzeProductReviews}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Sparkles size={18} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Sentiment'}</span>
          </button>
        </div>

        {analysisText && (
          <div className="bg-neutral-950 p-6 rounded-lg border border-neutral-800">
            <h3 className="text-sm font-medium text-emerald-400 mb-2 uppercase tracking-wide">AI Summary</h3>
            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{analysisText}</p>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
          <MessageSquare className="w-6 h-6 text-emerald-400" />
          <span>Recent Customer Feedback</span>
        </h2>
        
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-neutral-950 rounded-lg p-5 border border-neutral-800 transition hover:border-neutral-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-white">{review.productName}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-yellow-400 text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span>
                    <span className="text-xs text-neutral-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  review.sentiment === 'Positive' ? 'bg-emerald-900/50 text-emerald-400' : 
                  review.sentiment === 'Negative' ? 'bg-red-900/50 text-red-400' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {review.sentiment || 'Neutral'}
                </span>
              </div>
              
              <p className="text-neutral-300 italic mb-4">"{review.text}"</p>
              
              {/* Admin Reply Section */}
              {review.adminReply && replyingTo !== review.id ? (
                <div className="mt-4 bg-neutral-900/80 p-4 rounded-lg border-l-4 border-emerald-500">
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1 block">Your Reply</span>
                  <p className="text-sm text-neutral-300">{review.adminReply}</p>
                  <button 
                    onClick={() => { setReplyingTo(review.id); setReplyText(review.adminReply!); }}
                    className="mt-2 text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                  >
                    Edit Reply
                  </button>
                </div>
              ) : replyingTo === review.id ? (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Draft Reply</label>
                    <button 
                      onClick={() => generateReply(review)}
                      disabled={isGeneratingReply}
                      className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Sparkles size={14} />
                      <span>{isGeneratingReply ? 'Generating...' : 'Auto-Draft with AI'}</span>
                    </button>
                  </div>
                  <textarea 
                    rows={3}
                    className="block w-full px-4 py-3 bg-neutral-900 border border-emerald-800/50 rounded-lg text-white focus:outline-none focus:border-emerald-500 sm:text-sm"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                  />
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => saveReply(review.id)}
                      className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Send size={16} className="mr-2" /> Publish Reply
                    </button>
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                  className="mt-2 text-sm text-emerald-500 hover:text-emerald-400 font-medium flex items-center transition-colors"
                >
                  <MessageSquare size={16} className="mr-1.5" />
                  Write a reply
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
