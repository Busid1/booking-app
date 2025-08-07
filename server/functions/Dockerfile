# Usa una imagen oficial de Node.js
FROM node:22

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios
COPY package*.json ./
COPY tsconfig.json ./
COPY .env .env

# Copia el esquema de Prisma y otros archivos necesarios
COPY prisma ./prisma
COPY src ./src

# Instala dependencias
RUN npm install

# Genera el cliente Prisma
RUN npx prisma generate

# Compila TypeScript
RUN npm run build

# Expone el puerto 8080 requerido por Cloud Run
EXPOSE 8080

# Define la variable de entorno PORT para Cloud Run
ENV PORT=8080

# Comando de arranque
CMD ["node", "lib/main.js"]
