document.addEventListener('DOMContentLoaded', () => {
    let isLoadingBusinesses = false;
    // Verificar autenticación
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirigir a login si no hay token
        window.location.href = '/Login/Login.html';
        return;
    }

// Controlar visibilidad de enlaces de autenticación
const loginLink = document.querySelector('a[href="/Login/Login.html"]') || document.getElementById('login');
const cerrarSesionLink = document.getElementById('cerrar-sesion');

// Si hay token, ocultar inicio de sesión y mostrar cerrar sesión
if (token) {
    if (loginLink) loginLink.style.display = 'none';
    if (cerrarSesionLink) cerrarSesionLink.style.display = 'block';
} else {
    // Esto no debería ejecutarse en dashboard.js ya que redirigimos antes,
    // pero lo incluimos por completitud
    if (loginLink) loginLink.style.display = 'block';
    if (cerrarSesionLink) cerrarSesionLink.style.display = 'none';
}

    document.addEventListener('DOMContentLoaded', function() {
       
       
        // Limpiar caché local
        localStorage.removeItem('cached_businesses');
        sessionStorage.clear();
        
        // El resto de tu código de inicialización...
      });

    // Configuración inicial
    const usuarioActual = document.getElementById('usuario-actual');
    const cerrarSesion = document.getElementById('cerrar-sesion');
    const sidebarItems = document.querySelectorAll('.sidebar-menu li');
    const tabContents = document.querySelectorAll('.tab-content');
    const modal = document.getElementById('modal-detalle-negocio');
    const closeModal = document.querySelector('.close-modal');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const formUploadImagenes = document.getElementById('form-upload-imagenes');
    const galeriaImagenesElement = document.getElementById('galeria-imagenes');

    // Variables para almacenar datos del usuario y negocios
    let userData = null;
    let negociosData = [];
    let currentNegocioId = null;
    
    // Función para cargar imágenes del negocio
    async function cargarImagenesNegocio(negocioId) {
        try {
            // Simulación de datos para desarrollo
            // Esta sección deberá ser reemplazada con la llamada real a tu API
            const imagenes = [
                { id: 1, url: '/img/default-restaurant.jpg', es_portada: true },
                { id: 2, url: '/img/sample-food1.jpg', es_portada: false },
                { id: 3, url: '/img/sample-food2.jpg', es_portada: false }
            ];
            
            renderizarGaleriaImagenes(imagenes);
            
            // Cuando tengas tu API, descomenta y adapta este código:
            /*
            const response = await fetch(`http://localhost:3001/api/negocios/${negocioId}/imagenes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener imágenes');
            }
            
            const imagenes = await response.json();
            renderizarGaleriaImagenes(imagenes);
            */
        } catch (error) {
            console.error('Error:', error);
            galeriaImagenesElement.innerHTML = `<div class="error-message">Error al cargar imágenes: ${error.message}</div>`;
        }
    }

    // Función para renderizar la galería de imágenes
    function renderizarGaleriaImagenes(imagenes) {
        if (!galeriaImagenesElement) return;
        
        if (!imagenes || imagenes.length === 0) {
            galeriaImagenesElement.innerHTML = '<p>No hay imágenes para este negocio.</p>';
            return;
        }
        
        let html = '';
        
        imagenes.forEach(imagen => {
            html += `
                <div class="imagen-item" data-id="${imagen.id}">
                    <img src="${imagen.url}" alt="Imagen del negocio">
                    <div class="imagen-actions">
                        ${!imagen.es_portada ? 
                            `<button type="button" class="btn-portada" data-id="${imagen.id}" title="Establecer como portada">★</button>` : ''}
                        <button type="button" class="btn-eliminar" data-id="${imagen.id}" title="Eliminar imagen">×</button>
                    </div>
                    ${imagen.es_portada ? '<span class="portada-badge">Portada</span>' : ''}
                </div>
            `;
        });
        
        galeriaImagenesElement.innerHTML = html;
        
        // Añadir event listeners a los botones
        configurarBotonesImagen();
    }

    // Configurar los botones de cada imagen
    function configurarBotonesImagen() {
        // Botones para establecer como portada
        document.querySelectorAll('.btn-portada').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (!currentNegocioId) {
                    alert('No se ha seleccionado ningún negocio');
                    return;
                }
                
                const imagenId = btn.getAttribute('data-id');
                
                try {
                    // Simulación para desarrollo
                    alert(`Imagen ${imagenId} establecida como portada`);
                    
                    // Actualizar UI para reflejar el cambio
                    document.querySelectorAll('.portada-badge').forEach(badge => {
                        badge.remove();
                    });
                    
                    document.querySelectorAll('.btn-portada').forEach(button => {
                        button.style.display = 'inline-block';
                    });
                    
                    btn.style.display = 'none';
                    btn.closest('.imagen-item').appendChild(
                        Object.assign(document.createElement('span'), {
                            className: 'portada-badge',
                            textContent: 'Portada'
                        })
                    );
                    
                    // Cuando tengas tu API, descomenta y adapta este código:
                    /*
                    const response = await Utils.fetchWithRetry(`http://localhost:3001/api/negocios/${currentNegocioId}/imagenes/${imagenId}/portada`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error al establecer imagen de portada');
                    }
                    
                    // Recargar imágenes para actualizar la vista
                    cargarImagenesNegocio(currentNegocioId);
                    
                    // También actualizar la portada en la vista de tarjetas
                    cargarNegociosUsuario();
                    */
                    
                } catch (error) {
                    console.error('Error:', error);
                    alert(`Error: ${error.message}`);
                }
            });
        });
        
        // Botones para eliminar imagen
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (!confirm('¿Estás seguro de eliminar esta imagen?')) {
                    return;
                }
                
                if (!currentNegocioId) {
                    alert('No se ha seleccionado ningún negocio');
                    return;
                }
                
                const imagenId = btn.getAttribute('data-id');
                
                try {
                    // Simulación para desarrollo
                    btn.closest('.imagen-item').remove();
                    alert(`Imagen ${imagenId} eliminada correctamente`);
                    
                    // Cuando tengas tu API, descomenta y adapta este código:
                    /*
                    const response = await fetch(`http://localhost:3001/api/negocios/${currentNegocioId}/imagenes/${imagenId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error al eliminar imagen');
                    }
                    
                    // Recargar imágenes para actualizar la vista
                    cargarImagenesNegocio(currentNegocioId);
                    */
                    
                } catch (error) {
                    console.error('Error:', error);
                    alert(`Error: ${error.message}`);
                }
            });
        });
    }

    // Configuración para la subida de imágenes
    if (formUploadImagenes) {
        formUploadImagenes.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentNegocioId) {
                alert('No se ha seleccionado ningún negocio');
                return;
            }
            
            const nuevasImagenes = document.getElementById('nuevas-imagenes');
            
            if (!nuevasImagenes.files || nuevasImagenes.files.length === 0) {
                alert('Seleccione al menos una imagen');
                return;
            }
            
            // Mostrar indicador de carga
            const submitBtn = formUploadImagenes.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subiendo...';
            
            const formData = new FormData();
            
            Array.from(nuevasImagenes.files).forEach(file => {
                formData.append('imagenes', file);
            });
            
            try {
                // Simulación para desarrollo
                setTimeout(() => {
                    alert('Imágenes subidas correctamente (simulación)');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    nuevasImagenes.value = ''; // Limpiar input
                    
                    // Añadir imágenes simuladas a la galería
                    const nuevasImagenesSimuladas = Array.from(nuevasImagenes.files).map((file, index) => ({
                        id: Math.floor(Math.random() * 1000) + 10, // ID aleatorio para simulación
                        url: URL.createObjectURL(file),
                        es_portada: false
                    }));
                    
                    // Obtener imágenes actuales (simuladas)
                    const imagenesActuales = Array.from(document.querySelectorAll('.imagen-item')).map(item => ({
                        id: parseInt(item.getAttribute('data-id')),
                        url: item.querySelector('img').src,
                        es_portada: item.querySelector('.portada-badge') !== null
                    }));
                    
                    // Combinar y renderizar
                    renderizarGaleriaImagenes([...imagenesActuales, ...nuevasImagenesSimuladas]);
                }, 1500);
                
                // Cuando tengas tu API, descomenta y adapta este código:
                /*
                const response = await fetch(`http://localhost:3001/api/negocios/${currentNegocioId}/imagenes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Error al subir imágenes');
                }
                
                alert('Imágenes subidas correctamente');
                
                // Recargar imágenes para actualizar la vista
                cargarImagenesNegocio(currentNegocioId);
                
                // Limpiar input
                nuevasImagenes.value = '';
                */
                
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    // Función para actualizar la vista previa de las imágenes seleccionadas
    function mostrarVistaPreviaImagenes() {
        const inputImagenes = document.getElementById('nuevas-imagenes');
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';
        
        if (inputImagenes) {
            inputImagenes.addEventListener('change', function() {
                // Eliminar vista previa anterior si existe
                const existingPreview = document.querySelector('.preview-container');
                if (existingPreview) {
                    existingPreview.remove();
                }
                
                if (this.files && this.files.length > 0) {
                    previewContainer.innerHTML = '<h4>Vista previa</h4><div class="preview-grid"></div>';
                    const previewGrid = previewContainer.querySelector('.preview-grid');
                    
                    Array.from(this.files).forEach(file => {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const previewItem = document.createElement('div');
                            previewItem.className = 'preview-item';
                            
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.className = 'preview-img';
                            
                            previewItem.appendChild(img);
                            previewGrid.appendChild(previewItem);
                        }
                        reader.readAsDataURL(file);
                    });
                    
                    // Insertar después del input
                    inputImagenes.parentNode.insertBefore(previewContainer, inputImagenes.nextSibling);
                }
            });
        }
    }
