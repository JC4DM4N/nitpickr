docker exec -t $(docker ps -q --filter ancestor=postgres:15) pg_dump -U postgres -d nitpickr > backups/backup_$(date +%Y%m%d_%H%M%S).sql
