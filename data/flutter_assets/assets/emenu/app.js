const API_BASE = '/api';

const app = document.getElementById('app');

// State
let state = {
    view: 'language', // language, type, category, dish, cart, confirmation
    language: 'en', // en, ar, fr
    type: null, // sweet, savory
    categoryId: null,
    categories: [],
    dishes: [],
    selectedDish: null,
    cart: [],
    restaurantName: '',
    tableId: null
};

// Utils
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Translations
const t = {
    en: { welcome: "Welcome to", sweet: "Sweets", savory: "Savory", cart: "Cart", add: "Add to Cart", confirm: "Place Order", notes: "Notes", modifiers: "Add-ons", back: "Back", viewCart: "View Cart" },
    ar: { welcome: "مرحباً بكم في", sweet: "حلويات", savory: "مملحات", cart: "السلة", add: "أضف للسلة", confirm: "تأكيد الطلب", notes: "ملاحظات", modifiers: "إضافات", back: "رجوع", viewCart: "عرض السلة" },
    fr: { welcome: "Bienvenue chez", sweet: "Sucré", savory: "Salé", cart: "Panier", add: "Ajouter", confirm: "Confirmer", notes: "Notes", modifiers: "Suppléments", back: "Retour", viewCart: "Voir Panier" }
};

// --- Initialization ---
async function init() {
    state.tableId = getQueryParam('table') || getQueryParam('table_code') || 'Unknown';
    try {
        const res = await fetch(`${API_BASE}/info`);
        const data = await res.json();
        state.restaurantName = data.name;
    } catch (e) {
        console.error("Failed to load info", e);
    }
    render();
}

// --- Rendering ---
function render() {
    app.innerHTML = '';

    // Header (except splash)
    if (state.view !== 'language') {
        const header = document.createElement('header');
        header.className = 'app-header';

        const backBtn = document.createElement('button');
        backBtn.innerText = t[state.language].back;
        backBtn.onclick = goBack;
        if (state.view === 'type') backBtn.onclick = () => setView('language');

        header.appendChild(backBtn);

        const title = document.createElement('h1');
        title.innerText = state.restaurantName;
        header.appendChild(title);

        const cartBtn = document.createElement('button');
        cartBtn.innerText = `${t[state.language].viewCart} (${state.cart.length})`;
        cartBtn.onclick = () => setView('cart');
        header.appendChild(cartBtn);

        app.appendChild(header);
    }

    const content = document.createElement('main');
    content.className = `view-${state.view}`;
    app.appendChild(content);

    switch (state.view) {
        case 'language': renderLanguage(content); break;
        case 'type': renderType(content); break;
        case 'category': renderCategories(content); break;
        case 'dish': renderDishes(content); break; // Using Swiper logic here
        case 'dish-detail': renderDishDetail(content); break;
        case 'cart': renderCart(content); break;
        case 'confirmation': renderConfirmation(content); break;
    }
}

// --- Views ---

function renderLanguage(container) {
    const langs = [
        { code: 'ar', label: 'العربية' },
        { code: 'en', label: 'English' },
        { code: 'fr', label: 'Français' }
    ];

    const wrapper = document.createElement('div');
    wrapper.className = 'language-selector';

    langs.forEach(l => {
        const btn = document.createElement('button');
        btn.innerText = l.label;
        btn.onclick = () => {
            state.language = l.code;
            if (state.language === 'ar') document.body.dir = 'rtl';
            else document.body.dir = 'ltr';
            setView('type');
        };
        wrapper.appendChild(btn);
    });

    container.appendChild(wrapper);
}

