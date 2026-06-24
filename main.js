// ==========================================
// 1. CONFIGURACIÓN DEL LIENZO
// ==========================================
const canvas = document.getElementById('skin-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const GRID_SIZE = 64;

let currentTool = 'lapiz';
let currentColor = document.getElementById('color-picker').value;
let isDrawing = false;
let isPanning = false;

// Variables de Cámara (Zoom y Paneo)
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let lastMouseX = 0;
let lastMouseY = 0;

// Historial (Undo / Redo)
let undoStack = [];
let redoStack = [];

// ==========================================
// 2. CARGAR LA SKIN BASE Y GUARDAR ESTADO INICIAL
// ==========================================
const baseSkin = new Image();
baseSkin.src = './assets/img/walter.png'; 
baseSkin.onload = () => {
    ctx.drawImage(baseSkin, 0, 0, GRID_SIZE, GRID_SIZE);
    saveState(); // Guarda la foto inicial de Walter en el historial
};

// ==========================================
// 3. LÓGICA DE HERRAMIENTAS Y UI
// ==========================================
const btnLapiz = document.getElementById('tool-lapiz');
const btnBorrador = document.getElementById('tool-borrador');
const btnGotero = document.getElementById('tool-gotero');
const btnMover = document.getElementById('tool-mover');
const colorPicker = document.getElementById('color-picker');

function setTool(toolName, activeBtn) {
    currentTool = toolName;
    document.querySelectorAll('.left-toolbar .tool-btn').forEach(btn => btn.classList.remove('activo'));
    activeBtn.classList.add('activo');
}

btnLapiz.addEventListener('click', () => setTool('lapiz', btnLapiz));
btnBorrador.addEventListener('click', () => setTool('borrador', btnBorrador));
btnGotero.addEventListener('click', () => setTool('gotero', btnGotero));
btnMover.addEventListener('click', () => setTool('mover', btnMover));

colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
    setTool('lapiz', btnLapiz); 
});

// ==========================================
// 4. EL BOTÓN DE DONACIÓN A KO-FI
// ==========================================
document.getElementById('btn-donar').addEventListener('click', () => {
    window.open('https://buymeacoffee.com/rgpro', '_blank');
});

// ==========================================
// 5. CÁMARA: ZOOM, PANEO Y ACTUALIZACIÓN VISUAL
// ==========================================
function updateCamera() {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

document.getElementById('btn-zoom-in').addEventListener('click', () => {
    zoomLevel += 0.5;
    updateCamera();
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (zoomLevel > 0.5) {
        zoomLevel -= 0.5;
        updateCamera();
    }
});

// ==========================================
// 6. HISTORIAL: UNDO Y REDO
// ==========================================
function saveState() {
    // Convierte el lienzo en una imagen y la guarda
    undoStack.push(canvas.toDataURL());
    if (undoStack.length > 20) undoStack.shift(); // Límite de 20 pasos
    redoStack = []; // Si dibujas algo nuevo, el futuro (redo) se borra
}

function restoreState(stackToPop, stackToPush) {
    if (stackToPop.length > 0) {
        stackToPush.push(canvas.toDataURL()); // Guarda el estado actual antes de viajar
        const imageState = new Image();
        imageState.src = stackToPop.pop();
        imageState.onload = () => {
            ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
            ctx.drawImage(imageState, 0, 0, GRID_SIZE, GRID_SIZE);
        };
    }
}

document.getElementById('btn-undo').addEventListener('click', () => restoreState(undoStack, redoStack));
document.getElementById('btn-redo').addEventListener('click', () => restoreState(redoStack, undoStack));

// ==========================================
// 7. LÓGICA DE DIBUJO (COMPATIBLE CON ZOOM)
// ==========================================
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    // Soporte para toques de celular (touches[0]) o clic de ratón (clientX)
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: Math.floor((clientX - rect.left) * scaleX),
        y: Math.floor((clientY - rect.top) * scaleY)
    };
}

function actOnPixel(x, y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    if (currentTool === 'lapiz') {
        ctx.fillStyle = currentColor;
        ctx.fillRect(x, y, 1, 1);
    } 
    else if (currentTool === 'borrador') {
        ctx.clearRect(x, y, 1, 1);
    } 
    else if (currentTool === 'gotero') {
        try {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] > 0) {
                const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
                colorPicker.value = hex;
                currentColor = hex;
            }
            setTool('lapiz', btnLapiz);
        } catch (error) {
            console.error(error);
        }
    }
	update3DTexture();
}

function rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toLowerCase();
}

