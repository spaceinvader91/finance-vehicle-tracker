// ---------------------------
// TAB AND STORAGE FUNCTIONS
// ---------------------------

// Tab switching function
function openTab(tabName) {
    let tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    let tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    let tabElement = document.getElementById(tabName);
    if (tabElement) {
        tabElement.style.display = "block";
    } else {
        console.error(`Tab "${tabName}" not found.`);
    }
    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }
}

// Clears local storage and reloads the page.
function clearLocalData() {
    if (confirm("Are you sure you want to clear all local data?")) {
        localStorage.clear();
        location.reload();
    }
}

// Save and load Income List
function saveIncomeList() {
    let incomeListHTML = document.getElementById("incomeList").innerHTML;
    localStorage.setItem("incomeList", incomeListHTML);
}

function loadIncomeList() {
    let incomeListHTML = localStorage.getItem("incomeList");
    if (incomeListHTML) {
        document.getElementById("incomeList").innerHTML = incomeListHTML;
    }
}

// Save and load Direct Debits List
function saveDirectDebitsList() {
    let debitListHTML = document.getElementById("debitList").innerHTML;
    localStorage.setItem("debitList", debitListHTML);
}

function loadDirectDebitsList() {
    let debitListHTML = localStorage.getItem("debitList");
    if (debitListHTML) {
        document.getElementById("debitList").innerHTML = debitListHTML;
    }
}

// ---------------------------
// VEHICLE TRACKER FUNCTIONS
// ---------------------------

// Load vehicle data for 3 vehicles from localStorage
function loadVehicleData() {
    let data = localStorage.getItem("vehicleData");
    // Ensure data is valid—if null or "null", default to an empty array.
    if (!data || data === "null") {
        data = "[]";
    }
    let vehicles = JSON.parse(data);
    for (let i = 1; i <= vehicles.length; i++) {
        if (vehicles[i - 1]) {
            document.getElementById("vehicle" + i + "Mot").value = vehicles[i - 1].mot;
            document.getElementById("vehicle" + i + "Insurance").value = vehicles[i - 1].insurance;
            document.getElementById("vehicle" + i + "Tax").value = vehicles[i - 1].tax;
        }
    }
}

// Save vehicle data for 3 vehicles into localStorage
function saveVehicleData() {
    let vehicles = [];
    for (let i = 1; i <= 3; i++) {
        vehicles.push({
            mot: document.getElementById("vehicle" + i + "Mot").value,
            insurance: document.getElementById("vehicle" + i + "Insurance").value,
            tax: document.getElementById("vehicle" + i + "Tax").value
        });
    }
    localStorage.setItem("vehicleData", JSON.stringify(vehicles));
    alert("Vehicle data saved!");
}

// ---------------------------
// FINANCE FUNCTIONS
// ---------------------------

// Add Income entry
function addIncome() {
    const source = document.getElementById("incomeSource").value;
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    if (!source || isNaN(amount)) return;
    document.getElementById("incomeList").innerHTML = `<li>${source}: €${amount.toFixed(2)}</li>`;
    saveIncomeList();
    updateSummary();
}

// Helper: Get selected currency from the switch
function getSelectedCurrency() {
    let currencySwitch = document.getElementById("currencySwitch");
    return currencySwitch && currencySwitch.checked ? "£" : "€";
}

// Add Direct Debit entry with the updated currency switch
function addDebit() {
    const company = document.getElementById("debitCompany").value;
    const amount = parseFloat(document.getElementById("debitAmount").value);
    const paymentDay = parseInt(document.getElementById("debitDay").value);
    const currency = getSelectedCurrency();
    if (!company || isNaN(amount) || isNaN(paymentDay)) return;

    let paymentDate = new Date();
    paymentDate.setDate(paymentDay);
    // Adjust for weekends if necessary
    if (paymentDate.getDay() === 6) {
        paymentDate.setDate(paymentDate.getDate() + 2);
    } else if (paymentDate.getDay() === 0) {
        paymentDate.setDate(paymentDate.getDate() + 1);
    }

    const li = document.createElement("li");
    li.setAttribute("data-due", paymentDate.toISOString());
    li.innerHTML = `
    <div class="debit-info">
      <span class="debit-company">${company}:</span>
      <span class="debit-amount"><strong>${currency}${amount.toFixed(2)}</strong></span>
    </div>
    <div class="debit-date"><strong>${formatDate(paymentDate)}</strong></div>
    <div class="debit-buttons">
      <button onclick="markAsPaid(this)">Mark as Paid</button>
      <button onclick="removeDebit(this)">Remove</button>
    </div>
  `;

    document.getElementById("debitList").appendChild(li);
    sortDebits();
    saveDirectDebitsList();
    updateSummary();
}

