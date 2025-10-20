# 🚀 API Gateway - NestJS + Next.js

Шаблонний проект для API Gateway з управлінням токенами, аналітикою та адмін панеллю.

## 📋 Зміст

- [Архітектура](#архітектура)
- [Технології](#технології)
- [Початок роботи](#початок-роботи)
- [Структура проекту](#структура-проекту)
- [API Документація](#api-документація)
- [Додавання нових endpoints](#додавання-нових-endpoints)

## 🏗 Архітектура

```
┌─────────────────┐
│   Nginx (80)    │ ← Reverse Proxy
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
┌───▼────┐ ┌──▼──────┐
│Backend │ │  Admin  │
│ :3000  │ │  :3001  │
└───┬────┘ └─────────┘
    │
┌───┴──────┬─────────┐
│PostgreSQL│  Redis  │
│  :5432   │  :6379  │
└──────────┴─────────┘
```

## 🛠 Технології

### Backend (NestJS)
- **NestJS** - Node.js framework
- **Prisma** - ORM для PostgreSQL
- **Swagger** - API документація
- **JWT** - Аутентифікація адмінів
- **API Token** - Аутентифікація клієнтів
- **Redis** - Rate limiting
- **PostgreSQL** - База даних

### Frontend (Next.js)
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Стилізація

### DevOps
- **Docker & Docker Compose** - Контейнеризація
- **Nginx** - Reverse proxy

## 🚀 Початок роботи

### 1️⃣ Клонування та налаштування

```bash
# Клонувати репозиторій (якщо є)
git clone <your-repo-url>
cd server_providers

# Створити .env файл з прикладу
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/admin/.env.example packages/admin/.env

# Відредагувати .env файли (встановити паролі та секрети)
```

### 2️⃣ Запуск з Docker (Рекомендовано)

```bash
# Запустити всі сервіси
npm run docker:up

# Або через docker-compose напряму
docker-compose up -d

# Переглянути логи
npm run docker:logs
# або
docker-compose logs -f

# Зупинити сервіси
npm run docker:down
```

### 3️⃣ Запуск локально (для розробки)

```bash
# Встановити залежності
npm install

# Запустити PostgreSQL та Redis через Docker
docker-compose up -d postgres redis

# Згенерувати Prisma Client
npm run prisma:generate

# Запустити міграції
npm run prisma:migrate

# Наповнити БД початковими даними (створить admin користувача)
npm run prisma:seed

# Запустити backend та admin в режимі розробки
npm run dev
```

## 📁 Структура проекту

```
api-gateway/
├── packages/
│   ├── backend/                 # NestJS API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # JWT авторизація
│   │   │   │   ├── tokens/     # CRUD для API токенів
│   │   │   │   ├── analytics/  # Статистика
│   │   │   │   ├── shared-api/ # Твої API endpoints
│   │   │   │   └── database/   # Prisma service
│   │   │   ├── config/         # Конфігурація
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # DB схема
│   │   │   └── seeds/          # Seed файли
│   │   └── package.json
│   │
│   ├── admin/                   # Next.js Admin Panel
│   │   ├── src/
│   │   │   └── app/
│   │   └── package.json
│   │
│   └── shared/                  # Спільні типи
│       ├── src/
│       │   ├── types/
│       │   ├── constants/
│       │   └── utils/
│       └── package.json
│
├── docker/
│   ├── nginx/
│   │   └── nginx.conf
│   └── postgres/
│       └── init.sql
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## 📚 API Документація

### Swagger UI
Після запуску backend, Swagger документація доступна за адресою:
```
http://localhost:3000/api/docs
```

### Основні endpoints

#### 🔐 Аутентифікація (Admin)
```
POST /api/auth/login         # Логін адміна
GET  /api/auth/me            # Інформація про поточного юзера
```

#### 🎫 Управління токенами (потрібен JWT)
```
GET    /api/tokens           # Список всіх токенів
POST   /api/tokens           # Створити новий токен
GET    /api/tokens/:id       # Деталі токена
PATCH  /api/tokens/:id       # Оновити токен
DELETE /api/tokens/:id       # Видалити токен
GET    /api/tokens/:id/stats # Статистика токена
```

#### 📊 Аналітика (потрібен JWT)
```
GET /api/analytics/dashboard        # Dashboard статистика
GET /api/analytics/requests-over-time # Запити по часу
GET /api/analytics/top-endpoints    # Топ endpoints
GET /api/analytics/errors           # Статистика помилок
```

#### 🌐 Shared API (потрібен API Token)
```
GET /api/shared/example     # Приклад endpoint
```

## ➕ Додавання нових endpoints

### 1. Створити новий контролер

```bash
cd packages/backend
nest generate controller modules/my-feature
```

### 2. Додати методи до контролера

```typescript
// packages/backend/src/modules/my-feature/my-feature.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';

@ApiTags('my-feature')
@ApiBearerAuth('API-token')
@Controller('my-feature')
@UseGuards(ApiTokenGuard)  // Використовувати API token auth
export class MyFeatureController {
  @Get('example')
  getExample() {
    return { message: 'Hello from my feature!' };
  }
}
```

### 3. Створити сервіс (якщо потрібна логіка)

```bash
nest generate service modules/my-feature
```

### 4. Додати модуль до AppModule

```typescript
// packages/backend/src/app.module.ts
import { MyFeatureModule } from './modules/my-feature/my-feature.module';

@Module({
  imports: [
    // ...інші модулі
    MyFeatureModule,
  ],
})
export class AppModule {}
```

### 5. Протестувати через Swagger

Відкрити `http://localhost:3000/api/docs` та знайти нові endpoints.

## 🔑 Початкові дані

Після запуску seed скрипту (`npm run prisma:seed`), створюється:

### Admin користувач:
- **Email:** admin@example.com
- **Password:** admin123

### Demo API Token:
Токен буде виведений в консолі після seed. Збережи його для тестування!

## 🐳 Docker команди

```bash
# Запустити все
npm run docker:up

# Перебудувати та запустити
npm run docker:rebuild

# Переглянути логи
npm run docker:logs

# Зупинити все
npm run docker:down

# Запустити з pgAdmin (для управління БД)
docker-compose --profile tools up -d
# pgAdmin: http://localhost:5050
```

## 🛠 Корисні команди

```bash
# Розробка
npm run dev                    # Запустити backend + admin
npm run dev:backend            # Тільки backend
npm run dev:admin              # Тільки admin

# Build
npm run build                  # Build всього
npm run build:backend          # Build backend
npm run build:admin            # Build admin

# Prisma
npm run prisma:migrate         # Створити міграцію
npm run prisma:generate        # Згенерувати Prisma Client
npm run prisma:studio          # Відкрити Prisma Studio (GUI для БД)
npm run prisma:seed            # Наповнити БД

# Docker
npm run docker:up              # Запустити контейнери
npm run docker:down            # Зупинити контейнери
npm run docker:logs            # Логи контейнерів
npm run docker:rebuild         # Перебудувати та запустити
```

## 🔒 Безпека

1. **Змінити JWT_SECRET** в `.env` на продакшені
2. **Встановити сильні паролі** для PostgreSQL
3. **Налаштувати CORS** відповідно до твого домену
4. **Використовувати HTTPS** на продакшені
5. **Регулярно оновлювати** залежності

## 📝 TODO

- [ ] Імплементувати повноцінну Admin панель (React компоненти)
- [ ] Додати email сповіщення
- [ ] Додати rate limiting middleware
- [ ] Додати логування в файли
- [ ] Налаштувати CI/CD
- [ ] Додати тести (unit, e2e)

## 📄 Ліцензія

MIT

## 👨‍💻 Підтримка

Якщо виникли питання або знайшли баг - створи Issue!

---

**Готово до розробки! 🎉** Тепер можеш почати додавати свої API endpoints!
