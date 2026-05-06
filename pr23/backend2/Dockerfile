FROM node:18-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем код приложения
COPY . .

# Документируем порт (само по себе не открывает)
EXPOSE 3000

# Команда для запуска
CMD ["npm", "start"]
