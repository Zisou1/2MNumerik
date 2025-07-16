import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { orderAPI, productAPI } from '../utils/api'
import Button from './ButtonComponent'
import Input from './InputComponent'
import ClientSearch from './ClientSearch'

const OrderModal = ({ order, onClose, onSave, statusOptions, atelierOptions, etapeOptions, batOptions, expressOptions }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    commercial_en_charge: '',
    infograph_en_charge: '',
    numero_pms: '',
    client: '',
    client_id: null,
    date_limite_livraison_estimee: '',
    date_limite_livraison_attendue: '',
    etape: '',
    option_finition: '',
    atelier_concerne: '',
    statut: 'en_attente',
    commentaires: '',
    estimated_work_time_minutes: '',
    bat: '',
    express: ''
  })
  const [selectedProducts, setSelectedProducts] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [error, setError] = useState('')

  // Get fields visible for current user role
  const getVisibleFields = () => {
    if (user?.role === 'commercial') {
      return {
        commercial_en_charge: true,
        client: true,
        date_limite_livraison_attendue: true,
        products: true,
        statut: true,
        etape: true,
        atelier_concerne: true,
        bat: true,
        express: true,
        // Hide these fields for commercial
        infograph_en_charge: false,
        date_limite_livraison_estimee: false,
        estimated_work_time_minutes: false,
        option_finition: false,
        commentaires: false
      }
    }
    if (user?.role === 'infograph') {
      return {
        client: true,
        products: true,
        statut: true,
        option_finition: true,
        bat: true,
        express: true,
        // Hide these fields for infograph
        commercial_en_charge: false,
        infograph_en_charge: false,
        date_limite_livraison_estimee: false,
        date_limite_livraison_attendue: false,
        etape: false,
        atelier_concerne: false,
        estimated_work_time_minutes: false,
        commentaires: false
      }
    }
    // Default for admin and other roles - show all fields
    return {
      commercial_en_charge: true,
      infograph_en_charge: true,
      client: true,
      date_limite_livraison_estimee: true,
      date_limite_livraison_attendue: true,
      products: true,
      statut: true,
      etape: true,
      atelier_concerne: true,
      estimated_work_time_minutes: true,
      option_finition: true,
      commentaires: true,
      bat: true,
      express: true
    }
  }

  const visibleFields = getVisibleFields()

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true)
        const response = await productAPI.getProducts()
        setAvailableProducts(response.products || [])
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
        infograph_en_charge: order.infograph_en_charge || '',
        numero_pms: order.numero_pms || '',
        client: order.client || '',
        client_id: order.client_id || null,
        date_limite_livraison_estimee: order.date_limite_livraison_estimee ? 
          new Date(order.date_limite_livraison_estimee).toISOString().slice(0, 16) : '',
        date_limite_livraison_attendue: order.date_limite_livraison_attendue ? 
          new Date(order.date_limite_livraison_attendue).toISOString().slice(0, 16) : '',
        etape: order.etape || '',
        option_finition: order.option_finition || '',
        atelier_concerne: order.atelier_concerne || '',
        statut: order.statut || 'en_attente',
        commentaires: order.commentaires || '',
        estimated_work_time_minutes: order.estimated_work_time_minutes || '',
        bat: order.bat || '',
        express: order.express || ''
      })
      
      // Set selected client from order data
      if (order.clientInfo) {
        setSelectedClient(order.clientInfo)
      } else if (order.client && !order.client_id) {
        // For legacy orders that only have client name
        setSelectedClient(null)
      }
      
      // If editing existing order with products, populate selectedProducts
      if (order.products && order.products.length > 0) {
        const orderProducts = order.products.map(product => ({
          productId: product.id,
          quantity: product.orderProduct?.quantity || 1,
          unitPrice: product.orderProduct?.unit_price || null,
          finitions: (user?.role === 'commercial') ? [] : (product.orderProduct?.finitions || [])
        }))
        setSelectedProducts(orderProducts)
      }
    }
  }, [order])

  const addProduct = () => {
    const newProduct = { 
      productId: '', 
      quantity: 1, 
      unitPrice: null, 
      finitions: (user?.role === 'commercial') ? [] : [] // Always initialize as empty array
    }
    setSelectedProducts([...selectedProducts, newProduct])
  }

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
  }

  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedProducts(updated)
  }

  const addFinitionToProduct = (productIndex, finitionId) => {
    // Commercial users cannot add finitions
    if (user?.role === 'commercial') return
    
    // Get the finition from the selected product's available finitions
    const selectedProduct = availableProducts.find(p => p.id === selectedProducts[productIndex].productId)
    const finition = selectedProduct?.finitions?.find(f => f.id === parseInt(finitionId))
    if (!finition) return

    const updated = [...selectedProducts]
    const productFinitions = updated[productIndex].finitions || []
    
    // Check if finition is already added
    if (productFinitions.some(f => f.finition_id === finition.id)) {
      return
    }

    const newFinition = {
      finition_id: finition.id,
      finition_name: finition.name,
      additional_cost: finition.productFinition?.additional_cost || 0,
      additional_time: finition.productFinition?.additional_time || 0
    }

    updated[productIndex] = {
      ...updated[productIndex],
      finitions: [...productFinitions, newFinition]
    }
    setSelectedProducts(updated)
  }

  const getAvailableFinitionsForProduct = (productId) => {
    const product = availableProducts.find(p => p.id === productId)
    return product?.finitions || []
  }

  const removeFinitionFromProduct = (productIndex, finitionId) => {
    // Commercial users cannot remove finitions
    if (user?.role === 'commercial') return
    
    const updated = [...selectedProducts]
    updated[productIndex] = {
      ...updated[productIndex],
      finitions: updated[productIndex].finitions.filter(f => f.finition_id !== finitionId)
    }
    setSelectedProducts(updated)
  }

  const updateProductFinition = (productIndex, finitionId, field, value) => {
    // Commercial users cannot update finitions
    if (user?.role === 'commercial') return
    
    const updated = [...selectedProducts]
    updated[productIndex] = {
      ...updated[productIndex],
      finitions: updated[productIndex].finitions.map(f => 
        f.finition_id === finitionId ? { ...f, [field]: value } : f
      )
    }
    setSelectedProducts(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate client is selected or entered
    if (!selectedClient && !formData.client.trim()) {
      setError('Veuillez sélectionner ou saisir un client')
      setLoading(false)
      return
    }

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
      // Clean up finitions data for commercial users
      const cleanProducts = selectedProducts.map(product => ({
        ...product,
        finitions: (user?.role === 'commercial') ? [] : product.finitions
      }))
      
      const submitData = {
        ...formData,
        client_id: selectedClient?.id || null,
        products: cleanProducts
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

  const handleClientSelect = (client) => {
    setSelectedClient(client)
    if (client) {
      handleChange('client', client.nom)
      if (client.isManual) {
        // For manual input, don't set client_id
        handleChange('client_id', null)
      } else {
        // For database clients, set both client name and ID
        handleChange('client_id', client.id)
      }
    } else {
      handleChange('client', '')
      handleChange('client_id', null)
    }
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
                  
                  <ClientSearch
                    onClientSelect={handleClientSelect}
                    selectedClient={selectedClient}
                  />
                  
                  {visibleFields.commercial_en_charge && (
                    <Input
                      label="Commercial en charge *"
                      value={formData.commercial_en_charge}
                      onChange={(e) => handleChange('commercial_en_charge', e.target.value)}
                      required
                      placeholder="Nom du commercial"
                    />
                  )}
                  
                  {visibleFields.infograph_en_charge && (
                    <Input
                      label="Infographe en charge"
                      value={formData.infograph_en_charge}
                      onChange={(e) => handleChange('infograph_en_charge', e.target.value)}
                      placeholder="Nom de l'infographe"
                    />
                  )}
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
                          <div className={`grid grid-cols-1 gap-4 ${user?.role === 'commercial' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
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
                            {user?.role !== 'commercial' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Finitions
                                </label>
                                <div className="relative">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        addFinitionToProduct(index, parseInt(e.target.value))
                                        e.target.value = '' // Reset dropdown
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    disabled={!product.productId || user?.role === 'infograph'}
                                  >
                                    <option value="">
                                      {!product.productId 
                                        ? "Sélectionnez d'abord un produit" 
                                        : user?.role === 'infograph' 
                                        ? "Finitions (lecture seule)"
                                        : "Ajouter une finition"}
                                    </option>
                                    {product.productId && user?.role !== 'infograph' && getAvailableFinitionsForProduct(product.productId)
                                      .filter(finition => !product.finitions?.some(f => f.finition_id === finition.id))
                                      .map(finition => (
                                        <option key={finition.id} value={finition.id}>
                                          {finition.name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                {product.finitions && product.finitions.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {product.finitions.map((finition) => (
                                      <div key={finition.finition_id} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded text-sm">
                                        <span className="text-green-800">{finition.finition_name}</span>
                                        {user?.role !== 'infograph' && (
                                          <button
                                            type="button"
                                            onClick={() => removeFinitionFromProduct(index, finition.finition_id)}
                                            className="text-red-500 hover:text-red-700 ml-2"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleFields.date_limite_livraison_estimee && (
                    <Input
                      label="Date limite livraison estimée"
                      type="datetime-local"
                      value={formData.date_limite_livraison_estimee}
                      onChange={(e) => handleChange('date_limite_livraison_estimee', e.target.value)}
                    />
                  )}
                  
                  {visibleFields.date_limite_livraison_attendue && (
                    <Input
                      label="Délai souhaité"
                      type="datetime-local"
                      value={formData.date_limite_livraison_attendue}
                      onChange={(e) => handleChange('date_limite_livraison_attendue', e.target.value)}
                    />
                  )}
                  
                  {visibleFields.estimated_work_time_minutes && (
                    <Input
                      label="Temps de travail estimé (en minutes)"
                      type="number"
                      value={formData.estimated_work_time_minutes}
                      onChange={(e) => handleChange('estimated_work_time_minutes', e.target.value)}
                      placeholder="Ex: 180 (pour 3 heures)"
                      min="0"
                    />
                  )}
                  
                  {visibleFields.bat && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        BAT (Bon À Tirer)
                      </label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                          value={formData.bat}
                          onChange={(e) => handleChange('bat', e.target.value)}
                        >
                          <option value="">Sélectionner une option</option>
                          {batOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
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
                  )}
                  
                  {visibleFields.express && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Express
                      </label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white shadow-sm transition-all duration-200 hover:border-gray-400"
                          value={formData.express}
                          onChange={(e) => handleChange('express', e.target.value)}
                        >
                          <option value="">Sélectionner une option</option>
                          {expressOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
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
                  )}
                  
                  {visibleFields.etape && (
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
                  )}
                  
                  {visibleFields.atelier_concerne && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type atelier
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
                  )}
                </div>
              </div>

              {/* Section 4: Options et commentaires */}
              {(visibleFields.option_finition || visibleFields.commentaires) && (
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
                    {visibleFields.option_finition && (
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
                    )}
                    
                    {visibleFields.commentaires && (
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
                    )}
                  </div>
                </div>
              )}

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

export default OrderModal