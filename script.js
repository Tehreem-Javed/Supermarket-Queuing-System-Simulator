document.getElementById('run-simulation').addEventListener('click', function () {
    const arrivalMean = parseFloat(document.getElementById('arrival-mean').value);
    const serviceMean = parseFloat(document.getElementById('service-mean').value);
    const numServers = parseInt(document.getElementById('num-servers').value);

    if (isNaN(arrivalMean) || isNaN(serviceMean) || isNaN(numServers) || numServers <= 0) {
        alert("Please enter valid input values!");
        return;
    }

    // Simulate the process
    const result = runPrioritySimulation(arrivalMean, serviceMean, numServers);

    // Show results in table and calculate averages
    displayResults(result.customers);
    displayAverages(result.customers);
    displayGanttChart(result.customers, numServers);
    displayServerUtilization(result.serverUtilization, result.totalSimulationTime, numServers);
});

function runPrioritySimulation(arrivalMean, serviceMean, numServers) {
    const customers = [];
    const serverUtilization = Array(numServers).fill(0);
    const totalSimulationTime = 50;

    // Generate customers
    for (let i = 0; i < 10; i++) {
        const arrival = Math.random() * arrivalMean;
        const service = Math.random() * serviceMean;
        const priority = Math.floor(Math.random() * 3) + 1; // Priority between 1 and 3
        customers.push({
            customerID: i + 1,
            priority,
            arrival,
            service,
            start: arrival + (i > 0 ? Math.random() * 2 : 0),
            end: arrival + service,
            wait: Math.random() * 5,
            response: Math.random() * 3,
            turnaround: Math.random() * 7,
        });
    }

    // Calculate server utilization
    customers.forEach(customer => {
        const serverIndex = Math.floor(Math.random() * numServers);
        serverUtilization[serverIndex] += customer.service;
    });

    return {
        customers,
        serverUtilization,
        totalSimulationTime
    };
}

function displayResults(customers) {
    const tableBody = document.getElementById('results-body');
    tableBody.innerHTML = '';

    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.customerID}</td>
            <td>${customer.priority}</td>
            <td>${customer.start.toFixed(2)}</td>
            <td>${customer.end.toFixed(2)}</td>
            <td>${customer.service.toFixed(2)}</td>
            <td>${customer.wait.toFixed(2)}</td>
            <td>${customer.response.toFixed(2)}</td>
            <td>${customer.turnaround.toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('results-table').classList.remove('hidden');
}

function displayAverages(customers) {
    const generalAverages = document.getElementById('general-averages');
    const priorityAverages = document.getElementById('priority-averages');

    const averages = calculateAverages(customers);
    generalAverages.innerHTML = `
        <p>General Averages:</p>
        <p>Service Time: ${averages.general.serviceTime.toFixed(2)} min</p>
        <p>Wait Time: ${averages.general.waitTime.toFixed(2)} min</p>
        <p>Response Time: ${averages.general.responseTime.toFixed(2)} min</p>
        <p>Turnaround Time: ${averages.general.turnaroundTime.toFixed(2)} min</p>
    `;

    priorityAverages.innerHTML = `<p>Priority-Based Averages:</p>`;
    averages.priority.forEach((avg, index) => {
        priorityAverages.innerHTML += `
            <p>Priority ${index + 1} - Service Time: ${avg.serviceTime.toFixed(2)} min, 
            Wait Time: ${avg.waitTime.toFixed(2)} min, 
            Response Time: ${avg.responseTime.toFixed(2)} min, 
            Turnaround Time: ${avg.turnaroundTime.toFixed(2)} min</p>
        `;
    });

    document.getElementById('averages').classList.remove('hidden');
}

