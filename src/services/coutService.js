// services/coutService.js
// Gère la logique de répartition des coûts, les appels API Snipe-IT pour les catégories
// et les insertions dans la base de données SQLite via le backend.

import { fetchAssets } from '@/services/snipeit' // To fetch individual asset details, if needed, or to confirm category_id directly
import api from '@/services/api' // For direct Snipe-IT API calls

const BASE_URL_BACKEND = '/api/ticket-couts'

/**
 * Envoie un tableau d'objets de coût au backend Node.js pour insertion dans SQLite.
 * @param {Array<Object>} costs - Tableau d'objets { id_ticket, id_asset, id_categorie, cout }
 * @returns {Promise<Object>} Réponse du backend
 */
export async function apiPostTicketCouts(costs) {
  const res = await fetch(BASE_URL_BACKEND, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ costs }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Récupère les coûts agrégés par catégorie depuis le backend Node.js.
 * @returns {Promise<Array<Object>>} Tableau d'objets { id_categorie, total_cout }
 */
export async function apiGetAggregatedCoutsByCategory() {
  const res = await fetch(`${BASE_URL_BACKEND}/aggregated-by-category`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.data || []
}

/**
 * Récupère la catégorie d'un asset depuis l'API Snipe-IT.
 * Cette fonction utilise l'asset_tag pour trouver l'asset, puis son ID numérique
 * pour récupérer les détails du modèle et la catégorie.
 * @param {string} assetTag - L'Asset Tag de l'asset Snipe-IT (ex: "PC-001")
 * @returns {Promise<number|null>} L'ID de la catégorie ou null si non trouvé
 */
export async function getAssetCategoryId(assetTag) {
  try {
    // 1. Rechercher l'asset par son asset_tag
    const searchResponse = await api.get('/hardware', {
      params: { search: assetTag, limit: 1 }
    });
    const foundAssets = searchResponse.data.rows;

    if (!foundAssets || foundAssets.length === 0) {
      console.warn(`Asset non trouvé avec l'asset_tag: ${assetTag}`);
      return null;
    }

    const assetDetails = foundAssets[0]; // Prendre le premier résultat
    const numericAssetId = assetDetails.id; // L'ID numérique de l'asset

    // 2. Si l'asset a un modèle, récupérer les détails du modèle pour la category_id
    if (assetDetails.model && assetDetails.model.id) {
      const modelResponse = await api.get(`/models/${assetDetails.model.id}`);
      const modelDetails = modelResponse.data;
      if (modelDetails && modelDetails.category && modelDetails.category.id) {
        return modelDetails.category.id;
      }
    }
    
    // Si l'asset lui-même contient la category_id directement (moins courant mais possible)
    if (assetDetails.category && assetDetails.category.id) {
        return assetDetails.category.id;
    }

    return null;
  } catch (error) {
    console.error(`Erreur lors de la récupération de la catégorie pour l'asset_tag ${assetTag}:`, error);
    return null;
  }
}

/**
 * Distribue un coût total entre les assets d'un ticket.
 * @param {Object} ticket - L'objet ticket contenant un tableau d'assets (ticket.assets).
 *                          Chaque asset doit avoir un `id` (qui est l'asset_tag dans ce contexte).
 * @param {number} totalCost - Le coût total à distribuer.
 * @returns {Array<Object>} Un tableau d'objets { id_ticket, id_asset, id_categorie, cout }
 */
export async function distributeCostToAssets(ticket, totalCost) {
  if (!ticket || !ticket.assets || ticket.assets.length === 0) {
    return [];
  }

  const numAssets = ticket.assets.length;
  if (numAssets === 0) return [];

  const baseCostPerAsset = Math.floor((totalCost * 100) / numAssets) / 100; // Pour garder 2 décimales
  let remainingCost      = totalCost - (baseCostPerAsset * numAssets);
  let distributedCosts   = [];

  for (let i = 0; i < numAssets; i++) {
    const asset = ticket.assets[i];
    const assetIdentifier = asset.id; // asset.id here is the asset_tag from tickets.js

    // Récupérer l'ID de catégorie pour l'asset en utilisant l'assetIdentifier (asset_tag)
    const categoryId = await getAssetCategoryId(assetIdentifier);
    if (categoryId === null) {
      console.warn(`Catégorie non trouvée pour l'asset ${assetIdentifier}. Cet asset sera ignoré.`);
      continue;
    }

    let currentAssetCost = baseCostPerAsset;
    // Ajouter le reste au dernier asset pour gérer les arrondis
    if (i === numAssets - 1 && remainingCost > 0) {
      currentAssetCost += remainingCost;
      remainingCost = 0; // S'assurer que le reste est appliqué une seule fois
    }

    distributedCosts.push({
      id_ticket:    ticket.id,
      id_asset:     assetIdentifier, // Store the asset_tag as id_asset
      id_categorie: categoryId,
      cout:         parseFloat(currentAssetCost.toFixed(2)), // S'assurer que le coût a 2 décimales
    });
  }

  return distributedCosts;
}
