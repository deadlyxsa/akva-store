/* ================================================================
   Akva Store — Mini App Logic
================================================================ */

// ──────────────────────────────────────────────────────────────
//  ДАННЫЕ ТОВАРОВ — добавляй новые объекты сюда
//  category: 'pods' | 'liquids' | 'disposables' | 'snus'
// ──────────────────────────────────────────────────────────────
const PRODUCTS = [

  // ── Под-системы ──────────────────────────────────────────────
  {
    id: 1, category: 'pods',
    name: 'XROS 4', subtitle: 'Голубой',
    price: 3490, badge: 'Хит', emoji: '💎',
    gradient: ['#0369a1', '#0ea5e9'],
    image: null,  // пример с картинкой: image: 'images/xros4.jpg'
  },
  {
    id: 2, category: 'pods',
    name: 'Aegis Hero 3', subtitle: 'Защитный корпус',
    price: 4990, badge: 'Новинка', emoji: '🛡️',
    gradient: ['#1e3a5f', '#38bdf8'],
    image: null,
  },

  // ── Жидкости ─────────────────────────────────────────────────
  {
    id: 3, category: 'liquids',
    name: 'Husky Double Ice', subtitle: 'Черника-Мята',
    price: 890, badge: 'Хит', emoji: '🫐',
    gradient: ['#312e81', '#6366f1'],
    image: null,
  },
  {
    id: 4, category: 'liquids',
    name: 'Electro Jam', subtitle: 'Тропик-Льдинка',
    price: 750, badge: null, emoji: '⚡',
    gradient: ['#065f46', '#34d399'],
    image: null,
  },

  // ── Одноразки ─────────────────────────────────────────────────
  {
    id: 5, category: 'disposables',
    name: 'Elf Bar 10000', subtitle: 'Ледяной арбуз',
    price: 1490, badge: 'Хит', emoji: '🍉',
    gradient: ['#7f1d1d', '#f87171'],
    image: null,
  },
  {
    id: 6, category: 'disposables',
    name: 'Lost Mary 12000', subtitle: 'Манго-персик',
    price: 1690, badge: 'Новинка', emoji: '🥭',
    gradient: ['#78350f', '#fbbf24'],
    image: null,
  },

  // ── Снюс ──────────────────────────────────────────────────────
  {
    id: 7, category: 'snus',
    name: 'Iceberg', subtitle: 'Крио-мята',
    price: 390, badge: 'Хит', emoji: '🧊',
    gradient: ['#0c4a6e', '#7dd3fc'],
    image: null,
  },
  {
    id: 8, category: 'snus',
    name: 'Siberia', subtitle: 'Белая серия',
    price: 350, badge: null, emoji: '❄️',
    gradient: ['#1e293b', '#94a3b8'],
    image: null,
  },
];

// ──────────────────────────────────────────────────────────────
//  КАТЕГОРИИ
// ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'pods',        icon: '🌊', label: 'Под-системы' },
  { id: 'liquids',     icon: '💧', label: 'Жидкости'    },
  { id: 'disposables', icon: '🧊', label: 'Одноразки'   },
  { id: 'snus',        icon: '💨', label: 'Снюс'        },
];

// ──────────────────────────────────────────────────────────────
//  СОСТОЯНИЕ
// ──────────────────────────────────────────────────────────────
let activeCategory = 'pods';
const cart = {};  // { productId: quantity }

// ──────────────────────────────────────────────────────────────
//  TELEGRAM WEBAPP
// ──────────────────────────────────────────────────────────────
const tg = window.Telegram?.WebApp ?? null;

function tgInit() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0f172a');
  tg.setBackgroundColor?.('#0f172a');
}

// ──────────────────────────────────────────────────────────────
//  КАТЕГОРИИ — рендер
// ──────────────────────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById('categories');
  container.innerHTML = CATEGORIES.map(cat => `
    <button class="cat-btn${cat.id === activeCategory ? ' active' : ''}" data-cat="${cat.id}">
      <span class="icon">${cat.icon}</span>
      <span class="label">${cat.label}</span>
    </button>
  `).join('');
  container.querySelectorAll('.cat-btn').forEach(btn =>
    btn.addEventListener('click', () => setCategory(btn.dataset.cat))
  );
}

function setCategory(catId) {
  if (catId === activeCategory) return;
  activeCategory = catId;
  renderCategories();
  renderProducts();
}

