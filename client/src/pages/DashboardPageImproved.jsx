import React, { useState, useEffect } from 'react'
import { orderAPI } from '../utils/api'
import Button from '../components/ButtonComponent'

const DashboardPageImproved = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('board') // 'board', 'table', 'calendar'
  const [selectedWorkshop, setSelectedWorkshop] = useState('all')
  const [quickStats, setQuickStats] = useState({})

  // Production stages for kanban board
  const stages = [
    { key: 'conception', label: 'Conception', color: 'bg-blue-100 border-blue-300' },
    { key: 'pré-presse', label: 'Pré-presse', color: 'bg-yellow-100 border-yellow-300' },
    { key: 'impression', label: 'Impression', color: 'bg-orange-100 border-orange-300' },
    { key: 'finition', label: 'Finition', color: 'bg-purple-100 border-purple-300' },
    { key: 'découpe', label: 'Découpe', color: 'bg-green-100 border-green-300' }
  ]

  const workshopOptions = [
    { value: 'all', label: 'Tous les ateliers' },
    { value: 'petit format', label: 'Petit Format' },
    { value: 'grand format', label: 'Grand Format' },
    { value: 'sous-traitance', label: 'Sous-traitance' }
  ]

  useEffect(() => {
    fetchOrders()
    fetchQuickStats()
  }, [selectedWorkshop])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = selectedWorkshop !== 'all' ? { atelier: selectedWorkshop } : {}
      const response = await orderAPI.getOrders(params)
      setOrders(response.orders || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuickStats = async () => {
    try {
      const response = await orderAPI.getOrderStats()
      setQuickStats(response.stats || {})
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const updateOrderStage = async (orderId, newStage) => {
    try {
      await orderAPI.updateOrder(orderId, { etape: newStage })
      fetchOrders() // Refresh data
    } catch (err) {
      console.error('Error updating order stage:', err)
    }
  }

  const getOrdersByStage = (stage) => {
    return orders.filter(order => order.etape === stage)
  }

  const getUrgencyLevel = (order) => {
    if (!order.date_limite_livraison_estimee) return 'normal'
    
    const now = new Date()
    const deadline = new Date(order.date_limite_livraison_estimee)
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60)
    
    if (hoursUntilDeadline < 0) return 'overdue'
    if (hoursUntilDeadline <= 24) return 'urgent'
    if (hoursUntilDeadline <= 72) return 'warning'
    return 'normal'
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'overdue': return 'border-l-4 border-red-500 bg-red-50'
      case 'urgent': return 'border-l-4 border-orange-500 bg-orange-50'
      case 'warning': return 'border-l-4 border-yellow-500 bg-yellow-50'
      default: return 'border-l-4 border-gray-300 bg-white'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const OrderCard = ({ order, isDraggable = false }) => {
    const urgency = getUrgencyLevel(order)
    
    return (
      <div 
        className={`p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-all duration-200 ${getUrgencyColor(urgency)}`}
        draggable={isDraggable}
        onDragStart={(e) => {
          e.dataTransfer.setData('orderId', order.id.toString())
          e.dataTransfer.setData('currentStage', order.etape || '')
        }}
      >
        {/* Order Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">{order.numero_pms}</h3>
            <p className="text-sm text-gray-600">{order.client}</p>
          </div>
          <div className="flex flex-col items-end">
            {urgency === 'overdue' && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                EN RETARD
              </span>
            )}
            {urgency === 'urgent' && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                URGENT
              </span>
            )}
          </div>
        </div>

        {/* Products Summary */}
        <div className="mb-3">
          <div className="text-sm text-gray-700">
            {order.products && order.products.length > 0 ? (
              <div>
                <span className="font-medium">{order.products.length} produit(s)</span>
                <div className="text-xs text-gray-500 mt-1">
                  {order.products.slice(0, 2).map((product, idx) => (
                    <div key={idx}>
                      {product.name} (Qté: {product.orderProduct?.quantity || 'N/A'})
                    </div>
                  ))}
                  {order.products.length > 2 && (
                    <div className="text-gray-400">+{order.products.length - 2} autres...</div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-400">Aucun produit</span>
            )}
          </div>
        </div>

        {/* Key Info */}
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Commercial:</span>
            <span className="font-medium">{order.commercial_en_charge}</span>
          </div>
          {order.date_limite_livraison_estimee && (
            <div className="flex justify-between">
              <span>Livraison:</span>
              <span className="font-medium">{formatDate(order.date_limite_livraison_estimee)}</span>
            </div>
          )}
          {order.atelier_concerne && (
            <div className="flex justify-between">
              <span>Atelier:</span>
              <span className="font-medium">{order.atelier_concerne}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const KanbanBoard = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {stages.map(stage => {
        const stageOrders = getOrdersByStage(stage.key)
        
        return (
          <div key={stage.key} className="bg-gray-50 rounded-lg p-4">
            {/* Stage Header */}
            <div className={`${stage.color} border-2 rounded-lg p-3 mb-4`}>
              <h3 className="font-semibold text-gray-800">{stage.label}</h3>
              <p className="text-sm text-gray-600">{stageOrders.length} commande(s)</p>
            </div>

            {/* Drop Zone */}
            <div 
              className="min-h-[400px] space-y-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault()
                const orderId = e.dataTransfer.getData('orderId')
                const currentStage = e.dataTransfer.getData('currentStage')
                
                if (orderId && currentStage !== stage.key) {
                  await updateOrderStage(parseInt(orderId), stage.key)
                }
              }}
            >
              {stageOrders.map(order => (
                <OrderCard key={order.id} order={order} isDraggable={true} />
              ))}
              
              {stageOrders.length === 0 && (
                <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  Glissez une commande ici
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  const CompactTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Commande & Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Étape & Atelier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Commercial
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Livraison
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Urgence
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map(order => {
            const urgency = getUrgencyLevel(order)
            
            return (
              <tr key={order.id} className={`hover:bg-gray-50 ${getUrgencyColor(urgency)}`}>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">{order.numero_pms}</div>
                    <div className="text-sm text-gray-600">{order.client}</div>
                    {order.products && order.products.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {order.products.length} produit(s)
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {order.etape || 'Non défini'}
                    </span>
                    {order.atelier_concerne && (
                      <div className="text-sm text-gray-600 mt-1">{order.atelier_concerne}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {order.commercial_en_charge}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(order.date_limite_livraison_estimee)}
                </td>
                <td className="px-6 py-4">
                  {urgency === 'overdue' && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      EN RETARD
                    </span>
                  )}
                  {urgency === 'urgent' && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                      URGENT
                    </span>
                  )}
                  {urgency === 'warning' && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      ATTENTION
                    </span>
                  )}
                  {urgency === 'normal' && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 lg:mb-0">
          Dashboard Production
        </h1>
        
        <div className="flex flex-wrap gap-4">
          {/* Workshop Filter */}
          <select
            value={selectedWorkshop}
            onChange={(e) => setSelectedWorkshop(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {workshopOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'board' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'table' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tableau
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">{quickStats.total || 0}</div>
          <div className="text-sm text-gray-600">Total Commandes</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-orange-600">{quickStats.en_cours || 0}</div>
          <div className="text-sm text-gray-600">En Production</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">
            {orders.filter(o => getUrgencyLevel(o) === 'overdue').length}
          </div>
          <div className="text-sm text-gray-600">En Retard</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">
            {orders.filter(o => getUrgencyLevel(o) === 'urgent').length}
          </div>
          <div className="text-sm text-gray-600">Urgentes</div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'board' ? <KanbanBoard /> : <CompactTable />}
    </div>
  )
}

export default DashboardPageImproved
