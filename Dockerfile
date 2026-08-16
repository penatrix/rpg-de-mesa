# Imagem de produção: um único processo servindo API, WebSocket e o cliente
# compilado na mesma porta. É o que torna a publicação trivial em qualquer
# lugar que rode um contêiner.

FROM node:22-slim AS build
WORKDIR /app

# O código-fonte vem antes do `npm ci` de propósito: o postinstall compila o
# pacote compartilhado e precisa dos fontes já presentes.
COPY . .
RUN npm ci && npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# `better-sqlite3` é nativo, então reaproveitamos o node_modules já compilado
# no estágio anterior em vez de precisar de toolchain na imagem final.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/client/dist ./packages/client/dist

# Monte um volume aqui para as mesas sobreviverem a um redeploy.
ENV RPG_DB_PATH=/app/data/rpg.db
VOLUME /app/data

EXPOSE 8787
CMD ["node", "packages/server/dist/index.js"]
