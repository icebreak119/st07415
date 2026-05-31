/* ═══════════════════════════════════════════
   ST07415 — App Logic
   ═══════════════════════════════════════════ */

// --- State ---
let cart = loadCart();   // [{dish, qty}] — 从 localStorage 恢复
let currentCategory = null;
let manageCategory = 'stir-fry';
let allDishes = [];
let pendingPhoto = null; // base64 data URL of selected photo

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('st07415_cart') || '[]');
  } catch { return []; }
}

function saveCart() {
  localStorage.setItem('st07415_cart', JSON.stringify(cart));
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  setGreeting();
  bindNav();
  bindRandom();
  bindCart();
  bindManage();
  bindModal();
  await seedDishes();
  await loadCategories();
  registerSW();
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// --- Greeting ---
function setGreeting() {
  const h = new Date().getHours();
  let text = '晚上好';
  if (h < 6) text = '夜深了';
  else if (h < 11) text = '早上好';
  else if (h < 14) text = '中午好';
  else if (h < 18) text = '下午好';
  document.getElementById('greeting-text').textContent = text;
}

// --- Navigation ---
function bindNav() {
  document.querySelectorAll('.nav__item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page);
    });
  });

  document.getElementById('btn-back-cat').addEventListener('click', () => {
    navigateTo('home');
  });
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.nav__item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  // Show/hide confirm bar
  const confirmBar = document.getElementById('confirm-bar');
  if (page === 'cart' && cart.length > 0) {
    confirmBar.style.display = 'flex';
  } else {
    confirmBar.style.display = 'none';
  }

  // Load page data
  if (page === 'home') loadCategories();
  if (page === 'cart') renderCart();
  if (page === 'history') loadOrders();
  if (page === 'manage') loadManage();
}

// --- Categories ---
async function loadCategories() {
  allDishes = await DB.getAllDishes();
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';

  DB.categories.forEach((cat, i) => {
    const count = allDishes.filter(d => d.category === cat.id).length;
    const card = document.createElement('button');
    card.className = `category-card delay-${i + 1}`;
    card.innerHTML = `
      <span class="category-card__icon">${cat.icon}</span>
      <span class="category-card__name">${cat.name}</span>
      <span class="category-card__count">${count} 道菜</span>
    `;
    card.addEventListener('click', () => openCategory(cat));
    grid.appendChild(card);
  });
}

async function openCategory(cat) {
  currentCategory = cat;
  document.getElementById('cat-icon').textContent = cat.icon;
  document.getElementById('cat-title').textContent = cat.name;
  navigateTo('category');
  await renderDishList(cat.id);
}

async function renderDishList(catId) {
  const dishes = await DB.getAllDishes(catId);
  const list = document.getElementById('dish-list');
  const empty = document.getElementById('dish-empty');

  if (dishes.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = '';

  dishes.forEach((dish, i) => {
    const item = document.createElement('div');
    item.className = `dish-item delay-${Math.min(i + 1, 9)}`;
    item.innerHTML = `
      <div class="dish-item__left">
        ${dish.photo ? `<img class="dish-item__photo" src="${dish.photo}" alt="${esc(dish.name)}">` : ''}
        <div class="dish-item__info">
          <div class="dish-item__name">${esc(dish.name)}</div>
          ${dish.note ? `<div class="dish-item__note">${esc(dish.note)}</div>` : ''}
        </div>
      </div>
      <div class="dish-item__actions">
        <button class="btn-add" data-id="${dish.id}" title="加入点餐车">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    `;
    item.querySelector('.btn-add').addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(dish);
    });
    list.appendChild(item);
  });
}

// --- Cart ---
function addToCart(dish) {
  const existing = cart.find(c => c.dish.id === dish.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ dish, qty: 1 });
  }
  saveCart();
  updateCartBadge();
  showToast(`已加入「${dish.name}」`);
}

function updateCartBadge() {
  const navCart = document.querySelector('.nav__item[data-page="cart"]');
  let badge = navCart.querySelector('.nav__badge');
  const total = cart.reduce((s, c) => s + c.qty, 0);

  if (total === 0) {
    if (badge) badge.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'nav__badge';
    navCart.appendChild(badge);
  }
  badge.textContent = total;
  // Re-trigger animation
  badge.style.animation = 'none';
  badge.offsetHeight;
  badge.style.animation = '';
}

function bindCart() {
  document.getElementById('btn-confirm').addEventListener('click', confirmOrder);
}

