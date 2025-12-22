# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN apk add --no-cache gcc musl-dev sqlite-dev
ENV CGO_ENABLED=1
RUN go get golang.org/x/crypto/ssh
RUN go build -o app server/main.go

# Final stage
FROM alpine:3.19
WORKDIR /app
RUN apk add --no-cache sqlite-libs
COPY --from=builder /app/app /app/app
COPY --from=builder /app/static /app/static
EXPOSE 8080
ENTRYPOINT ["/app/app"]
