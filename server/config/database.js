require('dotenv').config();
const mysql = require('mysql2');

let connection;

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
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
        reject(err);
        return;
      }
      console.log('Connected to the database server');
      
      // Try to create the database if it doesn't exist
      initialConnection.query('CREATE DATABASE IF NOT EXISTS 2MNumerik', (err) => {
        if (err) {
          console.error('Error creating database:', err);
          reject(err);
          return;
        }
        console.log('Database checked/created successfully');
        
        // Close the initial connection
        initialConnection.end();
        
        // Connect to the specific database
        connection = mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: '2MNumerik'
        });
        
        connection.connect((err) => {
          if (err) {
            console.error('Error connecting to the database:', err);
            reject(err);
            return;
          }
          console.log('Connected to the 2mnumerik database');
          
          // Create users table if it doesn't exist
          const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
              id INT AUTO_INCREMENT PRIMARY KEY,
              username VARCHAR(50) UNIQUE NOT NULL,
              email VARCHAR(100) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
          
          connection.query(createUsersTable, (err) => {
            if (err) {
              console.error('Error creating users table:', err);
              reject(err);
            } else {
              console.log('Users table checked/created successfully');
              resolve(connection);
            }
          });
        });
      });
    });
  });
};

const getConnection = () => {
  if (!connection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return connection;
};

module.exports = {
  initializeDatabase,
  getConnection
};