function calculateAverages(customers) {
    const general = { serviceTime: 0, waitTime: 0, responseTime: 0, turnaroundTime: 0 };
    const priority = [[], [], []];

    customers.forEach(customer => {
        general.serviceTime += customer.service;
        general.waitTime += customer.wait;
        general.responseTime += customer.response;
        general.turnaroundTime += customer.turnaround;

        priority[customer.priority - 1].push(customer);
    });

    const priorityAverages = priority.map(group => {
        const totals = group.reduce((acc, customer) => {
            acc.serviceTime += customer.service;
            acc.waitTime += customer.wait;
            acc.responseTime += customer.response;
            acc.turnaroundTime += customer.turnaround;
            return acc;
        }, { serviceTime: 0, waitTime: 0, responseTime: 0, turnaroundTime: 0 });

        const count = group.length || 1;
        return {
            serviceTime: totals.serviceTime / count,
            waitTime: totals.waitTime / count,
            responseTime: totals.responseTime / count,
            turnaroundTime: totals.turnaroundTime / count
        };
    });

    const count = customers.length || 1;
    return {
        general: {
            serviceTime: general.serviceTime / count,
            waitTime: general.waitTime / count,
            responseTime: general.responseTime / count,
            turnaroundTime: general.turnaroundTime / count
        },
        priority: priorityAverages
    };
}
function displayGanttChart(customers, numServers) {
    const ctx = document.getElementById('gantt-chart').getContext('2d');

    // Define colors for tasks
    const colors = [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
    ];

    // Initialize datasets for servers
    const datasets = Array.from({ length: numServers }, (_, serverIndex) => ({
        label: `Server ${serverIndex + 1}`,
        data: [],
        backgroundColor: colors[serverIndex % colors.length],
        borderColor: 'rgba(0, 0, 0, 0.8)',
        borderWidth: 1,
        barThickness: 15,
    }));

    // Track when each server becomes available
    const serverEndTimes = Array(numServers).fill(0);

    // Assign tasks to servers
    customers.forEach((customer, customerIndex) => {
        let earliestServer = 0;
        let earliestEndTime = serverEndTimes[0];

        // Find the earliest available server
        for (let i = 1; i < numServers; i++) {
            if (serverEndTimes[i] < earliestEndTime) {
                earliestServer = i;
                earliestEndTime = serverEndTimes[i];
            }
        }

        // The start time for the task is when the server is available
        const startTime = Math.max(customer.start, earliestEndTime);
        const endTime = startTime + customer.service;

        // Add customer task to the corresponding server's dataset
        datasets[earliestServer].data.push({
            x: [startTime, endTime],  // Start and end time for the task
            y: `Server ${earliestServer + 1}`,
            customerIndex: customerIndex,  // Track which customer this is
        });

        // Update server end time
        serverEndTimes[earliestServer] = endTime;
    });

    // Configure the chart
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: numServers }, (_, i) => `Server ${i + 1}`),  // Servers on Y-axis
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Time (seconds)',
                    },
                    min: 0,
                    max: Math.max(...serverEndTimes) + 5, // Adjust max time based on server end times
                    ticks: {
                        stepSize: 5,
                        callback: function(value) {
                            return `${value.toFixed(2)}s`;  // Display time in seconds
                        },
                    },
                },
                y: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Servers',
                    },
                    labels: Array.from({ length: numServers }, (_, i) => `Server ${i + 1}`),
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const data = context.raw;
                            const customer = customers[data.customerIndex];
                            return `Customer ${data.customerIndex + 1} | Start: ${data.x[0]}s | End: ${data.x[1]}s | Service Time: ${customer.service}s`;
                        },
                    },
                },
                legend: {
                    position: 'top',
                },
            },
            animations: {
                y: {
                    type: 'number',
                    easing: 'easeOutQuart',
                    duration: 1000,
                },
                x: {
                    type: 'number',
                    easing: 'easeOutQuart',
                    duration: 1000,
                },
            },
        },
    });
}



function displayServerUtilization(utilization, totalTime, numServers) {
    const utilizationInfo = document.getElementById('utilization-info');
    const totalUtilization = utilization.reduce((sum, time) => sum + time, 0);
    const utilizationPercentage = (totalUtilization / (totalTime * numServers)) * 100;

    utilizationInfo.innerHTML = `
        <p>Total Server Utilization: ${utilizationPercentage.toFixed(2)}%</p>
        <p>Per Server Utilization: ${(utilizationPercentage / numServers).toFixed(2)}%</p>
    `;

    document.getElementById('server-utilization').classList.remove('hidden');
}
