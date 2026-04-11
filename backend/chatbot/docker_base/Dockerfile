FROM node:20-slim

WORKDIR /app

COPY package.json .
RUN npm install --legacy-peer-deps

COPY . .

# Create placeholder for mounted content
RUN mkdir -p src/content && touch src/content/App.jsx

EXPOSE 5173

CMD ["npm", "run", "dev"]
