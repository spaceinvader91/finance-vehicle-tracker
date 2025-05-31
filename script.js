// TAB SWITCHING FUNCTIONALITY
function openTab(tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    event.currentTarget.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
    // Open the default tab (finance) on page load
    document.getElementsByClassName("tablinks")[0].click();
    updateDateTime();
    calculateNextPayday();
    loadSavedData();    // Finance data
    loadVehicleData();  // Vehicle data
});

// ---------- [Finance Tracker Functions] ----------

// Update Date & Time Display
function updateDateTime() {
    const now = new Date();
    document.getElementById("dateTime").innerText = now.toLocaleString();
}

// Calculate Next Payday (Last Friday of the Month)
function calculateNextPayday() {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let lastDay = new Date(year, month, 0);
    while (lastDay.getDay() !== 5) {
        lastDay.setDate(lastDay.getDate() - 1);
    }
    document.getElementById("nextPayday").innerText = lastDay.toDateString();
}

// Track (or Update) the Single Income Entry
function addIncome() {
    const source = document.getElementById("incomeSource").value;
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    if (!source || isNaN(amount)) return;
    document.getElementById("incomeList").innerHTML = `<li>${source}: <strong>€${amount.toFixed(2)}</strong></li>`;
    updateAllSavings();
    saveDataToLocalStorage();
}

// Add Direct Debit Entry with Remove and Mark-as-Paid Buttons
function addDebit() {
    const company = document.getElementById("debitCompany").value;
    const amount = parseFloat(document.getElementById("debitAmount").value);
    const paymentDay = parseInt(document.getElementById("debitDay").value);
    const currency = document.getElementById("currencySelector").value;
    if (!company || isNaN(amount) || isNaN(paymentDay)) return;

    // Calculate the due date and adjust for weekends
    let paymentDate = new Date();
    paymentDate.setDate(paymentDay);
    if (paymentDate.getDay() === 6) paymentDate.setDate(paymentDate.getDate() + 2);
    else if (paymentDate.getDay() === 0) paymentDate.setDate(paymentDate.getDate() + 1);

    const currencySymbol = (currency === "€") ? "€" : "£";
    const listItem = document.createElement("li");
    // Embed the due date in a data attribute for sorting
    listItem.setAttribute("data-due", paymentDate.toISOString());
    listItem.innerHTML = `${company}: ${currencySymbol}${amount.toFixed(2)} (Due: ${paymentDate.toDateString()}) `;

    // Create "Mark as Paid" Button
    const paidButton = document.createElement("button");
    paidButton.textContent = "Mark as Paid";
    paidButton.style.marginLeft = "10px";
    paidButton.onclick = function () {
        listItem.classList.toggle("paid");
        saveDataToLocalStorage();
    };
    listItem.appendChild(paidButton);

    // Create "Remove" Button
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.style.marginLeft = "10px";
    removeButton.onclick = function () {
        listItem.remove();
        updateAllSavings();
        saveDataToLocalStorage();
    };
    listItem.appendChild(removeButton);

    document.getElementById("debitList").appendChild(listItem);
    sortDebits();
    updateAllSavings();
    saveDataToLocalStorage();
}

// Toggle the visibility of the Direct Debit list (collapsible)
function toggleDebitList() {
    const debitList = document.getElementById("debitList");
    debitList.classList.toggle("collapsed");
}


// Automatically sort debit items by due date (earliest first)
function sortDebits() {
    const list = document.getElementById("debitList");
    const items = Array.from(list.getElementsByTagName("li"));
    items.sort((a, b) => new Date(a.getAttribute("data-due")) - new Date(b.getAttribute("data-due")));
    items.forEach(item => list.appendChild(item));
}

// Update Total Direct Debits, converting GBP entries to EUR when necessary
function updateTotalDebits() {
    let totalDebitsEUR = 0;
    document.querySelectorAll("#debitList li").forEach(item => {
        const text = item.textContent;
        // Look for a currency symbol (€ or £) followed by the numeric value.
        const match = text.match(/[€£]([\d.]+)/);
        if (match) {
            let amt = parseFloat(match[1]);
            // Determine currency based on the presence of the Pound symbol
            const curr = text.includes("£") ? "£" : "€";
            if (curr === "£") {
                amt *= 1.19; // Convert GBP to EUR at a fixed rate
            }
            totalDebitsEUR += amt;
        }
    });
    document.getElementById("totalDebits").innerHTML = `Total Direct Debits: <strong>€${totalDebitsEUR.toFixed(2)}</strong>`;
    return totalDebitsEUR;
}


