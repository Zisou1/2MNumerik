import React, { useState, useEffect } from 'react'
import { orderAPI, productAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import Input from '../components/InputComponent'
import AlertDialog from '../components/AlertDialog'

const DashboardPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [stats, setStats] = useState({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [filters, setFilters] = useState({
    statut: '',
    commercial: '',
    client: '',
    atelier: '',
    infographe: '',
    etape: ''
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  })
  const [inlineEditing, setInlineEditing] = useState({})
  const [tempValues, setTempValues] = useState({})

  const statusOptions = [
    { value: 'en_attente', label: 'En attente', color: 'bg-yellow-200 text-yellow-900 border border-yellow-300', rowColor: 'bg-yellow-100 hover:bg-yellow-200 border-l-4 border-yellow-400' },
    { value: 'en_cours', label: 'En cours', color: 'bg-blue-200 text-blue-900 border border-blue-300', rowColor: 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-400' },
    { value: 'termine', label: 'Terminé', color: 'bg-green-200 text-green-900 border border-green-300', rowColor: 'bg-green-100 hover:bg-green-200 border-l-4 border-green-400' },
    { value: 'livre', label: 'Livré', color: 'bg-purple-200 text-purple-900 border border-purple-300', rowColor: 'bg-purple-100 hover:bg-purple-200 border-l-4 border-purple-400' },
    { value: 'annule', label: 'Annulé', color: 'bg-red-200 text-red-900 border border-red-300', rowColor: 'bg-red-100 hover:bg-red-200 border-l-4 border-red-400' }
  ]

  const atelierOptions = ['petit format', 'grand format', 'sous-traitance']
  const etapeOptions = ['conception', 'pré-presse', 'impression', 'finition', 'découpe']

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true)
      const params = { page, limit: 10, ...filters }
      Object.keys(params).forEach(key => params[key] === '' && delete params[key])
      
      const response = await orderAPI.getOrders(params)
      setOrders(response.orders)
      setPagination(response.pagination)
    } catch (err) {
      setError('Erreur lors du chargement des commandes')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await orderAPI.getOrderStats()
      setStats(response.stats)
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchStats()
  }, [filters])

  const handleCreateOrder = () => {
    setSelectedOrder(null)
    setShowCreateModal(true)
  }

  const handleEditOrder = (order) => {
    setSelectedOrder(order)
    setShowEditModal(true)
  }

  const handleDeleteOrder = async (orderId) => {
    setOrderToDelete(orderId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteOrder = async () => {
    if (orderToDelete) {
      try {
        await orderAPI.deleteOrder(orderToDelete)
        fetchOrders(pagination.currentPage)
        fetchStats()
        setShowDeleteDialog(false)
        setOrderToDelete(null)
      } catch (err) {
        setError('Erreur lors de la suppression')
        setShowDeleteDialog(false)
        setOrderToDelete(null)
      }
    }
  }

  const cancelDeleteOrder = () => {
    setShowDeleteDialog(false)
    setOrderToDelete(null)
  }

  const handleInlineEdit = (orderId, field, currentValue) => {
    setInlineEditing({ [`${orderId}-${field}`]: true })
    setTempValues({ [`${orderId}-${field}`]: currentValue })
  }

  const cancelInlineEdit = (orderId, field) => {
    setInlineEditing({ ...inlineEditing, [`${orderId}-${field}`]: false })
    setTempValues({ ...tempValues, [`${orderId}-${field}`]: null })
  }

  const saveInlineEdit = async (orderId, field, newValue) => {
    try {
      // For date fields, convert the datetime-local value to ISO string
      let valueToSend = newValue
      if ((field === 'date_limite_livraison_estimee' || field === 'date_limite_livraison_attendue') && newValue) {
        valueToSend = new Date(newValue).toISOString()
      }
      
      await orderAPI.updateOrder(orderId, { [field]: valueToSend })
      
      // Update the local orders state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, [field]: valueToSend } : order
      ))
      
      // Clear editing state
      setInlineEditing({ ...inlineEditing, [`${orderId}-${field}`]: false })
      setTempValues({ ...tempValues, [`${orderId}-${field}`]: null })
      
      // Refresh stats in case status changed
      if (field === 'statut') {
        fetchStats()
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      cancelInlineEdit(orderId, field)
    }
  }

  const handleTempValueChange = (orderId, field, value) => {
    setTempValues({ ...tempValues, [`${orderId}-${field}`]: value })
  }

  const handleRowClick = (order, event) => {
    // Don't open modal if clicking on inline edit elements or action buttons
    if (event.target.closest('.inline-edit') || event.target.closest('.action-button')) {
      return
    }
    setSelectedOrder(order)
    setShowViewModal(true)
  }

  const renderInlineDate = (order, field) => {
    const editKey = `${order.id}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]
    const currentValue = order[field]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <input
            type="datetime-local"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(order.id, field, e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={() => saveInlineEdit(order.id, field, tempValue)}
            className="text-green-600 hover:text-green-800 p-1"
            title="Sauvegarder"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => cancelInlineEdit(order.id, field)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Annuler"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group inline-edit"
        onClick={() => handleInlineEdit(order.id, field, currentValue ? new Date(currentValue).toISOString().slice(0, 16) : '')}
        title="Cliquer pour modifier"
      >
        <div className="flex items-center justify-between">
          <span>{formatDate(currentValue)}</span>
          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status)
    if (!statusConfig) return status
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    )
  }

  const getRowBackgroundClass = (order) => {
    const { statut, date_limite_livraison_estimee } = order;
    
    // If status is finished (termine or livre), return green
    if (statut === 'termine' || statut === 'livre') {
      return 'bg-green-100 hover:bg-green-200 border-l-4 border-green-400';
    }
    
    // If no deadline date, return normal gray
    if (!date_limite_livraison_estimee) {
      return 'bg-gray-50 hover:bg-gray-100';
    }
    
    const now = new Date();
    const deadline = new Date(date_limite_livraison_estimee);
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60); // Convert to hours
    
    // Time-based color logic
    if (hoursUntilDeadline < 0) {
      return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-500'; // Deadline passed - red (en retard)
    } else if (hoursUntilDeadline <= 1) {
      return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-orange-500'; // 1 hour or less - orange
    } else if (hoursUntilDeadline <= 2) {
      return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500'; // 2 hours or less - yellow
    } else {
      return 'bg-gray-50 hover:bg-gray-100'; // More than 2 hours - normal gray
    }
  }

  const renderInlineSelect = (order, field, options, displayValue) => {
    const editKey = `${order.id}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(order.id, field, e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {options.map(option => (
              <option key={option.value || option} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
          <button
            onClick={() => saveInlineEdit(order.id, field, tempValue)}
            className="text-green-600 hover:text-green-800 p-1"
            title="Sauvegarder"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => cancelInlineEdit(order.id, field)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Annuler"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group inline-edit"
        onClick={() => handleInlineEdit(order.id, field, order[field])}
        title="Cliquer pour modifier"
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}</span>
          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>
    )
  }

  const renderInlineStatus = (order) => {
    const editKey = `${order.id}-statut`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(order.id, 'statut', e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            autoFocus
          >
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => saveInlineEdit(order.id, 'statut', tempValue)}
            className="text-green-600 hover:text-green-800 p-1"
            title="Sauvegarder"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => cancelInlineEdit(order.id, 'statut')}
            className="text-red-600 hover:text-red-800 p-1"
            title="Annuler"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group inline-edit"
        onClick={() => handleInlineEdit(order.id, 'statut', order.statut)}
        title="Cliquer pour modifier"
      >
        <div className="flex items-center gap-2">
          {getStatusBadge(order.statut)}
          <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>
    )
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des commandes...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Tableau de bord des commandes</h1>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.en_attente || 0}</div>
            <div className="text-sm text-gray-600">En attente</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.en_cours || 0}</div>
            <div className="text-sm text-gray-600">En cours</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.termine || 0}</div>
            <div className="text-sm text-gray-600">Terminé</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{stats.livre || 0}</div>
            <div className="text-sm text-gray-600">Livré</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{stats.annule || 0}</div>
            <div className="text-sm text-gray-600">Annulé</div>
          </div>
        </div>

        {/* Color Legend */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Indicateurs de délai de livraison :</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border-l-2 border-red-500 rounded"></div>
              <span className="text-gray-700">En retard (dépassé)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-200 border-l-2 border-orange-500 rounded"></div>
              <span className="text-gray-700">≤ 1h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border-l-2 border-yellow-500 rounded"></div>
              <span className="text-gray-700">≤ 2h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border-l-2 border-gray-300 rounded"></div>
              <span className="text-gray-700">&gt; 2h ou pas de délai</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-2 border-green-400 rounded"></div>
              <span className="text-gray-700">Terminé/Livré</span>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.statut}
                onChange={(e) => setFilters({...filters, statut: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Tous les statuts</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              
              <input
                type="text"
                placeholder="Commercial"
                value={filters.commercial}
                onChange={(e) => setFilters({...filters, commercial: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />
              
              <input
                type="text"
                placeholder="Client"
                value={filters.client}
                onChange={(e) => setFilters({...filters, client: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />

              <input
                type="text"
                placeholder="Infographe"
                value={filters.infographe}
                onChange={(e) => setFilters({...filters, infographe: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              />
              
              <select
                value={filters.atelier}
                onChange={(e) => setFilters({...filters, atelier: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Tous les ateliers</option>
                {atelierOptions.map(atelier => (
                  <option key={atelier} value={atelier}>
                    {atelier}
                  </option>
                ))}
              </select>

              <select
                value={filters.etape}
                onChange={(e) => setFilters({...filters, etape: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Toutes les étapes</option>
                {etapeOptions.map(etape => (
                  <option key={etape} value={etape}>
                    {etape}
                  </option>
                ))}
              </select>

              {/* Clear Filters Button */}
              {(filters.statut || filters.commercial || filters.client || filters.infographe || filters.atelier || filters.etape) && (
                <button
                  onClick={() => setFilters({
                    statut: '',
                    commercial: '',
                    client: '',
                    atelier: '',
                    infographe: '',
                    etape: ''
                  })}
                  className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
                >
                  Effacer filtres
                </button>
              )}
            </div>
            
            <Button onClick={handleCreateOrder}>
              Nouvelle commande
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Orders Cards - Mobile/Tablet View */}
        <div className="lg:hidden space-y-4 mb-6">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`shadow-md rounded-lg p-4 border transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(order)}`}
              onClick={(e) => handleRowClick(order, e)}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{order.numero_pms}</h3>
                    <div className="inline-edit">
                      {renderInlineStatus(order)}
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p><span className="font-medium">Client:</span> {order.client}</p>
                    <p><span className="font-medium">Commercial:</span> {order.commercial_en_charge}</p>
                    {order.infographe_en_charge && (
                      <p><span className="font-medium">Infographe:</span> {order.infographe_en_charge}</p>
                    )}
                    <div>
                      <span className="font-medium">Produits:</span>
                      {order.products && order.products.length > 0 ? (
                        <ul className="ml-4 mt-1">
                          {order.products.map((product, index) => (
                            <li key={index} className="text-sm">
                              {product.name} (Qté: {product.orderProduct?.quantity || 'N/A'})
                              {product.orderProduct?.unit_price && (
                                <span className="text-gray-600"> - {product.orderProduct.unit_price}€/unité</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="ml-2 text-gray-500">Aucun produit associé</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Étape:</span> 
                      <span className="ml-2 inline-edit">
                        {renderInlineSelect(
                          order, 
                          'etape', 
                          etapeOptions,
                          order.etape || '-'
                        )}
                      </span>
                    </div>
                    {order.atelier_concerne && (
                      <p><span className="font-medium">Atelier:</span> {order.atelier_concerne}</p>
                    )}
                    <div>
                      <span className="font-medium">Livraison estimée:</span> 
                      <span className="ml-2 inline-edit">
                        {renderInlineDate(order, 'date_limite_livraison_estimee')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Livraison attendue:</span> 
                      <span className="ml-2 inline-edit">
                        {renderInlineDate(order, 'date_limite_livraison_attendue')}
                      </span>
                    </div>
                    {order.option_finition && (
                      <p><span className="font-medium">Finitions:</span> {order.option_finition}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <div className="action-button flex gap-2 w-full">
                  <button
                    onClick={() => handleEditOrder(order)}
                    className="flex-1 flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    className="flex-1 flex items-center justify-center gap-2 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
              Aucune commande trouvée
            </div>
          )}
        </div>

        {/* Orders Table - Desktop View */}
        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commercial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Infographe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Étape
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atelier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livraison estimée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livraison attendue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Finitions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr 
                    key={order.id} 
                    className={`transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(order)}`}
                    onClick={(e) => handleRowClick(order, e)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.numero_pms}
                        </div>
                        <div className="text-sm text-gray-500 max-w-xs">
                          {order.products && order.products.length > 0 ? (
                            <>
                              {order.products.slice(0, 2).map((product, index) => (
                                <div key={index} className="truncate">
                                  {product.name} (Qté: {product.orderProduct?.quantity || 'N/A'})
                                </div>
                              ))}
                              {order.products.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{order.products.length - 2} produit(s) de plus
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Aucun produit</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.commercial_en_charge}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.infographe_en_charge || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="inline-edit">
                        {renderInlineSelect(
                          order, 
                          'etape', 
                          etapeOptions,
                          order.etape || '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.atelier_concerne || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-edit">
                        {renderInlineStatus(order)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineDate(order, 'date_limite_livraison_estimee')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineDate(order, 'date_limite_livraison_attendue')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      {order.option_finition || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <div className="action-button">
                        
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
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
                  onClick={() => fetchOrders(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => fetchOrders(pagination.currentPage + 1)}
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
                    <span className="font-medium">{pagination.totalOrders}</span> commandes
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {[...Array(pagination.totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => fetchOrders(i + 1)}
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

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <OrderViewModal
          order={selectedOrder}
          onClose={() => {
            setShowViewModal(false)
            setSelectedOrder(null)
          }}
          onEdit={() => {
            setShowViewModal(false)
            setShowEditModal(true)
          }}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <OrderModal
          order={selectedOrder}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedOrder(null)
          }}
          onSave={() => {
            fetchOrders(pagination.currentPage)
            fetchStats()
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedOrder(null)
          }}
          statusOptions={statusOptions}
          atelierOptions={atelierOptions}
          etapeOptions={etapeOptions}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={cancelDeleteOrder}
        onConfirm={confirmDeleteOrder}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer la commande ${orderToDelete?.numero_pms || ''} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  )
}

// Order View Modal Component
const OrderViewModal = ({ order, onClose, onEdit, formatDate, getStatusBadge }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out overflow-y-auto h-full w-full z-50 animate-in fade-in">
      <div className="relative top-8 mx-auto p-0 w-11/12 max-w-4xl min-h-[calc(100vh-4rem)] animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-3xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-8 py-6 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    Détails de la commande
                  </h3>
                  <p className="text-indigo-100 text-sm mt-1 font-medium">
                    Commande {order.numero_pms}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all duration-200 group border border-white/20 backdrop-blur-sm"
                >
                  <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 group border border-white/20 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg shadow-sm border border-blue-200">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Informations générales</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Numéro PMS:</span>
                      <span className="text-gray-900 font-semibold">{order.numero_pms}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Client:</span>
                      <span className="text-gray-900">{order.client}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Commercial:</span>
                      <span className="text-gray-900">{order.commercial_en_charge}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Infographe:</span>
                      <span className="text-gray-900">{order.infographe_en_charge || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">Statut:</span>
                      <div>{getStatusBadge(order.statut)}</div>
                    </div>
                  </div>
                </div>

                {/* Product Details Section */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg shadow-sm border border-green-200">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Produits commandés</h4>
                  </div>
                  <div className="space-y-4">
                    {order.products && order.products.length > 0 ? (
                      order.products.map((product, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-green-200/50 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-800">{product.name}</h5>
                            <span className="text-sm text-gray-500">#{product.id}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Quantité:</span>
                              <span className="ml-2 text-gray-900">{product.orderProduct?.quantity || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Temps estimé:</span>
                              <span className="ml-2 text-gray-900">{product.estimated_creation_time}h</span>
                            </div>
                            {product.orderProduct?.unit_price && (
                              <div className="col-span-2">
                                <span className="font-medium text-gray-600">Prix unitaire:</span>
                                <span className="ml-2 text-gray-900">{product.orderProduct.unit_price}€</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-4 rounded-lg border border-green-200/50 text-center text-gray-500">
                        Aucun produit associé à cette commande
                      </div>
                    )}
                    <div className="py-2 border-t border-green-200/50">
                      <span className="font-medium text-gray-700 block mb-2">Options de finition:</span>
                      <p className="text-gray-900 bg-white p-3 rounded-lg border border-green-200/50">
                        {order.option_finition || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Production Information */}
              <div className="space-y-6">
                {/* Production Section */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg shadow-sm border border-purple-200">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Production</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                      <span className="font-medium text-gray-700">Étape actuelle:</span>
                      <span className="text-gray-900 bg-white px-3 py-1 rounded-full border border-purple-200/50 font-medium">
                        {order.etape || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                      <span className="font-medium text-gray-700">Atelier concerné:</span>
                      <span className="text-gray-900">{order.atelier_concerne || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                      <span className="font-medium text-gray-700">Livraison estimée:</span>
                      <span className="text-gray-900">{formatDate(order.date_limite_livraison_estimee)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">Livraison attendue:</span>
                      <span className="text-gray-900">{formatDate(order.date_limite_livraison_attendue)}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg shadow-sm border border-orange-200">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Informations complémentaires</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
                      <span className="font-medium text-gray-700">Créé le:</span>
                      <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
                      <span className="font-medium text-gray-700">Modifié le:</span>
                      <span className="text-gray-900">{formatDate(order.updatedAt)}</span>
                    </div>
                    {order.commentaires && (
                      <div className="py-2">
                        <span className="font-medium text-gray-700 block mb-2">Commentaires:</span>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-orange-200/50">
                          {order.commentaires}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 mt-8">
              <Button
                variant="secondary"
                onClick={onClose}
                className="min-w-[120px]"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Fermer
                </div>
              </Button>
              <Button
                onClick={onEdit}
                className="min-w-[140px]"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Order Modal Component
const OrderModal = ({ order, onClose, onSave, statusOptions, atelierOptions, etapeOptions }) => {
  const [formData, setFormData] = useState({
    commercial_en_charge: '',
    infographe_en_charge: '',
    numero_pms: '',
    client: '',
    date_limite_livraison_estimee: '',
    date_limite_livraison_attendue: '',
    etape: '',
    option_finition: '',
    atelier_concerne: '',
    statut: 'en_attente',
    commentaires: ''
  })
  const [selectedProducts, setSelectedProducts] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true)
        const products = await productAPI.getProducts()
        setAvailableProducts(products)
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Erreur lors du chargement des produits')
      } finally {
        setProductsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    if (order) {
      setFormData({
        commercial_en_charge: order.commercial_en_charge || '',
        infographe_en_charge: order.infographe_en_charge || '',
        numero_pms: order.numero_pms || '',
        client: order.client || '',
        date_limite_livraison_estimee: order.date_limite_livraison_estimee ? 
          new Date(order.date_limite_livraison_estimee).toISOString().slice(0, 16) : '',
        date_limite_livraison_attendue: order.date_limite_livraison_attendue ? 
          new Date(order.date_limite_livraison_attendue).toISOString().slice(0, 16) : '',
        etape: order.etape || '',
        option_finition: order.option_finition || '',
        atelier_concerne: order.atelier_concerne || '',
        statut: order.statut || 'en_attente',
        commentaires: order.commentaires || ''
      })
      
      // If editing existing order with products, populate selectedProducts
      if (order.products && order.products.length > 0) {
        const orderProducts = order.products.map(product => ({
          productId: product.id,
          quantity: product.orderProduct?.quantity || 1,
          unitPrice: product.orderProduct?.unit_price || null
        }))
        setSelectedProducts(orderProducts)
      }
    }
  }, [order])

  const addProduct = () => {
    setSelectedProducts([...selectedProducts, { productId: '', quantity: 1, unitPrice: null }])
  }

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
  }

  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedProducts(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate that at least one product is selected
    if (selectedProducts.length === 0) {
      setError('Veuillez sélectionner au moins un produit')
      setLoading(false)
      return
    }

    // Validate that all selected products have valid data
    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i]
      if (!product.productId || !product.quantity || product.quantity <= 0) {
        setError(`Produit ${i + 1}: Veuillez sélectionner un produit et spécifier une quantité valide`)
        setLoading(false)
        return
      }
    }

    try {
      const submitData = {
        ...formData,
        products: selectedProducts
      }
      
      if (order) {
        await orderAPI.updateOrder(order.id, submitData)
      } else {
        await orderAPI.createOrder(submitData)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out overflow-y-auto h-full w-full z-50 animate-in fade-in">
      <div className="relative top-8 mx-auto p-0 w-11/12 max-w-5xl min-h-[calc(100vh-4rem)] animate-in slide-in-from-top-4 duration-500">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-3xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {order ? 'Modifier la commande' : 'Nouvelle commande'}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1 font-medium">
                    {order ? `Commande ${order.numero_pms}` : 'Créer une nouvelle commande dans le système'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 group border border-white/20 backdrop-blur-sm"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
                <div className="p-1 bg-red-100 rounded-lg">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Erreur de validation</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1: Informations de base */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg shadow-sm border border-blue-200">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">Informations de base</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Numéro PMS *"
                    value={formData.numero_pms}
                    onChange={(e) => handleChange('numero_pms', e.target.value)}
                    required
                    placeholder="Ex: PMS-2024-001"
                  />
                  
                  <Input
                    label="Client *"
                    value={formData.client}
                    onChange={(e) => handleChange('client', e.target.value)}
                    required
                    placeholder="Nom du client"
                  />
                  
                  <Input
                    label="Commercial en charge *"
                    value={formData.commercial_en_charge}
                    onChange={(e) => handleChange('commercial_en_charge', e.target.value)}
                    required
                    placeholder="Nom du commercial"
                  />
                  
                  <Input
                    label="Infographe en charge"
                    value={formData.infographe_en_charge}
                    onChange={(e) => handleChange('infographe_en_charge', e.target.value)}
                    placeholder="Nom de l'infographe"
                  />
                </div>
              </div>

              {/* Section 2: Sélection des produits */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg shadow-sm border border-green-200">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Sélection des produits</h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent"></div>
                  </div>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ajouter produit
                  </button>
                </div>

                {productsLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Chargement des produits...</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProducts.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-gray-500 mb-2">Aucun produit sélectionné</div>
                        <button
                          type="button"
                          onClick={addProduct}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Cliquez ici pour ajouter votre premier produit
                        </button>
                      </div>
                    ) : (
                      selectedProducts.map((product, index) => (
                        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="font-medium text-gray-800">Produit {index + 1}</h5>
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors duration-200"
                              title="Supprimer ce produit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Produit *
                              </label>
                              <select
                                value={product.productId}
                                onChange={(e) => updateProduct(index, 'productId', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                              >
                                <option value="">Sélectionner un produit</option>
                                {availableProducts.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.estimated_creation_time}h)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantité *
                              </label>
                              <input
                                type="number"
                                value={product.quantity}
                                onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                min="1"
                                required
                                placeholder="Ex: 1000"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prix unitaire (optionnel)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={product.unitPrice || ''}
                                onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value) || null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Ex: 0.50"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                      value={formData.statut}
                      onChange={(e) => handleChange('statut', e.target.value)}
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Planning et production */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg shadow-sm border border-purple-200">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">Planning et production</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Date limite livraison estimée"
                    type="datetime-local"
                    value={formData.date_limite_livraison_estimee}
                    onChange={(e) => handleChange('date_limite_livraison_estimee', e.target.value)}
                  />
                  
                  <Input
                    label="Date limite livraison attendue"
                    type="datetime-local"
                    value={formData.date_limite_livraison_attendue}
                    onChange={(e) => handleChange('date_limite_livraison_attendue', e.target.value)}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Étape actuelle
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                        value={formData.etape}
                        onChange={(e) => handleChange('etape', e.target.value)}
                      >
                        <option value="">Sélectionner une étape</option>
                        {etapeOptions.map(etape => (
                          <option key={etape} value={etape}>
                            {etape}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Atelier concerné
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                        value={formData.atelier_concerne}
                        onChange={(e) => handleChange('atelier_concerne', e.target.value)}
                      >
                        <option value="">Sélectionner un atelier</option>
                        {atelierOptions.map(atelier => (
                          <option key={atelier} value={atelier}>
                            {atelier}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Options et commentaires */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg shadow-sm border border-orange-200">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">Options et commentaires</h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-transparent"></div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options de finition
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none transition-all duration-200 hover:border-gray-400 bg-white shadow-sm"
                      rows="3"
                      value={formData.option_finition}
                      onChange={(e) => handleChange('option_finition', e.target.value)}
                      placeholder="Pelliculage, vernissage, découpe, reliure, etc..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commentaires supplémentaires
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none transition-all duration-200 hover:border-gray-400 bg-white shadow-sm"
                      rows="4"
                      value={formData.commentaires}
                      onChange={(e) => handleChange('commentaires', e.target.value)}
                      placeholder="Notes importantes, instructions spéciales, contraintes particulières..."
                    />
                  </div>
                </div>
              </div>

              {/* Footer with buttons */}
              <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-b-xl -mx-8 -mb-8 px-8 pb-8">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Annuler
                  </div>
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="relative min-w-[180px]"
                >
                  <div className="flex items-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {order ? 'Modifier la commande' : 'Créer la commande'}
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage