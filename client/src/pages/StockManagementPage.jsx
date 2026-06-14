import { useState, useEffect } from 'react'
import ItemsManagement from '../components/ItemsManagement'
import LocationsManagement from '../components/LocationsManagement'
import TransactionsManagement from '../components/TransactionsManagement'
import LotsManagement from '../components/LotsManagement'
import TransformationsManagement from '../components/TransformationsManagement'
import { stockAPI } from '../utils/api'

function StockManagementPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Overview Tab Pagination, Search & Matrix Data
  const [overviewPage, setOverviewPage] = useState(1)
  const [overviewTotalPages, setOverviewTotalPages] = useState(1)
  const [overviewTotalItems, setOverviewTotalItems] = useState(0)
  const [overviewSearch, setOverviewSearch] = useState('')
  const [overviewLocations, setOverviewLocations] = useState([])
  const [overviewItems, setOverviewItems] = useState([])
  const [overviewSummary, setOverviewSummary] = useState({
    totalItems: 0,
    totalLocations: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    totalQuantity: 0
  })
  
  // Lot Details Modal
  const [showLotModal, setShowLotModal] = useState(false)
  const [lotModalData, setLotModalData] = useState(null)
  const [lotModalLoading, setLotModalLoading] = useState(false)

  // Generate and print physical inventory sheet
  const handlePrintInventory = async () => {
    try {
      setLoading(true)
      const data = await stockAPI.getStockMatrix({ page: '1', limit: '10000' })
      const items = data.items || []
      const locations = data.locations || []

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Veuillez autoriser les fenêtres pop-up pour imprimer la fiche d\'inventaire.')
        return
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Inventaire Physique - Stock</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
            @page {
              size: landscape;
              margin: 1.2cm;
            }
            body {
              font-family: 'Poppins', sans-serif;
              color: #1a1a1a;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.4;
            }
            .header {
              margin-bottom: 20px;
              border-bottom: 3px solid #00AABB;
              padding-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header h1 {
              margin: 0;
              font-size: 22px;
              color: #008899;
              text-transform: uppercase;
              font-weight: 700;
            }
            .header-date {
              font-size: 12px;
              color: #666;
              font-weight: 500;
            }
            .meta-section {
              width: 100%;
              margin-bottom: 25px;
              border-collapse: collapse;
            }
            .meta-section td {
              padding: 6px 4px;
              font-size: 11px;
              vertical-align: middle;
            }
            .meta-section td.label {
              font-weight: 600;
              color: #444;
              width: 12%;
            }
            .meta-section td.value {
              border-bottom: 1px solid #ccc;
              width: 38%;
              padding-left: 8px;
            }
            table.stock-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            table.stock-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            table.stock-table th {
              border: 1.5px solid #444;
              background-color: #f5f5f5;
              color: #111;
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              padding: 8px 4px;
              text-align: center;
            }
            table.stock-table td {
              border: 1.5px solid #666;
              padding: 8px 10px;
              vertical-align: middle;
            }
            table.stock-table td.item-name {
              font-weight: 600;
              color: #111;
              font-size: 11px;
            }
            table.stock-table td.item-desc {
              font-size: 9px;
              color: #666;
              font-weight: normal;
            }
            table.stock-table td.qty-cell {
              text-align: center;
              font-weight: 500;
              width: 60px;
              background-color: #fafafa;
            }
            table.stock-table td.blank-cell {
              background-color: #fff;
              width: 75px;
              border: 2px solid #222;
            }
            table.stock-table td.total-cell {
              font-weight: bold;
              background-color: #f0f0f0;
            }
            .footer-section {
              margin-top: 45px;
              width: 100%;
              page-break-inside: avoid;
            }
            .instructions {
              float: left;
              width: 50%;
              font-size: 10px;
              color: #555;
              line-height: 1.5;
            }
            .instructions strong {
              color: #333;
            }
            .signature-box {
              float: right;
              width: 40%;
              border: 1px solid #999;
              border-radius: 4px;
              padding: 12px;
              height: 70px;
            }
            .signature-title {
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              color: #444;
              margin-bottom: 35px;
            }
            .signature-line {
              border-top: 1px dashed #999;
              width: 100%;
            }
            .clear {
              clear: both;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fiche d'Inventaire Physique</h1>
            <div class="header-date">Document d'inventaire mensuel</div>
          </div>
          
          <table class="meta-section">
            <tr>
              <td class="label">Date d'inventaire :</td>
              <td class="value">${new Date().toLocaleDateString('fr-FR')}</td>
              <td class="label">Opérateur / Compteur :</td>
              <td class="value"></td>
            </tr>
            <tr>
              <td class="label">Date d'impression :</td>
              <td class="value">${new Date().toLocaleString('fr-FR')}</td>
              <td class="label">Visa Superviseur :</td>
              <td class="value"></td>
            </tr>
          </table>
          
          <table class="stock-table">
            <thead>
              <tr>
                <th rowspan="2" style="text-align: left;">Article</th>
                ${locations.map(loc => `<th colspan="2">${loc.name}</th>`).join('')}
                <th colspan="2">Total Général</th>
              </tr>
              <tr>
                ${locations.map(() => `<th>Système</th><th>Réel</th>`).join('')}
                <th>Système</th><th>Réel</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const totalSys = Object.values(item.locations).reduce((sum, loc) => sum + (loc.quantity || 0), 0);
                return `
                  <tr>
                    <td class="item-name">
                      ${item.name}
                      ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                    </td>
                    ${locations.map(loc => {
                      const stock = item.locations[loc.id];
                      const sysQty = stock ? stock.quantity : 0;
                      return `
                        <td class="qty-cell">${sysQty}</td>
                        <td class="blank-cell"></td>
                      `;
                    }).join('')}
                    <td class="qty-cell total-cell">${totalSys}</td>
                    <td class="blank-cell" style="border: 2px solid #000;"></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer-section">
            <div class="instructions">
              <strong>Instructions pour l'inventaire physique :</strong><br/>
              1. Pour chaque article, comptez physiquement les pièces dans chaque emplacement.<br/>
              2. Notez lisiblement la quantité réelle constatée dans la case <strong>"Réel"</strong> (stylo noir/bleu).<br/>
              3. Si un article est absent d'un emplacement, notez <strong>"0"</strong> (ne laissez pas la case vide).<br/>
              4. Une fois l'inventaire terminé, signez et remettez ce document à votre responsable.
            </div>
            <div class="signature-box">
              <div class="signature-title">Signature de l'Opérateur & Date</div>
              <div class="signature-line"></div>
            </div>
            <div class="clear"></div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
        </html>
      `

      printWindow.document.write(html)
      printWindow.document.close()
    } catch (err) {
      console.error('Error fetching inventory for print:', err)
      alert('Erreur lors du chargement des données pour impression')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get location icon based on type
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

  // Fetch stock overview data
  const fetchStockOverview = async (page = overviewPage, search = overviewSearch) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      }
      
      const data = await stockAPI.getStockMatrix(params)
      setOverviewItems(data.items || [])
      setOverviewLocations(data.locations || [])
      setOverviewTotalItems(data.totalCount || 0)
      setOverviewTotalPages(data.totalPages || 1)
      setOverviewSummary(data.summary || {
        totalItems: 0,
        totalLocations: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
        totalQuantity: 0
      })
      setOverviewPage(page)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching stock overview:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch lot details for a specific item and location
  const fetchLotDetails = async (itemId, locationId) => {
    try {
      setLotModalLoading(true)
      setShowLotModal(true)
      
      console.log('Fetching lot details for:', { itemId, locationId, itemType: typeof itemId, locationIdType: typeof locationId })
      
      // First get item info
      const itemData = await stockAPI.getItem(itemId)
      
      // Get location info 
      const locationData = await stockAPI.getLocation(locationId)
      
      // Get lots for this item - note: the API returns array directly, not wrapped in object
      const allLots = await stockAPI.getLotsForItem(itemId)
      
      // Filter lots that are in this location and have quantity > 0
      const relevantLots = allLots.filter(lot => 
        lot.lotLocations?.some(lotLoc => 
          lotLoc.location_id == locationId && lotLoc.quantity > 0  // Use == for type coercion
        )
      ) || []
      
      console.log('Debug - All lots for item:', allLots)
      console.log('Debug - Relevant lots for location:', relevantLots)
      console.log('Debug - Looking for location ID:', locationId, 'type:', typeof locationId)
      
      setLotModalData({
        item: itemData,
        location: locationData,
        lots: relevantLots
      })
    } catch (err) {
      console.error('Error fetching lot details:', err)
      setError('Erreur lors du chargement des détails des lots')
    } finally {
      setLotModalLoading(false)
    }
  }

  // Load stock data when overview tab is active or pagination changes
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStockOverview(overviewPage, overviewSearch)
    }
  }, [activeTab, overviewPage])

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: '📊' },
    { id: 'items', name: 'Articles', icon: '📦' },
    { id: 'locations', name: 'Emplacements', icon: '📍' },
    { id: 'lots', name: 'Lots', icon: '🏷️' },
    { id: 'transactions', name: 'Transaction', icon: '📝' },
    { id: 'transformations', name: 'Transformations', icon: '⚙️' },
    { id: 'alerts', name: 'Alertes', icon: '⚠️' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Vue d'ensemble du stock</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Total Articles</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {overviewSummary.totalItems || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Emplacements</p>
                    <p className="text-2xl font-bold text-green-900">
                      {overviewSummary.totalLocations || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-2xl">🚫</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">Rupture Stock</p>
                    <p className="text-2xl font-bold text-red-900">
                      {overviewSummary.outOfStockCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Stock Faible</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {overviewSummary.lowStockCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Quantité Totale</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {overviewSummary.totalQuantity || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar for Stock Matrix */}
            <div className="mb-6">
              <form onSubmit={(e) => { e.preventDefault(); fetchStockOverview(1, overviewSearch); }} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Rechercher un article..."
                  value={overviewSearch}
                  onChange={(e) => {
                    setOverviewSearch(e.target.value);
                    if (e.target.value === '') {
                      fetchStockOverview(1, '');
                    }
                  }}
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

            {/* Stock Table Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Tableau des Stocks
              </h3>

              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00AABB]"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  Erreur lors du chargement: {error}
                </div>
              ) : overviewLocations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <span className="text-6xl">📦</span>
                  <p className="text-gray-500 mt-4">Aucune donnée de stock disponible</p>
                  <p className="text-sm text-gray-400 mt-2">Créez des articles et des emplacements pour voir les niveaux de stock</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Enhanced Table Header */}
                  <div className="bg-gradient-to-r from-[#00AABB] to-[#008899] px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <span className="text-white text-xl">📊</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Tableau des Stocks</h3>
                          <p className="text-white/80 text-sm">Vue détaillée par emplacement</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 text-white/90 text-sm">
                        <button
                          onClick={handlePrintInventory}
                          className="flex items-center space-x-2 bg-white text-[#008899] hover:bg-white/95 px-3 py-1.5 rounded-lg font-semibold shadow transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                          title="Imprimer la fiche d'inventaire physique"
                        >
                          <span>🖨️</span>
                          <span>Imprimer l'Inventaire</span>
                        </button>
                        <span className="bg-white/20 px-3 py-1.5 rounded-lg">
                          {overviewTotalItems} articles
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr className="border-b border-gray-300">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10 shadow-sm border-r border-gray-200">
                            <div className="flex items-center space-x-2">
                              <span>📦</span>
                              <span>Article</span>
                            </div>
                          </th>
                          {overviewLocations.map(location => (
                            <th key={location.id} className="px-3 py-3 text-center text-sm font-semibold text-gray-700 min-w-28 border-r border-gray-200">
                              <div className="flex flex-col items-center space-y-1">
                                <div className="p-1 bg-white rounded-lg shadow-sm border">
                                  <span className="text-lg">{getLocationIcon(location.type)}</span>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-gray-800 text-xs">{location.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {getLocationTypeLabel(location.type)}
                                  </div>
                                </div>
                              </div>
                            </th>
                          ))}
                          <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700">
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-lg">🎯</span>
                              <span className="text-xs">Total</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {overviewItems.length === 0 ? (
                          <tr>
                            <td colSpan={overviewLocations.length + 2} className="px-4 py-12 text-center border-b border-gray-200">
                              <div className="flex flex-col items-center space-y-3">
                                <div className="p-4 bg-gray-100 rounded-full">
                                  <span className="text-3xl text-gray-400">📦</span>
                                </div>
                                <p className="text-gray-500 font-medium">Aucun article trouvé</p>
                                <p className="text-gray-400 text-sm">Ajoutez des articles pour voir les niveaux de stock</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          overviewItems.map((item, idx) => {
                            const totalQuantity = Object.values(item.locations).reduce((sum, loc) => sum + (loc.quantity || 0), 0)
                            const totalAvailable = Object.values(item.locations).reduce((sum, loc) => sum + (loc.available_quantity !== undefined ? loc.available_quantity : (loc.quantity || 0)), 0)
                            const totalReserved = Object.values(item.locations).reduce((sum, loc) => sum + (loc.reserved_quantity || 0), 0)
                            const hasOutOfStock = Object.values(item.locations).some(loc => loc.quantity === 0)
                            const hasLowStock = Object.values(item.locations).some(loc => loc.isLowStock)
                            
                            return (
                              <tr key={item.id} className={`
                                ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                                hover:bg-blue-50/50 transition-colors duration-200 border-b border-gray-200
                              `}>
                                <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 shadow-sm border-r border-gray-200">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                                        <span className="text-blue-600 font-bold text-xs">
                                          {item.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                        {!hasOutOfStock && hasLowStock && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            ⚠️
                                          </span>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-xs text-gray-500 truncate max-w-48">{item.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {overviewLocations.map(location => {
                                  const stockData = item.locations[location.id]
                                  
                                  return (
                                    <td key={location.id} className="px-3 py-2.5 text-center border-r border-gray-200">
                                      {stockData ? (
                                        <button
                                          onClick={() => fetchLotDetails(item.id, location.id)}
                                          className="flex flex-col items-center space-y-1 hover:bg-blue-50 p-1 rounded-lg transition-colors duration-200 w-full"
                                          title={`Disponible: ${stockData.available_quantity} | Réservé: ${stockData.reserved_quantity} | Physique: ${stockData.quantity} (Cliquez pour voir les détails)`}
                                        >
                                          <div className={`
                                            inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm transition-transform hover:scale-105
                                            ${stockData.available_quantity === 0
                                              ? 'bg-red-100 text-red-700 border border-red-300' 
                                              : stockData.isLowStock 
                                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                              : 'bg-green-100 text-green-700 border border-green-300'
                                            }
                                          `}>
                                            {stockData.available_quantity}
                                          </div>
                                          {stockData.reserved_quantity > 0 ? (
                                            <div className="flex flex-col space-y-0.5 w-full items-center">
                                              <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1 py-0.5 rounded leading-none w-11/12 text-center border border-blue-200" title="Réservé">
                                                Rés: {stockData.reserved_quantity}
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                              min: {stockData.minimum_quantity}
                                            </div>
                                          )}
                                        </button>
                                      ) : (
                                        <div className="flex flex-col items-center">
                                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                            <span className="text-gray-400 text-sm">-</span>
                                          </div>
                                          <span className="text-xs text-gray-400 mt-1">N/A</span>
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex flex-col items-center space-y-1">
                                    <div className="inline-flex items-center justify-center w-12 h-10 rounded-lg bg-gradient-to-br from-[#00AABB] to-[#008899] text-white font-bold text-sm shadow-sm" title={`Disponible: ${totalAvailable} | Réservé: ${totalReserved} | Physique: ${totalQuantity}`}>
                                      {totalAvailable}
                                    </div>
                                    {totalReserved > 0 ? (
                                      <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1 py-0.5 rounded border border-blue-200" title="Total Réservé">
                                        Rés: {totalReserved}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-500 font-medium">Total</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Enhanced Table Footer / Pagination */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="font-medium">{overviewTotalItems}</span>
                          <span>articles au total</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium">{overviewSummary.totalQuantity}</span>
                          <span>unités au total</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* Stock Status Indicators */}
                        <div className="flex items-center space-x-3 text-xs mr-4">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                            <span className="text-gray-600">Stock OK</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
                            <span className="text-gray-600">Stock faible</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                            <span className="text-gray-600">Rupture</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pagination Controls */}
                    {overviewTotalPages > 1 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-sm text-gray-600">
                          Affichage {((overviewPage - 1) * 10) + 1} à {Math.min(overviewPage * 10, overviewTotalItems)} sur {overviewTotalItems} articles
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => { if (overviewPage > 1) fetchStockOverview(overviewPage - 1, overviewSearch); }}
                            disabled={overviewPage === 1}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Précédent
                          </button>
                          
                          <div className="flex space-x-1">
                            {Array.from({ length: Math.min(5, overviewTotalPages) }, (_, i) => {
                              let pageNum;
                              if (overviewTotalPages <= 5) {
                                pageNum = i + 1;
                              } else if (overviewPage <= 3) {
                                pageNum = i + 1;
                              } else if (overviewPage >= overviewTotalPages - 2) {
                                pageNum = overviewTotalPages - 4 + i;
                              } else {
                                pageNum = overviewPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => fetchStockOverview(pageNum, overviewSearch)}
                                  className={`px-3 py-1 text-sm border rounded-md ${
                                    overviewPage === pageNum
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
                            onClick={() => { if (overviewPage < overviewTotalPages) fetchStockOverview(overviewPage + 1, overviewSearch); }}
                            disabled={overviewPage === overviewTotalPages}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Suivant
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'items':
        return <ItemsManagement />

      case 'locations':
        return <LocationsManagement />

      case 'lots':
        return <LotsManagement />

      case 'transactions':
        return <TransactionsManagement />

      case 'transformations':
        return <TransformationsManagement />

      case 'alerts':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Alertes de Stock</h2>
            
            <div className="text-center py-12">
              <span className="text-6xl">✅</span>
              <p className="text-gray-500 mt-4">Aucune alerte active</p>
              <p className="text-sm text-gray-400 mt-2">Les alertes de stock faible apparaîtront ici</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion de Stock</h1>
        <p className="text-gray-600 mt-1">Gérez vos articles, emplacements et transactions de stock</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-[#00AABB] text-[#00AABB]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
      
      {/* Lot Details Modal */}
      {showLotModal && (
        <LotDetailsModal 
          isOpen={showLotModal}
          onClose={() => {
            setShowLotModal(false)
            setLotModalData(null)
          }}
          data={lotModalData}
          loading={lotModalLoading}
        />
      )}
    </div>
  )
}

// LotDetailsModal Component
function LotDetailsModal({ isOpen, onClose, data, loading }) {
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
      'quarantine': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Quarantaine' }
    }
    const config = statusConfig[status] || statusConfig['active']
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false
    const expDate = new Date(expirationDate)
    const today = new Date()
    const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
    return daysDiff <= 30 && daysDiff > 0
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#00AABB] to-[#008899] px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <span className="text-white text-xl">📦</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Détails des Lots</h2>
                <p className="text-white/80 text-sm">
                  {loading ? 'Chargement...' : `${data?.item?.name || ''} - ${data?.location?.name || ''}`}
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
              {/* Summary Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Item Info */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-blue-600 text-xl">📦</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Article</h3>
                      <p className="text-blue-700 text-sm">{data.item?.name}</p>
                    </div>
                  </div>
                  {data.item?.description && (
                    <p className="text-blue-600 text-sm">{data.item.description}</p>
                  )}
                </div>

                {/* Location Info */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <span className="text-green-600 text-xl">{getLocationIcon(data.location?.type)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">Emplacement</h3>
                      <p className="text-green-700 text-sm">{data.location?.name}</p>
                    </div>
                  </div>
                  <p className="text-green-600 text-sm capitalize">{data.location?.type?.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Lots Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🏷️</span>
                  Lots disponibles ({data.lots?.length || 0})
                </h3>

                {data.lots && data.lots.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Numéro de Lot
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantité
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fournisseur
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dates
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statut
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.lots.map(lot => {
                          // Find the quantity for this specific location
                          const locationQuantity = lot.lotLocations?.find(
                            lotLoc => lotLoc.location_id == data.location.id  // Use == for type coercion
                          )?.quantity || 0

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
                                <div className="flex items-center space-x-2">
                                  <span className={`
                                    inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                                    ${locationQuantity === 0
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                    }
                                  `}>
                                    {locationQuantity}
                                  </span>
                                  <span className="text-gray-500 text-sm">/ {lot.initial_quantity}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-gray-900">{lot.supplier?.nom || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm">
                                  {lot.manufacturing_date && (
                                    <div className="text-gray-600">
                                      📅 Fab: {new Date(lot.manufacturing_date).toLocaleDateString('fr-FR')}
                                    </div>
                                  )}
                                  {lot.expiration_date && (
                                    <div className={`
                                      ${isExpiringSoon(lot.expiration_date) ? 'text-orange-600' : 'text-gray-600'}
                                    `}>
                                      ⏰ Exp: {new Date(lot.expiration_date).toLocaleDateString('fr-FR')}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getStatusBadge(lot.status)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-6xl mb-4 block">📦</span>
                    <p className="text-gray-500 font-medium">Aucun lot trouvé</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Aucun lot disponible pour cet article dans cet emplacement
                    </p>
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              {data.lots && data.lots.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {data.lots.reduce((total, lot) => {
                        const qty = lot.lotLocations?.find(
                          lotLoc => lotLoc.location_id == data.location.id  // Use == for type coercion
                        )?.quantity || 0
                        return total + qty
                      }, 0)}
                    </div>
                    <div className="text-sm text-gray-500">Quantité totale</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {data.lots.filter(lot => lot.status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-500">Lots actifs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {data.lots.filter(lot => isExpiringSoon(lot.expiration_date)).length}
                    </div>
                    <div className="text-sm text-gray-500">Expirent bientôt</div>
                  </div>
                </div>
              )}
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
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockManagementPage