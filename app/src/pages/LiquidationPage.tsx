import { useState, useEffect, useMemo } from 'react';
import { fetchLiquidation, type LiquidationDeal } from '../services/api';
import { useCart } from '../context/CartContext';
import type { Deal } from '../types';

// Coordonnées approximatives des magasins scrappés
const STORE_COORDS: Record<string, { lat: number; lng: number }> = {
  iga:    { lat: 45.5231, lng: -73.6118 },  // IGA Côte-des-Neiges
  maxi:   { lat: 45.5646, lng: -73.7418 },  // Maxi Laval
  metro:  { lat: 45.4765, lng: -73.6243 },  // Metro Plus Domaine, Montréal
  superc: { lat: 45.5088, lng: -73.5878 },  // Super C Rosemont
  costco: { lat: 45.4617, lng: -73.6433 },  // Costco Montréal
};

const STORE_COLORS: Record<string, string> = {
  iga: 'bg-red-600', maxi: 'bg-yellow-500', metro: 'bg-teal-500',
  superc: 'bg-orange-500', costco: 'bg-blue-700',
};

// 3 niveaux de liquidation
const TIERS = [
  {
    id: 'rouge',
    label: 'Liquidation',
    emoji: '🔴',
    min: 80, max: 100,
    headerBg: 'bg-red-600',
    sectionBg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-600 text-white',
    desc: 'Prix historiquement bas + mots-clés liquidation',
  },
  {
    id: 'orange',
    label: 'Bon Deal',
    emoji: '🟠',
    min: 50, max: 79,
    headerBg: 'bg-orange-500',
    sectionBg: 'bg-orange-50',
    border: 'border-orange-200',
    badgeBg: 'bg-orange-500 text-white',
    desc: 'Réduction importante ou confirmée par l\'historique',
  },
  {
    id: 'verte',
    label: 'Bonne Affaire',
    emoji: '🟢',
    min: 20, max: 49,
    headerBg: 'bg-green-600',
    sectionBg: 'bg-green-50',
    border: 'border-green-200',
    badgeBg: 'bg-green-600 text-white',
    desc: 'Réduction ≥ 30% sur le prix régulier',
  },
] as const;

