SCRIPT=$1
psql -h localhost -p 5442 -U postgres -d nitpickr -f $SCRIPT
