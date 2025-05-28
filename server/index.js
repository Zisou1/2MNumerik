require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initializeDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true
}));

// Health check endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
