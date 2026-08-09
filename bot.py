#!/usr/bin/env python3
"""
Telegram-бот магазина Akva Store
Запуск: python bot.py
"""

import base64
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path

import urllib.request
import urllib.error

# Загружаем .env если есть (без внешних библиотек)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())
from telegram import (
    Update, WebAppInfo, KeyboardButton, ReplyKeyboardMarkup,
    InlineKeyboardButton, InlineKeyboardMarkup,
)
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    CallbackQueryHandler, filters, ContextTypes
)

# ══════════════════════════════════════════════════════════════
#   КОНФИГУРАЦИЯ
# ══════════════════════════════════════════════════════════════

BOT_TOKEN  = "8854996706:AAE3lTBiDNCXGcLxCmiybQZJGPFklScGT68"
WEBAPP_URL = "https://deadlyxsa.github.io/akva-store/webapp/"

# ── GitHub API (для обновления availability.json на GitHub Pages) ─
# Получить токен: github.com → Settings → Developer settings →
#   Personal access tokens → Tokens (classic) → scope: repo
GITHUB_TOKEN    = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO     = "deadlyxsa/akva-store"
GITHUB_AVL_PATH = "webapp/availability.json"

# ── Роли ──────────────────────────────────────────────────────
# ADMIN_ID  — управляет промокодами, настройками бота (/promo)
# MANAGER_IDS — могут общаться с клиентами (/panel /write /clients)
# Админ автоматически является менеджером.
# Чтобы добавить менеджера: вставь его Telegram user_id в MANAGER_IDS.
ADMIN_ID: int       = 878878846
MANAGER_IDS: set[int] = {7555460392}   # ← добавляй сюда ID менеджеров

# ── Антиспам ──────────────────────────────────────────────────
ORDER_COOLDOWN    = 5 * 60   # секунд между заказами одного пользователя
MAX_QTY_PER_ITEM  = 50       # максимум единиц одного варианта
MAX_ITEMS_ORDER   = 20       # максимум разных позиций в заказе
MAX_PAYLOAD_BYTES = 8_192    # максимальный размер payload от webapp

# ── Защита промокодов ─────────────────────────────────────────
MAX_PROMO_FAILS   = 5     # неудачных попыток до блокировки
PROMO_FAIL_WINDOW = 3600  # секунд (1 час) — окно подсчёта попыток

# ── Каталог товаров (единственный источник цен — сервер) ─────
# ОБЯЗАТЕЛЬНО синхронизируй цены с app.js при их изменении
PRODUCTS_CATALOG: dict[int, dict] = {
    1: {'name': 'ISTERIKA x САМОУБИЙЦА V.2',          'price': 450},
    2: {'name': 'ISTERIKA CLASSIC SALT',               'price': 400},
    3: {'name': 'MONSTER HARDCORE',                    'price': 400},
    4: {'name': 'MONSTER SOURLINE',                    'price': 400},
    5: {'name': 'УБИВАШКА',                            'price': 400},
    6: {'name': 'Vaporesso Xros 6 Mini',               'price': 1900},
    7: {'name': 'Lost Vape Thelema Elite S',           'price': 1700},
    8: {'name': 'Картридж Lost Vape E-plus Dual Mesh', 'price': 350},
    9: {'name': 'Испаритель K-5 (70-90W)',             'price': 280},
    10: {'name': 'Картридж Vaporesso XROS',            'price': 300},
}

# ── Промокоды по умолчанию (синхронизируй с app.js) ──────────
PROMO_CODES_DEFAULT: dict[str, dict] = {
    'AKVA10':   {'discount': 10, 'max_uses': 100},
    'SUMMER20': {'discount': 20, 'max_uses': 50},
    'VIP30':    {'discount': 30, 'max_uses': 10},
}

# ──────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
#   RUNTIME СОСТОЯНИЕ
# ══════════════════════════════════════════════════════════════

support_users: set[int] = set()

# {user_id: {name, username, unread, last_msg, last_time}}
customer_chats: dict[int, dict] = {}

# Активный клиент для каждого менеджера: {manager_id: customer_id | None}
manager_active_chats: dict[int, int | None] = {}

# Время последнего заказа: {user_id: datetime}
last_order_time: dict[int, datetime] = {}

# Runtime промокоды (стартуют из PROMO_CODES_DEFAULT, меняются через /promo)
promo_codes:      dict[str, dict] = dict(PROMO_CODES_DEFAULT)
promo_usage:      dict[str, int]  = {}
promo_user_usage: dict[str, list] = {}   # {код: [user_id, ...]}
promo_fail_log:   dict[int, list] = {}   # {user_id: [timestamp, ...]}


