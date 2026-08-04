const { getAuditLog, getUser } = require('../config/database');
const { Op } = require('sequelize');

class AuditController {
  static async getLogs(req, res) {
    try {
      const AuditLog = getAuditLog();
      const User = getUser();
      const { 
        page = 1, 
        limit = 25, 
        action, 
        table_name, 
        user_id, 
        date_from, 
        date_to, 
        search 
      } = req.query;

      const offset = (page - 1) * limit;
      
      const where = {};
      if (action) where.action = action;
      if (table_name) where.table_name = table_name;
      if (user_id) where.user_id = user_id;
      
      if (date_from || date_to) {
        where.created_at = {};
        if (date_from) where.created_at[Op.gte] = new Date(date_from);
        if (date_to) {
          const endDate = new Date(date_to);
          endDate.setHours(23, 59, 59, 999);
          where.created_at[Op.lte] = endDate;
        }
      }

      if (search) {
        where[Op.or] = [
          { action: { [Op.like]: `%${search}%` } },
          { table_name: { [Op.like]: `%${search}%` } },
          { additional_info: { [Op.like]: `%${search}%` } },
          { ip_address: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role']
        }]
      });

      res.json({
        logs: rows,
        totalCount: count,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: "Erreur lors du chargement des logs d'audit" });
    }
  }

  static async logAction({ user_id, action, table_name = null, record_id = null, old_values = null, new_values = null, ip_address = null, user_agent = null, session_id = null, additional_info = null }) {
    try {
      const AuditLog = getAuditLog();
      await AuditLog.create({
        user_id,
        action,
        table_name,
        record_id,
        old_values: old_values ? JSON.stringify(old_values) : null,
        new_values: new_values ? JSON.stringify(new_values) : null,
        ip_address,
        user_agent,
        session_id,
        additional_info: additional_info ? JSON.stringify(additional_info) : null
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }
}

module.exports = AuditController;
