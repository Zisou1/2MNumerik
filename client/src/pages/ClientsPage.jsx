import React, { useState, useEffect, useRef } from 'react';
import { clientAPI } from '../utils/api';
import Button from '../components/ButtonComponent';
import AlertDialog from '../components/AlertDialog';
import * as XLSX from 'xlsx';

const ClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [stats, setStats] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef(null);
  const [filters, setFilters] = useState({
    nom: '',
    email: '',
    ville: '',
    type_client: '',
    actif: '',
    code_client: '',
    numero_affaire: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalClients: 0
  });

  const typeClientOptions = [
    { value: 'particulier', label: 'Particulier' },
    { value: 'entreprise', label: 'Entreprise' },
    { value: 'association', label: 'Association' }
  ];

  const fetchClients = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10, ...filters };
      Object.keys(params).forEach(key => params[key] === '' && delete params[key]);
      
      const response = await clientAPI.getClients(params);
      setClients(response.clients);
      setPagination(response.pagination);
    } catch (err) {
      setError('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await clientAPI.getClientStats();
      setStats(response.stats);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchStats();
  }, [filters]);

  const handleCreateClient = () => {
    setSelectedClient(null);
    setShowCreateModal(true);
  };

  const handleImportExcel = () => {
    setShowImportModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleDeleteClient = async (clientId) => {
    setClientToDelete(clientId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
      try {
        await clientAPI.deleteClient(clientToDelete);
        fetchClients(pagination.currentPage);
        fetchStats();
        setShowDeleteDialog(false);
        setClientToDelete(null);
      } catch (err) {
        setError('Erreur lors de la suppression');
        setShowDeleteDialog(false);
        setClientToDelete(null);
      }
    }
  };

  const cancelDeleteClient = () => {
    setShowDeleteDialog(false);
    setClientToDelete(null);
  };

  const getTypeLabel = (type) => {
    const option = typeClientOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'entreprise':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'association':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'particulier':
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des clients...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Gestion des clients</h1>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.active || 0}</div>
            <div className="text-sm text-gray-600">Actifs</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{stats.inactive || 0}</div>
            <div className="text-sm text-gray-600">Inactifs</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{stats.byType?.entreprise || 0}</div>
            <div className="text-sm text-gray-600">Entreprises</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">{stats.byType?.particulier || 0}</div>
            <div className="text-sm text-gray-600">Particuliers</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 flex-1">
              <input
                type="text"
                placeholder="Nom du client"
                value={filters.nom}
                onChange={(e) => setFilters({...filters, nom: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />
              
              <input
                type="text"
                placeholder="Email"
                value={filters.email}
                onChange={(e) => setFilters({...filters, email: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />
              
              <input
                type="text"
                placeholder="Ville"
                value={filters.ville}
                onChange={(e) => setFilters({...filters, ville: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />

              <input
                type="text"
                placeholder="Code client"
                value={filters.code_client}
                onChange={(e) => setFilters({...filters, code_client: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />

              <input
                type="text"
                placeholder="Numéro d'affaire"
                value={filters.numero_affaire}
                onChange={(e) => setFilters({...filters, numero_affaire: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />

              <select
                value={filters.type_client}
                onChange={(e) => setFilters({...filters, type_client: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Tous les types</option>
                {typeClientOptions.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.actif}
                onChange={(e) => setFilters({...filters, actif: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </select>

              {/* Clear Filters Button */}
              {(filters.nom || filters.email || filters.ville || filters.type_client || filters.actif || filters.code_client || filters.numero_affaire) && (
                <button
                  onClick={() => setFilters({
                    nom: '',
                    email: '',
                    ville: '',
                    type_client: '',
                    actif: '',
                    code_client: '',
                    numero_affaire: ''
                  })}
                  className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
                >
                  Effacer filtres
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-shrink-0">
              <Button onClick={handleCreateClient}>
                Nouveau client
              </Button>
              
              <Button 
                onClick={handleImportExcel}
                className="bg-green-600 hover:bg-green-700"
              >
                Importer Excel
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Clients Cards - Mobile/Tablet View */}
        <div className="lg:hidden space-y-4 mb-6">
          {clients.map((client) => (
            <div 
              key={client.id} 
              className="bg-white shadow-md rounded-lg p-4 border transition-colors duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{client.nom}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(client.type_client)}`}>
                        {getTypeLabel(client.type_client)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.actif 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {client.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    {client.email && <p><span className="font-medium">Email:</span> {client.email}</p>}
                    {client.telephone && <p><span className="font-medium">Téléphone:</span> {client.telephone}</p>}
                    {client.ville && <p><span className="font-medium">Ville:</span> {client.ville}</p>}
                    {client.code_client && <p><span className="font-medium">Code client:</span> {client.code_client}</p>}
                    {client.numero_affaire && <p><span className="font-medium">Numéro d'affaire:</span> {client.numero_affaire}</p>}
                    {client.orders && client.orders.length > 0 && (
                      <p><span className="font-medium">Commandes récentes:</span> {client.orders.length}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <button
                  onClick={() => handleEditClient(client)}
                  className="flex-1 flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
                <button
                  onClick={() => handleDeleteClient(client.id)}
                  className="flex-1 flex items-center justify-center gap-2 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          
          {clients.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
              Aucun client trouvé
            </div>
          )}
        </div>

        {/* Clients Table - Desktop View */}
        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numéro d'affaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Localisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commandes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.nom}
                        </div>
                        {client.siret && (
                          <div className="text-sm text-gray-500">
                            SIRET: {client.siret}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.code_client || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.numero_affaire || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.email && (
                          <div className="mb-1">
                            <a href={`mailto:${client.email}`} className="text-blue-600 hover:text-blue-900">
                              {client.email}
                            </a>
                          </div>
                        )}
                        {client.telephone && (
                          <div className="text-gray-600">
                            {client.telephone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {client.ville && <div>{client.ville}</div>}
                        {client.code_postal && <div className="text-gray-600">{client.code_postal}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(client.type_client)}`}>
                        {getTypeLabel(client.type_client)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.actif 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {client.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.orders && client.orders.length > 0 ? (
                        <div>
                          <div className="font-medium">{client.orders.length} commandes récentes</div>
                          <div className="text-xs text-gray-500">
                            Dernière: {new Date(client.orders[0].createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Aucune commande</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => fetchClients(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => fetchClients(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{pagination.currentPage}</span> sur{' '}
                    <span className="font-medium">{pagination.totalPages}</span> - Total:{' '}
                    <span className="font-medium">{pagination.totalClients}</span> clients
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {[...Array(pagination.totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => fetchClients(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.currentPage === i + 1
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <ClientModal
          client={selectedClient}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedClient(null);
          }}
          onSave={() => {
            fetchClients(pagination.currentPage);
            fetchStats();
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedClient(null);
          }}
          typeClientOptions={typeClientOptions}
        />
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <ImportExcelModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            fetchClients(pagination.currentPage);
            fetchStats();
            setShowImportModal(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={cancelDeleteClient}
        onConfirm={confirmDeleteClient}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  );
};

// Client Modal Component
const ClientModal = ({ client, onClose, onSave, typeClientOptions }) => {
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: '',
    pays: 'France',
    siret: '',
    type_client: 'particulier',
    actif: true,
    notes: '',
    code_client: '',
    numero_affaire: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (client) {
      setFormData({
        nom: client.nom || '',
        email: client.email || '',
        telephone: client.telephone || '',
        adresse: client.adresse || '',
        ville: client.ville || '',
        code_postal: client.code_postal || '',
        pays: client.pays || 'France',
        siret: client.siret || '',
        type_client: client.type_client || 'particulier',
        actif: client.actif !== undefined ? client.actif : true,
        notes: client.notes || '',
        code_client: client.code_client || '',
        numero_affaire: client.numero_affaire || ''
      });
    }
  }, [client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (client) {
        await clientAPI.updateClient(client.id, formData);
      } else {
        await clientAPI.createClient(formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'opération');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {client ? 'Modifier le client' : 'Nouveau client'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de client *
                </label>
                <select
                  value={formData.type_client}
                  onChange={(e) => handleChange('type_client', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                >
                  {typeClientOptions.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code client
                </label>
                <input
                  type="text"
                  value={formData.code_client}
                  onChange={(e) => handleChange('code_client', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro d'affaire
                </label>
                <input
                  type="text"
                  value={formData.numero_affaire}
                  onChange={(e) => handleChange('numero_affaire', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={formData.ville}
                  onChange={(e) => handleChange('ville', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays
                </label>
                <input
                  type="text"
                  value={formData.pays}
                  onChange={(e) => handleChange('pays', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SIRET
                </label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => handleChange('siret', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.actif}
                    onChange={(e) => handleChange('actif', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Client actif</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
              >
                {loading ? 'Enregistrement...' : client ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Import Excel Modal Component
const ImportExcelModal = ({ onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        setError('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
        setError('Le fichier est trop volumineux (maximum 5MB)');
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await clientAPI.importClientsFromExcel(file);
      setImportResults(result.results);
      
      if (result.results.success > 0) {
        setTimeout(() => {
          onImportSuccess();
        }, 3000); // Auto close after 3 seconds if successful
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        nom: 'Exemple Client',
        email: 'client@example.com',
        telephone: '0123456789',
        adresse: '123 Rue Example',
        ville: 'Paris',
        code_postal: '75001',
        pays: 'France',
        siret: '12345678901234',
        type_client: 'entreprise',
        actif: true,
        notes: 'Notes exemple',
        code_client: 'CLI001',
        numero_affaire: 'AFF-2024-001'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
    
    // Set column widths
    const colWidths = [
      { wch: 20 }, // nom
      { wch: 25 }, // email
      { wch: 15 }, // telephone
      { wch: 30 }, // adresse
      { wch: 15 }, // ville
      { wch: 12 }, // code_postal
      { wch: 10 }, // pays
      { wch: 18 }, // siret
      { wch: 15 }, // type_client
      { wch: 8 },  // actif
      { wch: 30 }, // notes
      { wch: 15 }, // code_client
      { wch: 18 }  // numero_affaire
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'template_import_clients.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Importer des clients depuis Excel
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!importResults ? (
            <>
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Le fichier doit être au format Excel (.xlsx ou .xls)</li>
                  <li>• La première ligne doit contenir les en-têtes de colonnes</li>
                  <li>• Les colonnes acceptées: nom, email, telephone, adresse, ville, code_postal, pays, siret, type_client, actif, notes, code_client, numero_affaire</li>
                  <li>• Le champ "nom" est obligatoire</li>
                  <li>• type_client doit être: particulier, entreprise, ou association</li>
                  <li>• Les champs code_client et numero_affaire sont optionnels</li>
                </ul>
              </div>

              {/* Template Download */}
              <div className="mb-6">
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 text-green-600 bg-green-100 rounded-md hover:bg-green-200 transition-colors duration-200 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Télécharger le modèle Excel
                </button>
              </div>

              {/* File Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner le fichier Excel
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {file ? (
                    <div className="text-green-600">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p>Cliquez pour sélectionner un fichier</p>
                      <p className="text-sm">ou glissez-déposez le fichier ici</p>
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Parcourir
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? 'Import en cours...' : 'Importer'}
                </button>
              </div>
            </>
          ) : (
            /* Import Results */
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {importResults.success} clients importés avec succès
                </div>
              </div>

              {importResults.duplicates.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">
                    Doublons détectés ({importResults.duplicates.length}):
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    {importResults.duplicates.map((dup, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        Ligne {dup.row}: {dup.nom} - {dup.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">
                    Erreurs détectées ({importResults.errors.length}):
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    {importResults.errors.map((err, index) => (
                      <div key={index} className="text-sm text-red-700">
                        Ligne {err.row}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;
