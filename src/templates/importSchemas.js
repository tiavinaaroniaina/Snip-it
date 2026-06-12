// src/templates/importSchemas.js

import { clean, normalizeDate, normalizePrice } from '@/utils/formatters'

/**
 * Template pour la Feuille 1 (Assets / SnipeIT)
 */
export const ASSET_TEMPLATE = {
  id: 'assets',
  label: 'Assets SnipeIT',
  requiredColumns: [
    'asset_tag', 'serial', 'name', 'category', 'manufacturer',
    'model', 'status', 'company', 'user', 'email',
    'department', 'purchase_date', 'purchase_cost'
  ],
  // Mappe une ligne brute CSV vers l'objet interne NewApp
  mapToInternal: (row, index) => {
    const assetTag = clean(row.asset_tag) || `IMP-${index + 1}`
    const model = clean(row.model) || ''
    const manufacturer = clean(row.manufacturer) || model.split(' ')[0] || 'Inconnu'
    
    return {
      id:           index + 1,
      name:         clean(row.name) || assetTag,
      asset_tag:    assetTag,
      category:     clean(row.category) || 'Non classé',
      location:     clean(row.location) || '',
      serial:       clean(row.serial) || '',
      model:        model,
      status:       clean(row.status) || 'Ready to Deploy',
      manufacturer: manufacturer,
      company:      clean(row.company) || '',
      department:   clean(row.department) || '',
      user:         clean(row.user) || '',
      email:        clean(row.email) || '',
      purchase_date: normalizeDate(row.purchase_date) || '',
      purchase_cost: normalizePrice(row.purchase_cost) || '',
    }
  }
}

/**
 * Template pour la Feuille 2 (SQLite / Tickets)
 */
export const FEUIL2_TEMPLATE = {
  id: 'feuil2',
  label: 'SQLite (Feuil 2)',
  // Colonnes réelles du fichier de référence avec la casse d'origine
  requiredColumns: [
    'Num_Ticket', 'Date', 'Heure', 'Titre', 'Description', 'Status', 'Priority', 'Items'
  ],
  // Mappe une ligne brute CSV vers l'objet interne (si nécessaire, ici direct)
  mapToInternal: (row) => ({
    ...row,
    num_ticket: row.Num_Ticket ?? row.num_ticket, // Normalisation de la clé
  })
}

/**
 * Listes de validation communes
 */
export const VALIDATION_LISTS = {
  ticketStatuses: ['new', 'open', 'in_progress', 'in progress', 'resolved', 'closed'],
  ticketPriorities: ['low', 'medium', 'high', 'critical']
}
