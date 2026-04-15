// auth.js
async function handleAuthentication() {
    const API_BASE = window.location.origin;
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: "GET",
            credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
            $('#auth-container').html(`
                <div class="profile">
                    <div class="profile-dropdown">
                        <i class="fa-solid fa-user" id="profile-icon"></i>
                        <div class="dropdown-menu" id="dropdown-menu">
                            <p><strong>${data.name}</strong></p>
                            <p>${data.phone}</p>
                           <button id="logout-btn">${getLogoutText()}</button>
                        </div>
                    </div>
                </div>
            `);            
            
            // Hide the login button after successful authentication
            $('#login-button').hide();

            function getLogoutText() {
                const lang = localStorage.getItem('lang') || 'en';  // Check the current language from localStorage (or your language system)
                return lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'; // 'تسجيل الخروج' means 'Log Out' in Arabic
            }

            // Add dropdown toggle
            $(document).on('click', '#profile-icon', function(e) {
                e.stopPropagation(); // Prevent the click event from bubbling up to the document
                $('#dropdown-menu').toggleClass('show'); // Toggle visibility of the dropdown menu
            });

            // Close the dropdown if clicking outside of the profile
            $(document).on('click', function(event) {
                if (!$(event.target).closest('.profile-dropdown').length) {
                    $('#dropdown-menu').removeClass('show'); // Hide dropdown if clicked outside
                }
            });

            // Handle logout
            $(document).on('click', '#logout-btn', async function() {
                try {
                    const response = await fetch(`${API_BASE}/logout`, {
                        method: "POST", 
                        credentials: "include" // Include cookies with the request
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        alert(result.message);  // Display success message
                        window.location.href = 'index.html';
                    }
                } catch (error) {
                    console.error('Error during logout:', error);
                    alert('There was an error logging out.');
                }
            });

        }
    } catch (error) {
        console.error("Auth error:", error);
        $('#auth-container').html('<a href="Sign.html" class="sign-link" id="login-button">Log in</a>');
    }
}

// Run on page load and after auth state changes
$(document).ready(function() {
    handleAuthentication();
});
