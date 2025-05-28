const { getConnection } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.created_at = userData.created_at;
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password } = userData;
    const connection = getConnection();
    
    return new Promise(async (resolve, reject) => {
      try {
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert new user
        const insertUserQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        connection.query(insertUserQuery, [username, email, hashedPassword], (err, results) => {
          if (err) {
            reject(err);
            return;
          }
          
          resolve({
            id: results.insertId,
            username,
            email
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Find user by email
  static async findByEmail(email) {
    const connection = getConnection();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      connection.query(query, [email], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (results.length === 0) {
          resolve(null);
          return;
        }
        
        resolve(new User(results[0]));
      });
    });
  }

  // Find user by username
  static async findByUsername(username) {
    const connection = getConnection();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ?';
      connection.query(query, [username], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (results.length === 0) {
          resolve(null);
          return;
        }
        
        resolve(new User(results[0]));
      });
    });
  }

  // Find user by email or username
  static async findByEmailOrUsername(email, username) {
    const connection = getConnection();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ? OR username = ?';
      connection.query(query, [email, username], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (results.length === 0) {
          resolve(null);
          return;
        }
        
        resolve(new User(results[0]));
      });
    });
  }

  // Find user by ID
  static async findById(id) {
    const connection = getConnection();
    
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      connection.query(query, [id], (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (results.length === 0) {
          resolve(null);
          return;
        }
        
        resolve(new User(results[0]));
      });
    });
  }

  // Verify password
  async verifyPassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  }

  // Get user data without password
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
