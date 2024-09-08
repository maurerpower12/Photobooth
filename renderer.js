document.addEventListener('DOMContentLoaded', () => {
    const states = {
        idle: document.getElementById('idle-state'),
        prepareForCountdown: document.getElementById('prepare-for-countdown-state'),
        countdownSequence: document.getElementById('countdown-sequence-state'),
        review: document.getElementById('review-state')
    };

    const COUNTDOWN_TIME_IN_SECONDS = 3;
    const NUMBER_OF_PICTURES = 2;
    const PHOTO_INSTRUCTIONS = ["Get Ready!", "Strike a Pose!", "Say Cheese!", "You look great!"];
    const webcamElement = document.getElementById('camera-feed');
    const canvasElement = document.getElementById('camera-canvas');
    const onPhotoTakenAudio = new Audio('./assets/audio/onPhotoTaken.mp3');
    const onCountdownAudio = new Audio('./assets/audio/onCountdown.wav');
    const webcam = new Webcam(webcamElement, 'user', canvasElement, onPhotoTakenAudio);
    const videoAspectRation = 1.0;

    // Compostite Settings
    const NUMBER_OF_COLS = 2;
    const NUMBER_OF_ROWS = 2;
    const PATH_TO_COMPOSITE = './assets/img/gridTemplate.png';

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
            setTimeout(() => {
                switchState('countdownSequence');
                startCountdown(COUNTDOWN_TIME_IN_SECONDS, takePhoto);
            }, 2000);
        } else {
            switchState('review');
            displayCapturedPhotos();
            createCompositePhoto();
            startReviewTimeout();
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
        flashElement.style.position = 'absolute';
        flashElement.style.top = '0';
        flashElement.style.left = '0';
        flashElement.style.width = '100vh';
        flashElement.style.height = '100vw';
        flashElement.style.backgroundColor = 'orange';
        flashElement.style.opacity = '0';
        flashElement.style.transition = 'opacity 0.5s';
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
        }, 300000); // 5 minutes
    }

    /**
     * Initializes the application.
     */
    function initializeApp() {
        switchState('idle');
    }

    /**
     * Returns the date time in string format
     */
    function getDateTime() {
        let date = new Date();
    
        let dateString = date.toLocaleDateString("en-US", {month: 'numeric', day: 'numeric', year: 'numeric'});
        let timeString = date.toLocaleTimeString("en-US", {hour: 'numeric', minute: 'numeric', second: 'numeric' , hour12: true});
        return `${dateString}-${timeString}`;
    }

    /**
     * Saves the photo to disk.
     */
    function savePhoto() {
        let picture = webcam.snap();
        const fileName = `photobooth${pictureCounter}@${getDateTime()}.jpg`;
        pictureCounter++;

        var a = document.createElement('a');
        a.setAttribute('href', picture);
        capturedPhotos.push(picture);
        a.setAttribute('download', fileName);
    
        var aj = $(a);
        aj.appendTo('body');
        aj[0].click();
        aj.remove();

        uploadImage(picture,fileName);
    }

    /**
     * Displays the captures photos in the thumbnails.
     */
    function displayCapturedPhotos() {
        const thumbnailsDiv = document.getElementById('thumbnails');
        thumbnailsDiv.innerHTML = '';

        capturedPhotos.forEach((photoUrl, index) => {
            const img = document.createElement('img');
            img.src = photoUrl;
            img.onload = () => {
                thumbnailsDiv.appendChild(img);
            }
        });
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

            const photoWidth = 987.6;
            const photoHeight = 652.5;
            const photoPositions = [
                { x: 43.1, y: 67.8, width: photoWidth, height: photoHeight }, // photo 1
                { x: 43.1, y: 731.3, width: photoWidth, height: photoHeight }, // photo 2
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
                    }
                }
            });
        }
    }

    /**
     * Displays a composite photo from all captured photos.
     * @param {string} compositeImageUrl - the data url of the composite image.
     */
    function displayCompositePhoto(compositeImageUrl) {
        const compositeDiv = document.getElementById('composite-photo');
        const img = document.createElement('img');
        const fileName = `photoboothComposite${++sessionIndex}@${getDateTime()}.jpg`;
        img.src = compositeImageUrl;
        img.alt = "Compositie Photo";
        img.width = 400 * NUMBER_OF_COLS;
        img.height = 300 * NUMBER_OF_ROWS;
        compositeDiv.innerHTML = '';
        compositeDiv.appendChild(img);

        var a = document.createElement('a');
        a.setAttribute('href', compositeImageUrl);
        a.setAttribute('download', fileName);
    
        var aj = $(a);
        aj.appendTo('body');
        aj[0].click();
        aj.remove();

        uploadImage(compositeImageUrl, fileName);
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
    async function uploadImage(image, fileName) {
        const formData = new FormData();

        // Convert Base64 URL to Blob
        const blob = dataURLToBlob(image);

        // Create a FormData object
        formData.append('photo', blob, fileName);
        formData.append('fileName', fileName);
        console.log('Attempting to upload: ' + fileName);
      
        try {
            const response = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData
              });
            
              if (!response.success) {
                throw new Error('Failed to Upload to Backend: Response was bad');
              }
        } catch(e) {
            throw new Error('Failed to Upload to Backend: ' + e);
        }

      
        const data = await response.json();
        return data.fileId;
    }

    /**
     * Checks the status of the backend service.
     */
    function checkServerStatus() {
        if (enforeHealthCheck) {
            fetch(healthCheckEndpoint)
            .then(response => {
                if (response.ok) {
                    backendConnectionState.innerHTML = "Connected";
                    backendConnectionState.style.color = "green";
                } else {
                    backendConnectionState.innerHTML = "Server is down. Retrying...";
                    backendConnectionState.style.color = "red";
                    setTimeout(checkServerStatus, timeoutMs);
                }
            })
            .catch(error => {
                backendConnectionState.innerHTML = "[ERROR] Server is down. Retrying...";
                backendConnectionState.style.color = "red";
                setTimeout(checkServerStatus, timeoutMs);
            });
        }
    }

    // Event listeners
    document.getElementById('start-button').addEventListener('click', () => {
        switchState('prepareForCountdown');
        startPhotoCaptureSequence();
    });

    document.getElementById('done-button').addEventListener('click', () => {
        clearTimeout(reviewTimeout);
        switchState('idle');
    });

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && currentState === 'idle') {
            switchState('prepareForCountdown');
            startPhotoCaptureSequence();
        }
    });

    // Initialize the app
    initializeApp();
    startLiveCameraFeed();
    checkServerStatus();
});
