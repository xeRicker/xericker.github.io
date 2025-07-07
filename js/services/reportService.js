/**
 * Tworzy mapę odwrotną { nazwaProduktu: emojiKategorii }
 * @param {object} categories - Główny obiekt kategorii
 * @returns {Map<string, string>} Mapa produktu do emoji.
 */
function createProductToCategoryMap(categories) {
    const map = new Map();
    for (const [emoji, category] of Object.entries(categories)) {
        category.items.forEach(item => {
            map.set(item.name, emoji);
        });
    }
    return map;
}

/**
 * Pomocnicza funkcja do obliczania liczby godzin na podstawie stringa "HH:MM – HH:MM".
 * @param {string} timeString - np. "12:00 – 20:30"
 * @returns {number} Liczba godzin.
 */
function calculateHours(timeString) {
  try {
    const [startStr, endStr] = timeString.split('–').map(s => s.trim());
    const [startHours, startMinutes] = startStr.split(':').map(Number);
    const [endHours, endMinutes] = endStr.split(':').map(Number);
    const startDate = new Date(0, 0, 0, startHours, startMinutes);
    let endDate = new Date(0, 0, 0, endHours, endMinutes);

    if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
    
    return (endDate - startDate) / (1000 * 60 * 60);
  } catch (e) {
    console.error(`Błąd parsowania czasu: "${timeString}"`, e);
    return 0;
  }
}

/**
 * Przetwarza surowe dane z raportów i generuje zagregowane statystyki.
 * @param {Array<object>} reports - Tablica obiektów raportów z GitHuba.
 * @param {object} categories - Obiekt kategorii do mapowania produktów.
 * @returns {object} Obiekt z przetworzonymi statystykami.
 */
function processReports(reports, categories) {
    const productToCategory = createProductToCategoryMap(categories);
    const stats = {
        employeeHoursTotal: {},
        employeeWorkDays: {},
        employeeHoursByLocation: {},
        productQuantities: {},
        categoryQuantities: {},
        totalHours: 0,
        totalShifts: 0,
        workDays: new Set(),
    };

    reports.forEach(report => {
        stats.workDays.add(report.date);
        
        for (const [name, timeString] of Object.entries(report.employees)) {
            const hours = calculateHours(timeString);
            stats.employeeHoursTotal[name] = (stats.employeeHoursTotal[name] || 0) + hours;
            stats.employeeWorkDays[name] = (stats.employeeWorkDays[name] || 0) + 1;

            if (!stats.employeeHoursByLocation[report.location]) {
                stats.employeeHoursByLocation[report.location] = { totalHours: 0, employees: {} };
            }
            stats.employeeHoursByLocation[report.location].employees[name] = (stats.employeeHoursByLocation[report.location].employees[name] || 0) + hours;
            stats.employeeHoursByLocation[report.location].totalHours += hours;

            stats.totalHours += hours;
            stats.totalShifts += 1;
        }
        
        for (const [name, quantity] of Object.entries(report.products)) {
            const nQty = Number(quantity);
            stats.productQuantities[name] = (stats.productQuantities[name] || 0) + nQty;
            
            const categoryEmoji = productToCategory.get(name);
            if (categoryEmoji) {
                stats.categoryQuantities[categoryEmoji] = (stats.categoryQuantities[categoryEmoji] || 0) + nQty;
            }
        }
    });

    return stats;
}

/**
 * Formatuje przetworzone statystyki w czytelny, profesjonalny raport tekstowy.
 * @param {object} stats - Obiekt statystyk zwrócony przez processReports.
 * @returns {string} Gotowy do skopiowania raport.
 */
function formatReportText(stats) {
    if (stats.totalHours === 0) return "Brak danych do wygenerowania raportu.";

    const monthName = new Date().toLocaleString('pl-PL', { month: 'long' });
    let report = `📊 Raport miesięczny: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}\n\n`;

    report += `--- PODSUMOWANIE ---\n`;
    report += `• Całkowita liczba godzin: ${Math.round(stats.totalHours)}h\n`;
    report += `• Dni z zarejestrowaną pracą: ${stats.workDays.size}\n`;
    if (stats.workDays.size > 0) {
        report += `• Średnia liczba godzin dziennie: ${(stats.totalHours / stats.workDays.size).toFixed(1)}h\n`;
    }
    if (stats.totalShifts > 0) {
        report += `• Średnia długość zmiany: ${(stats.totalHours / stats.totalShifts).toFixed(1)}h\n`;
    }
    report += `\n`;

    const sortedTotal = Object.entries(stats.employeeHoursTotal).sort((a, b) => b[1] - a[1]);
    if (sortedTotal.length > 0) {
        report += `--- ANALIZA PRACOWNIKÓW ---\n`;
        report += `🏆 Ranking ogólny (suma godzin):\n`;
        sortedTotal.forEach(([name, hours]) => {
            const days = stats.employeeWorkDays[name] || 0;
            report += `- ${name}: ${Math.round(hours)}h (${days} dni)\n`;
        });
        report += `\n`;
    }
    
    report += `--- ANALIZA LOKALIZACJI ---\n`;
    for (const [location, data] of Object.entries(stats.employeeHoursByLocation)) {
        const percentage = ((data.totalHours / stats.totalHours) * 100).toFixed(0);
        report += `\n📍 ${location.charAt(0).toUpperCase() + location.slice(1)}\n`;
        report += `• Suma godzin: ${Math.round(data.totalHours)}h (${percentage}% całości)\n`;
        report += `• Ranking lokalny:\n`;
        const sortedLocation = Object.entries(data.employees).sort((a, b) => b[1] - a[1]);
        sortedLocation.forEach(([name, hours]) => {
            report += `  - ${name}: ${Math.round(hours)}h\n`;
        });
    }
    report += `\n`;

    const sortedProducts = Object.entries(stats.productQuantities).sort((a, b) => b[1] - a[1]);
    if (sortedProducts.length > 0) {
        report += `--- ANALIZA PRODUKTÓW ---\n`;
        report += `📈 Największe zapotrzebowanie:\n`;
        sortedProducts.slice(0, 3).forEach(([name, qty]) => {
            report += `- ${name} (ilość: ${qty})\n`;
        });
        report += `\n`;
        
        if (sortedProducts.length > 3) {
            report += `📉 Najmniejsze zapotrzebowanie:\n`;
            sortedProducts.slice(-3).reverse().forEach(([name, qty]) => {
                report += `- ${name} (ilość: ${qty})\n`;
            });
            report += `\n`;
        }

        const sortedCategories = Object.entries(stats.categoryQuantities).sort((a, b) => b[1] - a[1]);
        if (sortedCategories.length > 0) {
            report += `📦 Najpopularniejsza kategoria: ${sortedCategories[0][0]}\n`;
        }
    }

    return report.trim();
}

/**
 * Główna, publiczna funkcja, która orkiestruje całym procesem.
 * @param {Array<object>} reports - Surowe dane z GitHuba.
 * @param {object} categories - Obiekt kategorii do mapowania.
 * @returns {string} Sformatowany raport.
 */
export function generateMonthlyReport(reports, categories) {
    const processedStats = processReports(reports, categories);
    const reportText = formatReportText(processedStats);
    return reportText;
}