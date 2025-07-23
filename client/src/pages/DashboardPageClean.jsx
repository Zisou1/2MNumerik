import React, { useState, useEffect, useMemo } from 'react'
import { orderAPI } from '../utils/api'
import Button from '../components/ButtonComponent'
import Input from '../components/InputComponent'
import AlertDialog from '../components/AlertDialog'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { usePriorityNotifications } from '../hooks/usePriorityNotifications'
import OrderModal from '../components/OrderModal'
import OrderViewModal from '../components/OrderViewModal'
import WebSocketStatus from '../components/WebSocketStatus'

const DashboardPageClean = () => {
  const { user } = useAuth()
  const { subscribe, connected } = useWebSocket()
  
  // State management
  const [orderProductRows, setOrderProductRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({})
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  
  // Filters
  const [filters, setFilters] = useState({
    statut: '',
    commercial: '',
    client: '',
    atelier: '',
    infograph: '',
    etape: '',
    timeFilter: 'all'
  })
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  })
  
  // Inline editing
  const [inlineEditing, setInlineEditing] = useState({})
  const [tempValues, setTempValues] = useState({})
  
  // Time-based refresh
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Options arrays
  const statusOptions = [
    { value: 'en_attente', label: 'En attente' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'termine', label: 'Terminé' },
    { value: 'livre', label: 'Livré' },
    { value: 'annule', label: 'Annulé' }
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

  // Priority notifications
  const { checkUrgentOrders } = usePriorityNotifications(orderProductRows)

  // Role-based permissions
  const canCreateOrders = () => user && (user.role === 'admin' || user.role === 'commercial')
  const canEditOrders = () => user && (user.role === 'admin' || user.role === 'commercial')
  const canDeleteOrders = () => user && user.role === 'admin'

  // Get visible columns based on user role
  const getVisibleColumns = () => {
    if (user?.role === 'commercial') {
      return {
        numero_affaire: true,
        numero_dm: true,
        client_info: true,
        commercial_en_charge: true,
        product_name: true,
        quantity: true,
        numero_pms: false,
        date_limite_livraison_attendue: true,
        statut: true,
        etape: false,
        atelier_concerne: false,
        infograph_en_charge: false,
        date_limite_livraison_estimee: false,
        estimated_work_time_minutes: false,
        bat: false,
        express: false,
        commentaires: true
      }
    } else if (user?.role === 'infograph') {
      return {
        numero_affaire: false,
        numero_dm: false,
        client_info: true,
        commercial_en_charge: false,
        product_name: true,
        quantity: true,
        numero_pms: true,
        date_limite_livraison_attendue: false,
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
    } else {
      // Admin and other roles see everything
      return {
        numero_affaire: true,
        numero_dm: true,
        client_info: true,
        commercial_en_charge: true,
        product_name: true,
        quantity: true,
        numero_pms: true,
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
  }

  const visibleColumns = getVisibleColumns()

  // Fetch orders and flatten to order-product rows
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true)
      const params = { page, limit: 10, ...filters }
      Object.keys(params).forEach(key => params[key] === '' && delete params[key])
      
      const response = await orderAPI.getOrders(params)
      
      // Debug: Log the first order to see the data structure
      if (response.orders && response.orders.length > 0) {
        console.log('First order data:', JSON.stringify(response.orders[0], null, 2))
        if (response.orders[0].orderProducts && response.orders[0].orderProducts.length > 0) {
          console.log('First orderProduct data:', JSON.stringify(response.orders[0].orderProducts[0], null, 2))
        }
      }
      
      // Flatten orders to order-product rows first, then filter by product status
      const flatRows = []
      response.orders.forEach(order => {
        if (order.orderProducts && order.orderProducts.length > 0) {
          order.orderProducts.forEach(orderProduct => {
            // Get the actual product status (prioritize product status over order status)
            const productStatus = orderProduct.statut || order.statut
            
            // Filter out cancelled and delivered products (not orders)
            if (productStatus !== 'annule' && productStatus !== 'livre') {
              flatRows.push({
                // Unique identifier for this row
                orderProductId: orderProduct.id,
                
                // Order-level fields
                orderId: order.id,
                numero_affaire: order.numero_affaire,
                numero_dm: order.numero_dm,
                client_info: order.clientInfo?.nom || order.client,
                commercial_en_charge: order.commercial_en_charge,
                date_limite_livraison_attendue: order.date_limite_livraison_attendue,
                
                // Product-level fields
                product_id: orderProduct.product_id,
                product_name: orderProduct.product?.name || orderProduct.productInfo?.name || 'Produit',
                quantity: orderProduct.quantity,
                numero_pms: orderProduct.numero_pms,
                statut: productStatus,
                etape: orderProduct.etape,
                atelier_concerne: orderProduct.atelier_concerne,
                infograph_en_charge: orderProduct.infograph_en_charge,
                date_limite_livraison_estimee: orderProduct.date_limite_livraison_estimee,
                estimated_work_time_minutes: orderProduct.estimated_work_time_minutes,
                bat: orderProduct.bat,
                express: orderProduct.express,
                commentaires: orderProduct.commentaires,
                finitions: orderProduct.finitions || [], // Add finitions field
                
                // Derived fields for compatibility
                clientInfo: order.clientInfo || { nom: order.client },
                
                // Timestamp fields
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
              })
            }
          })
        }
      })
      
      setOrderProductRows(flatRows)
      setPagination({
        currentPage: response.pagination?.currentPage || 1,
        totalPages: response.pagination?.totalPages || 1,
        totalOrders: response.pagination?.totalOrders || flatRows.length
      })
    } catch (err) {
      setError('Erreur lors du chargement des commandes')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await orderAPI.getOrderStats()
      setStats(response.stats)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  // Calculate urgency for sorting and coloring
  const getOrderUrgency = (orderProductRow) => {
    const { statut, date_limite_livraison_estimee, estimated_work_time_minutes } = orderProductRow
    
    // If status is finished, least urgent (5)
    if (statut === 'termine' || statut === 'livre') {
      return 5
    }
    
    // If no deadline date, medium urgency (3)
    if (!date_limite_livraison_estimee) {
      return 3
    }
    
    const now = currentTime
    const deadline = new Date(date_limite_livraison_estimee)
    
    // Calculate work time in milliseconds (default to 2 hours if not specified)
    const workTimeMs = estimated_work_time_minutes ? estimated_work_time_minutes * 60 * 1000 : 2 * 60 * 60 * 1000
    
    // Calculate the latest start time (deadline - work time needed)
    const latestStartTime = new Date(deadline.getTime() - workTimeMs)
    
    // Calculate time until we must start working
    const timeUntilMustStart = latestStartTime - now
    
    // Determine urgency level
    if (timeUntilMustStart < 0) {
      return 0 // Most urgent - past the time we should have started (RED)
    } else if (timeUntilMustStart <= 30 * 60 * 1000) {
      return 1 // Very urgent - 30 minutes or less before must start (ORANGE)
    } else if (timeUntilMustStart <= 60 * 60 * 1000) {
      return 2 // Urgent - 1 hour or less before must start (YELLOW)
    } else {
      return 4 // Normal - enough time available (GRAY)
    }
  }

  // Sort orders by urgency and deadline
  const sortedOrderProductRows = useMemo(() => {
    const sorted = [...orderProductRows].sort((a, b) => {
      const urgencyA = getOrderUrgency(a)
      const urgencyB = getOrderUrgency(b)
      
      if (urgencyA !== urgencyB) {
        return urgencyA - urgencyB // Lower urgency number = higher priority
      }
      
      // If same urgency, sort by deadline
      const deadlineA = a.date_limite_livraison_estimee ? new Date(a.date_limite_livraison_estimee) : new Date('2099-12-31')
      const deadlineB = b.date_limite_livraison_estimee ? new Date(b.date_limite_livraison_estimee) : new Date('2099-12-31')
      
      return deadlineA - deadlineB
    })
    
    return sorted
  }, [orderProductRows, currentTime])

  // Get row background color based on urgency
  const getRowBackgroundClass = (orderProductRow) => {
    const urgency = getOrderUrgency(orderProductRow)
    
    switch (urgency) {
      case 0: return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-500' // Overdue
      case 1: return 'bg-orange-200 hover:bg-orange-300 border-l-4 border-orange-500' // Very urgent
      case 2: return 'bg-yellow-200 hover:bg-yellow-300 border-l-4 border-yellow-500' // Urgent
      case 3: return 'bg-gray-50 hover:bg-gray-100' // Medium urgency - no deadline set
      case 4: return 'bg-gray-50 hover:bg-gray-100' // Normal - enough time
      case 5:
      default: return 'bg-gray-50 hover:bg-gray-100' // Least urgent or default
    }
  }

  // Status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      'en_attente': { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      'en_cours': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      'termine': { label: 'Terminé', color: 'bg-purple-100 text-purple-800' },
      'livre': { label: 'Livré', color: 'bg-green-100 text-green-800' },
      'annule': { label: 'Annulé', color: 'bg-red-100 text-red-800' }
    }
    
    const config = statusConfig[status] || { label: status || 'Inconnu', color: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  // Date formatting
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Helper function to check if a field is editable
  const isFieldEditable = (field) => {
    const editableFields = {
      admin: 'all', // Admin can edit everything
      commercial: 'all', // Commercial can edit everything
      infograph: [
        'quantity', 'numero_pms', 'statut', 'etape', 'atelier_concerne', 
        'infograph_en_charge', 'date_limite_livraison_estimee', 
        'estimated_work_time_minutes', 'bat', 'express', 'commentaires'
      ], // Infograph can edit product-level fields
      atelier: ['statut', 'etape', 'atelier_concerne', 'commentaires'] // Atelier can edit limited fields
    }
    
    const userRole = user?.role || 'guest'
    const allowedFields = editableFields[userRole] || []
    
    return allowedFields === 'all' || allowedFields.includes(field)
  }

  // Inline editing functions
  const handleInlineEdit = (orderProductId, field, currentValue) => {
    // Check if user can edit this field
    if (!isFieldEditable(field)) {
      return // Not allowed to edit this field
    }
    
    const editKey = `${orderProductId}-${field}`
    setInlineEditing({ [editKey]: true })
    setTempValues({ [editKey]: currentValue })
  }

  const cancelInlineEdit = (orderProductId, field) => {
    const editKey = `${orderProductId}-${field}`
    setInlineEditing({ ...inlineEditing, [editKey]: false })
    setTempValues({ ...tempValues, [editKey]: null })
  }

  const handleTempValueChange = (orderProductId, field, value) => {
    setTempValues({ ...tempValues, [`${orderProductId}-${field}`]: value })
  }

  const saveInlineEdit = async (orderProductId, field, newValue) => {
    try {
      let valueToSend = newValue
      if (field === 'date_limite_livraison_estimee' && newValue) {
        valueToSend = new Date(newValue).toISOString()
      }

      // Find the order product row to get orderId and productId
      const orderProductRow = orderProductRows.find(row => row.orderProductId === orderProductId)
      if (!orderProductRow) return

      // Check if it's an order-level field or product-level field
      const orderLevelFields = ['numero_affaire', 'numero_dm', 'commercial_en_charge', 'date_limite_livraison_attendue']
      
      if (orderLevelFields.includes(field)) {
        await orderAPI.updateOrder(orderProductRow.orderId, { [field]: valueToSend })
      } else {
        // Use the actual product_id, not the orderProduct.id
        await orderAPI.updateOrderProduct(orderProductRow.orderId, orderProductRow.product_id, { [field]: valueToSend })
      }

      // Update local state
      if (field === 'statut' && (newValue === 'annule' || newValue === 'livre')) {
        setOrderProductRows(orderProductRows.filter(row => row.orderProductId !== orderProductId))
      } else {
        setOrderProductRows(orderProductRows.map(row => 
          row.orderProductId === orderProductId ? { ...row, [field]: valueToSend } : row
        ))
      }

      // Update selectedOrder if modal is open and it's the same order
      if (selectedOrder && showViewModal && orderProductRow.orderId === selectedOrder.id) {
        const updatedSelectedOrder = { ...selectedOrder }
        
        // Update order-level fields
        if (orderLevelFields.includes(field)) {
          updatedSelectedOrder[field] = valueToSend
        } else {
          // Update product-level fields in the first orderProduct (since we're showing single product details)
          if (updatedSelectedOrder.orderProducts && updatedSelectedOrder.orderProducts.length > 0) {
            updatedSelectedOrder.orderProducts[0] = {
              ...updatedSelectedOrder.orderProducts[0],
              [field]: valueToSend
            }
          }
          // Also update the order-level etape field for the ProgressStepper
          if (field === 'etape') {
            updatedSelectedOrder.etape = valueToSend
          }
        }
        
        setSelectedOrder(updatedSelectedOrder)
      }

      // Clear editing state
      const editKey = `${orderProductId}-${field}`
      setInlineEditing({ ...inlineEditing, [editKey]: false })
      setTempValues({ ...tempValues, [editKey]: null })

      // Refresh stats if status changed
      if (field === 'statut') {
        fetchStats()
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour')
      cancelInlineEdit(orderProductId, field)
    }
  }

  // Render inline editing components
  const renderInlineText = (orderProductRow, field, displayValue) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
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
            className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
            autoFocus
          />
        </div>
      )
    }

    const fieldEditable = isFieldEditable(field)

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field] || '')}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}</span>
          {fieldEditable && (
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
        <div className="inline-edit">
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

    const fieldEditable = isFieldEditable(field)

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field] || '')}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}{unit}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineDate = (orderProductRow, field) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
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

    const fieldEditable = isFieldEditable(field)

    // Helper function to format date for datetime-local input
    const formatDateTimeLocal = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      // Format as YYYY-MM-DDTHH:MM (required format for datetime-local)
      return date.toISOString().slice(0, 16)
    }

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, formatDateTimeLocal(orderProductRow[field]))}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{formatDate(orderProductRow[field])}</span>
          {fieldEditable && (
            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  const renderInlineSelect = (orderProductRow, field, options) => {
    const editKey = `${orderProductRow.orderProductId}-${field}`
    const isEditing = inlineEditing[editKey]
    const tempValue = tempValues[editKey]

    if (isEditing) {
      return (
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, field, newValue)
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

    const fieldEditable = isFieldEditable(field)

    return (
      <div 
        className={`${!fieldEditable ? 'px-2 py-1' : 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors duration-200 group'} inline-edit`}
        onClick={() => handleInlineEdit(orderProductRow.orderProductId, field, orderProductRow[field])}
        title={!fieldEditable ? "Lecture seule" : "Cliquer pour modifier"}
      >
        <div className="flex items-center justify-between">
          <span>{orderProductRow[field] || '-'}</span>
          {fieldEditable && (
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
        <div className="inline-edit">
          <select
            value={tempValue || ''}
            onChange={(e) => {
              const newValue = e.target.value
              handleTempValueChange(orderProductRow.orderProductId, 'statut', newValue)
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

  // Handle row click to open modal
  const handleRowClick = (orderProductRow, event) => {
    if (event.target.closest('.inline-edit') || event.target.closest('.action-button')) {
      return
    }
    
    // Debug: Log the orderProductRow data
    console.log('OrderProductRow data:', JSON.stringify(orderProductRow, null, 2))
    
    // Create a mock order object for the modal
    const mockOrder = {
      id: orderProductRow.orderId,
      numero_affaire: orderProductRow.numero_affaire,
      numero_dm: orderProductRow.numero_dm,
      numero_pms: orderProductRow.numero_pms,
      client: orderProductRow.client_info,
      clientInfo: orderProductRow.clientInfo,
      commercial_en_charge: orderProductRow.commercial_en_charge,
      date_limite_livraison_attendue: orderProductRow.date_limite_livraison_attendue,
      statut: orderProductRow.statut,
      etape: orderProductRow.etape,
      createdAt: orderProductRow.createdAt,
      updatedAt: orderProductRow.updatedAt,
      orderProducts: [{
        id: orderProductRow.orderProductId,
        product_id: orderProductRow.product_id,
        productInfo: { name: orderProductRow.product_name },
        product: { name: orderProductRow.product_name },
        quantity: orderProductRow.quantity,
        numero_pms: orderProductRow.numero_pms,
        statut: orderProductRow.statut,
        etape: orderProductRow.etape,
        atelier_concerne: orderProductRow.atelier_concerne,
        infograph_en_charge: orderProductRow.infograph_en_charge,
        date_limite_livraison_estimee: orderProductRow.date_limite_livraison_estimee,
        estimated_work_time_minutes: orderProductRow.estimated_work_time_minutes,
        bat: orderProductRow.bat,
        express: orderProductRow.express,
        commentaires: orderProductRow.commentaires,
        finitions: orderProductRow.finitions || []
      }]
    }
    
    setSelectedOrder(mockOrder)
    setShowViewModal(true)
  }

  // CRUD operations
  const handleCreateOrder = () => {
    setSelectedOrder(null)
    setShowCreateModal(true)
  }

  const handleEditOrder = (orderProductRow) => {
    const mockOrder = {
      id: orderProductRow.orderId,
      numero_affaire: orderProductRow.numero_affaire,
      numero_dm: orderProductRow.numero_dm,
      client: orderProductRow.client_info,
      clientInfo: orderProductRow.clientInfo,
      commercial_en_charge: orderProductRow.commercial_en_charge,
      date_limite_livraison_attendue: orderProductRow.date_limite_livraison_attendue,
      statut: orderProductRow.statut,
      etape: orderProductRow.etape,
      createdAt: orderProductRow.createdAt,
      updatedAt: orderProductRow.updatedAt
    }
    setSelectedOrder(mockOrder)
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

  // Effects
  useEffect(() => {
    fetchOrders()
    fetchStats()
  }, [filters])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // WebSocket listeners
  useEffect(() => {
    if (!connected) return

    const unsubscribeOrderCreated = subscribe('orderCreated', (newOrder) => {
      console.log('Real-time: Order created', newOrder)
      if (newOrder.statut !== 'annule' && newOrder.statut !== 'livre') {
        fetchOrders(pagination.currentPage)
        fetchStats()
      }
    })

    const unsubscribeOrderUpdated = subscribe('orderUpdated', (updatedOrder) => {
      console.log('Real-time: Order updated', updatedOrder)
      fetchOrders(pagination.currentPage)
      fetchStats()
    })

    const unsubscribeOrderDeleted = subscribe('orderDeleted', (deletedOrderData) => {
      console.log('Real-time: Order deleted', deletedOrderData)
      fetchOrders(pagination.currentPage)
      fetchStats()
    })

    return () => {
      unsubscribeOrderCreated()
      unsubscribeOrderUpdated()
      unsubscribeOrderDeleted()
    }
  }, [connected, subscribe, pagination.currentPage])

  if (loading && orderProductRows.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des commandes...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <WebSocketStatus />
          </div>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total actives</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">{stats.en_attente || 0}</div>
            <div className="text-sm text-gray-600">En attente</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.en_cours || 0}</div>
            <div className="text-sm text-gray-600">En cours</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">
              {sortedOrderProductRows.filter(row => getOrderUrgency(row) === 0).length}
            </div>
            <div className="text-sm text-gray-600">En retard</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les statuts</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            {/* Workshop Filter */}
            <select
              value={filters.atelier}
              onChange={(e) => setFilters({ ...filters, atelier: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les ateliers</option>
              {atelierOptions.map(atelier => (
                <option key={atelier} value={atelier}>
                  {atelier}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {Object.values(filters).some(v => v !== '' && v !== 'all') && (
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

      {/* Urgency Legend */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Légende des urgences:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 border-l-2 border-red-500 rounded"></div>
            <span className="text-gray-700">En retard</span>
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
            <div className="w-4 h-4 bg-white border-l-2 border-gray-300 rounded"></div>
            <span className="text-gray-700">Temps suffisant disponible</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.numero_affaire && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° Affaire
                  </th>
                )}
                {visibleColumns.numero_dm && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° DM
                  </th>
                )}
                {visibleColumns.client_info && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
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
                {visibleColumns.numero_pms && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° PMS
                  </th>
                )}
                {visibleColumns.commercial_en_charge && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commercial
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
                {visibleColumns.date_limite_livraison_estimee && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                )}
                {visibleColumns.estimated_work_time_minutes && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temps (min)
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
              {sortedOrderProductRows.map((row) => (
                <tr 
                  key={`${row.orderId}-${row.orderProductId}`}
                  className={`transition-colors duration-200 cursor-pointer ${getRowBackgroundClass(row)}`}
                  onClick={(e) => handleRowClick(row, e)}
                >
                  {visibleColumns.numero_affaire && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineText(row, 'numero_affaire', row.numero_affaire)}
                    </td>
                  )}
                  {visibleColumns.numero_dm && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineText(row, 'numero_dm', row.numero_dm)}
                    </td>
                  )}
                  {visibleColumns.client_info && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.client_info}
                    </td>
                  )}
                  {visibleColumns.product_name && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.product_name}
                    </td>
                  )}
                  {visibleColumns.quantity && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineNumber(row, 'quantity', row.quantity)}
                    </td>
                  )}
                  {visibleColumns.numero_pms && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineText(row, 'numero_pms', row.numero_pms)}
                    </td>
                  )}
                  {visibleColumns.commercial_en_charge && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.commercial_en_charge}
                    </td>
                  )}
                  {visibleColumns.statut && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineStatus(row)}
                    </td>
                  )}
                  {visibleColumns.etape && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineSelect(row, 'etape', etapeOptions)}
                    </td>
                  )}
                  {visibleColumns.atelier_concerne && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineSelect(row, 'atelier_concerne', atelierOptions)}
                    </td>
                  )}
                  {visibleColumns.infograph_en_charge && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineText(row, 'infograph_en_charge', row.infograph_en_charge)}
                    </td>
                  )}
                  {visibleColumns.date_limite_livraison_estimee && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineDate(row, 'date_limite_livraison_estimee')}
                    </td>
                  )}
                  {visibleColumns.estimated_work_time_minutes && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineNumber(row, 'estimated_work_time_minutes', row.estimated_work_time_minutes, ' min')}
                    </td>
                  )}
                  {visibleColumns.bat && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineSelect(row, 'bat', batOptions)}
                    </td>
                  )}
                  {visibleColumns.express && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderInlineSelect(row, 'express', expressOptions)}
                    </td>
                  )}
                  {(canEditOrders() || canDeleteOrders()) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2 action-button">
                        {canEditOrders() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditOrder(row)
                            }}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-2 py-1 rounded text-xs"
                          >
                            Modifier
                          </button>
                        )}
                        {canDeleteOrders() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteOrder(row.orderId)
                            }}
                            className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                          >
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
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchOrders(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => fetchOrders(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
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
                  <span className="font-medium">{pagination.totalOrders}</span> éléments
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

      {/* Modals */}
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

      <AlertDialog
        isOpen={showDeleteDialog}
        onClose={cancelDeleteOrder}
        onConfirm={confirmDeleteOrder}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  )
}

export default DashboardPageClean