// Unified Savings Calculation Function
function updateAllSavings() {
    // Recalculate total direct debits
    const totalDebits = updateTotalDebits();

    // Retrieve income; expected format: "Source: <strong>€amount</strong>"
    let incomeTotal = 0;
    const incomeItem = document.querySelector("#incomeList li");
    if (incomeItem) {
        const match = incomeItem.innerText.match(/€([\d.]+)/);
        if (match) { incomeTotal = parseFloat(match[1]); }
    }

    // Compute Gross Savings (income minus direct debits) – not directly displayed
    // Determine allowed spending based on weekly spend input and period between paydays
    const weeklySpend = parseFloat(document.getElementById("weeklySpend").value) || 0;
    const today = new Date();

    // Compute current payday (most recent Friday)
    let currentPayday = new Date(today);
    while (currentPayday.getDay() !== 5) {
        currentPayday.setDate(currentPayday.getDate() - 1);
    }

    // Compute next payday as the last Friday of the current month (or next month if already passed)
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let nextPayday = new Date(year, month, 0);
    while (nextPayday.getDay() !== 5) {
        nextPayday.setDate(nextPayday.getDate() - 1);
    }
    if (today > nextPayday) {
        month = today.getMonth() + 2;
        nextPayday = new Date(year, month, 0);
        while (nextPayday.getDay() !== 5) {
            nextPayday.setDate(nextPayday.getDate() - 1);
        }
    }

    const diffDays = (nextPayday - currentPayday) / (1000 * 60 * 60 * 24);
    const weeks = diffDays / 7;
    const periodWeeks = Number(weeks.toFixed(2));
    document.getElementById("periodWeeks").innerHTML = `<strong>${periodWeeks}</strong>`;

    // Allowed spending = weeklySpend × weeks
    const allowedSpending = weeklySpend * weeks;
    document.getElementById("allowedSpending").innerHTML = `<strong>€${allowedSpending.toFixed(2)}</strong>`;

    // New definition: Net Monthly Savings = Income - (Total Direct Debits + Allowed Spending)
    const netMonthlySavings = incomeTotal - totalDebits - allowedSpending;
    document.getElementById("monthlySavings").innerHTML = `<strong>€${netMonthlySavings.toFixed(2)}</strong>`;
    document.getElementById("netSavings").innerHTML = `<strong>€${netMonthlySavings.toFixed(2)}</strong>`;

    // Estimated target date calculation:
    const currentSavings = parseFloat(document.getElementById("currentSavings").value) || 0;
    const target = parseFloat(document.getElementById("savingsTarget").value);
    if (target && netMonthlySavings > 0 && target > currentSavings) {
        const remainingAmount = target - currentSavings;
        const months = Math.ceil(remainingAmount / netMonthlySavings);
        const estimatedTargetDate = new Date();
        estimatedTargetDate.setMonth(estimatedTargetDate.getMonth() + months);
        document.getElementById("targetDate").innerHTML = `<strong>${estimatedTargetDate.toDateString()}</strong>`;
    } else {
        document.getElementById("targetDate").innerHTML = `<strong>N/A</strong>`;
    }

    //Update Summary
    updateSummary();
}
function updateSummary() {
    // Retrieve income from the income list (expected format: "Source: €amount")
    let incomeTotal = 0;
    const incomeItem = document.querySelector("#incomeList li");
    if (incomeItem) {
        const match = incomeItem.innerText.match(/€([\d.]+)/);
        if (match) {
            incomeTotal = parseFloat(match[1]);
        }
    }

    // Retrieve and recalculate the total direct debits (using your existing function)
    const totalDebits = updateTotalDebits(); // This function returns the sum in EUR

    // Calculate allowed spending from the weekly spending input and period between current & next payday.
    const weeklySpend = parseFloat(document.getElementById("weeklySpend").value) || 0;
    const today = new Date();

    // Find current payday (using Friday as payday)
    let currentPayday = new Date(today);
    while (currentPayday.getDay() !== 5) {
        currentPayday.setDate(currentPayday.getDate() - 1);
    }

    // Determine next payday as the last Friday of this month (or next month if already passed)
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let nextPayday = new Date(year, month, 0);
    while (nextPayday.getDay() !== 5) {
        nextPayday.setDate(nextPayday.getDate() - 1);
    }
    if (today > nextPayday) {
        month = today.getMonth() + 2;
        nextPayday = new Date(year, month, 0);
        while (nextPayday.getDay() !== 5) {
            nextPayday.setDate(nextPayday.getDate() - 1);
        }
    }

    // Calculate duration in weeks between current and next payday
    const diffDays = (nextPayday - currentPayday) / (1000 * 60 * 60 * 24);
    const weeks = diffDays / 7;
    const allowedSpending = weeklySpend * weeks;

    // Total Money Out = Direct Debits + Allowed Spending
    const totalOut = totalDebits + allowedSpending;

    // Net Savings = Income - Money Out
    const netSavings = incomeTotal - totalOut;

    // Update the summary section
    document.getElementById("summary-income").innerText = "€" + incomeTotal.toFixed(2);
    document.getElementById("summary-out").innerText = "€" + totalOut.toFixed(2);
    document.getElementById("summary-net").innerText = "€" + netSavings.toFixed(2);
}