# ══════════════════════════════════════════════════════════════
#   ФАЙЛЫ ПЕРСИСТЕНТНОСТИ
# ══════════════════════════════════════════════════════════════

_BASE                = Path(__file__).parent
PROMO_USAGE_FILE     = _BASE / "promo_usage.json"
PROMO_USER_FILE      = _BASE / "promo_user_usage.json"
ORDER_COOLDOWNS_FILE = _BASE / "order_cooldowns.json"
AVAILABILITY_FILE    = _BASE / "webapp" / "availability.json"


def load_promo_usage() -> None:
    promo_usage.update({c: 0 for c in promo_codes})
    if PROMO_USAGE_FILE.exists():
        try:
            for code, count in json.loads(PROMO_USAGE_FILE.read_text(encoding="utf-8")).items():
                if code in promo_usage:
                    promo_usage[code] = int(count)
        except Exception as e:
            logger.warning("promo_usage.json: %s", e)

def save_promo_usage() -> None:
    try:
        PROMO_USAGE_FILE.write_text(
            json.dumps(promo_usage, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as e:
        logger.warning("save promo_usage: %s", e)

def load_promo_user_usage() -> None:
    if PROMO_USER_FILE.exists():
        try:
            for code, users in json.loads(PROMO_USER_FILE.read_text(encoding="utf-8")).items():
                promo_user_usage[code] = list(users)
        except Exception as e:
            logger.warning("promo_user_usage.json: %s", e)

def save_promo_user_usage() -> None:
    try:
        PROMO_USER_FILE.write_text(
            json.dumps(promo_user_usage, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as e:
        logger.warning("save promo_user_usage: %s", e)

def load_order_cooldowns() -> None:
    if ORDER_COOLDOWNS_FILE.exists():
        try:
            now = datetime.now()
            for uid_str, ts in json.loads(ORDER_COOLDOWNS_FILE.read_text(encoding="utf-8")).items():
                dt = datetime.fromtimestamp(float(ts))
                if (now - dt).total_seconds() < ORDER_COOLDOWN:
                    last_order_time[int(uid_str)] = dt
        except Exception as e:
            logger.warning("order_cooldowns.json: %s", e)

def save_order_cooldowns() -> None:
    try:
        ORDER_COOLDOWNS_FILE.write_text(
            json.dumps({str(uid): dt.timestamp() for uid, dt in last_order_time.items()}),
            encoding="utf-8",
        )
    except Exception as e:
        logger.warning("save order_cooldowns: %s", e)


# ══════════════════════════════════════════════════════════════
#   ПРОВЕРКА РОЛЕЙ
# ══════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════
#   НАЛИЧИЕ ВКУСОВ
# ══════════════════════════════════════════════════════════════

def load_availability() -> dict:
    if AVAILABILITY_FILE.exists():
        try:
            return json.loads(AVAILABILITY_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning("availability.json: %s", e)
    return {}

def save_availability_local(data: dict) -> None:
    try:
        AVAILABILITY_FILE.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as e:
        logger.warning("save availability: %s", e)

def push_availability_github(data: dict) -> bool:
    """Обновляет availability.json в репозитории через GitHub API."""
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN не задан — обновление GitHub пропущено")
        return False
    try:
        api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_AVL_PATH}"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        }
        # Получаем текущий SHA файла
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            sha = json.loads(resp.read()).get("sha", "")

        content_b64 = base64.b64encode(
            json.dumps(data, ensure_ascii=False, indent=2).encode()
        ).decode()

        payload = json.dumps({
            "message": "Update availability via bot",
            "content": content_b64,
            "sha": sha,
        }).encode()
        req = urllib.request.Request(api_url, data=payload, headers=headers, method="PUT")
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        logger.warning("GitHub API error: %s", e)
        return False


def is_admin(update: Update) -> bool:
    """Только администратор (управление ботом и промокодами)."""
    return update.effective_user.id == ADMIN_ID

def is_manager(update: Update) -> bool:
    """Менеджер или администратор (общение с клиентами, продажи)."""
    uid = update.effective_user.id
    return uid in MANAGER_IDS or uid == ADMIN_ID


# ══════════════════════════════════════════════════════════════
#   УВЕДОМЛЕНИЯ ВСЕМ МЕНЕДЖЕРАМ
# ══════════════════════════════════════════════════════════════

async def notify_managers(
    ctx: ContextTypes.DEFAULT_TYPE,
    text: str,
    reply_markup=None,
    exclude_id: int | None = None,
) -> None:
    """Отправляет сообщение всем менеджерам и админу (опционально кроме exclude_id)."""
    for mid in MANAGER_IDS | {ADMIN_ID}:
        if mid == exclude_id:
            continue
        try:
            await ctx.bot.send_message(
                chat_id=mid,
                text=text,
                reply_markup=reply_markup,
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("Не удалось уведомить %s: %s", mid, e)


# ══════════════════════════════════════════════════════════════
#   ЗАЩИТА ПРОМОКОДОВ
# ══════════════════════════════════════════════════════════════

def is_promo_rate_limited(user_id: int) -> bool:
    now = time.time()
    log = [t for t in promo_fail_log.get(user_id, []) if now - t < PROMO_FAIL_WINDOW]
    promo_fail_log[user_id] = log
    return len(log) >= MAX_PROMO_FAILS

def record_promo_failure(user_id: int) -> None:
    promo_fail_log.setdefault(user_id, []).append(time.time())

def user_already_used_promo(user_id: int, code: str) -> bool:
    return user_id in promo_user_usage.get(code, [])

def record_user_promo(user_id: int, code: str) -> None:
    promo_user_usage.setdefault(code, [])
    if user_id not in promo_user_usage[code]:
        promo_user_usage[code].append(user_id)
    save_promo_user_usage()


# ══════════════════════════════════════════════════════════════
#   КЛАВИАТУРЫ
# ══════════════════════════════════════════════════════════════

def main_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton("🛍 Магазин", web_app=WebAppInfo(url=WEBAPP_URL))],
            [KeyboardButton("💬 Связаться с менеджером")],
        ],
        resize_keyboard=True,
        input_field_placeholder="Открой магазин или напиши нам...",
    )

def panel_main_kb() -> InlineKeyboardMarkup:
    rows = []
    clients = sorted(
        customer_chats.items(),
        key=lambda x: x[1].get("unread", 0),
        reverse=True,
    )
    for uid, info in clients:
        unread = info.get("unread", 0)
        badge  = f"  🔴 {unread}" if unread > 0 else ""
        rows.append([InlineKeyboardButton(
            f"👤 {info['name']}{badge}",
            callback_data=f"chat_{uid}",
        )])
    if not rows:
        rows.append([InlineKeyboardButton("🌊 Новых обращений нет", callback_data="noop")])
    rows.append([InlineKeyboardButton("🔄 Обновить", callback_data="panel_refresh")])
    return InlineKeyboardMarkup(rows)

def panel_chat_kb(uid: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("← Все чаты",    callback_data="panel_refresh"),
        InlineKeyboardButton("✅ Закрыть чат", callback_data=f"close_{uid}"),
    ]])

