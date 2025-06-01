// Switch between tabs
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

// Clear local storage with confirmation
function clearLocalData() {
    if (confirm("Are you sure you want to clear all local data?")) {
        localStorage.clear();
        location.reload();
    }
}

// ---------------- Income List Persistence Functions ----------------
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

// Import Button
function triggerImport() {
    document.getElementById("importFile").click();
}

// ---------------- Direct Debits List Persistence Functions ----------------
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

// ---------------- Add Income ----------------
function addIncome() {
    const source = document.getElementById("incomeSource").value;
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    if (!source || isNaN(amount)) return;
    document.getElementById("incomeList").innerHTML = `<li>${source}: €${amount.toFixed(2)}</li>`;
    saveIncomeList();
    updateSummary();
}

// ---------------- Add Direct Debit ----------------
function addDebit() {
    const company = document.getElementById("debitCompany").value;
    const amount = parseFloat(document.getElementById("debitAmount").value);
    const paymentDay = parseInt(document.getElementById("debitDay").value);
    const currency = document.getElementById("currencySelector").value;
    if (!company || isNaN(amount) || isNaN(paymentDay)) return;

    let paymentDate = new Date();
    paymentDate.setDate(paymentDay);
    // Adjust if payment day falls on weekend
    if (paymentDate.getDay() === 6) paymentDate.setDate(paymentDate.getDate() + 2);
    else if (paymentDate.getDay() === 0) paymentDate.setDate(paymentDate.getDate() + 1);

    const currencySymbol = (currency === "€") ? "€" : "£";
    const li = document.createElement("li");
    li.setAttribute("data-due", paymentDate.toISOString());
    li.innerHTML = `${company}: ${currencySymbol}${amount.toFixed(2)} (Due: ${paymentDate.toDateString()}) 
  <button onclick="markAsPaid(this)">Mark as Paid</button>
  <button onclick="removeDebit(this)">Remove</button>`;

    document.getElementById("debitList").appendChild(li);
    sortDebits();
    saveDirectDebitsList();
    updateSummary();
}

// ---------------- Sort Direct Debits ----------------
function sortDebits() {
    const list = document.getElementById("debitList");
    const items = Array.from(list.getElementsByTagName("li"));
    items.sort((a, b) => new Date(a.getAttribute("data-due")) - new Date(b.getAttribute("data-due")));
    items.forEach(item => list.appendChild(item));
    saveDirectDebitsList();
}

// ---------------- Mark a Debit as Paid ----------------
function markAsPaid(btn) {
    const li = btn.parentElement;
    li.classList.toggle("paid");
    saveDirectDebitsList();
    updateSummary();
}

// ---------------- Remove a Direct Debit ----------------
function removeDebit(btn) {
    const li = btn.parentElement;
    li.remove();
    saveDirectDebitsList();
    updateSummary();
}

// ---------------- Toggle Direct Debits List (Collapse/Expand) ----------------
function toggleDebitList() {
    const list = document.getElementById("debitList");
    list.classList.toggle("collapsed");
    saveDirectDebitsList();
}