function renderCart() {
  const list = document.getElementById('cart-list');
  const empty = document.getElementById('cart-empty');
  const confirmBar = document.getElementById('confirm-bar');

  if (cart.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    confirmBar.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  confirmBar.style.display = 'flex';
  document.getElementById('confirm-count').textContent =
    cart.reduce((s, c) => s + c.qty, 0) + ' 道菜';

  list.innerHTML = '';
  cart.forEach((item, i) => {
    const cat = DB.categories.find(c => c.id === item.dish.category);
    const el = document.createElement('div');
    el.className = `cart-item delay-${Math.min(i + 1, 9)}`;
    el.innerHTML = `
      <div class="cart-item__left">
        ${item.dish.photo
          ? `<img class="cart-item__photo" src="${item.dish.photo}" alt="${esc(item.dish.name)}">`
          : `<span class="cart-item__icon">${cat ? cat.icon : '🍽️'}</span>`
        }
        <div class="cart-item__info">
          <div class="cart-item__name">${esc(item.dish.name)}</div>
          <div class="cart-item__cat">${cat ? cat.name : ''}</div>
        </div>
      </div>
      <div class="cart-item__qty">
        <button class="qty-btn" data-action="minus" data-id="${item.dish.id}">-</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-action="plus" data-id="${item.dish.id}">+</button>
      </div>
    `;
    el.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const idx = cart.findIndex(c => c.dish.id === id);
        if (idx === -1) return;
        if (action === 'plus') cart[idx].qty++;
        else cart[idx].qty--;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
        saveCart();
        renderCart();
        updateCartBadge();
      });
    });
    list.appendChild(el);
  });
}

async function confirmOrder() {
  if (cart.length === 0) return;

  const items = cart.map(c => ({
    dishId: c.dish.id,
    name: c.dish.name,
    category: c.dish.category,
    qty: c.qty
  }));

  await DB.addOrder({ items });

  // PushPlus 推送通知
  pushOrder(cart);

  cart = [];
  saveCart();
  updateCartBadge();
  showToast('下单成功！');
  navigateTo('history');
}

// --- PushPlus 推送 ---
const PUSHPLUS_TOKEN = 'ba92735cd33b4ab19720182fabb82064';

function pushOrder(cartItems) {
  const total = cartItems.reduce((s, c) => s + c.qty, 0);
  const lines = cartItems.map(c => {
    const cat = DB.categories.find(ct => ct.id === c.dish.category);
    const icon = cat ? cat.icon + ' ' : '';
    const photo = c.dish.photo
      ? `<br><img src="${c.dish.photo}" style="max-width:200px;border-radius:8px;margin:4px 0">`
      : '';
    return `${icon}${c.dish.name}${c.qty > 1 ? ' × ' + c.qty : ''}${photo}`;
  });

  const content = lines.join('<br>');
  const title = `🍽️ 新订单 · 共 ${total} 道菜`;

  fetch('https://www.pushplus.plus/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: PUSHPLUS_TOKEN,
      title: title,
      content: content,
      template: 'html'
    })
  }).catch(() => {}); // 静默失败，不影响下单体验
}

// --- Orders ---
async function loadOrders() {
  const orders = await DB.getAllOrders();
  const list = document.getElementById('order-list');
  const empty = document.getElementById('order-empty');

  if (orders.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = '';

  // Sort newest first
  orders.sort((a, b) => b.createdAt - a.createdAt);

  orders.forEach((order, i) => {
    const date = new Date(order.createdAt);
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const totalQty = order.items.reduce((s, it) => s + it.qty, 0);

    const card = document.createElement('div');
    card.className = `order-card delay-${Math.min(i + 1, 9)}`;
    card.innerHTML = `
      <div class="order-card__header">
        <span class="order-card__date">${dateStr}</span>
        <span class="order-card__count">${totalQty} 道菜</span>
      </div>
      <div class="order-card__items">
        ${order.items.map(it => {
          const cat = DB.categories.find(c => c.id === it.category);
          const prefix = cat ? cat.icon + ' ' : '';
          return `<span class="order-card__item">${prefix}${esc(it.name)}${it.qty > 1 ? ' ×' + it.qty : ''}</span>`;
        }).join('')}
      </div>
      <div class="order-card__footer">
        <button class="order-card__delete" data-id="${order.id}">删除</button>
      </div>
    `;
    card.querySelector('.order-card__delete').addEventListener('click', async () => {
      await DB.deleteOrder(order.id);
      showToast('已删除');
      loadOrders();
    });
    list.appendChild(card);
  });
}

// --- Random ---
function bindRandom() {
  document.getElementById('btn-random').addEventListener('click', randomPick);
}

async function randomPick() {
  const dishes = await DB.getAllDishes();
  if (dishes.length === 0) {
    showToast('还没有菜品，先去添加吧');
    return;
  }
  const pick = dishes[Math.floor(Math.random() * dishes.length)];
  showRandomModal(pick);
}

function showRandomModal(dish) {
  const cat = DB.categories.find(c => c.id === dish.category);
  const emojiEl = document.getElementById('modal-emoji');
  const photoEl = document.getElementById('modal-photo');

  if (dish.photo) {
    photoEl.src = dish.photo;
    photoEl.style.display = 'block';
    emojiEl.style.display = 'none';
  } else {
    emojiEl.textContent = cat ? cat.icon : '🍽️';
    emojiEl.style.display = 'block';
    photoEl.style.display = 'none';
  }

  document.getElementById('modal-title').textContent = dish.name;
  document.getElementById('modal-subtitle').textContent =
    (cat ? cat.name : '') + (dish.note ? ' · ' + dish.note : '');
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('modal').dataset.dishId = dish.id;
}

function bindModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-reroll').addEventListener('click', async () => {
    const dishes = await DB.getAllDishes();
    if (dishes.length > 0) {
      const pick = dishes[Math.floor(Math.random() * dishes.length)];
      showRandomModal(pick);
    }
  });
  document.getElementById('modal-add').addEventListener('click', async () => {
    const id = document.getElementById('modal').dataset.dishId;
    const dish = await DB.getDish(id);
    if (dish) {
      addToCart(dish);
      closeModal();
    }
  });
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// --- Manage ---
function bindManage() {
  document.getElementById('btn-add-dish').addEventListener('click', addDish);
  document.getElementById('input-dish-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDish();
  });

  // Photo upload
  const photoUpload = document.getElementById('photo-upload');
  const photoInput = document.getElementById('input-photo');
  const photoPreview = document.getElementById('photo-preview');
  const photoImg = document.getElementById('photo-img');
  const photoRemove = document.getElementById('photo-remove');

  photoUpload.addEventListener('click', () => {
    if (!pendingPhoto) photoInput.click();
  });

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resizeImage(file, 400).then(dataUrl => {
      pendingPhoto = dataUrl;
      photoImg.src = dataUrl;
      photoImg.style.display = 'block';
      photoPreview.style.display = 'none';
      photoRemove.style.display = 'flex';
    });
  });

  photoRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    clearPhoto();
  });
}

