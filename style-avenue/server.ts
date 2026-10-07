import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const OPENROUTER_MODELS = [
  "liquid/lfm-2.5-1.2b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "google/gemma-4-31b-it:free",
  "openrouter/auto"
];

const genAI = new GoogleGenAI(GEMINI_API_KEY);

async function fetchGemini(prompt: string, imageUrl?: string) {
  try {
    const response = await (genAI as any).models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });
    return response.text;
  } catch (e: any) {
    console.error("Gemini Fallback Failed:", e.message);
    throw e;
  }
}

async function fetchOpenRouter(prompt: string, imageUrl?: string) {
  let content: any = prompt;
  
  if (imageUrl && imageUrl.startsWith('data:image/')) {
     content = [
       { type: "text", text: prompt },
       { type: "image_url", image_url: { url: imageUrl } }
     ];
  }

  let lastError = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "EcoStream API"
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: content }]
        })
      });
      
      if (!response.ok) {
         const txt = await response.text();
         lastError = new Error(`OpenRouter Error ${response.status} on ${model}: ${txt}`);
         continue; 
      }
      
      const data = await response.json();
      if (data.error) {
         lastError = new Error(data.error.message);
         continue;
      }
      
      return data.choices[0].message.content || '';
    } catch (e) {
      lastError = e;
    }
  }

  console.warn("OpenRouter exhausted, attempting Gemini fallback...");
  return await fetchGemini(prompt, imageUrl);
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Set it in your environment before starting the server.");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SQLite Database
const db = new Database('database.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer'
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    imageUrl TEXT
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    text TEXT NOT NULL,
    sentiment TEXT,
    rating INTEGER DEFAULT 5,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(productId) REFERENCES products(id)
  );
`);

// Add missing columns if they don't exist (for existing databases)
try {
  db.exec('ALTER TABLE reviews ADD COLUMN rating INTEGER DEFAULT 5;');
} catch (e) {
  // Column might already exist, ignore
}

try {
  db.exec('ALTER TABLE reviews ADD COLUMN createdAt DATETIME;');
  db.exec("UPDATE reviews SET createdAt = datetime('now') WHERE createdAt IS NULL;");
} catch (e) {
  // Column might already exist, ignore
}

try {
  db.exec('ALTER TABLE reviews ADD COLUMN adminReply TEXT;');
} catch (e) {
  // Column might already exist, ignore
}

// Seed data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  const adminHash = bcrypt.hashSync('admin123', 10);
  const customerHash = bcrypt.hashSync('customer123', 10);
  insertUser.run('admin_style', adminHash, 'admin');
  insertUser.run('customer', customerHash, 'customer');
}

const stmt = db.prepare('SELECT COUNT(*) as count FROM products');
const { count } = stmt.get() as { count: number };
if (count < 10) {
  db.exec('DROP TABLE IF EXISTS reviews; DROP TABLE IF EXISTS products;');
  db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      imageUrl TEXT
    );
    CREATE TABLE reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      text TEXT NOT NULL,
      sentiment TEXT,
      rating INTEGER DEFAULT 5,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(productId) REFERENCES products(id)
    );
  `);
  const insert = db.prepare('INSERT INTO products (name, description, price, imageUrl) VALUES (?, ?, ?, ?)');
  const styleProducts = [
    { name: 'Tailored Italian Suit', desc: 'Premium wool-blend slim-fit suit in midnight blue. Perfect for formal events and business meetings.', price: 899.00, img: '/images/p1.png' },
    { name: 'Silk Evening Gown', desc: 'Floor-length emerald green silk gown with a delicate mesh neckline. Elegant and timeless design.', price: 550.00, img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Midnight Oud Perfume', desc: 'A rich, woody fragrance with notes of agarwood, rose, and amber. Long-lasting luxury scent.', price: 145.00, img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Executive Gold Watch', desc: '18K gold-plated chronograph with a sapphire crystal face and genuine leather strap. Precision movement.', price: 1200.00, img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Canvas Leather Loafers', desc: 'Handcrafted brown leather loafers with white canvas accents. Comfortable and stylish for casual wear.', price: 220.00, img: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Cashmere Winter Wrap', desc: 'Ultra-soft 100% cashmere scarf in charcoal grey. Lightweight yet exceptionally warm.', price: 180.00, img: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Hand-Stitched Suede Belt', desc: 'Premium tan suede leather with a solid brass buckle. A subtle yet powerful accessory.', price: 75.00, img: 'https://images.unsplash.com/photo-1554992683-937b83d81b93?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Obsidian Aviator Sunglasses', desc: 'Polarized black lenses with a matte titanium frame. Classic style meets modern protection.', price: 295.00, img: 'https://images.unsplash.com/photo-1511499767350-a1590fad6733?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Velvet Clutch Bag', desc: 'Gothic-inspired deep purple velvet clutch with a decorative chain strap. Ideal for evening gatherings.', price: 120.00, img: 'https://images.unsplash.com/photo-1512236258305-32fb110fdb01?auto=format&fit=crop&q=80&w=400&h=400' },
    { name: 'Luxury Silk Tie Set', desc: 'Includes a pure silk tie, matching pocket square, and silver cufflinks. Navy stripe pattern.', price: 95.00, img: 'https://images.unsplash.com/photo-1589756823851-41e53b3c5339?auto=format&fit=crop&q=80&w=400&h=400' }
  ];
  styleProducts.forEach(p => insert.run(p.name, p.desc, p.price, p.img));
}

