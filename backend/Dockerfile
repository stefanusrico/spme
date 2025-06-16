FROM php:8.2-fpm

WORKDIR /var/www/html

# Install dependencies
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    libssl-dev \
    libcurl4-openssl-dev \
    pkg-config \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    git

# Install PHP extensions
RUN docker-php-ext-install zip pdo pdo_mysql

# Install GD extension
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd

# Install specific MongoDB extension version
RUN pecl install mongodb-1.15.0 \
    && docker-php-ext-enable mongodb

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy composer files first for better caching
COPY composer.json composer.lock ./

# Install dependencies with platform ignore as fallback
RUN composer install --no-scripts --no-autoloader --ignore-platform-req=ext-mongodb

# Copy application files
COPY . .

# Set permissions on storage directories
RUN chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/public/storage || true \
    && chown -R www-data:www-data /var/www/html/storage \
    && chown -R www-data:www-data /var/www/html/public

# Generate the autoload files
RUN composer dump-autoload --optimize

# Set storage link
RUN php artisan storage:link || true

# Generate application key
RUN php artisan key:generate --force

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0"]