// Save All Finance Data to localStorage
function saveDataToLocalStorage() {
    const incomeData = document.getElementById("incomeList").innerHTML;
    const debitData = document.getElementById("debitList").innerHTML;
    const currentSavings = document.getElementById("currentSavings").value;
    const savingsTarget = document.getElementById("savingsTarget").value;
    const weeklySpend = document.getElementById("weeklySpend").value;

    localStorage.setItem("incomeData", incomeData);
    localStorage.setItem("debitData", debitData);
    localStorage.setItem("currentSavings", currentSavings);
    localStorage.setItem("savingsTarget", savingsTarget);
    localStorage.setItem("weeklySpend", weeklySpend);
}

// Load Finance Data from localStorage on Page Load
function loadSavedData() {
    document.getElementById("incomeList").innerHTML = localStorage.getItem("incomeData") || "";
    document.getElementById("debitList").innerHTML = localStorage.getItem("debitData") || "";
    document.getElementById("currentSavings").value = localStorage.getItem("currentSavings") || "";
    document.getElementById("savingsTarget").value = localStorage.getItem("savingsTarget") || "";
    document.getElementById("weeklySpend").value = localStorage.getItem("weeklySpend") || "";

    updateAllSavings();
}

function clearLocalData() {
    if (confirm("Are you sure you want to clear all local data? This cannot be undone.")) {
        localStorage.clear();
        alert("Local data has been cleared.");
        location.reload();
    }
}


// ---------- [Vehicle Tracker Functions] ----------

function saveVehicleData() {
    const vehicles = [];
    for (let i = 1; i <= 3; i++) {
        let vehicle = {
            name: document.getElementById("vehicle" + i + "Name").value,
            mot: document.getElementById("vehicle" + i + "Mot").value,
            insurance: document.getElementById("vehicle" + i + "Insurance").value,
            tax: document.getElementById("vehicle" + i + "Tax").value
        };
        vehicles.push(vehicle);
    }
    localStorage.setItem("vehicleData", JSON.stringify(vehicles));
    alert("Vehicle data saved!");
}

function loadVehicleData() {
    let data = localStorage.getItem("vehicleData");
    if (data) {
        const vehicles = JSON.parse(data);
        for (let i = 1; i <= 3; i++) {
            if (vehicles[i - 1]) {
                document.getElementById("vehicle" + i + "Name").value = vehicles[i - 1].name;
                document.getElementById("vehicle" + i + "Mot").value = vehicles[i - 1].mot;
                document.getElementById("vehicle" + i + "Insurance").value = vehicles[i - 1].insurance;
                document.getElementById("vehicle" + i + "Tax").value = vehicles[i - 1].tax;
            }
        }
    }
}
