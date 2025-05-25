import logoPrimary from '../assets/logoprimary.png'

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Sidebar */}
      <aside className={`bg-white shadow-md w-64 fixed left-0 top-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <a href="/">
                <img src={logoPrimary} alt="Logo" className="w-32 h-16"/>
              </a>
            </li>
            <li>
              <a href="/" className="block px-2 py-2 text-gray-700 hover:bg-gray-100 rounded">
                Dashboard
              </a>
            </li>
            <li>
              <a href="#" className="block px-2 py-2 text-gray-700 hover:bg-gray-100 rounded">
                Profile
              </a>
            </li>
            <li>
              <a href="#" className="block px-2 py-2 text-gray-700 hover:bg-gray-100 rounded">
                Settings
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        ></div>
      )}
    </>
  )
}

export default Sidebar
