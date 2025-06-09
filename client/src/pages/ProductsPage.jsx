import React, { useState, useEffect } from 'react'
import { productAPI } from '../utils/api'
import Input from '../components/InputComponent'
import Button from '../components/ButtonComponent'
import AlertDialog from '../components/AlertDialog'

const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    estimated_creation_time: ''
  })

  // Load products on component mount
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productAPI.getProducts()
      setProducts(data)
      setError('')
    } catch (err) {
      setError('Erreur lors du chargement des produits: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      estimated_creation_time: ''
    })
    setEditingProduct(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingProduct) {
        await productAPI.updateProduct(editingProduct.id, formData)
        setSuccess('Produit mis à jour avec succès')
      } else {
        await productAPI.createProduct(formData)
        setSuccess('Produit créé avec succès')
      }
      
      resetForm()
      setShowModal(false)
      loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      estimated_creation_time: product.estimated_creation_time
    })
    setShowModal(true)
  }

  const handleDelete = async (productId) => {
    try {
      await productAPI.deleteProduct(productId)
      setSuccess('Produit supprimé avec succès')
      setDeleteConfirm(null)
      loadProducts()
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message)
    }
  }

  const confirmDelete = (product) => {
    setDeleteConfirm(product)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6  mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gestion des Produits</h1>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          Créer un produit
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Products Table - Desktop View */}
      <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom du produit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Temps de création estimé
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date de création
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.estimated_creation_time} heures
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(product.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => confirmDelete(product)}
                    className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun produit trouvé
          </div>
        )}
      </div>

      {/* Products Cards - Mobile/Tablet View */}
      <div className="lg:hidden space-y-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white shadow-md rounded-lg p-4 border">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {product.estimated_creation_time}h
                  </span>
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">ID:</span> {product.id}</p>
                  <p><span className="font-medium">Temps estimé:</span> {product.estimated_creation_time} heures</p>
                  <p><span className="font-medium">Créé le:</span> {new Date(product.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
              <button
                onClick={() => handleEdit(product)}
                className="flex-1 text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
              >
                Modifier
              </button>
              <button
                onClick={() => confirmDelete(product)}
                className="flex-1 text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-4 py-2 rounded transition-colors text-center text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
        
        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
            Aucun produit trouvé
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 transition-opacity duration-200 ease-out overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto p-5 w-full max-w-md sm:max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Modifier le produit' : 'Créer un produit'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nom du produit"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Entrez le nom du produit"
                  required
                />
                
                <Input
                  label="Temps de création estimé (heures)"
                  type="number"
                  id="estimated_creation_time"
                  value={formData.estimated_creation_time}
                  onChange={handleInputChange}
                  placeholder="Entrez le temps estimé en heures"
                  required
                  min="0"
                  step="0.1"
                />

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1 order-2 sm:order-1">
                    {editingProduct ? 'Mettre à jour' : 'Créer'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="flex-1 order-1 sm:order-2"
                    onClick={() => setShowModal(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer le produit "${deleteConfirm.name}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
        />
      )}
    </div>
  )
}

export default ProductsPage
