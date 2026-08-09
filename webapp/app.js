/* ================================================================
   Akva Store — Mini App Logic
   Telegram WebApp + каталог + корзина
================================================================ */

// ──────────────────────────────────────────────────────────────
//  ДАННЫЕ ТОВАРОВ
//  Чтобы добавить новый товар — скопируй один объект ниже и
//  заполни поля. category: 'pods' | 'liquids' | 'disposables' | 'snus'
// ──────────────────────────────────────────────────────────────
const PRODUCTS = [

  // ── Под-системы ──────────────────────────────────────────────
  {
    id: 1,
    category:  'pods',
    name:      'XROS 4',
    subtitle:  'Голубой',
    price:     3490,
    badge:     'Хит',           // 'Хит' | 'Новинка' | 'Скидка' | null
    emoji:     '💎',
    gradient:  ['#0369a1', '#0ea5e9'],
  },
  {
    id: 2,
    category:  'pods',
    name:      'Aegis Hero 3',
    subtitle:  'Защитный корпус',
    price:     4990,
    badge:     'Новинка',
    emoji:     '🛡️',
    gradient:  ['#1e3a5f', '#38bdf8'],
  },

  // ── Жидкости ─────────────────────────────────────────────────
  {
    id: 3,
    category:  'liquids',
    name:      'Husky Double Ice',
    subtitle:  'Черника-Мята',
    price:     890,
    badge:     'Хит',
    emoji:     '🫐',
    gradient:  ['#312e81', '#6366f1'],
  },
  {
    id: 4,
    category:  'liquids',
    name:      'Electro Jam',
    subtitle:  'Тропик-Льдинка',
    price:     750,
    badge:     null,
    emoji:     '⚡',
    gradient:  ['#065f46', '#34d399'],
  },

  // ── Одноразки ─────────────────────────────────────────────────
  {
    id: 5,
    category:  'disposables',
    name:      'Elf Bar 10000',
    subtitle:  'Ледяной арбуз',
    price:     1490,
    badge:     'Хит',
    emoji:     '🍉',
    gradient:  ['#7f1d1d', '#f87171'],
  },
  {
    id: 6,
    category:  'disposables',
    name:      'Lost Mary 12000',
    subtitle:  'Манго-персик',
    price:     1690,
    badge:     'Новинка',
    emoji:     '🥭',
    gradient:  ['#78350f', '#fbbf24'],
  },

  // ── Снюс ──────────────────────────────────────────────────────
  {
    id: 7,
    category:  'snus',
    name:      'Iceberg',
    subtitle:  'Крио-мята',
    price:     390,
    badge:     'Хит',
    emoji:     '🧊',
    gradient:  ['#0c4a6e', '#7dd3fc'],
  },
  {
    id: 8,
    category:  'snus',
    name:      'Siberia',
    subtitle:  'Белая серия',
    price:     350,
    badge:     null,
    emoji:     '❄️',
    gradient:  ['#1e293b', '#94a3b8'],
  },

];

// ──────────────────────────────────────────────────────────────
//  КОНФИГУРАЦИЯ КАТЕГОРИЙ
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
  tg.MainButton.setText('Оформить заказ');
  tg.MainButton.color = '#0ea5e9';
  tg.MainButton.textColor = '#ffffff';
  tg.MainButton.onClick(submitOrder);

  // Адаптируем цвет верхней панели
  tg.setHeaderColor('#0f172a');
  tg.setBackgroundColor('#0f172a');
}

// ──────────────────────────────────────────────────────────────
//  РЕНДЕР КАТЕГОРИЙ
// ──────────────────────────────────────────────────────────────
function renderCategories() {
  const container = document.getElementById('categories');
  container.innerHTML = CATEGORIES.map(cat => `
    <button
      class="cat-btn${cat.id === activeCategory ? ' active' : ''}"
      data-cat="${cat.id}"
      aria-label="${cat.label}"
    >
      <span class="icon">${cat.icon}</span>
      <span class="label">${cat.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => setCategory(btn.dataset.cat));
  });
}

function setCategory(catId) {
  if (catId === activeCategory) return;
  activeCategory = catId;
  renderCategories();
  renderProducts();
}

// ──────────────────────────────────────────────────────────────
//  РЕНДЕР ТОВАРОВ
// ──────────────────────────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const items = PRODUCTS.filter(p => p.category === activeCategory);

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🌊</div>
        <p>Товары скоро появятся</p>
      </div>`;
    return;
  }

  // Небольшая задержка для анимации смены категории
  grid.style.opacity = '0';
  setTimeout(() => {
    grid.innerHTML = items.map(p => buildCard(p)).join('');
    grid.style.opacity = '1';
    grid.style.transition = 'opacity .2s';

    // Навешиваем обработчики кнопок
    grid.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', () => addToCart(+btn.dataset.id));
    });
  }, 120);
}

