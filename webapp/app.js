/* ================================================================
   Akva Store — Mini App Logic
================================================================ */

// ──────────────────────────────────────────────────────────────
//  ДИЗАЙН ТОВАРОВ (неизменяемые визуальные параметры)
//  Редактируемые данные (название, цена, вкусы) — в products.json
// ──────────────────────────────────────────────────────────────
const PRODUCT_DESIGN = {
  1:  { category: 'liquids',      variantLabel: 'Вкус',    emoji: '💀', gradient: ['#1a0030', '#7c3aed'], image: 'images/isterika x самоубийца v.2.jpg' },
  2:  { category: 'liquids',      variantLabel: 'Вкус',    emoji: '🧪', gradient: ['#064e3b', '#34d399'], image: 'images/Isterika Classic Salt.jpg' },
  3:  { category: 'liquids',      variantLabel: 'Вкус',    emoji: '👾', gradient: ['#14532d', '#4ade80'], image: 'images/Monster Hardcore.jpg' },
  4:  { category: 'liquids',      variantLabel: 'Вкус',    emoji: '🍋', gradient: ['#14532d', '#86efac'], image: 'images/Monster Sourline.jpg' },
  5:  { category: 'liquids',      variantLabel: 'Вкус',    emoji: '💣', gradient: ['#450a0a', '#f87171'], image: 'images/убивашка.pnb.PNG' },
  6:  { category: 'pods',         variantLabel: 'Цвет',    emoji: '🌸', gradient: ['#831843', '#fb7185'], image: 'images/Vaporesso Xros 6 mini.jpg' },
  7:  { category: 'pods',         variantLabel: 'Цвет',    emoji: '⚡', gradient: ['#1e293b', '#94a3b8'], image: 'images/Thelema Elite S.jpg' },
  8:  { category: 'accessories',  variantLabel: 'Вариант', emoji: '🫙', gradient: ['#1e3a5f', '#38bdf8'], image: 'images/Losv Vape E-Plus.jpg' },
  9:  { category: 'accessories',  variantLabel: 'Вариант', emoji: '🔩', gradient: ['#422006', '#f97316'], image: 'images/Испаритель к5.jpg' },
  10: { category: 'accessories',  variantLabel: 'Объём',   emoji: '🫙', gradient: ['#0369a1', '#0ea5e9'], image: 'images/картридж хрос.png' },
};

// Дефолтный дизайн для новых товаров по категории
const CATEGORY_DEFAULTS = {
  liquids:      { gradient: ['#1a0030', '#7c3aed'], emoji: '💧' },
  pods:         { gradient: ['#1e293b', '#94a3b8'], emoji: '🔋' },
  disposables:  { gradient: ['#0f3460', '#533483'], emoji: '💨' },
  pouches:      { gradient: ['#1b3a4b', '#00b4d8'], emoji: '🫙' },
  snus:         { gradient: ['#1b4332', '#52b788'], emoji: '🌿' },
  accessories:  { gradient: ['#1e3a5f', '#38bdf8'], emoji: '🔧' },
  snacks:       { gradient: ['#3b1f00', '#f59e0b'], emoji: '🍬' },
  drinks:       { gradient: ['#0c2340', '#38bdf8'], emoji: '🧃' },
};

// Живой массив товаров — заполняется из products.json при загрузке
let PRODUCTS = [];

async function loadProducts() {
  try {
    const r = await fetch('products.json?t=' + Date.now());
    if (r.ok) {
      const data = await r.json();
      PRODUCTS = data.map(p => {
        const design = PRODUCT_DESIGN[p.id] || CATEGORY_DEFAULTS[p.category] || CATEGORY_DEFAULTS.accessories;
        return { ...design, ...p };
      });
    }
  } catch (_) {}
}

// ──────────────────────────────────────────────────────────────
//  ПРОМОКОДЫ (синхронизируй с PROMO_CODES_DEFAULT в bot.py)
//  Формат: 'КОД': скидка в процентах
// ──────────────────────────────────────────────────────────────
const PROMO_CODES = {
  'AKVA10':   10,
  'SUMMER20': 20,
  'VIP30':    30,
};

// ──────────────────────────────────────────────────────────────
//  КАТЕГОРИИ (загружаются из categories.json, фолбэк — встроенные)
// ──────────────────────────────────────────────────────────────
let CATEGORIES = [
  { id: 'pods',         img: 'images/Под-системы.png', label: 'Под-системы' },
  { id: 'liquids',      img: 'images/Жидкость.png',    label: 'Жидкости'    },
  { id: 'disposables',  img: 'images/Одноразки.png',   label: 'Одноразки',  imgSize: 38  },
  { id: 'snus',         img: 'images/снюс.png',        label: 'Снюс'        },
  { id: 'accessories',  img: 'images/Расходники.png',  label: 'Расходники'  },
];

async function loadCategories() {
  try {
    const r = await fetch('categories.json?t=' + Date.now());
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length) CATEGORIES = data;
    }
  } catch (_) {}
}

// ──────────────────────────────────────────────────────────────
//  НАСТРОЙКИ САЙТА (баннер, способы оплаты/доставки)
// ──────────────────────────────────────────────────────────────
let SETTINGS = {
  banner_title: 'Свежее<br>поступление 🌊',
  banner_sub:   '🛵 Доставка по городу от 150 ₽ · вне города цена по договорённости',
  banner_pill:  '✨ Бесплатная доставка от 4 500 ₽',
  payment_methods:  ['Онлайн-переводом', 'Наличными курьеру'],
  delivery_methods: ['Доставка', 'Самовывоз'],
};

async function loadSettings() {
  try {
    const r = await fetch('settings.json?t=' + Date.now());
    if (r.ok) {
      const data = await r.json();
      SETTINGS = { ...SETTINGS, ...data };
    }
  } catch (_) {}
}

function renderBanner() {
  const t = document.getElementById('bannerTitle');
  const s = document.getElementById('bannerSub');
  const p = document.getElementById('bannerPill');
  if (t) t.innerHTML = SETTINGS.banner_title;
  if (s) s.textContent = SETTINGS.banner_sub;
  if (p) p.textContent = SETTINGS.banner_pill;
}

// ──────────────────────────────────────────────────────────────
//  КОМАНДА (доп. админы/менеджеры, назначаемые владельцем через сайт)
// ──────────────────────────────────────────────────────────────
const OWNER_ADMIN_IDS_CLIENT   = [878878846, 1947509265];
const OWNER_MANAGER_IDS_CLIENT = [7555460392, 7883720545];
let ADMIN_IDS_CLIENT   = [...OWNER_ADMIN_IDS_CLIENT];
let MANAGER_IDS_CLIENT = [...OWNER_ADMIN_IDS_CLIENT, ...OWNER_MANAGER_IDS_CLIENT];
let TEAM_DATA = { extra_admins: [], extra_managers: [] };

async function loadTeam() {
  try {
    const r = await fetch('team.json?t=' + Date.now());
    if (r.ok) {
      const t = await r.json();
      TEAM_DATA = {
        extra_admins:   Array.isArray(t.extra_admins)   ? t.extra_admins   : [],
        extra_managers: Array.isArray(t.extra_managers) ? t.extra_managers : [],
      };
      const extraAdminIds   = TEAM_DATA.extra_admins.map(a => a.id);
      const extraManagerIds = TEAM_DATA.extra_managers.map(m => m.id);
      ADMIN_IDS_CLIENT   = [...new Set([...OWNER_ADMIN_IDS_CLIENT, ...extraAdminIds])];
      MANAGER_IDS_CLIENT = [...new Set([...ADMIN_IDS_CLIENT, ...OWNER_MANAGER_IDS_CLIENT, ...extraManagerIds])];
    }
  } catch (_) {}
}

function isOwnerUser() {
  const uid = tg?.initDataUnsafe?.user?.id;
  return uid && OWNER_ADMIN_IDS_CLIENT.includes(uid);
}

// ──────────────────────────────────────────────────────────────
//  СОСТОЯНИЕ
//  cart: { "productId:variant": { productId, variant, qty, price, name } }
// ──────────────────────────────────────────────────────────────
let activeCategory = 'pods';
let searchQuery    = '';
let sortOrder      = 'default';  // 'default' | 'asc' | 'desc'
let activePromo    = null;       // null | { code: string, discount: number }
const cart = {};

// URL HTTP API (загружается из config.json)
let API_URL = '';

// Состояние чата
let chatView = 'chat';        // 'rooms' | 'chat'
let chatCustomerId = null;    // для менеджеров — выбранный клиент
let chatLastTs = 0;
let chatPollTimer = null;
let chatOpen = false;
let chatTypingDebounce = null;
let chatPollFailures = 0;

// Наличие вкусов: { "productId:variant": true/false }
let availability = {};
// Черновик изменений в панели менеджера
let availDraft = {};

async function loadConfig() {
  try {
    const r = await fetch('config.json?t=' + Date.now());
    if (r.ok) {
      const c = await r.json();
      API_URL = (c.api_url || '').replace(/\/$/, '');
    }
  } catch (_) {}
}

async function loadAvailability() {
  try {
    const r = await fetch('availability.json?t=' + Date.now());
    if (r.ok) availability = await r.json();
  } catch (_) {}
}

function isAvailable(productId, variant) {
  const key = `${productId}:${variant}`;
  return availability[key] !== false;  // default true если нет в файле
}

// ──────────────────────────────────────────────────────────────
//  TELEGRAM WEBAPP
// ──────────────────────────────────────────────────────────────
const tg = window.Telegram?.WebApp ?? null;

function tgInit() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0a0a0a');
  tg.setBackgroundColor?.('#0a0a0a');

  const uid = tg.initDataUnsafe?.user?.id;
  if (uid && MANAGER_IDS_CLIENT.includes(uid)) {
    const btn = document.getElementById('adminBtn');
    if (btn) btn.style.display = 'flex';
    // Редактор товаров и категорий — для всех менеджеров и админов
    const editBtn = document.getElementById('editProductsBtn');
    if (editBtn) editBtn.style.display = 'flex';
  }
}

// ──────────────────────────────────────────────────────────────
//  КАТЕГОРИИ — рендер
// ──────────────────────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById('categories');
  container.innerHTML = CATEGORIES.map(cat => {
    const size = Number(cat.imgSize);
    const sizeStyle = (Number.isFinite(size) && size > 0) ? ` style="width:${size}px;height:${size}px"` : '';
    return `
    <button class="cat-btn${cat.id === activeCategory ? ' active' : ''}" data-cat="${escHtml(cat.id)}">
      ${cat.img
        ? `<img src="${escHtml(cat.img)}" class="cat-icon-img" alt="${escHtml(cat.label)}" draggable="false"${sizeStyle} />`
        : `<span class="icon">${escHtml(cat.icon)}</span>`}
      <span class="label">${escHtml(cat.label)}</span>
    </button>
  `;
  }).join('');
  container.querySelectorAll('.cat-btn').forEach(btn =>
    btn.addEventListener('click', () => setCategory(btn.dataset.cat))
  );
  enableDragScroll(container);
}