// Funcionalidad para eliminar negocio - Añadir al archivo dashboard.js

// Selectores para el modal de eliminación
const btnEliminarNegocio = document.getElementById('btn-eliminar-negocio');
const modalConfirmarEliminacion = document.getElementById('modal-confirmar-eliminacion');
const closeModalEliminar = document.querySelector('.close-modal-eliminar');
const btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');
const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
const inputConfirmarEliminar = document.getElementById('confirmar-eliminar');
const nombreNegocioEliminar = document.querySelector('.nombre-negocio-eliminar');

// Mostrar modal de confirmación para eliminar
if (btnEliminarNegocio) {
    btnEliminarNegocio.addEventListener('click', () => {
        if (!currentNegocioId) {
            alert('No se ha seleccionado ningún negocio');
            return;
        }
        
        // Encontrar el negocio actual
        const negocio = negociosData.find(n => n.id_Negocios == currentNegocioId);
        
        if (!negocio) {
            alert('No se encontró la información del negocio');
            return;
        }
        
        // Mostrar el nombre del negocio en el modal de confirmación
        nombreNegocioEliminar.textContent = negocio.nombre;
        
        // Limpiar el campo de confirmación
        inputConfirmarEliminar.value = '';
        btnConfirmarEliminar.disabled = true;
        
        // Mostrar el modal
        modalConfirmarEliminacion.style.display = 'block';
    });
}

