/* ================================================================
   Akva Store — Mini App Logic
================================================================ */

// ──────────────────────────────────────────────────────────────
//  ДАННЫЕ ТОВАРОВ
// ──────────────────────────────────────────────────────────────
const PRODUCTS = [

  // ── Жидкости ─────────────────────────────────────────────────
  {
    id: 1, category: 'liquids',
    name: 'ISTERIKA x САМОУБИЙЦА V.2',
    variantLabel: 'Вкус',
    variants: ['Адреналин раш с лесными ягодами', 'Вишня энергетик', 'Кислый Скиттлс', 'Малиновый энергетик'],
    price: 450, badge: 'Хит', emoji: '💀',
    strength: '80 мг',
    gradient: ['#1a0030', '#7c3aed'],
    image: 'images/isterika x самоубийца v.2.jpg',
  },
  {
    id: 2, category: 'liquids',
    name: 'ISTERIKA CLASSIC SALT',
    variantLabel: 'Вкус',
    variants: ['Зелёный Бёрн', 'Кола чупа чупс'],
    price: 400, badge: null, emoji: '🧪',
    strength: '60 мг',
    gradient: ['#064e3b', '#34d399'],
    image: 'images/Isterika Classic Salt.jpg',
  },
  {
    id: 3, category: 'liquids',
    name: 'MONSTER HARDCORE',
    variantLabel: 'Вкус',
    variants: ['Земляничный Коктейл', 'Клубничный Коктейл', 'Малиновый Коктейль', 'Скитлс Коктейль'],
    price: 400, badge: null, emoji: '👾',
    strength: '60 мг',
    gradient: ['#14532d', '#4ade80'],
    image: 'images/Monster Hardcore.jpg',
  },
  {
    id: 4, category: 'liquids',
    name: 'MONSTER SOURLINE',
    variantLabel: 'Вкус',
    variants: ['Вишнёвый Энергетик', 'Киви и Лайм', 'Кислотный Скитлс', 'Клубника и Лимон', 'Малина и Личи', 'Мармеладная Шипучка'],
    price: 400, badge: null, emoji: '🍋',
    strength: '60 мг',
    gradient: ['#14532d', '#86efac'],
    image: 'images/Monster Sourline.jpg',
  },
  {
    id: 5, category: 'liquids',
    name: 'УБИВАШКА',
    variantLabel: 'Вкус',
    variants: ['Виноградная Фанта', 'Вишнёвый Лимонад', 'Кислая Вишня Ред Булл Смородина', 'Кислый Земляничный Чупа Чупс', 'Ред Булл', 'Энергетик Классический', 'Ягодный Взрыв'],
    price: 400, badge: null, emoji: '💣',
    strength: '80 мг',
    gradient: ['#450a0a', '#f87171'],
    image: 'images/убивашка.pnb.PNG',
  },

  // ── Под-системы ──────────────────────────────────────────────
  {
    id: 6, category: 'pods',
    name: 'Vaporesso Xros 6 Mini',
    variantLabel: 'Цвет',
    variants: ['Plume Pink'],
    price: 1900, badge: 'Новинка', emoji: '🌸',
    strength: null,
    gradient: ['#831843', '#fb7185'],
    image: 'images/Vaporesso Xros 6 mini.jpg',
  },
  {
    id: 7, category: 'pods',
    name: 'Lost Vape Thelema Elite S',
    variantLabel: 'Цвет',
    variants: ['Twill Silver'],
    price: 1700, badge: null, emoji: '⚡',
    strength: null,
    gradient: ['#1e293b', '#94a3b8'],
    image: 'images/Thelema Elite S.jpg',
  },

  // ── Расходники ────────────────────────────────────────────────
  {
    id: 8, category: 'accessories',
    name: 'Картридж Lost Vape E-plus Dual Mesh',
    variantLabel: 'Вариант',
    variants: ['0.6 Ом'],
    price: 350, badge: null, emoji: '🫙',
    strength: null,
    gradient: ['#1e3a5f', '#38bdf8'],
    image: 'images/Losv Vape E-Plus.jpg',
  },
  {
    id: 9, category: 'accessories',
    name: 'Испаритель K-5 (70-90W)',
    variantLabel: 'Вариант',
    variants: ['0.15 Ом'],
    price: 280, badge: null, emoji: '🔩',
    strength: null,
    gradient: ['#422006', '#f97316'],
    image: 'images/Испаритель к5.jpg',
  },
  {
    id: 10, category: 'accessories',
    name: 'Картридж Vaporesso XROS',
    variantLabel: 'Объём',
    variants: ['2 мл', '3 мл'],
    price: 300, badge: null, emoji: '🫙',
    strength: null,
    gradient: ['#0369a1', '#0ea5e9'],
    image: 'images/картридж хрос.png',
  },
];

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
//  КАТЕГОРИИ
// ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'pods',         img: 'images/Под-системы.png', label: 'Под-системы' },
  { id: 'liquids',      img: 'images/Жидкость.png',    label: 'Жидкости'    },
  { id: 'disposables',  img: 'images/Одноразки.png',   label: 'Одноразки', imgSize: 38  },
  { id: 'snus',         img: 'images/снюс.png',        label: 'Снюс'        },
  { id: 'accessories',  img: 'images/Расходники.png',  label: 'Расходники'  },
];

