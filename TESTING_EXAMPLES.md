# 🧪 Приклади тестування Rate Limiting і Логування

## 📋 Передумови

Перед тестуванням переконайтесь що:
1. ✅ Запущено PostgreSQL і Redis
2. ✅ Виконано міграцію: `npm run prisma:migrate`
3. ✅ Backend запущено: `npm run dev:backend`
4. ✅ Є admin JWT токен і API токен

---

## 🔐 Крок 1: Отримання JWT токена (Admin)

### Через Swagger UI:
1. Відкрити http://localhost:3000/api/docs
2. POST `/api/auth/login`
3. Body:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
4. Скопіювати `access_token`

### Через curl:
```bash
JWT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.access_token')

echo "JWT Token: $JWT_TOKEN"
```

---

## 🎫 Крок 2: Створення API токена

### Через Swagger UI:
1. Натиснути "Authorize" у Swagger
2. Ввести JWT токен в поле "JWT-auth"
3. POST `/api/tokens`
4. Body:
```json
{
  "projectName": "Test Rate Limiting",
  "description": "Token для тестування rate limiting",
  "scopes": ["billing", "shared"],
  "rateLimit": 5
}
```
5. Скопіювати `token` з відповіді (починається з `tk_`)

### Через curl:
```bash
# Створити токен з лімітом 5 requests/minute
API_TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Test Rate Limiting",
    "description": "Тестовий токен",
    "scopes": ["billing", "shared"],
    "rateLimit": 5
  }' | jq -r '.token')

echo "API Token: $API_TOKEN"
```

---

## ✅ Тест 1: Перевірка глобального логування

### Тест 1.1: Логування простого запиту

```bash
# Зробити запит до /api/shared/example
curl -v http://localhost:3000/api/shared/example \
  -H "Authorization: Bearer $API_TOKEN"

# Очікуваний результат:
# HTTP/1.1 200 OK
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 4
# X-RateLimit-Reset: <timestamp>
```

**Перевірка в БД:**
```bash
npm run prisma:studio
# Відкрити таблицю ApiRequest
# Повинен бути запис з:
# - endpoint: /api/shared/example
# - method: GET
# - statusCode: 200
# - tokenId: <ваш token id>
```

### Тест 1.2: Фільтрація чутливих даних

```bash
# Зробити login запит
curl -X POST http://localhost:3000/api/billing/auth/login \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test_user",
    "password": "my_secret_password"
  }'

# Перевірка в БД:
# ApiRequest -> requestPayload
# password повинен бути: "***REDACTED***"
```

---

## 🚦 Тест 2: Rate Limiting

### Тест 2.1: Нормальне використання

```bash
# Зробити 3 запити (менше ліміту)
for i in {1..3}; do
  echo "Request $i:"
  curl -i http://localhost:3000/api/shared/example \
    -H "Authorization: Bearer $API_TOKEN" 2>&1 | grep -E "(HTTP|X-RateLimit)"
  echo ""
done

# Очікуваний результат:
# Request 1: X-RateLimit-Remaining: 4
# Request 2: X-RateLimit-Remaining: 3
# Request 3: X-RateLimit-Remaining: 2
```

### Тест 2.2: Перевищення ліміту

```bash
# Зробити 10 запитів (перевищує ліміт 5)
for i in {1..10}; do
  echo "--- Request $i ---"
  RESPONSE=$(curl -i -s http://localhost:3000/api/shared/example \
    -H "Authorization: Bearer $API_TOKEN" 2>&1)

  STATUS=$(echo "$RESPONSE" | grep -E "HTTP" | awk '{print $2}')
  REMAINING=$(echo "$RESPONSE" | grep "X-RateLimit-Remaining" | awk '{print $2}' | tr -d '\r')

  echo "Status: $STATUS, Remaining: $REMAINING"

  if [ "$STATUS" = "429" ]; then
    echo "❌ Rate limit exceeded!"
    RETRY_AFTER=$(echo "$RESPONSE" | grep "Retry-After" | awk '{print $2}' | tr -d '\r')
    echo "Retry after: $RETRY_AFTER seconds"
    break
  fi

  sleep 0.5
done
```

**Очікуваний результат:**
```
--- Request 1 ---
Status: 200, Remaining: 4
--- Request 2 ---
Status: 200, Remaining: 3
--- Request 3 ---
Status: 200, Remaining: 2
--- Request 4 ---
Status: 200, Remaining: 1
--- Request 5 ---
Status: 200, Remaining: 0
--- Request 6 ---
❌ Rate limit exceeded!
Status: 429, Remaining: 0
Retry after: 54 seconds
```

**Перевірка в БД:**
```sql
-- В Prisma Studio або psql:
SELECT * FROM rate_limit_events ORDER BY blocked_at DESC LIMIT 1;

-- Повинен бути запис з:
-- requests_count: 5
-- limit_value: 5
-- endpoint: /api/shared/example
```

### Тест 2.3: Відновлення після ліміту

```bash
echo "Досягнуто ліміту. Чекаємо 60 секунд..."
sleep 60

echo "Спробуємо знову:"
curl -i http://localhost:3000/api/shared/example \
  -H "Authorization: Bearer $API_TOKEN" 2>&1 | grep -E "(HTTP|X-RateLimit)"

# Очікуваний результат:
# HTTP/1.1 200 OK
# X-RateLimit-Remaining: 4
```

---

## 📊 Тест 3: Різні ендпойнти

### Тест 3.1: Billing endpoints

```bash
# GET user data
curl -i http://localhost:3000/api/billing/users/140278 \
  -H "Authorization: Bearer $API_TOKEN" | grep "X-RateLimit"

# Перевірка в БД:
# ApiRequest -> endpoint = /api/billing/users/140278
```