def new_msg_kb(uid: int, name: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton(f"💬 Ответить {name}", callback_data=f"reply_{uid}"),
    ]])


# ══════════════════════════════════════════════════════════════
#   ВСПОМОГАЛКИ
# ══════════════════════════════════════════════════════════════

def now_str() -> str:
    return datetime.now().strftime("%H:%M")

def panel_text() -> str:
    total  = len(customer_chats)
    unread = sum(1 for v in customer_chats.values() if v.get("unread", 0) > 0)
    return (
        "👨‍💼 <b>Панель менеджера — Akva Store</b>\n\n"
        f"📊 Всего чатов: <b>{total}</b>\n"
        f"🔴 Непрочитанных: <b>{unread}</b>\n\n"
        "Выберите клиента, чтобы ответить:"
    )

def chat_text(uid: int) -> str:
    info = customer_chats.get(uid, {})
    return (
        f"💬 <b>Чат с {info.get('name', 'Клиент')}</b>\n"
        f"📱 {info.get('username', 'нет username')} | <code>{uid}</code>\n\n"
        f"🕐 Последнее сообщение в {info.get('last_time', '')}:\n"
        f"<i>«{info.get('last_msg', '—')}»</i>\n\n"
        "✏️ <b>Вы пишете этому клиенту.</b>\n"
        "Отправьте текст — он получит ваш ответ.\n\n"
        "<i>← Все чаты — вернуться к списку\n"
        "✅ Закрыть чат — завершить диалог</i>"
    )


