import { auth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from './firebase.js';
//Login Fb Google
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado'); // Verifica que el DOM esté listo

    const googleLoginButton = document.getElementById('google-login');
    const facebookLoginButton = document.getElementById('facebook-login');

    if (googleLoginButton) {
        
        googleLoginButton.addEventListener('click', () => {
            console.log('Clic en Google Login'); // Verifica que el evento se dispare
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    console.log('Usuario logueado con Google:', user);
                    alert(`Bienvenido, ${user.displayName}`);
                })
                .catch((error) => {
                    console.error('Error en login con Google:', error);
                    alert('Error al iniciar sesión con Google');
                });
        });
    }

    if (facebookLoginButton) {
        facebookLoginButton.addEventListener('click', () => {
            console.log('Clic en Facebook Login'); // Verifica que el evento se dispare
            const provider = new FacebookAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    console.log('Usuario logueado con Facebook:', user);
                    alert(`Bienvenido, ${user.displayName}`);
                })
                .catch((error) => {
                    console.error('Error en login con Facebook:', error);
                    alert('Error al iniciar sesión con Facebook');
                });
        });
    }
});

//Base de datos
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/negocios')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('negocios-container');
            data.forEach(negocio => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="${negocio.foto_portada}" alt="Foto de ${negocio.nombre}">
                    <h2>${negocio.nombre}</h2>
                    <p>${negocio.direccion}</p>
                    <p class="rating">⭐ ${negocio.promedio_calificaciones || 'Sin calificaciones'}</p>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => console.error('Error:', error));
});