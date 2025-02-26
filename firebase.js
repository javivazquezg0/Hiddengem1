// Importar las funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDSEQRI2iVueOuzyxIFPtsT07GMTtr5-QI",
  authDomain: "hiddengem-6.firebaseapp.com",
  projectId: "hiddengem-6",
  storageBucket: "hiddengem-6.appspot.com",
  messagingSenderId: "440179498661",
  appId: "1:440179498661:web:ee15c598b931364e7a374c",
  measurementId: "G-6QK3WPKCK5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Obtener el módulo de autenticación
const auth = getAuth(app);

// Exportar las funciones necesarias
export { auth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider };