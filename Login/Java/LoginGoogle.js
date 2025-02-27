// Fix the import path to point to the correct location
import { auth, signInWithPopup, GoogleAuthProvider } from '../../firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado para login Google');
    const googleLoginButton = document.getElementById('google-login');
    
    if (googleLoginButton) {
        console.log('Botón de Google encontrado');
        googleLoginButton.addEventListener('click', () => {
            console.log('Clic en Google Login');
            const provider = new GoogleAuthProvider();
            
            // Add additional scopes if needed
            provider.addScope('profile');
            provider.addScope('email');
            
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    console.log('Usuario logueado con Google:', user);
                    alert(`Bienvenido, ${user.displayName}`);
                    
                    // Guardar información del usuario en localStorage
                    localStorage.setItem('user', JSON.stringify({
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL
                    }));
                    
                    // Redireccionar a la página principal
                    window.location.href = "../index.html";
                })
                .catch((error) => {
                    console.error('Error en login con Google:', error);
                    alert('Error al iniciar sesión con Google: ' + error.message);
                });
        });
    } else {
        console.error('No se encontró el botón de Google login');
    }
});