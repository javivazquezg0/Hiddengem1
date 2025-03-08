// Variables globales
let allBusinesses = [];
let selectedRating = 0;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando página de reseñas...");
    
    // Verificar estado de login
    checkUserLogin();
    
    // Cargar negocios
    loadBusinesses();
    
    // Configurar búsqueda
    setupSearch();
    
    // Configurar modal de reseñas
    setupReviewModal();
    
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

// Cargar negocios con datos actualizados
async function loadBusinesses() {
    console.log("Iniciando carga de negocios para reseñas...");
    const businessContainer = document.querySelector('.business-grid');
    
    if (!businessContainer) {
        console.warn("No se encontró el contenedor de negocios (.business-grid)");
        return;
    }
    
    // Mostrar un indicador de carga
    businessContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Cargando restaurantes...</div>';
    
    try {
        // Intentar cargar datos del servidor usando la API /api/negocios/publicos que tiene los datos actualizados
        const timestamp = new Date().getTime(); // Evitar caché
        console.log(`Solicitando negocios: http://localhost:3001/api/negocios/publicos?t=${timestamp}`);
        
        const response = await Utils.fetchWithRetry(`http://localhost:3001/api/negocios/publicos?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log(`Respuesta obtenida con estado: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        const businesses = await response.json();
        
        if (!businesses || businesses.length === 0) {
            throw new Error('No se encontraron negocios');
        }
        
        console.log(`Negocios cargados exitosamente: ${businesses.length}`);
        
        // Una vez que tenemos los negocios, vamos a cargar las reseñas para cada uno
        // para tener el conteo actualizado
        const businessesWithReviews = await loadBusinessReviews(businesses);
        
        allBusinesses = businessesWithReviews;
        
        // Mostrar los negocios
        displayBusinesses(businessesWithReviews);
        
    } catch (error) {
        console.error('Error al cargar negocios:', error);
        
        // Mostrar mensaje de error y botón para reintentar
        businessContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 20px;">
                <p>Error al cargar restaurantes: ${error.message}</p>
                <button onclick="loadBusinesses()" class="btn-retry" style="padding: 8px 16px; margin-top: 10px; background-color: #ff3d00; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <h3>Mientras tanto, puedes ver estos ejemplos:</h3>
            </div>
        `;
        
        // Usar datos de ejemplo como fallback
        const sampleBusinesses = [
            {
                id_Negocios: 1,
                nombre: "Pizzeria la Yemi",
                categoria: "Pizzería",
                total_resenas: 28,
                promedio_calificaciones: 5,
                imagen: "/img/PIZZA.jpg"
            },
            {
                id_Negocios: 2,
                nombre: "Taqueria Javi",
                categoria: "Tacos",
                total_resenas: 45,
                promedio_calificaciones: 4,
                imagen: "/img/TACOS.jpg"
            },
            {
                id_Negocios: 3,
                nombre: "Café Nuevo",
                categoria: "Café",
                total_resenas: 36,
                promedio_calificaciones: 5,
                imagen: "/img/cafe.jpg"
            },
            {
                id_Negocios: 4,
                nombre: "El Pozolero",
                categoria: "Comida Mexicana",
                total_resenas: 22,
                promedio_calificaciones: 4,
                imagen: "/img/posole.jpg"
            }
        ];
        
        console.log("Usando datos de ejemplo como fallback");
        allBusinesses = sampleBusinesses;
        
        // Añadir los ejemplos después del mensaje de error
        const examplesContainer = document.createElement('div');
        examplesContainer.className = 'business-grid';
        examplesContainer.style.marginTop = '20px';
        businessContainer.appendChild(examplesContainer);
        
        // Mostrar los negocios de ejemplo
        displayBusinessesInContainer(sampleBusinesses, examplesContainer);
    }
}

// Función nueva para cargar reseñas para cada negocio
async function loadBusinessReviews(businesses) {
    console.log("Cargando reseñas para cada negocio...");
    
    const updatedBusinesses = [...businesses];
    
    // Para cada negocio, obtener sus reseñas para tener el conteo actualizado
    for (let i = 0; i < updatedBusinesses.length; i++) {
        const business = updatedBusinesses[i];
        
        try {
            const timestamp = new Date().getTime();
            const reviewsUrl = `http://localhost:3001/api/negocios/${business.id_Negocios}/resenas?t=${timestamp}`;
            console.log(`Consultando reseñas para negocio ${business.id_Negocios}: ${reviewsUrl}`);
            
            const response = await Utils.fetchWithRetry(reviewsUrl);
            
            if (response.ok) {
                const reviews = await response.json();
                console.log(`Reseñas obtenidas para negocio ${business.id_Negocios}: ${reviews.length}`);
                
                // Actualizar el total de reseñas y promedio de calificaciones
                updatedBusinesses[i].total_resenas = reviews.length;
                
                if (reviews.length > 0) {
                    // Calcular el nuevo promedio de calificaciones
                    const totalRating = reviews.reduce((sum, review) => sum + review.calificacion, 0);
                    updatedBusinesses[i].promedio_calificaciones = totalRating / reviews.length;
                }
            } else {
                console.warn(`No se pudieron cargar las reseñas para el negocio ${business.id_Negocios}`);
            }
        } catch (error) {
            console.error(`Error al cargar reseñas para negocio ${business.id_Negocios}:`, error);
        }
    }
    
    return updatedBusinesses;
}

