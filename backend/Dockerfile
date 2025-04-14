FROM php:8.2-fpm
WORKDIR /var/www/html
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    libssl-dev \
    libcurl4-openssl-dev \
    pkg-config \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev
# Install ekstensi PHP
RUN docker-php-ext-install zip
# Install GD extension
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd
# Install MongoDB extension melalui PECL dan enable
RUN pecl install mongodb \
    && docker-php-ext-enable mongodb
# Install Composer
COPY composer.json composer.lock ./
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-scripts --no-autoloader
COPY . .
RUN composer dump-autoload --optimize
RUN php artisan key:generate
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0"]