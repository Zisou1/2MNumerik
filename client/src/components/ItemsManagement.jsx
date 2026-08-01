import { useState, useEffect } from 'react'
import AlertDialog from './AlertDialog'
import { stockAPI, unitAPI } from '../utils/api'

function ItemsManagement() {
  const [items, setItems] = useState([])
  const [locations, setLocations] = useState([])
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteErrorDialog, setDeleteErrorDialog] = useState(null)
  
  // Dynamic DB Units state
  const [dbUnits, setDbUnits] = useState([])
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [newUnitData, setNewUnitData] = useState({ name: '', symbol: '', description: '' })
  const [unitError, setUnitError] = useState(null)

  // Item details modal states
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false)
  const [selectedItemDetails, setSelectedItemDetails] = useState(null)
  const [itemDetailsLoading, setItemDetailsLoading] = useState(false)
  const [itemTransactions, setItemTransactions] = useState([])

  // Thresholds modal state
  const [showThresholdsModal, setShowThresholdsModal] = useState(false)
  const [thresholdsLoading, setThresholdsLoading] = useState(false)
  const [thresholdsData, setThresholdsData] = useState([])
  const [selectedItemForThresholds, setSelectedItemForThresholds] = useState(null)

  // Pagination and search states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10 // Hardcoded to 10 items per page
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'unite'
  })
  
  // Helper function to get location type label
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

  // Helper function to get location icon
  const getLocationIcon = (type) => {
    const icons = {
      'main_depot': '🏢',
      'workshop': '🔧',
      'store': '🏪',
      'supplier': '🚚',
      'customer': '👤'
    }
    return icons[type] || '📍'
  }

  // Helper function to get location color scheme
  const getLocationColorScheme = (type) => {
    const colorSchemes = {
      'main_depot': 'bg-blue-100 text-blue-800 border-blue-200',
      'workshop': 'bg-orange-100 text-orange-800 border-orange-200',
      'store': 'bg-green-100 text-green-800 border-green-200',
      'supplier': 'bg-purple-100 text-purple-800 border-purple-200',
      'customer': 'bg-pink-100 text-pink-800 border-pink-200'
    }
    return colorSchemes[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Helper function to format locations display from LOTs
  const formatLocationsDisplay = (itemId) => {
    const itemLots = lots.filter(lot => lot.item_id === itemId && lot.status === 'active')
    
    if (itemLots.length === 0) {
      return { text: 'Aucun emplacement', isEmpty: true }
    }

    // Get unique locations from lot_locations
    const locationSet = new Map()
    itemLots.forEach(lot => {
      if (lot.lotLocations) {
        lot.lotLocations.forEach(ll => {
          if (ll.location && ll.quantity > 0) {
            locationSet.set(ll.location.id, ll.location)
          }
        })
      }
    })

    const locations = Array.from(locationSet.values()).map(location => ({
      icon: getLocationIcon(location.type),
      name: location.name,
      type: getLocationTypeLabel(location.type),
      colorScheme: getLocationColorScheme(location.type)
    }))

    return { locations, isEmpty: false }
  }

  // Fetch items from API
  const fetchItems = async (page = currentPage, search = searchTerm) => {
    try {
      setLoading(true)
      const params = {
        page: page.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        ...(search && { search })
      }
      
      const data = await stockAPI.getItems(params)
      console.log('API Response:', data)
      setItems(data.items)
      setTotalItems(data.totalCount) // Backend uses 'totalCount', not 'totalItems'
      setTotalPages(data.totalPages)
      setCurrentPage(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch locations from API
  const fetchLocations = async () => {
    try {
      const data = await stockAPI.getLocations()
      console.log('Locations API Response:', data)
      setLocations(data.locations || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
      // Don't set error state here as this shouldn't block the main functionality
    }
  }

  // Fetch lots from API
  const fetchLots = async () => {
    try {
      const data = await stockAPI.getLots({ status: 'active', limit: 1000 })
      setLots(data.lots || [])
    } catch (err) {
      console.error('Error fetching lots:', err)
    }
  }

  // Fetch DB units from API
  const fetchDbUnits = async () => {
    try {
      const data = await unitAPI.getUnits()
      setDbUnits(data || [])
    } catch (err) {
      console.error('Error fetching DB units:', err)
    }
  }

  // Handle inline unit creation
  const handleCreateNewUnit = async (e) => {
    e.preventDefault()
    try {
      setUnitError(null)
      const created = await unitAPI.createUnit(newUnitData)
      await fetchDbUnits()
      setFormData({ ...formData, unit: created.symbol, unit_id: created.id })
      setShowAddUnitModal(false)
      setNewUnitData({ name: '', symbol: '', description: '' })
    } catch (err) {
      setUnitError(err.message)
    }
  }

  // Get LOT summary for an item
  const getLotSummary = (itemId) => {
    const itemLots = lots.filter(lot => lot.item_id === itemId && lot.status === 'active')
    const totalQuantity = itemLots.reduce((sum, lot) => {
      const lotLocationsQty = lot.lotLocations?.reduce((locSum, ll) => locSum + ll.quantity, 0) || 0
      return sum + lotLocationsQty
    }, 0)
    return {
      count: itemLots.length,
      totalQuantity
    }
  }

  // Thresholds Modal Handlers
  const openThresholdsModal = async (item) => {
    setSelectedItemForThresholds(item)
    setShowThresholdsModal(true)
    setThresholdsLoading(true)
    try {
      // 1. Fetch item details to get its configured itemLocations
      const itemData = await stockAPI.getItem(item.id)
      
      // 2. We already have 'locations' from fetchLocations (global state). 
      // Map over all locations and set the threshold input to the configured value or 0.
      const configuredMap = new Map()
      if (itemData.itemLocations) {
        itemData.itemLocations.forEach(il => {
          configuredMap.set(il.location_id, il.minimum_quantity)
        })
      }
      
      const mappedThresholds = locations.map(loc => ({
        location_id: loc.id,
        location_name: loc.name,
        minimum_quantity: configuredMap.has(loc.id) ? configuredMap.get(loc.id) : 0
      }))
      
      setThresholdsData(mappedThresholds)
    } catch (err) {
      console.error('Error opening thresholds modal:', err)
      alert("Erreur lors de l'ouverture des seuils.")
    } finally {
      setThresholdsLoading(false)
    }
  }

  const handleSaveThresholds = async () => {
    try {
      setThresholdsLoading(true)
      // Save each threshold
      for (const t of thresholdsData) {
        const qty = parseFloat(t.minimum_quantity) || 0
        await stockAPI.updateMinimumQuantity(selectedItemForThresholds.id, t.location_id, qty)
      }
      setShowThresholdsModal(false)
      // Re-fetch items to get latest UI updates if needed
      fetchItems()
    } catch (err) {
      console.error('Error saving thresholds:', err)
      alert("Erreur lors de l'enregistrement des seuils.")
    } finally {
      setThresholdsLoading(false)
    }
  }

  // Fetch detailed item information including lots, locations, and transactions
  const fetchItemDetails = async (itemId) => {
    try {
      setItemDetailsLoading(true)
      setShowItemDetailsModal(true)
      
      // Fetch item details
      const itemData = await stockAPI.getItem(itemId)
      
      // Fetch lots for this item
      const itemLots = await stockAPI.getLotsForItem(itemId)
      
      // Fetch transactions for this item
      const transactionsData = await stockAPI.getTransactions({ 
        item_id: itemId, 
        limit: 50, 
        sortBy: 'created_at', 
        sortOrder: 'DESC' 
      })
      
      // Process location data from lots
      const locationMap = new Map()
      itemLots.forEach(lot => {
        lot.lotLocations?.forEach(lotLoc => {
          if (lotLoc.location && lotLoc.quantity > 0) {
            const locationId = lotLoc.location.id
            if (!locationMap.has(locationId)) {
              locationMap.set(locationId, {
                location: lotLoc.location,
                totalQuantity: 0,
                lots: []
              })
            }
            const locationData = locationMap.get(locationId)
            locationData.totalQuantity += lotLoc.quantity
            locationData.lots.push({
              ...lot,
              quantityAtLocation: lotLoc.quantity
            })
          }
        })
      })
      
      setSelectedItemDetails({
        item: itemData,
        lots: itemLots,
        locations: Array.from(locationMap.values()),
        totalQuantity: Array.from(locationMap.values()).reduce((sum, loc) => sum + loc.totalQuantity, 0),
        activeLots: itemLots.filter(lot => lot.status === 'active').length,
        expiringSoonLots: itemLots.filter(lot => {
          if (!lot.expiration_date) return false
          const expDate = new Date(lot.expiration_date)
          const today = new Date()
          const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
          return daysDiff <= 30 && daysDiff > 0
        }).length
      })
      setItemTransactions(transactionsData.transactions || [])
      
    } catch (err) {
      console.error('Error fetching item details:', err)
      alert('Erreur lors du chargement des détails de l\'article')
    } finally {
      setItemDetailsLoading(false)
    }
  }

  // Create new item
  const createItem = async () => {
    try {
      const requestBody = {
        ...formData
      }

      await stockAPI.createItem(requestBody)
      await fetchItems()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Update item
  const updateItem = async () => {
    try {
      const requestBody = {
        ...formData
      }

      await stockAPI.updateItem(selectedItem.id, requestBody)
      await fetchItems()
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // Delete item
  const handleDeleteClick = (item) => {
    setDeleteConfirm(item)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      await stockAPI.deleteItem(deleteConfirm.id)
      await fetchItems()
      setDeleteConfirm(null)
      setError(null)
    } catch (err) {
      setDeleteConfirm(null)
      setDeleteErrorDialog({
        title: 'Suppression Impossible',
        message: err.message
      })
      setError(err.message)
    }
  }

  // Modal management
  const openCreateModal = () => {
    setModalMode('create')
    setSelectedItem(null)
    const defaultUnit = dbUnits.find(u => u.symbol === 'unite') || dbUnits[0]
    setFormData({
      name: '',
      description: '',
      unit: defaultUnit ? defaultUnit.symbol : 'unite',
      unit_id: defaultUnit ? defaultUnit.id : null
    })
    setShowModal(true)
  }

  const openEditModal = async (item) => {
    setModalMode('edit')
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      unit: item.unit || 'unite',
      unit_id: item.unit_id || (item.unitInfo?.id || null)
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setModalMode('create')
    setSelectedItem(null)
    setFormData({
      name: '',
      description: '',
      unit: 'unite'
    })
  }

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchItems(page, searchTerm)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchItems(1, searchTerm) // Reset to page 1 when searching
  }

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value)
    if (e.target.value === '') {
      fetchItems(1, '') // Reset search when input is cleared
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (modalMode === 'create') {
      createItem()
    } else {
      updateItem()
    }
  }

  // Note: Stock is now managed through LOT system via IN transactions

  // Load items on component mount
  useEffect(() => {
    fetchItems()
    fetchLocations()
    fetchLots()
    fetchDbUnits()
  }, []) // Empty dependency array for initial load

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
          <h2 className="text-xl font-semibold text-gray-800">Gestion des Articles</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalItems} article(s) disponible(s)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#00AABB] text-white px-4 py-2 rounded-lg hover:bg-[#008899] transition-colors flex items-center"
        >
          <span className="mr-2">+</span>
          Nouvel Article
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher un article..."
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
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Items table */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl">📦</span>
          <p className="text-gray-500 mt-4">Aucun article trouvé</p>
          <p className="text-sm text-gray-400 mt-2">Créez votre premier article pour commencer</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lots Actifs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emplacements
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const locationDisplay = formatLocationsDisplay(item.id)
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate">
                        {item.description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {(() => {
                        const lotSummary = getLotSummary(item.id)
                        return (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {lotSummary.count} lot{lotSummary.count !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-gray-500">
                              {lotSummary.totalQuantity} unité{lotSummary.totalQuantity !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      {locationDisplay.isEmpty ? (
                        <span className="text-sm text-gray-400 italic">
                          {locationDisplay.text}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {locationDisplay.locations.map((location, index) => (
                            <span 
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${location.colorScheme}`}
                            >
                              <span className="mr-1">{location.icon}</span>
                              {location.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {new Date(item.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => fetchItemDetails(item.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Voir les détails complets"
                      >
                        Détails
                      </button>
                      <button
                        onClick={() => openThresholdsModal(item)}
                        className="text-purple-600 hover:text-purple-900 mr-3"
                        title="Gérer les seuils d'alerte"
                      >
                        Seuils
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-[#00AABB] hover:text-[#008899] mr-3"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {console.log('Pagination Debug:', { totalPages, currentPage, totalItems, itemsPerPage })}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Affichage {((currentPage - 1) * 10) + 1} à {Math.min(currentPage * 10, totalItems)} sur {totalItems} articles
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>
            
            {/* Page numbers */}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {modalMode === 'create' ? 'Nouvel Article' : 'Modifier Article'}
              </h3>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'article *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    placeholder="Ex: Papier A4 Blanc"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB]"
                    placeholder="Description détaillée de l'article..."
                  />
                </div>

                {/* Dynamic DB Unit of Measure Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Unité de Mesure (Unit) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddUnitModal(true)}
                      className="text-xs text-[#00AABB] font-semibold hover:underline flex items-center"
                    >
                      ➕ Créer une nouvelle unité
                    </button>
                  </div>
                  <select
                    value={formData.unit_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value ? parseInt(e.target.value, 10) : null
                      const selectedUnitObj = dbUnits.find(u => u.id === selectedId)
                      setFormData({
                        ...formData,
                        unit_id: selectedId,
                        unit: selectedUnitObj ? selectedUnitObj.symbol : formData.unit
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00AABB] focus:border-[#00AABB] bg-white"
                  >
                    <option value="">Choisir une unité</option>
                    {dbUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Sélectionnez l'unité officielle définie en base de données pour éliminer les erreurs.
                  </p>
                </div>

                {/* Note: Stock is now managed through LOT system via IN transactions */}
                <p className="text-sm text-gray-500 italic mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  ℹ️ Le stock est maintenant géré via le système de LOTS. Créez des transactions d'ENTRÉE (IN) pour recevoir des articles et générer automatiquement des LOTs.
                </p>

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
                    className="px-4 py-2 text-sm bg-[#00AABB] text-white rounded-md hover:bg-[#008899]"
                  >
                    {modalMode === 'create' ? 'Créer' : 'Modifier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Créer une nouvelle Unité de Mesure</h3>
            <p className="text-xs text-gray-500 mb-4">
              Ajoutez une nouvelle unité officielle en base de données. Elle apparaîtra immédiatement dans la liste.
            </p>

            {unitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded mb-4">
                {unitError}
              </div>
            )}

            <form onSubmit={handleCreateNewUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de l'unité *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bobine, Cartouche, Flacon..."
                  value={newUnitData.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const symbol = name.toLowerCase().replace(/[^a-z0-9]/g, '_')
                    setNewUnitData({ ...newUnitData, name, symbol })
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Symbole / Code *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: bobine, cartouche..."
                  value={newUnitData.symbol}
                  onChange={(e) => setNewUnitData({ ...newUnitData, symbol: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  placeholder="Notes sur l'utilisation de cette unité..."
                  value={newUnitData.description}
                  onChange={(e) => setNewUnitData({ ...newUnitData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUnitModal(false)
                    setUnitError(null)
                  }}
                  className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-[#00AABB] text-white rounded-lg hover:bg-[#008899] font-semibold"
                >
                  Enregistrer l'unité
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {showItemDetailsModal && (
        <ItemDetailsModal
          isOpen={showItemDetailsModal}
          onClose={() => {
            setShowItemDetailsModal(false)
            setSelectedItemDetails(null)
            setItemTransactions([])
          }}
          data={selectedItemDetails}
          transactions={itemTransactions}
          loading={itemDetailsLoading}
        />
      )}

      {/* Thresholds Modal */}
      {showThresholdsModal && selectedItemForThresholds && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Seuils d'alerte : {selectedItemForThresholds.name}
              </h3>
              <button 
                onClick={() => setShowThresholdsModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-6">
                Définissez la quantité minimum requise pour cet article dans chaque emplacement. Vous recevrez une alerte de stock faible lorsque la quantité disponible sera inférieure ou égale au seuil.
              </p>

              {thresholdsLoading && thresholdsData.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="space-y-4">
                  {thresholdsData.map((t, index) => (
                    <div key={t.location_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="font-medium text-gray-700">{t.location_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Min:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          className="w-24 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-800 font-medium text-right focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-all"
                          value={t.minimum_quantity}
                          onChange={(e) => {
                            const newData = [...thresholdsData]
                            newData[index].minimum_quantity = e.target.value
                            setThresholdsData(newData)
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowThresholdsModal(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveThresholds}
                disabled={thresholdsLoading}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-sm shadow-purple-600/20 transition-colors disabled:opacity-50 flex items-center"
              >
                {thresholdsLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
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
          message={`Êtes-vous sûr de vouloir supprimer l'article "${deleteConfirm.name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}

      {/* Delete Error Modal */}
      {deleteErrorDialog && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeleteErrorDialog(null)}
          onConfirm={() => setDeleteErrorDialog(null)}
          title={deleteErrorDialog.title}
          message={deleteErrorDialog.message}
          confirmText="J'ai compris"
          showCancel={false}
        />
      )}
    </div>
  )
}

// ItemDetailsModal Component
function ItemDetailsModal({ isOpen, onClose, data, transactions, loading }) {
  if (!isOpen) return null

  const getLocationIcon = (type) => {
    const icons = {
      'main_depot': '🏢',
      'workshop': '🔧',
      'store': '🏪',
      'supplier': '🚚',
      'customer': '👤'
    }
    return icons[type] || '📍'
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { bg: 'bg-green-100', text: 'text-green-800', label: 'Actif' },
      'consumed': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Consommé' },
      'expired': { bg: 'bg-red-100', text: 'text-red-800', label: 'Expiré' },
      'depleted': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Épuisé' },
      'recalled': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Rappelé' }
    }
    const config = statusConfig[status] || statusConfig['active']
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getTransactionTypeLabel = (type) => {
    const typeLabels = {
      'IN': 'Entrée',
      'OUT': 'Sortie', 
      'TRANSFER': 'Transfert',
      'ADJUSTMENT': 'Ajustement'
    }
    return typeLabels[type] || type
  }

  const getTransactionTypeBadge = (type) => {
    const styles = {
      'IN': 'bg-green-100 text-green-800',
      'OUT': 'bg-red-100 text-red-800',
      'TRANSFER': 'bg-blue-100 text-blue-800',
      'ADJUSTMENT': 'bg-yellow-100 text-yellow-800'
    }
    return styles[type] || 'bg-gray-100 text-gray-800'
  }

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false
    const expDate = new Date(expirationDate)
    const today = new Date()
    const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
    return daysDiff <= 30 && daysDiff > 0
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#00AABB] to-[#008899] px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <span className="text-white text-xl">📦</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Détails de l'Article</h2>
                <p className="text-white/80 text-sm">
                  {loading ? 'Chargement...' : data?.item?.name || ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <span className="text-white text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00AABB]"></div>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Item Summary */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <span className="text-blue-600 text-2xl">📦</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-blue-900">{data.item.name}</h3>
                    {data.item.description && (
                      <p className="text-blue-700 mt-1">{data.item.description}</p>
                    )}
                  </div>
                </div>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{data.totalQuantity}</div>
                    <div className="text-sm text-blue-600">Quantité totale</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{data.activeLots}</div>
                    <div className="text-sm text-green-600">Lots actifs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{data.locations.length}</div>
                    <div className="text-sm text-purple-600">Emplacements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{data.expiringSoonLots}</div>
                    <div className="text-sm text-orange-600">Expirent bientôt</div>
                  </div>
                </div>
              </div>

              {/* Locations Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📍</span>
                  Répartition par emplacement ({data.locations.length})
                </h3>
                {data.locations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.locations.map((locationData, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <span className="text-lg">{getLocationIcon(locationData.location.type)}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{locationData.location.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{locationData.location.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-[#00AABB]">{locationData.totalQuantity}</div>
                          <div className="text-xs text-gray-500">unités en stock</div>
                          <div className="text-xs text-gray-400 mt-1">{locationData.lots.length} lot(s)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <span className="text-4xl mb-2 block">📍</span>
                    <p className="text-gray-500">Aucun stock disponible</p>
                  </div>
                )}
              </div>

              {/* Lots Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🏷️</span>
                  Tous les lots ({data.lots.length})
                </h3>
                {data.lots.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro de Lot</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emplacements</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.lots.map(lot => {
                            const totalQtyForLot = lot.lotLocations?.reduce((sum, ll) => sum + ll.quantity, 0) || 0
                            return (
                              <tr key={lot.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">{lot.lot_number}</span>
                                    {isExpiringSoon(lot.expiration_date) && (
                                      <span className="ml-2 text-orange-500" title="Expiration proche">⚠️</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">{totalQtyForLot}</div>
                                    <div className="text-gray-500 text-xs">/ {lot.initial_quantity} initial</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">{lot.supplier?.nom || 'N/A'}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm">
                                    {lot.expiration_date ? (
                                      <span className={isExpiringSoon(lot.expiration_date) ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                                        {new Date(lot.expiration_date).toLocaleDateString('fr-FR')}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {getStatusBadge(lot.status)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {lot.lotLocations?.filter(ll => ll.quantity > 0).map((ll, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                        {ll.location?.name} ({ll.quantity})
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <span className="text-4xl mb-2 block">🏷️</span>
                    <p className="text-gray-500">Aucun lot trouvé</p>
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">📝</span>
                  Transactions récentes ({transactions.length})
                </h3>
                {transactions.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">De → Vers</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé par</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions.map(transaction => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeBadge(transaction.type)}`}>
                                  {getTransactionTypeLabel(transaction.type)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-medium text-gray-900">{transaction.quantity}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-gray-900 font-mono">{transaction.lot?.lot_number || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-700">
                                  {transaction.fromLocation?.name || '—'} → {transaction.toLocation?.name || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{transaction.created_by}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-gray-500">{new Date(transaction.created_at).toLocaleDateString('fr-FR')}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <span className="text-4xl mb-2 block">📝</span>
                    <p className="text-gray-500">Aucune transaction trouvée</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">❌</span>
              <p className="text-gray-500">Erreur lors du chargement des données</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemsManagement
