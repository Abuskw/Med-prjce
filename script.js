// 1. Firebase Configuration & Initialization
const firebaseConfig = {
  apiKey: "AIzaSyCgU41yLXtqL-2fts2cGU5-_7sja_dJtg0",
  authDomain: "smc2-220ae.firebaseapp.com",
  databaseURL: "https://smc2-220ae-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smc2-220ae",
  storageBucket: "smc2-220ae.firebasestorage.app",
  messagingSenderId: "943063478623",
  appId: "1:943063478623:web:64c0d0b07b6b34660106ea",
  measurementId: "G-BK17HPF4FF"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// --- 2. LOADING STATE (SKELETONS) ---
function showSkeletons(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
}

// Show skeletons immediately on script load
showSkeletons("medicineList");
showSkeletons("searchResults");
showSkeletons("loanList");

// --- 3. PREMIUM NOTIFICATION SYSTEM (Toasts) ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  
  toast.innerHTML = `
    <span>${message}</span>
    <span style="margin-left:15px; cursor:pointer; opacity:0.5;" onclick="this.parentElement.remove()">✕</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// --- 4. SYMMETRICAL NAVIGATION ---
function changePage(pageId, title) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(pageId);
  if(target) target.classList.add("active");
  
  document.getElementById("pageTitle").innerText = title;
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active-nav"));
  
  const navMap = {
    'homePage': 'nav-home',
    'searchPage': 'nav-search',
    'loanPage': 'nav-loans',
    'dashboardPage': 'nav-dash'
  };

  const activeBtnId = navMap[pageId];
  if(activeBtnId) {
    document.getElementById(activeBtnId).classList.add("active-nav");
  }
}

// --- 5. MODAL & UI CONTROLS ---
function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.add("hidden");
  document.querySelectorAll("#modal input, #modal textarea").forEach(i => i.value = "");
}

// --- 6. MEDICINE CORE LOGIC ---
function saveMedicine() {
  const nameInput = document.getElementById("name");
  const priceInput = document.getElementById("price");
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);
const qty = document.getElementById("quantity").value.trim();
  if (!name || isNaN(price)||!qty){
    return showToast("Please enter a valid name and price", "error");
  }

  db.ref("medicines/" + name.toLowerCase()).set({
    name,
    price,
    quantity: qty,
    date: new Date().toLocaleDateString()
  }).then(() => {
    closeModal();
    showToast(`${name} added to inventory`);
  });
}
function importBulk() {
  const input = document.getElementById("bulkInput").value.trim();
  if (!input) return showToast("Paste your Blogger data first!", "error");

  const lines = input.split("\n");
  let addedCount = 0;

  lines.forEach(line => {
    // Split by comma or tab (in case you copied from a table)
    const parts = line.includes(',') ? line.split(",") : line.split("\t");
    
    if (parts.length >= 2) {
      // Clean the name: Remove extra spaces and capitalize the first letter
      let name = parts[0].trim();
      name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      
      const price = parseFloat(parts[1].replace(/[^0-9.]/g, '')); // Removes "₦" or commas if present
      const qty = parts[2] ? parts[2].trim() : "1";

      if (name && !isNaN(price)) {
        db.ref("medicines/" + name.toLowerCase()).set({
          name: name,
          price: price,
          quantity: qty,
          date: new Date().toLocaleDateString()
        });
        addedCount++;
      }
    }
  });

  if (addedCount > 0) {
    showToast(`CEO: ${addedCount} medicines imported and formatted!`);
    document.getElementById("bulkInput").value = "";
    closeModal();
  } else {
    showToast("Format Error: Use Name, Price, Qty", "error");
  }
}

  
// Real-time Data Sync (Home, Search & Dashboard)
db.ref("medicines").on("value", snap => {
  const list = document.getElementById("medicineList");
  const searchResults = document.getElementById("searchResults");
  const totalMedDisplay = document.getElementById("totalMed");
  const inventoryValueDisplay = document.getElementById("inventoryValue");
  
  
if (!snap.exists()) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="icon">💊</span>
        <p>No medicines in inventory.<br>Tap the + button to add one.</p>
      </div>`;
    return;
  }
  const data = snap.val();
  let htmlContent = "";
  let count = 0;
  let totalValue = 0;

  for (let key in data) {
    count++;
    const med = data[key];
    totalValue += (med.price || 0);
    const date = med.date || "N/A";
    const qty = med.quantity || "0";
    htmlContent += `
      <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div>
        <h3>${med.name}</h3>
        <p>₦${Number(med.price).toLocaleString()}</p>
      </div>
      <span style="background: rgba(22, 163, 74, 0.2); color: #16a34a; padding: 5px 12px; border-radius: 10px; font-weight: 800; font-size: 20px;">
        ${med.quantity}
      </span>
    </div>
    
    <small style="color: #64748b; display:block; margin-top: 10px;">Last Stocked: ${med.date}</small>
        <div class="card-actions">
          <button class="edit-btn" onclick="editMedicine('${key}', ${med.price})">Edit</button>
          <button class="delete-btn" onclick="deleteMedicine('${key}')">Delete</button>
        </div>
      </div>`;
  }

  if(list) list.innerHTML = htmlContent;
  if(searchResults) searchResults.innerHTML = htmlContent;
  if(totalMedDisplay) totalMedDisplay.innerText = count;
  if(inventoryValueDisplay) inventoryValueDisplay.innerText = `₦${totalValue.toLocaleString()}`;
});

