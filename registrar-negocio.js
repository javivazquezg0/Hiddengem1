document.addEventListener('DOMContentLoaded', () => {
    // Manejo de horarios dinámicos
    const horariosContainer = document.getElementById('horarios-container');
    const btnAgregarHorario = document.getElementById('btn-agregar-horario');
   
    // Manejo de vista previa de imágenes
    const imagenPortada = document.getElementById('imagen-portada');
    const previewPortada = document.getElementById('preview-portada');
    const imagenesAdicionales = document.getElementById('imagenes-adicionales');
    const previewAdicionales = document.getElementById('preview-adicionales');
    const imagenesNegocio = document.getElementById('imagenes-negocio');
    const previewImagenes = document.getElementById('preview-imagenes');

    // Vista previa de imágenes
    imagenesNegocio.addEventListener('change', function() {
        previewImagenes.innerHTML = '';
        
        if (this.files) {
            // Limitar a 5 imágenes
            const filesToProcess = Array.from(this.files).slice(0, 5);
            
            filesToProcess.forEach((file, index) => {
                const reader = new FileReader();
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.dataset.index = index;
                
                // Indicar si es imagen de portada
                if (index === 0) {
                    previewItem.classList.add('portada');
                    const portadaLabel = document.createElement('div');
                    portadaLabel.className = 'portada-label';
                    portadaLabel.textContent = 'Portada';
                    previewItem.appendChild(portadaLabel);
                }
                
                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-image';
                removeBtn.innerHTML = '×';
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    previewItem.remove();
                    // Actualizar las etiquetas de portada
                    updatePortadaLabels();
                });
                
                previewItem.appendChild(removeBtn);
                previewImagenes.appendChild(previewItem);
                
                reader.onload = function(e) {
                    previewItem.style.backgroundImage = `url('${e.target.result}')`;
                };
                
                reader.readAsDataURL(file);
            });
        }
    });

    // Función para actualizar etiquetas de portada
    function updatePortadaLabels() {
        const items = previewImagenes.querySelectorAll('.preview-item');
        items.forEach((item, idx) => {
            item.classList.remove('portada');
            const existingLabel = item.querySelector('.portada-label');
            if (existingLabel) {
                existingLabel.remove();
            }
            
            if (idx === 0) {
                item.classList.add('portada');
                const portadaLabel = document.createElement('div');
                portadaLabel.className = 'portada-label';
                portadaLabel.textContent = 'Portada';
                item.appendChild(portadaLabel);
            }
        });
    }

    // Configurar el primer botón de eliminar horario
    document.querySelector('.btn-eliminar-horario').addEventListener('click', function() {
        if (document.querySelectorAll('.horario-item').length > 1) {
            this.closest('.horario-item').remove();
        } else {
            alert('Debe haber al menos un horario');
        }
    });
    
    btnAgregarHorario.addEventListener('click', () => {
        const nuevoHorario = document.createElement('div');
        nuevoHorario.className = 'horario-item';
        nuevoHorario.innerHTML = `
            <div class="dia-rango">
                <select name="dia_inicio[]" class="select-dia" required>
                    ${document.querySelector('[name="dia_inicio[]"]').innerHTML}
                </select>
                <span>a</span>
                <select name="dia_fin[]" class="select-dia" required>
                    ${document.querySelector('[name="dia_fin[]"]').innerHTML}
                </select>
            </div>
            
            <div class="horario-tiempo">
                <input type="time" name="apertura[]" class="hora-input" required>
                <span>a</span>
                <input type="time" name="cierre[]" class="hora-input" required>
            </div>
            
            <button type="button" class="btn-eliminar-horario">🗑️</button>
        `;
        
        nuevoHorario.querySelector('.btn-eliminar-horario').addEventListener('click', function() {
            if (document.querySelectorAll('.horario-item').length > 1) {
                this.closest('.horario-item').remove();
            } else {
                alert('Debe haber al menos un horario');
            }
        });
        
        horariosContainer.appendChild(nuevoHorario);
    });
    
    // Validación de formulario
    document.getElementById('form-negocio').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulario enviado');
        
        // Validar días únicos
        const dias = Array.from(document.querySelectorAll('[name="dia[]"]'))
            .map(select => select.value);
            
        if (dias.some(dia => dia === '')) {
            alert('Error: Seleccione un día para cada horario');
            return;
        }
        
        if (new Set(dias).size !== dias.length) {
            alert('Error: Hay días duplicados en el horario');
            return;
        }
        
        // Validar días únicos y construir horarios
        const horarios = Array.from(document.querySelectorAll('.horario-item')).map(item => {
            const diaInicio = item.querySelector('[name="dia_inicio[]"]').value;
            const diaFin = item.querySelector('[name="dia_fin[]"]').value;
            const apertura = item.querySelector('[name="apertura[]"]').value;
            const cierre = item.querySelector('[name="cierre[]"]').value;
            
            // Validar que el día de inicio no sea posterior al día de fin
            const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const idxInicio = diasOrden.indexOf(diaInicio);
            const idxFin = diasOrden.indexOf(diaFin);
            
            if (idxInicio > idxFin) {
                alert(`Error: El día de inicio (${diaInicio}) no puede ser posterior al día de fin (${diaFin})`);
                return null;
            }
            
            // Validar horas
            if (apertura >= cierre) {
                alert(`Error: En ${diaInicio} a ${diaFin}, la hora de apertura debe ser anterior a la de cierre`);
                return null;
            }
            
            return {
                dia: `${diaInicio} a ${diaFin}`,
                apertura: apertura,
                cierre: cierre
            };
        });

        // Si hay algún error de validación, detener
        if (horarios.includes(null)) {
            return;
        }
        
        // Construir objeto de datos para el negocio (sin imágenes)
        const formData = {
            nombre: document.getElementById('nombre').value,
            descripcion: document.getElementById('descripcion').value,
            calle: document.getElementById('calle').value,
            numero_exterior: document.getElementById('numero_exterior').value,
            numero_interior: document.getElementById('numero_interior').value || null,
            colonia: document.getElementById('colonia').value,
            codigo_postal: document.getElementById('codigo_postal').value,
            municipio: document.getElementById('municipio').value,
            estado: document.getElementById('estado').value,
            telefono: document.getElementById('telefono').value,
            correo: document.getElementById('correo').value,
            horarios: horarios
        };
        
        console.log('Datos a enviar:', formData);
        
        // Verificar token
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Debe iniciar sesión para registrar un negocio');
            window.location.href = '/Login/Login.html';
            return;
        }
        
        try {
            // Primero registrar el negocio
            const response = await fetch('http://localhost:3001/api/negocios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al registrar negocio');
            }
            
            const data = await response.json();
            const idNegocio = data.idNegocio;
            
            // Si hay imágenes, subirlas (opcional)
            if (imagenesNegocio.files && imagenesNegocio.files.length > 0) {
                // Crear formData para enviar archivos
                const imageFormData = new FormData();
                
                // Agregar imágenes (máximo 5)
                const imagesToUpload = Array.from(imagenesNegocio.files).slice(0, 5);
                imagesToUpload.forEach(file => {
                    imageFormData.append('imagenes', file);
                });
                
                // Enviar imágenes
                try {
                    const imageResponse = await fetch(`http://localhost:3001/api/negocios/${idNegocio}/imagenes`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: imageFormData
                    });
                    
                    if (!imageResponse.ok) {
                        console.warn('Las imágenes no pudieron ser subidas');
                    } else {
                        console.log('Imágenes subidas correctamente');
                    }
                } catch (imageError) {
                    console.warn('Error al subir imágenes:', imageError);
                    // No bloqueamos el flujo principal si hay error en las imágenes
                }
            }
            
            alert('Negocio registrado exitosamente!');
            // Guardar el ID del negocio para su uso posterior
            localStorage.setItem('idNegocioActual', idNegocio);
            window.location.href = '/index.html';
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    });
});