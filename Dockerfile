# Frontend build
FROM node:20-alpine AS webbuilder
WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Backend build
FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache gcc musl-dev sqlite-dev git
ENV CGO_ENABLED=1

COPY server/go.mod server/go.sum ./server/
WORKDIR /app/server
RUN go mod download

WORKDIR /app
COPY . .

# Frontend artefacts live in server/static due to the custom Vite outDir
RUN rm -rf /app/server/static && mkdir -p /app/server/static
COPY --from=webbuilder /src/server/static/ /app/server/static/

WORKDIR /app/server
RUN go build -o /app/app main.go

# Runtime
FROM alpine:3.19
WORKDIR /app
RUN apk add --no-cache sqlite-libs ca-certificates p7zip zip && \
    mkdir -p /data

COPY --from=builder /app/app /app/app
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/app/app", "--db", "/data/app.db"]