function deleteMedicine(name) {
  if (confirm(`Are you sure you want to delete ${name}?`)) {
    db.ref("medicines/" + name).remove().then(() => {
      showToast(`${name} removed`, "error");
    });
  }
}

function editMedicine(name, oldPrice) {
  const newPrice = prompt(`Update price for ${name}:`, oldPrice);
  if (newPrice !== null && !isNaN(newPrice) && newPrice !== "") {
    db.ref("medicines/" + name).update({
      price: parseFloat(newPrice),
      date: new Date().toLocaleDateString() + " (Edited)"
    }).then(() => {
      showToast("Price updated successfully");
    });
  }
}

// --- 7. SEARCH LOGIC ---
document.getElementById("searchInput").addEventListener("input", e => {
  const value = e.target.value.toLowerCase();
  let found = 0;

  document.querySelectorAll("#searchResults .card").forEach(card => {
    const isMatch = card.innerText.toLowerCase().includes(value);
    card.style.display = isMatch ? "block" : "none";
    if (isMatch) found++;
  });

  // If search returns nothing, show a message
  const searchContainer = document.getElementById("searchResults");
  const existingEmpty = searchContainer.querySelector(".empty-state");
  
  if (found === 0 && value !== "") {
    if (!existingEmpty) {
      searchContainer.insertAdjacentHTML('beforeend', `
        <div class="empty-state" id="search-empty">
          <p>No medicine matches "${value}"</p>
        </div>`);
    }
  } else if (existingEmpty) {
    existingEmpty.remove();
  }
});

// --- 8. LOAN & DEBT LOGIC ---
function saveLoan() {
  const name = document.getElementById("loanName").value.trim().toLowerCase();
  const amount = parseInt(document.getElementById("loanAmount").value);
  
  if (!name || isNaN(amount)) {
    return showToast("Fill all loan details", "error");
  }

  db.ref("loans/" + name + "/records").push({
    amount,
    date: new Date().toLocaleDateString()
  }).then(() => {
    closeModal();
    showToast(`Loan recorded for ${name.toUpperCase()}`);
  });
}

db.ref("loans").on("value", snap => {
  const list = document.getElementById("loanList");
  if (!list) return;

  if (!snap.exists()) {
    list.innerHTML = "<p style='text-align:center; color:#64748b;'>No loans found</p>";
    return;
  }

  const data = snap.val();
  let htmlContent = "";
  let totalBalance = 0;

  for (let user in data) {
    let sum = 0;
    let paid = data[user].paid || 0;
    if (data[user].records) {
      Object.values(data[user].records).forEach(rec => sum += rec.amount);
    }
    let balance = sum - paid;
    totalBalance += balance;

    htmlContent += `
      <div class="card" style="border-left-color: ${balance > 0 ? '#ef4444' : '#16a34a'}">
        <h3 style="color:#3b82f6">${user.toUpperCase()}</h3>
        <p>Debt: ₦${sum.toLocaleString()}</p>
        <p>Paid: ₦${paid.toLocaleString()}</p>
        <p style="color:${balance > 0 ? '#ef4444' : '#16a34a'}">
          <b>Balance: ₦${balance.toLocaleString()}</b>
        </p>
        ${balance > 0 ? `
          <div style="margin-top:10px;">
            <input id="pay-${user}" type="number" placeholder="Enter payment" style="margin-bottom:8px">
            <button onclick="payLoan('${user}')" class="btn-save">Pay</button>
          </div>
        ` : '<b style="color:#16a34a">✅ Settled</b>'}
      </div>`;
  }
  list.innerHTML = htmlContent;
  const totalLoanDisplay = document.getElementById("totalLoan");
  if(totalLoanDisplay) totalLoanDisplay.innerText = `₦${totalBalance.toLocaleString()}`;
});

function payLoan(user) {
  const amountInput = document.getElementById("pay-" + user);
  const amount = parseInt(amountInput.value);

  if (!amount || amount <= 0) return showToast("Enter a valid amount", "error");

  const ref = db.ref("loans/" + user);
  ref.once("value", snap => {
    const currentPaid = snap.val().paid || 0;
    ref.update({ paid: currentPaid + amount }).then(() => {
      showToast(`Payment of ₦${amount.toLocaleString()} recorded`);
    });
  });
}