function enableDragScroll(el) {
  let isDown = false, startX = 0, scrollLeft = 0, moved = false;

  el.addEventListener('dragstart', e => e.preventDefault());

  el.addEventListener('mousedown', e => {
    isDown = true; moved = false;
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  });

  const stop = () => { isDown = false; el.style.cursor = ''; el.style.userSelect = ''; };
  el.addEventListener('mouseleave', stop);
  el.addEventListener('mouseup', stop);
  window.addEventListener('mouseup', stop);

  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const walk = (e.pageX - el.offsetLeft - startX) * 1.2;
    if (Math.abs(walk) > 4) moved = true;
    el.scrollLeft = scrollLeft - walk;
    updateCatScroll(el);
  });

  el.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', e => { if (moved) e.stopImmediatePropagation(); }, true);
  });

  el.addEventListener('scroll', () => updateCatScroll(el), { passive: true });
  setTimeout(() => updateCatScroll(el), 50);
}

function updateCatScroll(el) {
  const thumb = document.getElementById('catScrollThumb');
  if (!thumb) return;
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 0) { thumb.parentElement.style.display = 'none'; return; }
  thumb.parentElement.style.display = '';
  const pct = el.scrollLeft / max;
  const trackW = thumb.parentElement.offsetWidth;
  const thumbW = thumb.offsetWidth;
  thumb.style.transform = `translateX(${pct * (trackW - thumbW)}px)`;
}

function setCategory(catId) {
  if (catId === activeCategory) return;
  activeCategory = catId;
  searchQuery = '';
  const inp = document.getElementById('searchInput');
  if (inp) inp.value = '';
  renderCategories();
  renderProducts();
}

// ──────────────────────────────────────────────────────────────
//  ТОВАРЫ — рендер
// ──────────────────────────────────────────────────────────────
function getFilteredProducts() {
  let items = PRODUCTS.filter(p => p.category === activeCategory);

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    items = items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.variants.some(v => v.toLowerCase().includes(q))
    );
  }

  if (sortOrder === 'asc')  items = [...items].sort((a, b) => a.price - b.price);
  if (sortOrder === 'desc') items = [...items].sort((a, b) => b.price - a.price);

  return items;
}

function renderProducts() {
  const grid     = document.getElementById('productsGrid');
  const countEl  = document.getElementById('productsCount');
  const items    = getFilteredProducts();

  if (countEl) {
    countEl.textContent = `${items.length} ТОВАР${countSuffix(items.length)}`;
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🌊</div>
      <p>${searchQuery ? 'Ничего не найдено' : 'Товары скоро появятся'}</p>
    </div>`;
    return;
  }

  grid.style.opacity = '0';
  setTimeout(() => {
    grid.innerHTML = items.map(buildCard).join('');
    grid.style.opacity = '1';
    grid.style.transition = 'opacity .2s';

    // Обработчики чипсов вариантов (только доступные)
    grid.querySelectorAll('.card-chip:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        addToCart(+btn.dataset.id, btn.dataset.variant);
      });
    });
  }, 120);
}

function buildCard(p) {
  const totalQty = getProductQty(p.id);
  const badgeHtml = p.badge
    ? `<span class="card-badge ${badgeClass(p.badge)}">${escHtml(p.badge)}</span>` : '';

  const imageHtml = p.image
    ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.name)}" class="card-img" loading="lazy" />`
    : `<span class="product-emoji">${p.emoji}</span>`;

  const bgStyle = p.image
    ? `background:#0f172a`
    : `background:linear-gradient(135deg,${p.gradient[0]},${p.gradient[1]})`;

  const chipsHtml = p.variants.map(v => {
    const key = `${p.id}:${v}`;
    const qty = cart[key]?.qty || 0;
    const avail = isAvailable(p.id, v);
    const cls = avail
      ? (qty > 0 ? ' chip-active' : '')
      : ' chip-unavailable';
    return `<button class="card-chip${cls}" data-id="${p.id}" data-variant="${escHtml(v)}"${!avail ? ' disabled' : ''}>
      ${avail ? '' : '<span class="chip-x">✕</span>'}${escHtml(v)}${qty > 0 ? `<span class="chip-qty">${qty}</span>` : ''}
    </button>`;
  }).join('');

  const discount     = activePromo?.discount || 0;
  const finalPrice   = discount ? Math.round(p.price * (1 - discount / 100)) : p.price;
  const priceHtml    = discount
    ? `<span class="card-price-orig">${p.price.toLocaleString('ru-RU')} ₽</span>
       <span class="card-price">${finalPrice.toLocaleString('ru-RU')} ₽</span>`
    : `<span class="card-price">${p.price.toLocaleString('ru-RU')} ₽</span>`;

  const imgAttr = p.image
    ? ` data-img="${escHtml(p.image)}" data-name="${escHtml(p.name)}" class="card-image card-image--clickable"`
    : ` class="card-image"`;

  return `
    <div class="product-card">
      <div${imgAttr} style="${bgStyle}">
        ${badgeHtml}
        <span class="card-qty${totalQty > 0 ? ' visible' : ''}" id="qty-${p.id}">${totalQty}</span>
        ${imageHtml}
      </div>
      <div class="card-body">
        <div class="card-name">${escHtml(p.name)}</div>
        ${p.strength ? `<div class="card-strength">${escHtml(p.strength)}</div>` : ''}
        ${p.description ? `<div class="card-desc">${escHtml(p.description)}</div>` : ''}
        <div class="card-price-row">${priceHtml}</div>
        <div class="card-chips-row" id="chips-${p.id}">${chipsHtml}</div>
      </div>
    </div>`;
}

function badgeClass(b) {
  return { 'Хит': 'badge-hit', 'Новинка': 'badge-new', 'Скидка': 'badge-sale' }[b] ?? 'badge-hit';
}

function countSuffix(n) {
  const a = n % 100, l = a % 10;
  if (a > 10 && a < 20) return 'ОВ';
  if (l === 1) return '';
  if (l >= 2 && l <= 4) return 'А';
  return 'ОВ';
}

// ──────────────────────────────────────────────────────────────
//  КОРЗИНА — добавление / изменение количества
// ──────────────────────────────────────────────────────────────
function addToCart(productId, variant) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  const key = `${productId}:${variant}`;
  if (!cart[key]) {
    cart[key] = { productId, variant, qty: 0, price: p.price, name: p.name };
  }
  if (cart[key].qty >= 50) { showToast('Максимум 50 штук'); return; }
  cart[key].qty++;
  refreshCardUI(productId);
  refreshCartBar();
  showToast(`${variant} → корзина 🛒`);
  tg?.HapticFeedback?.impactOccurred('light');
}

function setQty(key, qty) {
  if (!cart[key]) return;
  const productId = cart[key].productId;
  if (qty <= 0) {
    delete cart[key];
  } else {
    cart[key].qty = Math.min(qty, 50);
  }
  refreshCardUI(productId);
  refreshCartBar();
  renderCartModal();
  if (!Object.keys(cart).length) closeCartModal();
}

function clearCart(silent = false) {
  const productIds = [...new Set(Object.values(cart).map(x => x.productId))];
  Object.keys(cart).forEach(k => delete cart[k]);
  productIds.forEach(id => refreshCardUI(id));
  refreshCartBar();
  if (!silent) {
    closeCartModal();
    showToast('Корзина очищена');
  }
}

function getProductQty(productId) {
  return Object.values(cart)
    .filter(x => x.productId === productId)
    .reduce((s, x) => s + x.qty, 0);
}

function calcTotal() {
  const raw = Object.values(cart).reduce((s, x) => s + x.price * x.qty, 0);
  if (!activePromo) return raw;
  return Math.round(raw * (1 - activePromo.discount / 100));
}

function calcOriginalTotal() {
  return Object.values(cart).reduce((s, x) => s + x.price * x.qty, 0);
}

// ──────────────────────────────────────────────────────────────
//  ПРОМОКОДЫ
// ──────────────────────────────────────────────────────────────
function applyPromo(code) {
  const upper = code.toUpperCase().trim();
  const discount = PROMO_CODES[upper];
  if (!discount) {
    showToast('Промокод не найден ❌');
    shakePromoInput();
    return;
  }
  activePromo = { code: upper, discount };
  updatePromoUI();
  renderProducts();
  renderCartModal();
  refreshCartBar();
  showToast(`Скидка ${discount}% применена 🎉`);
  tg?.HapticFeedback?.notificationOccurred('success');
}

function removePromo() {
  activePromo = null;
  const inp = document.getElementById('promoInput');
  if (inp) inp.value = '';
  updatePromoUI();
  renderProducts();
  renderCartModal();
  refreshCartBar();
}

function updatePromoUI() {
  const inputRow   = document.getElementById('promoInputRow');
  const appliedRow = document.getElementById('promoApplied');
  const tag        = document.getElementById('promoTag');
  if (!inputRow || !appliedRow) return;
  if (activePromo) {
    inputRow.style.display   = 'none';
    appliedRow.style.display = 'flex';
    if (tag) tag.textContent = `🏷 ${activePromo.code} · -${activePromo.discount}%`;
  } else {
    inputRow.style.display   = 'flex';
    appliedRow.style.display = 'none';
  }
  // Обновляем строку итого в модалке
  const origEl  = document.getElementById('cartModalOrig');
  const totalEl = document.getElementById('cartModalTotal');
  if (origEl && totalEl) {
    const orig  = calcOriginalTotal();
    const final = calcTotal();
    if (activePromo && orig !== final) {
      origEl.textContent  = `${orig.toLocaleString('ru-RU')} ₽`;
      origEl.style.display = 'inline';
    } else {
      origEl.style.display = 'none';
    }
    totalEl.textContent = `${final.toLocaleString('ru-RU')} ₽`;
  }
}

function shakePromoInput() {
  const row = document.getElementById('promoInputRow');
  if (!row) return;
  row.classList.add('shake');
  setTimeout(() => row.classList.remove('shake'), 500);
}

function refreshCardUI(productId) {
  const totalQty = getProductQty(productId);
  const qtyEl   = document.getElementById(`qty-${productId}`);
  if (qtyEl) { qtyEl.textContent = totalQty; qtyEl.classList.toggle('visible', totalQty > 0); }

  // Обновляем чипсы на карточке
  const chipsRow = document.getElementById(`chips-${productId}`);
  if (chipsRow) {
    const p = PRODUCTS.find(x => x.id === productId);
    if (p) {
      chipsRow.innerHTML = p.variants.map(v => {
        const key = `${productId}:${v}`;
        const qty = cart[key]?.qty || 0;
        const avail = isAvailable(productId, v);
        const cls = avail ? (qty > 0 ? ' chip-active' : '') : ' chip-unavailable';
        return `<button class="card-chip${cls}" data-id="${productId}" data-variant="${v}"${!avail ? ' disabled' : ''}>
          ${avail ? '' : '<span class="chip-x">✕</span>'}${v}${qty > 0 ? `<span class="chip-qty">${qty}</span>` : ''}
        </button>`;
      }).join('');
      chipsRow.querySelectorAll('.card-chip:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => addToCart(+btn.dataset.id, btn.dataset.variant));
      });
    }
  }

  const totalAllQty = Object.values(cart).reduce((a, x) => a + x.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) { badge.textContent = totalAllQty; badge.classList.toggle('visible', totalAllQty > 0); }
}

