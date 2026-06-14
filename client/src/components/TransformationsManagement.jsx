import { useState, useEffect } from 'react'
import AlertDialog from './AlertDialog'
import { stockAPI, supplierAPI, transformationAPI } from '../utils/api'

function TransformationsManagement() {
  const [transformations, setTransformations] = useState([])
  const [items, setItems] = useState([])
  const [locations, setLocations] = useState([])
  const [lots, setLots] = useState([]) // All lots for component lookup
  const [availableInputLots, setAvailableInputLots] = useState([]) // Lots for selected input item
  const [inputLotLocations, setInputLotLocations] = useState([]) // Locations where input lot exists
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create', 'view'
  const [selectedTransformation, setSelectedTransformation] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [completeConfirm, setCompleteConfirm] = useState(null)
  const [completerName, setCompleterName] = useState('')
  const [stockErrorDialog, setStockErrorDialog] = useState(null)

  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

  // Create Form State
  const [formData, setFormData] = useState({
    type: 'internal',
    input_item_id: '',
    input_lot_id: '',
    input_quantity: '',
    from_location_id: '',
    output_item_id: '',
    output_quantity: '',
    to_location_id: '',
    subcontractor_location_id: '',
    created_by: ''
  })
  
  const [selectedLotLocData, setSelectedLotLocData] = useState(null) // Holds selected input lot's stock info

  // Helper Labels
  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Brouillon',
      in_progress: 'En Cours',
      completed: 'Terminé',
      cancelled: 'Annulé'
    }
    return labels[status] || status
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800 border border-gray-300',
      in_progress: 'bg-blue-100 text-blue-800 border border-blue-300',
      completed: 'bg-green-100 text-green-800 border border-green-300',
      cancelled: 'bg-red-100 text-red-800 border border-red-300'
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusLabel(status)}
      </span>
    )
  }

  const getTypeLabel = (type) => {
    return type === 'subcontracted' ? 'Sous-traitance' : 'Interne'
  }

  const getTypeBadge = (type) => {
    const style = type === 'subcontracted' 
      ? 'bg-purple-100 text-purple-800 border border-purple-300' 
      : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
        {getTypeLabel(type)}
      </span>
    )
  }

  // Load basic lookup lists
  const loadLookups = async () => {
    try {
      const [itemsData, locationsData, lotsData] = await Promise.all([
        stockAPI.getItems({ limit: 1000 }),
        stockAPI.getLocations(),
        stockAPI.getLots({ limit: 1000 })
      ])
      setItems(itemsData.items || [])
      setLocations(locationsData.locations || [])
      setLots(lotsData.lots || [])
    } catch (err) {
      console.error('Error loading lookups:', err)
    }
  }

  // Fetch transformations
  const fetchTransformations = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterType !== 'all' && { type: filterType })
      }
      
      const data = await transformationAPI.getTransformations(params)
      setTransformations(data.transformations || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.totalCount || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLookups()
  }, [])

  useEffect(() => {
    fetchTransformations()
  }, [currentPage, filterStatus, filterType, searchTerm])

  // Filter lots when input item changes
  useEffect(() => {
    if (!formData.input_item_id) {
      setAvailableInputLots([])
      return
    }
    const filtered = lots.filter(lot => lot.item_id === parseInt(formData.input_item_id, 10) && lot.status === 'active')
    setAvailableInputLots(filtered)
    
    // Clear lot and locations when item changes
    setFormData(prev => ({
      ...prev,
      input_lot_id: '',
      from_location_id: ''
    }))
    setInputLotLocations([])
    setSelectedLotLocData(null)
  }, [formData.input_item_id, lots])

  // Fetch locations mapped to selected input lot
  useEffect(() => {
    if (!formData.input_lot_id) {
      setInputLotLocations([])
      setSelectedLotLocData(null)
      return
    }

    const fetchLotLocations = async () => {
      try {
        const lotDetails = await stockAPI.getLot(formData.input_lot_id)
        const activeLocations = (lotDetails.lotLocations || []).filter(ll => ll.quantity > 0)
        setInputLotLocations(activeLocations)
        
        // Auto-select location if only one exists
        if (activeLocations.length === 1) {
          setFormData(prev => ({
            ...prev,
            from_location_id: activeLocations[0].location_id.toString()
          }))
          setSelectedLotLocData(activeLocations[0])
        } else {
          setFormData(prev => ({
            ...prev,
            from_location_id: ''
          }))
          setSelectedLotLocData(null)
        }
      } catch (err) {
        console.error('Error fetching lot locations:', err)
      }
    }

    fetchLotLocations()
  }, [formData.input_lot_id])

  // Track availability on from_location selection
  useEffect(() => {
    if (!formData.from_location_id || inputLotLocations.length === 0) {
      setSelectedLotLocData(null)
      return
    }
    const selected = inputLotLocations.find(ll => ll.location_id === parseInt(formData.from_location_id, 10))
    setSelectedLotLocData(selected || null)
  }, [formData.from_location_id, inputLotLocations])

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (selectedLotLocData) {
      const available = selectedLotLocData.quantity - selectedLotLocData.reserved_quantity
      if (parseInt(formData.input_quantity, 10) > available) {
        setStockErrorDialog({
          title: 'Stock Insuffisant',
          message: `Le stock disponible (${available}) est inférieur à la quantité demandée (${formData.input_quantity}).`
        })
        return
      }
    }

    try {
      const payload = {
        type: formData.type,
        input_item_id: parseInt(formData.input_item_id, 10),
        input_lot_id: parseInt(formData.input_lot_id, 10),
        input_quantity: parseInt(formData.input_quantity, 10),
        from_location_id: parseInt(formData.from_location_id, 10),
        output_item_id: parseInt(formData.output_item_id, 10),
        output_quantity: parseInt(formData.output_quantity, 10),
        to_location_id: parseInt(formData.to_location_id, 10),
        subcontractor_location_id: formData.type === 'subcontracted' ? parseInt(formData.subcontractor_location_id, 10) : null,
        created_by: formData.created_by
      }

      await transformationAPI.createTransformation(payload)
      setShowModal(false)
      fetchTransformations()
      // Refresh lookup lots to reflect new reservations
      const lotsData = await stockAPI.getLots({ limit: 1000 })
      setLots(lotsData.lots || [])
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    }
  }

  // Handle status transitions
  const handleStartTransformation = async (id) => {
    try {
      await transformationAPI.updateTransformationStatus(id, { status: 'in_progress' })
      fetchTransformations()
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    }
  }

  const handleCancelTransformation = async (id) => {
    if (!window.confirm('Voulez-vous vraiment annuler cet ordre de transformation ?')) return
    try {
      await transformationAPI.updateTransformationStatus(id, { status: 'cancelled' })
      fetchTransformations()
    } catch (err) {
      alert(`Erreur: ${err.message}`)
    }
  }

  const handleCompleteClick = (id) => {
    setCompleteConfirm(id)
    setCompleterName('')
  }

  const confirmCompletion = async () => {
    if (!completeConfirm || !completerName.trim()) return
    try {
      await transformationAPI.updateTransformationStatus(completeConfirm, {
        status: 'completed',
        completed_by: completerName
      })
      setCompleteConfirm(null)
      setCompleterName('')
      fetchTransformations()
      
      // Refresh lots for changes
      const lotsData = await stockAPI.getLots({ limit: 1000 })
      setLots(lotsData.lots || [])
    } catch (err) {
      if (err.message.includes('INSUFFICIENT_STOCK')) {
        setStockErrorDialog({
          title: 'Stock Insuffisant',
          message: err.message
        })
        setCompleteConfirm(null)
        setCompleterName('')
        return
      }
      alert(`Erreur: ${err.message}`)
      setCompleteConfirm(null)
      setCompleterName('')
    }
  }

  const handleDeleteTransformation = async (id) => {
    try {
      await transformationAPI.deleteTransformation(id)
      setDeleteConfirm(null)
      fetchTransformations()
    } catch (err) {
      alert(`Erreur: ${err.message}`)
      setDeleteConfirm(null)
    }
  }

  const openCreateModal = () => {
    setModalMode('create')
    setFormData({
      type: 'internal',
      input_item_id: '',
      input_lot_id: '',
      input_quantity: '',
      from_location_id: '',
      output_item_id: '',
      output_quantity: '',
      to_location_id: '',
      subcontractor_location_id: '',
      created_by: ''
    })
    setShowModal(true)
  }

  const openViewModal = (tf) => {
    setModalMode('view')
    setSelectedTransformation(tf)
    setShowModal(true)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Tab Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 font-sans">Ordres de Transformation (OF)</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalCount} ordre(s) de transformation enregistré(s)
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#00AABB] text-white px-4 py-2 rounded-lg hover:bg-[#008899] transition-colors flex items-center shadow-md font-semibold text-sm"
        >
          <span className="mr-2 text-lg">+</span>
          Créer un OF
        </button>
      </div>

      {/* Filters & Search */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rechercher</label>
          <input
            type="text"
            placeholder="Référence ou créateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00AABB] focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Statut</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00AABB] focus:border-transparent text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="in_progress">En Cours</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00AABB] focus:border-transparent text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="internal">Interne</option>
            <option value="subcontracted">Sous-traitance</option>
          </select>
        </div>
      </div>

      {/* Loader / Error */}
      {loading && <div className="text-center py-12 text-gray-500 font-medium">Chargement des ordres...</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

      {/* Table Data */}
      {!loading && !error && (
        <div className="overflow-x-auto border rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Référence</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Matière Entrante</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Quantité</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Produit Sortant</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date de création</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transformations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400 font-medium">
                    Aucun ordre de transformation trouvé.
                  </td>
                </tr>
              ) : (
                transformations.map(tf => (
                  <tr key={tf.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{tf.reference_number}</td>
                    <td className="px-4 py-3">{getTypeBadge(tf.type)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{tf.inputItem?.name}</div>
                      <div className="text-xs text-gray-500">Lot: {tf.inputLot?.lot_number}</div>
                      <div className="text-xs text-gray-400">Emplacement: {tf.fromLocation?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{tf.input_quantity} unité(s)</div>
                      <span className="text-gray-400 text-xs">devient</span>
                      <div className="font-semibold text-blue-600">{tf.output_quantity} unité(s)</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{tf.outputItem?.name}</div>
                      {tf.outputLot && (
                        <div className="text-xs text-blue-600 font-medium">Lot généré: {tf.outputLot?.lot_number}</div>
                      )}
                      <div className="text-xs text-gray-400">Vers: {tf.toLocation?.name}</div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(tf.status)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(tf.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs font-semibold">
                        <button
                          onClick={() => openViewModal(tf)}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900 bg-gray-100 rounded border border-gray-200"
                        >
                          Détails
                        </button>
                        {tf.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleStartTransformation(tf.id)}
                              className="px-2 py-1 text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                            >
                              Démarrer
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(tf)}
                              className="px-2 py-1 text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                        {tf.status === 'in_progress' && (
                          <>
                            <button
                              onClick={() => handleCompleteClick(tf.id)}
                              className="px-2 py-1 text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100"
                            >
                              Terminer
                            </button>
                            <button
                              onClick={() => handleCancelTransformation(tf.id)}
                              className="px-2 py-1 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100"
                            >
                              Annuler
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="text-xs text-gray-500">
            Page {currentPage} sur {totalPages} ({totalCount} ordres)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && modalMode === 'create' && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4 flex items-center">
              <span>⚙️</span>
              <span className="ml-2">Nouvel Ordre de Transformation (OF)</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Type de transformation *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-[#00AABB]"
                  >
                    <option value="internal">Interne (Local)</option>
                    <option value="subcontracted">Sous-traitance (Externe)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Créé Par *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom du créateur"
                    value={formData.created_by}
                    onChange={(e) => setFormData({ ...formData, created_by: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-[#00AABB]"
                  />
                </div>
              </div>

              {/* Subcontractor Location selector */}
              {formData.type === 'subcontracted' && (
                <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-1.5">Lieu de Sous-traitance (Sous-traitant) *</label>
                  <select
                    required
                    value={formData.subcontractor_location_id}
                    onChange={(e) => setFormData({ ...formData, subcontractor_location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-purple-400 bg-white"
                  >
                    <option value="">Sélectionner le sous-traitant</option>
                    {locations.filter(loc => loc.type === 'supplier').map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Input Section */}
              <div className="bg-gray-50 border p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-1.5">1. Matière Entrante</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Article Entrant *</label>
                    <select
                      required
                      value={formData.input_item_id}
                      onChange={(e) => setFormData({ ...formData, input_item_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">Sélectionner un article</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lot Entrant *</label>
                    <select
                      required
                      disabled={!formData.input_item_id}
                      value={formData.input_lot_id}
                      onChange={(e) => setFormData({ ...formData, input_lot_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:opacity-50"
                    >
                      <option value="">Sélectionner un lot</option>
                      {availableInputLots.map(lot => (
                        <option key={lot.id} value={lot.id}>{lot.lot_number}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Emplacement Source *</label>
                    <select
                      required
                      disabled={!formData.input_lot_id || inputLotLocations.length === 0}
                      value={formData.from_location_id}
                      onChange={(e) => setFormData({ ...formData, from_location_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white disabled:opacity-50"
                    >
                      <option value="">Choisir l'emplacement</option>
                      {inputLotLocations.map(ll => (
                        <option key={ll.location_id} value={ll.location_id}>
                          {ll.location?.name} (Physique: {ll.quantity} | Dispo: {ll.quantity - ll.reserved_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Quantité à consommer *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Quantité brute"
                      value={formData.input_quantity}
                      onChange={(e) => setFormData({ ...formData, input_quantity: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    {selectedLotLocData && (
                      <p className="text-xs text-gray-500 mt-1">
                        Stock disponible: <span className="font-semibold text-green-600">{selectedLotLocData.quantity - selectedLotLocData.reserved_quantity}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Output Section */}
              <div className="bg-blue-50/30 border border-blue-100 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider border-b pb-1.5 border-blue-100">2. Produit Fini</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">Article de sortie *</label>
                    <select
                      required
                      value={formData.output_item_id}
                      onChange={(e) => setFormData({ ...formData, output_item_id: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-blue-400"
                    >
                      <option value="">Sélectionner un article</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">Emplacement de stockage *</label>
                    <select
                      required
                      value={formData.to_location_id}
                      onChange={(e) => setFormData({ ...formData, to_location_id: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-blue-400"
                    >
                      <option value="">Sélectionner l'emplacement cible</option>
                      {locations.filter(loc => loc.type !== 'supplier' && loc.type !== 'customer').map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 mb-1">Quantité finale à produire *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Quantité transformée"
                    value={formData.output_quantity}
                    onChange={(e) => setFormData({ ...formData, output_quantity: e.target.value })}
                    className="w-full max-w-xs px-3 py-2 border border-blue-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex justify-end gap-2 border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00AABB] text-white rounded-lg hover:bg-[#008899] text-sm font-semibold shadow"
                >
                  Créer le Brouillon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showModal && modalMode === 'view' && selectedTransformation && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">
              Ordre de Transformation: {selectedTransformation.reference_number}
            </h2>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase">Statut</div>
                  <div className="mt-1">{getStatusBadge(selectedTransformation.status)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase">Type</div>
                  <div className="mt-1">{getTypeBadge(selectedTransformation.type)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase">Créé Par</div>
                  <div className="font-semibold text-gray-800 mt-1">{selectedTransformation.created_by}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase">Créé Le</div>
                  <div className="text-gray-700 mt-1">
                    {new Date(selectedTransformation.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>

              {selectedTransformation.status === 'completed' && (
                <div className="grid grid-cols-2 gap-4 border-b pb-4 bg-green-50/30 p-3 rounded-lg border border-green-100">
                  <div>
                    <div className="text-xs font-bold text-green-700 uppercase">Validé Par</div>
                    <div className="font-semibold text-green-900 mt-1">{selectedTransformation.completed_by}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-green-700 uppercase">Validé Le</div>
                    <div className="text-green-950 mt-1">
                      {new Date(selectedTransformation.completed_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              )}

              {/* Inputs */}
              <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-1.5 mb-2">Entrants (Consommés)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Article:</span> <span className="font-medium text-gray-900">{selectedTransformation.inputItem?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Quantité:</span> <span className="font-bold text-gray-900">{selectedTransformation.input_quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Lot:</span> <span className="font-medium text-gray-900">{selectedTransformation.inputLot?.lot_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Emplacement source:</span> <span className="font-medium text-gray-900">{selectedTransformation.fromLocation?.name}</span>
                  </div>
                </div>
              </div>

              {/* Subcontractor Info */}
              {selectedTransformation.type === 'subcontracted' && (
                <div className="border border-purple-200 p-4 rounded-xl bg-purple-50/30">
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider border-b pb-1.5 mb-2">Sous-traitant</h3>
                  <div>
                    <span className="text-purple-600">Emplacement de sous-traitance:</span>{' '}
                    <span className="font-semibold text-purple-900">{selectedTransformation.subcontractorLocation?.name}</span>
                  </div>
                </div>
              )}

              {/* Outputs */}
              <div className="border border-blue-200 p-4 rounded-xl bg-blue-50/20">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider border-b pb-1.5 mb-2">Sortants (Produits)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-blue-600">Article:</span> <span className="font-medium text-blue-900">{selectedTransformation.outputItem?.name}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Quantité attendue:</span> <span className="font-bold text-blue-900">{selectedTransformation.output_quantity}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Emplacement de stockage:</span> <span className="font-medium text-blue-900">{selectedTransformation.toLocation?.name}</span>
                  </div>
                  {selectedTransformation.outputLot && (
                    <div>
                      <span className="text-blue-600">Lot créé:</span> <span className="font-semibold text-green-700">{selectedTransformation.outputLot?.lot_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t pt-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-semibold shadow"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert */}
      {deleteConfirm && (
        <AlertDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDeleteTransformation(deleteConfirm.id)}
          title="Supprimer l'OF"
          message={`Êtes-vous sûr de vouloir supprimer l'ordre de transformation "${deleteConfirm.reference_number}" ? Cette action relâchera les réservations de stock.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}

      {/* Complete Transformation Confirmation Alert (prompts user name) */}
      {completeConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Finaliser l'Ordre de Transformation</h3>
            <p className="text-sm text-gray-600 mb-4">
              Veuillez saisir votre nom pour valider l'exécution. Cette action va consommer les matières premières et générer le lot fini dans le stock.
            </p>
            <input
              type="text"
              placeholder="Votre nom ou identifiant..."
              value={completerName}
              onChange={(e) => setCompleterName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:ring-2 focus:ring-[#00AABB] focus:border-transparent outline-none"
            />
            <div className="flex justify-end gap-2 text-sm font-semibold">
              <button
                onClick={() => {
                  setCompleteConfirm(null)
                  setCompleterName('')
                }}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmCompletion}
                disabled={!completerName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Valider et Recevoir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Insufficiency Error Dialog */}
      {stockErrorDialog && (
        <AlertDialog
          isOpen={!!stockErrorDialog}
          onClose={() => setStockErrorDialog(null)}
          onConfirm={() => setStockErrorDialog(null)}
          title={stockErrorDialog.title}
          message={stockErrorDialog.message}
          confirmText="Fermer"
        />
      )}
    </div>
  )
}

export default TransformationsManagement
