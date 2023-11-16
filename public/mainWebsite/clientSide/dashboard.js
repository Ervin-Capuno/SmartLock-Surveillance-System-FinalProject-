// Function to fetch and display door status in real-time
function fetchDoorStatus(doorStatusRef) {
    onValue(doorStatusRef, (snapshot) => {
        const doorStatus = snapshot.val();
        document.getElementById('doorStatus').textContent = `Door Status: ${doorStatus}`;
    }, (error) => {
        console.error('Error fetching Door Status:', error);
    });
}

// Function to fetch and display vibration status in real-time
function fetchVibrationStatus(vibrationStatusRef) {
    onValue(vibrationStatusRef, (snapshot) => {
        const vibrationStatus = snapshot.val();
        document.getElementById('vibrationStatus').textContent = `Vibration Status: ${vibrationStatus}`;
    }, (error) => {
        console.error('Error fetching Vibration Status:', error);
    });
}

// Function to fetch and display proximity data in real-time
function fetchProximityData(proximityDataRef) {
    onValue(proximityDataRef, (snapshot) => {
        const proximityData = snapshot.val();
        document.getElementById('proximityIn').textContent = `Proximity In: ${proximityData.proximityIn}`;
        document.getElementById('proximityOut').textContent = `Proximity Out: ${proximityData.proximityOut}`;
    }, (error) => {
        console.error('Error fetching Proximity Data:', error);
    });
}

// Function to sign out
function signOutUser() {
    const auth = getAuth();
    signOut(auth)
        .then(() => {
            // Handle successful sign-out, e.g., redirect to sign-in page
            window.location.href = "../signIn.html";
        })
        .catch((error) => {
            console.error("Error logging out:", error);
        });
}

// Function to listen for authentication state changes
function listenForAuthState() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("user Sign in");
        } else {
            console.log("user Log out");
        }
    });
}

// Call the fetch functions, attach event listener, and listen for auth state
window.addEventListener('DOMContentLoaded', () => {
    fetch('/firebase-config')
        .then((response) => response.json())
        .then((firebaseConfig) => {
            // Initialize Firebase with the fetched configuration
            const firebaseApp = initializeApp(firebaseConfig);
            const database = getDatabase(firebaseApp);
            const doorStatusRef = ref(database, 'doorStatus');
            const vibrationStatusRef = ref(database, 'vibrationStatus');
            const proximityDataRef = ref(database, 'proximityData');

            fetchDoorStatus(doorStatusRef);
            fetchProximityData(proximityDataRef);
            fetchVibrationStatus(vibrationStatusRef);

            const logoutButton = document.getElementById('logout-button');
            logoutButton.addEventListener('click', signOutUser);

            listenForAuthState();
        })
        .catch((error) => {
            console.error('Error fetching Firebase configuration:', error);
        });
});
