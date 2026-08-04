const jwt = require('jsonwebtoken');
const { getUser } = require('../config/database');
const AuditController = require('./auditController');

class AuthController {
  // Register a new user
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;
      const User = getUser();

      // Check if user already exists
      const existingUser = await User.findByEmailOrUsername(email, username);
      if (existingUser) {
        if (existingUser.email === email) {
          return res.status(400).json({ message: 'Cette adresse email est déjà utilisée' });
        }
        if (existingUser.username === username) {
          return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris' });
        }
      }

      // Create new user
      const newUser = await User.create({ username, email, password });

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username, email: newUser.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.status(201).json({
        message: 'Inscription réussie',
        user: newUser.toJSON()
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const User = getUser();

      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        await AuditController.logAction({
          action: 'LOGIN_FAILED',
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          additional_info: { email_attempted: email, reason: 'user_not_found' }
        });
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        await AuditController.logAction({
          user_id: user.id,
          action: 'LOGIN_FAILED',
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          additional_info: { reason: 'invalid_password' }
        });
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      await AuditController.logAction({
        user_id: user.id,
        action: 'LOGIN',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        message: 'Connexion réussie',
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      if (userId) {
        await AuditController.logAction({
          user_id: userId,
          action: 'LOGOUT',
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
      }

      res.json({
        message: 'Déconnexion réussie'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      res.json({
        message: 'Profil utilisateur',
        user: req.user.toJSON()
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = AuthController;