function refreshCartBar() {
  const totalQty   = Object.values(cart).reduce((a, x) => a + x.qty, 0);
  const totalPrice = calcTotal();
  const bar        = document.getElementById('cartBar');
  const countEl    = document.getElementById('cartCount');
  const totalEl    = document.getElementById('cartTotal');

  bar?.classList.toggle('visible', totalQty > 0);
  if (countEl) countEl.textContent = `${totalQty} товар${plural(totalQty)}`;
  if (totalEl) totalEl.textContent = `${totalPrice.toLocaleString('ru-RU')} ₽`;
}

// ──────────────────────────────────────────────────────────────
//  МОДАЛКА КОРЗИНЫ
// ──────────────────────────────────────────────────────────────
function openCartModal() {
  renderCartModal();
  document.getElementById('cartModal').classList.add('visible');
  document.getElementById('cartOverlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
  checkCooldownOnOpen();
}

function closeCartModal() {
  document.getElementById('cartModal').classList.remove('visible');
  document.getElementById('cartOverlay').classList.remove('visible');
  document.body.style.overflow = '';
}

function renderCartModal() {
  const itemsEl    = document.getElementById('cartItems');
  const totalEl    = document.getElementById('cartModalTotal');
  const confirmBtn = document.getElementById('confirmOrderBtn');
  const entries    = Object.entries(cart).filter(([, v]) => v.qty > 0);

  if (!entries.length) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="icon">🛒</div>
        <p>Корзина пуста</p>
      </div>`;
    if (totalEl)    totalEl.textContent = '0 ₽';
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  const getGradient = id => {
    const p = PRODUCTS.find(x => x.id === id);
    return `linear-gradient(135deg,${p.gradient[0]},${p.gradient[1]})`;
  };
  const getItemIcon = id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return '📦';
    if (p.image) return `<img src="${escHtml(p.image)}" class="ci-icon-img" alt="" loading="lazy" />`;
    return p.emoji ?? '📦';
  };

  const disc = activePromo?.discount || 0;

  itemsEl.innerHTML = entries.map(([key, item]) => {
    const origItemTotal  = item.price * item.qty;
    const finalItemTotal = disc ? Math.round(origItemTotal * (1 - disc / 100)) : origItemTotal;
    const priceHtml = disc
      ? `<span class="ci-price-orig">${origItemTotal.toLocaleString('ru-RU')} ₽</span>
         <span class="ci-price">${finalItemTotal.toLocaleString('ru-RU')} ₽</span>`
      : `<span class="ci-price">${origItemTotal.toLocaleString('ru-RU')} ₽</span>`;
    return `
    <div class="cart-item">
      <div class="ci-icon" style="background:${getGradient(item.productId)}">${getItemIcon(item.productId)}</div>
      <div class="ci-info">
        <div class="ci-name">${escHtml(item.name)}</div>
        <div class="ci-sub">${escHtml(item.variant)}</div>
        <div class="ci-price-row">${priceHtml}</div>
      </div>
      <div class="ci-stepper">
        <button data-action="dec" data-key="${escHtml(key)}">−</button>
        <span class="ci-qty">${item.qty}</span>
        <button data-action="inc" data-key="${escHtml(key)}">+</button>
      </div>
    </div>`;
  }).join('') + `<button class="clear-cart-btn" id="clearCartBtn">🗑 Очистить корзину</button>`;

  itemsEl.querySelectorAll('.ci-stepper button').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const inc = btn.dataset.action === 'inc';
      setQty(key, (cart[key]?.qty || 0) + (inc ? 1 : -1));
      tg?.HapticFeedback?.impactOccurred('light');
    });
  });

  document.getElementById('clearCartBtn')?.addEventListener('click', () => {
    clearCart();
    tg?.HapticFeedback?.impactOccurred('medium');
  });

  // Итого с учётом скидки
  const orig  = calcOriginalTotal();
  const final = calcTotal();
  if (totalEl) totalEl.textContent = `${final.toLocaleString('ru-RU')} ₽`;
  const origEl = document.getElementById('cartModalOrig');
  if (origEl) {
    if (activePromo && orig !== final) {
      origEl.textContent  = `${orig.toLocaleString('ru-RU')} ₽`;
      origEl.style.display = 'inline';
    } else {
      origEl.style.display = 'none';
    }
  }
  if (confirmBtn) confirmBtn.disabled = false;
}

// ──────────────────────────────────────────────────────────────
//  АНТИСПАМ
// ──────────────────────────────────────────────────────────────
const ORDER_COOLDOWN_MS = 5 * 60 * 1000;
const LS_KEY = 'akva_last_order';
let countdownTimer = null;

function getSecondsLeft() {
  const last = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  if (!last) return 0;
  return Math.max(0, Math.ceil((ORDER_COOLDOWN_MS - (Date.now() - last)) / 1000));
}

function startCooldownUI() {
  const btn = document.getElementById('confirmOrderBtn');
  if (!btn) return;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    const secs = getSecondsLeft();
    if (secs <= 0) {
      clearInterval(countdownTimer);
      btn.disabled = false;
      btn.textContent = 'Продолжить оформление →';
      return;
    }
    const m = Math.floor(secs / 60), s = secs % 60;
    btn.disabled = true;
    btn.textContent = `Повторный заказ через ${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function checkCooldownOnOpen() {
  if (getSecondsLeft() > 0) startCooldownUI();
}

// ──────────────────────────────────────────────────────────────
//  ОТПРАВКА ЗАКАЗА
// ──────────────────────────────────────────────────────────────
async function submitOrder(formData = {}) {
  const secs = getSecondsLeft();
  if (secs > 0) {
    const m = Math.floor(secs / 60), s = secs % 60;
    showToast(`Подождите ${m}:${String(s).padStart(2, '0')} ⏳`);
    return;
  }

  // Отправляем ТОЛЬКО id, вариант и количество — бот считает цены сам
  const items = Object.values(cart)
    .filter(x => x.qty > 0)
    .map(x => ({
      product_id: x.productId,
      variant:    x.variant.trim().substring(0, 100),
      qty:        Math.min(Math.max(1, Math.floor(x.qty)), 50),
    }));

  // Промокод — только строка, не скидка (бот проверяет сам)
  const promoCode = (activePromo?.code || '').toUpperCase().trim().substring(0, 20);

  if (API_URL) {
    // Новый флоу: HTTP API → чат открывается автоматически
    const btn = document.getElementById('orderFormSubmit') || document.getElementById('confirmOrderBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Оформляем...'; }

    try {
      const resp = await fetch(`${API_URL}/api/order`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
        body:    JSON.stringify({ items, promo_code: promoCode, ...formData }),
      });

      if (resp.ok) {
        localStorage.setItem(LS_KEY, Date.now().toString());
        startCooldownUI();
        clearCart(true);  // silent — без тоста и закрытия (форма уже закрыта)
        openChat();   // автоматически открываем чат
      } else {
        const err = await resp.json().catch(() => ({}));
        if (err.error === 'cooldown') {
          const m = Math.floor(err.seconds / 60), s = err.seconds % 60;
          showToast(`Подождите ${m}:${String(s).padStart(2, '0')} ⏳`);
        } else {
          showToast('Ошибка оформления заказа');
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Оформить заказ 🚀'; }
      }
    } catch (_) {
      showToast('Нет связи — попробуйте снова');
      if (btn) { btn.disabled = false; btn.textContent = 'Оформить заказ 🚀'; }
    }
    return;
  }

  // Fallback: tg.sendData() (если API не настроен)
  localStorage.setItem(LS_KEY, Date.now().toString());
  startCooldownUI();

  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ items, promo_code: promoCode, ...formData }));
  } else {
    const promoLine = promoCode ? `\nПромокод: ${promoCode}` : '';
    alert(`Заказ (тест):\n${items.map(i=>`ID${i.product_id} ${i.variant} x${i.qty}`).join('\n')}${promoLine}`);
  }
}

// ──────────────────────────────────────────────────────────────
//  АНКЕТА ЗАКАЗА
// ──────────────────────────────────────────────────────────────
function openOrderForm() {
  if (!Object.values(cart).some(x => x.qty > 0)) { showToast('Корзина пуста 🛒'); return; }
  renderOrderForm();
  document.getElementById('orderFormOverlay').classList.add('visible');
  document.getElementById('orderFormModal').classList.add('visible');
}

function closeOrderForm() {
  document.getElementById('orderFormOverlay').classList.remove('visible');
  document.getElementById('orderFormModal').classList.remove('visible');
}

function isPickup(deliveryValue) {
  return (deliveryValue || '').toLowerCase().includes('самовывоз');
}