// Sort Direct Debits by due date
function sortDebits() {
    const list = document.getElementById("debitList");
    const items = Array.from(list.getElementsByTagName("li"));
    items.sort((a, b) => new Date(a.getAttribute("data-due")) - new Date(b.getAttribute("data-due")));
    items.forEach(item => list.appendChild(item));
    saveDirectDebitsList();
}

// Toggle "paid" status on a Direct Debit item
function markAsPaid(btn) {
    const li = btn.closest("li");
    li.classList.toggle("paid");
    saveDirectDebitsList();
    updateSummary();
}

// Remove a Direct Debit item
function removeDebit(btn) {
    const li = btn.closest("li");
    if (li) {
        li.remove();
    }
    saveDirectDebitsList();
    updateSummary();
}

// Collapse/Expand the Direct Debit List
function toggleDebitList() {
    const list = document.getElementById("debitList");
    list.classList.toggle("collapsed");
    saveDirectDebitsList();
}

// Calculate Total Direct Debits (including conversion for GBP)
function updateTotalDebits() {
    let totalDebitsEUR = 0;
    let totalDebitsGBP = 0;

    document.querySelectorAll("#debitList li").forEach(item => {
        const text = item.textContent;
        const match = text.match(/[€£]([\d.]+)/);
        if (match) {
            let amt = parseFloat(match[1]);
            const curr = text.includes("£") ? "£" : "€";
            if (curr === "£") {
                totalDebitsGBP += amt;
            } else {
                totalDebitsEUR += amt;
            }
        }
    });

    const convertedGBP = totalDebitsGBP * 1.19;
    const overallTotal = totalDebitsEUR + convertedGBP;

    document.getElementById("totalDebits").innerHTML =
        `EUR Debits: <strong>€${totalDebitsEUR.toFixed(2)}</strong><br>` +
        `GBP Debits: <strong>£${totalDebitsGBP.toFixed(2)}</strong><br>` +
        `Overall Total (in EUR): <strong>€${overallTotal.toFixed(2)}</strong>`;

    return overallTotal;
}

// ---------------------------
// HELPER FUNCTIONS FOR PAYDAY CALCULATIONS
// ---------------------------

// Returns the last Friday for a given month (month is 0-indexed)
function getLastFriday(year, month) {
    let lastDay = new Date(year, month + 1, 0);
    while (lastDay.getDay() !== 5) {
        lastDay.setDate(lastDay.getDate() - 1);
    }
    return lastDay;
}

// Returns the next payday. If today is before this month’s last Friday, return that; otherwise, next month's.
function getNextPayday() {
    let today = new Date();
    let thisMonthFriday = getLastFriday(today.getFullYear(), today.getMonth());
    return today <= thisMonthFriday ? thisMonthFriday : getLastFriday(today.getFullYear(), today.getMonth() + 1);
}

// Calculate Estimated Target Date based on needed paydays (last Friday of each month)
function calculateEstimatedTargetDate(currentSavings, savingsTarget, netSavings) {
    if (savingsTarget > currentSavings && netSavings > 0) {
        let paydaysNeeded = Math.ceil((savingsTarget - currentSavings) / netSavings);
        let targetDate = getNextPayday();
        for (let i = 1; i < paydaysNeeded; i++) {
            let nextYear = targetDate.getFullYear();
            let nextMonth = targetDate.getMonth() + 1;
            targetDate = getLastFriday(nextYear, nextMonth);
        }
        return targetDate.toDateString();
    }
    return "N/A";
}

// ---------------------------
// DATE FORMATTING HELPER
// ---------------------------
function formatDate(date) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[date.getDay()];
    const day = ("0" + date.getDate()).slice(-2);
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const year = date.getFullYear();
    return `${dayName} - ${day}/${month}/${year}`;
}