### Тест 3.2: Перевірка для різних токенів

```bash
# Створити другий токен з іншим лімітом
API_TOKEN_2=$(curl -s -X POST http://localhost:3000/api/tokens \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "High Limit Token",
    "scopes": ["shared"],
    "rateLimit": 100
  }' | jq -r '.token')

# Зробити запит з TOKEN_2
curl -i http://localhost:3000/api/shared/example \
  -H "Authorization: Bearer $API_TOKEN_2" | grep "X-RateLimit-Limit"

# Очікуваний результат:
# X-RateLimit-Limit: 100  (а не 5!)
```

---

## 🔍 Тест 4: Аналітика та метрики

### Тест 4.1: Перегляд логів через Prisma Studio

```bash
npm run prisma:studio
```

**Таблиці для перевірки:**

1. **api_requests** - всі логи запитів
   - Перевірити чи є записи
   - Перевірити чи маскуються чутливі дані
   - Перевірити responseTime

2. **rate_limit_events** - події перевищення ліміту
   - Перевірити чи є записи після тесту 2.2
   - Перевірити requests_count = limit_value

3. **api_tokens** - токени
   - Перевірити lastUsedAt (має оновлюватись)

### Тест 4.2: Analytics API

```bash
# Dashboard stats
curl http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

# Top endpoints
curl http://localhost:3000/api/analytics/top-endpoints \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

# Token stats
TOKEN_ID="<your-token-id>"
curl http://localhost:3000/api/tokens/$TOKEN_ID/stats \
  -H "Authorization: Bearer $JWT_TOKEN" | jq
```

---

## 🧩 Тест 5: Edge Cases

### Тест 5.1: Запити без API токена

```bash
# Запит без Authorization header
curl -i http://localhost:3000/api/shared/example

# Очікуваний результат:
# HTTP/1.1 401 Unauthorized
# Не повинно бути X-RateLimit headers
```

### Тест 5.2: Невалідний токен

```bash
curl -i http://localhost:3000/api/shared/example \
  -H "Authorization: Bearer invalid_token_123"

# Очікуваний результат:
# HTTP/1.1 401 Unauthorized
```

### Тест 5.3: Expired токен

```bash
# Створити токен з expiresAt в минулому (через БД)
# Або через API:
EXPIRED_TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Expired Token",
    "scopes": ["shared"],
    "expiresAt": "2020-01-01T00:00:00.000Z"
  }' | jq -r '.token')

curl -i http://localhost:3000/api/shared/example \
  -H "Authorization: Bearer $EXPIRED_TOKEN"

# Очікуваний результат:
# HTTP/1.1 401 Unauthorized
```

### Тест 5.4: Deactivated токен

```bash
# Деактивувати токен
curl -X PATCH http://localhost:3000/api/tokens/$TOKEN_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Спробувати використати
curl -i http://localhost:3000/api/shared/example \
  -H "Authorization: Bearer $API_TOKEN"

# Очікуваний результат:
# HTTP/1.1 401 Unauthorized
```

---

## 📈 Тест 6: Performance

### Тест 6.1: Concurrent requests

```bash
# 10 одночасних запитів
seq 1 10 | xargs -n1 -P10 sh -c '
  curl -s http://localhost:3000/api/shared/example \
    -H "Authorization: Bearer '"$API_TOKEN"'" \
    -w "Status: %{http_code}\n" -o /dev/null
'

# Результат:
# 5x Status: 200
# 5x Status: 429
```

### Тест 6.2: Response time

```bash
# Вимірювання затримки від rate limiting
time curl -s http://localhost:3000/api/shared/example \
  -H "Authorization: Bearer $API_TOKEN" \
  -o /dev/null

# Rate limiting не повинен додавати >10ms затримки
```

---

## 🔧 Troubleshooting

### Проблема: Rate limit не працює

**Перевірка 1: Redis працює?**
```bash
redis-cli ping
# Очікуваний результат: PONG
```

**Перевірка 2: RateLimitGuard підключений?**
```bash
# Перевірити в логах backend:
npm run docker:logs backend | grep RateLimit
```

**Перевірка 3: CommonModule імпортований?**
```bash
# Перевірити app.module.ts:16-17
cat packages/backend/src/app.module.ts | grep CommonModule
```

### Проблема: Логи не з'являються в БД

**Перевірка 1: ApiLoggingInterceptor підключений глобально?**
```bash
cat packages/backend/src/app.module.ts | grep ApiLoggingInterceptor
# Має бути в providers з APP_INTERCEPTOR
```

**Перевірка 2: PostgreSQL працює?**
```bash
npm run prisma:studio
# Якщо відкривається - БД працює
```

**Перевірка 3: Міграція виконана?**
```bash
cd packages/backend
npx prisma migrate status
```

---

## 📝 Чек-лист тестування

Перед завершенням тестування переконайтесь:

- [ ] Логування працює для `/api/billing/*`
- [ ] Логування працює для `/api/shared/*`
- [ ] Чутливі дані маскуються в логах
- [ ] Rate limiting блокує після перевищення ліміту
- [ ] HTTP headers (X-RateLimit-*) присутні
- [ ] RateLimitEvent записується в БД
- [ ] Rate limit скидається після 60 секунд
- [ ] Різні токени мають різні ліміти
- [ ] Analytics API показує статистику
- [ ] Невалідні/expired токени відхиляються

---

## 🎉 Успішне тестування!

Якщо всі тести пройшли успішно:
✅ Логування працює глобально
✅ Rate limiting налаштований правильно
✅ Метрики збираються

**Наступний крок:** Додати Audit Log для токенів (ФАЗА 4)