// ─── Построение HTML карточки ─────────────────────────────────
function buildCard(product) {
  const qty    = cart[product.id] || 0;
  const bg     = `linear-gradient(135deg, ${product.gradient[0]}, ${product.gradient[1]})`;
  const badgeHtml = product.badge
    ? `<span class="card-badge ${badgeClass(product.badge)}">${product.badge}</span>`
    : '';
  const qtyHtml = qty > 0
    ? `<span class="card-qty visible" id="qty-${product.id}">${qty}</span>`
    : `<span class="card-qty" id="qty-${product.id}">${qty}</span>`;

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="card-image" style="background:${bg}">
        ${badgeHtml}
        ${qtyHtml}
        <span class="product-emoji">${product.emoji}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${product.name}</div>
        <div class="card-sub">${product.subtitle}</div>
        <div class="card-footer">
          <span class="card-price">${product.price.toLocaleString('ru-RU')} ₽</span>
          <button
            class="add-btn${qty > 0 ? ' added' : ''}"
            data-id="${product.id}"
            aria-label="Добавить в корзину"
          >${qty > 0 ? '✓' : '+'}</button>
        </div>
      </div>
    </div>`;
}

function badgeClass(badge) {
  const map = { 'Хит': 'badge-hit', 'Новинка': 'badge-new', 'Скидка': 'badge-sale' };
  return map[badge] ?? 'badge-hit';
}

// ──────────────────────────────────────────────────────────────
//  КОРЗИНА
// ──────────────────────────────────────────────────────────────
function addToCart(productId) {
  cart[productId] = (cart[productId] || 0) + 1;
  updateCardUI(productId);
  updateCartBar();
  showToast('Добавлено в корзину 🛒');
  hapticFeedback();
}

function updateCardUI(productId) {
  const qty      = cart[productId] || 0;
  const qtyEl    = document.getElementById(`qty-${productId}`);
  const addBtnEl = document.querySelector(`.add-btn[data-id="${productId}"]`);

  if (qtyEl) {
    qtyEl.textContent = qty;
    qtyEl.classList.toggle('visible', qty > 0);
  }
  if (addBtnEl) {
    addBtnEl.classList.toggle('added', qty > 0);
    addBtnEl.textContent = qty > 0 ? '✓' : '+';
  }

  // Бейдж на кнопке корзины в хедере
  const badge = document.getElementById('cartBadge');
  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0);
  if (badge) {
    badge.textContent = totalQty;
    badge.classList.toggle('visible', totalQty > 0);
  }
}

function updateCartBar() {
  const totalQty   = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = PRODUCTS.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);

  const bar      = document.getElementById('cartBar');
  const countEl  = document.getElementById('cartCount');
  const totalEl  = document.getElementById('cartTotal');

  if (bar)     bar.classList.toggle('visible', totalQty > 0);
  if (countEl) countEl.textContent = `${totalQty} товар${plural(totalQty)}`;
  if (totalEl) totalEl.textContent = `${totalPrice.toLocaleString('ru-RU')} ₽`;

  // Кнопка Telegram MainButton
  if (tg?.MainButton) {
    if (totalQty > 0) {
      tg.MainButton.setText(`Оформить заказ • ${totalPrice.toLocaleString('ru-RU')} ₽`);
      tg.MainButton.show();
    } else {
      tg.MainButton.hide();
    }
  }
}

// ──────────────────────────────────────────────────────────────
//  ОФОРМЛЕНИЕ ЗАКАЗА
// ──────────────────────────────────────────────────────────────
function submitOrder() {
  const items = PRODUCTS
    .filter(p => cart[p.id] > 0)
    .map(p => ({
      name:  `${p.name} (${p.subtitle})`,
      price: p.price,
      qty:   cart[p.id],
      total: p.price * cart[p.id],
    }));

  const total = items.reduce((sum, i) => sum + i.total, 0);

  const payload = JSON.stringify({ items, total });

  if (tg?.sendData) {
    tg.sendData(payload);
  } else {
    // Для тестирования вне Telegram
    alert(`Заказ отправлен!\n${items.map(i => `${i.name} x${i.qty} = ${i.total}₽`).join('\n')}\nИтого: ${total}₽`);
  }
}

// ──────────────────────────────────────────────────────────────
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ──────────────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function hapticFeedback() {
  tg?.HapticFeedback?.impactOccurred('light');
}

function plural(n) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'ов';
  if (last === 1) return '';
  if (last >= 2 && last <= 4) return 'а';
  return 'ов';
}

// ──────────────────────────────────────────────────────────────
//  ИНИЦИАЛИЗАЦИЯ
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  tgInit();
  renderCategories();
  renderProducts();

  // Кнопка «Посмотреть заказ» в нижней плашке
  document.getElementById('orderBtn')?.addEventListener('click', submitOrder);

  // Кнопка корзины в хедере — можно расширить (например, показать модалку)
  document.getElementById('cartButton')?.addEventListener('click', () => {
    if (Object.values(cart).some(q => q > 0)) {
      submitOrder();
    } else {
      showToast('Корзина пуста 🛒');
    }
  });
});
