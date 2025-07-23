const { Client, Order } = require('../models');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const multer = require('multer');

class ClientController {
  // Get all clients with optional filtering and pagination
  static async getAllClients(req, res) {
    try {
      const { 
        nom, 
        email,
        type_client,
        actif,
        code_client,
        page = 1, 
        limit = 10,
        sortBy = 'nom',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause for filtering
      const whereClause = {};
      if (nom) whereClause.nom = { [Op.like]: `%${nom}%` };
      if (email) whereClause.email = { [Op.like]: `%${email}%` };
      if (type_client) whereClause.type_client = type_client;
      if (actif !== undefined) whereClause.actif = actif === 'true';
      if (code_client) whereClause.code_client = { [Op.like]: `%${code_client}%` };

      const result = await Client.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Order,
            as: 'orders',
            attributes: ['id', 'numero_pms', 'statut', 'createdAt'],
            limit: 5, // Show only recent orders
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      const totalPages = Math.ceil(result.count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        clients: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalClients: result.count,
          hasNextPage,
          hasPrevPage
        }
      });
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des clients'
      });
    }
  }

  // Get a single client by ID with all their orders
  static async getClientById(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.findByPk(id, {
        include: [
          {
            model: Order,
            as: 'orders',
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      res.json({
        success: true,
        client
      });
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du client'
      });
    }
  }

  // Create a new client
  static async createClient(req, res) {
    try {
      const clientData = req.body;

      // Check if client with same name already exists
      const existingClient = await Client.findOne({
        where: { nom: clientData.nom }
      });

      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Un client avec ce nom existe déjà'
        });
      }

      const client = await Client.create(clientData);

      res.status(201).json({
        success: true,
        message: 'Client créé avec succès',
        client
      });
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du client'
      });
    }
  }

  // Update a client
  static async updateClient(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const client = await Client.findByPk(id);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      // Check if another client with same name exists (excluding current client)
      if (updateData.nom) {
        const existingClient = await Client.findOne({
          where: { 
            nom: updateData.nom,
            id: { [Op.ne]: id }
          }
        });

        if (existingClient) {
          return res.status(400).json({
            success: false,
            message: 'Un autre client avec ce nom existe déjà'
          });
        }
      }

      await client.update(updateData);

      res.json({
        success: true,
        message: 'Client mis à jour avec succès',
        client
      });
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du client'
      });
    }
  }

  // Delete a client
  static async deleteClient(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.findByPk(id, {
        include: [
          {
            model: Order,
            as: 'orders'
          }
        ]
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      // Check if client has orders
      if (client.orders && client.orders.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer un client qui a des commandes associées'
        });
      }

      await client.destroy();

      res.json({
        success: true,
        message: 'Client supprimé avec succès'
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du client'
      });
    }
  }

  // Get client statistics
  static async getClientStats(req, res) {
    try {
      const stats = await Client.findAll({
        attributes: [
          'type_client',
          [Client.sequelize.fn('COUNT', Client.sequelize.col('id')), 'count']
        ],
        group: ['type_client']
      });

      const totalClients = await Client.count();
      const activeClients = await Client.count({ where: { actif: true } });

      res.json({
        success: true,
        stats: {
          total: totalClients,
          active: activeClients,
          inactive: totalClients - activeClients,
          byType: stats.reduce((acc, stat) => {
            acc[stat.type_client] = parseInt(stat.dataValues.count);
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('Error fetching client stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // Search clients for dropdown/autocomplete
  static async searchClients(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.json({
          success: true,
          clients: []
        });
      }

      const clients = await Client.findAll({
        where: {
          actif: true,
          [Op.or]: [
            { nom: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } },
            { code_client: { [Op.like]: `%${q}%` } }
          ]
        },
        attributes: ['id', 'nom', 'email', 'adresse', 'type_client', 'telephone', 'code_client'],
        limit: 20,
        order: [['nom', 'ASC']]
      });

      res.json({
        success: true,
        clients
      });
    } catch (error) {
      console.error('Error searching clients:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la recherche de clients'
      });
    }
  }

  // Import clients from Excel file
  static async importClientsFromExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier Excel fourni'
        });
      }

      // Read the Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Le fichier Excel est vide ou mal formaté'
        });
      }

      const results = {
        success: 0,
        updated: 0,
        errors: [],
        duplicates: [],
        updates: []
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          
          // Map Excel columns to database fields (only use actual database fields)
          const clientData = {
            nom: row['nom'] || row['Nom'] || row['name'] || row['Name'],
            code_client: row['code_client'] || row['Code client'] || row['code'] || '',
            email: row['email'] || row['Email'] || row['E-mail'],
            telephone: row['telephone'] || row['Téléphone'] || row['tel'] || row['phone'],
            adresse: row['adresse'] || row['Adresse'] || row['address'],
            type_client: row['type_client'] || row['Type client'] || row['type'] || 'particulier',
            actif: row['actif'] !== undefined ? Boolean(row['actif']) : true,
            notes: row['notes'] || row['Notes'] || row['commentaires'] || ''
          };

          // Validate required fields
          if (!clientData.nom) {
            results.errors.push({
              row: i + 2, // +2 because Excel rows start at 1 and we skip header
              error: 'Nom manquant'
            });
            continue;
          }

          // Validate code_client is required
          if (!clientData.code_client) {
            results.errors.push({
              row: i + 2,
              error: 'Code client manquant (requis)'
            });
            continue;
          }

          // Validate type_client
          if (!['particulier', 'entreprise', 'association'].includes(clientData.type_client)) {
            clientData.type_client = 'particulier';
          }

          // Check for existing client by code_client (now required)
          let existingClient = await Client.findOne({
            where: { code_client: clientData.code_client }
          });

          if (existingClient) {
            // Client exists with same code_client
            if (existingClient.nom === clientData.nom) {
              // Same name, consider as duplicate
              results.duplicates.push({
                row: i + 2,
                nom: clientData.nom,
                code_client: clientData.code_client,
                message: 'Client avec ce code client et nom existe déjà'
              });
              continue;
            } else {
              // Different name, update the existing client
              await existingClient.update(clientData);
              results.updated++;
              results.updates.push({
                row: i + 2,
                nom: clientData.nom,
                code_client: clientData.code_client,
                oldName: existingClient.nom,
                message: `Nom mis à jour de "${existingClient.nom}" vers "${clientData.nom}"`
              });
              continue;
            }
          } else {
            // No existing client with this code_client, check by name for potential duplicates
            const clientByName = await Client.findOne({
              where: { nom: clientData.nom }
            });
            
            if (clientByName) {
              results.duplicates.push({
                row: i + 2,
                nom: clientData.nom,
                message: 'Client avec ce nom existe déjà (code client différent)'
              });
              continue;
            }
          }

          // Create new client
          await Client.create(clientData);
          results.success++;

        } catch (error) {
          results.errors.push({
            row: i + 2,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Import terminé: ${results.success} clients créés, ${results.updated} clients mis à jour`,
        results
      });

    } catch (error) {
      console.error('Error importing clients from Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'import du fichier Excel'
      });
    }
  }
}

module.exports = ClientController;