// ==========================================
// 8. UNIFICADOR DE EVENTOS (PC + CELULAR)
// ==========================================
function startAction(e) {
    if (currentTool === 'mover') {
        isPanning = true;
        lastMouseX = e.touches ? e.touches[0].clientX : e.clientX;
        lastMouseY = e.touches ? e.touches[0].clientY : e.clientY;
    } else {
        isDrawing = true;
        saveState(); // Guarda la foto ANTES de rayar el lienzo
        const pos = getMousePos(e);
        actOnPixel(pos.x, pos.y);
    }
}

function moveAction(e) {
    // Previene que la pantalla del celular haga "scroll" mientras dibujas
    e.preventDefault(); 

    if (isPanning && currentTool === 'mover') {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Calcula cuánto se movió el dedo o ratón
        panX += (clientX - lastMouseX);
        panY += (clientY - lastMouseY);
        updateCamera();
        
        lastMouseX = clientX;
        lastMouseY = clientY;
    } else if (isDrawing) {
        const pos = getMousePos(e);
        actOnPixel(pos.x, pos.y);
    }
}

function endAction() {
    isDrawing = false;
    isPanning = false;
}

// Eventos de Ratón (PC)
canvas.addEventListener('mousedown', startAction);
window.addEventListener('mousemove', moveAction, { passive: false });
window.addEventListener('mouseup', endAction);

// Eventos Táctiles (Celular)
canvas.addEventListener('touchstart', startAction, { passive: false });
window.addEventListener('touchmove', moveAction, { passive: false });
window.addEventListener('touchend', endAction);

// ==========================================
// 9. CARGAR SKINS (POR DEFECTO Y PERSONALIZADAS)
// ==========================================

// --- A) Cambiar entre las 8 skins por defecto ---
const selectSkins = document.getElementById('select-default-skins');

// Función maestra para pintar una imagen en el lienzo y reiniciar el historial
function cargarImagenAlCanvas(srcURL) {
    const img = new Image();
    img.src = srcURL;
    img.onload = () => {
        ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE); // Limpia el lienzo
        ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE); // Pinta la nueva skin
        
        // Reinicia el historial para que no puedas darle "Undo" y regresar a la skin anterior
        undoStack = [];
        redoStack = [];
        saveState(); 
		update3DTexture();
    };
    img.onerror = () => {
        alert("🚨 Error: No se encontró la imagen. Revisa que el archivo exista en " + srcURL);
    };
}

// Escucha cuando el usuario elige una skin del menú desplegable
selectSkins.addEventListener('change', (e) => {
    cargarImagenAlCanvas(e.target.value);
});

// --- B) Cargar archivo PNG personalizado desde el PC/Celular ---
const btnCargar = document.getElementById('btn-cargar');
const inputCargar = document.getElementById('input-cargar-skin');

// Cuando tocan el botón del ícono, simulamos un clic en el input invisible
btnCargar.addEventListener('click', () => {
    inputCargar.click(); 
});

// Cuando el usuario termina de elegir su archivo en la ventana de Windows/Android
inputCargar.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return; // Si canceló la ventana, no hace nada

    // Filtro de seguridad 1: Que sea formato PNG
    if (file.type !== "image/png") {
        alert("⚠️ Formato inválido: Por favor, selecciona una imagen PNG.");
        e.target.value = ''; // Resetea el input
        return;
    }

    // Leemos el archivo físico de su disco duro/memoria
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            // Filtro de seguridad 2: Que sea exactamente de 64x64
            if (img.width !== 64 || img.height !== 64) {
                alert(`⚠️ Tamaño incorrecto: La skin debe medir 64x64 píxeles. Tu imagen mide ${img.width}x${img.height}.`);
                return;
            }
            
            // Si pasa las pruebas, la pintamos y reiniciamos el historial
            ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
            ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
            undoStack = [];
            redoStack = [];
            saveState();
        };
    };
    reader.readAsDataURL(file); // Activa el lector
    
    // Reseteamos el input para que pueda volver a cargar el mismo archivo si quiere
    e.target.value = '';
});

// ==========================================
// 10. GUARDAR / EXPORTAR SKIN
// ==========================================
const btnGuardar = document.getElementById('btn-guardar');

btnGuardar.addEventListener('click', () => {
    // 1. Extraemos el arte del lienzo tal cual está
    // Aunque diga 'image/png', lo que saca es código de imagen puro
    const dataURL = canvas.toDataURL('image/png');
    
    // 2. Creamos un enlace (etiqueta <a>) invisible en el aire
    const linkInvisble = document.createElement('a');
    linkInvisble.href = dataURL;
    
    // 3. ¡El truco de la extensión! 
    // Al decirle al navegador que el archivo se llama así, forzamos el formato .scskin
    linkInvisble.download = 'skin_rgpro_custom.scskin'; 
    
    // 4. Lo inyectamos en la página, le damos clic mágicamente y lo destruimos
    document.body.appendChild(linkInvisble);
    linkInvisble.click();
    document.body.removeChild(linkInvisble);
});

