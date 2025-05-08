document.addEventListener('DOMContentLoaded', () => {
    // const chartDataElement = document.getElementById('chart-data'); // changed to using other method

    // Log the raw data from window object
    console.log("Raw data from window.clientSideChartData:", window.clientSideChartData);
    // Also log its type
    console.log("Type of window.clientSideChartData:", typeof window.clientSideChartData);

    let serverChartData;
    try {
        if (typeof window.clientSideChartData === 'object' && window.clientSideChartData !== null) {
            serverChartData = window.clientSideChartData;
        } else if (typeof window.clientSideChartData === 'string') {
            console.warn("window.clientSideChartData was a string, attempting to parse. This is unexpected.");
            serverChartData = JSON.parse(window.clientSideChartData);
        } else {
            throw new Error("window.clientSideChartData is not an object or a parseable string. Value: " + window.clientSideChartData);
        }
        
        console.log('Client-side: Processed chartData successfully:', serverChartData);

    } catch (e) {
        console.error('Error processing chart data from window.clientSideChartData:', e);
        const chartsSection = document.querySelector('.section-header + .charts-row') || document.querySelector('.content');
        if (chartsSection) {
            const errorDisplay = document.createElement('div');
            errorDisplay.innerHTML = '<p style="color: red; text-align: center; border: 1px solid red; padding: 10px; background-color: #ffeeee;">Could not load chart data. Please check the browser console (F12) for details.</p>';
            if (document.querySelector('.charts-row')) {
                 document.querySelector('.section-header + .charts-row').parentNode.insertBefore(errorDisplay, document.querySelector('.section-header + .charts-row'));
            } else if (chartsSection.firstChild) {
                chartsSection.insertBefore(errorDisplay, chartsSection.firstChild);
            } else {
                chartsSection.appendChild(errorDisplay);
            }
        }
        return; 
    }

    if (!serverChartData) {
        console.error('serverChartData is undefined or null. This should not happen if processing was successful.');
        return;
    }

    // --- Chart 1: Entries by Day of Week ---
    const dayOfWeekCtx = document.getElementById('dayOfWeekChart');
    if (dayOfWeekCtx && serverChartData.dayOfWeekData) {
        try {
            new Chart(dayOfWeekCtx, {
                type: 'bar',
                data: {
                    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    datasets: [{
                        label: 'Entries by Day',
                        data: serverChartData.dayOfWeekData,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: false } 
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1 
                            }
                        }
                    }
                }
            });
        } catch (chartError) {
            console.error("Error initializing Day of Week Chart:", chartError, "Data used:", serverChartData.dayOfWeekData);
        }
    } else {
        console.warn('Canvas "dayOfWeekChart" or its data (serverChartData.dayOfWeekData) not found or invalid. dayOfWeekCtx:', dayOfWeekCtx, 'dayOfWeekData:', serverChartData.dayOfWeekData);
    }

    // --- Chart 2: Monthly Activity (Entries per Month) ---
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx && serverChartData.monthLabels && serverChartData.monthData) {
        try {
            new Chart(monthlyCtx, {
                type: 'line',
                data: {
                    labels: serverChartData.monthLabels,
                    datasets: [{
                        label: 'Entries per Month',
                        data: serverChartData.monthData,
                        borderColor: 'rgba(75, 192, 192, 1)', // Teal
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        } catch (chartError) {
            console.error("Error initializing Monthly Activity Chart:", chartError, "Data used:", { labels: serverChartData.monthLabels, data: serverChartData.monthData });
        }
    } else {
        console.warn('Canvas "monthlyChart" or its data (serverChartData.monthLabels, serverChartData.monthData) not found or invalid. monthlyCtx:', monthlyCtx, 'monthLabels:', serverChartData.monthLabels, 'monthData:', serverChartData.monthData);
    }

    // --- Chart 3: Entry Length Trend ---
    const entryLengthCtx = document.getElementById('entryLengthChart');
    if (entryLengthCtx && serverChartData.entryDates && serverChartData.entryLengths) {
        try {
            new Chart(entryLengthCtx, {
                type: 'line',
                data: {
                    labels: serverChartData.entryDates,
                    datasets: [{
                        label: 'Entry Length (chars)',
                        data: serverChartData.entryLengths,
                        borderColor: 'rgba(255, 159, 64, 1)', // Orange
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (chartError) {
            console.error("Error initializing Entry Length Chart:", chartError, "Data used:", { dates: serverChartData.entryDates, lengths: serverChartData.entryLengths });
        }
    } else {
        console.warn('Canvas "entryLengthChart" or its data (serverChartData.entryDates, serverChartData.entryLengths) not found or invalid. entryLengthCtx:', entryLengthCtx, 'entryDates:', serverChartData.entryDates, 'entryLengths:', serverChartData.entryLengths);
    }

    // --- Chart 4: Bookmarked vs Regular Entries ---
    const bookmarkCtx = document.getElementById('bookmarkChart');
    if (bookmarkCtx && typeof serverChartData.bookmarkedCount !== 'undefined' && typeof serverChartData.totalEntries !== 'undefined') {
        const bookmarked = serverChartData.bookmarkedCount;
        const regularEntries = serverChartData.totalEntries - serverChartData.bookmarkedCount;
        
        if (serverChartData.totalEntries > 0) {
            try {
                new Chart(bookmarkCtx, {
                    type: 'doughnut', 
                    data: {
                        labels: ['Bookmarked', 'Regular'],
                        datasets: [{
                            label: 'Entry Types',
                            data: [bookmarked, regularEntries],
                            backgroundColor: [
                                'rgba(255, 206, 86, 0.7)', 
                                'rgba(153, 102, 255, 0.7)'  
                            ],
                            borderColor: [
                                'rgba(255, 206, 86, 1)',
                                'rgba(153, 102, 255, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'top',
                                display: true 
                            },
                            title: { display: false }
                        }
                    }
                });
            } catch (chartError) {
                console.error("Error initializing Bookmark Chart:", chartError, "Data used:", { bookmarked: bookmarked, regular: regularEntries });
            }
        } else {
            if(bookmarkCtx.parentNode && bookmarkCtx.parentNode.classList.contains('chart-container')) {
                bookmarkCtx.parentNode.innerHTML = '<p style="text-align:center; padding: 20px; height: 100%; display: flex; align-items: center; justify-content: center;">No entries to display stats for.</p>';
            } else {
                 bookmarkCtx.innerHTML = '<p style="text-align:center; padding: 20px;">No entries to display stats for.</p>';
            }
            console.log('No entries to display for bookmark chart.');
        }
    } else {
        console.warn('Canvas "bookmarkChart" or its data (serverChartData.bookmarkedCount, serverChartData.totalEntries) not found or invalid. bookmarkCtx:', bookmarkCtx, 'bookmarkedCount:', serverChartData.bookmarkedCount, 'totalEntries:', serverChartData.totalEntries);
    }
});