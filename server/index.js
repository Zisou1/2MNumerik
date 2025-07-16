require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const exportRoutes = require('./routes/exportRoutes');
const finitionRoutes = require('./routes/finitionRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and 127.0.0.1 with any port
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow your local network (192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)
    if (origin.match(/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow your specific ngrok URLs
    const allowedNgrokOrigins = [
      'https://6a76-105-102-7-60.ngrok-free.app',
      'https://0a61-105-102-7-60.ngrok-free.app'
    ];
    
    if (allowedNgrokOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));


// Health check endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/finitions', finitionRoutes);

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    const PORT = process.env.PORT || 3001;
    // Listen on all network interfaces (0.0.0.0) to allow access from other devices
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Local access: http://localhost:${PORT}`);
      console.log(`Network access: http://[your-local-ip]:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