function clearPhoto() {
  pendingPhoto = null;
  document.getElementById('photo-img').style.display = 'none';
  document.getElementById('photo-preview').style.display = 'flex';
  document.getElementById('photo-remove').style.display = 'none';
  document.getElementById('input-photo').value = '';
}

function resizeImage(file, maxSize) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = h * maxSize / w; w = maxSize; }
          else { w = w * maxSize / h; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function loadManage() {
  renderManageTabs();
  await renderManageList();
}

function renderManageTabs() {
  const tabs = document.getElementById('manage-tabs');
  tabs.innerHTML = '';
  DB.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `manage-tab ${cat.id === manageCategory ? 'active' : ''}`;
    btn.textContent = cat.icon + ' ' + cat.name;
    btn.addEventListener('click', () => {
      manageCategory = cat.id;
      renderManageTabs();
      renderManageList();
    });
    tabs.appendChild(btn);
  });
}

async function renderManageList() {
  const dishes = await DB.getAllDishes(manageCategory);
  const list = document.getElementById('manage-dish-list');
  const empty = document.getElementById('manage-empty');

  if (dishes.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = '';

  dishes.forEach((dish, i) => {
    const item = document.createElement('div');
    item.className = `dish-item delay-${Math.min(i + 1, 9)}`;
    item.innerHTML = `
      <div class="dish-item__left">
        ${dish.photo ? `<img class="dish-item__photo" src="${dish.photo}" alt="${esc(dish.name)}">` : ''}
        <div class="dish-item__info">
          <div class="dish-item__name">${esc(dish.name)}</div>
          ${dish.note ? `<div class="dish-item__note">${esc(dish.note)}</div>` : ''}
        </div>
      </div>
      <button class="btn-del" data-id="${dish.id}" title="删除">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;

    // Delete button click
    item.querySelector('.btn-del').addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirm(dish, item);
    });

    // Long press to delete
    let pressTimer;
    item.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => showDeleteConfirm(dish, item), 600);
    }, { passive: true });
    item.addEventListener('touchend', () => clearTimeout(pressTimer));
    item.addEventListener('touchmove', () => clearTimeout(pressTimer));

    list.appendChild(item);
  });
}

// --- Delete Confirm Dialog ---
function showDeleteConfirm(dish, el) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-dialog';
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-box__icon">🗑️</div>
      <h3 class="confirm-box__title">删除「${esc(dish.name)}」？</h3>
      <p class="confirm-box__desc">删除后无法恢复</p>
      <div class="confirm-box__actions">
        <button class="confirm-box__btn confirm-box__btn--cancel">取消</button>
        <button class="confirm-box__btn confirm-box__btn--danger">删除</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.confirm-box__btn--cancel').addEventListener('click', () => {
    overlay.remove();
  });

  overlay.querySelector('.confirm-box__btn--danger').addEventListener('click', async () => {
    overlay.remove();
    el.classList.add('removing');
    await new Promise(r => setTimeout(r, 300));
    await DB.deleteDish(dish.id);
    showToast('已删除');
    renderManageList();
    loadCategories();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

async function addDish() {
  const nameInput = document.getElementById('input-dish-name');
  const noteInput = document.getElementById('input-dish-note');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  await DB.addDish({
    name,
    note: noteInput.value.trim(),
    category: manageCategory,
    photo: pendingPhoto || null
  });

  nameInput.value = '';
  noteInput.value = '';
  clearPhoto();
  nameInput.focus();
  showToast('已添加「' + name + '」');
  renderManageList();
  loadCategories();
}

// --- Toast ---
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// --- Utils ---
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