// ──────────────────────────────────────────────────────────────
//  ТОВАРЫ — рендер
// ──────────────────────────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const items = PRODUCTS.filter(p => p.category === activeCategory);

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🌊</div><p>Товары скоро появятся</p></div>`;
    return;
  }

  grid.style.opacity = '0';
  setTimeout(() => {
    grid.innerHTML = items.map(buildCard).join('');
    grid.style.opacity = '1';
    grid.style.transition = 'opacity .2s';
    grid.querySelectorAll('.add-btn').forEach(btn =>
      btn.addEventListener('click', () => addToCart(+btn.dataset.id))
    );
  }, 120);
}

function buildCard(p) {
  const qty = cart[p.id] || 0;
  const badgeHtml = p.badge
    ? `<span class="card-badge ${badgeClass(p.badge)}">${p.badge}</span>` : '';

  // Если есть своя картинка — показываем её, иначе градиент с эмодзи
  const imageHtml = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="card-img" loading="lazy" />`
    : `<span class="product-emoji">${p.emoji}</span>`;

  const bgStyle = p.image
    ? `background:#0f172a`
    : `background:linear-gradient(135deg,${p.gradient[0]},${p.gradient[1]})`;

  return `
    <div class="product-card">
      <div class="card-image" style="${bgStyle}">
        ${badgeHtml}
        <span class="card-qty${qty > 0 ? ' visible' : ''}" id="qty-${p.id}">${qty}</span>
        ${imageHtml}
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-sub">${p.subtitle}</div>
        <div class="card-footer">
          <span class="card-price">${p.price.toLocaleString('ru-RU')} ₽</span>
          <button class="add-btn${qty > 0 ? ' added' : ''}" data-id="${p.id}">${qty > 0 ? '✓' : '+'}</button>
        </div>
      </div>
    </div>`;
}

function badgeClass(b) {
  return { 'Хит': 'badge-hit', 'Новинка': 'badge-new', 'Скидка': 'badge-sale' }[b] ?? 'badge-hit';
}

// ──────────────────────────────────────────────────────────────
//  КОРЗИНА — добавление / изменение количества
// ──────────────────────────────────────────────────────────────
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  refreshCardUI(id);
  refreshCartBar();
  showToast('Добавлено в корзину 🛒');
  tg?.HapticFeedback?.impactOccurred('light');
}

function setQty(id, qty) {
  if (qty <= 0) {
    delete cart[id];
  } else {
    cart[id] = qty;
  }
  refreshCardUI(id);
  refreshCartBar();
  renderCartModal();   // обновляем модалку, если открыта
}

function refreshCardUI(id) {
  const qty    = cart[id] || 0;
  const qtyEl  = document.getElementById(`qty-${id}`);
  const addBtn = document.querySelector(`.add-btn[data-id="${id}"]`);
  if (qtyEl) { qtyEl.textContent = qty; qtyEl.classList.toggle('visible', qty > 0); }
  if (addBtn) { addBtn.classList.toggle('added', qty > 0); addBtn.textContent = qty > 0 ? '✓' : '+'; }

  // Бейдж в хедере
  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) { badge.textContent = totalQty; badge.classList.toggle('visible', totalQty > 0); }
}

function refreshCartBar() {
  const totalQty   = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = calcTotal();
  const bar        = document.getElementById('cartBar');
  const countEl    = document.getElementById('cartCount');
  const totalEl    = document.getElementById('cartTotal');

  bar?.classList.toggle('visible', totalQty > 0);
  if (countEl) countEl.textContent = `${totalQty} товар${plural(totalQty)}`;
  if (totalEl) totalEl.textContent = `${totalPrice.toLocaleString('ru-RU')} ₽`;
}

function calcTotal() {
  return PRODUCTS.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);
}

