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
  insertUser.run('admin', adminHash, 'admin');
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
  const ecoProducts = [
    { name: 'Bamboo Toothbrush Set', desc: 'Pack of 4 sustainable bamboo toothbrushes with charcoal-infused bristles. 100% biodegradable handle.', price: 12.99, img: '/images/p1.png' },
    { name: 'Reusable Beeswax Wraps', desc: 'Eco-friendly alternative to plastic wrap. Set of 3 different sizes. Washable, reusable, and compostable.', price: 18.50, img: 'https://picsum.photos/seed/beeswax/400/400' },
    { name: 'Stainless Steel Water Bottle', desc: 'Double-wall vacuum insulated 32oz bottle. Keeps drinks cold for 24 hours or hot for 12 hours.', price: 24.99, img: 'https://picsum.photos/seed/steel_bottle/400/400' },
    { name: 'Organic Cotton Tote Bag', desc: 'Heavy-duty reusable grocery bag made from 100% certified organic cotton. Machine washable.', price: 14.00, img: 'https://picsum.photos/seed/tote_bag/400/400' },
    { name: 'Biodegradable Phone Case', desc: 'Compostable phone case made from plant-based materials. Drop-tested and durable.', price: 29.95, img: 'https://picsum.photos/seed/phone_case/400/400' },
    { name: 'Reusable Silicone Storage Bags', desc: 'Set of 4 food-grade silicone bags. Microwave, dishwasher, and freezer safe. Leakproof seal.', price: 22.99, img: 'https://picsum.photos/seed/silicone_bags/400/400' },
    { name: 'Laundry Detergent Strips', desc: 'Zero-waste laundry detergent. 60 loads. Hypoallergenic, paraben-free, and plastic-free packaging.', price: 16.99, img: 'https://picsum.photos/seed/laundry_strips/400/400' },
    { name: 'Compostable Trash Bags', desc: '13-gallon tall kitchen bags. Made from plant starches. BPI certified compostable.', price: 19.99, img: 'https://picsum.photos/seed/trash_bags/400/400' },
    { name: 'Solar Powered Power Bank', desc: '20000mAh portable charger with solar panels. Perfect for camping and emergency backup.', price: 39.99, img: '/images/hero.png' },
    { name: 'Bamboo Cutlery Travel Set', desc: 'Includes fork, knife, spoon, chopsticks, and straw in a canvas travel pouch.', price: 15.00, img: 'https://picsum.photos/seed/cutlery/400/400' },
    { name: 'Reusable Makeup Remover Pads', desc: 'Pack of 16 bamboo cotton rounds with a cotton laundry bag. Gentle on skin and the planet.', price: 13.99, img: 'https://picsum.photos/seed/makeup_pads/400/400' },
    { name: 'Eco-Friendly Cork Yoga Mat', desc: 'Non-slip, natural cork and rubber yoga mat. Antimicrobial and sustainably sourced.', price: 45.00, img: 'https://picsum.photos/seed/yoga_mat/400/400' },
    { name: 'Glass Food Storage Containers', desc: 'Set of 5 glass containers with bamboo lids. Stackable and plastic-free.', price: 34.99, img: 'https://picsum.photos/seed/glass_containers/400/400' },
    { name: 'Natural Loofah Sponges', desc: '100% natural, biodegradable dish and body sponges. Pack of 6.', price: 11.99, img: 'https://picsum.photos/seed/loofah/400/400' },
    { name: 'Wool Dryer Balls', desc: 'Organic New Zealand wool. Softens laundry naturally and reduces drying time. Pack of 6.', price: 17.50, img: 'https://picsum.photos/seed/dryer_balls/400/400' },
    { name: 'Recycled Paper Notebook', desc: 'A5 journal made entirely from post-consumer recycled paper. 160 lined pages.', price: 9.99, img: 'https://picsum.photos/seed/notebook/400/400' },
    { name: 'Plant-Based Dish Soap Block', desc: 'Solid dish soap block cuts through grease naturally. Vegan and zero-waste.', price: 14.50, img: 'https://picsum.photos/seed/dish_soap/400/400' },
    { name: 'Reusable Glass Coffee Cup', desc: '12oz glass cup with a silicone sleeve and lid. Barista standard sizing.', price: 21.99, img: 'https://picsum.photos/seed/coffee_cup/400/400' },
    { name: 'Bamboo Toilet Paper', desc: 'Box of 24 rolls. 3-ply, unbleached bamboo toilet tissue. Tree-free and septic safe.', price: 32.99, img: 'https://picsum.photos/seed/toilet_paper/400/400' },
    { name: 'Organic Fair Trade Coffee', desc: '1lb whole bean medium roast. Shade-grown and ethically sourced.', price: 18.99, img: 'https://picsum.photos/seed/coffee_beans/400/400' },
    { name: 'Reusable Produce Bags', desc: 'Set of 9 mesh cotton bags for grocery shopping. Washable, durable, and tare weight tagged.', price: 19.99, img: 'https://picsum.photos/seed/produce_bags/400/400' },
    { name: 'Biodegradable Pet Waste Bags', desc: '120 count compostable dog poop bags. Earth-friendly and leak-proof.', price: 14.99, img: 'https://picsum.photos/seed/pet_bags/400/400' },
    { name: 'Solar Powered Lantern', desc: 'Inflatable, waterproof solar lantern. Lightweight and perfect for outdoor adventures.', price: 24.95, img: 'https://picsum.photos/seed/solar_lantern/400/400' },
    { name: 'Bamboo Hair Brush', desc: 'Natural wooden paddle brush with bamboo bristles. Massages scalp and reduces static.', price: 12.50, img: 'https://picsum.photos/seed/bamboo_brush2/400/400' },
    { name: 'Organic Cotton Bath Towels', desc: 'Set of 2 luxury bath towels. 100% GOTS certified organic cotton, ultra-absorbent.', price: 45.00, img: 'https://picsum.photos/seed/bath_towels/400/400' },
    { name: 'Stainless Steel Straws Set', desc: '8 pack of reusable metal straws with 2 cleaning brushes and a carrying case.', price: 9.99, img: 'https://picsum.photos/seed/metal_straws/400/400' },
    { name: 'Kitchen Counter Compost Bin', desc: '1.3 gallon stainless steel compost pail with charcoal filter to block odors.', price: 29.99, img: 'https://picsum.photos/seed/compost_bin/400/400' },
    { name: 'Natural Deodorant Stick', desc: 'Aluminum-free, vegan deodorant made with essential oils and baking soda.', price: 11.99, img: 'https://picsum.photos/seed/deodorant/400/400' },
    { name: 'Hemp Daypack Backpack', desc: 'Durable, eco-friendly backpack made from 100% natural hemp fibers.', price: 55.00, img: 'https://picsum.photos/seed/hemp_backpack/400/400' },
    { name: 'Beeswax Pillar Candles', desc: 'Set of 2 pure beeswax candles. Naturally honey-scented and clean burning.', price: 22.50, img: 'https://picsum.photos/seed/beeswax_candles/400/400' },
    { name: 'Reusable K-Cup Coffee Filter', desc: 'Stainless steel refillable coffee pod compatible with Keurig machines.', price: 13.99, img: 'https://picsum.photos/seed/kcup_filter/400/400' },
    { name: 'Ocean Plastic Sunglasses', desc: 'Stylish polarized sunglasses made from 100% recycled ocean plastic.', price: 65.00, img: 'https://picsum.photos/seed/sunglasses/400/400' },
    { name: 'Vegan Cork Leather Wallet', desc: 'Slim bifold wallet made from sustainable cork. Water-resistant and durable.', price: 28.00, img: 'https://picsum.photos/seed/cork_wallet/400/400' },
    { name: 'Bamboo Wireless Keyboard', desc: 'Handcrafted bamboo wood keyboard and mouse combo. Bluetooth connectivity.', price: 49.99, img: 'https://picsum.photos/seed/bamboo_keyboard/400/400' },
    { name: 'Organic Linen Bed Sheets', desc: 'Queen size 4-piece sheet set. Breathable, natural linen for cool sleeping.', price: 120.00, img: 'https://picsum.photos/seed/linen_sheets/400/400' },
    { name: 'Zero Waste Shampoo Bar', desc: 'Solid shampoo bar for all hair types. Lasts up to 80 washes. Plastic-free.', price: 14.00, img: 'https://picsum.photos/seed/shampoo_bar/400/400' },
    { name: 'Zero Waste Conditioner Bar', desc: 'Hydrating solid conditioner bar with shea butter and coconut oil.', price: 14.00, img: 'https://picsum.photos/seed/conditioner_bar/400/400' },
    { name: 'Reusable Silicone Swabs', desc: 'Eco-friendly alternative to cotton swabs. Comes with a magnetic carrying case.', price: 10.99, img: 'https://picsum.photos/seed/silicone_swabs/400/400' },
    { name: 'Plant-Based Cellulose Sponges', desc: 'Pack of 10 compostable cleaning sponges made from wood pulp.', price: 15.99, img: 'https://picsum.photos/seed/cellulose_sponges/400/400' },
    { name: 'Eco-Friendly Laundry Detergent Pods', desc: '60 count. Plant-based, cruelty-free, and packaged in a compostable pouch.', price: 21.99, img: 'https://picsum.photos/seed/laundry_pods/400/400' }
  ];
  ecoProducts.forEach(p => insert.run(p.name, p.desc, p.price, p.img));
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

    const prompt = `Act as the Store Manager of EcoFinds, a premium eco-conscious marketplace.
    A customer left a ${rating}/5 star review: "${reviewText}"
    
    Strict Rules for the Reply:
    1. Tone: Warm, professional, and deeply committed to sustainability.
    2. If Rating is 4-5 stars: Express genuine gratitude, mention their contribution to green living, and invite them back.
    3. If Rating is 1-3 stars: Offer a sincere apology, demonstrate empathy for their experience, and state that the EcoFinds support team will ensure a resolution.
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

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
