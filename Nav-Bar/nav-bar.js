    //Evento de expandir al pasar el cursor
    document.addEventListener('DOMContentLoaded', function() {
        const cloud = document.getElementById("cloud");
        const barraLateral = document.querySelector(".barra-lateral");
        const spans = document.querySelectorAll(".barra-lateral span");
        const palanca = document.querySelector(".switch");
        const circulo = document.querySelector(".circulo");
        const menu = document.querySelector(".menu");
        const main = document.querySelector("main");
    
        // Función para contraer la barra
        function contraerBarra() {
            barraLateral.classList.remove("expandida");
            spans.forEach((span) => {
                span.classList.add("oculto");
            });
        }
    
        // Función para expandir la barra
        function expandirBarra() {
            barraLateral.classList.add("expandida");
            spans.forEach((span) => {
                span.classList.remove("oculto");
            });
        }
    
        // Inicialmente, la barra está contraída
        contraerBarra();
    
        // Verificar si la ventana es pequeña al cargar la página
        if (window.innerWidth <= 600) {
            barraLateral.classList.add("mini-barra-lateral");
            contraerBarra();
        }
    
        // Evento de hover para expandir/contraer la barra
        barraLateral.addEventListener("mouseenter", expandirBarra);
        barraLateral.addEventListener("mouseleave", contraerBarra);
    
        // Evento de clic en el menú responsive
        menu.addEventListener("click", () => {
            barraLateral.classList.toggle("max-barra-lateral");
            if (barraLateral.classList.contains("max-barra-lateral")) {
                menu.children[0].style.display = "none";
                menu.children[1].style.display = "block";
                // Si el menú está abierto en modo responsive, mantenerlo expandido
                expandirBarra();
            } else {
                menu.children[0].style.display = "block";
                menu.children[1].style.display = "none";
                // Si se cierra el menú en modo responsive, contraerlo
                contraerBarra();
            }
        });
    
        // Evento de clic en el switch de modo oscuro
        palanca.addEventListener("click", () => {
            let body = document.body;
            body.classList.toggle("dark-mode");
            circulo.classList.toggle("prendido");
        });
    
        // Evento de clic en el icono de contracción (ahora solo actúa como toggle manual)
        cloud.addEventListener("click", () => {
            if (barraLateral.classList.contains("expandida")) {
                contraerBarra();
            } else {
                expandirBarra();
            }
            if (main) {
                main.classList.toggle("min-main");
            }
        });
    
        // Ajustar barra en cambio de tamaño de ventana
        window.addEventListener('resize', function() {
            if (window.innerWidth <= 600) {
                contraerBarra();
                barraLateral.classList.remove("expandida");
                if (!barraLateral.classList.contains("max-barra-lateral")) {
                    barraLateral.classList.remove("expandida");
                }
            }
        });
    });