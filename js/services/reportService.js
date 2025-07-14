/**
 * Definicja "pełnego etatu" w godzinach na miesiąc.
 */
const FULL_TIME_HOURS_IN_MONTH = 168;

/**
 * Tworzy mapę odwrotną { nazwaProduktu: emojiKategorii }
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
        pairCooccurrence: {}, // Dla "Nierozłączny Duet"
        productPresence: {}, // Dla "Specjalista od Produktu"
    };

    reports.forEach(report => {
        stats.workDays.add(report.date);
        const dailyEmployees = Object.keys(report.employees);

        // --- LOGIKA DLA "NIEROZŁĄCZNY DUET" ---
        // Generujemy wszystkie możliwe pary pracowników z danego dnia
        if (dailyEmployees.length > 1) {
            for (let i = 0; i < dailyEmployees.length; i++) {
                for (let j = i + 1; j < dailyEmployees.length; j++) {
                    // Sortujemy alfabetycznie, aby para [A, B] była tym samym co [B, A]
                    const pair = [dailyEmployees[i], dailyEmployees[j]].sort();
                    const pairKey = pair.join(' & ');
                    stats.pairCo_occurrence[pairKey] = (stats.pairCo_occurrence[pairKey] || 0) + 1;
                }
            }
        }
        
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
        
        for (const [productName, quantity] of Object.entries(report.products)) {
            const nQty = Number(quantity);
            stats.productQuantities[productName] = (stats.productQuantities[productName] || 0) + nQty;
            
            const categoryEmoji = productToCategory.get(productName);
            if (categoryEmoji) {
                stats.categoryQuantities[categoryEmoji] = (stats.categoryQuantities[categoryEmoji] || 0) + nQty;
            }

            // --- LOGIKA DLA "SPECJALISTA OD PRODUKTU" ---
            if (nQty > 0) {
                if (!stats.productPresence[productName]) {
                    stats.productPresence[productName] = {};
                }
                dailyEmployees.forEach(employee => {
                    stats.productPresence[productName][employee] = (stats.productPresence[productName][employee] || 0) + 1;
                });
            }
        }
    });

    return stats;
}

/**
 * Formatuje przetworzone statystyki w czytelny, profesjonalny raport tekstowy.
 */
function formatReportText(stats) {
    if (stats.totalHours === 0) return "Brak danych do wygenerowania raportu.";

    const monthName = new Date().toLocaleString('pl-PL', { month: 'long' });
    let report = `📊 Raport miesięczny: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}\n\n`;

    report += `• Całkowita liczba godzin: ${stats.totalHours.toFixed(1)}h\n`;
    report += `• Dni z zarejestrowaną pracą: ${stats.workDays.size}\n`;
    if (stats.workDays.size > 0) {
        report += `• Śr. liczba godzin dziennie: ${(stats.totalHours / stats.workDays.size).toFixed(1)}h\n`;
    }
    if (stats.totalShifts > 0) {
        report += `• Śr. długość zmiany: ${(stats.totalHours / stats.totalShifts).toFixed(1)}h\n`;
    }
    report += `\n`;

    const sortedTotal = Object.entries(stats.employeeHoursTotal).sort((a, b) => b[1] - a[1]);
    if (sortedTotal.length > 0) {
        report += `🏆 Ranking pracowników:\n`;
        sortedTotal.forEach(([name, hours], index) => {
            const days = stats.employeeWorkDays[name] || 0;
            const prefix = index === 0 ? '👑 MVP' : `#${index + 1}`;
            const ftePercentage = Math.round((hours / FULL_TIME_HOURS_IN_MONTH) * 100);
            report += `${prefix} ${name}: ${hours.toFixed(1)}h (${days} dni) (${ftePercentage}% Etat)\n`;
        });
        report += `\n`;
    }
    
    for (const [location, data] of Object.entries(stats.employeeHoursByLocation)) {
        const percentage = stats.totalHours > 0 ? ((data.totalHours / stats.totalHours) * 100).toFixed(0) : 0;
        report += `📍 ${location.charAt(0).toUpperCase() + location.slice(1)}\n`;
        report += `• Suma: ${data.totalHours.toFixed(1)}h (${percentage}% całości)\n`;
        report += `• Ranking lokalny:\n`;
        const sortedLocation = Object.entries(data.employees).sort((a, b) => b[1] - a[1]);
        sortedLocation.forEach(([name, hours], index) => {
            report += `  #${index + 1} ${name}: ${hours.toFixed(1)}h\n`;
        });
        report += `\n`;
    }

    const sortedProducts = Object.entries(stats.productQuantities)
        .filter(([name]) => !name.includes("Bułki"))
        .sort((a, b) => b[1] - a[1]);

    if (sortedProducts.length > 0) {
        report += `📈 Największe zapotrzebowanie:\n`;
        sortedProducts.slice(0, 3).forEach(([name, qty]) => {
            report += `- ${name} (${qty})\n`;
        });
        report += `\n`;
        
        if (sortedProducts.length > 3) {
            report += `📉 Najmniejsze zapotrzebowanie:\n`;
            sortedProducts.slice(-3).reverse().forEach(([name, qty]) => {
                report += `- ${name} (${qty})\n`;
            });
            report += `\n`;
        }
    }

    report += `\n---\n🔎 Ciekawostki\n---\n`;

    // 1. Nierozłączny Duet
    const sortedPairs = Object.entries(stats.pairCo_occurrence).sort((a, b) => b[1] - a[1]);
    if (sortedPairs.length > 0) {
        const topPair = sortedPairs[0];
        report += `• Nierozłączny Duet: ${topPair[0]} (pracowali razem ${topPair[1]} razy).\n`;
    }

    // 2. Specjalista od Lokalizacji
    report += `• Główne lokalizacje pracowników:\n`;
    Object.entries(stats.employeeHoursTotal).forEach(([employeeName, totalHours]) => {
        let maxHours = 0;
        let favLocation = 'Brak danych';
        for (const [locationName, locationData] of Object.entries(stats.employeeHoursByLocation)) {
            const employeeHoursInLocation = locationData.employees[employeeName] || 0;
            if (employeeHoursInLocation > maxHours) {
                maxHours = employeeHoursInLocation;
                favLocation = locationName;
            }
        }
        if (totalHours > 0) {
            const percentage = Math.round((maxHours / totalHours) * 100);
            report += `  - ${employeeName}: ${favLocation} (${percentage}% czasu pracy).\n`;
        }
    });

    // 3. Specjalista od Produktu (dla top 3 produktów)
    if (sortedProducts.length > 0) {
        report += `• Kto jest na zmianie, gdy potrzeba:\n`;
        sortedProducts.slice(0, 3).forEach(([productName]) => {
            const presences = stats.productPresence[productName];
            if (presences) {
                const topEmployeeForProduct = Object.entries(presences).sort((a, b) => b[1] - a[1])[0];
                report += `  - "${productName}"? Najczęściej ${topEmployeeForProduct[0]}.\n`;
            }
        });
    }

    return report.trim();
}

/**
 * Główna, publiczna funkcja, która orkiestruje całym procesem.
 */
export function generateMonthlyReport(reports, categories) {
    const processedStats = processReports(reports, categories);
    const reportText = formatReportText(processedStats);
    return reportText;
}