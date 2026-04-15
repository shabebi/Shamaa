$(document).ready(async function() {
    const API_BASE = window.location.origin;

    // Check if user is already logged in
    try {
        const response = await fetch(`${API_BASE}/me`, { credentials: "include" });
        const data = await response.json();

        if (response.ok) {
            $('#auth-container').hide();
            $('#login-button').hide();
            $('#profile-section').show();
        }
    } catch (error) {
        console.error("User check failed:", error);
    }

    // Handle Sign Up Form Submission
    $('#signup-form').submit(async function(e) {
        e.preventDefault();

        const name = $('#name').val();
        const phone = $('#number').val();
        const address = $('#address').val();
        const password = $('#password').val();

        const $signupBtn = $('#signup-form button[type="submit"]');
        $signupBtn.prop('disabled', true); // Prevent double submit

        try {
            const response = await fetch(`${API_BASE}/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, address, password }),
                credentials: "include",
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = 'index.html';
            } else {
                alert(data.error); // Example: "Phone is already registered"
            }
        } catch (error) {
            console.error("Signup Error:", error);
            alert("An error occurred. Please try again.");
        } finally {
            $signupBtn.prop('disabled', false);
        }
    });

    // Handle Login Form Submission
    $('#login-form').submit(async function(e) {
        e.preventDefault();

        const phone = $('#login-phone').val();
        const password = $('#login-password').val();

        const $loginBtn = $('#login-form button[type="submit"]');
        $loginBtn.prop('disabled', true);

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
                credentials: "include",
            });

            const data = await response.json();

            if (response.ok) {
                $('#auth-container').hide();
                $('#login-button').hide();
                $('#profile-section').show();
                window.location.href = data.redirect;
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error("Login Error:", err);
            alert("An error occurred. Please try again.");
        } finally {
            $loginBtn.prop('disabled', false);
        }
    });

    // Handle logout button click
    $('#logout-btn').click(async function() {
        try {
            await fetch(`${API_BASE}/logout`, {
                method: "POST",
                credentials: "include"
            });
            window.location.href = 'index.html';
        } catch (err) {
            alert("Logout failed.");
        }
    });

    // Toggle between Login and Sign Up forms
    $('#toggle-to-signup').click(function(event) {
        event.preventDefault();
        $('#login-form').hide();
        $('#signup-form').show();
    });

    $('#toggle-to-login').click(function(event) {
        event.preventDefault();
        $('#signup-form').hide();
        $('#login-form').show();
    });
});
