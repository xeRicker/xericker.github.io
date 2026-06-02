export function buildReportText(report, catalog) {
    if (!report) return '';

    const lines = [`📋 ${report.location} ${report.date}`];

    Object.entries(report.employees || {}).forEach(([name, time]) => {
        if (name && time) lines.push(`• ${name}: ${time}`);
    });

    const productsText = buildProductsText(report.products || {}, catalog);
    if (productsText) lines.push(productsText);

    return lines.join('\n').trim();
}

export function buildProductsText(products, catalog) {
    const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];
    const usedProducts = new Set();
    const sections = [];

    categories.forEach(category => {
        const categoryLines = [];

        (category.items || []).forEach(product => {
            const quantity = products[product.name];
            usedProducts.add(product.name);

            if (product.name.includes('Bułki') && Number(quantity) === 0) {
                categoryLines.push('  • Bułki: ❌');
                return;
            }

            if (!hasProductValue(quantity)) return;

            const isToggle = product.type === 'toggle' || product.type === 's';
            categoryLines.push(`  • ${product.name}${isToggle ? '' : `: ${quantity}`}`);
        });

        if (categoryLines.length) {
            sections.push(`${category.name}\n${categoryLines.join('\n')}`);
        }
    });

    const uncategorized = Object.entries(products)
        .filter(([name, quantity]) => !usedProducts.has(name) && hasProductValue(quantity))
        .map(([name, quantity]) => `  • ${name}: ${quantity}`);

    if (uncategorized.length) {
        sections.push(`Inne\n${uncategorized.join('\n')}`);
    }

    return sections.length ? `\n${sections.join('\n')}` : '';
}

function hasProductValue(value) {
    if (value === true) return true;
    if (typeof value === 'string') return value.trim() !== '' && Number(value) > 0;
    return Number(value) > 0;
}
