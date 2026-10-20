// Ruta a la carpeta de tu modelo (asegúrate de que los archivos estén en /model)
const URL = "./modelo/";

let model, webcam, labelContainer, maxPredictions;
let isPlaying = false;
let historyArray = [];
let lastHistoryTime = 0;

// Cargar el modelo de imagen
async function loadModel() {
    if (!model) {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        
        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
    }
}

// Iniciar WebCam
async function init() {
    await loadModel();
    document.getElementById("uploaded-image").style.display = "none";
    document.getElementById("webcam-container").style.display = "block";

    const flip = true; 
    webcam = new tmImage.Webcam(400, 400, flip);
    await webcam.setup();
    await webcam.play();
    
    isPlaying = true;
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").innerHTML = "";
    document.getElementById("webcam-container").appendChild(webcam.canvas);

    document.getElementById("btn-start").disabled = true;
    document.getElementById("btn-stop").disabled = false;
}

// Detener WebCam
function stopWebcam() {
    if (webcam && isPlaying) {
        webcam.stop();
        isPlaying = false;
        document.getElementById("btn-start").disabled = false;
        document.getElementById("btn-stop").disabled = true;
    }
}

// Bucle de cámara
async function loop() {
    if (isPlaying) {
        webcam.update();
        await predict(webcam.canvas);
        window.requestAnimationFrame(loop);
    }
}

// Subida manual de imagen
document.getElementById('image-upload').addEventListener('change', async function(e) {
    stopWebcam();
    await loadModel();
    
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const imgElement = document.getElementById('uploaded-image');
            imgElement.src = event.target.result;
            imgElement.style.display = 'block';
            document.getElementById('webcam-container').style.display = 'none';
            
            imgElement.onload = async function() {
                await predict(imgElement);
            }
        }
        reader.readAsDataURL(file);
    }
});

// Actualizar visualización del umbral
document.getElementById('threshold').addEventListener('input', function(e) {
    document.getElementById('threshold-val').innerText = parseFloat(e.target.value).toFixed(2);
});

// Función central de predicción
async function predict(imageElement) {
    const predictions = await model.predict(imageElement);
    const threshold = parseFloat(document.getElementById('threshold').value);
    
    let bestMatch = { className: "", probability: 0 };

    // Mostrar barras y buscar el mejor resultado
    for (let i = 0; i < maxPredictions; i++) {
        const probResult = predictions[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = `${predictions[i].className}: ${(probResult * 100).toFixed(0)}%`;
        
        if (predictions[i].probability > bestMatch.probability) {
            bestMatch = predictions[i];
        }
    }

    const customMessage = document.getElementById('custom-message');
    
    // Evaluar coincidencia con el umbral establecido
    if (bestMatch.probability >= threshold) {
        customMessage.innerText = `¡Detectado! Es un(a) "${bestMatch.className}" ✅`;
        customMessage.className = "success";
        addToHistory(bestMatch.className, bestMatch.probability);
    } else {
        customMessage.innerText = "Ninguna coincidencia supera el umbral establecido ⏳";
        customMessage.className = "waiting";
    }
}

// Guardar historial (con un pequeño retardo para no saturar al usar cámara)
function addToHistory(className, prob) {
    const now = Date.now();
    // Solo registra máximo 1 vez por segundo
    if (now - lastHistoryTime < 1000) return;
    lastHistoryTime = now;
    
    const time = new Date().toLocaleTimeString();
    const item = `[${time}] ${className} - ${(prob * 100).toFixed(1)}% de seguridad`;
    
    historyArray.unshift(item);
    if(historyArray.length > 5) historyArray.pop(); // Guardar solo los últimos 5
    
    const list = document.getElementById('history-list');
    list.innerHTML = "";
    historyArray.forEach(text => {
        const li = document.createElement("li");
        li.innerText = text;
        list.appendChild(li);
    });
}