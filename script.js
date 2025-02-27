import { auth, signInWithPopup, GoogleAuthProvider } from './firebase.js';

//Base de datos
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay un usuario logueado
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        console.log('Usuario ya logueado:', user.displayName);
    }
    
    // Cargar negocios
    fetch('/api/negocios')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            const container = document.getElementById('negocios-container');
            if (container) {
                if (data.length === 0) {
                    container.innerHTML = '<p>No hay negocios disponibles actualmente</p>';
                    return;
                }
                
                data.forEach(negocio => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    
                    // Imagen de respaldo si no hay foto
                    const imgSrc = negocio.foto_portada || './img/default-restaurant.jpg';
                    
                    // Mostrar dirección completa o un mensaje por defecto
                    const direccion = negocio.calle 
                        ? `${negocio.calle} ${negocio.numero_exterior || ''}, ${negocio.colonia || ''}, ${negocio.municipio || ''}`
                        : 'Dirección no disponible';
                    
                    // Formatear calificación
                    const calificacion = negocio.promedio_calificaciones 
                        ? parseFloat(negocio.promedio_calificaciones).toFixed(1) 
                        : 'Sin calificaciones';
                    
                    card.innerHTML = `
                        <img src="${imgSrc}" alt="Foto de ${negocio.nombre}" onerror="this.src='./img/default-restaurant.jpg'">
                        <h2>${negocio.nombre}</h2>
                        <p>${direccion}</p>
                        <p class="rating">⭐ ${calificacion}</p>
                    `;
                    container.appendChild(card);
                });
            } else {
                console.error('El contenedor de negocios no existe en el DOM');
            }
        })
        .catch(error => {
            console.error('Error al cargar negocios:', error);
            const container = document.getElementById('negocios-container');
            if (container) {
                container.innerHTML = '<p>Error al cargar los negocios. Por favor, intente más tarde.</p>';
            }
        });
});