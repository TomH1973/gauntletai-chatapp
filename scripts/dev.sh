#!/bin/sh
set -e

# Function to show usage
show_usage() {
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start development environment"
    echo "  stop      - Stop development environment"
    echo "  restart   - Restart development environment"
    echo "  clean     - Clean development environment (removes volumes)"
    echo "  logs      - Show logs from all services"
    echo "  migrate   - Run database migrations"
    echo "  seed      - Seed the database"
    echo "  studio    - Start Prisma Studio"
    echo "  shell     - Open shell in app container"
    echo "  test      - Run tests"
}

# Check if command is provided
if [ -z "$1" ]; then
    show_usage
    exit 1
fi

# Execute command
case "$1" in
    "start")
        docker compose up --build -d
        ;;
    "stop")
        docker compose down
        ;;
    "restart")
        docker compose down
        docker compose up --build -d
        ;;
    "clean")
        docker compose down -v
        ;;
    "logs")
        docker compose logs -f
        ;;
    "migrate")
        docker compose exec app npx prisma migrate dev
        ;;
    "seed")
        docker compose exec app npx prisma db seed
        ;;
    "studio")
        docker compose exec app npx prisma studio
        ;;
    "shell")
        docker compose exec app sh
        ;;
    "test")
        docker compose exec app npm test
        ;;
    *)
        echo "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac 