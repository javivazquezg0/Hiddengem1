// Archivo: utils.js
// Verificar si Utils ya existe para evitar redeclaraciones
if (typeof window.Utils === 'undefined') {
    /**
     * Funciones de utilidad para mejorar la experiencia de usuario y el manejo de errores
     */
    
    // Objeto global para almacenar utilidades
    const Utils = {
        // Manejo de errores de red
        isNetworkError(error) {
            return (
                error instanceof TypeError && 
                (error.message === 'Failed to fetch' || 
                 error.message === 'NetworkError when attempting to fetch resource' ||
                 error.message.includes('Network request failed'))
            );
        },
        
        // Función para reintentar peticiones fallidas
        async fetchWithRetry(url, options = {}, maxRetries = 3) {
            let retries = 0;
            
            while (retries < maxRetries) {
                try {
                    return await fetch(url, options);
                } catch (error) {
                    retries++;
                    console.warn(`Intento ${retries}/${maxRetries} fallido para ${url}:`, error);
                    
                    if (retries >= maxRetries || !this.isNetworkError(error)) {
                        throw error;
                    }
                    
                    // Esperar antes de reintentar (backoff exponencial)
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
                }
            }
        },
        
        // Formatear URL de imagen para asegurar validez
        formatImageUrl(url) {
            if (!url || url === '') {
                return '/img/default-restaurant.jpg';
            }
            
            if (!url.startsWith('/') && !url.startsWith('http')) {
                return '/' + url;
            }
            
            return url;
        },
        
        // Mostrar mensajes de notificación temporales
        showNotification(message, type = 'info', duration = 3000) {
            // Verificar que document.body exista antes de continuar
            if (!document || !document.body) {
                console.warn('No se puede mostrar notificación: document.body no está disponible');
                return null;
            }
            
            // Buscar si ya existe una notificación
            let notificationContainer = document.getElementById('notification-container');
            
            // Crear el contenedor si no existe
            if (!notificationContainer) {
                notificationContainer = document.createElement('div');
                notificationContainer.id = 'notification-container';
                notificationContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    max-width: 300px;
                `;
                document.body.appendChild(notificationContainer);
            }
            
            // Crear la notificación
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.style.cssText = `
                background-color: ${type === 'error' ? '#ff3d00' : type === 'success' ? '#4CAF50' : '#2196F3'};
                color: white;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            notification.textContent = message;
            
            // Añadir botón de cierre
            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                float: right;
                margin-left: 8px;
                cursor: pointer;
                font-weight: bold;
            `;
            closeBtn.addEventListener('click', () => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
            
            notification.insertBefore(closeBtn, notification.firstChild);
            
            // Añadir al contenedor
            notificationContainer.appendChild(notification);
            
            // Mostrar con animación
            setTimeout(() => {
                notification.style.opacity = '1';
            }, 10);
            
            // Eliminar después del tiempo especificado
            if (duration > 0) {
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        notification.remove();
                    }, 300);
                }, duration);
            }
            
            return notification;
        },
        
        // Función para obtener parámetros de URL
        getQueryParam(param) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(param);
        },
        
        // Actualizar URL con parámetros sin recargar la página
        updateURLParameter(key, value) {
            const url = new URL(window.location.href);
            if (value === null || value === '') {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
            window.history.replaceState({}, document.title, url.toString());
        },
        
        // Generar HTML de estrellas para calificación
        generateStarsHtml(rating) {
            // Asegurar que sea un número
            rating = parseFloat(rating) || 0;
            
            // Limitar entre 0 y 5
            rating = Math.max(0, Math.min(5, rating));
            
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            
            let starsHtml = '';
            
            // Estrellas llenas
            for (let i = 0; i < fullStars; i++) {
                starsHtml += '<i class="fas fa-star"></i>';
            }
            
            // Media estrella
            if (hasHalfStar) {
                starsHtml += '<i class="fas fa-star-half-alt"></i>';
            }
            
            // Estrellas vacías
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
            for (let i = 0; i < emptyStars; i++) {
                starsHtml += '<i class="far fa-star"></i>';
            }
            
            return starsHtml;
        },
        
        // Formatear fecha para mostrar
        formatDate(dateString) {
            try {
                const fecha = new Date(dateString);
                return fecha.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                console.error('Error al formatear fecha:', e);
                return dateString;
            }
        },
        
        // Crear elemento de carga
        createLoadingElement(mensaje = 'Cargando...') {
            const loadingElement = document.createElement('div');
            loadingElement.className = 'loading-container';
            loadingElement.innerHTML = `
                <div class="loading-spinner"></div>
                <p>${mensaje}</p>
            `;
            loadingElement.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                text-align: center;
            `;
            
            const spinner = loadingElement.querySelector('.loading-spinner');
            spinner.style.cssText = `
                border: 4px solid #f3f3f3;
                border-top: 4px solid #ff3d00;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin-bottom: 10px;
            `;
            
            // Añadir animación si no existe
            if (!document.getElementById('loading-spinner-keyframes')) {
                const style = document.createElement('style');
                style.id = 'loading-spinner-keyframes';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                // Solo agregar si document.head existe
                if (document && document.head) {
                    document.head.appendChild(style);
                }
            }
            
            return loadingElement;
        },
        
        // Manejar errores en la carga de imágenes
        handleImageError(img, fallbackSrc = '/img/default-restaurant.jpg') {
            img.onerror = function() {
                this.src = fallbackSrc;
                this.onerror = null; // Evitar bucles infinitos
            };
            return img;
        },
        
        // Validar formularios
        validateForm(formData, rules) {
            const errors = {};
            
            for (const field in rules) {
                if (rules[field].required && (!formData[field] || formData[field].trim() === '')) {
                    errors[field] = rules[field].requiredMessage || 'Este campo es obligatorio';
                    continue;
                }
                
                if (rules[field].minLength && formData[field].length < rules[field].minLength) {
                    errors[field] = rules[field].minLengthMessage || 
                        `Este campo debe tener al menos ${rules[field].minLength} caracteres`;
                    continue;
                }
                
                if (rules[field].pattern && !rules[field].pattern.test(formData[field])) {
                    errors[field] = rules[field].patternMessage || 'Formato no válido';
                    continue;
                }
                
                if (rules[field].validate && typeof rules[field].validate === 'function') {
                    const validateResult = rules[field].validate(formData[field], formData);
                    if (validateResult !== true) {
                        errors[field] = validateResult;
                    }
                }
            }
            
            return {
                isValid: Object.keys(errors).length === 0,
                errors
            };
        },
        
        // Gestión de caché básica para respuestas de API
        cache: {
            data: {},
            
            // Establecer un límite de tiempo para la caché (en ms)
            defaultTTL: 5 * 60 * 1000, // 5 minutos
            
            // Guardar en caché
            set(key, value, ttl = this.defaultTTL) {
                this.data[key] = {
                    value,
                    expires: Date.now() + ttl
                };
            },
            
            // Obtener de caché
            get(key) {
                const cached = this.data[key];
                
                // Verificar si existe y no ha expirado
                if (cached && cached.expires > Date.now()) {
                    return cached.value;
                }
                
                // Si ha expirado, eliminar
                if (cached) {
                    delete this.data[key];
                }
                
                return null;
            },
            
            // Limpiar caché
            clear() {
                this.data = {};
            },
            
            // Eliminar entradas expiradas
            cleanup() {
                const now = Date.now();
                for (const key in this.data) {
                    if (this.data[key].expires <= now) {
                        delete this.data[key];
                    }
                }
            }
        }
    };

    // Asegurar que Utils solo se inicializa una vez
    window.Utils = Utils;

    // Agregar eventos solo cuando documento esté disponible
    function configureEvents() {
        // Limpiar caché periódicamente
        setInterval(() => {
            Utils.cache.cleanup();
        }, 60000); // Cada minuto
        
        // Interceptar errores no manejados
        window.addEventListener('error', function(event) {
            console.error('Error no manejado:', event.error);
            
            // No mostrar notificación para errores de recursos (imágenes, scripts, etc.)
            if (event.filename && document && document.body) {
                Utils.showNotification('Ha ocurrido un error inesperado. Por favor, intenta nuevamente.', 'error');
            }
        });
        
        // Interceptar promesas rechazadas no manejadas
        window.addEventListener('unhandledrejection', function(event) {
            console.error('Promesa rechazada no manejada:', event.reason);
            
            // Solo mostrar para errores de red
            if (Utils.isNetworkError(event.reason) && document && document.body) {
                Utils.showNotification('Error de conexión. Comprueba tu conexión a internet.', 'error');
            }
        });
    }

    // Verificar si el documento ya está cargado
    if (document.readyState === "complete" || document.readyState === "interactive") {
        configureEvents();
    } else {
        // Esperar a que el documento esté completamente cargado
        document.addEventListener("DOMContentLoaded", configureEvents);
    }

    console.log("Utils inicializado correctamente");
} else {
    console.log("Utils ya está definido, se evitó la redeclaración");
}