// ──────────────────────────────────────────────────────────────
//  СОСТОЯНИЕ
//  cart: { "productId:variant": { productId, variant, qty, price, name } }
// ──────────────────────────────────────────────────────────────
let activeCategory = 'pods';
let searchQuery    = '';
let sortOrder      = 'default';  // 'default' | 'asc' | 'desc'
let activePromo    = null;       // null | { code: string, discount: number }
const cart = {};

// Наличие вкусов: { "productId:variant": true/false }
let availability = {};
// Черновик изменений в панели менеджера
let availDraft = {};

// ID менеджеров/админа — синхронизируй с bot.py
const MANAGER_IDS_CLIENT = [878878846, 7555460392];

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
  }
}

// ──────────────────────────────────────────────────────────────
//  КАТЕГОРИИ — рендер
// ──────────────────────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById('categories');
  container.innerHTML = CATEGORIES.map(cat => `
    <button class="cat-btn${cat.id === activeCategory ? ' active' : ''}" data-cat="${cat.id}">
      ${cat.img
        ? `<img src="${cat.img}" class="cat-icon-img" alt="${cat.label}" draggable="false"${cat.imgSize ? ` style="width:${cat.imgSize}px;height:${cat.imgSize}px"` : ''} />`
        : `<span class="icon">${cat.icon}</span>`}
      <span class="label">${cat.label}</span>
    </button>
  `).join('');
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
    ? `<span class="card-badge ${badgeClass(p.badge)}">${p.badge}</span>` : '';

  const imageHtml = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="card-img" loading="lazy" />`
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
    return `<button class="card-chip${cls}" data-id="${p.id}" data-variant="${v}"${!avail ? ' disabled' : ''}>
      ${avail ? '' : '<span class="chip-x">✕</span>'}${v}${qty > 0 ? `<span class="chip-qty">${qty}</span>` : ''}
    </button>`;
  }).join('');

  const discount     = activePromo?.discount || 0;
  const finalPrice   = discount ? Math.round(p.price * (1 - discount / 100)) : p.price;
  const priceHtml    = discount
    ? `<span class="card-price-orig">${p.price.toLocaleString('ru-RU')} ₽</span>
       <span class="card-price">${finalPrice.toLocaleString('ru-RU')} ₽</span>`
    : `<span class="card-price">${p.price.toLocaleString('ru-RU')} ₽</span>`;

  const imgAttr = p.image
    ? ` data-img="${p.image}" data-name="${p.name}" class="card-image card-image--clickable"`
    : ` class="card-image"`;

  return `
    <div class="product-card">
      <div${imgAttr} style="${bgStyle}">
        ${badgeHtml}
        <span class="card-qty${totalQty > 0 ? ' visible' : ''}" id="qty-${p.id}">${totalQty}</span>
        ${imageHtml}
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        ${p.strength ? `<div class="card-strength">${p.strength}</div>` : ''}
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

function clearCart() {
  const productIds = [...new Set(Object.values(cart).map(x => x.productId))];
  Object.keys(cart).forEach(k => delete cart[k]);
  productIds.forEach(id => refreshCardUI(id));
  refreshCartBar();
  closeCartModal();
  showToast('Корзина очищена');
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
  const getEmoji = id => PRODUCTS.find(x => x.id === id)?.emoji ?? '📦';

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
      <div class="ci-icon" style="background:${getGradient(item.productId)}">${getEmoji(item.productId)}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-sub">${item.variant}</div>
        <div class="ci-price-row">${priceHtml}</div>
      </div>
      <div class="ci-stepper">
        <button data-action="dec" data-key="${key}">−</button>
        <span class="ci-qty">${item.qty}</span>
        <button data-action="inc" data-key="${key}">+</button>
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
      btn.textContent = 'Оформить заказ 🚀';
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
function submitOrder() {
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

  localStorage.setItem(LS_KEY, Date.now().toString());
  startCooldownUI();

  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ items, promo_code: promoCode }));
  } else {
    // Только для теста в браузере
    const promoLine = promoCode ? `\nПромокод: ${promoCode}` : '';
    alert(`Заказ (тест):\n${items.map(i=>`ID${i.product_id} ${i.variant} x${i.qty}`).join('\n')}${promoLine}`);
  }
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
  tgInit();
  await loadAvailability();
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
  document.getElementById('confirmOrderBtn')?.addEventListener('click', submitOrder);

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
      <div class="avail-product-name">${p.emoji} ${p.name}</div>
      <div class="avail-variants">
        ${p.variants.map(v => {
          const key = `${p.id}:${v}`;
          const on = availDraft[key] !== false;
          return `
            <div class="avail-row" data-key="${key}">
              <span class="avail-variant-name">${v}</span>
              <button class="avail-toggle ${on ? 'avail-on' : 'avail-off'}" data-key="${key}">
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
      availDraft[key] = !availDraft[key];
      btn.textContent = availDraft[key] ? '✅ Есть' : '❌ Нет';
      btn.className = `avail-toggle ${availDraft[key] ? 'avail-on' : 'avail-off'}`;
      tg?.HapticFeedback?.selectionChanged();
    });
  });
}

async function saveAvailability() {
  availability = { ...availDraft };

  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ type: 'availability', data: availability }));
  }

  closeAvailModal();
  renderProducts();
  showToast('✅ Наличие обновлено');
}
