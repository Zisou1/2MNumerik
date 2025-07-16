import React, { useState, useEffect } from 'react'
import { orderAPI, productAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import Input from '../components/InputComponent'
import AlertDialog from '../components/AlertDialog'
import ClientSearch from '../components/ClientSearch'
import { useAuth } from '../contexts/AuthContext'
import { usePriorityNotifications } from '../hooks/usePriorityNotifications'
import OrderModal from '../components/OrderModal'
import OrderViewModal from '../components/OrderViewModal'
const DashboardPage = () => {
  const { user } = useAuth()
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
    infograph: '',
    etape: '',
    timeFilter: 'all' // 'active', 'last30days', 'last90days', 'all'
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  })
  const [inlineEditing, setInlineEditing] = useState({})
  const [tempValues, setTempValues] = useState({})
  const [currentTime, setCurrentTime] = useState(new Date())

  // Helper function to check if user can create orders
  const canCreateOrders = () => {
    return user && (user.role === 'admin' || user.role === 'commercial')
  }

  // Helper function to check if user can edit orders
  const canEditOrders = () => {
    return user && (user.role === 'admin' || user.role === 'commercial')
  }

  // Helper function to check if user can delete orders
  const canDeleteOrders = () => {
    return user && user.role === 'admin'
  }

  // Helper function to get visible columns based on user role
  const getVisibleColumns = () => {
    if (user?.role === 'commercial') {
      return {
        code_client: true,
        nom_client: true,
        numero_affaire: true,
        commercial_en_charge: true,
        date_limite_livraison_attendue: true,
        produits: true,
        quantite: true,
        statut: true,
        etape: true,
        atelier_concerne: true,
        bat: true,
        express: true,
        // Hide these fields for commercial
        infograph_en_charge: false,
        date_limite_livraison_estimee: false,
        estimated_work_time_minutes: false,
        option_finition: false
      }
    }
    if (user?.role === 'infograph') {
      return {
        numero_pms: true,
        nom_client: true,
        produits: true,
        quantite: true,
        statut: true,
        option_finition: true,
        infograph_en_charge: true,
        bat: true,
        express: true,
        // Hide these fields for infograph
        code_client: false,
        numero_affaire: false,
        commercial_en_charge: false,
        date_limite_livraison_estimee: false,
        date_limite_livraison_attendue: false,
        etape: false,
        atelier_concerne: false,
        estimated_work_time_minutes: false
      }
    }
    // Default for admin and other roles - show all columns
    return {
      code_client: true,
      nom_client: true,
      numero_affaire: true,
      commercial_en_charge: true,
      infograph_en_charge: true,
      date_limite_livraison_estimee: true,
      date_limite_livraison_attendue: true,
      produits: true,
      quantite: true,
      statut: true,
      etape: true,
      atelier_concerne: true,
      estimated_work_time_minutes: true,
      option_finition: true,
      bat: true,
      express: true
    }
  }

  const visibleColumns = getVisibleColumns()

  const statusOptions = [
    { value: 'en_attente', label: 'En attente', color: 'bg-yellow-200 text-yellow-900 border border-yellow-300', rowColor: 'bg-yellow-100 hover:bg-yellow-200 border-l-4 border-yellow-400' },
    { value: 'en_cours', label: 'En cours', color: 'bg-blue-200 text-blue-900 border border-blue-300', rowColor: 'bg-blue-100 hover:bg-blue-200 border-l-4 border-blue-400' },
    { value: 'termine', label: 'Terminé', color: 'bg-green-200 text-green-900 border border-green-300', rowColor: 'bg-green-100 hover:bg-green-200 border-l-4 border-green-400' },
    { value: 'livre', label: 'Livré', color: 'bg-purple-200 text-purple-900 border border-purple-300', rowColor: 'bg-purple-100 hover:bg-purple-200 border-l-4 border-purple-400' },
    { value: 'annule', label: 'Annulé', color: 'bg-red-200 text-red-900 border border-red-300', rowColor: 'bg-red-100 hover:bg-red-200 border-l-4 border-red-400' }
  ]

  const atelierOptions = ['petit format', 'grand format', 'sous-traitance']
  const etapeOptions = ['conception', 'pré-presse', 'impression', 'finition', 'découpe']
  const batOptions = [
    { value: 'avec', label: 'Avec' },
    { value: 'sans', label: 'Sans' }
  ]
  const expressOptions = [
    { value: 'oui', label: 'Oui' },
    { value: 'non', label: 'Non' }
  ]

  // Initialize priority notifications hook
  const { checkUrgentOrders } = usePriorityNotifications(orders)

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true)
      const params = { page, limit: 10, ...filters }
      Object.keys(params).forEach(key => params[key] === '' && delete params[key])
      
      const response = await orderAPI.getOrders(params)
      // Filter out cancelled and delivered orders from the display
      const filteredOrders = response.orders.filter(order => 
        order.statut !== 'annule' && order.statut !== 'livre'
      )
      setOrders(filteredOrders)
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

  // Update current time every minute to refresh row colors
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

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
    // Only allow inline editing for admin and commercial users
    if (user?.role === 'infograph') return
    
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
      
      // If status is changed to cancelled or delivered, remove from local state
      if (field === 'statut' && (newValue === 'annule' || newValue === 'livre')) {
        setOrders(orders.filter(order => order.id !== orderId))
      } else {
        // Update the local orders state normally
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, [field]: valueToSend } : order
        ))
      }
      
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

  // Simplified inline edit handler for direct save
  const handleDirectEdit = async (orderId, field, newValue, originalValue) => {
    // Don't save if value hasn't changed
    if (newValue === originalValue) {
      return
    }

    try {
      // For date fields, convert the datetime-local value to ISO string
      let valueToSend = newValue
      if ((field === 'date_limite_livraison_estimee' || field === 'date_limite_livraison_attendue') && newValue) {
        valueToSend = new Date(newValue).toISOString()
      }
      
      await orderAPI.updateOrder(orderId, { [field]: valueToSend })
      
      // If status is changed to cancelled or delivered, remove from local state
      if (field === 'statut' && (newValue === 'annule' || newValue === 'livre')) {
        setOrders(orders.filter(order => order.id !== orderId))
      } else {
        // Update the local orders state normally
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, [field]: valueToSend } : order
        ))
      }
      
      // Refresh stats in case status changed
      if (field === 'statut') {
        fetchStats()
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour')
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
            onBlur={() => saveInlineEdit(order.id, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(order.id, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(order.id, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )
    }

    return (
      <div 
        className={`${user?.role === 'infograph' ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(order.id, field, currentValue ? new Date(currentValue).toISOString().slice(0, 16) : '')}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier (Entrée pour valider, Échap pour annuler)"}
      >
        <div className="flex items-center justify-between">
          <span>{formatDate(currentValue)}</span>
          {user?.role !== 'infograph' && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
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
    const { statut, date_limite_livraison_estimee, estimated_work_time_minutes } = order;
    
    // If status is finished (termine or livre), return green
    if (statut === 'termine' || statut === 'livre') {
      return 'bg-green-100 hover:bg-green-200 border-l-4 border-green-400';
    }
    
    // If no deadline date, return normal gray
    if (!date_limite_livraison_estimee) {
      return 'bg-gray-50 hover:bg-gray-100';
    }
    
    const now = currentTime;
    const deadline = new Date(date_limite_livraison_estimee);
    
    // Calculate work time in hours (default to 2 hours if not specified)
    const workTimeHours = estimated_work_time_minutes ? estimated_work_time_minutes / 60 : 2;
    
    // Calculate the latest start time (deadline - work time needed)
    const latestStartTime = new Date(deadline.getTime() - (workTimeHours * 60 * 60 * 1000));
    
    // Calculate hours until we must start working
    const hoursUntilMustStart = (latestStartTime - now) / (1000 * 60 * 60);
    
    // Calculate hours until actual deadline for reference
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
    
    // Time-based color logic using intelligent work time calculation
    if (hoursUntilMustStart < 0) {
      return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-500'; // Past latest start time - red (impossible to finish on time)
    } else if (hoursUntilMustStart <= 0.5) {
      return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-orange-500'; // 30 minutes or less before must start - orange
    } else if (hoursUntilMustStart <= 1) {
      return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500'; // 1 hour or less before must start - yellow
    } else if (hoursUntilDeadline < 0) {
      return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-500'; // Deadline passed but had enough time to start - still red
    } else {
      return 'bg-gray-50 hover:bg-gray-100'; // Normal - enough time available
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
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(order.id, field, newValue)
              // Auto-save on select change
              saveInlineEdit(order.id, field, newValue)
            }}
            onBlur={() => cancelInlineEdit(order.id, field)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(order.id, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            <option value="">-</option>
            {options.map(option => (
              <option key={option.value || option} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <div 
        className={`${user?.role === 'infograph' ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(order.id, field, order[field])}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}</span>
          {user?.role !== 'infograph' && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineNumber = (order, field, displayValue, unit = '') => {
    const editKey = `${order.id}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <input
            type="number"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(order.id, field, e.target.value)}
            onBlur={() => saveInlineEdit(order.id, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(order.id, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(order.id, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-20"
            autoFocus
            min="0"
          />
        </div>
      )
    }

    return (
      <div 
        className={`${user?.role === 'infograph' ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(order.id, field, order[field] || '')}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier (Entrée pour valider, Échap pour annuler)"}
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}{unit}</span>
          {user?.role !== 'infograph' && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
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
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(order.id, 'statut', newValue)
              // Auto-save on select change
              saveInlineEdit(order.id, 'statut', newValue)
            }}
            onBlur={() => cancelInlineEdit(order.id, 'statut')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(order.id, 'statut')
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          >
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <div 
        className={`${user?.role === 'infograph' ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(order.id, 'statut', order.statut)}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center gap-2">
          {getStatusBadge(order.statut)}
          {user?.role !== 'infograph' && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord des commandes</h1>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total actives</div>
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
        </div>

        {/* Color Legend */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Indicateurs de délai de livraison (basé sur le temps de travail estimé) :</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 border-l-2 border-red-500 rounded"></div>
              <span className="text-gray-700">Impossible de finir à temps (trop tard pour commencer)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-200 border-l-2 border-orange-500 rounded"></div>
              <span className="text-gray-700">≤ 30min avant de devoir commencer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 border-l-2 border-yellow-500 rounded"></div>
              <span className="text-gray-700">≤ 1h avant de devoir commencer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border-l-2 border-gray-300 rounded"></div>
              <span className="text-gray-700">Temps suffisant disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-2 border-green-400 rounded"></div>
              <span className="text-gray-700">Terminé/Livré</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <strong>Note:</strong> Le calcul utilise le temps de travail estimé de chaque commande. Si aucun temps n'est défini, 2h par défaut sont utilisées.
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {/* Time Filter - First Priority */}
              <select
                value={filters.timeFilter}
                onChange={(e) => setFilters({...filters, timeFilter: e.target.value})}
                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:border-blue-500 text-sm font-medium bg-blue-50"
              >
                <option value="active">Commandes actives</option>
                <option value="last30days">30 derniers jours</option>
                <option value="last90days">90 derniers jours</option>
                <option value="all">Toutes les commandes</option>
              </select>

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
                value={filters.infograph}
                onChange={(e) => setFilters({...filters, infograph: e.target.value})}
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
              {(filters.statut || filters.commercial || filters.client || filters.infograph || filters.atelier || filters.etape || filters.timeFilter !== 'all') && (
                <button
                  onClick={() => setFilters({
                    statut: '',
                    commercial: '',
                    client: '',
                    atelier: '',
                    infograph: '',
                    etape: '',
                    timeFilter: 'all'
                  })}
                  className="text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors duration-200"
                >
                  Effacer filtres
                </button>
              )}
            </div>
            
            {canCreateOrders() && (
              <Button onClick={handleCreateOrder}>
                Nouvelle commande
              </Button>
            )}
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
                    {visibleColumns.statut && (
                      <div className="inline-edit">
                        {renderInlineStatus(order)}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    {order.clientInfo?.code_client && (
                      <p><span className="font-medium">Code client:</span> {order.clientInfo.code_client}</p>
                    )}
                    {visibleColumns.nom_client && (
                      <p><span className="font-medium">Client:</span> {order.clientInfo?.nom || order.client}</p>
                    )}
                    {order.clientInfo?.numero_affaire && (
                      <p><span className="font-medium">Numéro d'affaire:</span> {order.clientInfo.numero_affaire}</p>
                    )}
                    {visibleColumns.commercial_en_charge && (
                      <p><span className="font-medium">Commercial:</span> {order.commercial_en_charge}</p>
                    )}
                    {visibleColumns.infograph_en_charge && order.infograph_en_charge && (
                      <p><span className="font-medium">Infographe:</span> {order.infograph_en_charge}</p>
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
                    {visibleColumns.etape && (
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
                    )}
                    {visibleColumns.atelier_concerne && order.atelier_concerne && (
                      <p><span className="font-medium">Atelier:</span> {order.atelier_concerne}</p>
                    )}
                    {visibleColumns.date_limite_livraison_estimee && (
                      <div>
                        <span className="font-medium">Livraison estimée:</span> 
                        <span className="ml-2 inline-edit">
                          {renderInlineDate(order, 'date_limite_livraison_estimee')}
                        </span>
                      </div>
                    )}
                    {visibleColumns.date_limite_livraison_attendue && (
                      <div>
                        <span className="font-medium">Délai souhaité:</span> 
                        <span className="ml-2 inline-edit">
                          {renderInlineDate(order, 'date_limite_livraison_attendue')}
                        </span>
                      </div>
                    )}
                    {visibleColumns.estimated_work_time_minutes && (
                      <div>
                        <span className="font-medium">Temps estimé:</span> 
                        <span className="ml-2 inline-edit">
                          {renderInlineNumber(
                            order, 
                            'estimated_work_time_minutes', 
                            order.estimated_work_time_minutes ? 
                              `${Math.round(order.estimated_work_time_minutes / 60 * 10) / 10}h` : '-'
                          )}
                        </span>
                      </div>
                    )}
                    {visibleColumns.option_finition && order.option_finition && (
                      <p><span className="font-medium">Finitions:</span> {order.option_finition}</p>
                    )}
                    {visibleColumns.bat && order.bat && (
                      <div>
                        <span className="font-medium">BAT:</span> 
                        <span className="ml-2 inline-edit">
                          {renderInlineSelect(
                            order, 
                            'bat', 
                            batOptions,
                            batOptions.find(b => b.value === order.bat)?.label || '-'
                          )}
                        </span>
                      </div>
                    )}
                    {visibleColumns.express && order.express && (
                      <div>
                        <span className="font-medium">Express:</span> 
                        <span className="ml-2 inline-edit">
                          {renderInlineSelect(
                            order, 
                            'express', 
                            expressOptions,
                            expressOptions.find(e => e.value === order.express)?.label || '-'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <div className="action-button flex gap-2 w-full">
                  {canEditOrders() && (
                    <button
                      onClick={() => handleEditOrder(order)}
                      className="flex-1 flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Modifier
                    </button>
                  )}
                  {canDeleteOrders() && (
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="flex-1 flex items-center justify-center gap-2 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Supprimer
                    </button>
                  )}
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
                  {visibleColumns.code_client && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code Client
                    </th>
                  )}
                  {visibleColumns.nom_client && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                  )}
                  {visibleColumns.numero_affaire && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numéro d'affaire
                    </th>
                  )}
                  {visibleColumns.commercial_en_charge && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commercial
                    </th>
                  )}
                  {visibleColumns.infograph_en_charge && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Infographe
                    </th>
                  )}
                  {visibleColumns.etape && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Étape
                    </th>
                  )}
                  {visibleColumns.atelier_concerne && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Atelier
                    </th>
                  )}
                  {visibleColumns.statut && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                  )}
                  {visibleColumns.date_limite_livraison_estimee && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livraison estimée
                    </th>
                  )}
                  {visibleColumns.date_limite_livraison_attendue && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Délai souhaité
                    </th>
                  )}
                  {visibleColumns.estimated_work_time_minutes && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temps estimé
                    </th>
                  )}
                  {visibleColumns.option_finition && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Finitions
                    </th>
                  )}
                  {visibleColumns.bat && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      BAT
                    </th>
                  )}
                  {visibleColumns.express && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Express
                    </th>
                  )}
                  {(canEditOrders() || canDeleteOrders()) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
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
                    {visibleColumns.code_client && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.clientInfo?.code_client || '-'}
                      </td>
                    )}
                    {visibleColumns.nom_client && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.clientInfo?.nom || order.client}
                      </td>
                    )}
                    {visibleColumns.numero_affaire && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.clientInfo?.numero_affaire || '-'}
                      </td>
                    )}
                    {visibleColumns.commercial_en_charge && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.commercial_en_charge}
                      </td>
                    )}
                    {visibleColumns.infograph_en_charge && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.infograph_en_charge || '-'}
                      </td>
                    )}
                    {visibleColumns.etape && (
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
                    )}
                    {visibleColumns.atelier_concerne && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.atelier_concerne || '-'}
                      </td>
                    )}
                    {visibleColumns.statut && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-edit">
                          {renderInlineStatus(order)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.date_limite_livraison_estimee && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderInlineDate(order, 'date_limite_livraison_estimee')}
                      </td>
                    )}
                    {visibleColumns.date_limite_livraison_attendue && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderInlineDate(order, 'date_limite_livraison_attendue')}
                      </td>
                    )}
                    {visibleColumns.estimated_work_time_minutes && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderInlineNumber(
                          order, 
                          'estimated_work_time_minutes', 
                          order.estimated_work_time_minutes ? 
                            `${Math.round(order.estimated_work_time_minutes / 60 * 10) / 10}h` : '-'
                        )}
                      </td>
                    )}
                    {visibleColumns.option_finition && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {order.option_finition || '-'}
                      </td>
                    )}
                    {visibleColumns.bat && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineSelect(
                            order, 
                            'bat', 
                            batOptions,
                            order.bat ? batOptions.find(b => b.value === order.bat)?.label : '-'
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.express && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineSelect(
                            order, 
                            'express', 
                            expressOptions,
                            order.express ? expressOptions.find(e => e.value === order.express)?.label : '-'
                          )}
                        </div>
                      </td>
                    )}
                    {(canEditOrders() || canDeleteOrders()) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <div className="action-button">
                          {canDeleteOrders() && (
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
          etapeOptions={etapeOptions}
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
          batOptions={batOptions}
          expressOptions={expressOptions}
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






export default DashboardPage