# ══════════════════════════════════════════════════════════════
#   КЛИЕНТСКАЯ СТОРОНА
# ══════════════════════════════════════════════════════════════

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    # Менеджеры и админ получают только клавиатуру без приветствия клиента
    if is_manager(update):
        role = "👑 Администратор" if is_admin(update) else "👨‍💼 Менеджер"
        await update.message.reply_text(
            f"{role} Akva Store\n\n"
            "Ваши команды:\n"
            "/panel — список клиентов\n"
            "/write @username — написать клиенту\n"
            "/clients — все клиенты" +
            ("\n/promo — управление промокодами" if is_admin(update) else ""),
            parse_mode="HTML",
        )
        return

    support_users.discard(update.effective_user.id)
    await update.message.reply_text(
        f"👋 Привет, <b>{update.effective_user.first_name}</b>!\n\n"
        "Добро пожаловать в <b>Akva Store</b> 🌊\n"
        "Нефтеюганск · Вейп · Жидкости · Расходники\n\n"
        "📋 <b>Как сделать заказ:</b>\n"
        "1️⃣ Нажми <b>«🛍 Магазин»</b> — открой каталог\n"
        "2️⃣ Выбери товар и вкус, добавь в корзину\n"
        "3️⃣ Нажми <b>«Оформить заказ»</b> и подтверди\n"
        "4️⃣ Жди — менеджер напишет тебе прямо сюда 💙\n\n"
        "💬 <b>Как общаться с менеджером:</b>\n"
        "После заказа или нажатия <b>«💬 Связаться с менеджером»</b> "
        "просто пиши текст в этот чат — менеджер увидит и ответит здесь же.",
        reply_markup=main_keyboard(),
        parse_mode="HTML",
    )


