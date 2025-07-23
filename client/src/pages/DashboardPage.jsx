import React, { useState, useEffect, useMemo, Fragment } from 'react'
import { orderAPI, productAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import Input from '../components/InputComponent'
import AlertDialog from '../components/AlertDialog'
import ClientSearch from '../components/ClientSearch'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { usePriorityNotifications } from '../hooks/usePriorityNotifications'
import OrderModal from '../components/OrderModal'
import OrderViewModal from '../components/OrderViewModal'
import WebSocketStatus from '../components/WebSocketStatus'
const DashboardPage = () => {
  const { user } = useAuth()
  const { subscribe, connected } = useWebSocket()
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
  const [expandedOrders, setExpandedOrders] = useState(new Set())

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
        numero_affaire: true,
        numero_dm: true,
        numero_pms: false,
        client_info: true,
        commercial_en_charge: true,
        product_name: true,
        quantity: true,
        date_limite_livraison_attendue: true,
        statut: true,
        etape: true,
        atelier_concerne: true,
        bat: true,
        express: true,
        // Hide these fields for commercial
        infograph_en_charge: false,
        date_limite_livraison_estimee: false,
        estimated_work_time_minutes: false,
        commentaires: false
      }
    }
    if (user?.role === 'infograph') {
      return {
        numero_affaire: true,
        numero_dm: true,
        numero_pms: true,
        client_info: true,
        commercial_en_charge: true,
        product_name: true,
        quantity: true,
        statut: true,
        infograph_en_charge: true,
        date_limite_livraison_estimee: true,
        estimated_work_time_minutes: true,
        bat: true,
        express: true,
        commentaires: true,
        // Hide these fields for infograph
        date_limite_livraison_attendue: false,
        etape: false,
        atelier_concerne: false
      }
    }
    // Default for admin and other roles - show all columns
    return {
      numero_affaire: true,
      numero_dm: true,
      numero_pms: true,
      client_info: true,
      commercial_en_charge: true,
      product_name: true,
      quantity: true,
      date_limite_livraison_attendue: true,
      statut: true,
      etape: true,
      atelier_concerne: true,
      infograph_en_charge: true,
      date_limite_livraison_estimee: true,
      estimated_work_time_minutes: true,
      bat: true,
      express: true,
      commentaires: true
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

  // Functions for handling order expansion
  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(orderId)) {
        newExpanded.delete(orderId)
      } else {
        newExpanded.add(orderId)
      }
      return newExpanded
    })
  }

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
      
      // Flatten orders to order-product rows
      const orderProductRows = []
      filteredOrders.forEach(order => {
        if (order.orderProducts && order.orderProducts.length > 0) {
          order.orderProducts.forEach(orderProduct => {
            orderProductRows.push({
              // Order level fields
              orderId: order.id,
              numero_affaire: order.numero_affaire,
              numero_dm: order.numero_dm,
              client_info: order.client,
              commercial_en_charge: order.commercial_en_charge,
              date_limite_livraison_attendue: order.date_limite_livraison_attendue,
              // Product level fields
              orderProductId: orderProduct.id,
              numero_pms: orderProduct.numero_pms,
              product_name: orderProduct.Product?.name || 'Produit inconnu',
              quantity: orderProduct.quantity,
              statut: orderProduct.statut,
              etape: orderProduct.etape,
              atelier_concerne: orderProduct.atelier_concerne,
              infograph_en_charge: orderProduct.infograph_en_charge,
              date_limite_livraison_estimee: orderProduct.date_limite_livraison_estimee,
              estimated_work_time_minutes: orderProduct.estimated_work_time_minutes,
              bat: orderProduct.bat,
              express: orderProduct.express,
              commentaires: orderProduct.commentaires,
              createdAt: order.createdAt
            })
          })
        }
      })
      
      setOrders(orderProductRows)
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

  // Update current time every minute to refresh row colors and re-sort orders
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Helper function to get order urgency level (lower number = more urgent)
  // Now calculates based on individual order-product row
  const getOrderUrgency = (orderProductRow) => {
    const { statut, date_limite_livraison_estimee, estimated_work_time_minutes } = orderProductRow;
    
    // If status is finished, least urgent (5)
    if (statut === 'termine' || statut === 'livre') {
      return 5;
    }
    
    // If no deadline date, medium urgency (3)
    if (!date_limite_livraison_estimee) {
      return 3;
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
    
    // Determine urgency level
    if (hoursUntilMustStart < 0 || hoursUntilDeadline < 0) {
      return 0; // Most urgent - past deadline or latest start time
    } else if (hoursUntilMustStart <= 0.5) {
      return 1; // Very urgent - 30 minutes or less before must start
    } else if (hoursUntilMustStart <= 1) {
      return 2; // Urgent - 1 hour or less before must start
    } else {
      return 4; // Normal - enough time available
    }
  }

  // Memoized sorted orders that automatically re-sorts when currentTime or orders change
  const sortedOrders = useMemo(() => {
    if (orders.length === 0) return orders;
    
    return [...orders].sort((a, b) => {
      // First, sort by urgency (most urgent first)
      const urgencyA = getOrderUrgency(a)
      const urgencyB = getOrderUrgency(b)
      
      if (urgencyA !== urgencyB) {
        return urgencyA - urgencyB // Lower number = more urgent
      }
      
      // If same urgency, sort by delivery date (earliest first)
      const dateA = a.date_limite_livraison_estimee ? new Date(a.date_limite_livraison_estimee) : null
      const dateB = b.date_limite_livraison_estimee ? new Date(b.date_limite_livraison_estimee) : null
      
      if (dateA && dateB) {
        return dateA - dateB
      } else if (dateA && !dateB) {
        return -1 // Orders with dates come first
      } else if (!dateA && dateB) {
        return 1
      } else {
        // Both have no date, sort by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt)
      }
    })
  }, [orders, currentTime]) // Re-sort when orders or currentTime changes

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!connected) return

    const unsubscribeOrderCreated = subscribe('orderCreated', (newOrder) => {
      console.log('Real-time: Order created', newOrder)
      
      // Only add if it's not cancelled or delivered (dashboard filters)
      if (newOrder.statut !== 'annule' && newOrder.statut !== 'livre') {
        setOrders(prevOrders => {
          // Check if order already exists to avoid duplicates
          const exists = prevOrders.some(order => order.id === newOrder.id)
          if (!exists) {
            return [newOrder, ...prevOrders]
          }
          return prevOrders
        })
        
        // Update stats
        fetchStats()
      }
    })

    const unsubscribeOrderUpdated = subscribe('orderUpdated', (updatedOrder) => {
      console.log('Real-time: Order updated', updatedOrder)
      
      setOrders(prevOrders => {
        // If order is now cancelled or delivered, remove it from dashboard
        if (updatedOrder.statut === 'annule' || updatedOrder.statut === 'livre') {
          return prevOrders.filter(order => order.id !== updatedOrder.id)
        }
        
        // Otherwise update or add the order
        const orderIndex = prevOrders.findIndex(order => order.id === updatedOrder.id)
        if (orderIndex >= 0) {
          const newOrders = [...prevOrders]
          newOrders[orderIndex] = updatedOrder
          return newOrders
        } else {
          // Order wasn't in dashboard before but now should be
          return [updatedOrder, ...prevOrders]
        }
      })
      
      // Update stats
      fetchStats()
    })

    const unsubscribeOrderDeleted = subscribe('orderDeleted', (deletedOrderData) => {
      console.log('Real-time: Order deleted', deletedOrderData)
      
      setOrders(prevOrders => prevOrders.filter(order => order.id !== deletedOrderData.id))
      
      // Update stats
      fetchStats()
    })

    // Cleanup function
    return () => {
      unsubscribeOrderCreated()
      unsubscribeOrderUpdated()
      unsubscribeOrderDeleted()
    }
  }, [connected, subscribe])

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

  const handleInlineEdit = (orderProductId, field, currentValue) => {
    // Only allow inline editing for admin and commercial users
    if (user?.role === 'infograph') return
    
    setInlineEditing({ [`${orderProductId}-${field}`]: true })
    setTempValues({ [`${orderProductId}-${field}`]: currentValue })
  }

  const cancelInlineEdit = (orderProductId, field) => {
    setInlineEditing({ ...inlineEditing, [`${orderProductId}-${field}`]: false })
    setTempValues({ ...tempValues, [`${orderProductId}-${field}`]: null })
  }

  const saveInlineEdit = async (orderProductId, field, newValue) => {
    try {
      // For date fields, convert the datetime-local value to ISO string
      let valueToSend = newValue
      if ((field === 'date_limite_livraison_estimee' || field === 'date_limite_livraison_attendue') && newValue) {
        valueToSend = new Date(newValue).toISOString()
      }
      
      // Find the order product row to get orderId
      const orderProductRow = orders.find(row => row.orderProductId === orderProductId)
      if (!orderProductRow) return
      
      // Check if it's an order-level field or product-level field
      const orderLevelFields = ['numero_affaire', 'numero_dm', 'commercial_en_charge', 'date_limite_livraison_attendue']
      
      if (orderLevelFields.includes(field)) {
        // Update order-level field
        await orderAPI.updateOrder(orderProductRow.orderId, { [field]: valueToSend })
      } else {
        // Update product-level field
        await orderAPI.updateOrderProduct(orderProductRow.orderId, orderProductId, { [field]: valueToSend })
      }
      
      // If status is changed to cancelled or delivered, remove from local state
      if (field === 'statut' && (newValue === 'annule' || newValue === 'livre')) {
        setOrders(orders.filter(row => row.orderProductId !== orderProductId))
      } else {
        // Update the local orders state
        setOrders(orders.map(row => 
          row.orderProductId === orderProductId ? { ...row, [field]: valueToSend } : row
        ))
      }
      
      // Clear editing state
      setInlineEditing({ ...inlineEditing, [`${orderProductId}-${field}`]: false })
      setTempValues({ ...tempValues, [`${orderProductId}-${field}`]: null })
      
      // Refresh stats in case status changed
      if (field === 'statut') {
        fetchStats()
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      cancelInlineEdit(orderProductId, field)
    }
  }

  // Simplified inline edit handler for direct save
  const handleDirectEdit = async (orderProductId, field, newValue, originalValue) => {
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
      
      // Find the order product row to get orderId
      const orderProductRow = orders.find(row => row.orderProductId === orderProductId)
      if (!orderProductRow) return
      
      // Check if it's an order-level field or product-level field
      const orderLevelFields = ['numero_affaire', 'numero_dm', 'commercial_en_charge', 'date_limite_livraison_attendue']
      
      if (orderLevelFields.includes(field)) {
        // Update order-level field
        await orderAPI.updateOrder(orderProductRow.orderId, { [field]: valueToSend })
      } else {
        // Update product-level field
        await orderAPI.updateOrderProduct(orderProductRow.orderId, orderProductId, { [field]: valueToSend })
      }
      
      // If status is changed to cancelled or delivered, remove from local state
      if (field === 'statut' && (newValue === 'annule' || newValue === 'livre')) {
        setOrders(orders.filter(row => row.orderProductId !== orderProductId))
      } else {
        // Update the local orders state
        setOrders(orders.map(row => 
          row.orderProductId === orderProductId ? { ...row, [field]: valueToSend } : row
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

  const handleTempValueChange = (orderProductId, field, value) => {
    setTempValues({ ...tempValues, [`${orderProductId}-${field}`]: value })
  }

  const handleRowClick = (orderProductRow, event) => {
    // Don't open modal if clicking on inline edit elements or action buttons
    if (event.target.closest('.inline-edit') || event.target.closest('.action-button')) {
      return
    }
    // Create a mock order object for the modal
    const mockOrder = {
      id: orderProductRow.orderId,
      numero_affaire: orderProductRow.numero_affaire,
      numero_dm: orderProductRow.numero_dm,
      client: orderProductRow.client_info,
      commercial_en_charge: orderProductRow.commercial_en_charge,
      date_limite_livraison_attendue: orderProductRow.date_limite_livraison_attendue,
      orderProducts: [{
        id: orderProductRow.orderProductId,
        numero_pms: orderProductRow.numero_pms,
        Product: { name: orderProductRow.product_name },
        quantity: orderProductRow.quantity,
        statut: orderProductRow.statut,
        etape: orderProductRow.etape,
        atelier_concerne: orderProductRow.atelier_concerne,
        infograph_en_charge: orderProductRow.infograph_en_charge,
        date_limite_livraison_estimee: orderProductRow.date_limite_livraison_estimee,
        estimated_work_time_minutes: orderProductRow.estimated_work_time_minutes,
        bat: orderProductRow.bat,
        express: orderProductRow.express,
        commentaires: orderProductRow.commentaires
      }]
    }
    setSelectedOrder(mockOrder)
    setShowViewModal(true)
  }

  const renderInlineDate = (orderProductRow, field) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]
    const currentValue = orderProductRow[field]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <input
            type="datetime-local"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, field, e.target.value)}
            onBlur={() => saveInlineEdit(orderProductRow.orderProductId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(orderProductRow.orderProductId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
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
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, currentValue ? new Date(currentValue).toISOString().slice(0, 16) : '')}
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
    // Use the urgency level calculated from products
    const urgencyLevel = getOrderUrgency(order);
    
    // If overall order status is finished, return green
    if (order.statut === 'termine' || order.statut === 'livre') {
      return 'bg-green-100 hover:bg-green-200 border-l-4 border-green-400';
    }
    
    // Color based on urgency level
    switch (urgencyLevel) {
      case 0:
        return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-500'; // Most urgent - past deadline
      case 1:
        return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-orange-500'; // Very urgent - 30 min or less
      case 2:
        return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500'; // Urgent - 1 hour or less
      case 3:
        return 'bg-gray-50 hover:bg-gray-100'; // Medium urgency - no deadline set
      case 4:
        return 'bg-gray-50 hover:bg-gray-100'; // Normal - enough time
      case 5:
      default:
        return 'bg-gray-50 hover:bg-gray-100'; // Least urgent or default
    }
  }

  const renderInlineSelect = (orderProductRow, field, options, displayValue) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, field, newValue)
              // Auto-save on select change
              saveInlineEdit(orderProductRow.orderProductId, field, newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, field)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
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
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field])}
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

  const renderInlineText = (orderProductRow, field, displayValue) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <input
            type="text"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, field, e.target.value)}
            onBlur={() => saveInlineEdit(orderProductRow.orderProductId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(orderProductRow.orderProductId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-32"
            autoFocus
          />
        </div>
      )
    }

    return (
      <div 
        className={`${user?.role === 'infograph' ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field] || '')}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier (Entrée pour valider, Échap pour annuler)"}
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

  const renderInlineNumber = (orderProductRow, field, displayValue, unit = '') => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <input
            type="number"
            value={tempValue || ''}
            onChange={(e) => handleTempValueChange(orderProductRow.orderProductId, field, e.target.value)}
            onBlur={() => saveInlineEdit(orderProductRow.orderProductId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveInlineEdit(orderProductRow.orderProductId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, field)
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
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field] || '')}
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

  const renderInlineStatus = (orderProductRow) => {
    const editKey = `${orderProductRow.orderProductId}-statut`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'statut', newValue)
              // Auto-save on select change
              saveInlineEdit(orderProductRow.orderProductId, 'statut', newValue)
            }}
            onBlur={() => cancelInlineEdit(orderProductRow.orderProductId, 'statut')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelInlineEdit(orderProductRow.orderProductId, 'statut')
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
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, 'statut', orderProductRow.statut)}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center gap-2">
          {getStatusBadge(orderProductRow.statut)}
          {user?.role !== 'infograph' && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  // Product-level inline editing functions
  const handleProductInlineEdit = (orderId, productId, field, currentValue) => {
    const editKey = `${orderId}-${productId}-${field}`
    setInlineEditing({ [editKey]: true })
    setTempValues({ [editKey]: currentValue })
  }

  const cancelProductInlineEdit = (orderId, productId, field) => {
    const editKey = `${orderId}-${productId}-${field}`
    setInlineEditing({ ...inlineEditing, [editKey]: false })
    setTempValues({ ...tempValues, [editKey]: null })
  }

  const saveProductInlineEdit = async (orderId, productId, field, newValue) => {
    try {
      let valueToSend = newValue
      if (field === 'date_limite_livraison_estimee' && newValue) {
        valueToSend = new Date(newValue).toISOString()
      }
      
      // Update product via API (you'll need to implement this endpoint)
      await orderAPI.updateOrderProduct(orderId, productId, { [field]: valueToSend })
      
      // Update local state
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            orderProducts: order.orderProducts?.map(product => 
              product.id === productId ? { ...product, [field]: valueToSend } : product
            )
          }
        }
        return order
      }))
      
      const editKey = `${orderId}-${productId}-${field}`
      setInlineEditing({ ...inlineEditing, [editKey]: false })
      setTempValues({ ...tempValues, [editKey]: null })
      
      if (field === 'statut') {
        fetchStats()
        fetchOrders(pagination.currentPage)
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour du produit')
      cancelProductInlineEdit(orderId, productId, field)
    }
  }

  const handleProductTempValueChange = (orderId, productId, field, value) => {
    const editKey = `${orderId}-${productId}-${field}`
    setTempValues({ ...tempValues, [editKey]: value })
  }

  // Render functions for product-level inline editing
  const renderProductInlineText = (orderId, productId, field, displayValue) => {
    const editKey = `${orderId}-${productId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <input
            type="text"
            value={tempValue || ''}
            onChange={(e) => handleProductTempValueChange(orderId, productId, field, e.target.value)}
            onBlur={() => saveProductInlineEdit(orderId, productId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveProductInlineEdit(orderId, productId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelProductInlineEdit(orderId, productId, field)
              }
            }}
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-32"
            autoFocus
          />
        </div>
      )
    }

    return (
      <div 
        className={`${user?.role === 'infograph' ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleProductInlineEdit(orderId, productId, field, displayValue === '-' ? '' : displayValue)}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier (Entrée pour valider, Échap pour annuler)"}
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

  const renderProductInlineDate = (orderId, productId, field, currentValue) => {
    const editKey = `${orderId}-${productId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <input
            type="datetime-local"
            value={tempValue || ''}
            onChange={(e) => handleProductTempValueChange(orderId, productId, field, e.target.value)}
            onBlur={() => saveProductInlineEdit(orderId, productId, field, tempValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveProductInlineEdit(orderId, productId, field, tempValue)
              } else if (e.key === 'Escape') {
                cancelProductInlineEdit(orderId, productId, field)
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
        onClick={() => handleProductInlineEdit(orderId, productId, field, currentValue ? new Date(currentValue).toISOString().slice(0, 16) : '')}
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

  const renderProductInlineSelect = (orderId, productId, field, options, displayValue) => {
    const editKey = `${orderId}-${productId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleProductTempValueChange(orderId, productId, field, newValue)
              // Auto-save on select change
              saveProductInlineEdit(orderId, productId, field, newValue)
            }}
            onBlur={() => cancelProductInlineEdit(orderId, productId, field)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                cancelProductInlineEdit(orderId, productId, field)
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
        onClick={() => handleProductInlineEdit(orderId, productId, field, displayValue === '-' ? '' : displayValue)}
        title={user?.role === 'infograph' ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{field === 'statut' ? getStatusBadge(displayValue) : displayValue}</span>
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
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord des commandes</h1>
            <WebSocketStatus />
          </div>
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
          {sortedOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id)
            const orderProducts = order.orderProducts || []
            
            return (
              <div key={order.id} className="bg-white rounded-lg shadow-md border">
                {/* Parent Order Card */}
                <div 
                  className={`p-4 border transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(order)} ${isExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}
                  onClick={(e) => {
                    if (!e.target.closest('.inline-edit') && !e.target.closest('.action-button')) {
                      handleRowClick(order, e)
                    }
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Commande #{order.id}
                          </h3>
                          {orderProducts.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleOrderExpansion(order.id)
                              }}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-200 transition-colors duration-200"
                            >
                              <svg 
                                className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {visibleColumns.parent.statut && (
                          <div className="inline-edit">
                            {renderInlineStatus(order)}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        {visibleColumns.parent.client_info && (
                          <div>
                            <span className="font-medium">Client:</span> {order.clientInfo?.nom || order.client}
                            {order.clientInfo?.code_client && (
                              <span className="ml-2 text-xs text-gray-500">({order.clientInfo.code_client})</span>
                            )}
                          </div>
                        )}
                        {visibleColumns.parent.numero_affaire && order.numero_affaire && (
                          <div>
                            <span className="font-medium">Numéro d'affaire:</span> 
                            <span className="ml-2 inline-edit">
                              {renderInlineText(order, 'numero_affaire', order.numero_affaire)}
                            </span>
                          </div>
                        )}
                        {visibleColumns.parent.numero_dm && order.numero_dm && (
                          <div>
                            <span className="font-medium">Numéro DM:</span> 
                            <span className="ml-2 inline-edit">
                              {renderInlineText(order, 'numero_dm', order.numero_dm)}
                            </span>
                          </div>
                        )}
                        {visibleColumns.parent.commercial_en_charge && (
                          <p><span className="font-medium">Commercial:</span> {order.commercial_en_charge}</p>
                        )}
                        {visibleColumns.parent.date_limite_livraison_attendue && (
                          <div>
                            <span className="font-medium">Délai souhaité:</span> 
                            <span className="ml-2 inline-edit">
                              {renderInlineDate(order, 'date_limite_livraison_attendue')}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Produits:</span> {orderProducts.length} produit(s)
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                    <div className="action-button flex gap-2 w-full">
                      {canEditOrders() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditOrder(order)
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteOrder(order.id)
                          }}
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

                {/* Child Product Cards */}
                {isExpanded && orderProducts.length > 0 && (
                  <div className="border-t border-gray-200">
                    {orderProducts.map((product, productIndex) => (
                      <div key={`${order.id}-${product.id}`} className="p-4 bg-gray-50 border-b border-gray-200 last:border-b-0 last:rounded-b-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <h4 className="font-medium text-gray-900">
                            {product.Product?.name || 'Produit supprimé'}
                          </h4>
                          <span className="text-sm text-gray-500">
                            (Qté: {product.quantity || 'N/A'})
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {visibleColumns.child.numero_pms && (
                            <div>
                              <span className="font-medium text-gray-700">Numéro PMS:</span>
                              <span className="ml-2 inline-edit">
                                {renderProductInlineText(order.id, product.id, 'numero_pms', product.numero_pms || '-')}
                              </span>
                            </div>
                          )}
                          
                          {visibleColumns.child.infograph_en_charge && (
                            <div>
                              <span className="font-medium text-gray-700">Infographe:</span>
                              <span className="ml-2 inline-edit">
                                {renderProductInlineText(order.id, product.id, 'infograph_en_charge', product.infograph_en_charge || '-')}
                              </span>
                            </div>
                          )}
                          
                          {visibleColumns.child.etape && (
                            <div>
                              <span className="font-medium text-gray-700">Étape:</span>
                              <span className="ml-2 inline-edit">
                                {renderProductInlineSelect(order.id, product.id, 'etape', etapeOptions, product.etape || '-')}
                              </span>
                            </div>
                          )}
                          
                          {visibleColumns.child.atelier_concerne && (
                            <div>
                              <span className="font-medium text-gray-700">Atelier:</span>
                              <span className="ml-2 inline-edit">
                                {renderProductInlineSelect(order.id, product.id, 'atelier_concerne', atelierOptions, product.atelier_concerne || '-')}
                              </span>
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium text-gray-700">Statut produit:</span>
                            <span className="ml-2 inline-edit">
                              {renderProductInlineSelect(order.id, product.id, 'statut', statusOptions, product.statut || 'en_attente')}
                            </span>
                          </div>
                          
                          {visibleColumns.child.date_limite_livraison_estimee && (
                            <div>
                              <span className="font-medium text-gray-700">Livraison estimée:</span>
                              <span className="ml-2 inline-edit">
                                {renderProductInlineDate(order.id, product.id, 'date_limite_livraison_estimee', product.date_limite_livraison_estimee)}
                              </span>
                            </div>
                          )}
                          
                          {visibleColumns.child.estimated_work_time_minutes && product.estimated_work_time_minutes && (
                            <div>
                              <span className="font-medium text-gray-700">Temps estimé:</span>
                              <span className="ml-2 text-gray-900">
                                {Math.round(product.estimated_work_time_minutes / 60 * 10) / 10}h
                              </span>
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-2">
                            {visibleColumns.child.bat && (
                              <span className={`px-2 py-1 rounded-full text-xs ${product.bat === 'avec' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                BAT: {product.bat || 'Non défini'}
                              </span>
                            )}
                            {visibleColumns.child.express && (
                              <span className={`px-2 py-1 rounded-full text-xs ${product.express === 'oui' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                                Express: {product.express || 'Non'}
                              </span>
                            )}
                          </div>
                          
                          {visibleColumns.child.commentaires && product.commentaires && (
                            <div>
                              <span className="font-medium text-gray-700">Commentaires:</span>
                              <p className="ml-2 text-gray-900 text-sm bg-white p-2 rounded border">{product.commentaires}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          
          {sortedOrders.length === 0 && (
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
                  {visibleColumns.numero_affaire && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numéro d'affaire
                    </th>
                  )}
                  {visibleColumns.numero_dm && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numéro DM
                    </th>
                  )}
                  {visibleColumns.numero_pms && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numéro PMS
                    </th>
                  )}
                  {visibleColumns.client_info && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                  )}
                  {visibleColumns.commercial_en_charge && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commercial
                    </th>
                  )}
                  {visibleColumns.product_name && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                  )}
                  {visibleColumns.quantity && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                  )}
                  {visibleColumns.date_limite_livraison_attendue && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Délai souhaité
                    </th>
                  )}
                  {visibleColumns.date_limite_livraison_estimee && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livraison estimée
                    </th>
                  )}
                  {visibleColumns.statut && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
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
                  {visibleColumns.infograph_en_charge && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Infographe
                    </th>
                  )}
                  {visibleColumns.estimated_work_time_minutes && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temps estimé
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
                  {visibleColumns.commentaires && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commentaires
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
                {sortedOrders.map((orderProductRow) => (
                  <tr 
                    key={`${orderProductRow.orderId}-${orderProductRow.orderProductId}`}
                    className={`transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(orderProductRow)}`}
                    onClick={(e) => handleRowClick(orderProductRow, e)}
                  >
                    {visibleColumns.numero_affaire && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineText(orderProductRow, 'numero_affaire', orderProductRow.numero_affaire || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.numero_dm && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineText(orderProductRow, 'numero_dm', orderProductRow.numero_dm || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.numero_pms && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineText(orderProductRow, 'numero_pms', orderProductRow.numero_pms || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.client_info && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{orderProductRow.client_info?.nom || orderProductRow.client_info || 'N/A'}</div>
                          {orderProductRow.client_info?.code_client && (
                            <div className="text-xs text-gray-500">{orderProductRow.client_info.code_client}</div>
                          )}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.commercial_en_charge && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {orderProductRow.commercial_en_charge || '-'}
                      </td>
                    )}
                    
                    {visibleColumns.product_name && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{orderProductRow.product_name}</div>
                      </td>
                    )}
                    
                    {visibleColumns.quantity && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {orderProductRow.quantity || '-'}
                      </td>
                    )}
                    
                    {visibleColumns.date_limite_livraison_attendue && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderInlineDate(orderProductRow, 'date_limite_livraison_attendue')}
                      </td>
                    )}
                    
                    {visibleColumns.date_limite_livraison_estimee && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderInlineDate(orderProductRow, 'date_limite_livraison_estimee')}
                      </td>
                    )}
                    
                    {visibleColumns.statut && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-edit">
                          {renderInlineStatus(orderProductRow)}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.etape && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineSelect(orderProductRow, 'etape', etapeOptions, orderProductRow.etape || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.atelier_concerne && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineSelect(orderProductRow, 'atelier_concerne', atelierOptions, orderProductRow.atelier_concerne || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.infograph_en_charge && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineText(orderProductRow, 'infograph_en_charge', orderProductRow.infograph_en_charge || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.estimated_work_time_minutes && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineNumber(orderProductRow, 'estimated_work_time_minutes', 
                            orderProductRow.estimated_work_time_minutes ? 
                              Math.round(orderProductRow.estimated_work_time_minutes / 60 * 10) / 10 : 
                              '-', 'h')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.bat && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineSelect(orderProductRow, 'bat', batOptions, orderProductRow.bat || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.express && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="inline-edit">
                          {renderInlineSelect(orderProductRow, 'express', expressOptions, orderProductRow.express || '-')}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.commentaires && (
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="inline-edit">
                          {renderInlineText(orderProductRow, 'commentaires', orderProductRow.commentaires || '-')}
                        </div>
                      </td>
                    )}
                    
                    {(canEditOrders() || canDeleteOrders()) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <div className="action-button">
                          {canEditOrders() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditOrder(orderProductRow)
                              }}
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Modifier
                            </button>
                          )}
                          {canDeleteOrders() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteOrder(orderProductRow.orderId)
                              }}
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