// Cerrar modal de eliminación
if (closeModalEliminar) {
    closeModalEliminar.addEventListener('click', () => {
        modalConfirmarEliminacion.style.display = 'none';
    });
}

// Botón cancelar eliminación
if (btnCancelarEliminar) {
    btnCancelarEliminar.addEventListener('click', () => {
        modalConfirmarEliminacion.style.display = 'none';
    });
}

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target === modalConfirmarEliminacion) {
        modalConfirmarEliminacion.style.display = 'none';
    }
});

// Validar campo de confirmación
if (inputConfirmarEliminar) {
    inputConfirmarEliminar.addEventListener('input', () => {
        // Habilitar el botón solo si el texto es "ELIMINAR"
        btnConfirmarEliminar.disabled = inputConfirmarEliminar.value !== 'ELIMINAR';
    });
}

// Proceso de eliminación
if (btnConfirmarEliminar) {
    btnConfirmarEliminar.addEventListener('click', async () => {
        if (inputConfirmarEliminar.value !== 'ELIMINAR') {
            inputConfirmarEliminar.classList.add('shake');
            setTimeout(() => {
                inputConfirmarEliminar.classList.remove('shake');
            }, 500);
            return;
        }
        
        if (!currentNegocioId) {
            alert('No se ha seleccionado ningún negocio');
            return;
        }
        
        // Deshabilitar botón y mostrar estado de carga
        btnConfirmarEliminar.disabled = true;
        btnConfirmarEliminar.textContent = 'Eliminando...';
        
        try {
            // Simulación para desarrollo
            setTimeout(() => {
                // Eliminar de la lista en memoria
                negociosData = negociosData.filter(n => n.id_Negocios != currentNegocioId);
                
                // Actualizar contador de estadísticas
                document.getElementById('total-negocios').textContent = negociosData.length;
                
                // Cerrar modales
                modalConfirmarEliminacion.style.display = 'none';
                modal.style.display = 'none';
                
                // Actualizar vista
                renderizarNegocios(negociosData);
                
                // Mostrar mensaje de éxito
                alert('Negocio eliminado correctamente');
                
                // Resetear estado
                btnConfirmarEliminar.disabled = false;
                btnConfirmarEliminar.textContent = 'Eliminar Negocio';
            }, 1500);
            
            // Cuando tengas tu API, descomenta y adapta este código:
            /*
            const response = await fetch(`http://localhost:3001/api/negocios/${currentNegocioId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al eliminar el negocio');
            }
            
            // Eliminar de la lista en memoria
            negociosData = negociosData.filter(n => n.id_Negocios != currentNegocioId);
            
            // Actualizar contador de estadísticas
            document.getElementById('total-negocios').textContent = negociosData.length;
            
            // Cerrar modales
            modalConfirmarEliminacion.style.display = 'none';
            modal.style.display = 'none';
            
            // Actualizar vista
            renderizarNegocios(negociosData);
            
            // Mostrar mensaje de éxito
            alert('Negocio eliminado correctamente');
            */
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error al eliminar el negocio: ${error.message}`);
            btnConfirmarEliminar.disabled = false;
            btnConfirmarEliminar.textContent = 'Eliminar Negocio';
        }
    });
}
    // Inicializar vista previa
    mostrarVistaPreviaImagenes();
    
    // Cargar datos del usuario
    cargarDatosUsuario();
    
    // Cargar negocios del usuario
    cargarNegociosUsuario();
    
    // Event Listeners
    
    // Cerrar sesión
    cerrarSesion.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('idNegocioActual');
        window.location.href = '/index.html';
    });
    
    // Navegación de la barra lateral
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            // Actualizar clases activas
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Mostrar contenido correspondiente
            const tabToShow = item.getAttribute('data-tab');
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === tabToShow) {
                    tab.classList.add('active');
                }
            });
            
            // Si se selecciona estadísticas, cargar datos
            if (tabToShow === 'estadisticas') {
                cargarEstadisticas();
            }
        });
    });
    
    // Cerrar modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Tabs dentro del modal
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabPanel = btn.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === tabPanel) {
                    panel.classList.add('active');
                }
            });
        });
    });
    
    // Formulario de cambio de contraseña
    const formCambiarPassword = document.getElementById('form-cambiar-password');
    if (formCambiarPassword) {
        formCambiarPassword.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const passwordActual = document.getElementById('password-actual').value;
            const nuevoPassword = document.getElementById('nuevo-password').value;
            const confirmarPassword = document.getElementById('confirmar-password').value;
            
            if (nuevoPassword !== confirmarPassword) {
                alert('Las contraseñas no coinciden');
                return;
            }
            
            // Implementar cambio de contraseña (requiere endpoint en el backend)
            alert('Funcionalidad de cambio de contraseña en desarrollo');
        });
    }
    
    // Funciones
    
    async function cargarDatosUsuario() {
        try {
            const response = await fetch('/api/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener datos del usuario');
            }
            
            userData = await response.json();
            
            // Actualizar interfaz
            const usuarioActualElement = document.getElementById('usuario-actual');
        if (usuarioActualElement) {
            usuarioActualElement.textContent = userData.user.displayName || userData.user.email;
        }
            
            // Actualizar sección de perfil
            const nombreUsuarioElement = document.getElementById('nombre-usuario');
            const emailUsuarioElement = document.getElementById('email-usuario');
            
            if (nombreUsuarioElement) {
                nombreUsuarioElement.textContent = userData.user.displayName || 'Usuario';
            }
            
            if (emailUsuarioElement) {
                emailUsuarioElement.textContent = userData.user.email;
            }
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar datos del usuario. Por favor, inicie sesión nuevamente.');
            localStorage.removeItem('token');
            window.location.href = '/Login/Login.html';
        }
    }
    
    async function cargarNegociosUsuario() {
        // Variable para evitar cargas múltiples
        if (isLoadingBusinesses) {
            console.log('Ya se está ejecutando una carga de negocios, ignorando llamada duplicada');
            return;
        }
        
        isLoadingBusinesses = true;
        
        try {
            // Obtener el token del localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No hay token disponible');
                const listaNegociosElement = document.getElementById('lista-negocios');
                if (listaNegociosElement) {
                    listaNegociosElement.innerHTML = `<div class="error-message">No hay sesión activa. Por favor inicia sesión.</div>`;
                }
                return;
            }
            
            console.log('Recuperando negocios para el usuario actual...');
            const response = await fetch('/api/negocios', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Evitar caché
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                let errorMsg = 'Error al obtener negocios';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {}
                
                throw new Error(errorMsg);
            }
            
            const allNegocios = await response.json();
            console.log('Negocios recuperados:', allNegocios.length);
            
            // Asignamos todos los negocios recibidos
            negociosData = allNegocios;
            
            // Agregar depuración para ver los IDs
            console.log('IDs de los negocios a renderizar:');
            allNegocios.forEach(negocio => {
                console.log(`ID: ${negocio.id_Negocios}, Nombre: ${negocio.nombre}`);
            });
            
            if (allNegocios.length > 0) {
                console.log('Datos completos del primer negocio:', JSON.stringify(allNegocios[0], null, 2));
            }
            
            if (negociosData.length === 0) {
                const listaNegociosElement = document.getElementById('lista-negocios');
                if (listaNegociosElement) {
                    listaNegociosElement.innerHTML = `<div class="no-data">No tienes negocios registrados. ¡Registra tu primer negocio!</div>`;
                }
            } else {
                // Renderizar negocios con la función mejorada
                renderizarNegocios(negociosData);
                
                // Actualizar contador de estadísticas
                const totalElement = document.getElementById('total-negocios');
                if (totalElement) {
                    totalElement.textContent = negociosData.length;
                }
            }
        } catch (error) {
            console.error('Error al cargar negocios:', error);
            const listaNegociosElement = document.getElementById('lista-negocios');
            if (listaNegociosElement) {
                listaNegociosElement.innerHTML = `
                    <div class="error-message">Error al cargar negocios: ${error.message}</div>
                `;
            }
        } finally {
            isLoadingBusinesses = false;
        }
    }
    
      function renderizarNegocios(negocios) {
        const listaNegociosElement = document.getElementById('lista-negocios');
        
        if (!negocios || negocios.length === 0) {
          // Código existente para cuando no hay negocios...
          return;
        }
        
        // Eliminar duplicados basados en id_Negocios
        const negociosUnicos = {};
        negocios.forEach(negocio => {
          if (!negociosUnicos[negocio.id_Negocios]) {
            negociosUnicos[negocio.id_Negocios] = negocio;
          }
        });
        
        // Convertir de objeto a array
        const negociosFiltrados = Object.values(negociosUnicos);
        console.log(`Mostrando ${negociosFiltrados.length} negocios únicos`);
        
        
        let html = '';
        
        negocios.forEach(negocio => {
            html += `
                <div class="negocio-card">
                    <img src="${negocio.foto_portada || '/img/default-restaurant.jpg'}" alt="${negocio.nombre}" class="negocio-img">
                    <div class="negocio-info">
                        <h3>${negocio.nombre}</h3>
                        <p>${negocio.descripcion.substring(0, 80)}${negocio.descripcion.length > 80 ? '...' : ''}</p>
                    </div>
                    <div class="negocio-stats">
                        <span>Calificación: ${negocio.promedio_calificaciones ? Number(negocio.promedio_calificaciones).toFixed(1) : 'N/A'}</span>
                        <span>Reseñas: ${negocio.total_resenas || 0}</span>
                    </div>
                    <button class="btn-ver-negocio" data-id="${negocio.id_Negocios}">Administrar</button>
                </div>
            `;
        });
        
        listaNegociosElement.innerHTML = html;
        
        // Añadir event listeners a los botones
        document.querySelectorAll('.btn-ver-negocio').forEach(btn => {
            btn.addEventListener('click', () => {
                const negocioId = btn.getAttribute('data-id');
                abrirDetalleNegocio(negocioId);
            });
        });
    }
    
    async function abrirDetalleNegocio(negocioId) {
        currentNegocioId = negocioId;
        await cargarDetalleNegocio(negocioId);
        modal.style.display = 'block';
    }
    
    async function cargarDetalleNegocio(negocioId) {
        try {
            // Encuentra el negocio en los datos ya cargados
            const negocio = negociosData.find(n => n.id_Negocios == negocioId);
            
            if (!negocio) {
                throw new Error('Negocio no encontrado');
            }
            
            // Actualizar datos básicos en el modal
            document.getElementById('modal-nombre-negocio').textContent = negocio.nombre;
            document.getElementById('modal-descripcion').textContent = negocio.descripcion;
            document.getElementById('modal-direccion').textContent = `${negocio.calle} ${negocio.numero_exterior}, ${negocio.colonia}, ${negocio.municipio}, ${negocio.estado}, CP ${negocio.codigo_postal}`;
            document.getElementById('modal-contacto').textContent = `Teléfono: ${negocio.telefono} | Email: ${negocio.correo}`;
            document.getElementById('modal-calificacion').textContent = negocio.promedio_calificaciones ? `${Number(negocio.promedio_calificaciones).toFixed(1)} / 5.0` : 'Sin calificaciones';
            
            // Cargar horarios (requiere un endpoint específico en el backend)
            cargarHorariosNegocio(negocioId);
            
            // Cargar imágenes (requiere un endpoint específico en el backend)
            cargarImagenesNegocio(negocioId);
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error al cargar detalle del negocio: ${error.message}`);
        }
    }
    
    async function cargarHorariosNegocio(negocioId) {
        // Esta función requiere un endpoint en el backend para obtener los horarios
        // Por ahora, usamos datos de ejemplo
        const listaHorariosElement = document.getElementById('lista-horarios');
        
        listaHorariosElement.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Día</th>
                        <th>Horario de Apertura</th>
                        <th>Horario de Cierre</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Lunes</td><td>9:00 AM</td><td>6:00 PM</td></tr>
                    <tr><td>Martes</td><td>9:00 AM</td><td>6:00 PM</td></tr>
                    <tr><td>Miércoles</td><td>9:00 AM</td><td>6:00 PM</td></tr>
                    <tr><td>Jueves</td><td>9:00 AM</td><td>6:00 PM</td></tr>
                    <tr><td>Viernes</td><td>9:00 AM</td><td>6:00 PM</td></tr>
                    <tr><td>Sábado</td><td>10:00 AM</td><td>3:00 PM</td></tr>
                    <tr><td>Domingo</td><td>Cerrado</td><td>Cerrado</td></tr>
                </tbody>
            </table>
        `;
        
        // Cuando implementes el backend, descomenta este código y ajusta según tu API
        /*
        try {
            const response = await fetch(`http://localhost:3001/api/negocios/${negocioId}/horarios`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener horarios');
            }
            
            const horarios = await response.json();
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Día</th>
                            <th>Horario de Apertura</th>
                            <th>Horario de Cierre</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            
            diasSemana.forEach((dia, index) => {
                const horario = horarios.find(h => h.dia_semana === index + 1);
                
                if (horario && horario.abierto) {
                    html += `
                        <tr>
                            <td>${dia}</td>
                            <td>${formatHora(horario.hora_apertura)}</td>
                            <td>${formatHora(horario.hora_cierre)}</td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr>
                            <td>${dia}</td>
                            <td colspan="2">Cerrado</td>
                        </tr>
                    `;
                }
            });
            
            html += `
                    </tbody>
                </table>
            `;
            
            listaHorariosElement.innerHTML = html;
            
        } catch (error) {
            console.error('Error:', error);
            listaHorariosElement.innerHTML = `<div class="error-message">Error al cargar horarios: ${error.message}</div>`;
        }
        */
    }
    
    // Función para cargar estadísticas
    async function cargarEstadisticas() {
        // Esta función requiere endpoints en el backend para obtener estadísticas
        // Por ahora, usamos datos de ejemplo
        
        // Cuando implementes el backend, descomenta este código y ajusta según tu API
        /*
        try {
            const response = await fetch('http://localhost:3001/api/estadisticas', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener estadísticas');
            }
            
            const estadisticas = await response.json();
            
            document.getElementById('total-negocios').textContent = estadisticas.total_negocios || 0;
            document.getElementById('total-visitas').textContent = estadisticas.total_visitas || 0;
            document.getElementById('calificacion-media').textContent = estadisticas.calificacion_media ? estadisticas.calificacion_media.toFixed(1) : '0.0';
            document.getElementById('total-resenas').textContent = estadisticas.total_resenas || 0;
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error al cargar estadísticas: ${error.message}`);
        }
        */
        
        // Datos de estadísticas de ejemplo
        document.getElementById('total-visitas').textContent = '245';
        document.getElementById('calificacion-media').textContent = '4.2';
        document.getElementById('total-resenas').textContent = '18';
    }
    
    // Búsqueda de negocios
    const buscarNegocioInput = document.getElementById('buscar-negocio');
    if (buscarNegocioInput) {
        buscarNegocioInput.addEventListener('input', () => {
            const termino = buscarNegocioInput.value.toLowerCase();
            
            // Filtrar negocios por término de búsqueda
            const negociosFiltrados = negociosData.filter(negocio => 
                negocio.nombre.toLowerCase().includes(termino) || 
                negocio.descripcion.toLowerCase().includes(termino)
            );
            
            renderizarNegocios(negociosFiltrados);
        });
    }
    
    // Funciones de edición
    const modalEditarInfo = document.getElementById('modal-editar-info');
    const closeModalEditarInfo = document.querySelector('.close-modal-edicion');
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
    const formEditarNegocio = document.getElementById('form-editar-negocio');

    const modalEditarHorarios = document.getElementById('modal-editar-horarios');
    const closeModalEditarHorarios = document.querySelector('.close-modal-edicion-horarios');
    const btnCancelarEdicionHorarios = document.getElementById('btn-cancelar-edicion-horarios');
    const formEditarHorarios = document.getElementById('form-editar-horarios');
    
    // Event listener para abrir modal de editar información
    document.getElementById('btn-editar-info').addEventListener('click', () => {
        if (!currentNegocioId) {
            alert('No se ha seleccionado ningún negocio');
            return;
        }
        
        // Encontrar el negocio actual
        const negocio = negociosData.find(n => n.id_Negocios == currentNegocioId);
        
        if (!negocio) {
            alert('No se encontró la información del negocio');
            return;
        }
        
        // Llenar el formulario con los datos actuales
        document.getElementById('editar-nombre').value = negocio.nombre || '';
        document.getElementById('editar-descripcion').value = negocio.descripcion || '';
        document.getElementById('editar-calle').value = negocio.calle || '';
        document.getElementById('editar-numero-exterior').value = negocio.numero_exterior || '';
        document.getElementById('editar-colonia').value = negocio.colonia || '';
        document.getElementById('editar-municipio').value = negocio.municipio || '';
        document.getElementById('editar-estado').value = negocio.estado || '';
        document.getElementById('editar-codigo-postal').value = negocio.codigo_postal || '';
        document.getElementById('editar-telefono').value = negocio.telefono || '';
        document.getElementById('editar-correo').value = negocio.correo || '';
        
        // Mostrar el modal
        modalEditarInfo.style.display = 'block';
    });
    
    // Cerrar modal de edición de información
    if (closeModalEditarInfo) {
        closeModalEditarInfo.addEventListener('click', () => {
            modalEditarInfo.style.display = 'none';
        });
    }
    
    // Botón cancelar edición
    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', () => {
            modalEditarInfo.style.display = 'none';
        });
    }
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target === modalEditarInfo) {
            modalEditarInfo.style.display = 'none';
        }
        if (e.target === modalEditarHorarios) {
            modalEditarHorarios.style.display = 'none';
        }
    });
    
    // Enviar formulario de edición
    if (formEditarNegocio) {
        formEditarNegocio.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentNegocioId) {
                alert('No se ha seleccionado ningún negocio');
                return;
            }
            
            // Obtener los datos del formulario
            const formData = new FormData(formEditarNegocio);
            const negocioData = {};
            
            for (const [key, value] of formData.entries()) {
                negocioData[key] = value;
            }
            
            try {
                const response = await Utils.fetchWithRetry(`http://localhost:3001/api/negocios/${currentNegocioId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(negocioData)
                });
                
                if (!response.ok) {
                    throw new Error('Error al actualizar la información del negocio');
                }
                
                // Actualizar datos en memoria
                const negocioIndex = negociosData.findIndex(n => n.id_Negocios == currentNegocioId);
                if (negocioIndex !== -1) {
                    negociosData[negocioIndex] = { ...negociosData[negocioIndex], ...negocioData };
                }
                
                // Cerrar modal
                modalEditarInfo.style.display = 'none';
                
                // Actualizar vista detalle
                cargarDetalleNegocio(currentNegocioId);
                
                // Actualizar lista de negocios
                renderizarNegocios(negociosData);
                
                alert('Información actualizada correctamente');
                
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }
    
    // Event listener para abrir modal de editar horarios
    document.getElementById('btn-editar-horarios').addEventListener('click', () => {
        if (!currentNegocioId) {
            alert('No se ha seleccionado ningún negocio');
            return;
        }
        
        // Aquí deberías cargar los horarios actuales del negocio desde tu backend
        // Por ahora usamos los valores por defecto que ya están en el HTML
        
        // Mostrar el modal
        modalEditarHorarios.style.display = 'block';
        
        // Configurar la funcionalidad de habilitar/deshabilitar campos según el estado del checkbox
        const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        
        diasSemana.forEach(dia => {
            const checkbox = document.getElementById(`abierto-${dia}`);
            
            if (checkbox) {
                // Establecer estado inicial
                const horaApertura = document.getElementById(`hora-apertura-${dia}`);
                const horaCierre = document.getElementById(`hora-cierre-${dia}`);
                
                if (horaApertura && horaCierre) {
                    horaApertura.disabled = !checkbox.checked;
                    horaCierre.disabled = !checkbox.checked;
                }
                
                // Añadir event listener para cambios
                checkbox.addEventListener('change', () => {
                    if (horaApertura && horaCierre) {
                        horaApertura.disabled = !checkbox.checked;
                        horaCierre.disabled = !checkbox.checked;
                    }
                });
            }
        });
    });
    
    // Cerrar modal de edición de horarios
    if (closeModalEditarHorarios) {
        closeModalEditarHorarios.addEventListener('click', () => {
            modalEditarHorarios.style.display = 'none';
        });
    }
    
    // Botón cancelar edición de horarios
    if (btnCancelarEdicionHorarios) {
        btnCancelarEdicionHorarios.addEventListener('click', () => {
            modalEditarHorarios.style.display = 'none';
        });
    }
    
    // Enviar formulario de edición de horarios
    if (formEditarHorarios) {
        formEditarHorarios.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentNegocioId) {
                alert('No se ha seleccionado ningún negocio');
                return;
            }
            
            // Obtener los datos del formulario
            const formData = new FormData(formEditarHorarios);
            const horarioData = {
                dias: []
            };
            
            // Procesar los datos para formatearlos según la necesidad del backend
            const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            
            diasSemana.forEach((dia, index) => {
                const abierto = formData.get(`abierto_${dia}`) === 'on';
                const horaApertura = formData.get(`hora_apertura_${dia}`);
                const horaCierre = formData.get(`hora_cierre_${dia}`);
                
                horarioData.dias.push({
                    dia_semana: index + 1, // 1 para lunes, 7 para domingo
                    abierto: abierto,
                    hora_apertura: abierto ? horaApertura : null,
                    hora_cierre: abierto ? horaCierre : null
                });
            });
            
            try {
                const response = await Utils.fetchWithRetry(`http://localhost:3001/api/negocios/${currentNegocioId}/horarios`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(horarioData)
                });
                
                if (!response.ok) {
                    throw new Error('Error al actualizar los horarios');
                }
                
                // Cerrar modal
                modalEditarHorarios.style.display = 'none';
                
                // Actualizar vista de horarios
                cargarHorariosNegocio(currentNegocioId);
                
                alert('Horarios actualizados correctamente');
                
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }
    
    // Función auxiliar para formatear hora (para usar con los datos del backend)
    function formatHora(horaString) {
        if (!horaString) return 'N/A';
        
        try {
            const [hora, minutos] = horaString.split(':');
            const horaNum = parseInt(hora);
            const periodo = horaNum >= 12 ? 'PM' : 'AM';
            const hora12 = horaNum % 12 || 12;
            
            return `${hora12}:${minutos} ${periodo}`;
        } catch (error) {
            console.error('Error al formatear hora:', error);
            return horaString;
        }
    }
});