async def btn_contact(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if is_manager(update):
        return
    support_users.add(update.effective_user.id)
    await update.message.reply_text(
        "💬 <b>Связь с менеджером Akva Store</b>\n\n"
        "Возникли вопросы или проблемы?\n\n"
        "Напишите сообщение — менеджер ответит вам прямо здесь 💙\n\n"
        "<i>Для возврата в магазин нажмите /start</i>",
        parse_mode="HTML",
    )


async def handle_order(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Получение данных из Mini App (заказ или обновление наличия)."""
    raw  = update.message.web_app_data.data
    user = update.effective_user

    # ── Быстрая проверка типа ─────────────────────────────────
    if len(raw.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        logger.warning("SECURITY payload too large from %s (%d bytes)", user.id, len(raw))
        await update.message.reply_text("❌ Некорректный запрос.")
        return

    try:
        data_peek = json.loads(raw)
    except json.JSONDecodeError:
        await update.message.reply_text("❌ Ошибка данных.")
        return

    # ── Обновление наличия (только менеджеры/админ) ──────────
    if isinstance(data_peek, dict) and data_peek.get("type") == "availability":
        if not is_manager(update):
            return
        avl_data = data_peek.get("data", {})
        if not isinstance(avl_data, dict):
            await update.message.reply_text("❌ Некорректные данные наличия.")
            return
        save_availability_local(avl_data)
        ok_github = push_availability_github(avl_data)
        off_list = [k for k, v in avl_data.items() if not v]
        status = "✅ GitHub обновлён" if ok_github else "⚠️ GitHub не обновлён (нет токена)"
        msg = (
            f"📦 <b>Наличие обновлено</b>\n\n"
            f"Недоступных позиций: <b>{len(off_list)}</b>\n"
            f"{chr(10).join(f'  • {k}' for k in off_list[:20]) if off_list else '  Все вкусы в наличии ✅'}\n\n"
            f"{status}"
        )
        await update.message.reply_text(msg, parse_mode="HTML")
        return

    # Менеджеры не могут делать заказы через бота
    if is_manager(update):
        return

    # ── 1. Размер payload ─────────────────────────────────────
    if len(raw.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        logger.warning("SECURITY payload too large from %s (%d bytes)", user.id, len(raw))
        await update.message.reply_text("❌ Некорректный запрос.")
        return

    # ── 2. Кулдаун (сохраняется на диске) ────────────────────
    now  = datetime.now()
    last = last_order_time.get(user.id)
    if last:
        remaining = int(ORDER_COOLDOWN - (now - last).total_seconds())
        if remaining > 0:
            mins, secs = remaining // 60, remaining % 60
            await update.message.reply_text(
                f"⏳ <b>Подождите перед следующим заказом</b>\n\n"
                f"Повторный заказ через <b>{mins} мин. {secs:02d} сек.</b>\n\n"
                "Вопросы? → «💬 Связаться с менеджером»",
                parse_mode="HTML",
            )
            return
    last_order_time[user.id] = now
    save_order_cooldowns()

    # ── 3. Данные уже распарсены выше как data_peek ──────────
    data = data_peek
    if not isinstance(data, dict):
        await update.message.reply_text("❌ Ошибка заказа.")
        return

    # ── 4. Валидация позиций ──────────────────────────────────
    items_raw = data.get("items", [])
    if not isinstance(items_raw, list) or not items_raw:
        await update.message.reply_text("❌ Корзина пуста.")
        return

    if len(items_raw) > MAX_ITEMS_ORDER:
        logger.warning("SECURITY too many items from %s: %d", user.id, len(items_raw))
        await update.message.reply_text("❌ Слишком много позиций в заказе.")
        return

    validated_items = []
    for raw_item in items_raw:
        if not isinstance(raw_item, dict):
            await update.message.reply_text("❌ Некорректный формат заказа.")
            return

        pid     = raw_item.get("product_id")
        variant = raw_item.get("variant", "")
        qty     = raw_item.get("qty", 0)

        if not isinstance(pid, int) or pid not in PRODUCTS_CATALOG:
            logger.warning("SECURITY invalid product_id=%s from %s", pid, user.id)
            await update.message.reply_text("❌ Некорректный товар в заказе.")
            return

        if not isinstance(qty, int) or qty < 1 or qty > MAX_QTY_PER_ITEM:
            logger.warning("SECURITY invalid qty=%s from %s", qty, user.id)
            await update.message.reply_text(f"❌ Количество: от 1 до {MAX_QTY_PER_ITEM}.")
            return

        if not isinstance(variant, str) or not variant.strip() or len(variant) > 100:
            logger.warning("SECURITY invalid variant from %s", user.id)
            await update.message.reply_text("❌ Некорректный вариант товара.")
            return

        product = PRODUCTS_CATALOG[pid]
        validated_items.append({
            'name':  f"{product['name']} ({variant.strip()})",
            'price': product['price'],
            'qty':   qty,
            'total': product['price'] * qty,
        })

    original_total = sum(it['total'] for it in validated_items)

    # ── 5. Валидация промокода ────────────────────────────────
    promo_code   = str(data.get("promo_code", "")).upper().strip()[:20]
    discount_pct = 0
    promo_note   = ""
    promo_line   = ""

    if promo_code:
        if is_promo_rate_limited(user.id):
            logger.warning("SECURITY promo rate limit for %s", user.id)
            await update.message.reply_text(
                "🚫 Слишком много неверных промокодов.\n"
                "Попробуйте через час или обратитесь к менеджеру."
            )
            return

        info = promo_codes.get(promo_code)

        if not info:
            record_promo_failure(user.id)
            logger.warning("SECURITY invalid promo '%s' from %s", promo_code, user.id)
            await update.message.reply_text(
                f"⚠️ Промокод <b>{promo_code}</b> не найден.\nЗаказ оформлен без скидки.",
                parse_mode="HTML",
            )
            promo_note = f"❌ Неверный промокод: {promo_code}"

        elif promo_usage.get(promo_code, 0) >= info['max_uses']:
            await update.message.reply_text(
                f"⚠️ Промокод <b>{promo_code}</b> исчерпан.\nЗаказ оформлен без скидки.",
                parse_mode="HTML",
            )
            promo_note = f"⚠️ Промокод {promo_code} исчерпан"

        elif user_already_used_promo(user.id, promo_code):
            logger.warning("SECURITY repeated promo '%s' by %s", promo_code, user.id)
            await update.message.reply_text(
                f"⚠️ Вы уже использовали <b>{promo_code}</b>.\n"
                "Каждый промокод — один раз. Заказ без скидки.",
                parse_mode="HTML",
            )
            promo_note = f"⚠️ Повторное использование {promo_code} от {user.id}"

        else:
            discount_pct = info['discount']
            promo_usage[promo_code] = promo_usage.get(promo_code, 0) + 1
            record_user_promo(user.id, promo_code)
            save_promo_usage()
            used = promo_usage[promo_code]
            left = info['max_uses'] - used
            promo_note = f"🏷 {promo_code} · -{discount_pct}%"
            promo_line = f"{promo_note} | использован {used}/{info['max_uses']}, осталось {left}"

    final_total = round(original_total * (1 - discount_pct / 100))
    lines = "\n".join(
        f"  • {it['name']} × {it['qty']} шт. = <b>{it['total']} руб.</b>"
        for it in validated_items
    )

    # ── 6. Подтверждение покупателю ───────────────────────────
    if discount_pct:
        total_msg = (
            f"💰 Итого со скидкой {discount_pct}%: <b>{final_total} руб.</b>\n"
            f"<s>Без скидки: {original_total} руб.</s>"
        )
    else:
        total_msg = f"💰 Итого: <b>{final_total} руб.</b>"

    # Открываем чат — клиент сможет отвечать менеджеру прямо здесь
    support_users.add(user.id)

    await update.message.reply_text(
        f"✅ <b>Заказ принят!</b>\n\n{lines}\n\n{total_msg}\n\n"
        "Менеджер скоро напишет тебе здесь 💙\n\n"
        "<i>Можешь написать любое сообщение в этот чат — менеджер увидит его и ответит.</i>",
        parse_mode="HTML",
    )

    # ── 7. Сохраняем клиента ──────────────────────────────────
    username = f"@{user.username}" if user.username else "нет username"
    customer_chats[user.id] = {
        "name":      user.full_name,
        "username":  username,
        "unread":    customer_chats.get(user.id, {}).get("unread", 0),
        "last_msg":  f"Заказ на {final_total} руб.",
        "last_time": now_str(),
    }

    # ── 8. Уведомление ВСЕМ менеджерам ───────────────────────
    promo_admin = f"\n{promo_line}\n" if promo_line else (
        f"\n{promo_note}\n" if promo_note else ""
    )
    total_admin = (
        f"💰 <b>Итого: {final_total} руб.</b>  <s>({original_total} руб.)</s>"
        if discount_pct else
        f"💰 <b>Итого: {final_total} руб.</b>"
    )

    order_text = (
        f"🛒 <b>Новый заказ!</b>\n\n"
        f"👤 <a href='tg://user?id={user.id}'>{user.full_name}</a>\n"
        f"📱 {username} | <code>{user.id}</code>\n\n"
        f"📦 <b>Состав:</b>\n{lines}\n"
        f"{promo_admin}\n"
        f"{total_admin}\n"
        f"🕐 {now_str()}"
    )
    await notify_managers(ctx, order_text, reply_markup=new_msg_kb(user.id, user.first_name))


async def handle_customer_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Сообщение клиента → пересылаем всем менеджерам."""
    user = update.effective_user

    # Игнорируем менеджеров
    if is_manager(update):
        return
    if user.id not in support_users:
        return

    text     = update.message.text or "[медиа-сообщение]"
    username = f"@{user.username}" if user.username else "нет username"
    t        = now_str()

    prev = customer_chats.get(user.id, {}).get("unread", 0)
    customer_chats[user.id] = {
        "name":      user.full_name,
        "username":  username,
        "unread":    prev + 1,
        "last_msg":  text[:80],
        "last_time": t,
    }

    msg_text = (
        f"📩 <b>Сообщение от клиента</b>\n\n"
        f"👤 <a href='tg://user?id={user.id}'>{user.full_name}</a>\n"
        f"📱 {username} | <code>{user.id}</code>\n\n"
        f"✉️ {text}\n\n"
        f"🕐 {t}"
    )
    await notify_managers(ctx, msg_text, reply_markup=new_msg_kb(user.id, user.first_name))
    await update.message.reply_text("✅ Сообщение отправлено менеджеру. Ожидайте ответа 💙")


# ══════════════════════════════════════════════════════════════
#   КОМАНДЫ МЕНЕДЖЕРА (panel, write, clients)
# ══════════════════════════════════════════════════════════════

async def cmd_panel(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """/panel — только для менеджеров и админа."""
    if not is_manager(update):
        return
    await update.message.reply_text(panel_text(), reply_markup=panel_main_kb(), parse_mode="HTML")


async def cmd_write(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """/write @username [текст] — только для менеджеров и админа."""
    if not is_manager(update):
        return

    manager_id = update.effective_user.id
    args = ctx.args

    if not args:
        await update.message.reply_text(
            "📝 <b>Как писать клиенту:</b>\n\n"
            "Выбрать клиента:\n<code>/write @username</code>\n\n"
            "Сразу отправить сообщение:\n<code>/write @username Уточните адрес</code>\n\n"
            "После выбора — просто пишите текст.",
            parse_mode="HTML",
        )
        return

    target       = args[0].lstrip("@").lower()
    message_text = " ".join(args[1:]) if len(args) > 1 else None

    found_uid = found_info = None
    for uid, info in customer_chats.items():
        if info.get("username", "").lstrip("@").lower() == target:
            found_uid, found_info = uid, info
            break

    if not found_uid:
        await update.message.reply_text(
            f"❌ Клиент <b>@{target}</b> не найден.\n\n"
            "Список клиентов: /clients",
            parse_mode="HTML",
        )
        return

    manager_active_chats[manager_id] = found_uid
    if found_uid in customer_chats:
        customer_chats[found_uid]["unread"] = 0

    if message_text:
        await ctx.bot.send_message(
            chat_id=found_uid,
            text=f"💬 <b>Сообщение от менеджера Akva Store:</b>\n\n{message_text}",
            parse_mode="HTML",
        )
        await update.message.reply_text(
            f"✅ Отправлено <b>{found_info['name']}</b> (@{target}). Продолжайте писать.",
            parse_mode="HTML",
        )
    else:
        await update.message.reply_text(
            f"✏️ Вы пишете <b>{found_info['name']}</b> (@{target}).\n\n"
            "Отправьте текст — клиент получит ответ.\n"
            "<i>Сменить: /write @другой или /panel</i>",
            parse_mode="HTML",
        )


async def cmd_clients(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """/clients — только для менеджеров и админа."""
    if not is_manager(update):
        return

    if not customer_chats:
        await update.message.reply_text("📋 Клиентов пока нет.")
        return

    lines = [
        f"• <b>{info.get('name','—')}</b> {info.get('username','нет username')} "
        f"| <code>{uid}</code>"
        + (f" 🔴{info.get('unread',0)}" if info.get('unread',0) > 0 else "")
        for uid, info in customer_chats.items()
    ]
    await update.message.reply_text(
        f"📋 <b>Все клиенты ({len(lines)}):</b>\n\n" + "\n".join(lines) + "\n\n"
        "<i>Написать: /write @username</i>",
        parse_mode="HTML",
    )


async def handle_manager_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Текст от менеджера → отправить его активному клиенту."""
    if not is_manager(update):
        return

    manager_id = update.effective_user.id
    uid = manager_active_chats.get(manager_id)

    if not uid:
        await update.message.reply_text(
            "⚠️ Клиент не выбран.\n"
            "Используйте /panel или кнопку «💬 Ответить» под сообщением.",
        )
        return

    info = customer_chats.get(uid, {})
    text = update.message.text

    try:
        await ctx.bot.send_message(
            chat_id=uid,
            text=f"💬 <b>Ответ от менеджера Akva Store:</b>\n\n{text}",
            parse_mode="HTML",
        )
        await update.message.reply_text(
            f"✅ Доставлено <b>{info.get('name', uid)}</b>",
            parse_mode="HTML",
        )
    except Exception as e:
        await update.message.reply_text(f"❌ Не удалось доставить: {e}")


async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Инлайн-кнопки панели — только для менеджеров."""
    query      = update.callback_query
    manager_id = query.from_user.id

    if manager_id not in MANAGER_IDS and manager_id != ADMIN_ID:
        await query.answer("⛔ Доступ запрещён.")
        return

    await query.answer()
    data = query.data

    if data == "noop":
        return

    if data == "panel_refresh":
        await query.edit_message_text(panel_text(), reply_markup=panel_main_kb(), parse_mode="HTML")

    elif data.startswith("chat_"):
        uid = int(data.split("_")[1])
        manager_active_chats[manager_id] = uid
        if uid in customer_chats:
            customer_chats[uid]["unread"] = 0
        await query.edit_message_text(chat_text(uid), reply_markup=panel_chat_kb(uid), parse_mode="HTML")

    elif data.startswith("reply_"):
        uid = int(data.split("_")[1])
        manager_active_chats[manager_id] = uid
        if uid in customer_chats:
            customer_chats[uid]["unread"] = 0
        info = customer_chats.get(uid, {})
        try:
            await query.edit_message_reply_markup(reply_markup=None)
        except Exception:
            pass
        await ctx.bot.send_message(
            chat_id=manager_id,
            text=(
                f"✏️ Вы пишете клиенту <b>{info.get('name', uid)}</b> "
                f"({info.get('username', '')}).\n\n"
                "Отправьте текст — клиент получит ответ.\n"
                "<i>Сменить клиента: /panel</i>"
            ),
            parse_mode="HTML",
        )

    elif data.startswith("close_"):
        uid = int(data.split("_")[1])
        # Сбрасываем активный чат у всех менеджеров, у кого был этот клиент
        for mid, cid in manager_active_chats.items():
            if cid == uid:
                manager_active_chats[mid] = None
        name = customer_chats.pop(uid, {}).get("name", "Клиент")
        try:
            await ctx.bot.send_message(
                chat_id=uid,
                text="✅ Ваш вопрос закрыт менеджером.\nЕсли появятся вопросы — пишите! 💙",
            )
        except Exception:
            pass
        await query.edit_message_text(
            f"✅ Чат с <b>{name}</b> закрыт.\n\n" + panel_text(),
            reply_markup=panel_main_kb(),
            parse_mode="HTML",
        )


# ══════════════════════════════════════════════════════════════
#   КОМАНДЫ АДМИНИСТРАТОРА (promo)
# ══════════════════════════════════════════════════════════════

async def cmd_promo(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /promo — только для администратора.
    /promo                        — список кодов
    /promo add КОД СКИДКА ЛИМИТ  — добавить/обновить
    /promo del КОД                — удалить
    /promo reset КОД              — обнулить счётчик
    """
    if not is_admin(update):
        # Менеджеру — тихий отказ
        if is_manager(update):
            await update.message.reply_text("⛔ Управление промокодами доступно только администратору.")
        return

    args = ctx.args or []

    if not args:
        if not promo_codes:
            await update.message.reply_text("🏷 Промокодов пока нет.")
            return
        lines = [
            f"• <code>{code}</code> — <b>{info['discount']}%</b> "
            f"| лимит {info['max_uses']} | использовано {promo_usage.get(code,0)} "
            f"| осталось {info['max_uses'] - promo_usage.get(code,0)}"
            for code, info in promo_codes.items()
        ]
        await update.message.reply_text(
            f"🏷 <b>Промокоды ({len(promo_codes)}):</b>\n\n" + "\n".join(lines) + "\n\n"
            "<i>/promo add КОД СКИДКА ЛИМИТ\n"
            "/promo del КОД\n"
            "/promo reset КОД</i>",
            parse_mode="HTML",
        )
        return

    sub = args[0].lower()

    if sub == "add":
        if len(args) < 4:
            await update.message.reply_text(
                "❌ Формат: <code>/promo add КОД СКИДКА ЛИМИТ</code>\n"
                "Пример: <code>/promo add SALE15 15 30</code>",
                parse_mode="HTML",
            )
            return
        code = args[1].upper()
        try:
            discount, max_uses = int(args[2]), int(args[3])
        except ValueError:
            await update.message.reply_text("❌ Скидка и лимит должны быть числами.")
            return
        if not (1 <= discount <= 99):
            await update.message.reply_text("❌ Скидка должна быть от 1 до 99%.")
            return
        if max_uses < 1:
            await update.message.reply_text("❌ Лимит должен быть не менее 1.")
            return
        promo_codes[code] = {'discount': discount, 'max_uses': max_uses}
        if code not in promo_usage:
            promo_usage[code] = 0
        save_promo_usage()
        await update.message.reply_text(
            f"✅ Промокод <code>{code}</code> — скидка <b>{discount}%</b>, лимит <b>{max_uses}</b>.",
            parse_mode="HTML",
        )
        return

    if sub == "del":
        if len(args) < 2:
            await update.message.reply_text("❌ Формат: <code>/promo del КОД</code>", parse_mode="HTML")
            return
        code = args[1].upper()
        if code not in promo_codes:
            await update.message.reply_text(f"❌ Промокод <code>{code}</code> не найден.", parse_mode="HTML")
            return
        promo_codes.pop(code, None)
        promo_usage.pop(code, None)
        promo_user_usage.pop(code, None)
        save_promo_usage()
        save_promo_user_usage()
        await update.message.reply_text(f"🗑 Промокод <code>{code}</code> удалён.", parse_mode="HTML")
        return

    if sub == "reset":
        if len(args) < 2:
            await update.message.reply_text("❌ Формат: <code>/promo reset КОД</code>", parse_mode="HTML")
            return
        code = args[1].upper()
        if code not in promo_codes:
            await update.message.reply_text(f"❌ Промокод <code>{code}</code> не найден.", parse_mode="HTML")
            return
        promo_usage[code] = 0
        promo_user_usage.pop(code, None)
        save_promo_usage()
        save_promo_user_usage()
        await update.message.reply_text(
            f"✅ Промокод <code>{code}</code> сброшен (счётчик и история использований).",
            parse_mode="HTML",
        )
        return

    await update.message.reply_text("❓ Неизвестная команда. Используйте /promo.", parse_mode="HTML")


# ══════════════════════════════════════════════════════════════
#   ТОЧКА ВХОДА
# ══════════════════════════════════════════════════════════════

def main() -> None:
    load_promo_usage()
    load_promo_user_usage()
    load_order_cooldowns()

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start",   cmd_start))
    app.add_handler(CommandHandler("panel",   cmd_panel))
    app.add_handler(CommandHandler("write",   cmd_write))
    app.add_handler(CommandHandler("clients", cmd_clients))
    app.add_handler(CommandHandler("promo",   cmd_promo))

    app.add_handler(MessageHandler(
        filters.Regex("💬 Связаться с менеджером"), btn_contact
    ))
    app.add_handler(MessageHandler(
        filters.StatusUpdate.WEB_APP_DATA, handle_order
    ))
    app.add_handler(CallbackQueryHandler(handle_callback))

    all_manager_ids = list(MANAGER_IDS | {ADMIN_ID})
    # Текст от менеджеров и админа
    app.add_handler(MessageHandler(
        filters.Chat(all_manager_ids) & filters.TEXT & ~filters.COMMAND,
        handle_manager_text,
    ))
    # Текст от клиентов (не менеджеры и не админ)
    app.add_handler(MessageHandler(
        ~filters.Chat(all_manager_ids) & filters.TEXT & ~filters.COMMAND,
        handle_customer_text,
    ))

    logger.info("✅ Akva Store бот запущен | Админ: %s | Менеджеры: %s", ADMIN_ID, MANAGER_IDS)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
