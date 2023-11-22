document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const container = document.getElementById('container');
    const registerBtn = document.getElementById('register');
    const loginBtn = document.getElementById('login');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const signUpForm = document.getElementById('signUpForm');
    const loginPasswordInput = document.getElementById('loginPassword');
    const toggledPassword = document.getElementById('toggledPassword');

    // Event listeners
    registerBtn.addEventListener('click', () => {
        container.classList.add('active');
    });

    loginBtn.addEventListener('click', () => {
        container.classList.remove('active');
    });

    togglePassword.addEventListener('click', function () {
        // Toggle the password field type
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        confirmPasswordInput.type = type;

        // Toggle icon based on password visibility
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });

    toggledPassword.addEventListener('click', function () {
        // Toggle the login password field type
        const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
        loginPasswordInput.type = type;

        // Toggle icon based on login password visibility
        toggledPassword.classList.toggle('fa-eye');
        toggledPassword.classList.toggle('fa-eye-slash');
    });

    signUpForm.addEventListener('submit', function (event) {
        // Form validation
        const email = document.querySelector('input[name="email"]').value;
        const password = document.querySelector('input[name="password"]').value;
        const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;

        if (!isValidEmail(email)) {
            alert('Please enter a valid email address.');
            event.preventDefault(); // Prevent form submission
        }

        const passwordRegex = /^(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
        if (!passwordRegex.test(password)) {
            alert('Password must be at least 8 characters long and include at least one number and one special character.');
            event.preventDefault(); // Prevent form submission
        }

        if (password !== confirmPassword) {
            alert('Password confirmation does not match password.');
            event.preventDefault(); // Prevent form submission
        }
    });

    function isValidEmail(email) {
        // Use a proper email validation regex for production use
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});