// ---------------------------
// UPDATE SUMMARY FUNCTION
// ---------------------------
function updateSummary() {
    let weeklySpend = parseFloat(document.getElementById("weeklySpend").value) || 0;
    let currentSavings = parseFloat(document.getElementById("currentSavings").value) || 0;
    let savingsTarget = parseFloat(document.getElementById("savingsTarget").value) || 0;

    localStorage.setItem("weeklySpend", weeklySpend);
    localStorage.setItem("currentSavings", currentSavings);
    localStorage.setItem("savingsTarget", savingsTarget);

    const totalDebits = updateTotalDebits();
    const monthlySpending = weeklySpend * 4;
    const totalOut = totalDebits + monthlySpending;

    let incomeTotal = 0;
    const incomeItem = document.querySelector("#incomeList li");
    if (incomeItem) {
        const match = incomeItem.innerText.match(/€([\d.]+)/);
        if (match) {
            incomeTotal = parseFloat(match[1]);
        }
    }

    const netSavings = incomeTotal - totalOut;
    let estimatedTargetDate = calculateEstimatedTargetDate(currentSavings, savingsTarget, netSavings);
    let nextPayday = getNextPayday();

    document.getElementById("summary-income").innerText = `€${incomeTotal.toFixed(2)}`;
    document.getElementById("summary-out").innerText = `€${totalOut.toFixed(2)}`;
    document.getElementById("summary-net").innerText = `€${netSavings.toFixed(2)}`;
    document.getElementById("targetDate").innerText = estimatedTargetDate;
    document.getElementById("nextPayday").innerText = nextPayday.toDateString();
}

// ---------------------------
// EXPORT/IMPORT FUNCTIONS
// ---------------------------
function exportLocalData() {
    const data = {
        incomeList: localStorage.getItem("incomeList"),
        debitList: localStorage.getItem("debitList"),
        weeklySpend: localStorage.getItem("weeklySpend"),
        currentSavings: localStorage.getItem("currentSavings"),
        savingsTarget: localStorage.getItem("savingsTarget"),
        vehicleData: localStorage.getItem("vehicleData")
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-vehicle-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importLocalData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.incomeList !== undefined)
                localStorage.setItem("incomeList", data.incomeList);
            if (data.debitList !== undefined)
                localStorage.setItem("debitList", data.debitList);
            if (data.weeklySpend !== undefined)
                localStorage.setItem("weeklySpend", data.weeklySpend);
            if (data.currentSavings !== undefined)
                localStorage.setItem("currentSavings", data.currentSavings);
            if (data.savingsTarget !== undefined)
                localStorage.setItem("savingsTarget", data.savingsTarget);
            if (data.vehicleData !== undefined)
                localStorage.setItem("vehicleData", data.vehicleData);
            alert("Data imported successfully. Refreshing page...");
            location.reload();
        } catch (err) {
            alert("Error reading file: " + err);
        }
    };
    reader.readAsText(file);
}

function triggerImport() {
    document.getElementById("importFile").click();
}

// ---------------------------
// LOAD FINANCE DATA FUNCTION
// ---------------------------
function loadFinanceData() {
    const weeklySpend = localStorage.getItem("weeklySpend");
    if (weeklySpend !== null) {
        document.getElementById("weeklySpend").value = weeklySpend;
    }
    const currentSavings = localStorage.getItem("currentSavings");
    if (currentSavings !== null) {
        document.getElementById("currentSavings").value = currentSavings;
    }
    const savingsTarget = localStorage.getItem("savingsTarget");
    if (savingsTarget !== null) {
        document.getElementById("savingsTarget").value = savingsTarget;
    }
}

// ---------------------------
// INITIALIZATION: Run after the DOM loads
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const refreshButton = document.getElementById("refreshButton");
        if (refreshButton) {
            refreshButton.addEventListener("click", updateSummary);
        } else {
            console.error("Element 'refreshButton' not found.");
        }
        const defaultOpen = document.getElementById("defaultOpen");
        if (defaultOpen) defaultOpen.click();

        // Load saved data into inputs and lists
        loadIncomeList();
        loadDirectDebitsList();
        loadVehicleData();
        loadFinanceData();
        updateSummary();

        const debitList = document.getElementById("debitList");
        if (debitList) {
            debitList.classList.add("collapsed");
        }
    }, 100);
});
