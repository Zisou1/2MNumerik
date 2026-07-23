import { useState, useEffect } from 'react'
import AlertDialog from './AlertDialog'
import { stockAPI, supplierAPI } from '../utils/api'

function TransactionsManagement() {
  const [transactions, setTransactions] = useState([])
  const [items, setItems] = useState([])
  const [locations, setLocations] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [lots, setLots] = useState([]) // Available lots
  const [availableLots, setAvailableLots] = useState([]) // Filtered lots based on item/location
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [validateConfirm, setValidateConfirm] = useState(null)
  const [validatorName, setValidatorName] = useState('')
  const [stockErrorDialog, setStockErrorDialog] = useState(null)
  const [itemSearchText, setItemSearchText] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)

  // Pagination and filtering states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')

  // Form state
  const [formData, setFormData] = useState({
    item_id: '',
    from_location: '',
    to_location: '',
    quantity: '',
    type: '',
    created_by: '',
    lot_id: '', // LOT selection
    supplier_id: '' // Supplier selection for IN transactions
  })

  // Get transaction type labels
  const getTypeLabel = (type) => {
    const typeLabels = {
      'IN': 'Entrée',
      'OUT': 'Sortie',
      'TRANSFER': 'Transfert',
      'ADJUSTMENT': 'Ajustement'
    }
    return typeLabels[type] || type
  }

  // Get transaction type badge style
  const getTypeBadgeStyle = (type) => {
    const styles = {
      'IN': 'bg-green-100 text-green-800',
      'OUT': 'bg-red-100 text-red-800',
      'TRANSFER': 'bg-blue-100 text-blue-800',
      'ADJUSTMENT': 'bg-yellow-100 text-yellow-800'
    }
    return styles[type] || 'bg-gray-100 text-gray-800'
  }

  // Get status labels
  const getStatusLabel = (status) => {
    const statusLabels = {
      'draft': 'Brouillon',
      'validated': 'Validée',
      'cancelled': 'Annulée'
    }
    return statusLabels[status] || status
  }

  // Get status badge style
  const getStatusBadgeStyle = (status) => {
    const styles = {
      'draft': 'bg-gray-100 text-gray-800',
      'validated': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  // Get location type label
  const getLocationTypeLabel = (type) => {
    const typeLabels = {
      'main_depot': 'Dépôt Principal',
      'workshop': 'Atelier',
      'store': 'Magasin',
      'supplier': 'Fournisseur',
      'customer': 'Client'
    }
    return typeLabels[type] || type
  }

  // Fetch transactions from API
  const fetchTransactions = async (page = currentPage, search = searchTerm) => {
    try {
      setLoading(true)
      const params = {
        page: page.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(filterType && { type: filterType }),
        ...(filterStatus && { status: filterStatus })
      }
      
      const data = await stockAPI.getTransactions(params)
      setTransactions(data.transactions)
      setTotalTransactions(data.totalCount)
      setTotalPages(data.totalPages)
      setCurrentPage(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch items for dropdown
  const fetchItems = async () => {
    try {
      const data = await stockAPI.getItems({ limit: 1000 })
      setItems(data.items || [])
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  // Fetch locations for dropdown
  const fetchLocations = async () => {
    try {
      const data = await stockAPI.getLocations()
      setLocations(data.locations || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
    }
  }

  // Fetch suppliers for dropdown
  const fetchSuppliers = async () => {
    try {
      const data = await supplierAPI.getSuppliers()
      console.log('Suppliers fetched:', data)
      setSuppliers(data.suppliers || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
    }
  }

  // Fetch lots for dropdown
  const fetchLots = async () => {
    try {
      const data = await stockAPI.getLots({ status: 'active', limit: 1000 })
      setLots(data.lots || [])
    } catch (err) {
      console.error('Error fetching lots:', err)
    }
  }

  // Filter available lots based on item and location (for TRANSFER/OUT/ADJUSTMENT)
  useEffect(() => {
    if (formData.type === 'IN') {
      // For IN transactions, we don't need to select existing lots (they will be created)
      setAvailableLots([])
      return
    }

    if (!formData.item_id) {
      setAvailableLots([])
      return
    }

    // For OUT/TRANSFER/ADJUSTMENT, filter lots by item and sort chronologically (oldest first - FIFO)
    let filtered = lots
      .filter(lot => lot.item_id === parseInt(formData.item_id))
      .sort((a, b) => {
        const dateA = new Date(a.received_date || a.created_at || 0);
        const dateB = new Date(b.received_date || b.created_at || 0);
        return dateA - dateB;
      });

    // Determine location to fetch lot availability from
    const selectedLocation = (formData.type === 'TRANSFER' || formData.type === 'OUT')
      ? formData.from_location
      : (formData.from_location || formData.to_location);

    if (selectedLocation) {
      fetchLotsAtLocation(selectedLocation, filtered)
    } else {
      setAvailableLots(filtered)
    }
  }, [formData.item_id, formData.from_location, formData.to_location, formData.type, lots])

  // Pre-select the oldest lot (first in FIFO list) as default for new OUT/TRANSFER/ADJUSTMENT transactions
  useEffect(() => {
    if (modalMode === 'create' && formData.type !== 'IN' && availableLots.length > 0) {
      const hasValidSelection = availableLots.some(lot => lot.id.toString() === formData.lot_id.toString());
      if (!hasValidSelection) {
        setFormData(prev => ({
          ...prev,
          lot_id: availableLots[0].id.toString()
        }));
      }
    }
  }, [availableLots, modalMode, formData.type]);

  // Fetch lots available at a specific location
  const fetchLotsAtLocation = async (locationId, itemLots) => {
    try {
      const data = await stockAPI.getLocation(locationId)
      
      // Get lotLocations from the direct response (not nested under location)
      const lotLocations = data.lotLocations || []
      
      // Map current location quantity and reserved quantity to each lot
      const mappedLots = itemLots.map(lot => {
        const match = lotLocations.find(ll => ll.lot_id === lot.id);
        return {
          ...lot,
          locationQty: match ? match.quantity : 0,
          locationReservedQty: match ? match.reserved_quantity : 0
        };
      });

      // For TRANSFER and OUT, only display lots that have a quantity > 0 at the source location
      if (formData.type === 'TRANSFER' || formData.type === 'OUT') {
        const filtered = mappedLots.filter(lot => lot.locationQty > 0);
        setAvailableLots(filtered);
      } else {
        // For other types (like ADJUSTMENT), show all lots, annotated with quantity
        setAvailableLots(mappedLots);
      }
    } catch (err) {
      console.error('Error fetching lots at location:', err)
      setAvailableLots(itemLots) // Fallback to all item lots
    }
  }

  // Create new transaction
  const createTransaction = async () => {
    try {
      const payload = {
        type: formData.type,
        item_id: parseInt(formData.item_id),
        quantity: parseInt(formData.quantity),
        created_by: formData.created_by,
        from_location: formData.from_location ? parseInt(formData.from_location) : null,
        to_location: formData.to_location ? parseInt(formData.to_location) : null
      }

      // Add LOT data
      if (formData.type !== 'IN' && formData.lot_id) {
        payload.lot_id = parseInt(formData.lot_id)
      }

      // Add supplier data for IN transactions
      if (formData.type === 'IN' && formData.supplier_id) {
        payload.supplier_id = parseInt(formData.supplier_id)
      }

      await stockAPI.createTransaction(payload)
      await fetchTransactions()
      closeModal()
    } catch (err) {
      // Check if it's a stock insufficiency error
      if (err.message.includes('INSUFFICIENT_STOCK')) {
        setStockErrorDialog({
          title: "Stock Insuffisant",
          message: err.message
        })
        return
      }
      setError(err.message)
    }
  }

  // Update transaction
  const updateTransaction = async () => {
    try {
      const payload = {
        type: formData.type,
        item_id: parseInt(formData.item_id),
        quantity: parseInt(formData.quantity),
        created_by: formData.created_by,
        from_location: formData.from_location ? parseInt(formData.from_location) : null,
        to_location: formData.to_location ? parseInt(formData.to_location) : null
      }

      // Add LOT data
      if (formData.lot_id) payload.lot_id = parseInt(formData.lot_id)

      await stockAPI.updateTransaction(selectedTransaction.id, payload)
      await fetchTransactions()
      closeModal()
    } catch (err) {
      // Check if it's a stock insufficiency error
      if (err.message.includes('INSUFFICIENT_STOCK')) {
        setStockErrorDialog({
          title: "Stock Insuffisant",
          message: err.message
        })
        return
      }
      setError(err.message)
    }
  }

  // Validate transaction
  const handleValidateClick = (transaction) => {
    setValidateConfirm(transaction)
    setValidatorName('')
  }

  const confirmValidation = async () => {
    if (!validateConfirm || !validatorName.trim()) return

    try {
      await stockAPI.validateTransaction(validateConfirm.id, validatorName)
      await fetchTransactions()
      setValidateConfirm(null)
      setValidatorName('')
    } catch (err) {
      // Check if it's a stock insufficiency error
      if (err.message.includes('INSUFFICIENT_STOCK')) {
        setStockErrorDialog({
          title: "Stock Insuffisant",
          message: err.message
        })
        setValidateConfirm(null)
        setValidatorName('')
        return
      }
      setError(err.message)
      setValidateConfirm(null)
      setValidatorName('')
    }
  }

  // Cancel transaction
  const cancelTransaction = async (transactionId) => {
    try {
      await stockAPI.cancelTransaction(transactionId)
      await fetchTransactions()
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete transaction
  const handleDeleteClick = (transaction) => {
    setDeleteConfirm(transaction)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      await stockAPI.deleteTransaction(deleteConfirm.id)
      await fetchTransactions()
      setDeleteConfirm(null)
    } catch (err) {
      setError(err.message)
      setDeleteConfirm(null)
    }
  }

  // Modal management
  const openCreateModal = () => {
    setModalMode('create')
    setSelectedTransaction(null)
    setFormData({
      item_id: '',
      from_location: '',
      to_location: '',
      quantity: '',
      type: '',
      created_by: '',
      lot_id: '',
      supplier_id: ''
    })
    setItemSearchText('')
    setShowItemDropdown(false)
    setShowModal(true)
  }

  const openEditModal = (transaction) => {
    setModalMode('edit')
    setSelectedTransaction(transaction)
    setFormData({
      item_id: transaction.item_id.toString(),
      from_location: transaction.from_location ? transaction.from_location.toString() : '',
      to_location: transaction.to_location ? transaction.to_location.toString() : '',
      quantity: transaction.quantity.toString(),
      type: transaction.type,
      created_by: transaction.created_by,
      lot_id: transaction.lot_id ? transaction.lot_id.toString() : '',
      supplier_id: transaction.lot?.supplier?.id ? transaction.lot.supplier.id.toString() : ''
    })
    const item = items.find(i => i.id.toString() === transaction.item_id.toString());
    setItemSearchText(item ? item.name : '')
    setShowItemDropdown(false)
    setShowModal(true)
  }

  const openViewModal = (transaction) => {
    setModalMode('view')
    setSelectedTransaction(transaction)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTransaction(null)
    setAvailableLots([])
    setItemSearchText('')
    setShowItemDropdown(false)
    setFormData({
      item_id: '',
      from_location: '',
      to_location: '',
      quantity: '',
      type: '',
      created_by: ''
    })
  }

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchTransactions(page, searchTerm)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    fetchTransactions(1, searchTerm)
  }

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value)
    if (e.target.value === '') {
      fetchTransactions(1, '')
    }
  }

  // Handle filters
  const handleFilterChange = () => {
    fetchTransactions(1, searchTerm)
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    if (modalMode === 'create') {
      createTransaction()
    } else if (modalMode === 'edit') {
      updateTransaction()
    }
  }

  // Handle type change to reset locations
  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      from_location: type === 'IN' ? '' : formData.from_location,
      to_location: type === 'OUT' ? '' : formData.to_location,
      lot_id: type === 'IN' ? '' : formData.lot_id, // Reset lot_id for IN transactions
      supplier_id: type === 'IN' ? formData.supplier_id : '' // Keep supplier_id only for IN transactions
    })
  }

  // Handle item change to reset lot selection
  const handleItemChange = (itemId) => {
    setFormData(prev => ({
      ...prev,
      item_id: itemId,
      lot_id: ''
    }))
  }

  // Handle source location change to reset lot selection
  const handleFromLocationChange = (fromLocation) => {
    setFormData(prev => ({
      ...prev,
      from_location: fromLocation,
      lot_id: ''
    }))
  }

  // Handle destination location change to reset lot selection if adjustment
  const handleToLocationChange = (toLocation) => {
    setFormData(prev => ({
      ...prev,
      to_location: toLocation,
      lot_id: prev.type === 'ADJUSTMENT' ? '' : prev.lot_id
    }))
  }

  // Check if form has validation errors
  const isFormInvalid = () => {
    if (formData.type === 'TRANSFER' && formData.from_location && formData.to_location && formData.from_location === formData.to_location) {
      return true
    }
    
    if (formData.lot_id && (formData.type === 'TRANSFER' || formData.type === 'OUT')) {
      const selectedLot = availableLots.find(lot => lot.id.toString() === formData.lot_id.toString())
      if (selectedLot) {
        const availableStock = selectedLot.locationQty - (selectedLot.locationReservedQty || 0)
        if (formData.quantity && parseInt(formData.quantity) > availableStock) {
          return true
        }
      }
    }
    
    return false
  }

  // Load data on component mount
  useEffect(() => {
    fetchTransactions()
    fetchItems()
    fetchLocations()
    fetchSuppliers()
    fetchLots()
  }, [])

  // Handle filter changes
  useEffect(() => {
    handleFilterChange()
  }, [filterType, filterStatus])

  const selectedLot = availableLots.find(lot => lot.id.toString() === formData.lot_id.toString())
  const selectedLotAvailableQty = selectedLot 
    ? (selectedLot.locationQty - (selectedLot.locationReservedQty || 0)) 
    : null

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AABB]"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Transactions de Stock</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalTransactions} transaction(s) enregistrée(s)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#00AABB] text-white px-4 py-2 rounded-lg hover:bg-[#008899] transition-colors flex items-center"
        >
          <span className="mr-2">+</span>
          Nouvelle Transaction
        </button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher par créateur ou validateur..."
            value={searchTerm}
            onChange={handleSearchInputChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#00AABB] text-white rounded-md hover:bg-[#008899] transition-colors"
          >
            Rechercher
          </button>
        </form>

        {/* Filters */}
        <div className="flex gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
          >
            <option value="">Tous les types</option>
            <option value="IN">Entrée</option>
            <option value="OUT">Sortie</option>
            <option value="TRANSFER">Transfert</option>
            <option value="ADJUSTMENT">Ajustement</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="validated">Validée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Transactions table */}
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl">📝</span>
          <p className="text-gray-500 mt-4">Aucune transaction trouvée</p>
          <p className="text-sm text-gray-400 mt-2">Créez votre première transaction pour commencer</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  De → Vers
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeStyle(transaction.type)}`}>
                      {getTypeLabel(transaction.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{transaction.item?.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {transaction.lot?.lot_number || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{transaction.quantity}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {transaction.type === 'IN' && transaction.lot?.supplier ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600 font-medium">{transaction.lot.supplier.nom}</span>
                            <span className="text-gray-400">→</span>
                            <span>{transaction.toLocation?.name || '—'}</span>
                          </div>
                        </div>
                      ) : transaction.type === 'TRANSFER' ? (
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="text-gray-800">{transaction.fromLocation?.name || '—'}</span>
                          <span className="text-blue-500">➔</span>
                          <span className="text-gray-800">{transaction.toLocation?.name || '—'}</span>
                        </div>
                      ) : (
                        <div>
                          {transaction.fromLocation?.name || '—'} → {transaction.toLocation?.name || '—'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyle(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openViewModal(transaction)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Voir
                      </button>
                      {transaction.status === 'draft' && (
                        <>
                          <button
                            onClick={() => openEditModal(transaction)}
                            className="text-[#00AABB] hover:text-[#008899]"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleValidateClick(transaction)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => cancelTransaction(transaction.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleDeleteClick(transaction)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage {((currentPage - 1) * 10) + 1} à {Math.min(currentPage * 10, totalTransactions)} sur {totalTransactions} transactions
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-[#00AABB] text-white border-[#00AABB]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalMode === 'create' ? 'Nouvelle Transaction' : 'Modifier Transaction'}
              </h3>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Article *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher un article..."
                        value={itemSearchText}
                        onChange={(e) => {
                          setItemSearchText(e.target.value);
                          setShowItemDropdown(true);
                          if (e.target.value === '') {
                            handleItemChange('');
                          }
                        }}
                        onFocus={() => setShowItemDropdown(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                        required
                      />
                      <div className="absolute right-3 top-2.5 pointer-events-none text-gray-400">
                        🔍
                      </div>
                      
                      {showItemDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => {
                              const selectedItem = items.find(i => i.id.toString() === formData.item_id.toString());
                              setItemSearchText(selectedItem ? selectedItem.name : '');
                              setShowItemDropdown(false);
                            }}
                          />
                          <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg z-50">
                            {items.filter(item => 
                              item.name.toLowerCase().includes(itemSearchText.toLowerCase())
                            ).length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                Aucun article trouvé
                              </div>
                            ) : (
                              items.filter(item => 
                                item.name.toLowerCase().includes(itemSearchText.toLowerCase())
                              ).map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    handleItemChange(item.id.toString());
                                    setItemSearchText(item.name);
                                    setShowItemDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                    formData.item_id.toString() === item.id.toString() 
                                      ? 'bg-blue-50 font-semibold text-[#008899]' 
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {item.name}
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    >
                      <option value="">Sélectionner un type</option>
                      <option value="IN">Entrée</option>
                      <option value="OUT">Sortie</option>
                      <option value="TRANSFER">Transfert</option>
                      <option value="ADJUSTMENT">Ajustement</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantité *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedLotAvailableQty !== null && (formData.type === 'TRANSFER' || formData.type === 'OUT') ? selectedLotAvailableQty : undefined}
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-[#00AABB] focus:border-[#00AABB] ${
                        selectedLotAvailableQty !== null && 
                        (formData.type === 'TRANSFER' || formData.type === 'OUT') && 
                        parseInt(formData.quantity) > selectedLotAvailableQty
                          ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300'
                      }`}
                      placeholder="Ex: 10"
                    />
                    {selectedLotAvailableQty !== null && (formData.type === 'TRANSFER' || formData.type === 'OUT') && (
                      <p className={`text-xs mt-1 ${
                        parseInt(formData.quantity) > selectedLotAvailableQty 
                          ? 'text-red-600 font-medium' 
                          : 'text-gray-500'
                      }`}>
                        Disponible : {selectedLotAvailableQty} unité(s)
                        {selectedLot.locationReservedQty > 0 && ` (dont ${selectedLot.locationReservedQty} rés.)`}
                        {parseInt(formData.quantity) > selectedLotAvailableQty && ' - La quantité dépasse le stock disponible.'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Créé par *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.created_by}
                      onChange={(e) => setFormData({ ...formData, created_by: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      placeholder="Nom de l'utilisateur"
                    />
                  </div>
                </div>

                {/* Location fields based on type */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {formData.type !== 'IN' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emplacement source {formData.type === 'TRANSFER' ? '*' : ''}
                      </label>
                      <select
                        required={formData.type === 'TRANSFER'}
                        value={formData.from_location}
                        onChange={(e) => handleFromLocationChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      >
                        <option value="">Sélectionner un emplacement</option>
                        {locations.map((location) => {
                          const isSameAsDest = formData.type === 'TRANSFER' && formData.to_location && location.id.toString() === formData.to_location.toString();
                          return (
                            <option 
                              key={location.id} 
                              value={location.id}
                              disabled={isSameAsDest}
                            >
                              {location.name} ({getLocationTypeLabel(location.type)}){isSameAsDest ? ' (Destination)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {formData.type !== 'OUT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emplacement destination {formData.type === 'TRANSFER' || formData.type === 'IN' ? '*' : ''}
                      </label>
                      <select
                        required={formData.type === 'TRANSFER' || formData.type === 'IN'}
                        value={formData.to_location}
                        onChange={(e) => handleToLocationChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      >
                        <option value="">Sélectionner un emplacement</option>
                        {locations.map((location) => {
                          const isSameAsSource = formData.type === 'TRANSFER' && formData.from_location && location.id.toString() === formData.from_location.toString();
                          return (
                            <option 
                              key={location.id} 
                              value={location.id}
                              disabled={isSameAsSource}
                            >
                              {location.name} ({getLocationTypeLabel(location.type)}){isSameAsSource ? ' (Source)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* Supplier Selection - For IN transactions */}
                {formData.type === 'IN' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fournisseur
                    </label>
                    <select
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    >
                      <option value="">Sélectionner un fournisseur (optionnel)</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.nom}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Le fournisseur sera associé au lot créé lors de cette entrée
                    </p>
                  </div>
                )}

                {/* LOT Selection - For OUT/TRANSFER/ADJUSTMENT, only show when location (emplacement) is selected */}
                {formData.type && formData.type !== 'IN' && (
                  formData.type === 'TRANSFER' || formData.type === 'OUT' 
                    ? !!formData.from_location 
                    : (!!formData.from_location || !!formData.to_location)
                ) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lot {(formData.type === 'OUT' || formData.type === 'TRANSFER') ? '*' : ''}
                    </label>
                    <select
                      required={formData.type === 'OUT' || formData.type === 'TRANSFER'}
                      value={formData.lot_id}
                      onChange={(e) => setFormData({ ...formData, lot_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                      disabled={!formData.item_id}
                    >
                      <option value="">Sélectionner un lot</option>
                      {availableLots.map((lot) => {
                        const qtyText = lot.locationQty !== undefined
                          ? ` [Qté: ${lot.locationQty}${lot.locationReservedQty > 0 ? ` (dont ${lot.locationReservedQty} rés.)` : ''}]`
                          : '';
                        return (
                          <option key={lot.id} value={lot.id}>
                            {lot.lot_number} - {lot.item?.name}{qtyText}
                            {lot.expiration_date && ` (Exp: ${new Date(lot.expiration_date).toLocaleDateString('fr-FR')})`}
                          </option>
                        );
                      })}
                    </select>
                    {availableLots.length === 0 && formData.item_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        Aucun lot actif disponible pour cet article dans cet emplacement
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isFormInvalid()}
                    className={`px-4 py-2 text-sm text-white rounded-md transition-colors ${
                      isFormInvalid()
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-[#00AABB] hover:bg-[#008899]'
                    }`}
                  >
                    {modalMode === 'create' ? 'Créer' : 'Modifier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showModal && modalMode === 'view' && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Détails de la Transaction #{selectedTransaction.id}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeStyle(selectedTransaction.type)}`}>
                      {getTypeLabel(selectedTransaction.type)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Statut</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyle(selectedTransaction.status)}`}>
                      {getStatusLabel(selectedTransaction.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Article</label>
                  <p className="text-gray-900">{selectedTransaction.item?.name}</p>
                </div>

                {selectedTransaction.lot && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Numéro de Lot</label>
                    <p className="text-gray-900 font-mono">{selectedTransaction.lot.lot_number}</p>
                    {selectedTransaction.lot.expiration_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Expiration: {new Date(selectedTransaction.lot.expiration_date).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                )}

                {selectedTransaction.type === 'IN' && selectedTransaction.lot?.supplier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fournisseur</label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedTransaction.lot.supplier.nom}</p>
                          {selectedTransaction.lot.supplier.email && (
                            <p className="text-sm text-gray-600">{selectedTransaction.lot.supplier.email}</p>
                          )}
                          {selectedTransaction.lot.supplier.telephone && (
                            <p className="text-sm text-gray-600">{selectedTransaction.lot.supplier.telephone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500">Quantité</label>
                  <p className="text-gray-900 font-medium">{selectedTransaction.quantity}</p>
                </div>

                {selectedTransaction.type === 'TRANSFER' ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 my-2">
                    <div className="flex items-center justify-between text-center">
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">Source</span>
                        <span className="text-base font-semibold text-gray-900">{selectedTransaction.fromLocation?.name || '—'}</span>
                        <span className="text-xs text-gray-500 block">({getLocationTypeLabel(selectedTransaction.fromLocation?.type)})</span>
                      </div>
                      <div className="flex items-center justify-center px-4">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-medium text-blue-500 mb-1">Transfert</span>
                          <svg className="w-8 h-8 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wider block mb-1">Destination</span>
                        <span className="text-base font-semibold text-gray-900">{selectedTransaction.toLocation?.name || '—'}</span>
                        <span className="text-xs text-gray-500 block">({getLocationTypeLabel(selectedTransaction.toLocation?.type)})</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedTransaction.fromLocation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Emplacement source</label>
                        <p className="text-gray-900">{selectedTransaction.fromLocation.name}</p>
                      </div>
                    )}

                    {selectedTransaction.toLocation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Emplacement destination</label>
                        <p className="text-gray-900">{selectedTransaction.toLocation.name}</p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500">Créé par</label>
                  <p className="text-gray-900">{selectedTransaction.created_by}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Date de création</label>
                  <p className="text-gray-900">{new Date(selectedTransaction.created_at).toLocaleString('fr-FR')}</p>
                </div>

                {selectedTransaction.validated_by && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Validé par</label>
                      <p className="text-gray-900">{selectedTransaction.validated_by}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date de validation</label>
                      <p className="text-gray-900">{new Date(selectedTransaction.validated_at).toLocaleString('fr-FR')}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}

      {/* Validation Confirmation Modal */}
      {validateConfirm && (
        <AlertDialog
          isOpen={true}
          onClose={() => {
            setValidateConfirm(null)
            setValidatorName('')
          }}
          onConfirm={confirmValidation}
          title="Valider la transaction"
          message={
            <div className="space-y-3">
              <p>Entrez le nom du validateur pour confirmer la validation de cette transaction :</p>
              <input
                type="text"
                value={validatorName}
                onChange={(e) => setValidatorName(e.target.value)}
                placeholder="Nom du validateur"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                autoFocus
              />
            </div>
          }
          confirmText="Valider"
          cancelText="Annuler"
          confirmDisabled={!validatorName.trim()}
          type="info"
        />
      )}

      {/* Stock Error Dialog */}
      {stockErrorDialog && (
        <AlertDialog
          isOpen={true}
          onClose={() => setStockErrorDialog(null)}
          onConfirm={() => setStockErrorDialog(null)}
          title={stockErrorDialog.title}
          message={stockErrorDialog.message}
          confirmText="Compris"
          type="error"
          showCancel={false}
        />
      )}
    </div>
  )
}

export default TransactionsManagement