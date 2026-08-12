#!/usr/bin/env python3
"""
Telegram-бот магазина Akva Store
Запуск: python bot.py
"""

import asyncio
import base64
import hashlib
import hmac
import html
import json
import logging
import os
import time
import urllib.parse
from datetime import datetime
from pathlib import Path

import urllib.request
import urllib.error

from aiohttp import web

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
BOT_API_URL     = os.getenv("BOT_API_URL", "").rstrip("/")

# ── Роли ──────────────────────────────────────────────────────
# ADMIN_ID  — управляет промокодами, настройками бота (/promo)
# MANAGER_IDS — могут общаться с клиентами (/panel /write /clients)
# Админ автоматически является менеджером.
# Чтобы добавить менеджера: вставь его Telegram user_id в MANAGER_IDS.
ADMIN_IDS: set[int]   = {878878846, 1947509265}   # ← добавляй сюда ID админов
MANAGER_IDS: set[int] = {7555460392, 7883720545}  # ← добавляй сюда ID менеджеров

# ── Антиспам ──────────────────────────────────────────────────
ORDER_COOLDOWN    = 5 * 60   # секунд между заказами одного пользователя
MAX_QTY_PER_ITEM  = 50       # максимум единиц одного варианта
MAX_ITEMS_ORDER   = 20       # максимум разных позиций в заказе
MAX_PAYLOAD_BYTES = 8_192    # максимальный размер payload от webapp

# ── Защита промокодов ─────────────────────────────────────────
MAX_PROMO_FAILS   = 5     # неудачных попыток до блокировки
PROMO_FAIL_WINDOW = 3600  # секунд (1 час) — окно подсчёта попыток

# ── Защита от абуза клиентами ─────────────────────────────────
MSG_RATE_LIMIT   = 5     # сообщений за MSG_RATE_WINDOW секунд
MSG_RATE_WINDOW  = 60    # секунд
MAX_MSG_LEN      = 1000  # максимальная длина сообщения клиента
MAX_CUSTOMERS    = 500   # максимум записей в customer_chats

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

# Полный список товаров (синхронизируется с products.json)
PRODUCTS_DATA: list = []

# Очередь смены фото: {admin_id: [{'id': 5, 'name': 'УБИВАШКА'}, ...]}
pending_image_uploads: dict[int, list] = {}

# In-app чат: {customer_id: [{'role','text','ts','name'}]}
chat_messages: dict[int, list] = {}
# Typing state: {customer_id: {'manager_until': float, 'customer_until': float}}
typing_state: dict[int, dict] = {}

# Глобальный объект приложения PTB (для доступа из API-хендлеров)
_bot_app = None

# Администраторы в режиме создания поста: {user_id}
admin_post_state: set[int] = set()

# {user_id: {name, username, unread, last_msg, last_time}}
customer_chats: dict[int, dict] = {}

# Время последнего заказа: {user_id: datetime}
last_order_time: dict[int, datetime] = {}

# Runtime промокоды (стартуют из PROMO_CODES_DEFAULT, меняются через /promo)
promo_codes:      dict[str, dict] = dict(PROMO_CODES_DEFAULT)
promo_usage:      dict[str, int]  = {}
promo_user_usage: dict[str, list] = {}   # {код: [user_id, ...]}
promo_fail_log:   dict[int, list] = {}   # {user_id: [timestamp, ...]}

# Счётчики сообщений клиентов: {user_id: [timestamp, ...]}
msg_rate: dict[int, list] = {}


# ══════════════════════════════════════════════════════════════
#   ФАЙЛЫ ПЕРСИСТЕНТНОСТИ
# ══════════════════════════════════════════════════════════════

_BASE                = Path(__file__).parent
PROMO_USAGE_FILE     = _BASE / "promo_usage.json"
PROMO_USER_FILE      = _BASE / "promo_user_usage.json"
ORDER_COOLDOWNS_FILE = _BASE / "order_cooldowns.json"
AVAILABILITY_FILE    = _BASE / "webapp" / "availability.json"
CUSTOMER_CHATS_FILE  = _BASE / "customer_chats.json"
SUPPORT_USERS_FILE   = _BASE / "support_users.json"
PRODUCTS_FILE        = _BASE / "webapp" / "products.json"
CATEGORIES_FILE      = _BASE / "webapp" / "categories.json"
GITHUB_PRODUCTS_PATH = "webapp/products.json"
GITHUB_CATS_PATH     = "webapp/categories.json"
CHAT_MESSAGES_FILE   = _BASE / "chat_messages.json"


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

def load_products() -> None:
    """Загружает products.json и обновляет PRODUCTS_CATALOG и PRODUCTS_DATA."""
    global PRODUCTS_DATA
    if PRODUCTS_FILE.exists():
        try:
            data = json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
            PRODUCTS_DATA = data
            PRODUCTS_CATALOG.clear()
            for p in data:
                pid = int(p["id"])
                PRODUCTS_CATALOG[pid] = {
                    "name":  str(p["name"]),
                    "price": int(p["price"]),
                }
            logger.info("products.json загружен: %d товаров", len(data))
        except Exception as e:
            logger.warning("products.json: %s", e)

