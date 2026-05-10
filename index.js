import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import cors from 'cors';
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from "multer";
import fs from "fs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
env.config();

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log("Database pool initialized 🚀");

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3006',
      'https://shamaa-shop-api.onrender.com',
      'https://shamaa-shop.onrender.com',
      'https://shamaa.shop'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.set('trust proxy', 1); // Add this before cookie middleware
app.use(cookieParser()); // Add cookie-parser middleware

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
      cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + file.originalname;
      cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Routes
app.get("/ping", (req, res) => res.send("pong"));

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).send('OK');
  } catch (e) {
    res.status(500).send('DB error');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/categories', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'categories.html'));
});

app.get('/api/categories', async (req, res) => {
  try {
    const isAdminRequest = req.headers.referer && req.headers.referer.includes('admin');

    let result;

    if (isAdminRequest) {
      // Admin should receive all fields
      result = await db.query(`
        SELECT id, name, name_ar, image_path 
        FROM categories 
        ORDER BY id ASC
      `);
    } else {
      // Frontend with lang support
      const lang = req.query.lang || 'en';
      const nameField = lang === 'ar' ? 'name_ar AS name' : 'name';
      result = await db.query(`
        SELECT id, ${nameField}, image_path 
        FROM categories 
        ORDER BY id ASC
      `);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// API to Add Category with Image Upload
app.post("/api/categories", upload.single("image"), async (req, res) => {
  const { name, name_ar } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null; // Save relative path

  if (!name || !name_ar) {
      return res.status(400).json({ error: "Both name and name_ar are required" });
  }

  try {
      // Reset sequence if needed
      await db.query('SELECT setval(pg_get_serial_sequence(\'categories\', \'id\'), COALESCE((SELECT MAX(id) FROM categories), 0) + 1, false)');
      
      // Insert category with image path
      const result = await db.query(
          "INSERT INTO categories (name, name_ar, image_path) VALUES ($1, $2, $3) RETURNING *",
          [name, name_ar, imagePath]
      );

      res.json({ success: true, category: result.rows[0] });
  } catch (error) {
      console.error("Error adding category:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update an existing category (name and name_ar only)
app.patch('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, name_ar } = req.body;

  if (!name || !name_ar) {
    return res.status(400).json({ error: 'Both name and name_ar are required' });
  }

  try {
    const result = await db.query(
      'UPDATE categories SET name = $1, name_ar = $2 WHERE id = $3 RETURNING *',
      [name, name_ar, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, updatedCategory: result.rows[0] });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve images statically
app.use("/uploads", express.static("uploads"));

// Delete a category
app.delete('/api/categories/:id', async (req, res) => {
  try {
      // Fetch the category to get the image path
      const categoryResult = await db.query('SELECT image_path FROM categories WHERE id = $1', [req.params.id]);

      // Check if the category exists
      if (categoryResult.rows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
      }

      // Get the image path (if any)
      const imagePath = categoryResult.rows[0].image_path ? path.join(__dirname, 'uploads', categoryResult.rows[0].image_path) : null;

      // Delete the category from the database
      const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING *', [req.params.id]);

      // If the category is successfully deleted and an image exists, delete the image file
      if (result.rowCount > 0 && imagePath && fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath); // Delete image file from uploads folder
      }

      res.json({ success: true, deletedCategory: result.rows[0] });
  } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/products/:categoryId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, price, image, description 
       FROM products WHERE category_id = $1 ORDER BY id ASC`,
      [req.params.categoryId]
    );
    res.json(result.rows.length ? result.rows : []);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/product/:id', async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter
    const nameField = lang === 'ar' ? 'name_ar AS name' : 'name';
    const descField = lang === 'ar' ? 'description_ar AS description' : 'description';
    
    const result = await db.query(
      `SELECT id, ${nameField}, price, ${descField} 
       FROM products WHERE id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length > 0) {
      res.json({
        id: result.rows[0].id,
        name: result.rows[0].name,
        price: result.rows[0].price,
        description: result.rows[0].description
      });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/colors', async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter
    const isAdminRequest = req.headers.referer && req.headers.referer.includes('admin');
    
    // For admin panel, always return full data in English
    if (isAdminRequest) {
      const result = await db.query('SELECT id, color_name_en, color_name_ar FROM colors');
      return res.json(result.rows);
    }
    
    // For frontend, return based on language
    const nameField = lang === 'ar' ? 'color_name_ar AS name' : 'color_name_en AS name';
    const result = await db.query(`SELECT id, ${nameField} FROM colors ORDER BY id ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching colors:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/scents', async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter
    const isAdminRequest = req.headers.referer && req.headers.referer.includes('admin');
    
    // For admin panel, always return full data in English
    if (isAdminRequest) {
      const result = await db.query('SELECT id, scent_name_en, scent_name_ar FROM scents');
      return res.json(result.rows);
    }
    
    // For frontend, return based on language
    const nameField = lang === 'ar' ? 'scent_name_ar AS name' : 'scent_name_en AS name';
    const result = await db.query(`SELECT id, ${nameField} FROM scents ORDER BY id ASC`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching scents:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/signup', async (req, res) => {
  const { name, phone, address, password } = req.body;

  try {
    // 1. Check if the phone already exists
    const existingUser = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Phone is already registered' });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert the new user into the database
    const result = await db.query(
      'INSERT INTO users (name, phone, address, password) VALUES ($1, $2, $3, $4) RETURNING id, name, phone',
      [name, phone, address, hashedPassword]
    );

    const user = result.rows[0];

    // 4. Generate a JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Store the token in a cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 3600000,
      sameSite: 'None',
      secure: true
    });

    // 6. Respond with success
    res.json({
      success: true,
      message: 'Account created successfully',
      redirect: '/'
    });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  try {
      // Check if a user exists with the provided email
      const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);

      if (result.rows.length === 0) {
          return res.status(401).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect password' });
      }

      // Generate JWT token with role included
      const token = jwt.sign(
          { id: user.id, name: user.name, phone: user.phone, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
      );

      // Store the token in a cookie
      res.cookie("token", token, { 
          httpOnly: true, 
          maxAge: 3600000,
          sameSite: 'None',
          secure: true
      });

      // Redirect based on role
      if (user.role === 'admin') {
          res.json({ success: true, redirect: '/admin.html' });
      } else {
          res.json({ success: true, redirect: '/' }); // Change '/' to your main user page
      }

  } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({ error: 'Server error' });
  }
});


// Add this middleware before your routes
const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    } else if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

// Profile Route
app.get("/profile", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const result = await db.query("SELECT name, phone FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});


// Logout Route
app.post('/logout', (req, res) => {
  res.clearCookie("token");  // Clear authentication cookie
  res.json({ message: "Logged out successfully" });
});

app.post('/api/order', authenticateUser, async (req, res) => {
  const { productId, colorId, scentId, quantity, additionalInfo } = req.body;
  const userId = req.user.id;

  const noColorScentProducts = [10, 11, 12, 13, 14, 16, 19, 21, 22, 23, 24, 25, 26, 27, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

  if (!productId || !quantity) {
    return res.status(400).json({ error: "Product and quantity are required" });
  }

  if (!noColorScentProducts.includes(productId) && (!colorId || !scentId)) {
    return res.status(400).json({ error: "Color and scent are required for this product" });
  }

  try {
    const query = `
      INSERT INTO order_items (product_id, color_id, scent_id, quantity, additional_info, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [
      productId,
      colorId || null,
      scentId || null,
      parseInt(quantity, 10),
      additionalInfo || "",
      userId
    ];

    const result = await db.query(query, values);
    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    console.error('Error adding order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/basket', authenticateUser, async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter
    
    const nameField = lang === 'ar' ? 'p.name_ar AS product_name' : 'p.name AS product_name';
    const colorField = lang === 'ar' ? 'c.color_name_ar AS color' : 'c.color_name_en AS color';
    const scentField = lang === 'ar' ? 's.scent_name_ar AS scent' : 's.scent_name_en AS scent';

    const result = await db.query(`
      SELECT 
        oi.id,
        ${nameField},
        p.price,
        ${colorField},
        ${scentField},
        oi.quantity,
        oi.additional_info
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN colors c ON oi.color_id = c.id
      LEFT JOIN scents s ON oi.scent_id = s.id
      WHERE oi.user_id = $1 AND oi.order_id IS NULL
    `, [req.user.id]);


      const basketItems = result.rows.map(item => ({
        id: item.id,
        name: item.product_name,
        price: item.price,
        color: item.color || "",
        scent: item.scent || "",
        quantity: item.quantity,
        additionalInfo: item.additional_info || "",
      }));


    res.json(basketItems);
  } catch (error) {
    console.error('Error fetching basket items:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


  
  // Add this server-side route
  app.delete('/api/basket/:itemId', authenticateUser, async (req, res) => {
    try {
      await db.query('DELETE FROM order_items WHERE id = $1 AND user_id = $2', 
        [req.params.itemId, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing item:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Route to handle order confirmation
  app.post('/api/confirm-order', authenticateUser, async (req, res) => {
    const userId = req.user.id;
  
    try {
      // Start a transaction
      await db.query('BEGIN');
  
      // 1. Calculate the total price of items in the basket
      const basketResult = await db.query(`
        SELECT SUM(p.price * oi.quantity) as total_price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.user_id = $1 AND order_id IS NULL
      `, [userId]);
  
      const {total_price} = basketResult.rows[0];
  
      // 2. Create a new order record
      const orderResult = await db.query(`
        INSERT INTO orders (user_id, total_price)
        VALUES ($1, $2)
        RETURNING id
      `, [userId, total_price || 0]);
  
      const orderId = orderResult.rows[0].id;
  
      // 3. Move items from order_items to order_details (or update them)
      await db.query(`
        UPDATE order_items 
        SET order_id = $1
        WHERE user_id = $2 AND order_id IS NULL
      `, [orderId, userId]);
  
      // Commit the transaction
      await db.query('COMMIT');
  
      res.json({ 
        success: true, 
        orderId,
        totalPrice: total_price,
      });
  
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error confirming order:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/orders', async (req, res) => {
    try {
        const result = await db.query(`
          SELECT 
              o.id AS order_id, 
              o.total_price, 
              TO_CHAR(o.time, 'DD/MM/YYYY') AS order_date,
              u.name AS user_name, 
              u.phone AS user_phone,
              u."address" AS user_address,
              p.name AS product_name,
              p.price,
              COALESCE(c.color_name_en, '') AS color,   -- Return empty string if null
              COALESCE(s.scent_name_en, '') AS scent,   -- Return empty string if null
              oi.quantity,
              oi.additional_info
          FROM orders o
          JOIN users u ON o.user_id = u.id
          JOIN order_items oi ON oi.order_id = o.id
          JOIN products p ON oi.product_id = p.id
          LEFT JOIN colors c ON oi.color_id = c.id
          LEFT JOIN scents s ON oi.scent_id = s.id
          ORDER BY o.time DESC;
        `);

        // **GROUP ORDERS IN JAVASCRIPT**
        const orders = {};
        result.rows.forEach(row => {
            const { order_id, order_date, total_price, user_name, user_phone, user_address, ...item } = row;

            if (!orders[order_id]) {
                orders[order_id] = {
                    order_id,
                    order_date,
                    total_price,
                    user_name,
                    user_phone,
                    user_address, // Store address
                    order_items: []
                };
            }

            orders[order_id].order_items.push(item);
        });

        res.json(Object.values(orders)); // Convert object to array
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Delete an order
app.delete('/orders/:id', async (req, res) => {
  const orderId = req.params.id;  // Get order ID from the URL params
  try {
      // Delete the related order items first if necessary
      await db.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      
      // Now, delete the order
      const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [orderId]);

      if (result.rowCount === 0) {
          // Order not found
          return res.status(404).json({ message: "Order not found" });
      }

      res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Internal server error" });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, name_ar, price, category_id, description, description_ar
       FROM products
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new product (With Image Upload)
app.post("/api/products", upload.single("image"), async (req, res) => {
  const { name, name_ar, price, category_id, description, description_ar } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !name_ar || !price || !category_id || !description || !description_ar || !imagePath) {
      return res.status(400).json({ error: "All fields and an image are required" });
  }

  try {
      const result = await db.query(
          "INSERT INTO products (name, name_ar, price, category_id, description, description_ar, image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
          [name, name_ar, parseFloat(price), category_id, description, description_ar, imagePath]
      );
      res.json(result.rows[0]);
  } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, name_ar, price, description, description_ar, category_id } = req.body;

  if (!name || !name_ar || !price || !description || !description_ar || !category_id) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const result = await db.query(
      `UPDATE products 
       SET name = $1, name_ar = $2, price = $3, description = $4, description_ar = $5, category_id = $6 
       WHERE id = $7 RETURNING *`,
      [name, name_ar, parseFloat(price), description, description_ar, category_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true, updatedProduct: result.rows[0] });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a product (Remove Image From Server)
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { imagePath } = req.body; // Get the image path from frontend

  try {
      const result = await db.query("DELETE FROM products WHERE id = $1 RETURNING *", [id]);

      if (result.rowCount === 0) {
          return res.status(404).json({ error: "Product not found" });
      }

      // Delete Image from Server
      if (imagePath) {
          const absolutePath = path.join(__dirname, imagePath);
          if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath);
          }
      }

      res.json({ success: true, deletedProduct: result.rows[0] });
  } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update product price
app.patch('/api/products/:id/price', async (req, res) => {
  const { price } = req.body;
  
  if (!price || isNaN(price)) {
      return res.status(400).json({ error: "Valid price is required" });
  }

  try {
      const result = await db.query(
          'UPDATE products SET price = $1 WHERE id = $2 RETURNING *',
          [parseFloat(price), req.params.id]
      );
      
      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Product not found' });
      }

      res.json(result.rows[0]);
  } catch (error) {
      console.error('Error updating product price:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all colors
app.get('/api/colors', async (req, res) => {
  try {
      const result = await db.query('SELECT id, color_name_en, color_name_ar FROM colors ORDER BY id ASC');
      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching colors:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new color
app.post('/api/colors', async (req, res) => {
  const { color_name_en, color_name_ar } = req.body;

  if (!color_name_en || !color_name_ar) {
      return res.status(400).json({ error: "Both English and Arabic names are required" });
  }

  try {
      const result = await db.query(
          'INSERT INTO colors (color_name_en, color_name_ar) VALUES ($1, $2) RETURNING *',
          [color_name_en, color_name_ar]
      );
      res.json(result.rows[0]);
  } catch (error) {
      console.error('Error adding color:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a color
app.delete('/api/colors/:id', async (req, res) => {
  try {
      const result = await db.query('DELETE FROM colors WHERE id = $1 RETURNING *', [req.params.id]);
      
      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Color not found' });
      }

      res.json({ success: true, deletedColor: result.rows[0] });
  } catch (error) {
      console.error('Error deleting color:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all scents
app.get('/api/scents', async (req, res) => {
  try {
      const result = await db.query('SELECT id, scent_name_en, scent_name_ar FROM scents ORDER BY id ASC');
      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching scents:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new scent
app.post('/api/scents', async (req, res) => {
  const { scent_name_en, scent_name_ar } = req.body;

  if (!scent_name_en || !scent_name_ar) {
      return res.status(400).json({ error: "Both English and Arabic names are required" });
  }

  try {
      const result = await db.query(
          'INSERT INTO scents (scent_name_en, scent_name_ar) VALUES ($1, $2) RETURNING *',
          [scent_name_en, scent_name_ar]
      );
      res.json(result.rows[0]);
  } catch (error) {
      console.error('Error adding scent:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a scent
app.delete('/api/scents/:id', async (req, res) => {
  try {
      const result = await db.query('DELETE FROM scents WHERE id = $1 RETURNING *', [req.params.id]);
      
      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Scent not found' });
      }

      res.json({ success: true, deletedScent: result.rows[0] });
  } catch (error) {
      console.error('Error deleting scent:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
      const result = await db.query('SELECT id, name, phone, address FROM users ORDER BY id ASC');
      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
