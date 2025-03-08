// Cargar actividad reciente (reseñas)
// Función mejorada para cargar actividad reciente
async function loadRecentActivity() {
    console.log("Iniciando carga de actividad reciente...");
    const activityContainer = document.getElementById('recent-activity');
    
    if (!activityContainer) {
        console.warn("Contenedor de actividad reciente no encontrado");
        return;
    }
    
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
        
        // Si no hay reseñas, mantener las de ejemplo
        if (allReviews.length === 0) {
            console.log('No se encontraron reseñas, usando las de ejemplo.');
            
            // Generamos reseñas de ejemplo, así cuando no hay reseñas aún en la base de datos, 
            // siempre mostramos algo en la UI
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
                const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                // Calificación en estrellas
                const starsHtml = Utils.generateStarsHtml(review.calificacion);
                
                // Asegurar que la imagen tenga una ruta válida
                let imageSrc = review.business_image;
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
                            <div class="review-date">${fechaFormateada}</div>
                        </div>
                    </div>
                    <div class="review-content">
                        <h4 class="review-business">${review.business_name}</h4>
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
        
        // Mostrar mensaje de error en lugar de mantener reseñas de ejemplo
        activityContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 20px;">
                <p>Error al cargar reseñas recientes. Inténtalo de nuevo más tarde.</p>
                <button onclick="loadRecentActivity()" class="btn-retry" style="padding: 8px 16px; margin-top: 10px; background-color: #ff3d00; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Cargar negocios destacados
async function loadFeaturedBusinesses() {
    const featuredContainer = document.getElementById('featured-businesses');
    
    if (!featuredContainer) return;
    
    try {
        // Intentar cargar desde la API
        const timestamp = new Date().getTime();
        const response = await Utils.fetchWithRetry(`http://localhost:3001/api/negocios/publicos?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const businesses = await response.json();
        
        if (!businesses || businesses.length === 0) {
            throw new Error('No se encontraron negocios');
        }
        
        // Limpiar el contenedor
        featuredContainer.innerHTML = '';
        
        // Mostrar los primeros 4 negocios
        const featuredBusinesses = businesses.slice(0, 4);
        
        featuredBusinesses.forEach(business => {
            // Verificar la imagen
            let imageSrc = business.imagen || business.foto_portada || '/img/default-restaurant.jpg';
            
            // Asegurar que la imagen tenga una ruta válida
            if (!imageSrc.startsWith('/') && !imageSrc.startsWith('http')) {
                imageSrc = '/' + imageSrc;
            }
            
            // Categoría del negocio
            const categoria = business.categoria || 'Restaurante';
            
            // Calificación en estrellas
            const rating = business.promedio_calificaciones || 4.5;
            
            // Ubicación
            const ubicacion = business.colonia || business.municipio || 'Centro';
            
            // Generar estrellas HTML
            const starsHtml = Utils.generateStarsHtml(rating);
            
            // Crear el HTML para el negocio
            const businessCard = document.createElement('div');
            businessCard.className = 'business-card';
            businessCard.onclick = function() {
                window.location.href = `/Restaurantes/detalle-negocio.html?id=${business.id_Negocios}`;
            };
            
            businessCard.innerHTML = `
                <div class="business-image">
                    <img src="${imageSrc}" alt="${business.nombre}" onerror="this.src='/img/default-restaurant.jpg'">
                </div>
                <div class="business-info">
                    <h3 class="business-name">${business.nombre}</h3>
                    <div class="business-rating">
                        <div class="stars">
                            ${starsHtml}
                        </div>
                        <span class="review-count">${business.total_resenas || 0} reseñas</span>
                    </div>
                    <div class="business-details">
                        <i class="fas fa-utensils"></i> ${categoria}
                    </div>
                    <div class="business-details">
                        <i class="fas fa-map-marker-alt"></i> ${ubicacion}
                    </div>
                </div>
            `;
            
            featuredContainer.appendChild(businessCard);
        });
        
    } catch (error) {
        console.error('Error al cargar negocios destacados:', error);
        // Mantener los negocios de ejemplo que ya están en el HTML
    }
}

// Configurar búsqueda
function setupSearch() {
    const searchBtn = document.getElementById('search-btn');
    const businessSearch = document.getElementById('business-search');
    const locationSearch = document.getElementById('location-search');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            performSearch();
        });
    }
    
    // Buscar al presionar Enter
    if (businessSearch) {
        businessSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (locationSearch) {
        locationSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// Realizar búsqueda
function performSearch() {
    const businessSearch = document.getElementById('business-search');
    const locationSearch = document.getElementById('location-search');
    
    if (!businessSearch) return;
    
    const searchTerm = businessSearch.value.trim();
    const location = locationSearch ? locationSearch.value.trim() : '';
    
    console.log(`Buscando: "${searchTerm}" en "${location}"`);
    
    if (searchTerm === '') {
        alert('Por favor ingresa un término de búsqueda');
        return;
    }
    
    // Construir URL para la búsqueda
    let searchUrl = `/Restaurantes/restaurantes.html?q=${encodeURIComponent(searchTerm)}`;
    
    if (location) {
        searchUrl += `&location=${encodeURIComponent(location)}`;
    }
    
    // Redirigir a la página de resultados
    window.location.href = searchUrl;
}

// JavaScript para la página principal estilo Yelp
document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando página principal...");
    
    // Verificar estado de login
    checkUserLogin();
    
    // Configurar búsqueda
    setupSearch();
    
    // Cargar negocios destacados
    loadFeaturedBusinesses();
    
    // Cargar actividad reciente
    loadRecentActivity();
    
    // Event listener para cerrar sesión
    const cerrarSesionLink = document.getElementById('cerrar-sesion');
    if (cerrarSesionLink) {
        cerrarSesionLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }
});

// Función para verificar si el usuario está logueado
function checkUserLogin() {
    console.log("Verificando estado de login...");
    const token = localStorage.getItem('token');
    const loginLink = document.querySelector('a[href="/Login/Login.html"]');
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

// Hacer accesibles globalmente las funciones necesarias
window.loadRecentActivity = loadRecentActivity;
window.loadFeaturedBusinesses = loadFeaturedBusinesses;
window.performSearch = performSearch;