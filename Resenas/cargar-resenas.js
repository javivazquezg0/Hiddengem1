// Script para cargar reseñas reales en la página de inicio
document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando carga de reseñas...");
    
    // Verificar estado de login
    checkUserLogin();
    
    // Cargar actividad reciente (reseñas reales)
    loadRecentActivity();
});

// Función para verificar si el usuario está logueado
function checkUserLogin() {
    console.log("Verificando estado de login...");
    const token = localStorage.getItem('token');
    const loginLink = document.querySelector('#login');
    const cerrarSesionLink = document.getElementById('cerrar-sesion');
    
    if (token) {
        console.log("Usuario logueado encontrado");
        if (loginLink) loginLink.style.display = 'none';
        if (cerrarSesionLink) cerrarSesionLink.style.display = 'block';
    } else {
        console.log("Usuario no logueado");
        if (loginLink) loginLink.style.display = 'block';
        if (cerrarSesionLink) cerrarSesionLink.style.display = 'none';
    }
}

// Función mejorada para cargar actividad reciente
async function loadRecentActivity() {
    console.log("Iniciando carga de actividad reciente...");
    const activityContainer = document.getElementById('recent-activity');
    
    if (!activityContainer) {
        console.warn("Contenedor de actividad reciente no encontrado");
        return;
    }
    
    // Mostrar indicador de carga
    activityContainer.innerHTML = `
        <div class="loading-container" style="display: flex; justify-content: center; align-items: center; padding: 30px;">
            <div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #ff3d00; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    try {
        // Primero intentamos cargar desde la API
        const timestamp = new Date().getTime();
        let allReviews = [];
        
        // Primero necesitamos cargar los negocios
        console.log("Cargando negocios para obtener reseñas...");
        const businessesResponse = await fetch(`http://localhost:3001/api/negocios/publicos?t=${timestamp}`);
        
        if (!businessesResponse.ok) {
            throw new Error(`Error al cargar negocios: ${businessesResponse.status} ${businessesResponse.statusText}`);
        }
        
        const businesses = await businessesResponse.json();
        
        if (!businesses || businesses.length === 0) {
            throw new Error('No se encontraron negocios');
        }
        
        console.log(`Se encontraron ${businesses.length} negocios, obteniendo reseñas...`);
        
        // Para no hacer demasiadas peticiones, solo tomamos los primeros 5 negocios
        const businessesToFetch = businesses.slice(0, 5);
        
        // Usamos Promise.all para hacer las peticiones en paralelo
        const reviewsPromises = businessesToFetch.map(business => {
            return fetch(`http://localhost:3001/api/negocios/${business.id_Negocios}/resenas?t=${timestamp}`)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`No se pudieron obtener reseñas para el negocio ${business.id_Negocios}`);
                        return [];
                    }
                    return response.json();
                })
                .then(reviews => {
                    // Añadir información del negocio a cada reseña
                    return reviews.map(review => ({
                        ...review,
                        business_name: business.nombre,
                        business_id: business.id_Negocios,
                        business_image: business.imagen || business.foto_portada || '/img/default-restaurant.jpg'
                    }));
                })
                .catch(error => {
                    console.error(`Error al cargar reseñas para negocio ${business.id_Negocios}:`, error);
                    return [];
                });
        });
        
        // Esperar a que todas las peticiones terminen
        const reviewsResults = await Promise.all(reviewsPromises);
        
        // Combinar todas las reseñas
        reviewsResults.forEach(reviews => {
            allReviews = [...allReviews, ...reviews];
        });
        
        console.log(`Se obtuvieron ${allReviews.length} reseñas en total`);
        
        // Si no hay reseñas, crearemos reseñas de ejemplo
        if (allReviews.length === 0) {
            console.log('No se encontraron reseñas, usando reseñas de ejemplo.');
            
            // Generar reseñas de ejemplo con fechas realistas
            allReviews = [
                {
                    id_Resenas: 1,
                    id_Negocios: 1,
                    nombre_usuario: "Carlos Rodríguez",
                    fecha_creacion: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 horas atrás
                    calificacion: 5,
                    comentario: "¡Las mejores pizzas que he probado! La masa es perfecta y los ingredientes son frescos. Definitivamente volveré.",
                    business_name: "Pizzeria la Yemi",
                    business_id: 1,
                    business_image: "/img/PIZZA.jpg"
                },
                {
                    id_Resenas: 2,
                    id_Negocios: 2,
                    nombre_usuario: "Ana Gómez",
                    fecha_creacion: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 día atrás
                    calificacion: 4,
                    comentario: "Tacos muy buenos y auténticos. El servicio es rápido y amable. Solo les falta mejorar un poco la salsa.",
                    business_name: "Taqueria Javi",
                    business_id: 2,
                    business_image: "/img/TACOS.jpg"
                },
                {
                    id_Resenas: 3,
                    id_Negocios: 3,
                    nombre_usuario: "Miguel Ángel",
                    fecha_creacion: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 días atrás
                    calificacion: 5,
                    comentario: "Excelente café de especialidad. El ambiente es tranquilo y perfecto para trabajar. Los pasteles también son deliciosos.",
                    business_name: "Café Nuevo",
                    business_id: 3,
                    business_image: "/img/cafe.jpg"
                }
            ];
        }
        
        // Ordenar por fecha (las más recientes primero)
        allReviews.sort((a, b) => {
            const dateA = new Date(a.fecha_creacion || a.fecha_resena);
            const dateB = new Date(b.fecha_creacion || b.fecha_resena);
            return dateB - dateA;
        });
        
        // Tomar solo las 3 más recientes
        const recentReviews = allReviews.slice(0, 3);
        
        // Limpiar el contenedor
        activityContainer.innerHTML = '';
        
        // Generar el HTML para cada reseña
        recentReviews.forEach(review => {
            try {
                // Formatear fecha
                const fecha = new Date(review.fecha_creacion || review.fecha_resena);
                
                // Formatear la fecha en un formato relativo "hace X tiempo"
                const tiempoRelativo = getRelativeTime(fecha);
                
                // Calificación en estrellas
                const starsHtml = generateStarsHtml(review.calificacion);
                
                // Asegurar que la imagen tenga una ruta válida
                let imageSrc = review.business_image || '/img/default-restaurant.jpg';
                if (imageSrc && !imageSrc.startsWith('/') && !imageSrc.startsWith('http')) {
                    imageSrc = '/' + imageSrc;
                }
                
                // Crear el HTML para la reseña
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
                
                reviewCard.innerHTML = `
                    <div class="review-header">
                        <div class="reviewer-avatar">
                            <img src="/img/user-avatar.png" alt="Usuario" onerror="this.src='/img/user-avatar.png'">
                        </div>
                        <div class="reviewer-info">
                            <h4 class="reviewer-name">${review.nombre_usuario || 'Usuario anónimo'}</h4>
                            <div class="review-date">${tiempoRelativo}</div>
                        </div>
                    </div>
                    <div class="review-content">
                        <h4 class="review-business">
                            <a href="/Restaurantes/detalle-negocio.html?id=${review.business_id}" style="color: inherit; text-decoration: none;">
                                ${review.business_name}
                            </a>
                        </h4>
                        <div class="review-stars">
                            ${starsHtml}
                        </div>
                        <p class="review-text">${review.comentario}</p>
                    </div>
                    <div class="review-actions">
                        <div class="review-action">
                            <i class="far fa-thumbs-up"></i> Útil
                        </div>
                        <div class="review-action">
                            <i class="far fa-comment"></i> Comentar
                        </div>
                    </div>
                `;
                
                activityContainer.appendChild(reviewCard);
            } catch (formatError) {
                console.error('Error al formatear reseña:', formatError);
            }
        });
        
    } catch (error) {
        console.error('Error al cargar actividad reciente:', error);
        
        // Mostrar mensaje de error y botón para reintentar
        activityContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 20px;">
                <p>Error al cargar reseñas recientes. ${error.message}</p>
                <button onclick="loadRecentActivity()" class="btn-retry" style="padding: 8px 16px; margin-top: 10px; background-color: #ff3d00; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Función para generar estrellas basadas en la calificación
function generateStarsHtml(rating) {
    // Asegurar que rating sea un número
    rating = parseFloat(rating) || 0;
    
    // Limitar rating entre 0 y 5
    rating = Math.max(0, Math.min(5, rating));
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    let starsHTML = '';

    // Estrellas llenas
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }

    // Media estrella
    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }

    // Estrellas vacías
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star"></i>';
    }

    return starsHTML;
}

// Función para formatear fechas en formato relativo (hace X tiempo)
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
        return "hace unos segundos";
    } else if (diffMinutes < 60) {
        return `hace ${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}`;
    } else if (diffHours < 24) {
        return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    } else if (diffDays < 30) {
        return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
    } else if (diffMonths < 12) {
        return `hace ${diffMonths} ${diffMonths === 1 ? "mes" : "meses"}`;
    } else {
        return `hace ${diffYears} ${diffYears === 1 ? "año" : "años"}`;
    }
}

// Hacer accesibles globalmente las funciones necesarias
window.loadRecentActivity = loadRecentActivity;
window.getRelativeTime = getRelativeTime;
window.generateStarsHtml = generateStarsHtml;
window.checkUserLogin = checkUserLogin;