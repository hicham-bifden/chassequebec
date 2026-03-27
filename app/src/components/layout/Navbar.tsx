import { NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const { totalItems } = useCart();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 font-bold text-red-600 text-lg">
          🍁 ChasseQuébec
        </NavLink>

        {/* Links */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Circulaires
          </NavLink>
          <NavLink
            to="/comparer"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Comparer
          </NavLink>
          <NavLink
            to="/ma-liste"
            className={({ isActive }) =>
              `relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Ma liste
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