// ---------------- Update Total Direct Debits ----------------
// Calculates separate totals for EUR and GBP debits, and an overall total in EUR (GBP converted to EUR).
function updateTotalDebits() {
    let totalDebitsEUR = 0;
    let totalDebitsGBP = 0;

    document.querySelectorAll("#debitList li").forEach(item => {
        const text = item.textContent;
        const match = text.match(/[€£]([\d.]+)/);
        if (match) {
            let amt = parseFloat(match[1]);
            // Check currency symbol in text
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

// ---------------- Update Summary ----------------
// Retrieves income, settings, calculates direct debits total, allowed spending,
// net savings, period until next payday, and updates Next Payday display.
function updateSummary() {
    // Retrieve values from localStorage or current input (if available)
    let weeklySpend = parseFloat(localStorage.getItem("weeklySpend")) ||
        parseFloat(document.getElementById("weeklySpend").value) || 0;
    let currentSavings = parseFloat(localStorage.getItem("currentSavings")) ||
        parseFloat(document.getElementById("currentSavings").value) || 0;
    let savingsTarget = parseFloat(localStorage.getItem("savingsTarget")) ||
        parseFloat(document.getElementById("savingsTarget").value) || 0;

    localStorage.setItem("weeklySpend", weeklySpend);
    localStorage.setItem("currentSavings", currentSavings);
    localStorage.setItem("savingsTarget", savingsTarget);

    // Retrieve income total from the income list (assuming format "Source: €amount")
    let incomeTotal = 0;
    const incomeItem = document.querySelector("#incomeList li");
    if (incomeItem) {
        const match = incomeItem.innerText.match(/€([\d.]+)/);
        if (match) { incomeTotal = parseFloat(match[1]); }
    }

    // Correctly calculate Total Money Out
    const totalDebits = updateTotalDebits(); // This now includes converted GBP amounts
    const monthlySpending = weeklySpend > 0 ? weeklySpend * 4 : 0;
    const totalOut = totalDebits + monthlySpending;

    // Net Savings correctly calculated
    const netSavings = incomeTotal - totalOut;

    // Calculate next payday (assumed as last Friday of current month)
    const today = new Date();
    let nextPayday = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    while (nextPayday.getDay() !== 5) {
        nextPayday.setDate(nextPayday.getDate() - 1);
    }
    document.getElementById("nextPayday").innerText = nextPayday.toDateString();

    // Calculate period in days until Next Payday
    const periodDays = Math.round((nextPayday - today) / (1000 * 60 * 60 * 24));

    // Estimated Target Date Calculation
    let estimatedTargetDate = "N/A";
    if (savingsTarget > currentSavings && netSavings > 0) {
        const monthsNeeded = Math.ceil((savingsTarget - currentSavings) / netSavings);
        let targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + monthsNeeded);
        estimatedTargetDate = targetDate.toDateString();
    }

    // Update summary section
    document.getElementById("summary-income").innerText = `€${incomeTotal.toFixed(2)}`;
    document.getElementById("summary-out").innerText = `€${totalOut.toFixed(2)}`;
    document.getElementById("summary-net").innerText = `€${netSavings.toFixed(2)}`;
    document.getElementById("targetDate").innerText = estimatedTargetDate;
    document.getElementById("periodDays").innerText = `${periodDays} days`;
}


// ---------------- Export Local Data ----------------
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

// ---------------- Import Local Data ----------------
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

// ---------------- Save Vehicle Data ----------------
function saveVehicleData() {
    let vehicles = [];
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

// ---------------- Load Vehicle Data ----------------
function loadVehicleData() {
    let data = localStorage.getItem("vehicleData");
    if (data) {
        let vehicles = JSON.parse(data);
        for (let i = 1; i <= vehicles.length; i++) {
            if (vehicles[i - 1]) {
                document.getElementById("vehicle" + i + "Name").value = vehicles[i - 1].name;
                document.getElementById("vehicle" + i + "Mot").value = vehicles[i - 1].mot;
                document.getElementById("vehicle" + i + "Insurance").value = vehicles[i - 1].insurance;
                document.getElementById("vehicle" + i + "Tax").value = vehicles[i - 1].tax;
            }
        }
    }
}

// ---------------- Initialize on Page Load ----------------
document.addEventListener("DOMContentLoaded", () => {
    // Open the default tab
    document.getElementById("defaultOpen").click();

    // Load persistent data
    loadIncomeList();
    loadDirectDebitsList();
    loadVehicleData();

    // Automatically collapse the debit list by default
    document.getElementById("debitList").classList.add("collapsed");

    // Automatically refresh all calculations
    updateSummary();

    // Update the current date/time in the header
    const now = new Date();
    document.getElementById("dateTime").innerText = now.toLocaleString();
});
