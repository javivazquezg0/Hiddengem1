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
                .then(async (result) => {
                    const user = result.user;
                    console.log('Usuario logueado con Google:', user);
                    
                    try {
                        // Convertir la información del usuario a un formato más simple
                        const userData = {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.email.split('@')[0],
                            photoURL: user.photoURL
                        };
                        
                        console.log('Enviando datos al servidor:', userData);
                        
                        // Enviar datos del usuario al backend para obtener un token JWT
                        const response = await fetch('/api/auth/google', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(userData)
                        });
                        
                        let errorMessage = 'Error desconocido';
                        
                        try {
                            const responseData = await response.json();
                            
                            if (!response.ok) {
                                errorMessage = responseData.error || 'Error en la respuesta del servidor';
                                throw new Error(errorMessage);
                            }
                            
                            // Si llegamos aquí, la respuesta fue exitosa
                            // Guardar el token JWT y la información del usuario
                            localStorage.setItem('token', responseData.token);
                            localStorage.setItem('user', JSON.stringify(responseData.user));
                            
                            // Mostrar mensaje de éxito
                            alert(`Bienvenido, ${user.displayName || 'Usuario'}`);
                            
                            // Redireccionar a la página principal
                            window.location.href = "../index.html";
                        } catch (parseError) {
                            console.error('Error al procesar respuesta JSON:', parseError);
                            throw new Error('Error al procesar la respuesta del servidor');
                        }
                    } catch (error) {
                        console.error('Error al verificar con el servidor:', error);
                        alert('Error al iniciar sesión: ' + error.message);
                    }
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