// ==========================================
// 11. EL MOTOR 3D (THREE.JS)
// ==========================================
const container3D = document.getElementById('preview-3d-container');
const btn3D = document.getElementById('btn-3d');
const btnCerrar3D = document.getElementById('btn-cerrar-3d');

// Variables globales del motor
let scene, camera, renderer, controls;
let scModel; // Tu Player.glb
let skinTexture3D;

// Inicializa la escena 3D solo la primera vez que tocan el botón
let is3DInitialized = false;

function init3D() {
    if (is3DInitialized) return;
    is3DInitialized = true;

    // 1. Crear Escena y Cámara
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#1E1E1E'); // Mismo fondo oscuro

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5); // Alejar la cámara para ver el modelo entero

    // 2. Renderizador (Usa el canvas que estaba oculto en el HTML)
    const canvas3D = document.getElementById('canvas-3d');
    renderer = new THREE.WebGLRenderer({ canvas: canvas3D, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 3. Luces (Para que el modelo no se vea como una mancha negra)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Luz global blanca
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(2, 5, 5);
    scene.add(dirLight);

    // 4. Controles (Para rotarlo con el dedo/ratón)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; // Solo permite rotar y hacer zoom

    // 5. ¡LA MAGIA DE LA TEXTURA!
    // Creamos una textura dinámica que "lee" directamente tu canvas 2D
    skinTexture3D = new THREE.CanvasTexture(canvas);
	skinTexture3D.flipY = false;
    // Estos dos comandos evitan que Three.js difumine el Pixel Art
    skinTexture3D.magFilter = THREE.NearestFilter; 
    skinTexture3D.minFilter = THREE.NearestFilter;

    // 6. Cargar el modelo Player.glb
    const loader = new THREE.GLTFLoader();
    loader.load('./assets/models/Player.glb', (gltf) => {
        scModel = gltf.scene;
        
        // Centramos el modelo a la altura de la cintura
        scModel.position.y = -1;

        // Recorremos todas las partes del modelo para ponerles el material
        scModel.traverse((child) => {
            if (child.isMesh) {
                // Le asignamos el material con tu textura de 64x64
                child.material = new THREE.MeshStandardMaterial({ 
                    map: skinTexture3D,
                    roughness: 0.8, // Que no brille como plástico
                });
            }
        });

        scene.add(scModel);
		// --- NUEVA LÓGICA: ESCUCHAR LOS CHECKBOXES ---
        const checkboxes = document.querySelectorAll('#panel-partes-3d input[type="checkbox"]');
        checkboxes.forEach(chk => {
            chk.addEventListener('change', (e) => {
                const partName = e.target.getAttribute('data-part');
                const isVisible = e.target.checked;
                
                // En lugar de agarrar lo primero que encuentre, escaneamos todo el modelo
                scModel.traverse((child) => {
                    // Condición estricta: ¿Te llamas igual Y además eres la malla (polígonos)?
                    if (child.isMesh && child.name === partName) {
                        child.visible = isVisible; 
                    }
                });
            });
        });
        // ---------------------------------------------
		
    }, undefined, (error) => {
        console.error("🚨 Error al cargar el Player.glb:", error);
    });

    // Iniciar el ciclo de renderizado (Animación a 60fps)
    animate3D();
}

// Bucle infinito que dibuja el 3D
function animate3D() {
    requestAnimationFrame(animate3D);
    controls.update(); // Actualiza la rotación suave
    renderer.render(scene, camera);
}

// ==========================================
// 12. ACTUALIZACIÓN EN TIEMPO REAL Y UI DEL 3D
// ==========================================

// Función vital: Le avisa a la tarjeta gráfica que cambiaste un color en el 2D
function update3DTexture() {
    if (skinTexture3D) {
        skinTexture3D.needsUpdate = true;
    }
}

// Abrir el visor
btn3D.addEventListener('click', () => {
    init3D();
    container3D.classList.remove('oculto');
    // Para que la ventana ocupe toda la pantalla
    container3D.style.position = 'fixed';
    container3D.style.top = '0';
    container3D.style.left = '0';
    container3D.style.width = '100vw';
    container3D.style.height = '100vh';
    container3D.style.zIndex = '9999';
    // Forzamos la textura a leer el canvas actual
    update3DTexture(); 
});

// Cerrar el visor
btnCerrar3D.addEventListener('click', () => {
    container3D.classList.add('oculto');
});

// Ajustar el 3D si giran el celular
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});