// Calcul de distance Haversine (km)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceTo(storeId: string, userPos: { lat: number; lng: number } | null): string | null {
  if (!userPos) return null;
  const coords = STORE_COORDS[storeId];
  if (!coords) return null;
  const km = haversineKm(userPos.lat, userPos.lng, coords.lat, coords.lng);
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Page principale
// ──────────────────────────────────────────────────────────────────────────────
export default function LiquidationPage() {
  const [deals, setDeals]               = useState<LiquidationDeal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [userPos, setUserPos]           = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError]         = useState<string | null>(null);
  const [geoLoading, setGeoLoading]     = useState(false);
  const [radius, setRadius]             = useState(15);

  useEffect(() => {
    fetchLiquidation()
      .then(setDeals)
      .catch(() => setError('Impossible de charger les liquidations. Vérifiez que le serveur tourne.'))
      .finally(() => setLoading(false));
  }, []);

  function requestGeolocation() {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée par ce navigateur.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        setGeoError(null);
      },
      () => {
        setGeoError('Permission refusée ou position indisponible.');
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  }

  // Filtre par rayon si géolocalisation active
  const filteredDeals = useMemo(() => {
    if (!userPos) return deals;
    return deals.filter(deal => {
      const coords = STORE_COORDS[deal.store_id];
      if (!coords) return true;
      return haversineKm(userPos.lat, userPos.lng, coords.lat, coords.lng) <= radius;
    });
  }, [deals, userPos, radius]);

  const totalVisible = filteredDeals.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Liquidations</h1>
        <p className="text-gray-500 mt-1">
          Algorithme sur 100 pts : rabais vs historique · mots-clés · stock limité
        </p>
      </div>

      {/* Légende des tiers */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {TIERS.map(tier => (
          <div key={tier.id} className={`rounded-xl p-3 border ${tier.sectionBg} ${tier.border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.badgeBg}`}>
                {tier.emoji} {tier.label}
              </span>
              <span className="text-xs text-gray-500">{tier.min}–{tier.max} pts</span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">{tier.desc}</p>
          </div>
        ))}
      </div>

      {/* Géolocalisation */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={requestGeolocation}
            disabled={geoLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {geoLoading ? 'Localisation…' : userPos ? '📍 Relocaliser' : '📍 Filtrer par proximité'}
          </button>

          {userPos && (
            <div className="flex items-center gap-3 flex-1 min-w-48">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                Rayon : <strong>{radius} km</strong>
              </label>
              <input
                type="range" min={5} max={25} step={5} value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="flex-1 accent-red-600"
              />
            </div>
          )}

          {geoError && <p className="text-sm text-orange-600">{geoError}</p>}

          {userPos && (
            <p className="text-xs text-gray-400 ml-auto">
              {totalVisible} offre{totalVisible !== 1 ? 's' : ''} dans un rayon de {radius} km
              {' '}· <button
                className="underline hover:text-gray-600"
                onClick={() => setUserPos(null)}
              >Retirer le filtre</button>
            </p>
          )}
        </div>

        {/* Distances aux magasins */}
        {userPos && (
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.entries(STORE_COORDS).map(([id, coords]) => {
              const km = haversineKm(userPos.lat, userPos.lng, coords.lat, coords.lng);
              const inRange = km <= radius;
              return (
                <div
                  key={id}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    ${inRange ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${inRange ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="capitalize">{id}</span>
                  <span>{km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Erreur API */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Skeleton chargement initial */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 h-56 animate-pulse">
              <div className="h-6 bg-gray-200 rounded-t-xl" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-8 bg-gray-100 rounded w-1/3 mt-4" />
                <div className="h-8 bg-gray-200 rounded-lg mt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* État vide */}
      {!loading && totalVisible === 0 && (
        <div className="text-center py-20 text-gray-300">
          <p className="text-6xl mb-4">🏷️</p>
          <p className="text-lg text-gray-400">
            {userPos
              ? `Aucune liquidation dans un rayon de ${radius} km`
              : 'Aucune liquidation détectée cette semaine'}
          </p>
          <p className="text-sm mt-2 text-gray-300">
            Les deals apparaissent en Bonne Affaire (score 20–49) quand la réduction dépasse 30%.
          </p>
        </div>
      )}

      {/* Sections par tier */}
      {!loading && TIERS.map(tier => {
        const tierDeals = filteredDeals.filter(
          d => d.score >= tier.min && d.score <= tier.max
        );
        if (tierDeals.length === 0) return null;
        return (
          <section key={tier.id} className="mb-10">
            <div className={`flex items-center gap-3 mb-4 px-4 py-3 rounded-xl ${tier.sectionBg} border ${tier.border}`}>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${tier.badgeBg}`}>
                {tier.emoji} {tier.label}
              </span>
              <span className="text-sm font-semibold text-gray-700">{tier.min}–{tier.max} pts</span>
              <span className="text-sm text-gray-400 ml-auto">
                {tierDeals.length} offre{tierDeals.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tierDeals.map(deal => (
                <LiquidationCard key={deal.id} deal={deal} userPos={userPos} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Carte d'un deal liquidation
// ──────────────────────────────────────────────────────────────────────────────
interface LiquidationCardProps {
  deal:    LiquidationDeal;
  userPos: { lat: number; lng: number } | null;
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-red-600 text-white';
  if (score >= 50) return 'bg-orange-500 text-white';
  return 'bg-green-600 text-white';
}

function LiquidationCard({ deal, userPos }: LiquidationCardProps) {
  const { addItem, items } = useCart();
  const inCart = items.some(i => i.deal.id === deal.id);
  const dist   = distanceTo(deal.store_id, userPos);
  const saving = Number(deal.saving_pct);

  function toDeal(): Deal {
    return {
      id:           deal.id,
      name:         deal.name,
      store:        deal.store_name as Deal['store'],
      category:     (deal.category_label ?? deal.category_id) as Deal['category'],
      regularPrice: Number(deal.regular_price),
      salePrice:    Number(deal.sale_price),
      unit:         deal.unit ?? '',
      validUntil:   deal.valid_until ?? '',
      imageUrl:     deal.image_url   || undefined,
      productUrl:   deal.product_url || undefined,
      unitPrice:    deal.unit_price  ?? undefined,
      unitLabel:    deal.unit_label  ?? undefined,
    };
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">

      {/* Badge magasin + score */}
      <div className={`${STORE_COLORS[deal.store_id] ?? 'bg-gray-500'} text-white px-3 py-1.5 flex items-center justify-between`}>
        <span className="text-sm font-bold">{deal.store_name}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ring-1 ring-white/30 ${scoreBadgeClass(deal.score)}`}>
          {deal.score} pts
        </span>
      </div>

      {/* Image */}
      {deal.image_url && (
        <div className="h-28 bg-gray-50 flex items-center justify-center overflow-hidden">
          <img
            src={deal.image_url}
            alt={deal.name}
            className="h-full w-full object-contain p-2"
            loading="lazy"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <span className="text-xs text-gray-400 mb-1">{deal.category_label}</span>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 flex-1">
          {deal.name}
        </h3>
        {deal.unit && <p className="text-xs text-gray-400 mb-2">{deal.unit}</p>}

        {/* Prix */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-2xl font-bold text-red-600">
              {Number(deal.sale_price).toFixed(2)} $
            </span>
            <span className="block text-xs text-gray-400 line-through">
              {Number(deal.regular_price).toFixed(2)} $
            </span>
          </div>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
            -{saving}%
          </span>
        </div>

        {/* Prix unitaire */}
        {deal.unit_price && (
          <div className="mb-2 px-2 py-1 bg-blue-50 rounded-lg flex items-center gap-1">
            <span className="text-xs font-bold text-blue-700">{Number(deal.unit_price).toFixed(2)} $</span>
            <span className="text-xs text-blue-500">{deal.unit_label}</span>
          </div>
        )}

        {/* Distance */}
        {dist && (
          <p className="text-xs text-gray-500 mb-2">📍 {dist} de vous</p>
        )}

        {/* Décomposition du score */}
        <div className="mb-3 flex gap-2 flex-wrap text-xs">
          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
            Prix {deal.price_score}pt
          </span>
          {deal.keyword_score > 0 && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
              Liquidation +{deal.keyword_score}
            </span>
          )}
          {deal.stock_score > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
              Stock limité +{deal.stock_score}
            </span>
          )}
        </div>

        {/* Date validité + lien */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400">
            Jusqu'au {new Date(deal.valid_until).toLocaleDateString('fr-CA')}
          </p>
          {deal.product_url && (
            <a
              href={deal.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              Voir ↗
            </a>
          )}
        </div>

        {/* Bouton panier */}
        <button
          onClick={() => addItem(toDeal())}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors mt-auto ${
            inCart
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {inCart ? '✓ Ajouté' : '+ Ma liste'}
        </button>
      </div>
    </div>
  );
}