// Función auxiliar para mostrar negocios en un contenedor específico
function displayBusinessesInContainer(businesses, container) {
    if (!container) {
        console.error("Contenedor no válido para mostrar negocios");
        return;
    }
    
    // Limpiar el contenedor si es necesario
    if (container.classList.contains('business-grid')) {
        container.innerHTML = '';
    }
    
    // Generar HTML para cada negocio
    businesses.forEach(business => {
        // Verificar la imagen
        let imageSrc = business.imagen || business.foto_portada || '/img/default-restaurant.jpg';
        
        // Asegurar que la imagen tenga una ruta válida
        if (!imageSrc.startsWith('/') && !imageSrc.startsWith('http')) {
            imageSrc = '/' + imageSrc;
        }
        
        // Obtener la calificación del negocio
        const businessRating = business.promedio_calificaciones || 0;
        
        // Generar HTML de estrellas
        const starsHtml = generateStarsHtml(businessRating);
        
        // Categoría del negocio
        const categoria = business.categoria || 'Restaurante';
        
        // Icono según categoría
        let categoriaIcon = 'utensils';
        if (categoria.toLowerCase().includes('café') || categoria.toLowerCase().includes('cafe')) {
            categoriaIcon = 'coffee';
        } else if (categoria.toLowerCase().includes('taco')) {
            categoriaIcon = 'hamburger';
        } else if (categoria.toLowerCase().includes('pizza')) {
            categoriaIcon = 'pizza-slice';
        }
        
        // Crear el elemento del negocio
        const businessCard = document.createElement('div');
        businessCard.className = 'business-card';
        businessCard.dataset.id = business.id_Negocios;
        
        // Formato del número de reseñas (asegurarse de que sea un número)
        const reviewCount = typeof business.total_resenas === 'number' ? business.total_resenas : 0;
        
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
                    <span class="review-count">${reviewCount} reseñas</span>
                </div>
                <div class="business-category">
                    <i class="fas fa-${categoriaIcon}"></i> ${categoria}
                </div>
                <a href="#" class="write-review-btn" onclick="openReviewModal(${business.id_Negocios}, '${business.nombre.replace(/'/g, "\\'")}'); return false;">Escribir una reseña</a>
            </div>
        `;
        
        container.appendChild(businessCard);
    });
}

// Versión actualizada para usar el nuevo displayBusinessesInContainer
function displayBusinesses(businesses) {
    const businessContainer = document.querySelector('.business-grid');
    
    if (!businessContainer) {
        console.error("No se encontró el contenedor de negocios (.business-grid)");
        return;
    }
    
    displayBusinessesInContainer(businesses, businessContainer);
}

// Función auxiliar para manejar errores de red
function isNetworkError(error) {
    return (
        error instanceof TypeError && 
        (error.message === 'Failed to fetch' || 
         error.message === 'NetworkError when attempting to fetch resource' ||
         error.message.includes('Network request failed'))
    );
}

// Generar HTML de estrellas para calificación
function generateStarsHtml(rating) {
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
}

// Configurar modal de reseñas
function setupReviewModal() {
    console.log("Configurando modal de reseñas...");
    
    const modal = document.getElementById('review-modal');
    if (!modal) {
        console.error("No se encontró el modal de reseñas (#review-modal)");
        return;
    }
    
    const closeModalBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('#cancel-review');
    const submitBtn = modal.querySelector('#submit-review');
    const starButtons = modal.querySelectorAll('.stars-select i');
    
    // Cerrar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Cerrar al hacer clic fuera del modal
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Configurar selección de estrellas
    starButtons.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            setRating(value);
        });
        
        // Efecto hover
        star.addEventListener('mouseover', function() {
            const value = parseInt(this.dataset.value);
            highlightStars(value);
        });
        
        star.addEventListener('mouseout', function() {
            highlightStars(selectedRating);
        });
    });
    
    // Enviar reseña
    if (submitBtn) {
        submitBtn.addEventListener('click', submitReview);
    }
}

// Abrir modal para escribir una reseña
function openReviewModal(businessId, businessName) {
    console.log(`Abriendo modal para: ${businessName} (ID: ${businessId})`);
    
    // Verificar si el usuario está logueado
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Debes iniciar sesión para escribir una reseña');
        window.location.href = '/Login/Login.html';
        return;
    }
    
    const modal = document.getElementById('review-modal');
    const businessIdInput = document.getElementById('business-id');
    const businessNameElement = document.getElementById('review-business-name');
    
    if (!modal || !businessIdInput || !businessNameElement) {
        console.error("No se encontraron elementos del modal");
        return;
    }
    
    // Establecer el ID y nombre del negocio
    businessIdInput.value = businessId;
    businessNameElement.textContent = businessName;
    
    // Resetear calificación
    setRating(0);
    
    // Limpiar el texto de la reseña
    const reviewText = document.getElementById('review-text');
    if (reviewText) {
        reviewText.value = '';
    }
    
    // Mostrar el modal
    modal.style.display = 'flex';
}

// Versión mejorada de la función para enviar reseñas
async function submitReview() {
    console.log("Iniciando envío de reseña...");
    
    // Verificar si el usuario está logueado
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Debes iniciar sesión para escribir una reseña');
        
        // Guardar la información de que el usuario quería escribir una reseña
        localStorage.setItem('pendingReviewAction', 'true');
        
        // Almacenar el ID del negocio para regresar a esta página
        const businessId = document.getElementById('business-id').value;
        if (businessId) {
            localStorage.setItem('pendingReviewBusinessId', businessId);
        }
        
        window.location.href = '/Login/Login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    // Obtener los datos del formulario
    const businessId = document.getElementById('business-id').value;
    const rating = document.getElementById('rating-value').value;
    const reviewText = document.getElementById('review-text').value.trim();
    
    // Validar los datos
    if (!businessId) {
        alert('Error: No se encontró el ID del negocio');
        return;
    }
    
    if (rating < 1 || rating > 5) {
        alert('Por favor selecciona una calificación de 1 a 5 estrellas');
        return;
    }
    
    if (!reviewText) {
        alert('Por favor escribe tu opinión sobre el negocio');
        return;
    }
    
    // Deshabilitar el botón de envío para evitar múltiples envíos
    const submitBtn = document.getElementById('submit-review');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Publicar Reseña';
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
    }
    
    try {
        console.log(`Enviando reseña para negocio ${businessId}, calificación: ${rating}`);
        
        // Construir el objeto de datos para enviar
        const reviewData = {
            calificacion: parseInt(rating),
            comentario: reviewText
        };
        
        console.log("Datos de la reseña:", reviewData);
        
        // Enviar la reseña a la API
        const response = await Utils.fetchWithRetry(`http://localhost:3001/api/negocios/${businessId}/resenas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });
        
        console.log("Respuesta del servidor:", response.status, response.statusText);
        
        // Verificar si la respuesta tiene contenido JSON
        const contentType = response.headers.get("content-type");
        const hasJsonContent = contentType && contentType.includes("application/json");
        
        let responseData = null;
        if (hasJsonContent) {
            responseData = await response.json();
            console.log("Datos de respuesta:", responseData);
        }
        
        if (!response.ok) {
            const errorMessage = responseData && responseData.error 
                ? responseData.error 
                : `Error al enviar la reseña: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }
        
        // Reseña enviada exitosamente
        alert('¡Gracias! Tu reseña ha sido publicada.');
        
        // Cerrar el modal
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Recargar los negocios para ver la calificación actualizada
        await loadBusinesses();
        
    } catch (error) {
        console.error('Error al enviar reseña:', error);
        
        // Determinar el mensaje de error más adecuado
        let errorMessage = 'Error al enviar la reseña';
        
        if (isNetworkError(error)) {
            errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            // Redirigir al login
            localStorage.removeItem('token');
            setTimeout(() => {
                window.location.href = '/Login/Login.html';
            }, 2000);
        } else {
            errorMessage = `Error: ${error.message}`;
        }
        
        alert(errorMessage);
    } finally {
        // Restaurar el botón de envío
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

// Verificar si hay acciones pendientes después del login
function checkPendingReviewActions() {
    const pendingReview = localStorage.getItem('pendingReviewAction');
    const pendingBusinessId = localStorage.getItem('pendingReviewBusinessId');
    
    if (pendingReview === 'true' && pendingBusinessId) {
        // Buscar el negocio por ID
        const business = allBusinesses.find(b => b.id_Negocios == pendingBusinessId);
        if (business) {
            // Abrir el modal de reseña para ese negocio
            setTimeout(() => {
                openReviewModal(business.id_Negocios, business.nombre);
                
                // Limpiar los valores almacenados
                localStorage.removeItem('pendingReviewAction');
                localStorage.removeItem('pendingReviewBusinessId');
            }, 1000);
        }
    }
}

// Establecer calificación
function setRating(rating) {
    selectedRating = rating;
    
    const ratingInput = document.getElementById('rating-value');
    if (ratingInput) {
        ratingInput.value = rating;
    }
    
    highlightStars(rating);
}

// Resaltar estrellas en el modal
function highlightStars(rating) {
    const stars = document.querySelectorAll('.stars-select i');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = 'fas fa-star';
        } else {
            star.className = 'far fa-star';
        }
    });
}

// Hacer accesibles globalmente las funciones necesarias
window.openReviewModal = openReviewModal;
window.loadBusinesses = loadBusinesses;
window.performSearch = performSearch;