// ──────────────────────────────────────────────────────────────
//  МОДАЛКА КОРЗИНЫ
// ──────────────────────────────────────────────────────────────
function openCartModal() {
  renderCartModal();
  document.getElementById('cartModal').classList.add('visible');
  document.getElementById('cartOverlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
  checkCooldownOnOpen();  // блокируем кнопку если кулдаун ещё идёт
}

function closeCartModal() {
  document.getElementById('cartModal').classList.remove('visible');
  document.getElementById('cartOverlay').classList.remove('visible');
  document.body.style.overflow = '';
}

function renderCartModal() {
  const itemsEl  = document.getElementById('cartItems');
  const totalEl  = document.getElementById('cartModalTotal');
  const confirmBtn = document.getElementById('confirmOrderBtn');
  const inCart   = PRODUCTS.filter(p => (cart[p.id] || 0) > 0);

  if (!inCart.length) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="icon">🛒</div>
        <p>Корзина пуста</p>
      </div>`;
    if (totalEl) totalEl.textContent = '0 ₽';
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  const bg = id => {
    const p = PRODUCTS.find(x => x.id === id);
    return `linear-gradient(135deg,${p.gradient[0]},${p.gradient[1]})`;
  };

  itemsEl.innerHTML = inCart.map(p => `
    <div class="cart-item">
      <div class="ci-icon" style="background:${bg(p.id)}">${p.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${p.name}</div>
        <div class="ci-sub">${p.subtitle}</div>
        <div class="ci-price">${(p.price * cart[p.id]).toLocaleString('ru-RU')} ₽</div>
      </div>
      <div class="ci-stepper">
        <button data-action="dec" data-id="${p.id}">−</button>
        <span class="ci-qty">${cart[p.id]}</span>
        <button data-action="inc" data-id="${p.id}">+</button>
      </div>
    </div>
  `).join('');

  // Обработчики +/−
  itemsEl.querySelectorAll('.ci-stepper button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = +btn.dataset.id;
      const inc = btn.dataset.action === 'inc';
      setQty(id, (cart[id] || 0) + (inc ? 1 : -1));
      tg?.HapticFeedback?.impactOccurred('light');
      // Если корзина опустела — закрываем
      if (!Object.keys(cart).length) closeCartModal();
    });
  });

  if (totalEl)    totalEl.textContent  = `${calcTotal().toLocaleString('ru-RU')} ₽`;
  if (confirmBtn) confirmBtn.disabled  = false;
}

// ──────────────────────────────────────────────────────────────
//  АНТИСПАМ — кулдаун заказов
//  Синхронизирован с ORDER_COOLDOWN в bot.py (5 минут)
// ──────────────────────────────────────────────────────────────
const ORDER_COOLDOWN_MS = 5 * 60 * 1000;  // 5 минут в миллисекундах
const LS_KEY = 'akva_last_order';
let countdownTimer = null;

function getSecondsLeft() {
  const last = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  if (!last) return 0;
  const elapsed = Date.now() - last;
  return Math.max(0, Math.ceil((ORDER_COOLDOWN_MS - elapsed) / 1000));
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
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    btn.disabled = true;
    btn.textContent = `Повторный заказ через ${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

// Проверяем при открытии модалки — вдруг кулдаун ещё идёт
function checkCooldownOnOpen() {
  if (getSecondsLeft() > 0) startCooldownUI();
}

// ──────────────────────────────────────────────────────────────
//  ОТПРАВКА ЗАКАЗА (только из модалки, по кнопке «Оформить»)
// ──────────────────────────────────────────────────────────────
function submitOrder() {
  // Клиентская проверка кулдауна (дополнительный UX-слой)
  const secs = getSecondsLeft();
  if (secs > 0) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    showToast(`Подождите ${m}:${String(s).padStart(2, '0')} ⏳`);
    return;
  }

  const items = PRODUCTS
    .filter(p => (cart[p.id] || 0) > 0)
    .map(p => ({
      name:  `${p.name} (${p.subtitle})`,
      price: p.price,
      qty:   cart[p.id],
      total: p.price * cart[p.id],
    }));
  const total = calcTotal();

  // Сохраняем время заказа и запускаем таймер
  localStorage.setItem(LS_KEY, Date.now().toString());
  startCooldownUI();

  if (tg?.sendData) {
    tg.sendData(JSON.stringify({ items, total }));
  } else {
    // Fallback для теста в браузере
    alert(`Заказ:\n${items.map(i=>`${i.name} x${i.qty} = ${i.total}₽`).join('\n')}\nИтого: ${total}₽`);
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
document.addEventListener('DOMContentLoaded', () => {
  tgInit();
  renderCategories();
  renderProducts();

  // Нижняя плашка «Посмотреть заказ» → открывает модалку
  document.getElementById('orderBtn')?.addEventListener('click', openCartModal);

  // Кнопка корзины в хедере → открывает модалку
  document.getElementById('cartButton')?.addEventListener('click', () => {
    if (Object.values(cart).some(q => q > 0)) openCartModal();
    else showToast('Корзина пуста 🛒');
  });

  // Закрытие модалки
  document.getElementById('cartModalClose')?.addEventListener('click', closeCartModal);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCartModal);

  // Финальная кнопка «Оформить заказ» → sendData
  document.getElementById('confirmOrderBtn')?.addEventListener('click', submitOrder);
});