// Seed reviews if empty
const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get() as { count: number };
if (reviewCount.count === 0) {
  const products = db.prepare('SELECT id FROM products').all() as { id: number }[];
  const insertReview = db.prepare('INSERT INTO reviews (productId, text, sentiment, rating, createdAt) VALUES (?, ?, ?, ?, datetime(\'now\'))');
  
  const mockReviews = [
    { text: "Absolutely love this! Great quality and exactly as described.", sentiment: "Positive", rating: 5 },
    { text: "Good product, but shipping took a bit longer than expected.", sentiment: "Neutral", rating: 4 },
    { text: "Not what I was hoping for. The material feels a bit cheap.", sentiment: "Negative", rating: 2 },
    { text: "Highly recommend! I use it every day.", sentiment: "Positive", rating: 5 },
    { text: "It's okay. Does the job.", sentiment: "Neutral", rating: 3 },
    { text: "Fantastic eco-friendly alternative. Will buy again!", sentiment: "Positive", rating: 5 },
    { text: "Really well made. I'm impressed with the sustainability aspect.", sentiment: "Positive", rating: 4 },
    { text: "A bit pricey for what it is, but it works fine.", sentiment: "Neutral", rating: 3 }
  ];

  products.forEach(p => {
    // Add 2-3 random reviews for each product
    const numReviews = Math.floor(Math.random() * 2) + 2;
    const shuffled = [...mockReviews].sort(() => 0.5 - Math.random());
    for (let i = 0; i < numReviews; i++) {
      insertReview.run(p.id, shuffled[i].text, shuffled[i].sentiment, shuffled[i].rating);
    }
  });
}

// --- API Routes ---

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const insert = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const info = insert.run(username, hash, 'customer');
    res.json({ id: info.lastInsertRowid, username, role: 'customer' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Get all products
app.get('/api/products', (req, res) => {
  const products = db.prepare(`
    SELECT 
      p.*, 
      COALESCE(AVG(r.rating), 0) as averageRating,
      COUNT(r.id) as reviewCount
    FROM products p
    LEFT JOIN reviews r ON p.id = r.productId
    GROUP BY p.id
    ORDER BY p.id DESC
  `).all();
  res.json(products);
});

// Add a new product
app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  const { name, description, price, imageUrl } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  
  const insert = db.prepare('INSERT INTO products (name, description, price, imageUrl) VALUES (?, ?, ?, ?)');
  const finalImageUrl = imageUrl || `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300?blur=2`;
  const info = insert.run(name, description || '', parseFloat(price), finalImageUrl);
  
  res.json({ id: info.lastInsertRowid, name, description, price, imageUrl: finalImageUrl });
});

// Update an existing product
app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, price, imageUrl } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const update = db.prepare('UPDATE products SET name = ?, description = ?, price = ?, imageUrl = ? WHERE id = ?');
  const finalImageUrl = imageUrl || `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300?blur=2`;
  update.run(name, description || '', parseFloat(price), finalImageUrl, id);
  
  res.json({ id: parseInt(id), name, description, price, imageUrl: finalImageUrl });
});

// Delete an existing product
app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    // First delete associated reviews
    db.prepare('DELETE FROM reviews WHERE productId = ?').run(id);
    
    // Then delete the product
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get all reviews
app.get('/api/reviews', (req, res) => {
  const reviews = db.prepare(`
    SELECT reviews.*, products.name as productName
    FROM reviews
    JOIN products ON reviews.productId = products.id
    ORDER BY reviews.id DESC
  `).all();
  res.json(reviews);
});

// Get reviews for a specific product
app.get('/api/products/:id/reviews', (req, res) => {
  const { id } = req.params;
  const reviews = db.prepare('SELECT * FROM reviews WHERE productId = ? ORDER BY id DESC').all(id);
  res.json(reviews);
});