function renderOrderForm() {
  const tgUser = tg?.initDataUnsafe?.user || {};
  const prefillName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
  const prefillUsername = tgUser.username ? `@${tgUser.username}` : '';

  const cartItems = Object.values(cart).filter(x => x.qty > 0);
  const orig  = calcOriginalTotal();
  const final = calcTotal();
  const summaryLines = cartItems.map(item => {
    const p = PRODUCTS.find(q => q.id === item.productId);
    if (!p) return '';
    return `<div class="of-summary-line">
      <span class="of-summary-name">${escHtml(p.name)} — ${escHtml(item.variant)}</span>
      <span class="of-summary-price">${(p.price * item.qty).toLocaleString('ru-RU')} ₽ ×${item.qty}</span>
    </div>`;
  }).join('');

  const totalHtml = (activePromo && orig !== final)
    ? `<s>${orig.toLocaleString('ru-RU')} ₽</s> <b>${final.toLocaleString('ru-RU')} ₽</b>`
    : `<b>${final.toLocaleString('ru-RU')} ₽</b>`;

  const body = document.getElementById('orderFormBody');
  body.innerHTML = `
    <div class="of-summary">
      <div class="of-summary-title">📦 Ваш заказ</div>
      ${summaryLines}
      <div class="of-summary-total">Итого: ${totalHtml}</div>
    </div>

    <div class="of-section">
      <div class="of-section-title">Способ оплаты</div>
      ${(SETTINGS.payment_methods || []).map((m, i) => `
        <label class="of-radio"><input type="radio" name="payment" value="${escHtml(m)}"${i === 0 ? ' checked' : ''} /><span class="of-radio-dot"></span>${escHtml(m)}</label>
      `).join('')}
    </div>

    <div class="of-section">
      <div class="of-section-title">Способ получения</div>
      ${(SETTINGS.delivery_methods || []).map((m, i) => `
        <label class="of-radio"><input type="radio" name="delivery" value="${escHtml(m)}"${i === 0 ? ' checked' : ''} /><span class="of-radio-dot"></span>${escHtml(m)}</label>
      `).join('')}
    </div>

    <div class="of-field">
      <label class="of-label">Имя</label>
      <input class="of-input" id="ofName" type="text" placeholder="Иван." value="${escHtml(prefillName)}" maxlength="80" />
    </div>
    <div class="of-field">
      <label class="of-label">Телефон</label>
      <input class="of-input" id="ofPhone" type="tel" placeholder="+79996661337" maxlength="30" />
    </div>
    <div class="of-field">
      <label class="of-label">Юзернейм</label>
      <input class="of-input" id="ofUsername" type="text" placeholder="@durov" value="${escHtml(prefillUsername)}" maxlength="50" />
    </div>
    <div class="of-field" id="ofAddressField">
      <label class="of-label">Адрес доставки</label>
      <input class="of-input" id="ofAddress" type="text" placeholder="14 мкр, 5 дом, 5 подъезд." maxlength="200" />
    </div>
    <div class="of-field">
      <label class="of-label">Комментарий</label>
      <textarea class="of-input of-textarea" id="ofComment" placeholder="Дополнительная информация..." maxlength="300"></textarea>
    </div>
    <div class="of-submit-row">
      <button class="confirm-btn" id="orderFormSubmit">Оформить заказ 🚀</button>
    </div>
  `;

  body.querySelectorAll('input[name="delivery"]').forEach(r => {
    r.addEventListener('change', () => {
      const af = document.getElementById('ofAddressField');
      if (af) af.style.display = (isPickup(r.value) && r.checked) ? 'none' : '';
    });
  });

  document.getElementById('orderFormSubmit')?.addEventListener('click', submitOrderForm);
}

async function submitOrderForm() {
  const name     = document.getElementById('ofName')?.value.trim()    || '';
  const phone    = document.getElementById('ofPhone')?.value.trim()   || '';
  const username = document.getElementById('ofUsername')?.value.trim()|| '';
  const address  = document.getElementById('ofAddress')?.value.trim() || '';
  const comment  = document.getElementById('ofComment')?.value.trim() || '';
  const payment  = document.querySelector('input[name="payment"]:checked')?.value  || '';
  const delivery = document.querySelector('input[name="delivery"]:checked')?.value || '';

  if (!name)  { showToast('⚠️ Введите имя'); return; }
  if (!phone) { showToast('⚠️ Введите телефон'); return; }
  if (!isPickup(delivery) && !address) { showToast('⚠️ Введите адрес доставки'); return; }

  closeOrderForm();
  closeCartModal();
  await submitOrder({ payment, delivery, form_name: name, phone, username_form: username, address, comment });
}

// ──────────────────────────────────────────────────────────────
//  ВСПОМОГАЛКИ
// ──────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function plural(n) {
  const a = Math.abs(n) % 100, l = a % 10;
  if (a > 10 && a < 20) return 'ов';
  if (l === 1) return '';
  if (l >= 2 && l <= 4) return 'а';
  return 'ов';
}

// ──────────────────────────────────────────────────────────────
//  ИНИЦИАЛИЗАЦИЯ
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadConfig(), loadProducts(), loadAvailability(), loadCategories(),
    loadSettings(), loadTeam(),
  ]);
  tgInit();
  renderBanner();
  renderCategories();
  renderProducts();

  // Поиск
  document.getElementById('searchInput')?.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderProducts();
  });

  // Сортировка
  document.getElementById('sortSelect')?.addEventListener('change', e => {
    sortOrder = e.target.value;
    renderProducts();
  });

  document.getElementById('orderBtn')?.addEventListener('click', openCartModal);

  document.getElementById('cartButton')?.addEventListener('click', () => {
    if (Object.values(cart).some(x => x.qty > 0)) openCartModal();
    else showToast('Корзина пуста 🛒');
  });

  document.getElementById('cartModalClose')?.addEventListener('click', closeCartModal);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCartModal);
  document.getElementById('confirmOrderBtn')?.addEventListener('click', openOrderForm);
  document.getElementById('orderFormClose')?.addEventListener('click', closeOrderForm);
  document.getElementById('orderFormOverlay')?.addEventListener('click', closeOrderForm);

  // Промокод
  const promoInput = document.getElementById('promoInput');

  document.getElementById('promoApplyBtn')?.addEventListener('click', () => {
    applyPromo(promoInput?.value || '');
  });
  promoInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') applyPromo(e.target.value);
  });
  // Ограничиваем ввод: только буквы, цифры, макс 20 символов
  promoInput?.addEventListener('input', e => {
    const clean = e.target.value.replace(/[^a-zA-ZА-Яа-я0-9]/g, '').substring(0, 20);
    if (e.target.value !== clean) e.target.value = clean;
    e.target.value = e.target.value.toUpperCase();
  });
  document.getElementById('promoRemoveBtn')?.addEventListener('click', removePromo);

  // Панель управления наличием
  document.getElementById('adminBtn')?.addEventListener('click', openAvailModal);
  document.getElementById('availOverlay')?.addEventListener('click', closeAvailModal);
  document.getElementById('availModalClose')?.addEventListener('click', closeAvailModal);
  document.getElementById('availSaveBtn')?.addEventListener('click', saveAvailability);

  // Редактор товаров
  document.getElementById('editProductsBtn')?.addEventListener('click', openProductsEditor);
  document.getElementById('prodEditorClose')?.addEventListener('click', closeProductsEditor);
  document.getElementById('prodEditorOverlay')?.addEventListener('click', closeProductsEditor);

  // Чат
  document.getElementById('chatBtn')?.addEventListener('click', () => openChat());
  document.getElementById('chatOverlay')?.addEventListener('click', closeChat);
  document.getElementById('chatClose')?.addEventListener('click', closeChat);

  // Авто-открытие чата по URL-параметру (?open=chat[&cid=ID])
  const _urlP = new URLSearchParams(window.location.search);
  if (_urlP.get('open') === 'chat') {
    const _cid = _urlP.get('cid');
    setTimeout(() => openChat(_cid ? parseInt(_cid) : null), 500);
  }

  const chatInput = document.getElementById('chatInput');
  document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);
  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });
  chatInput?.addEventListener('input', () => {
    clearTimeout(chatTypingDebounce);
    chatTypingDebounce = setTimeout(notifyTyping, 400);
  });

  // Лайтбокс — просмотр фото по клику на карточку
  const lightbox      = document.getElementById('lightbox');
  const lightboxImg   = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  document.getElementById('productsGrid')?.addEventListener('click', e => {
    const tile = e.target.closest('.card-image--clickable');
    if (!tile) return;
    lightboxImg.src = tile.dataset.img;
    lightboxImg.alt = tile.dataset.name || '';
    lightbox.classList.add('open');
  });

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  };
  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });
});

// ──────────────────────────────────────────────────────────────
//  ПАНЕЛЬ УПРАВЛЕНИЯ НАЛИЧИЕМ (только менеджеры)
// ──────────────────────────────────────────────────────────────

function openAvailModal() {
  availDraft = { ...availability };
  renderAvailBody();
  document.getElementById('availOverlay').classList.add('visible');
  document.getElementById('availModal').classList.add('visible');
}

function closeAvailModal() {
  document.getElementById('availOverlay').classList.remove('visible');
  document.getElementById('availModal').classList.remove('visible');
}

function renderAvailBody() {
  const body = document.getElementById('availBody');
  if (!body) return;
  body.innerHTML = PRODUCTS.map(p => `
    <div class="avail-product">
      <div class="avail-product-name">${p.emoji} ${escHtml(p.name)}</div>
      <div class="avail-variants">
        ${p.variants.map(v => {
          const key = `${p.id}:${v}`;
          const on = availDraft[key] !== false;
          return `
            <div class="avail-row" data-key="${escHtml(key)}">
              <span class="avail-variant-name">${escHtml(v)}</span>
              <button class="avail-toggle ${on ? 'avail-on' : 'avail-off'}" data-key="${escHtml(key)}">
                ${on ? '✅ Есть' : '❌ Нет'}
              </button>
            </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  body.querySelectorAll('.avail-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const currentlyOn = availDraft[key] !== false;
      availDraft[key] = !currentlyOn;
      btn.textContent = availDraft[key] ? '✅ Есть' : '❌ Нет';
      btn.className = `avail-toggle ${availDraft[key] ? 'avail-on' : 'avail-off'}`;
      tg?.HapticFeedback?.selectionChanged();
    });
  });
}

// Показывает итог сохранения с учётом флага github — HTTP 200 не значит,
// что изменения реально отправились на GitHub Pages (мог протухнуть токен).
function showSaveResult(json, successMsg) {
  if (json && json.github === false) {
    showToast('⚠️ Сохранено локально, но НЕ отправилось на сайт (проверьте GITHUB_TOKEN)');
  } else if (json && json.image_ok === false) {
    showToast('⚠️ Сохранено, но фото не загрузилось (проверьте GITHUB_TOKEN)');
  } else {
    showToast(successMsg);
  }
}

async function saveAvailability() {
  availability = { ...availDraft };
  const btn = document.getElementById('availSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Сохраняем...'; }
  try {
    const resp = await fetch(`${API_URL}/api/admin/availability`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify({ data: availability }),
    });
    if (resp.ok) {
      const json = await resp.json();
      closeAvailModal();
      renderProducts();
      showSaveResult(json, '✅ Наличие сохранено');
    } else {
      showToast('❌ Ошибка сохранения');
    }
  } catch (_) {
    showToast('❌ Нет связи');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Сохранить'; }
  }
}

// ──────────────────────────────────────────────────────────────
//  ПАНЕЛЬ АДМИНИСТРАТОРА (только для ADMIN_IDS_CLIENT)
// ──────────────────────────────────────────────────────────────

let editingProductId  = null;
let editingIsNew      = false;
let pendingImageData  = null; // {filename, b64} если выбрано новое фото

