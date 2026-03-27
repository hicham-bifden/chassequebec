import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import MyList from './pages/MyList';
import ComparePage from './pages/ComparePage';
import LiquidationPage from './pages/LiquidationPage';

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ma-liste" element={<MyList />} />
              <Route path="/comparer" element={<ComparePage />} />
              <Route path="/liquidation" element={<LiquidationPage />} />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
