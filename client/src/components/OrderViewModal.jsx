import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import Button from './ButtonComponent'
import ProgressStepper from './ProgressStepper'
const OrderViewModal = ({ order, onClose, onEdit, formatDate, getStatusBadge, etapeOptions }) => {
  const { user } = useAuth()
  
  // Helper function to check if user can edit orders
  const canEditOrders = () => {
    return user && (user.role === 'admin' || user.role === 'commercial')
  }
  
  // Helper function to get visible fields based on user role
  const getVisibleViewFields = () => {
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
        option_finition: false,
        commentaires: false
      }
    }
    if (user?.role === 'infograph') {
      return {
        nom_client: true,
        produits: true,
        quantite: true,
        statut: true,
        option_finition: true,
        bat: true,
        express: true,
        // Hide these fields for infograph
        code_client: false,
        numero_affaire: false,
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
      commentaires: true,
      bat: true,
      express: true
    }
  }

  const visibleViewFields = getVisibleViewFields()

  // Define the steps for the progress stepper based on etapeOptions
  const steps = etapeOptions.map(etape => ({
    key: etape,
    label: etape === 'pré-presse' ? 'Pré-presse' : etape.charAt(0).toUpperCase() + etape.slice(1)
  }));

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
                {canEditOrders() && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all duration-200 group border border-white/20 backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modifier
                  </button>
                )}
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

          {/* Progress Stepper */}
          <ProgressStepper currentStep={order.etape} steps={steps} />

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
                      <span className="text-gray-900">
                        {order.clientInfo ? order.clientInfo.nom : order.client}
                        {!order.clientInfo && order.client && (
                          <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                            Texte libre
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                      <span className="font-medium text-gray-700">Commercial:</span>
                      <span className="text-gray-900">{order.commercial_en_charge}</span>
                    </div>
                    {visibleViewFields.infograph_en_charge && (
                      <div className="flex justify-between items-center py-2 border-b border-blue-200/50">
                        <span className="font-medium text-gray-700">Infographe:</span>
                        <span className="text-gray-900">{order.infograph_en_charge || '-'}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">Statut:</span>
                      <div>{getStatusBadge(order.statut)}</div>
                    </div>
                  </div>
                </div>

                {/* Client Information Section */}
                {order.clientInfo && (
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-cyan-100 rounded-lg shadow-sm border border-cyan-200">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800">Informations client</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-cyan-200/50">
                        <span className="font-medium text-gray-700">Nom:</span>
                        <span className="text-gray-900 font-semibold">{order.clientInfo.nom}</span>
                      </div>
                      {order.clientInfo.code_client && (
                        <div className="flex justify-between items-center py-2 border-b border-cyan-200/50">
                          <span className="font-medium text-gray-700">Code client:</span>
                          <span className="text-gray-900">{order.clientInfo.code_client}</span>
                        </div>
                      )}
                      {order.clientInfo.numero_affaire && (
                        <div className="flex justify-between items-center py-2 border-b border-cyan-200/50">
                          <span className="font-medium text-gray-700">Numéro d'affaire:</span>
                          <span className="text-gray-900">{order.clientInfo.numero_affaire}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-cyan-200/50">
                        <span className="font-medium text-gray-700">Email:</span>
                        <span className="text-gray-900">{order.clientInfo.email}</span>
                      </div>
                      {order.clientInfo.telephone && (
                        <div className="flex justify-between items-center py-2 border-b border-cyan-200/50">
                          <span className="font-medium text-gray-700">Téléphone:</span>
                          <span className="text-gray-900">{order.clientInfo.telephone}</span>
                        </div>
                      )}
                      {order.clientInfo.adresse && (
                        <div className="flex justify-between items-center py-2 border-b border-cyan-200/50">
                          <span className="font-medium text-gray-700">Adresse:</span>
                          <span className="text-gray-900">{order.clientInfo.adresse}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                          order.clientInfo.type_client === 'entreprise' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : order.clientInfo.type_client === 'association'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {order.clientInfo.type_client}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

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
                    {visibleViewFields.option_finition && (
                      <div className="py-2 border-t border-green-200/50">
                        <span className="font-medium text-gray-700 block mb-2">Options de finition:</span>
                        <p className="text-gray-900 bg-white p-3 rounded-lg border border-green-200/50">
                          {order.option_finition || '-'}
                        </p>
                      </div>
                    )}
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
                    {visibleViewFields.etape && (
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="font-medium text-gray-700">Étape actuelle:</span>
                        <span className="text-gray-900 bg-white px-3 py-1 rounded-full border border-purple-200/50 font-medium">
                          {order.etape || '-'}
                        </span>
                      </div>
                    )}
                    {visibleViewFields.atelier_concerne && (
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="font-medium text-gray-700">Type atelier:</span>
                        <span className="text-gray-900">{order.atelier_concerne || '-'}</span>
                      </div>
                    )}
                    {visibleViewFields.date_limite_livraison_estimee && (
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="font-medium text-gray-700">Livraison estimée:</span>
                        <span className="text-gray-900">{formatDate(order.date_limite_livraison_estimee)}</span>
                      </div>
                    )}
                    {visibleViewFields.date_limite_livraison_attendue && (
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="font-medium text-gray-700">Délai souhaité:</span>
                        <span className="text-gray-900">{formatDate(order.date_limite_livraison_attendue)}</span>
                      </div>
                    )}
                    {visibleViewFields.estimated_work_time_minutes && order.estimated_work_time_minutes && (
                      <div className="flex justify-between items-center py-2">
                        <span className="font-medium text-gray-700">Temps de travail estimé:</span>
                        <span className="text-gray-900">{Math.round(order.estimated_work_time_minutes / 60 * 10) / 10}h ({order.estimated_work_time_minutes} min)</span>
                      </div>
                    )}
                    {visibleViewFields.bat && order.bat && (
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="font-medium text-gray-700">BAT:</span>
                        <span className="text-gray-900 bg-white px-3 py-1 rounded-full border border-purple-200/50 font-medium capitalize">
                          {order.bat}
                        </span>
                      </div>
                    )}
                    {visibleViewFields.express && order.express && (
                      <div className="flex justify-between items-center py-2 border-b border-purple-200/50">
                        <span className="font-medium text-gray-700">Express:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                          order.express === 'oui' 
                            ? 'bg-red-100 text-red-800 border border-red-200' 
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {order.express}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information Section */}
                {visibleViewFields.commentaires && (
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
                )}
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
              {canEditOrders() && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderViewModal