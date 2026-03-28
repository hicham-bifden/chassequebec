/**
 * unitPrice.js — Calcul du prix unitaire réel et détection de fausses promos
 *
 * Transforme un prix brut en prix comparable ($/100g, $/litre, $/unité, etc.)
 * pour permettre une vraie comparaison entre les formats différents.
 */

// Marques connues de papier hygiénique pour la détection
const TOILET_BRANDS = ['charmin', 'royale', 'cottonelle', 'cashmere', 'purex', 'scott', 'ultra soft'];
const TOILET_KEYWORDS = ['papier hygi', 'toilet paper', 'bath tissue', 'bath tiss'];

// Normalise une chaîne (enlève accents, met en minuscule)
function normalize(str = '') {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extrait le PREMIER nombre d'une chaîne pouvant contenir des plages.
 * Ex: "675 à 825 g" → 675  |  "(500 ou 700 mL)" → 500  |  "1,47L" → 1.47
 */
function firstNumber(str) {
  if (!str) return null;
  const m = str.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Calcule le prix unitaire à partir du prix de vente, du champ `unit` et du nom.
 * Retourne { unitPrice: string, unitLabel: string } ou null si non parseable.
 */
export function parseUnitPrice(salePrice, unitStr = '', name = '', categoryId = '') {
  const price = Number(salePrice);
  if (!price || price <= 0) return null;

  const raw   = `${name} ${unitStr}`;
  const text  = normalize(raw);

  // ── Papier hygiénique (cas le plus complexe) ──────────────────────────
  const isToiletPaper =
    TOILET_BRANDS.some(b => text.includes(b)) ||
    TOILET_KEYWORDS.some(k => text.includes(normalize(k)));

  if (isToiletPaper) {
    const rollM   = text.match(/(\d+)\s*(?:rouleaux?|roul\.)/);
    const sheetM  = text.match(/(\d+)\s*feuilles?/);
    const ply     = /triple|3[\s-]?plis?/.test(text) ? 3
                  : /double|2[\s-]?plis?/.test(text) ? 2
                  : 1;

    if (rollM && sheetM) {
      const effective = parseInt(rollM[1]) * parseInt(sheetM[1]) * ply;
      const per100 = (price / effective) * 100;
      return {
        unitPrice: per100.toFixed(3),
        unitLabel: '/ 100 feuilles eff.',
        type: 'toilet_paper',
      };
    }
    if (rollM) {
      return {
        unitPrice: (price / parseInt(rollM[1])).toFixed(2),
        unitLabel: '/ rouleau',
        type: 'toilet_paper',
      };
    }
  }

  // ── Lingettes / Mouchoirs ──────────────────────────────────────────────
  if (/lingettes?|wipes?|mouchoirs?/.test(text)) {
    const m = text.match(/(\d+)\s*(?:lingettes?|wipes?|feuilles?|unites?|pces?|un\.)/);
    if (m) {
      const count = parseInt(m[1]);
      return {
        unitPrice: (price / count * 100).toFixed(2),
        unitLabel: '/ 100 feuilles',
      };
    }
  }

  // ── Formats multiples "N x QTÉ unité" ─────────────────────────────────
  // Ex: "2 x 500 g", "3 x 330 ml", "4 x 1 L"
  const multiM = text.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b/);
  if (multiM) {
    const qty = parseInt(multiM[1]);
    const amt = parseFloat(multiM[2]);
    const u   = multiM[3];
    if (u === 'g')  return { unitPrice: (price / (qty * amt) * 100).toFixed(2), unitLabel: '/ 100g' };
    if (u === 'kg') return { unitPrice: (price / (qty * amt)).toFixed(2), unitLabel: '/ kg' };
    if (u === 'ml') return { unitPrice: (price / (qty * amt) * 1000).toFixed(2), unitLabel: '/ litre' };
    if (u === 'l')  return { unitPrice: (price / (qty * amt)).toFixed(2), unitLabel: '/ litre' };
  }

  // ── Liquides ─────────────────────────────────────────────────────────
  // Cherche d'abord les mL, puis les L (ordre important pour éviter "1 L" dans "100 mL")
  const mlM = text.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  const lM  = text.match(/(\d+(?:[.,]\d+)?)\s*l\b/);

  if (mlM) {
    const ml = parseFloat(mlM[1]);
    if (ml > 0 && ml <= 20000) {
      if (ml >= 1000) return { unitPrice: (price / ml * 1000).toFixed(2), unitLabel: '/ litre' };
      return { unitPrice: (price / ml * 100).toFixed(2), unitLabel: '/ 100 ml' };
    }
  }
  if (lM) {
    const l = parseFloat(lM[1].replace(',', '.'));
    if (l > 0 && l <= 100) {
      return { unitPrice: (price / l).toFixed(2), unitLabel: '/ litre' };
    }
  }

  // ── Poids ─────────────────────────────────────────────────────────────
  // "675 à 825 g" → prend le premier nombre (minimum de la plage)
  const kgM  = text.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  const gM   = raw.match(/(\d+(?:[.,]\d+)?)\s*g\b/i); // raw pour préserver la casse "g"
  const lbsM = text.match(/(\d+(?:[.,]\d+)?)\s*lbs?\b/);

  const isFruitsLegumes = categoryId === 'fruits-legumes';

  if (kgM) {
    const kg = parseFloat(kgM[1].replace(',', '.'));
    if (kg > 0 && kg <= 50) {
      if (isFruitsLegumes) {
        // Fruits & légumes: afficher en $/lb (1 lb = 453.592g = 0.453592 kg)
        return { unitPrice: (price / kg * 0.453592).toFixed(2), unitLabel: '/ lb' };
      }
      return { unitPrice: (price / kg).toFixed(2), unitLabel: '/ kg' };
    }
  }
  if (gM) {
    const g = parseFloat(gM[1].replace(',', '.'));
    if (g >= 10 && g <= 50000) {
      if (isFruitsLegumes) {
        // Fruits & légumes: afficher en $/lb
        const gPerLb = 453.592;
        return { unitPrice: (price / g * gPerLb).toFixed(2), unitLabel: '/ lb' };
      }
      if (g >= 1000) return { unitPrice: (price / g * 1000).toFixed(2), unitLabel: '/ kg' };
      return { unitPrice: (price / g * 100).toFixed(2), unitLabel: '/ 100g' };
    }
  }
  if (lbsM) {
    const lbs = parseFloat(lbsM[1].replace(',', '.'));
    if (lbs > 0 && lbs <= 50) {
      const kg = lbs * 0.453592;
      return { unitPrice: (price / kg).toFixed(2), unitLabel: '/ kg' };
    }
  }

  // ── Unités comptables ─────────────────────────────────────────────────
  const eggM   = text.match(/(\d+)\s*(?:oeufs?|eggs?)/);
  const unitsM = text.match(/(\d+)\s*(?:un\.|unites?|pces?|pieces?|items?)\b/);

  if (eggM) {
    return {
      unitPrice: (price / parseInt(eggM[1])).toFixed(2),
      unitLabel: '/ oeuf',
    };
  }
  if (unitsM) {
    const count = parseInt(unitsM[1]);
    if (count > 1 && count <= 500) {
      return {
        unitPrice: (price / count).toFixed(2),
        unitLabel: '/ unité',
      };
    }
  }

  return null; // Impossible à parser
}

/**
 * Détermine le statut promo d'un deal en le comparant à son historique.
 *
 * @param {number} salePrice    Prix actuel en circulaire
 * @param {number|null} avgPrice  Prix moyen des X dernières semaines
 * @param {number|null} maxPrice  Prix max des X dernières semaines
 * @param {number} dataPoints   Nombre de points de données dispo
 * @returns {'true_promo'|'normal_promo'|'fake_promo'|'arnaque'|'no_data'}
 */
export function calcPromoStatus(salePrice, avgPrice, maxPrice, dataPoints) {
  if (!avgPrice || dataPoints < 2) return 'no_data';

  const current = Number(salePrice);
  const avg     = Number(avgPrice);
  const max     = Number(maxPrice);

  if (current > max)           return 'arnaque';      // Plus cher que d'habitude
  if (current >= avg)          return 'fake_promo';   // Pas vraiment en solde
  if (current < avg * 0.85)    return 'true_promo';   // Vraie bonne affaire (-15%)
  return 'normal_promo';                              // Légère baisse (-5 à -15%)
}
