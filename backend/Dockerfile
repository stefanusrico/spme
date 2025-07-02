FROM php:8.2-fpm

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip libssl-dev libcurl4-openssl-dev \
    pkg-config libfreetype6-dev libjpeg62-turbo-dev libpng-dev git

RUN docker-php-ext-install zip pdo pdo_mysql

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd

RUN pecl install mongodb-1.15.0 && docker-php-ext-enable mongodb

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --ignore-platform-req=ext-mongodb

COPY . .

RUN chmod -R 775 storage && chmod -R 775 public/storage || true \
    && chown -R www-data:www-data storage public

RUN composer dump-autoload --optimize

RUN php artisan storage:link || true

RUN php artisan key:generate --force

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0"]
