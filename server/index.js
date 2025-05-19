require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mysql = require('mysql2'); // Add this line
app.use(cors());

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});
const PORT=process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on http://localhost:5000');
});