function renderType(container) {
    const welcome = document.createElement('h2');
    welcome.className = 'welcome-text';
    welcome.innerText = `${t[state.language].welcome} ${state.restaurantName}`;
    container.appendChild(welcome);

    const types = [
        { code: 'sweet', label: t[state.language].sweet, img: 'assets/sweet.jpg' }, // Placeholder images
        { code: 'savory', label: t[state.language].savory, img: 'assets/savory.jpg' }
    ];

    const grid = document.createElement('div');
    grid.className = 'type-grid';

    types.forEach(type => {
        const card = document.createElement('div');
        card.className = 'type-card';
        card.innerText = type.label;
        card.onclick = () => {
            state.type = type.code;
            loadCategories();
        };
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories?type=${state.type}`);
        state.categories = await res.json();
        setView('category');
    } catch (e) { console.error(e); }
}

function renderCategories(container) {
    const grid = document.createElement('div');
    grid.className = 'category-grid';

    state.categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';

        // Name based on language
        let name = cat.name_en;
        if (state.language === 'ar' && cat.name_ar) name = cat.name_ar;
        if (state.language === 'fr' && cat.name_fr) name = cat.name_fr;

        card.innerHTML = `<h3>${name}</h3>`;
        // card.style.backgroundImage = `url(${cat.image_path})`; // If served correctly

        card.onclick = () => {
            state.categoryId = cat.id;
            loadDishes();
        };
        grid.appendChild(card);
    });
    container.appendChild(grid);
}

async function loadDishes() {
    try {
        const res = await fetch(`${API_BASE}/dishes?categoryId=${state.categoryId}`);
        state.dishes = await res.json();
        // Skip list view, go straight to fullscreen swiper (carousel) as requested?
        // "Dish Swiper (Carousel) with 'Full Screen' mode"
        // Let's assume we show a list, and clicking opens the full screen detail. 
        // OR the view itself is a swiper. The prompt says "after selecting category... cards appear... if chosen, it enlarges".
        // So first a grid of cards.
        setView('dish');
    } catch (e) { console.error(e); }
}

function renderDishes(container) {
    const grid = document.createElement('div');
    grid.className = 'dish-grid';

    state.dishes.forEach(dish => {
        const card = document.createElement('div');
        card.className = 'dish-card';

        let name = dish.name_en;
        if (state.language === 'ar' && dish.name_ar) name = dish.name_ar;
        if (state.language === 'fr' && dish.name_fr) name = dish.name_fr;

        // Determine price (from first size usually)
        let price = 'N/A';
        if (dish.sizes && dish.sizes.length > 0) {
            price = dish.sizes[0].price;
        }

        card.innerHTML = `
            <div class="dish-image"></div>
            <div class="dish-info">
                <h3>${name}</h3>
                <span class="price">${price}</span>
            </div>
        `;

        card.onclick = () => {
            state.selectedDish = dish;
            setView('dish-detail');
        };

        grid.appendChild(card);
    });
    container.appendChild(grid);
}

function renderDishDetail(container) {
    // Full screen view with swiping logic (simplified navigation arrows for web)

    // Find index
    const currentIndex = state.dishes.findIndex(d => d.id === state.selectedDish.id);
    const dish = state.selectedDish;

    let name = dish.name_en;
    let desc = dish.description_en || '';
    if (state.language === 'ar') { name = dish.name_ar || name; desc = dish.description_ar || desc; }
    if (state.language === 'fr') { name = dish.name_fr || name; desc = dish.description_fr || desc; }

    container.className = 'dish-detail-view'; // enable full screen CSS

    container.innerHTML = `
        <div class="dish-detail-image">
            <!-- Image goes here -->
        </div>
        <div class="dish-detail-content">
            <h2>${name}</h2>
            <p>${desc}</p>
            
            <div class="sizes-section">
                <!-- Size selection -->
                <select id="size-select">
                    ${dish.sizes.map(s => {
        let sName = s.name_en;
        if (state.language === 'ar') sName = s.name_ar || sName;
        if (state.language === 'fr') sName = s.name_fr || sName;
        return `<option value="${s.id}">${sName} - ${s.price}</option>`;
    }).join('')}
                </select>
            </div>

            <div class="modifiers-section">
                <h4>${t[state.language].modifiers}</h4>
                <!-- Checkboxes for extras would populate here if we have that data -->
                <p>Not available yet</p> 
            </div>

            <div class="removals-section" id="removals-container">
                <!-- Removal notes will be injected here -->
            </div>

            <div class="actions">
                 <button id="prev-btn"> < </button>
                 <button id="add-btn">${t[state.language].add}</button>
                 <button id="next-btn"> > </button>
            </div>
        </div>
    `;

    // Render removal notes if category has them
    const category = state.categories.find(c => c.id === state.categoryId);
    if (category && category.removal_notes && category.removal_notes.length > 0) {
        const removalsContainer = document.getElementById('removals-container');
        removalsContainer.innerHTML = `<h4>${state.language === 'ar' ? 'ملاحظات' : 'Notes'}</h4>`;
        category.removal_notes.forEach(note => {
            let noteText = note.note;
            if (state.language === 'ar' && note.note_ar) noteText = note.note_ar;
            if (state.language === 'fr' && note.note_fr) noteText = note.note_fr;

            const label = document.createElement('label');
            label.className = 'removal-item';
            label.innerHTML = `
                <input type="checkbox" class="removal-checkbox" value="${noteText}">
                ${noteText}
            `;
            removalsContainer.appendChild(label);
        });
    }

    // Interaction
    document.getElementById('prev-btn').onclick = () => {
        const prevIdx = (currentIndex - 1 + state.dishes.length) % state.dishes.length;
        state.selectedDish = state.dishes[prevIdx];
        render(); // Re-render detail
    };

    document.getElementById('next-btn').onclick = () => {
        const nextIdx = (currentIndex + 1) % state.dishes.length;
        state.selectedDish = state.dishes[nextIdx];
        render();
    };

    document.getElementById('add-btn').onclick = () => {
        const sizeId = parseInt(document.getElementById('size-select').value);
        const checkboxes = document.querySelectorAll('.removal-checkbox:checked');
        const removalNotes = Array.from(checkboxes).map(cb => cb.value);
        const qty = 1; // Simplification
        addToCart(state.selectedDish, sizeId, qty, removalNotes);
        alert("Added to cart");
        // goBack(); // Optional
    };
}

function addToCart(dish, sizeId, qty, removalNotes = []) {
    // Check if exists (with same removal notes)
    const existing = state.cart.find(i =>
        i.dishId === dish.id &&
        i.sizeId === sizeId &&
        JSON.stringify(i.removalNotes || []) === JSON.stringify(removalNotes)
    );
    if (existing) {
        existing.quantity += qty;
    } else {
        state.cart.push({
            dishId: dish.id,
            sizeId: sizeId,
            quantity: qty,
            name: dish.name_en, // store for display in cart
            price: dish.sizes.find(s => s.id === sizeId).price,
            removalNotes: removalNotes
        });
    }
}


function renderCart(container) {
    if (state.cart.length === 0) {
        container.innerHTML = '<p>Cart is empty</p>';
        return;
    }

    const list = document.createElement('ul');
    list.className = 'cart-list';

    let total = 0;
    state.cart.forEach(item => {
        const li = document.createElement('li');
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        li.innerHTML = `
            <span>${item.name} (${item.quantity})</span>
            <span>${itemTotal}</span>
        `;
        list.appendChild(li);
    });

    container.appendChild(list);

    const totalEl = document.createElement('div');
    totalEl.className = 'cart-total';
    totalEl.innerText = `Total: ${total}`;
    container.appendChild(totalEl);

    const checkBtn = document.createElement('button');
    checkBtn.className = 'checkout-btn';
    checkBtn.innerText = t[state.language].confirm;
    checkBtn.onclick = submitOrder;
    container.appendChild(checkBtn);
}

async function submitOrder() {
    const orderData = {
        tableName: state.tableId,
        items: state.cart
    };

    try {
        const res = await fetch(`${API_BASE}/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const result = await res.json();
        if (result.success) {
            alert('Order Placed!');
            state.cart = [];
            setView('type');
        } else {
            alert('Failed: ' + result.message);
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// --- Navigation ---
function setView(v) {
    state.view = v;
    render();
}

function goBack() {
    if (state.view === 'cart') setView('dish');
    else if (state.view === 'dish-detail') setView('dish');
    else if (state.view === 'dish') setView('category');
    else if (state.view === 'category') setView('type');
    else if (state.view === 'type') setView('language');
}

// Start
init();
