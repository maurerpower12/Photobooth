document.addEventListener('DOMContentLoaded', () => {
    const states = {
        idle: document.getElementById('idle-state'),
        prepareForCountdown: document.getElementById('prepare-for-countdown-state'),
        countdownSequence: document.getElementById('countdown-sequence-state'),
        review: document.getElementById('review-state')
    };

    const COUNTDOWN_TIME_IN_SECONDS = 3;
    const NUMBER_OF_PICTURES = 2;
    const PHOTO_INSTRUCTIONS = ["Get Ready 😊", "Strike a Pose 🕺", "Say Cheese 🧀", "Looking good 😉", "Don't blink 😑"];
    const webcamElement = document.getElementById('camera-feed');
    const canvasElement = document.getElementById('camera-canvas');
    const onPhotoTakenAudio = new Audio('https://raw.githubusercontent.com/maurerpower12/Photobooth/95c937eb5e6f909b1e661b9ae6e812210deb9057/assets/audio/onPhotoTaken.mp3');
    const onCountdownAudio = new Audio('https://raw.githubusercontent.com/maurerpower12/Photobooth/95c937eb5e6f909b1e661b9ae6e812210deb9057/assets/audio/onCountdown.wav');
    const webcam = new Webcam(webcamElement, 'user', canvasElement, onPhotoTakenAudio);
    const DOWNLOAD_LOCALLY = false;

    // Compostite Settings
    const PATH_TO_COMPOSITE = 'https://raw.githubusercontent.com/maurerpower12/Photobooth/refs/heads/main/assets/img/CompositeTemplate.png';

    const photoWidth = 960; // Keep in mind the picture size is 1920x1080
    const photoHeight = 540;

    let currentState = 'idle';
    let photoIndex = 0;
    let sessionIndex = 0;
    let countdownInterval;
    let reviewTimeout;
    let pictureCounter = 0;
    let capturedPhotos = [];

    // Backend settings
    const backendConnectionState = document.getElementById("backend-connection-state");
    const healthCheckEndpoint = `http://localhost:3000/api/healthcheck`;
    const enforeHealthCheck = true;
    const timeoutMs = 5000;

    // Attract settings
    const timeBeforeAttractsStart = 3*60*1000; // 3 minutes
    const attract1 = document.getElementById("attract-1");
    let idleTimer;

    /**
     * Switches the application to the specified state.
     * @param {string} newState - The new state to switch to.
     */
    function switchState(newState) {
        states[currentState].classList.remove('active');
        currentState = newState;
        states[currentState].classList.add('active');
        document.getElementById('state-display').innerText = `State: ${newState}`;
        console.log(`State: ${newState}`);
        if (newState === 'idle') {
            // Start the initial idle timer
            resetIdleTimer();
        }
    }

    /**
     * Starts the live camera feed.
     */
    function startLiveCameraFeed() {
        webcam.start()
            .then(result => {
                console.log("webcam started: " + result);
            })
            .catch(err => {
                console.log("webcam error: " + err);
            });
    }

    /**
     * Starts the photo capture sequence.
     */
    function startPhotoCaptureSequence() {
        capturedPhotos = [];
        photoIndex = 0;
        captureNextPhoto();
    }

    /**
     * Captures the next photo in the sequence.
     */
    function captureNextPhoto() {
        if (photoIndex < NUMBER_OF_PICTURES) {
            switchState('prepareForCountdown');
            showRandomInstruction();
            setPhotoCountState(photoIndex+1);
            setTimeout(() => {
                switchState('countdownSequence');
                startCountdown(COUNTDOWN_TIME_IN_SECONDS, takePhoto);
            }, 2000);
        } else {
            switchState('review');
            createCompositePhoto();
            startReviewTimeout();
            displayCamera(false);
        }
    }

    /**
     * Shows a random photo instruction from the array.
     */
    function showRandomInstruction() {
        const instruction = PHOTO_INSTRUCTIONS[Math.floor(Math.random() * PHOTO_INSTRUCTIONS.length)];
        document.getElementById('photo-instructions').innerText = instruction;
    }

    /**
     * Starts a countdown timer and calls a callback function when the timer ends.
     * @param {number} seconds - The number of seconds for the countdown.
     * @param {function} onComplete - The callback function to call when the countdown is complete.
     */
    function startCountdown(seconds, onComplete) {
        const countdownElement = document.getElementById('countdown-timer');
        countdownElement.innerText = seconds;
        onCountdownAudio.play();
        countdownInterval = setInterval(() => {
            seconds--;
            countdownElement.innerText = seconds;
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                onComplete();
            } else {
                onCountdownAudio.play();
            }
        }, 1000);
    }

    /**
     * Takes a photo and flashes the screen.
     */
    function takePhoto() {
        onPhotoTakenAudio.play();
        flashScreen();
        savePhoto();
        photoIndex++;
        captureNextPhoto();
    }

    /**
     * Flashes the screen with a specified color.
     */
    function flashScreen() {
        const flashElement = document.createElement('div');
        flashElement.id = 'flash';
        document.body.appendChild(flashElement);
            flashElement.style.opacity = '1';
        setTimeout(() => {
            flashElement.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(flashElement);
            }, 500);
        }, 100);
    }

    /**
     * Starts the review timeout which switches back to idle state after a specified time.
     */
    function startReviewTimeout() {
        reviewTimeout = setTimeout(() => {
            switchState('idle');
            displayCamera(true);
            resetState();
        }, 300000); // 5 minutes
    }

    /**
     * Initializes the application.
     */
    function initializeApp() {
        switchState('idle');
        displayCamera(true);

        document.getElementById('attractExampleImage').src = PATH_TO_COMPOSITE;
    }

    /**
     * Clear any pending state items
     */
    function resetState() {
        // TODO - ideally set this to a loading image
        const div = document.getElementById("qrCode");
        div.innerHTML = "";

        const compositeDiv = document.getElementById('composite-photo');
        compositeDiv.innerHTML = '';
    }

    /**
     * Returns the date time in a file name-safe string format
     */
    function getDateTime() {
        let date = new Date();

        let dateString = date.toLocaleDateString("en-US", { month: 'numeric', day: 'numeric', year: 'numeric' })
            .replace(/\//g, '-'); // Replace slashes with hyphens

        let timeString = date.toLocaleTimeString("en-US", { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })
            .replace(/:/g, '-')   // Replace colons with hyphens
            .replace(/ /g, '-');   // Replace spaces with hyphens

        return `${dateString}-${timeString}`;
    }

    /**
     * Saves the photo to disk.
     */
    function savePhoto() {
        let picture = webcam.snap();
        const fileName = `photobooth${pictureCounter}@${getDateTime()}.png`;
        pictureCounter++;
        capturedPhotos.push(picture);
        if (DOWNLOAD_LOCALLY) {
            var a = document.createElement('a');
            a.setAttribute('href', picture);
            a.setAttribute('download', fileName);
        
            var aj = $(a);
            aj.appendTo('body');
            aj[0].click();
            aj.remove();
        }
        uploadImage(picture,fileName, false);
    }

    /**
     * Creates a composite photo from all captured photos.
     */
    function createCompositePhoto() {
        const template = new Image();
        template.src = PATH_TO_COMPOSITE;
        template.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = template.width;
            canvas.height = template.height;
            context.drawImage(template, 0, 0);


            const photoPositions = [
                { x: 60, y: 150.3, width: photoWidth, height: photoHeight }, // photo 1
                { x: 60, y: 747.5, width: photoWidth, height: photoHeight }, // photo 2
            ]

            capturedPhotos.forEach((photoUrl, index) => {
                const img = new Image();
                img.src = photoUrl;
                img.onload = () => {
                    const pos = photoPositions[index];
                    context.drawImage(img, pos.x, pos.y, pos.width, pos.height);
                    if (index === capturedPhotos.length -1) {
                        const compositeImageUrl = canvas.toDataURL('image/png');
                        displayCompositePhoto(compositeImageUrl);
                        uploadImage(compositeImageUrl, `photoboothComposite${++sessionIndex}@${getDateTime()}.png`, true);
                    }
                }
            });
        }
        template.onerror = (error) => {
            console.error("Could not load template: " + JSON.stringify(error));
        }
    }

    /**
     * Displays a composite photo from all captured photos.
     * @param {string} compositeImageUrl - the data url of the composite image.
     */
    function displayCompositePhoto(compositeImageUrl) {
        const compositeDiv = document.getElementById('composite-photo');
        const img = document.createElement('img');
        img.src = compositeImageUrl;
        img.alt = "Compositie Photo";
        compositeDiv.innerHTML = '';
        compositeDiv.appendChild(img);

        if (DOWNLOAD_LOCALLY) {
            var a = document.createElement('a');
            a.setAttribute('href', compositeImageUrl);
            a.setAttribute('download', fileName);
        
            var aj = $(a);
            aj.appendTo('body');
            aj[0].click();
            aj.remove();
        }
    }

    /**
     * Helper function to convert Base64 data URL to Blob
    */
    function dataURLToBlob(dataURL) {
        const parts = dataURL.split(';base64,');
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1];

        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
        }

        return new Blob([arrayBuffer], { type: mimeString });
    }

    /**
     * Uploads an image file to the backend.
     */
    async function uploadImage(image, fileName, uploadToRemote) {
        const qr = document.getElementById("qr-Header-text");
        const formData = new FormData();

        // Convert Base64 URL to Blob
        const blob = dataURLToBlob(image);

        // Create a FormData object
        formData.append('photo', blob, fileName);
        formData.append('filename', fileName);
        formData.append('uploadToRemote', uploadToRemote);
        console.log('Attempting to upload: ' + fileName);
      
        try {
            const response = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData
              });
            
              if (!response.ok) {
                throw new Error('Failed to Upload to Backend: Response was bad');
              }
              const data = await response.json();
              console.log("Backend rsp: " + JSON.stringify(data));

              if (uploadToRemote === true) {
                console.log("Attempting to make a QR code for " + data.imageUrl);
                displayQRCode(data.imageUrl);
                webcamElement.classList.remove("d-none");
              }
        } catch(e) {
            qr.classList.add("d-none");
            throw new Error('Failed to Upload to Backend: ' + e);
        }
    }

    /**
     * Checks the status of the backend service.
     */
    function checkServerStatus() {
        if (enforeHealthCheck) {
            fetch(healthCheckEndpoint)
            .then(response => {
                if (response.ok) {
                    backendConnectionState.innerHTML = "✅";
                } else {
                    backendConnectionState.innerHTML = "❌";
                }
                setTimeout(checkServerStatus, timeoutMs);
            })
            .catch(error => {
                backendConnectionState.innerHTML = "⛔️";
                setTimeout(checkServerStatus, timeoutMs);
            });
        }
    }

    function displayCamera(state) {
        if (!state) {
            webcamElement.classList.add("d-none");
        } else {
            webcamElement.classList.remove("d-none");
        }
    }

    function displayQRCode(photoUrl) {
        const div = document.getElementById("qrCode");
        div.innerHTML = "";

        QrCreator.render({
            text: photoUrl,
            radius: 0.1, // 0.0 to 0.5
            ecLevel: 'H', // L, M, Q, H
            fill: '#000000', // foreground color
            background: null, // color or null for transparent
            size: 275 // in pixels
          }, div);
    }

    function setPhotoCountState(index) {
        let elements = document.querySelectorAll('#photo-remainder-counter');
        for(var i = 0; i < elements.length; i++) {
            elements[i].textContent = `${index} of ${NUMBER_OF_PICTURES}`
        }

    }

    // Function to start attract mode
    function startAttractMode() {
        if (currentState === 'idle') {
            console.log("Attract mode started.");
            attract1.classList.remove("d-none");
        }
    }

    // Function to stop attract mode
    function stopAttractMode() {
        console.log("Attract mode stopped.");
        attract1.classList.add("d-none");
        resetIdleTimer();
    }

    // Function to reset the idle timer
    function resetIdleTimer() {
        clearTimeout(idleTimer); // Clear any existing timer
        idleTimer = setTimeout(startAttractMode, timeBeforeAttractsStart);
    }

    // Function to detect user activity and reset idle timer
    function activityDetected() {
        if (currentState === 'idle') {
            console.log("Activity Detected.");
            stopAttractMode();
            resetIdleTimer();
        }
    }

    // Event listeners for detecting user activity
    window.addEventListener('keydown', activityDetected);
    window.addEventListener('mousedown', activityDetected);

    // Event listeners
    document.getElementById('start-button').addEventListener('click', () => {
        stopAttractMode();
        switchState('prepareForCountdown');
        startPhotoCaptureSequence();
    });

    document.getElementById('done-button').addEventListener('click', () => {
        clearTimeout(reviewTimeout);
        displayCamera(true);
        resetState();
        switchState('idle');
    });

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && currentState === 'idle') {
            stopAttractMode();
            switchState('prepareForCountdown');
            startPhotoCaptureSequence();
        }
    });
    document.getElementById('flash-button').addEventListener('click', () => {
        flashScreen();
    });

    // Initialize the app
    initializeApp();
    startLiveCameraFeed();
    checkServerStatus();
});
