require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mysql = require('mysql2');
app.use(cors());

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// First connect without specifying a database
const initialConnection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Check if database exists, if not create it
initialConnection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database server:', err);
    return;
  }
  console.log('Connected to the database server');
  
  // Try to create the database if it doesn't exist
  initialConnection.query('CREATE DATABASE IF NOT EXISTS 2MNumerik', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      return;
    }
    console.log('Database checked/created successfully');
    
    // Close the initial connection
    initialConnection.end();
    
    // Connect to the specific database
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: '2MNumerik' // Use the specific database name
    });
    
    connection.connect((err) => {
      if (err) {
        console.error('Error connecting to the database:', err);
        return;
      }
      console.log('Connected to the 2mnumerik database');
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