function compressImage(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        const ext = file.name.split('.').pop() || 'jpg';
        const safe = file.name.replace(/[^a-z0-9._-]/gi, '_');
        resolve({ b64, filename: `${Date.now()}_${safe}` });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function isAdminUser() {
  const uid = tg?.initDataUnsafe?.user?.id;
  return uid && ADMIN_IDS_CLIENT.includes(uid);
}

function isManagerUser() {
  const uid = tg?.initDataUnsafe?.user?.id;
  return uid && MANAGER_IDS_CLIENT.includes(uid);
}

function openProductsEditor() {
  if (!isAdminUser() && !isManagerUser() && tg) { showToast('⛔ Доступ запрещён'); return; }
  editingProductId = null;
  editingIsNew     = false;
  pendingImageUpdate = false;
  renderProductsList();
  document.getElementById('prodEditorOverlay').classList.add('visible');
  document.getElementById('prodEditorModal').classList.add('visible');
}

function closeProductsEditor() {
  document.getElementById('prodEditorOverlay').classList.remove('visible');
  document.getElementById('prodEditorModal').classList.remove('visible');
}

// ── Список товаров ─────────────────────────────────────────────

function renderProductsList() {
  const modal = document.getElementById('prodEditorModal');
  const canEditCats = isAdminUser();
  modal.innerHTML = `
    <div class="avail-modal-handle"></div>
    <div class="avail-modal-header">
      <h2 class="avail-modal-title">🛠 Управление</h2>
      <button class="cart-modal-close" id="prodEditorClose">✕</button>
    </div>
    <div class="prod-tabs">
      <button class="prod-tab prod-tab--active" id="tabProducts">📦 Товары</button>
      ${canEditCats ? '<button class="prod-tab" id="tabCategories">🗂 Категории</button>' : ''}
      ${canEditCats ? '<button class="prod-tab" id="tabSettings">⚙️ Настройки</button>' : ''}
      ${isOwnerUser() ? '<button class="prod-tab" id="tabTeam">👥 Команда</button>' : ''}
    </div>
    <button class="prod-add-new-btn" id="prodAddNewBtn">＋ Добавить товар</button>
    <div class="prod-list" id="prodList">
      ${PRODUCTS.map(p => renderProductRow(p)).join('')}
    </div>
  `;
  modal.querySelector('#prodEditorClose')?.addEventListener('click', closeProductsEditor);
  modal.querySelector('#prodAddNewBtn')?.addEventListener('click', openAddProduct);
  modal.querySelector('#tabProducts')?.addEventListener('click', renderProductsList);
  modal.querySelector('#tabCategories')?.addEventListener('click', renderCategoriesEditor);
  modal.querySelector('#tabSettings')?.addEventListener('click', renderSettingsEditor);
  modal.querySelector('#tabTeam')?.addEventListener('click', renderTeamEditor);
  modal.querySelectorAll('.prod-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openProductEdit(+btn.dataset.id))
  );
  modal.querySelectorAll('.prod-delete-btn').forEach(btn =>
    btn.addEventListener('click', () => confirmDeleteProduct(+btn.dataset.id))
  );
}

// ── Редактор категорий (только для администраторов) ───────────

function renderCategoriesEditor() {
  if (!isAdminUser()) return;
  const modal = document.getElementById('prodEditorModal');
  modal.innerHTML = `
    <div class="avail-modal-handle"></div>
    <div class="avail-modal-header">
      <h2 class="avail-modal-title">🛠 Управление</h2>
      <button class="cart-modal-close" id="prodEditorClose">✕</button>
    </div>
    <div class="prod-tabs">
      <button class="prod-tab" id="tabProducts">📦 Товары</button>
      <button class="prod-tab prod-tab--active" id="tabCategories">🗂 Категории</button>
      <button class="prod-tab" id="tabSettings">⚙️ Настройки</button>
      ${isOwnerUser() ? '<button class="prod-tab" id="tabTeam">👥 Команда</button>' : ''}
    </div>
    <div class="prod-list" id="catList">
      ${CATEGORIES.map((c, i) => `
        <div class="prod-list-item" id="cat-row-${i}">
          <div class="cat-list-icon" id="cat-icon-${i}" style="cursor:pointer;position:relative" title="Нажми чтобы сменить фото">
            ${c.img ? `<img src="${escHtml(c.img)}" style="width:36px;height:36px;object-fit:contain;border-radius:6px" />` : `<span style="font-size:24px">${escHtml(c.icon || '📦')}</span>`}
            <span style="position:absolute;bottom:-2px;right:-4px;font-size:10px">📷</span>
          </div>
          <input type="file" accept="image/*" id="cat-img-file-${i}" style="display:none" data-index="${i}" />
          <div class="prod-list-info">
            <div class="prod-list-name">${escHtml(c.label)}</div>
            <div class="prod-list-meta">id: ${escHtml(c.id)}</div>
          </div>
          <div class="prod-list-actions">
            <button class="prod-delete-btn cat-del-btn" data-index="${i}" title="Удалить">🗑</button>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="prod-add-new-btn" id="catAddNewBtn">＋ Добавить категорию</button>
    <div id="catAddForm" style="display:none;padding:12px 16px 0">
      <label class="prod-field-label">ID категории (англ., без пробелов) *</label>
      <input class="prod-field-input" id="catNewId" placeholder="my_category" maxlength="30" />
      <label class="prod-field-label">Название *</label>
      <input class="prod-field-input" id="catNewLabel" placeholder="Моя категория" maxlength="40" />
      <label class="prod-field-label">Иконка (emoji, если нет картинки)</label>
      <input class="prod-field-input" id="catNewIcon" placeholder="📦" maxlength="4" />
      <button class="avail-save-btn" id="catNewSave" style="margin-top:10px">Добавить</button>
    </div>
    <div class="avail-footer">
      <button class="avail-save-btn" id="catSaveAllBtn">💾 Сохранить категории</button>
    </div>
  `;
  modal.querySelector('#prodEditorClose')?.addEventListener('click', closeProductsEditor);
  modal.querySelector('#tabProducts')?.addEventListener('click', renderProductsList);
  modal.querySelector('#tabCategories')?.addEventListener('click', renderCategoriesEditor);
  modal.querySelector('#tabSettings')?.addEventListener('click', renderSettingsEditor);
  modal.querySelector('#tabTeam')?.addEventListener('click', renderTeamEditor);
  modal.querySelector('#catAddNewBtn')?.addEventListener('click', () => {
    const form = document.getElementById('catAddForm');
    if (form) form.style.display = form.style.display === 'none' ? '' : 'none';
  });
  modal.querySelector('#catNewSave')?.addEventListener('click', addCategory);
  modal.querySelector('#catSaveAllBtn')?.addEventListener('click', saveCategories);
  modal.querySelectorAll('.cat-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.index;
      const cat = CATEGORIES[idx];
      const row = document.getElementById(`cat-row-${idx}`);
      if (!row) return;
      row.innerHTML = `
        <div class="prod-confirm-row">
          <span class="prod-confirm-text">Удалить «${escHtml(cat.label)}»?</span>
          <button class="prod-confirm-yes" data-index="${idx}">✓ Да</button>
          <button class="prod-confirm-no">✗ Нет</button>
        </div>`;
      row.querySelector('.prod-confirm-yes').addEventListener('click', () => deleteCategory(idx));
      row.querySelector('.prod-confirm-no').addEventListener('click', renderCategoriesEditor);
    });
  });

  // Смена фото категории
  modal.querySelectorAll('[id^="cat-icon-"]').forEach(icon => {
    icon.addEventListener('click', () => {
      const idx = icon.id.replace('cat-icon-', '');
      document.getElementById(`cat-img-file-${idx}`)?.click();
    });
  });
  modal.querySelectorAll('[id^="cat-img-file-"]').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const idx = +input.dataset.index;
      const icon = document.getElementById(`cat-icon-${idx}`);
      if (icon) icon.innerHTML = '⏳';
      const compressed = await compressImage(file, 128, 0.85);
      CATEGORIES[idx].pendingImage = compressed;
      if (icon) icon.innerHTML = `<img src="data:image/jpeg;base64,${compressed.b64}" style="width:36px;height:36px;object-fit:contain;border-radius:6px" /><span style="position:absolute;bottom:-2px;right:-4px;font-size:10px">✅</span>`;
    });
  });
}

async function addCategory() {
  const id    = document.getElementById('catNewId')?.value.trim().replace(/\s+/g, '_').toLowerCase();
  const label = document.getElementById('catNewLabel')?.value.trim();
  const icon  = document.getElementById('catNewIcon')?.value.trim() || '📦';
  if (!id)    return showToast('⚠️ Введите ID категории');
  if (!label) return showToast('⚠️ Введите название категории');
  if (CATEGORIES.find(c => c.id === id)) return showToast('⚠️ Категория с таким ID уже существует');
  CATEGORIES.push({ id, label, img: null, icon });
  await saveCategories();
}

function deleteCategory(index) {
  if (index < 0 || index >= CATEGORIES.length) return;
  CATEGORIES.splice(index, 1);
  saveCategories();
}

async function saveCategories() {
  const exportData = CATEGORIES.map(c => ({
    id: c.id, label: c.label,
    img:          c.img          || null,
    icon:         c.icon         || null,
    imgSize:      c.imgSize      || null,
    pendingImage: c.pendingImage || undefined,
  }));
  try {
    const resp = await fetch(`${API_URL}/api/admin/categories`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify({ data: exportData }),
    });
    if (resp.ok) {
      const json = await resp.json();
      // Очищаем pendingImage, синхронизируем с тем, что реально сохранил сервер
      if (Array.isArray(json.data)) CATEGORIES = json.data;
      else CATEGORIES.forEach(c => delete c.pendingImage);
      renderCategories();
      renderCategoriesEditor();
      showSaveResult(json, '✅ Категории сохранены');
    } else {
      showToast('❌ Ошибка сохранения');
    }
  } catch (_) {
    showToast('❌ Нет связи');
  }
}

// ── Редактор настроек сайта (баннер, оплата, доставка) ─────────

function renderSettingsEditor() {
  if (!isAdminUser()) return;
  const modal = document.getElementById('prodEditorModal');
  modal.innerHTML = `
    <div class="avail-modal-handle"></div>
    <div class="avail-modal-header">
      <h2 class="avail-modal-title">🛠 Управление</h2>
      <button class="cart-modal-close" id="prodEditorClose">✕</button>
    </div>
    <div class="prod-tabs">
      <button class="prod-tab" id="tabProducts">📦 Товары</button>
      <button class="prod-tab" id="tabCategories">🗂 Категории</button>
      <button class="prod-tab prod-tab--active" id="tabSettings">⚙️ Настройки</button>
      ${isOwnerUser() ? '<button class="prod-tab" id="tabTeam">👥 Команда</button>' : ''}
    </div>
    <div class="prod-edit-body">
      <label class="prod-field-label">Заголовок баннера (можно &lt;br&gt; для переноса строки)</label>
      <input class="prod-field-input" id="setBannerTitle" maxlength="200" value="${escHtml(SETTINGS.banner_title)}" />
      <label class="prod-field-label">Подзаголовок баннера</label>
      <input class="prod-field-input" id="setBannerSub" maxlength="300" value="${escHtml(SETTINGS.banner_sub)}" />
      <label class="prod-field-label">Плашка (бесплатная доставка и т.п.)</label>
      <input class="prod-field-input" id="setBannerPill" maxlength="120" value="${escHtml(SETTINGS.banner_pill)}" />

      <label class="prod-field-label" style="margin-top:14px">Способы оплаты</label>
      <div id="setPaymentList"></div>
      <button class="prod-add-new-btn" id="setPaymentAddBtn" style="margin:6px 0 0">＋ Добавить способ оплаты</button>

      <label class="prod-field-label" style="margin-top:14px">Способы получения</label>
      <div id="setDeliveryList"></div>
      <button class="prod-add-new-btn" id="setDeliveryAddBtn" style="margin:6px 0 0">＋ Добавить способ получения</button>
    </div>
    <div class="avail-footer">
      <button class="avail-save-btn" id="setSaveBtn">💾 Сохранить настройки</button>
    </div>
  `;
  modal.querySelector('#prodEditorClose')?.addEventListener('click', closeProductsEditor);
  modal.querySelector('#tabProducts')?.addEventListener('click', renderProductsList);
  modal.querySelector('#tabCategories')?.addEventListener('click', renderCategoriesEditor);
  modal.querySelector('#tabSettings')?.addEventListener('click', renderSettingsEditor);
  modal.querySelector('#tabTeam')?.addEventListener('click', renderTeamEditor);

  renderSettingsListEditor('setPaymentList', [...SETTINGS.payment_methods]);
  renderSettingsListEditor('setDeliveryList', [...SETTINGS.delivery_methods]);

  modal.querySelector('#setPaymentAddBtn')?.addEventListener('click', () => {
    const list = getSettingsListValues('setPaymentList');
    list.push('');
    renderSettingsListEditor('setPaymentList', list);
  });
  modal.querySelector('#setDeliveryAddBtn')?.addEventListener('click', () => {
    const list = getSettingsListValues('setDeliveryList');
    list.push('');
    renderSettingsListEditor('setDeliveryList', list);
  });
  modal.querySelector('#setSaveBtn')?.addEventListener('click', saveSettings);
}

function renderSettingsListEditor(containerId, values) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = values.map((v, i) => `
    <div class="prod-variant-row" style="display:flex;gap:8px;align-items:center;margin-top:6px">
      <input class="prod-field-input" data-idx="${i}" value="${escHtml(v)}" maxlength="40" style="flex:1" />
      <button class="prod-delete-btn" data-idx="${i}" title="Удалить">🗑</button>
    </div>
  `).join('');
  container.querySelectorAll('.prod-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = getSettingsListValues(containerId);
      list.splice(+btn.dataset.idx, 1);
      renderSettingsListEditor(containerId, list);
    });
  });
}

function getSettingsListValues(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return [...container.querySelectorAll('input')].map(i => i.value);
}

async function saveSettings() {
  const data = {
    banner_title: document.getElementById('setBannerTitle')?.value.trim() || '',
    banner_sub:   document.getElementById('setBannerSub')?.value.trim()   || '',
    banner_pill:  document.getElementById('setBannerPill')?.value.trim()  || '',
    payment_methods:  getSettingsListValues('setPaymentList').map(v => v.trim()).filter(Boolean),
    delivery_methods: getSettingsListValues('setDeliveryList').map(v => v.trim()).filter(Boolean),
  };
  if (!data.payment_methods.length)  return showToast('⚠️ Добавьте хотя бы один способ оплаты');
  if (!data.delivery_methods.length) return showToast('⚠️ Добавьте хотя бы один способ получения');
  try {
    const resp = await fetch(`${API_URL}/api/admin/settings`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify({ data }),
    });
    if (resp.ok) {
      const j = await resp.json();
      SETTINGS = { ...SETTINGS, ...(j.data || data) };
      renderBanner();
      showSaveResult(j, '✅ Настройки сохранены');
    } else {
      showToast('❌ Ошибка сохранения');
    }
  } catch (_) {
    showToast('❌ Нет связи');
  }
}

// ── Редактор команды (доп. админы/менеджеры, только владелец) ──

function renderTeamEditor() {
  if (!isOwnerUser()) return;
  const modal = document.getElementById('prodEditorModal');
  const myId = tg?.initDataUnsafe?.user?.id;

  const rowHtml = (person, role) => `
    <div class="prod-list-item" id="team-${role}-${person.id}">
      <div class="prod-list-info">
        <div class="prod-list-name">${escHtml(person.name || 'Без имени')}</div>
        <div class="prod-list-meta">ID: ${person.id}</div>
      </div>
      <div class="prod-list-actions">
        <button class="prod-delete-btn" data-role="${role}" data-id="${person.id}" title="Удалить">🗑</button>
      </div>
    </div>
  `;
  const lockedRowHtml = (id, label) => `
    <div class="prod-list-item">
      <div class="prod-list-info">
        <div class="prod-list-name">🔒 ${label}${id === myId ? ' (вы)' : ''}</div>
        <div class="prod-list-meta">ID: ${id}</div>
      </div>
    </div>
  `;

  modal.innerHTML = `
    <div class="avail-modal-handle"></div>
    <div class="avail-modal-header">
      <h2 class="avail-modal-title">🛠 Управление</h2>
      <button class="cart-modal-close" id="prodEditorClose">✕</button>
    </div>
    <div class="prod-tabs">
      <button class="prod-tab" id="tabProducts">📦 Товары</button>
      <button class="prod-tab" id="tabCategories">🗂 Категории</button>
      <button class="prod-tab" id="tabSettings">⚙️ Настройки</button>
      <button class="prod-tab prod-tab--active" id="tabTeam">👥 Команда</button>
    </div>
    <div class="prod-edit-body">
      <label class="prod-field-label">👑 Администраторы (товары, категории, настройки, промокоды)</label>
      <div class="prod-list" id="teamAdminList" style="flex:none;overflow:visible">
        ${OWNER_ADMIN_IDS_CLIENT.map(id => lockedRowHtml(id, 'Владелец')).join('')}
        ${TEAM_DATA.extra_admins.map(a => rowHtml(a, 'admin')).join('')}
      </div>
      <label class="prod-field-label" style="margin-top:14px">👨‍💼 Менеджеры (чат с клиентами, товары, наличие)</label>
      <div class="prod-list" id="teamManagerList" style="flex:none;overflow:visible">
        ${OWNER_MANAGER_IDS_CLIENT.map(id => lockedRowHtml(id, 'Основной менеджер')).join('')}
        ${TEAM_DATA.extra_managers.map(m => rowHtml(m, 'manager')).join('')}
      </div>

      <label class="prod-field-label" style="margin-top:14px">Добавить человека</label>
      <input class="prod-field-input" id="teamNewId" type="number" placeholder="Telegram ID" />
      <input class="prod-field-input" id="teamNewName" placeholder="Имя (для удобства)" maxlength="50" style="margin-top:8px" />
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="avail-save-btn" id="teamAddAdminBtn" style="flex:1">👑 Как админа</button>
        <button class="avail-save-btn" id="teamAddManagerBtn" style="flex:1">👨‍💼 Как менеджера</button>
      </div>
      <div class="prod-list-meta" style="padding:8px 0">
        🔒 = неизменяемые владельцы (защита от блокировки). Telegram ID можно узнать у бота @userinfobot
      </div>
    </div>
  `;
  modal.querySelector('#prodEditorClose')?.addEventListener('click', closeProductsEditor);
  modal.querySelector('#tabProducts')?.addEventListener('click', renderProductsList);
  modal.querySelector('#tabCategories')?.addEventListener('click', renderCategoriesEditor);
  modal.querySelector('#tabSettings')?.addEventListener('click', renderSettingsEditor);
  modal.querySelector('#tabTeam')?.addEventListener('click', renderTeamEditor);

  modal.querySelectorAll('.prod-delete-btn[data-role]').forEach(btn => {
    btn.addEventListener('click', () => removeTeamPerson(btn.dataset.role, +btn.dataset.id));
  });
  modal.querySelector('#teamAddAdminBtn')?.addEventListener('click', () => addTeamPerson('admin'));
  modal.querySelector('#teamAddManagerBtn')?.addEventListener('click', () => addTeamPerson('manager'));
}

function addTeamPerson(role) {
  const idInput   = document.getElementById('teamNewId');
  const nameInput = document.getElementById('teamNewName');
  const id   = parseInt(idInput?.value, 10);
  const name = nameInput?.value.trim() || '';
  if (!id || id <= 0) return showToast('⚠️ Введите корректный Telegram ID');

  const list = role === 'admin' ? TEAM_DATA.extra_admins : TEAM_DATA.extra_managers;
  if (list.some(p => p.id === id)) return showToast('⚠️ Этот человек уже в списке');
  list.push({ id, name });
  saveTeam();
}

function removeTeamPerson(role, id) {
  const list = role === 'admin' ? TEAM_DATA.extra_admins : TEAM_DATA.extra_managers;
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  list.splice(idx, 1);
  saveTeam();
}

async function saveTeam() {
  try {
    const resp = await fetch(`${API_URL}/api/admin/team`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify({ data: TEAM_DATA }),
    });
    if (resp.ok) {
      const j = await resp.json();
      if (j.data) {
        TEAM_DATA = j.data;
        const extraAdminIds   = TEAM_DATA.extra_admins.map(a => a.id);
        const extraManagerIds = TEAM_DATA.extra_managers.map(m => m.id);
        ADMIN_IDS_CLIENT   = [...new Set([...OWNER_ADMIN_IDS_CLIENT, ...extraAdminIds])];
        MANAGER_IDS_CLIENT = [...new Set([...ADMIN_IDS_CLIENT, ...OWNER_MANAGER_IDS_CLIENT, ...extraManagerIds])];
      }
      renderTeamEditor();
      showSaveResult(j, '✅ Команда обновлена');
    } else {
      showToast('❌ Ошибка сохранения');
    }
  } catch (_) {
    showToast('❌ Нет связи');
  }
}

function renderProductRow(p) {
  const imgHtml = p.image
    ? `<img src="${escHtml(p.image)}" class="prod-list-thumb" alt="" />`
    : `<div class="prod-list-thumb prod-list-thumb--emoji">${p.emoji || '📦'}</div>`;
  const catLabel = CATEGORIES.find(c => c.id === p.category)?.label || (p.category || '');
  return `
    <div class="prod-list-item" id="prod-row-${p.id}">
      ${imgHtml}
      <div class="prod-list-info">
        <div class="prod-list-name">${escHtml(p.name)}</div>
        <div class="prod-list-meta">${p.price.toLocaleString('ru-RU')} ₽ · ${escHtml(catLabel)} · ${p.variants.length} вар.</div>
      </div>
      <div class="prod-list-actions">
        <button class="prod-edit-btn" data-id="${p.id}" title="Изменить">✏️</button>
        <button class="prod-delete-btn" data-id="${p.id}" title="Удалить">🗑</button>
      </div>
    </div>
  `;
}

function confirmDeleteProduct(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  const row = document.getElementById(`prod-row-${productId}`);
  if (!row) return;
  row.innerHTML = `
    <div class="prod-confirm-row">
      <span class="prod-confirm-text">Удалить «${escHtml(p.name)}»?</span>
      <button class="prod-confirm-yes" data-id="${productId}">✓ Да</button>
      <button class="prod-confirm-no">✗ Нет</button>
    </div>
  `;
  row.querySelector('.prod-confirm-yes').addEventListener('click', () => deleteProduct(productId));
  row.querySelector('.prod-confirm-no').addEventListener('click', renderProductsList);
}

async function deleteProduct(productId) {
  if (!isAdminUser() && !isManagerUser() && tg) return;
  const idx = PRODUCTS.findIndex(p => p.id === productId);
  if (idx === -1) return;
  PRODUCTS.splice(idx, 1);
  const exportData = buildExportData();
  try {
    const resp = await fetch(`${API_URL}/api/admin/products`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify({ data: exportData }),
    });
    renderProductsList();
    renderProducts();
    if (resp.ok) {
      const json = await resp.json();
      showSaveResult(json, '✅ Товар удалён');
    } else {
      showToast('⚠️ Удалён локально, ошибка сохранения');
    }
  } catch (_) {
    renderProductsList();
    renderProducts();
    showToast('⚠️ Удалён локально, нет связи');
  }
}

// ── Форма редактирования / добавления ─────────────────────────

function openAddProduct() {
  if (!isAdminUser() && !isManagerUser() && tg) return;
  editingProductId = null;
  editingIsNew     = true;
  pendingImageData  = null;
  const newId  = Math.max(0, ...PRODUCTS.map(x => x.id)) + 1;
  const newP   = {
    id: newId, name: '', price: 0, badge: null, strength: null,
    description: '', category: 'liquids', variantLabel: 'Вкус',
    image: null, variants: [], emoji: '📦', gradient: ['#1a0030', '#7c3aed'],
  };
  renderEditForm(newP, true);
}

function openProductEdit(productId) {
  if (!isAdminUser() && !isManagerUser() && tg) return;
  editingProductId = productId;
  editingIsNew     = false;
  pendingImageData  = null;
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  renderEditForm(p, false);
}

function renderEditForm(p, isNew) {
  const modal = document.getElementById('prodEditorModal');
  const catOptions = CATEGORIES.map(c =>
    `<option value="${escHtml(c.id)}"${p.category === c.id ? ' selected' : ''}>${escHtml(c.label)}</option>`
  ).join('');
  const imgPreview = p.image
    ? `<img src="${escHtml(p.image)}" class="prod-img-preview" alt="" id="prodImgPreview" />`
    : `<div class="prod-img-preview prod-img-placeholder" id="prodImgPreview">${p.emoji || '📦'}</div>`;

  modal.innerHTML = `
    <div class="avail-modal-handle"></div>
    <div class="avail-modal-header">
      <button class="prod-back-btn" id="prodBackBtn">← Назад</button>
      <h2 class="avail-modal-title" style="font-size:13px">${isNew ? 'Новый товар' : escHtml(p.name)}</h2>
      <button class="cart-modal-close" id="prodEditorClose2">✕</button>
    </div>
    <div class="prod-edit-body">

      <div class="prod-img-section">
        <div class="prod-img-wrap"><div id="prodImgWrap">${imgPreview}</div></div>
        <button class="prod-img-change-btn" id="prodImgChangeBtn">📷 Сменить фото</button>
        <input type="file" id="prodImgFile" accept="image/*" style="display:none" />
      </div>

      <label class="prod-field-label">Название *</label>
      <input class="prod-field-input" id="peditName" value="${escHtml(p.name)}" maxlength="80" placeholder="Название товара" />

      <div class="prod-field-row">
        <div class="prod-field-half">
          <label class="prod-field-label">Цена (₽) *</label>
          <input class="prod-field-input" id="peditPrice" type="number" value="${p.price || ''}" min="1" max="99999" placeholder="0" />
        </div>
        <div class="prod-field-half">
          <label class="prod-field-label">Крепость</label>
          <input class="prod-field-input" id="peditStrength" value="${escHtml(p.strength || '')}" placeholder="напр. 50 мг" maxlength="20" />
        </div>
      </div>

      <label class="prod-field-label">Категория *</label>
      <select class="prod-field-select" id="peditCategory">${catOptions}</select>

      <div class="prod-field-row">
        <div class="prod-field-half">
          <label class="prod-field-label">Значок</label>
          <select class="prod-field-select" id="peditBadge">
            <option value="">— нет —</option>
            <option value="Хит"     ${p.badge === 'Хит'     ? 'selected' : ''}>🔥 Хит</option>
            <option value="Новинка" ${p.badge === 'Новинка' ? 'selected' : ''}>✨ Новинка</option>
            <option value="Скидка"  ${p.badge === 'Скидка'  ? 'selected' : ''}>💸 Скидка</option>
          </select>
        </div>
        <div class="prod-field-half">
          <label class="prod-field-label">Тип варианта</label>
          <input class="prod-field-input" id="peditVarLabel" value="${escHtml(p.variantLabel || 'Вкус')}" maxlength="20" placeholder="Вкус" />
        </div>
      </div>

      <label class="prod-field-label">Описание</label>
      <textarea class="prod-field-input prod-field-textarea" id="peditDesc" maxlength="300" placeholder="Краткое описание (необязательно)">${escHtml(p.description || '')}</textarea>

      <label class="prod-field-label">Варианты *</label>
      <div class="prod-variants-list" id="peditVariants">
        ${(p.variants || []).map((v, i) => `
          <div class="prod-variant-row" data-index="${i}">
            <input class="prod-field-input prod-variant-input" value="${escHtml(v)}" maxlength="80" />
            <button class="prod-variant-del" title="Удалить">✕</button>
          </div>
        `).join('')}
      </div>
      <button class="prod-add-variant-btn" id="peditAddVariant">+ Добавить</button>

    </div>
    <div class="avail-footer">
      <button class="avail-save-btn" id="peditSave">💾 Сохранить</button>
    </div>
  `;

  modal.querySelector('#prodBackBtn')?.addEventListener('click', renderProductsList);
  modal.querySelector('#prodEditorClose2')?.addEventListener('click', closeProductsEditor);
  modal.querySelector('#peditAddVariant')?.addEventListener('click', () => addVariantField());
  modal.querySelector('#peditSave')?.addEventListener('click', () => saveProduct(p.id));

  modal.querySelector('#prodImgChangeBtn')?.addEventListener('click', () => {
    document.getElementById('prodImgFile')?.click();
  });
  modal.querySelector('#prodImgFile')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const btn = document.getElementById('prodImgChangeBtn');
    if (btn) { btn.textContent = '⏳ Сжимаем...'; btn.disabled = true; }
    pendingImageData = await compressImage(file);
    const wrap = document.getElementById('prodImgWrap');
    if (wrap) wrap.innerHTML = `<img src="data:image/jpeg;base64,${pendingImageData.b64}" class="prod-img-preview" alt="" />`;
    if (btn) { btn.textContent = '✅ Фото выбрано'; btn.disabled = false; }
    tg?.HapticFeedback?.impactOccurred('light');
  });

  modal.querySelectorAll('.prod-variant-del').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.prod-variant-row').remove());
  });
}

function addVariantField(value = '') {
  const list = document.getElementById('peditVariants');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'prod-variant-row';
  row.innerHTML = `
    <input class="prod-field-input prod-variant-input" value="${escHtml(value)}" maxlength="80" placeholder="Название" />
    <button class="prod-variant-del" title="Удалить">✕</button>
  `;
  row.querySelector('.prod-variant-del').addEventListener('click', () => row.remove());
  list.appendChild(row);
  row.querySelector('input').focus();
}

// ── Сохранение (создание / обновление) ────────────────────────

function buildExportData() {
  return PRODUCTS.map(p => ({
    id:           p.id,
    name:         p.name,
    price:        p.price,
    badge:        p.badge        || null,
    strength:     p.strength     || null,
    description:  p.description  || '',
    category:     p.category     || 'liquids',
    variantLabel: p.variantLabel || 'Вкус',
    image:        p.image        || null,
    variants:     p.variants,
  }));
}

async function saveProduct(productId) {
  if (!isAdminUser() && !isManagerUser() && tg) return;

  const name         = document.getElementById('peditName')?.value.trim();
  const price        = parseInt(document.getElementById('peditPrice')?.value, 10);
  const strength     = document.getElementById('peditStrength')?.value.trim() || null;
  const badge        = document.getElementById('peditBadge')?.value || null;
  const category     = document.getElementById('peditCategory')?.value || 'liquids';
  const variantLabel = document.getElementById('peditVarLabel')?.value.trim() || 'Вкус';
  const description  = document.getElementById('peditDesc')?.value.trim() || '';
  const variants     = [...document.querySelectorAll('.prod-variant-input')]
    .map(i => i.value.trim()).filter(Boolean);

  if (!name)               return showToast('⚠️ Введите название товара');
  if (!price || price < 1) return showToast('⚠️ Введите корректную цену');
  if (!variants.length)    return showToast('⚠️ Добавьте хотя бы один вариант');

  if (editingIsNew) {
    const design = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.accessories;
    PRODUCTS.push({ ...design, id: productId, name, price, badge, strength,
                    description, category, variantLabel, image: null, variants });
    variants.forEach(v => { if (!(`${productId}:${v}` in availability)) availability[`${productId}:${v}`] = true; });
  } else {
    const idx = PRODUCTS.findIndex(p => p.id === productId);
    if (idx === -1) return;
    PRODUCTS[idx] = { ...PRODUCTS[idx], name, price, badge, strength, description, category, variantLabel, variants };
    variants.forEach(v => { if (!(`${productId}:${v}` in availability)) availability[`${productId}:${v}`] = true; });
  }

  const exportData = buildExportData();
  const saveBtn = document.getElementById('peditSave');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Сохраняем...'; }

  const body = { data: exportData };
  if (pendingImageData) {
    body.image = { productId, ...pendingImageData };
  }

  try {
    const resp = await fetch(`${API_URL}/api/admin/products`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify(body),
    });
    if (resp.ok) {
      const json = await resp.json();
      // Картинку в локальном PRODUCTS обновляем ТОЛЬКО если сервер реально
      // загрузил её в GitHub — иначе локальный путь будет вести в никуда
      // и после перезахода в приложение вернётся старое фото.
      if (body.image && json.image_ok) {
        const idx = PRODUCTS.findIndex(p => p.id === productId);
        if (idx !== -1) PRODUCTS[idx].image = `images/${pendingImageData.filename}`;
      }
      renderProductsList();
      renderProducts();
      showSaveResult(json, editingIsNew ? '✅ Товар добавлен' : '✅ Товар обновлён');
    } else {
      showToast('❌ Ошибка сохранения');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Сохранить'; }
    }
  } catch (_) {
    showToast('❌ Нет связи');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Сохранить'; }
  }
}

// ──────────────────────────────────────────────────────────────
//  ЧАТ С МЕНЕДЖЕРОМ
// ──────────────────────────────────────────────────────────────

function openChat(preSelectedCustomerId = null) {
  if (!API_URL) { showToast('Чат временно недоступен'); return; }
  if (!tg) { showToast('Откройте приложение в Telegram'); return; }

  // Закрываем корзину и анкету если открыты
  closeCartModal();
  closeOrderForm();

  const isMgr = isManagerUser();
  if (isMgr && !preSelectedCustomerId) {
    chatView = 'rooms';
    chatCustomerId = null;
  } else {
    chatView = 'chat';
    chatCustomerId = preSelectedCustomerId || null;
    chatLastTs = 0;
  }

  chatOpen = true;
  document.getElementById('chatOverlay').classList.add('visible');
  document.getElementById('chatModal').classList.add('visible');

  if (chatView === 'rooms') {
    renderRoomsView();
  } else {
    renderChatView();
    startChatPoll();
  }
}

function closeChat() {
  chatOpen = false;
  stopChatPoll();
  document.getElementById('chatOverlay').classList.remove('visible');
  document.getElementById('chatModal').classList.remove('visible');
}

function stopChatPoll() {
  clearInterval(chatPollTimer);
  chatPollTimer = null;
}

function startChatPoll() {
  stopChatPoll();
  chatPollFailures = 0;
  pollChat();
  chatPollTimer = setInterval(pollChat, 2500);
}

// ── Вид: список комнат (для менеджеров) ─────────────────────

async function renderRoomsView() {
  const body      = document.getElementById('chatBody');
  const inputRow  = document.getElementById('chatInputRow');
  const title     = document.getElementById('chatTitle');
  const indicator = document.getElementById('chatTypingIndicator');
  const header    = document.getElementById('chatHeader');

  inputRow.classList.remove('visible');
  indicator.classList.remove('visible');
  title.textContent = '💬 Чаты клиентов';
  header.querySelector('#chatBackBtn')?.remove();

  body.innerHTML = '<div class="chat-loading">Загрузка...</div>';

  try {
    const resp = await fetch(`${API_URL}/api/rooms`, {
      headers: { 'X-Init-Data': tg?.initData || '' },
    });
    if (!resp.ok) throw new Error(resp.status);
    const data  = await resp.json();
    const rooms = data.rooms || [];

    if (!rooms.length) {
      body.innerHTML = '<div class="chat-empty-hint">Нет активных чатов</div>';
      return;
    }

    body.innerHTML = rooms.map(r => `
      <div class="chat-room-item${r.unread > 0 ? ' chat-room-unread' : ''}" data-cid="${r.customer_id}">
        <div class="chat-room-avatar">${escHtml(r.name.charAt(0).toUpperCase())}</div>
        <div class="chat-room-info">
          <div class="chat-room-name">${escHtml(r.name)}</div>
          <div class="chat-room-last">${escHtml(r.last_msg || '')}</div>
        </div>
        ${r.unread > 0 ? `<div class="chat-room-badge">${r.unread}</div>` : ''}
      </div>
    `).join('');

    body.querySelectorAll('.chat-room-item').forEach(el => {
      el.addEventListener('click', () => {
        const room = rooms.find(r => r.customer_id === +el.dataset.cid);
        selectRoom(+el.dataset.cid, room?.name || 'Клиент');
      });
    });
  } catch (e) {
    body.innerHTML = '<div class="chat-empty-hint">Ошибка загрузки</div>';
  }
}

function selectRoom(customerId, customerName) {
  chatCustomerId = customerId;
  chatView       = 'chat';
  chatLastTs     = 0;

  const header = document.getElementById('chatHeader');
  const title  = document.getElementById('chatTitle');
  if (!header.querySelector('#chatBackBtn')) {
    const btn = document.createElement('button');
    btn.id        = 'chatBackBtn';
    btn.className = 'prod-back-btn';
    btn.textContent = '← Назад';
    btn.addEventListener('click', () => {
      stopChatPoll();
      chatView = 'rooms';
      btn.remove();
      header.querySelector('#chatCloseOrderBtn')?.remove();
      renderRoomsView();
    });
    header.insertBefore(btn, title);
  }
  title.textContent = `💬 ${customerName}`;

  // Кнопка завершения заказа для менеджера
  header.querySelector('#chatCloseOrderBtn')?.remove();
  const closeOrderBtn = document.createElement('button');
  closeOrderBtn.id        = 'chatCloseOrderBtn';
  closeOrderBtn.className = 'chat-close-order-btn';
  closeOrderBtn.textContent = '✅ Завершить';
  closeOrderBtn.addEventListener('click', () => closeOrder(customerId));
  const chatCloseBtn = document.getElementById('chatClose');
  header.insertBefore(closeOrderBtn, chatCloseBtn);

  renderChatView();
  startChatPoll();
}

// ── Вид: чат ────────────────────────────────────────────────

function renderChatView() {
  const body      = document.getElementById('chatBody');
  const inputRow  = document.getElementById('chatInputRow');
  const title     = document.getElementById('chatTitle');
  const header    = document.getElementById('chatHeader');

  if (!isManagerUser()) {
    title.textContent = '💬 Чат с менеджером';
  } else if (chatCustomerId && !header.querySelector('#chatBackBtn')) {
    // Менеджер открыл чат напрямую (через кнопку-уведомление), без перехода через список комнат
    title.textContent = '💬 Чат с клиентом';
  }

  // Кнопка "Завершить заказ" — добавляем если её ещё нет
  if (isManagerUser() && chatCustomerId && !header.querySelector('#chatCloseOrderBtn')) {
    const closeOrderBtn = document.createElement('button');
    closeOrderBtn.id        = 'chatCloseOrderBtn';
    closeOrderBtn.className = 'chat-close-order-btn';
    closeOrderBtn.textContent = '✅ Завершить';
    closeOrderBtn.addEventListener('click', () => closeOrder(chatCustomerId));
    header.insertBefore(closeOrderBtn, document.getElementById('chatClose'));
  }

  inputRow.classList.add('visible');
  body.innerHTML = '<div class="chat-loading">Загрузка...</div>';
}

// ── Опрос новых сообщений ────────────────────────────────────

async function pollChat() {
  if (!chatOpen || chatView !== 'chat') return;
  try {
    const isMgr  = isManagerUser();
    const params = new URLSearchParams({ since: chatLastTs });
    if (isMgr && chatCustomerId) params.set('customer_id', chatCustomerId);

    const resp = await fetch(`${API_URL}/api/poll?${params}`, {
      headers: { 'X-Init-Data': tg?.initData || '' },
    });
    if (!resp.ok) {
      chatPollFailures++;
      if (chatPollFailures >= 2) {
        const body = document.getElementById('chatBody');
        if (body?.querySelector('.chat-loading')) {
          body.innerHTML = resp.status === 401
            ? '<div class="chat-empty-hint">⚠️ Откройте приложение через Telegram</div>'
            : '<div class="chat-empty-hint">⚠️ Нет связи с сервером</div>';
          stopChatPoll();
        }
      }
      return;
    }
    chatPollFailures = 0;
    const data = await resp.json();

    if (data.ts) chatLastTs = data.ts;

    if (data.messages?.length) renderMessages(data.messages);
    else {
      const body = document.getElementById('chatBody');
      if (body?.querySelector('.chat-loading')) {
        body.innerHTML = '<div class="chat-empty-hint">Напишите первое сообщение...</div>';
      }
    }

    const indicator = document.getElementById('chatTypingIndicator');
    if (indicator) {
      const showTyping = isMgr ? data.customer_typing : data.manager_typing;
      indicator.classList.toggle('visible', !!showTyping);
    }
  } catch (_) {
    chatPollFailures++;
  }
}

function closeOrder(customerId) {
  const doClose = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/close_chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
        body:    JSON.stringify({ customer_id: customerId }),
      });
      if (resp.ok) {
        showToast('✅ Заказ завершён');
        stopChatPoll();
        chatView = 'rooms';
        document.getElementById('chatHeader')?.querySelector('#chatBackBtn')?.remove();
        document.getElementById('chatHeader')?.querySelector('#chatCloseOrderBtn')?.remove();
        renderRoomsView();
      } else {
        showToast('Ошибка завершения');
      }
    } catch (_) {
      showToast('Нет связи');
    }
  };
  // tg.showConfirm работает корректно в Telegram Mini App (confirm() может блокироваться)
  if (tg?.showConfirm) {
    tg.showConfirm('Завершить заказ?\nКлиент получит уведомление.', (ok) => { if (ok) doClose(); });
  } else {
    if (window.confirm('Завершить заказ?')) doClose();
  }
}

function renderMessages(messages) {
  const body   = document.getElementById('chatBody');
  const isMgr  = isManagerUser();
  const myRole = isMgr ? 'manager' : 'customer';

  if (body?.querySelector('.chat-loading') || body?.querySelector('.chat-empty-hint')) {
    body.innerHTML = '';
  }

  messages.forEach(msg => {
    const isMe     = msg.role === myRole;
    const isSystem = msg.role === 'system';

    const el  = document.createElement('div');
    el.className = isSystem ? 'chat-msg chat-msg--system'
                 : `chat-msg${isMe ? ' chat-msg--out' : ' chat-msg--in'}`;

    const nameHtml = (!isMe && !isSystem && msg.name)
      ? `<div class="chat-msg-name">${escHtml(msg.name)}</div>` : '';
    const bubbleText = escHtml(msg.text).replace(/\n/g, '<br>');

    el.innerHTML = `
      ${nameHtml}
      <div class="chat-msg-bubble">${bubbleText}</div>
      <div class="chat-msg-time">${formatChatTime(msg.ts)}</div>
    `;
    body.appendChild(el);
  });

  body.scrollTop = body.scrollHeight;
}

function formatChatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// ── Отправка сообщения ───────────────────────────────────────

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text  = input?.value.trim();
  if (!text || !API_URL) return;

  input.value = '';

  const isMgr = isManagerUser();
  const body  = { text };
  if (isMgr && chatCustomerId) body.customer_id = chatCustomerId;

  try {
    const resp = await fetch(`${API_URL}/api/send`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      input.value = text;  // возвращаем текст если не отправилось
      showToast(err.error === 'Rate limited' ? '⚠️ Слишком часто'
              : resp.status === 401 ? '⚠️ Откройте в Telegram'
              : 'Ошибка отправки');
      return;
    }
    // Моментальный poll чтобы сообщение появилось без задержки
    setTimeout(pollChat, 150);
  } catch (_) {
    input.value = text;  // возвращаем текст при сетевой ошибке
    showToast('Нет связи');
  }
}

async function notifyTyping() {
  if (!API_URL || !chatOpen || chatView !== 'chat') return;
  const body = {};
  const isMgr = isManagerUser();
  if (isMgr && chatCustomerId) body.customer_id = chatCustomerId;
  try {
    await fetch(`${API_URL}/api/typing`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg?.initData || '' },
      body:    JSON.stringify(body),
    });
  } catch (_) {}
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
