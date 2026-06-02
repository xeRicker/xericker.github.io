import { CATEGORIES } from '../config/data.js';
import { apiService } from './api.js?v=2';

const CATEGORY_ICONS = {
    "🥩": "restaurant",
    "🥗": "eco",
    "🧀": "kitchen",
    "🍟": "lunch_dining",
    "🍞": "bakery_dining",
    "🧂": "science",
    "🥫": "inventory_2",
    "🪓": "construction",
    "🥤": "local_drink",
    "🛍️": "shopping_bag",
    "🧽": "cleaning_services",
    "📋": "receipt_long"
};

export function legacyCategoriesToCatalog(categories = CATEGORIES) {
    return {
        version: 1,
        updatedAt: null,
        categories: Object.entries(categories || {}).map(([label, category = {}], categoryIndex) => ({
            id: `category-${categoryIndex + 1}`,
            name: label,
            icon: CATEGORY_ICONS[label] || 'inventory_2',
            enabled: true,
            items: (Array.isArray(category.items) ? category.items : []).map((product = {}, productIndex) => ({
                id: `product-${categoryIndex + 1}-${productIndex + 1}`,
                name: product.name,
                type: product.type === 's' ? 'toggle' : 'quantity',
                enabled: true
            }))
        }))
    };
}

export function normalizeProductCatalog(input) {
    if (!input) return legacyCategoriesToCatalog();

    if (!Array.isArray(input.categories)) {
        return legacyCategoriesToCatalog(input);
    }

    return {
        version: Number(input.version) || 1,
        updatedAt: input.updatedAt || null,
        categories: input.categories.map((category = {}, categoryIndex) => ({
            id: category.id || `category-${categoryIndex + 1}`,
            name: category.name || `Kategoria ${categoryIndex + 1}`,
            icon: category.icon || 'inventory_2',
            enabled: category.enabled !== false,
            items: (Array.isArray(category.items) ? category.items : []).map((product = {}, productIndex) => ({
                id: product.id || `product-${categoryIndex + 1}-${productIndex + 1}`,
                name: product.name || `Produkt ${productIndex + 1}`,
                type: product.type === 'toggle' || product.type === 's' ? 'toggle' : 'quantity',
                enabled: product.enabled !== false
            }))
        }))
    };
}

export function getActiveProductCatalog(catalog) {
    const normalized = normalizeProductCatalog(catalog);
    return {
        ...normalized,
        categories: normalized.categories
            .filter(category => category.enabled !== false)
            .map(category => ({
                ...category,
                items: (Array.isArray(category.items) ? category.items : []).filter(product => product.enabled !== false)
            }))
            .filter(category => category.items.length)
    };
}

export async function loadProductCatalog() {
    const remoteCatalog = await apiService.fetchProducts();
    return normalizeProductCatalog(remoteCatalog);
}

export function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