// Submit a new review
app.post('/api/reviews', authenticateToken, (req, res) => {
  try {
    const { productId, text, sentiment, rating } = req.body;
    if (!productId || !text) {
      return res.status(400).json({ error: 'Product ID and text are required' });
    }

    const insert = db.prepare('INSERT INTO reviews (productId, text, sentiment, rating, createdAt) VALUES (?, ?, ?, ?, datetime(\'now\'))');
    const finalRating = rating ? parseInt(rating) : 5;
    const info = insert.run(productId, text, sentiment || 'Neutral', finalRating);
    
    res.json({ 
      id: info.lastInsertRowid, 
      productId, 
      text, 
      sentiment: sentiment || 'Neutral', 
      rating: finalRating,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

app.post('/api/ai/generate-description', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, currentDescription, features, imageUrl } = req.body;
    
    const productNameStr = name ? name : "Identify the product from the image.";
    const coreFeaturesStr = features || currentDescription || "Identify main features from the image or use extensive knowledge.";
    
    const prompt = `Act as a Product Specialist. Your task is to extract and describe ONLY the features and functions of the product. Do not include marketing fluff, narratives, or unrelated text.
    
Product Details:
* Product Name: ${productNameStr}
* Core Features/Context: ${coreFeaturesStr}

Strict Output Formatting Rules:
You must strictly format your response exactly according to the structure below. Do not add conversational filler.

[Product Title]
* Rule: You MUST output exactly this product name: ${productNameStr}

[Features and Functions]
* Rule: Provide a concise bulleted list of the product's features and functions.
* Format: - [Feature]: [Brief explanation of function]

[Product Summary]
* Rule: Provide a brief, 1-2 sentence summary of the product.`;

    let cleanText = await fetchOpenRouter(prompt, imageUrl);
    
    let generatedName = '';
    if (!name) {
       const titleMatch = cleanText.match(/\[Product Title\]\s*([\s\S]*?)\s*(?:\[About this item\]|$)/i);
       if (titleMatch && titleMatch[1]) {
           generatedName = titleMatch[1].trim();
       } else {
           const lines = cleanText.split('\n');
           generatedName = lines[0].replace(/\[Product Title\]/i, '').trim();
       }
    }

    // Remove markdown stripping that interferes with new prompt format, specifically bold tags requested by prompt
    // cleanText = cleanText.replace(/\*\*/g, ''); // Removed to allow markdown or HTML bolding
    
    res.json({ description: cleanText.trim(), name: generatedName });
  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate description' });
  }
});

app.post('/api/ai/analyze-reviews', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.body;
    const reviews = db.prepare('SELECT * FROM reviews WHERE productId = ?').all(productId);
    
    if (reviews.length === 0) {
      return res.json({ analysis: "Not enough reviews to analyze." });
    }
    
    const reviewData = reviews.map((r: any) => `- Rating: ${r.rating}/5, Text: "${r.text}"`).join('\n');
    const prompt = `Analyze the following customer reviews for a product and provide a brief summary of the overall sentiment, common themes, and any recurring complaints. Be concise.\n\n${reviewData}`;
    
    const text = await fetchOpenRouter(prompt);
    res.json({ analysis: text });
  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze reviews' });
  }
});

app.post('/api/ai/generate-reply', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reviewText, rating } = req.body;
    
    const prompt = `Act as the Store Manager of StyleAvenue, a premier fashion and lifestyle marketplace.
    A customer left a ${rating}/5 star review: "${reviewText}"
    
    Strict Rules for the Reply:
    1. Tone: Sophisticated, welcoming, and fashion-conscious.
    2. If Rating is 4-5 stars: Express genuine gratitude, mention their impeccable taste, and invite them back for the next season's arrivals.
    3. If Rating is 1-3 stars: Offer a sincere apology, demonstrate empathy for their disappointment, and state that the StyleAvenue elegance-audit team will ensure a resolution.
    4. Length: Exactly 2-3 sentences. No generic placeholders.`;
    
    const text = await fetchOpenRouter(prompt);
    res.json({ reply: text });
  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate reply' });
  }
});

app.post('/api/ai/analyze-sentiment', authenticateToken, async (req, res) => {
  try {
    const { reviewText } = req.body;
    const prompt = `Analyze the sentiment of this customer review. Return ONLY a JSON object with a single key "sentiment" and value either "Positive", "Negative", or "Neutral". Review: "${reviewText}"`;
    
    let text = await fetchOpenRouter(prompt);
    
    // Attempt to extract JSON if the model returns markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.error('Sentiment Analysis Error:', error);
    res.json({ sentiment: 'Neutral' }); // Fallback
  }
});

app.put('/api/reviews/:id/reply', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply } = req.body;
    const update = db.prepare('UPDATE reviews SET adminReply = ? WHERE id = ?');
    update.run(adminReply, id);
    res.json({ success: true, adminReply });
  } catch (error) {
    console.error('Error saving reply:', error);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3002;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
