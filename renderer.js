document.addEventListener('DOMContentLoaded', () => {
    const states = {
        idle: document.getElementById('idle-state'),
        prepareForCountdown: document.getElementById('prepare-for-countdown-state'),
        countdownSequence: document.getElementById('countdown-sequence-state'),
        review: document.getElementById('review-state')
    };

    const COUNTDOWN_TIME_IN_SECONDS = 3;
    const NUMBER_OF_PICTURES = 4;
    const PHOTO_INSTRUCTIONS = ["Get Ready!", "Strike a Pose!", "Say Cheese!"];
    const webcamElement = document.getElementById('camera-feed');
    const canvasElement = document.getElementById('camera-canvas');
    const snapSoundElement = new Audio('/audio/onPhotoTaken.wav');
    const webcam = new Webcam(webcamElement, 'user', canvasElement, snapSoundElement);
    // Compostite Settings
    const NUMBER_OF_COLS = 2;
    const NUMBER_OF_ROWS = 2;

    let currentState = 'idle';
    let photoIndex = 0;
    let sessionIndex = 0;
    let countdownInterval;
    let reviewTimeout;
    let pictureCounter = 0;
    let capturedPhotos = [];

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
        const audio = new Audio('./Audio/onCountdown.wav');
        const countdownElement = document.getElementById('countdown-timer');
        countdownElement.innerText = seconds;
        audio.play();
        countdownInterval = setInterval(() => {
            seconds--;
            countdownElement.innerText = seconds;
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                onComplete();
            } else {
                audio.play();
            }
        }, 1000);
    }

    /**
     * Takes a photo and flashes the screen.
     */
    function takePhoto() {
        // Simulate photo taking
        console.log('Photo taken');
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
        flashElement.style.width = '100%';
        flashElement.style.height = '100%';
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
        pictureCounter++;

        var a = document.createElement('a');
        a.setAttribute('href', picture);
        capturedPhotos.push(picture);
        a.setAttribute('download', `photobooth${pictureCounter}@${getDateTime()}.jpg`);
    
        var aj = $(a);
        aj.appendTo('body');
        aj[0].click();
        aj.remove();
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
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const photoWidth = 400;
        const photoHeight = 300;
        canvas.width = photoWidth * NUMBER_OF_COLS;
        canvas.height = photoHeight * NUMBER_OF_ROWS;

        capturedPhotos.forEach((photoUrl, index) => {
            const img = new Image();
            img.src = photoUrl;
            img.onload = () => {
                const col = index % NUMBER_OF_COLS;
                const row = Math.floor(index / NUMBER_OF_COLS);
                context.drawImage(img, col * photoWidth, row * photoHeight, photoWidth, photoHeight);
                if (index === capturedPhotos.length -1) {
                    const compositeImageUrl = canvas.toDataURL('image/png');
                    displayCompositePhoto(compositeImageUrl);
                }
            }
        });
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
        img.width = 400 * NUMBER_OF_COLS;
        img.height = 300 * NUMBER_OF_ROWS;
        compositeDiv.innerHTML = '';
        compositeDiv.appendChild(img);

        var a = document.createElement('a');
        a.setAttribute('href', compositeImageUrl);
        a.setAttribute('download', `photoboothComposite${++sessionIndex}@${getDateTime()}.jpg`);
    
        var aj = $(a);
        aj.appendTo('body');
        aj[0].click();
        aj.remove();
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
});
