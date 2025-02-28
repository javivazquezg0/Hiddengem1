// CORRECCIÓN COMPLETA DEL ARCHIVO Login.js
document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar formularios
    const loginForm = document.querySelector('.formulario__login');
    const registerForm = document.querySelector('.formulario__register');
    
    // Elementos para animación
    const contenedor_login_register = document.querySelector('.contenedor__login-register');
    const caja__trasera_login = document.querySelector('.caja__trasera-login');
    const caja__trasera_register = document.querySelector('.caja__trasera-register');

    // Funciones de animación
    const iniciarSesion = () => {
        registerForm.style.display = "none";
        contenedor_login_register.style.left = "10px";
        loginForm.style.display = "block";
        caja__trasera_register.style.opacity = "1";
        caja__trasera_login.style.opacity = "0";
    };

    const register = () => {
        registerForm.style.display = "block";
        contenedor_login_register.style.left = "410px";
        loginForm.style.display = "none";
        caja__trasera_register.style.opacity = "0";
        caja__trasera_login.style.opacity = "1";
    };

    if (loginForm && registerForm) {
        // Manejar login
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);
                    window.location.href = '/index.html';
                } else {
                    alert(data.error || 'Error en el login');
                }
            } catch (error) {
                alert('Error de conexión');
            }
        });

        // Manejar registro
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const displayName = registerForm.querySelector('input[name="display_name"]').value;
            const email = registerForm.querySelector('input[type="email"]').value;
            const password = registerForm.querySelector('input[type="password"]').value;
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, displayName })
                });
                
                if (response.ok) {
                    alert('Registro exitoso! Por favor inicia sesión');
                    iniciarSesion();
                } else {
                    const error = await response.json();
                    alert(error.error);
                }
            } catch (error) {
                alert('Error de conexión');
            }
        });

        // Event listeners para botones
        document.getElementById("btn__register").addEventListener("click", register);
        document.getElementById("btn__iniciar-sesion").addEventListener("click", iniciarSesion);
        
    } else {
        console.error('No se encontraron los formularios');
    }
}); // <-- ¡Este cierre estaba faltando!