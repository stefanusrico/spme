#!/bin/sh

sleep 15

cd /var/www/html

while [ true ]
do
  php artisan schedule:run >> /dev/stdout 2>&1

  sleep 30
done