def save_products_local(data: list) -> None:
    try:
        PRODUCTS_FILE.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as e:
        logger.warning("save products: %s", e)

def push_products_github(data: list) -> bool:
    if not GITHUB_TOKEN:
        return False
    try:
        api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_PRODUCTS_PATH}"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        }
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            sha = json.loads(resp.read()).get("sha", "")
        content_b64 = base64.b64encode(
            json.dumps(data, ensure_ascii=False, indent=2).encode()
        ).decode()
        payload = json.dumps({
            "message": "Update products via bot",
            "content": content_b64,
            "sha": sha,
        }).encode()
        req = urllib.request.Request(api_url, data=payload, headers=headers, method="PUT")
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        logger.warning("GitHub products API error: %s", e)
        return False

def save_categories_local(data: list) -> None:
    try:
        CATEGORIES_FILE.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as e:
        logger.warning("save categories: %s", e)

def push_categories_github(data: list) -> bool:
    if not GITHUB_TOKEN:
        return False
    try:
        api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_CATS_PATH}"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        }
        sha = ""
        try:
            req = urllib.request.Request(api_url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                sha = json.loads(resp.read()).get("sha", "")
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
        payload_d: dict = {
            "message": "Update categories via bot",
            "content": base64.b64encode(
                json.dumps(data, ensure_ascii=False, indent=2).encode()
            ).decode(),
        }
        if sha:
            payload_d["sha"] = sha
        req = urllib.request.Request(api_url, data=json.dumps(payload_d).encode(), headers=headers, method="PUT")
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        logger.warning("GitHub categories API error: %s", e)
        return False

def push_image_github(img_bytes: bytes, path: str) -> bool:
    """Загружает изображение в репозиторий через GitHub API."""
    if not GITHUB_TOKEN:
        return False
    try:
        api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        }
        sha = ""
        try:
            req = urllib.request.Request(api_url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                sha = json.loads(resp.read()).get("sha", "")
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
        payload_dict: dict = {
            "message": f"Update product image via bot ({path})",
            "content": base64.b64encode(img_bytes).decode(),
        }
        if sha:
            payload_dict["sha"] = sha
        req = urllib.request.Request(
            api_url, data=json.dumps(payload_dict).encode(), headers=headers, method="PUT"
        )
        with urllib.request.urlopen(req) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        logger.warning("GitHub image API error: %s", e)
        return False


def load_customer_chats() -> None:
    if CUSTOMER_CHATS_FILE.exists():
        try:
            data = json.loads(CUSTOMER_CHATS_FILE.read_text(encoding="utf-8"))
            customer_chats.update({int(k): v for k, v in data.items()})
        except Exception as e:
            logger.warning("customer_chats.json: %s", e)

def save_customer_chats() -> None:
    try:
        CUSTOMER_CHATS_FILE.write_text(
            json.dumps({str(k): v for k, v in customer_chats.items()},
                       ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logger.warning("save customer_chats: %s", e)

def load_support_users() -> None:
    if SUPPORT_USERS_FILE.exists():
        try:
            data = json.loads(SUPPORT_USERS_FILE.read_text(encoding="utf-8"))
            support_users.update(int(u) for u in data)
        except Exception as e:
            logger.warning("support_users.json: %s", e)

def save_support_users() -> None:
    try:
        SUPPORT_USERS_FILE.write_text(
            json.dumps(list(support_users), ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception as e:
        logger.warning("save support_users: %s", e)

def load_chat_messages() -> None:
    if CHAT_MESSAGES_FILE.exists():
        try:
            data = json.loads(CHAT_MESSAGES_FILE.read_text(encoding="utf-8"))
            for uid_str, msgs in data.items():
                chat_messages[int(uid_str)] = msgs
        except Exception as e:
            logger.warning("chat_messages.json: %s", e)

def save_chat_messages() -> None:
    try:
        CHAT_MESSAGES_FILE.write_text(
            json.dumps({str(k): v[-200:] for k, v in chat_messages.items()},
                       ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        logger.warning("save chat_messages: %s", e)

def add_chat_message(customer_id: int, role: str, text: str, name: str = '') -> dict:
    msg = {'role': role, 'text': text, 'ts': time.time(), 'name': name}
    chat_messages.setdefault(customer_id, []).append(msg)
    if len(chat_messages[customer_id]) > 200:
        chat_messages[customer_id] = chat_messages[customer_id][-200:]
    save_chat_messages()
    return msg

def verify_init_data(raw: str) -> dict | None:
    """Проверяет Telegram WebApp initData. Возвращает user dict или None."""
    try:
        if not raw:
            return None
        params = dict(urllib.parse.parse_qsl(raw, keep_blank_values=True))
        recv_hash = params.pop('hash', '')
        if not recv_hash:
            return None
        check_str = '\n'.join(f'{k}={v}' for k, v in sorted(params.items()))
        secret    = hmac.new(b'WebAppData', BOT_TOKEN.encode(), hashlib.sha256).digest()
        computed  = hmac.new(secret, check_str.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed, recv_hash):
            return None
        return json.loads(params.get('user', '{}'))
    except Exception as e:
        logger.warning("verify_init_data: %s", e)
        return None

def push_config_github() -> bool:
    """Публикует webapp/config.json с API URL в GitHub Pages."""
    if not GITHUB_TOKEN or not BOT_API_URL:
        return False
    try:
        path    = "webapp/config.json"
        api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        }
        sha = ""
        try:
            req = urllib.request.Request(api_url, headers=headers)
            with urllib.request.urlopen(req) as resp:
                sha = json.loads(resp.read()).get("sha", "")
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
        config_bytes = json.dumps({"api_url": BOT_API_URL}, ensure_ascii=False).encode()
        payload: dict = {
            "message": "Update chat API config",
            "content": base64.b64encode(config_bytes).decode(),
        }
        if sha:
            payload["sha"] = sha
        req = urllib.request.Request(api_url, data=json.dumps(payload).encode(), headers=headers, method="PUT")
        with urllib.request.urlopen(req) as resp:
            ok = resp.status in (200, 201)
        if ok:
            logger.info("config.json → GitHub ✓  api_url=%s", BOT_API_URL)
        return ok
    except Exception as e:
        logger.warning("push_config: %s", e)
        return False

def is_msg_rate_limited(user_id: int) -> bool:
    """True если клиент превысил лимит сообщений."""
    now = time.time()
    log = [t for t in msg_rate.get(user_id, []) if now - t < MSG_RATE_WINDOW]
    if len(log) >= MSG_RATE_LIMIT:
        msg_rate[user_id] = log
        return True
    log.append(now)
    msg_rate[user_id] = log
    return False


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
    return update.effective_user.id in ADMIN_IDS

def is_manager(update: Update) -> bool:
    """Менеджер или администратор (общение с клиентами, продажи)."""
    uid = update.effective_user.id
    return uid in MANAGER_IDS or uid in ADMIN_IDS


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
    for mid in MANAGER_IDS | ADMIN_IDS:
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
            [KeyboardButton("💬 Написать менеджеру", web_app=WebAppInfo(url=WEBAPP_URL + "?open=chat"))],
        ],
        resize_keyboard=True,
        input_field_placeholder="Открой магазин или напиши нам...",
    )


# ══════════════════════════════════════════════════════════════
#   ВСПОМОГАЛКИ
# ══════════════════════════════════════════════════════════════

def now_str() -> str:
    return datetime.now().strftime("%H:%M")


# ══════════════════════════════════════════════════════════════
#   HTTP API (aiohttp) — IN-APP CHAT
# ══════════════════════════════════════════════════════════════

@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == 'OPTIONS':
        return web.Response(headers={
            'Access-Control-Allow-Origin':  '*',
            'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        })
    response = await handler(request)
    response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Init-Data'
    return response

async def _handle_options(r: web.Request) -> web.Response:
    return web.Response(headers={
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Init-Data',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    })

async def api_poll(request: web.Request) -> web.Response:
    user = verify_init_data(request.headers.get('X-Init-Data', ''))
    if not user:
        return web.json_response({'error': 'Unauthorized'}, status=401)

    uid    = int(user.get('id', 0))
    is_mgr = uid in MANAGER_IDS or uid in ADMIN_IDS

    if is_mgr:
        cid_str = request.rel_url.query.get('customer_id', '')
        if not cid_str:
            return web.json_response({'error': 'customer_id required'}, status=400)
        customer_id = int(cid_str)
    else:
        customer_id = uid

    since = float(request.rel_url.query.get('since', '0'))
    msgs  = [m for m in chat_messages.get(customer_id, []) if m['ts'] > since]

    now     = time.time()
    t_state = typing_state.get(customer_id, {})
    return web.json_response({
        'messages':       msgs,
        'manager_typing': t_state.get('manager_until', 0) > now,
        'customer_typing': t_state.get('customer_until', 0) > now,
        'ts':             now,
    })

async def api_send(request: web.Request) -> web.Response:
    user = verify_init_data(request.headers.get('X-Init-Data', ''))
    if not user:
        return web.json_response({'error': 'Unauthorized'}, status=401)

    uid    = int(user.get('id', 0))
    is_mgr = uid in MANAGER_IDS or uid in ADMIN_IDS

    try:
        body = await request.json()
    except Exception:
        return web.json_response({'error': 'Invalid JSON'}, status=400)

    text = str(body.get('text', '')).strip()[:MAX_MSG_LEN]
    if not text:
        return web.json_response({'error': 'Empty text'}, status=400)

    if is_mgr:
        customer_id = int(body.get('customer_id', 0))
        if not customer_id or customer_id not in customer_chats:
            return web.json_response({'error': 'customer_id required'}, status=400)
        name = 'Администратор Akva Store' if uid in ADMIN_IDS else 'Менеджер Akva Store'
        msg  = add_chat_message(customer_id, 'manager', text, name)
        if _bot_app:
            chat_kb = InlineKeyboardMarkup([[
                InlineKeyboardButton(
                    "💬 Ответить в чате",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}?open=chat"),
                )
            ]])
            try:
                await _bot_app.bot.send_message(
                    chat_id=customer_id,
                    text=f"💬 <b>Вам ответил менеджер Akva Store</b>\n\n{html.escape(text)}\n\n<i>Нажмите кнопку, чтобы написать в ответ</i>",
                    parse_mode="HTML",
                    reply_markup=chat_kb,
                )
            except Exception as e:
                logger.warning("send to customer %s: %s", customer_id, e)
    else:
        customer_id = uid
        if is_msg_rate_limited(uid):
            return web.json_response({'error': 'Rate limited'}, status=429)

        name     = user.get('first_name', 'Клиент')
        uname    = user.get('username', '')
        username = f"@{uname}" if uname else 'нет username'

        if customer_id not in customer_chats and len(customer_chats) < MAX_CUSTOMERS:
            customer_chats[customer_id] = {
                'name': name, 'username': username,
                'unread': 0, 'last_msg': text[:80], 'last_time': now_str(),
            }

        msg = add_chat_message(customer_id, 'customer', text, name)

        if customer_id in customer_chats:
            prev = customer_chats[customer_id].get('unread', 0)
            customer_chats[customer_id].update(
                {'unread': prev + 1, 'last_msg': text[:80], 'last_time': now_str()}
            )
            save_customer_chats()

        if _bot_app:
            safe_name = html.escape(name)
            safe_text = html.escape(text)
            mgr_text  = (
                f"💬 <b>Чат — новое сообщение</b>\n\n"
                f"👤 <a href='tg://user?id={customer_id}'>{safe_name}</a>\n\n"
                f"✉️ {safe_text}"
            )
            reply_kb = InlineKeyboardMarkup([[
                InlineKeyboardButton(
                    f"💬 Ответить {name}",
                    web_app=WebAppInfo(url=f"{WEBAPP_URL}?open=chat&cid={customer_id}"),
                )
            ]])
            for mid in MANAGER_IDS | ADMIN_IDS:
                try:
                    await _bot_app.bot.send_message(chat_id=mid, text=mgr_text, parse_mode="HTML",
                                                    reply_markup=reply_kb)
                except Exception as e:
                    logger.warning("notify mgr %s: %s", mid, e)

    return web.json_response({'ok': True, 'msg': msg})

async def api_typing(request: web.Request) -> web.Response:
    user = verify_init_data(request.headers.get('X-Init-Data', ''))
    if not user:
        return web.json_response({'error': 'Unauthorized'}, status=401)

    uid    = int(user.get('id', 0))
    is_mgr = uid in MANAGER_IDS or uid in ADMIN_IDS

    try:
        body = await request.json()
    except Exception:
        body = {}

    now = time.time()
    if is_mgr:
        customer_id = int(body.get('customer_id', 0))
        if customer_id:
            typing_state.setdefault(customer_id, {})['manager_until'] = now + 4
    else:
        typing_state.setdefault(uid, {})['customer_until'] = now + 4

    return web.json_response({'ok': True})

async def api_rooms(request: web.Request) -> web.Response:
    user = verify_init_data(request.headers.get('X-Init-Data', ''))
    if not user:
        return web.json_response({'error': 'Unauthorized'}, status=401)

    uid = int(user.get('id', 0))
    if uid not in MANAGER_IDS and uid not in ADMIN_IDS:
        return web.json_response({'error': 'Forbidden'}, status=403)

    rooms = [
        {
            'customer_id': cid,
            'name':        info.get('name', 'Клиент'),
            'username':    info.get('username', ''),
            'unread':      info.get('unread', 0),
            'last_msg':    info.get('last_msg', ''),
            'last_time':   info.get('last_time', ''),
        }
        for cid, info in customer_chats.items()
    ]
    rooms.sort(key=lambda r: r['unread'], reverse=True)
    return web.json_response({'rooms': rooms})

async def api_order(request: web.Request) -> web.Response:
    """Приём заказа через HTTP API — клиент остаётся в чате."""
    user = verify_init_data(request.headers.get('X-Init-Data', ''))
    if not user:
        return web.json_response({'error': 'Unauthorized'}, status=401)

    uid = int(user.get('id', 0))
    if uid in MANAGER_IDS or uid in ADMIN_IDS:
        return web.json_response({'error': 'Forbidden'}, status=403)

    # Кулдаун
    now  = datetime.now()
    last = last_order_time.get(uid)
    if last:
        remaining = int(ORDER_COOLDOWN - (now - last).total_seconds())
        if remaining > 0:
            return web.json_response({'error': 'cooldown', 'seconds': remaining}, status=429)

    try:
        data = await request.json()
    except Exception:
        return web.json_response({'error': 'Invalid JSON'}, status=400)

    # Данные из анкеты
    payment      = str(data.get('payment',   '')).strip()[:50]
    delivery     = str(data.get('delivery',  '')).strip()[:50]
    form_name    = str(data.get('form_name', '')).strip()[:80]
    form_phone   = str(data.get('phone',     '')).strip()[:30]
    form_addr    = str(data.get('address',   '')).strip()[:200]
    form_comment = str(data.get('comment',   '')).strip()[:300]

    items_raw = data.get('items', [])
    if not isinstance(items_raw, list) or not items_raw:
        return web.json_response({'error': 'Empty cart'}, status=400)
    if len(items_raw) > MAX_ITEMS_ORDER:
        return web.json_response({'error': 'Too many items'}, status=400)

    validated_items = []
    for raw_item in items_raw:
        if not isinstance(raw_item, dict):
            return web.json_response({'error': 'Invalid item'}, status=400)
        pid     = raw_item.get('product_id')
        variant = raw_item.get('variant', '')
        qty     = raw_item.get('qty', 0)
        if not isinstance(pid, int) or pid not in PRODUCTS_CATALOG:
            return web.json_response({'error': f'Invalid product {pid}'}, status=400)
        if not isinstance(qty, int) or qty < 1 or qty > MAX_QTY_PER_ITEM:
            return web.json_response({'error': 'Invalid qty'}, status=400)
        if not isinstance(variant, str) or not variant.strip() or len(variant) > 100:
            return web.json_response({'error': 'Invalid variant'}, status=400)
        product = PRODUCTS_CATALOG[pid]
        validated_items.append({
            'name':  f"{product['name']} ({variant.strip()})",
            'price': product['price'],
            'qty':   qty,
            'total': product['price'] * qty,
        })

    original_total = sum(it['total'] for it in validated_items)

    # Промокод
    promo_code   = str(data.get('promo_code', '')).upper().strip()[:20]
    discount_pct = 0
    promo_note   = ''
    if promo_code:
        if not is_promo_rate_limited(uid):
            info = promo_codes.get(promo_code)
            if (info
                    and promo_usage.get(promo_code, 0) < info['max_uses']
                    and not user_already_used_promo(uid, promo_code)):
                discount_pct = info['discount']
                promo_usage[promo_code] = promo_usage.get(promo_code, 0) + 1
                record_user_promo(uid, promo_code)
                save_promo_usage()
                promo_note = f"🏷 {promo_code} · -{discount_pct}%"
            else:
                record_promo_failure(uid)

    final_total = round(original_total * (1 - discount_pct / 100))
    last_order_time[uid] = now
    save_order_cooldowns()

    # Сохраняем клиента
    uname     = user.get('username', '')
    username  = f"@{uname}" if uname else 'нет username'
    full_name = user.get('first_name', 'Клиент')
    if user.get('last_name'):
        full_name += ' ' + user['last_name']

    if uid not in customer_chats and len(customer_chats) >= MAX_CUSTOMERS:
        return web.json_response({'error': 'Service unavailable'}, status=503)

    customer_chats[uid] = {
        'name':      full_name,
        'username':  username,
        'unread':    customer_chats.get(uid, {}).get('unread', 0),
        'last_msg':  f'Заказ на {final_total} руб.',
        'last_time': now_str(),
    }
    support_users.add(uid)
    save_support_users()
    save_customer_chats()

    # Системное сообщение в чат
    lines = "\n".join(
        f"• {it['name']} × {it['qty']} шт. = {it['total']} ₽"
        for it in validated_items
    )
    if discount_pct:
        total_line = f"Итого со скидкой {discount_pct}%: {final_total} ₽ (было {original_total} ₽)"
    else:
        total_line = f"Итого: {final_total} ₽"

    form_lines = ''
    if payment:       form_lines += f"\n💳 Оплата: {payment}"
    if delivery:      form_lines += f"\n🚚 Доставка: {delivery}"
    if form_name:     form_lines += f"\n👤 Имя: {form_name}"
    if form_phone:    form_lines += f"\n📞 Телефон: {form_phone}"
    if form_addr:     form_lines += f"\n📍 Адрес: {form_addr}"
    if form_comment:  form_lines += f"\n💬 {form_comment}"

    sys_msg = (
        f"✅ Заказ принят!\n\n"
        f"📦 Состав:\n{lines}\n\n"
        f"{total_line}"
        f"{form_lines if form_lines else chr(10)*2 + '📍 Напишите адрес доставки — менеджер свяжется с вами здесь.'}"
    )
    add_chat_message(uid, 'system', sys_msg, 'Akva Store')

    # Уведомление менеджерам в Telegram
    if _bot_app:
        safe_name = html.escape(full_name)
        safe_uname = html.escape(username)
        lines_html = "\n".join(
            f"  • {html.escape(it['name'])} × {it['qty']} шт. = <b>{it['total']} ₽</b>"
            for it in validated_items
        )
        total_html = (
            f"💰 <b>Итого: {final_total} ₽</b>  <s>({original_total} ₽)</s>"
            if discount_pct else
            f"💰 <b>Итого: {final_total} ₽</b>"
        )
        form_html = ''
        if payment:       form_html += f"\n💳 Оплата: <b>{html.escape(payment)}</b>"
        if delivery:      form_html += f"\n🚚 Доставка: <b>{html.escape(delivery)}</b>"
        if form_name:     form_html += f"\n👤 Имя: {html.escape(form_name)}"
        if form_phone:    form_html += f"\n📞 Телефон: <code>{html.escape(form_phone)}</code>"
        if form_addr:     form_html += f"\n📍 Адрес: {html.escape(form_addr)}"
        if form_comment:  form_html += f"\n💬 {html.escape(form_comment)}"

        order_text = (
            f"🛒 <b>Новый заказ (чат)!</b>\n\n"
            f"👤 <a href='tg://user?id={uid}'>{safe_name}</a>\n"
            f"📱 {safe_uname} | <code>{uid}</code>"
            f"{form_html}\n\n"
            f"📦 <b>Состав:</b>\n{lines_html}\n"
            f"{chr(10) + promo_note if promo_note else ''}\n"
            f"{total_html}\n"
            f"🕐 {now_str()}"
        )
        fname = full_name.split()[0] if full_name else 'клиенту'
        order_reply_kb = InlineKeyboardMarkup([[
            InlineKeyboardButton(
                f"💬 Ответить {fname}",
                web_app=WebAppInfo(url=f"{WEBAPP_URL}?open=chat&cid={uid}"),
            )
        ]])
        for mid in MANAGER_IDS | ADMIN_IDS:
            try:
                await _bot_app.bot.send_message(
                    chat_id=mid, text=order_text, parse_mode="HTML",
                    reply_markup=order_reply_kb,
                )
            except Exception as e:
                logger.warning("order notify mgr %s: %s", mid, e)

    return web.json_response({'ok': True, 'total': final_total,
                              'original_total': original_total, 'discount_pct': discount_pct})

async def api_close_chat(request: web.Request) -> web.Response:
    """Менеджер завершает заказ — убирает чат из активных."""
    user = verify_init_data(request.headers.get('X-Init-Data', ''))
    if not user:
        return web.json_response({'error': 'Unauthorized'}, status=401)
    uid = int(user.get('id', 0))
    if uid not in MANAGER_IDS and uid not in ADMIN_IDS:
        return web.json_response({'error': 'Forbidden'}, status=403)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({'error': 'Invalid JSON'}, status=400)
    customer_id = body.get('customer_id')
    if not isinstance(customer_id, int):
        return web.json_response({'error': 'customer_id required'}, status=400)

    # Финальное сообщение в чат (клиент увидит при следующем открытии)
    add_chat_message(
        customer_id, 'system',
        '✅ Заказ завершён! Спасибо за покупку в Akva Store 🌊\n\nЕсли понадобится снова — мы всегда здесь.',
        'Akva Store',
    )
    # Убираем из активных чатов (список менеджера)
    customer_chats.pop(customer_id, None)
    save_customer_chats()
    # Уведомление клиенту в Telegram
    if _bot_app:
        try:
            await _bot_app.bot.send_message(
                chat_id=customer_id,
                text='✅ <b>Ваш заказ выполнен!</b>\n\nСпасибо за покупку в <b>Akva Store</b> 🌊\n\nЕсли понадобится снова — мы всегда рады!',
                parse_mode='HTML',
            )
        except Exception as e:
            logger.warning('close_chat notify %s: %s', customer_id, e)
    return web.json_response({'ok': True})


def make_api_app() -> web.Application:
    api = web.Application(middlewares=[cors_middleware])
    api.router.add_route('OPTIONS', '/{path_info:.*}', _handle_options)
    api.router.add_get('/api/poll',   api_poll)
    api.router.add_post('/api/send',  api_send)
    api.router.add_post('/api/typing', api_typing)
    api.router.add_get('/api/rooms',  api_rooms)
    api.router.add_post('/api/order',      api_order)
    api.router.add_post('/api/close_chat', api_close_chat)
    api.router.add_get('/health',          lambda r: web.Response(text='ok'))
    return api


# ══════════════════════════════════════════════════════════════
#   КЛИЕНТСКАЯ СТОРОНА
# ══════════════════════════════════════════════════════════════

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if is_manager(update):
        role = "👑 Администратор" if is_admin(update) else "👨‍💼 Менеджер"
        await update.message.reply_text(
            f"{role} Akva Store\n\n"
            "Чат с клиентами — через приложение.\n" +
            ("/promo — управление промокодами" if is_admin(update) else ""),
            parse_mode="HTML",
        )
        return

    await update.message.reply_text(
        f"👋 Привет, <b>{update.effective_user.first_name}</b>!\n\n"
        "Добро пожаловать в <b>Akva Store</b> 🌊\n"
        "Вейп · Жидкости · Расходники · Нефтеюганск\n\n"
        "Нажми <b>«🛍 Магазин»</b> — выбери товар и оформи заказ 💙",
        reply_markup=main_keyboard(),
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

    # ── Обновление категорий (только администраторы) ─────────
    if isinstance(data_peek, dict) and data_peek.get("type") == "categories":
        if not is_admin(update):
            return
        cats_data = data_peek.get("data", [])
        if not isinstance(cats_data, list):
            await update.message.reply_text("❌ Некорректные данные категорий.")
            return
        save_categories_local(cats_data)
        ok_github = push_categories_github(cats_data)
        status = "✅ GitHub обновлён" if ok_github else "⚠️ GitHub не обновлён"
        await update.message.reply_text(
            f"🗂 <b>Категории обновлены!</b>\n\nКатегорий: <b>{len(cats_data)}</b>\n{status}",
            parse_mode="HTML",
        )
        return

    # ── Обновление каталога товаров (менеджеры и администраторы) ─
    if isinstance(data_peek, dict) and data_peek.get("type") == "products":
        if not is_manager(update):
            return
        products_data = data_peek.get("data", [])
        if not isinstance(products_data, list) or not products_data:
            await update.message.reply_text("❌ Некорректные данные товаров.")
            return
        # Перестраиваем каталог и полный список
        global PRODUCTS_DATA
        PRODUCTS_DATA = products_data
        PRODUCTS_CATALOG.clear()
        for p in products_data:
            try:
                pid   = int(p["id"])
                price = int(p["price"])
                if price > 0:
                    PRODUCTS_CATALOG[pid] = {
                        "name":  str(p["name"])[:80],
                        "price": price,
                    }
            except Exception:
                continue
        save_products_local(products_data)
        ok_github = push_products_github(products_data)
        status = "✅ GitHub обновлён" if ok_github else "⚠️ GitHub не обновлён"
        # Обрабатываем запросы на смену фото
        image_updates = data_peek.get("imageUpdates", [])
        if image_updates and isinstance(image_updates, list):
            queue = []
            for pid in image_updates:
                try:
                    pid = int(pid)
                    pname = PRODUCTS_CATALOG.get(pid, {}).get("name", f"Товар #{pid}")
                    queue.append({"id": pid, "name": pname})
                except Exception:
                    continue
            if queue:
                pending_image_uploads[user.id] = queue
                first = queue[0]
                await update.message.reply_text(
                    f"📝 <b>Каталог обновлён!</b>\n\n"
                    f"Товаров: <b>{len(products_data)}</b>\n{status}\n\n"
                    f"📸 Теперь отправьте фото для товара:\n"
                    f"<b>«{html.escape(first['name'])}»</b>",
                    parse_mode="HTML",
                )
                return
        await update.message.reply_text(
            f"📝 <b>Каталог обновлён!</b>\n\n"
            f"Товаров: <b>{len(products_data)}</b>\n{status}",
            parse_mode="HTML",
        )
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

    # ── 2. Кулдаун (сохраняется на диске) ────────────────────
    now  = datetime.now()
    last = last_order_time.get(user.id)
    if last:
        remaining = int(ORDER_COOLDOWN - (now - last).total_seconds())
        if remaining > 0:
            mins, secs = remaining // 60, remaining % 60
            await update.message.reply_text(
                f"⏳ <b>Подождите перед следующим заказом</b>\n\n"
                f"Повторный заказ через <b>{mins} мин. {secs:02d} сек.</b>",
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
            'name':  f"{product['name']} ({html.escape(variant.strip())})",
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

    # ── 7. Сохраняем клиента ──────────────────────────────────
    username = f"@{user.username}" if user.username else "нет username"

    # Ограничение памяти: не накапливаем бесконечный список
    if user.id not in customer_chats and len(customer_chats) >= MAX_CUSTOMERS:
        logger.warning("MAX_CUSTOMERS reached, dropping order from %s", user.id)
        await update.message.reply_text("❌ Сервис временно недоступен. Обратитесь к менеджеру.")
        return

    customer_chats[user.id] = {
        "name":      user.full_name,
        "username":  username,
        "unread":    customer_chats.get(user.id, {}).get("unread", 0),
        "last_msg":  f"Заказ на {final_total} руб.",
        "last_time": now_str(),
    }

    # Открываем чат — клиент сможет отвечать менеджеру прямо здесь
    support_users.add(user.id)
    save_support_users()
    save_customer_chats()

    open_chat_kb = InlineKeyboardMarkup([[
        InlineKeyboardButton("💬 Написать менеджеру", web_app=WebAppInfo(url=f"{WEBAPP_URL}?open=chat"))
    ]])
    await update.message.reply_text(
        f"✅ <b>Заказ принят!</b>\n\n{lines}\n\n{total_msg}",
        parse_mode="HTML",
        reply_markup=open_chat_kb,
    )

    # ── 8. Уведомление ВСЕМ менеджерам ───────────────────────
    safe_name     = html.escape(user.full_name)
    safe_username = html.escape(username)

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
        f"👤 <a href='tg://user?id={user.id}'>{safe_name}</a>\n"
        f"📱 {safe_username} | <code>{user.id}</code>\n\n"
        f"📦 <b>Состав:</b>\n{lines}\n"
        f"{promo_admin}\n"
        f"{total_admin}\n"
        f"🕐 {now_str()}"
    )
    mgr_reply_kb = InlineKeyboardMarkup([[
        InlineKeyboardButton(
            f"💬 Ответить {user.first_name or 'клиенту'}",
            web_app=WebAppInfo(url=f"{WEBAPP_URL}?open=chat&cid={user.id}"),
        )
    ]])
    await notify_managers(ctx, order_text, reply_markup=mgr_reply_kb)




async def handle_admin_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Текст / фото от администратора или менеджера: пост-рассылка или загрузка фото товара."""
    uid = update.effective_user.id
    if uid not in ADMIN_IDS and uid not in MANAGER_IDS:
        return

    # ── Режим создания поста (только администраторы) ──────────
    if uid in ADMIN_IDS and uid in admin_post_state:
        admin_post_state.discard(uid)
        text  = (update.message.caption or update.message.text or '').strip()
        photo = update.message.photo[-1] if update.message.photo else None

        recipients = list(customer_chats.keys())
        if not recipients:
            await update.message.reply_text("📭 Нет получателей (ни один клиент ещё не писал боту).")
            return

        sent = failed = 0
        for cid in recipients:
            try:
                if photo:
                    await ctx.bot.send_photo(
                        chat_id=cid,
                        photo=photo.file_id,
                        caption=f"📢 <b>Akva Store</b>\n\n{html.escape(text)}" if text else "📢 <b>Akva Store</b>",
                        parse_mode="HTML",
                    )
                else:
                    await ctx.bot.send_message(
                        chat_id=cid,
                        text=f"📢 <b>Akva Store</b>\n\n{html.escape(text)}",
                        parse_mode="HTML",
                    )
                sent += 1
            except Exception as e:
                logger.warning("post to %s failed: %s", cid, e)
                failed += 1

        await update.message.reply_text(
            f"✅ Пост разослан!\n\n"
            f"Доставлено: <b>{sent}</b>\n"
            f"Ошибок: <b>{failed}</b>",
            parse_mode="HTML",
        )
        return

    # ── Загрузка фото товара ──────────────────────────────────
    if not update.message.photo:
        return

    queue = pending_image_uploads.get(uid)
    if not queue:
        return

    item         = queue[0]
    product_id   = item["id"]
    product_name = item["name"]

    photo = update.message.photo[-1]
    try:
        file      = await ctx.bot.get_file(photo.file_id)
        img_bytes = await file.download_as_bytearray()
    except Exception as e:
        logger.warning("download photo error: %s", e)
        await update.message.reply_text("❌ Не удалось скачать фото. Попробуйте ещё раз.")
        return

    img_path    = f"product_{product_id}.jpg"
    github_path = f"webapp/images/{img_path}"

    ok = push_image_github(bytes(img_bytes), github_path)
    if not ok:
        await update.message.reply_text("❌ Не удалось загрузить фото в GitHub. Проверьте токен.")
        return

    global PRODUCTS_DATA
    for p in PRODUCTS_DATA:
        if int(p.get("id", 0)) == product_id:
            p["image"] = f"images/{img_path}"
            break
    save_products_local(PRODUCTS_DATA)
    push_products_github(PRODUCTS_DATA)

    queue.pop(0)
    if not queue:
        del pending_image_uploads[uid]

    await update.message.reply_text(
        f"✅ Фото товара <b>{html.escape(product_name)}</b> обновлено!\n"
        "Появится на сайте через ~1 минуту 🌊",
        parse_mode="HTML",
    )

    if queue:
        next_item = queue[0]
        await update.message.reply_text(
            f"📸 Отправьте фото для следующего товара:\n"
            f"<b>«{html.escape(next_item['name'])}»</b>",
            parse_mode="HTML",
        )


async def cmd_post(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """/post — рассылка новостей/поступлений всем клиентам (только администратор)."""
    if not is_admin(update):
        return
    admin_post_state.add(update.effective_user.id)
    await update.message.reply_text(
        "📢 <b>Создать пост</b>\n\n"
        "Отправьте текст (можно с фото).\n"
        "Пост будет разослан всем клиентам, которые взаимодействовали с ботом.",
        parse_mode="HTML",
    )


async def handle_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    """Отвечает на устаревшие инлайн-кнопки старых сообщений."""
    await update.callback_query.answer()


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

async def _run() -> None:
    global _bot_app

    application = Application.builder().token(BOT_TOKEN).build()
    _bot_app = application

    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("promo", cmd_promo))
    application.add_handler(CommandHandler("post",  cmd_post))

    application.add_handler(MessageHandler(
        filters.StatusUpdate.WEB_APP_DATA, handle_order
    ))
    application.add_handler(MessageHandler(
        filters.Chat(list(ADMIN_IDS | MANAGER_IDS))
        & (filters.TEXT | filters.PHOTO)
        & ~filters.COMMAND,
        handle_admin_message,
    ))
    application.add_handler(CallbackQueryHandler(handle_callback))

    logger.info("✅ Akva Store бот запущен | Админы: %s | Менеджеры: %s", ADMIN_IDS, MANAGER_IDS)

    await application.initialize()
    await application.start()
    await application.updater.start_polling(allowed_updates=Update.ALL_TYPES)

    # HTTP API для in-app чата
    port   = int(os.getenv("PORT", 8080))
    api    = make_api_app()
    runner = web.AppRunner(api)
    await runner.setup()
    await web.TCPSite(runner, '0.0.0.0', port).start()
    logger.info("💬 Chat API запущен на порту %d", port)

    # Публикуем config.json на GitHub Pages
    if BOT_API_URL and GITHUB_TOKEN:
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, push_config_github)

    try:
        await asyncio.Event().wait()
    finally:
        await application.updater.stop()
        await application.stop()
        await application.shutdown()
        await runner.cleanup()


def main() -> None:
    load_promo_usage()
    load_promo_user_usage()
    load_order_cooldowns()
    load_products()
    load_customer_chats()
    load_support_users()
    load_chat_messages()
    asyncio.run(_run())


if __name__ == "__main__":
    main()
