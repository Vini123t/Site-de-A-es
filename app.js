let stompClient = null;
let connected = false;
let stocksLoaded = false;
let previousStocks = {};
let stockData = {};

function connect() {
    try {
        const socket = new SockJS('http://localhost:8080/stock-prices');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, function (frame) {
            console.log('Connected: ' + frame);
            connected = true;

            stompClient.subscribe('/topic/stock-prices', function (response) {
                const stocks = JSON.parse(response.body);
                console.log('Received stocks:', stocks);

                if (!stocksLoaded) {
                    createStockBlocks(stocks);
                    stocksLoaded = true;
                } else {
                    updateStockBlocks(stocks);
                }
            });
        }, function (error) {
            console.log('Connection lost, retrying in 5 seconds...', error);
            connected = false;
            setTimeout(reconnect, 5000);
        });
    } catch (e) {
        console.error('Error during connection setup:', e);
    }
}

function reconnect() {
    if (!connected) {
        console.log('Reconnecting...');
        connect();
    }
}

function createStockBlocks(stocks) {
    const container = document.getElementById('stock-container');
    container.innerHTML = '';

    stocks.forEach(stock => {
        const stockBlock = document.createElement('div');
        stockBlock.className = 'stock-block';
        stockBlock.id = stock.name.replace(/\s+/g, '-').toLowerCase();
        stockBlock.onclick = () => showStockChart(stock.name);

        const stockName = document.createElement('h2');
        stockName.innerHTML = `${stock.name} <span class="arrow">↔</span>`;

        const stockPrice = document.createElement('p');
        stockPrice.innerHTML = stock.price.toFixed(2);
        stockPrice.style.fontSize = '24px';

       

        stockBlock.appendChild(stockName);
        stockBlock.appendChild(stockPrice);
       

        container.appendChild(stockBlock);

        previousStocks[stock.name] = stock.price;
        stockData[stock.name] = [{ date: new Date().toLocaleTimeString(), price: stock.price }]; 
    });
}

function updateStockBlocks(stocks) {
    stocks.forEach(stock => {
        const stockId = stock.name.replace(/\s+/g, '-').toLowerCase();
        const stockBlock = document.getElementById(stockId);

        if (stockBlock) {
            const stockName = stockBlock.querySelector('h2');
            const stockPrice = stockBlock.querySelector('p');
            const arrow = stockName.querySelector('.arrow');
            const previousPrice = previousStocks[stock.name];

            if (previousPrice < stock.price) {
                arrow.className = 'arrow arrow-up';
                arrow.innerHTML = '▲';
                stockPrice.className = 'price-up';
            } else if (previousPrice > stock.price) {
                arrow.className = 'arrow arrow-down';
                arrow.innerHTML = '▼';
                stockPrice.className = 'price-down';
            } else {
                arrow.className = 'arrow';
                arrow.innerHTML = '↔';
                stockPrice.className = '';
            }

            stockPrice.innerHTML = stock.price.toFixed(2);
            previousStocks[stock.name] = stock.price;

            stockData[stock.name].push({ date: new Date().toLocaleTimeString(), price: stock.price }); 
            console.log(`Updated ${stock.name} with price: ${stock.price.toFixed(2)}`);
        } else {
            createStockBlocks([stock]);
            console.log(`Created new stock block for ${stock.name}`);
        }
    });
}

function showStockChart(stockName) {
    const modal = document.getElementById('chart-modal');
    const ctx = document.getElementById('stock-chart').getContext('2d');
    const title = document.getElementById('modal-title');

    const data = stockData[stockName] || [];
    const labels = data.map(entry => entry.date);
    const prices = data.map(entry => entry.price);

    
    const borderColors = prices.map((price, index) => {
        if (index === 0) return 'rgba(0, 0, 0, 1)';
        return price > prices[index - 1] ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
    });

    const backgroundColors = prices.map((price, index) => {
        if (index === 0) return 'rgba(0, 0, 0, 0.1)';
        return price > prices[index - 1] ? 'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)';
    });

    
    if (window.stockChart) {
        window.stockChart.destroy();
    }

   
    window.stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Preço de ${stockName}`,
                data: prices,
                borderColor: borderColors,
                backgroundColor: backgroundColors,
                borderWidth: 3,
                pointBackgroundColor: borderColors,
                pointRadius: 6,
                pointHoverRadius: 9,
                fill: true, 
                tension: 0.4 
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#333',
                        font: {
                            size: 14,
                            family: 'Arial',
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(tooltipItem) {
                            return ` $${tooltipItem.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: '#e0e0e0',
                        lineWidth: 1
                    },
                    title: {
                        display: true,
                        text: 'Hora',
                        color: '#333',
                        font: {
                            size: 14
                        }
                    }
                },
                y: {
                    grid: {
                        display: true,
                        color: '#e0e0e0',
                        lineWidth: 1
                    },
                    title: {
                        display: true,
                        text: 'Preço',
                        color: '#333',
                        font: {
                            size: 14
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return `$${value}`;
                        }
                    }
                }
            }
        }
    });


    title.innerText = `Gráfico de ${stockName}`;

    
    modal.style.display = 'block';
}

document.querySelector('.close').onclick = function() {
    document.getElementById('chart-modal').style.display = 'none';
}

window.onclick = function(event) {
    if (event.target === document.getElementById('chart-modal')) {
        document.getElementById('chart-modal').style.display = 'none';
    }
}

window.onload = function() {
    connect();
};



