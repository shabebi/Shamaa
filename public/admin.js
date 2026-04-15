$(document).ready(function() {
    // Initially hide the popups when the page loads
    $('#orders-popup').hide();
    $('#categories-popup').hide();

    const API_BASE = window.location.origin;


    // Handle "Orders" Button Click
    $('#orders-btn').click(async function() {
        try {
            showPopup('orders');  // Show the orders popup
            // Fetch orders data
            const response = await fetch(`${API_BASE}/orders`, {
            credentials: 'include'
            });
            const orders = await response.json();

            const container = $('#orders-container');
            container.empty();  // Clear existing content

            // Loop through each order and create HTML elements for display
            orders.forEach(order => {
                const orderBlock = $('<div>').addClass('order-card');

                // HTML content for each order
                orderBlock.html(`
                    <div class="order-header">
                        <h3>Order #${order.order_id}</h3>
                        <p><strong>Date:</strong> ${order.order_date}</p>
                        <p><strong>Total:</strong> ${order.total_price} YR</p>
                        <p><strong>Customer:</strong> ${order.user_name} (${order.user_phone})</p>
                        <p><strong>Address:</strong> ${order.user_address}</p> <!-- Display user address -->
                    </div>
                    <div class="order-items">
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Color</th>
                                        <th>Scent</th>
                                        <th>Quantity</th>
                                        <th>Additional Info</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${order.order_items.map(item => `
                                        <tr>
                                            <td>${item.product_name}</td>
                                            <td>${item.price} YR</td>
                                            <td>${item.color}</td>
                                            <td>${item.scent}</td>
                                            <td>${item.quantity}</td>
                                            <td>${item.additional_info || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <button class="remove-order-btn" data-order-id="${order.order_id}"><i class="fas fa-trash-alt"></i></button>
                `);

                // Append the order block to the container
                container.append(orderBlock);
            });

            // Handle remove button click
            $('.remove-order-btn').click(async function() {
                const orderId = $(this).data('order-id');
                const confirmed = confirm('Are you sure you want to delete this order?');

                if (confirmed) {
                    try {
                        await fetch(`${API_BASE}/orders/${orderId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });

                        $(this).closest('.order-card').remove();
                    } catch (error) {
                        console.error('Error deleting order:', error);
                        alert('There was an error deleting the order.');
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            alert('There was an error fetching the orders.');
        }
    });

    // Close the popup when the close button (X) is clicked
    $('#close-popup').on('click', function() {
        $('#orders-popup').fadeOut(300);  // Hide the orders popup
    });

    // Close categories popup
    $('#close-categories-popup').click(function() {
        $('#categories-popup').fadeOut(300);  // Hide the categories popup
    });

    // Close categories popup if clicking outside of it
    $('#categories-popup').click(function(event) {
        if ($(event.target).is('#categories-popup')) {
            $('#categories-popup').fadeOut(300);  // Hide the categories popup
        }
    });

    $('#orders-popup').click(function(event) {
        if ($(event.target).is('#orders-popup')) {
            $('#orders-popup').fadeOut(300);  // Hide the orders popup
        }
    });
    

    // Handle "Categories" Button Click
    $('#categories-btn').click(async function() {
        showPopup('categories');  // Show the categories popup

        try {
            // Fetch categories data
            const response = await fetch(`${API_BASE}/api/categories`, {
            credentials: 'include'
            });
            const categories = await response.json();

            const container = $('#category-list');
            container.empty();  // Clear existing content

            // Loop through each category and create HTML elements for display
            categories.forEach(category => {
                const categoryBlock = $('<div>').addClass('category-card');

                // HTML content for each category
                categoryBlock.html(`
                    <form class="category-edit-form" data-category-id="${category.id}">
                        <input type="text" name="name" value="${category.name}" required>
                        <input type="text" name="name_ar" value="${category.name_ar}" required>
                        <div class="category-buttons">
                            <button type="submit" class="update-category-btn">Confirm</button>
                            <button type="button" class="remove-category-btn" data-category-id="${category.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </form>
                `);

                // Append the category block to the container
                container.append(categoryBlock);
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            alert('There was an error fetching the categories.');
        }
    });

    $("#add-category-form").hide();   
       
    $("#add-category-btn").click(function () { 
        $("#add-category-form").slideToggle(); // Show/hide the form
    });
    
        // Handle Form Submission for Adding a Category
        $("#add-category-form").submit(function (e) {
            e.preventDefault();
    
            let formData = new FormData();
            formData.append("name", $("#category-name").val().trim());
            formData.append("name_ar", $("#category-name-ar").val().trim());
            formData.append("image", $("#category-image")[0].files[0]);
    
            $.ajax({
                url: `${API_BASE}/api/categories`,
                type: "POST",
                data: formData,
                contentType: false,
                processData: false,
                xhrFields: {
                    withCredentials: true // ✅ Needed to send cookies
                },
                success: function (result) {
                    alert("Category added successfully!");
                    $("#add-category-form")[0].reset();
                    $("#add-category-form").slideUp(); // Hide form after submission

                    // Append new category with image to the list
                    $("#category-list").append(`
                        <div class="category-card">
                            <h4>${result.category.name}</h4>
                            <img src="${result.category.image_path}" width="100">
                        </div>
                    `);
                },
                error: function (xhr, status, error) {
                    console.error("Error adding category:", error);
                    alert("There was an error adding the category.");
                },
            });
        });    
    
    


   // Handle Remove Category Button Click
    $('#category-list').on('click', '.remove-category-btn', async function() {
        const categoryId = $(this).data('category-id');
        const confirmed = confirm('Are you sure you want to delete this category?');

        if (confirmed) {
            try {
                const response = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete category');
                }

                // Only remove from UI if server deletion was successful
                $(this).closest('.category-card').fadeOut(300, function() {
                    $(this).remove();
                });
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('Error deleting category: ' + error.message);
            }
        }
    });

    $('#category-list').on('submit', '.category-edit-form', async function (e) {
        e.preventDefault();

        const form = $(this);
        const categoryId = form.data('category-id');

        const updatedData = {
            name: form.find('[name="name"]').val().trim(),
            name_ar: form.find('[name="name_ar"]').val().trim()
        };

        console.log("🔧 Ready to update category:", categoryId, updatedData);

            try {
                const response = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                throw new Error('Failed to update category');
            }

            const result = await response.json();
            console.log("✅ Category updated:", result);

            alert("Category updated successfully!");

        } catch (error) {
            console.error('❌ Error updating category:', error);
            alert("Failed to update category.");
        }
    });

    // Handle "Products" Button Click
    $('#products-btn').click(async function () {
        showPopup('products'); // Show the products popup

            try {
                // Fetch products and categories from the backend
                const [productsRes, categoriesRes] = await Promise.all([
                fetch(`${API_BASE}/api/products`, {
                    credentials: 'include'
                }),
                fetch(`${API_BASE}/api/categories`, {
                    credentials: 'include'
                })
                ]);

            const products = await productsRes.json();
            const categories = await categoriesRes.json();

            const container = $('#product-list');
            container.empty(); // Clear existing content

            // Loop through each product and create editable form
            products.forEach(product => {
                const productBlock = $('<div>').addClass('product-card');

                productBlock.html(`
                    <form class="product-edit-form" data-product-id="${product.id}">
                        <input type="text" name="name" value="${product.name}" required>
                        <input type="text" name="name_ar" value="${product.name_ar}" required>
                        <input type="number" name="price" value="${product.price}" min="0" step="0.01" required>
                        <textarea name="description" required>${product.description}</textarea>
                        <textarea name="description_ar" required>${product.description_ar}</textarea>
                        <select name="category_id" required></select>
                        <div class="product-buttons">
                            <button type="submit" class="update-product-btn">Confirm</button>
                            <button type="button" class="remove-product-btn" data-product-id="${product.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </form>
                `);

                // Populate category dropdown
                const categorySelect = productBlock.find('select[name="category_id"]');
                categories.forEach(category => {
                    const selected = category.id === product.category_id ? 'selected' : '';
                    categorySelect.append(`<option value="${category.id}" ${selected}>${category.name}</option>`);
                });

                // Append the editable product form to the container
                container.append(productBlock);
            });

        } catch (error) {
            console.error('Error fetching products or categories:', error);
            alert('There was an error loading the products or categories.');
        }
    });


    // Handle Remove Product Button Click
    $('#product-list').on('click', '.remove-product-btn', async function() {
        const productId = $(this).data('product-id');
        const confirmed = confirm('Are you sure you want to delete this product?');

        if (confirmed) {
            try {
                const response = await fetch(`${API_BASE}/api/products/${productId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete product');
                }

                // Only remove from UI if server deletion was successful
                $(this).closest('.product-card').fadeOut(300, function() {
                    $(this).remove();
                });
            } catch (error) {
                console.error('Error deleting product:', error);
                alert('Error deleting product: ' + error.message);
            }
        }
    });

    // Initially hide the add-product form
    $("#add-product-form").hide();

    // Toggle Add Product Form visibility
    $(document).on("click", "#add-product-btn", async function () {
        try {
            const response = await fetch(`${API_BASE}/api/categories`, {
            credentials: 'include'
            });
            const categories = await response.json();
            const categorySelect = $("#product-category");
            categorySelect.empty();
            categories.forEach((category) => {
                categorySelect.append(`<option value="${category.id}">${category.name}</option>`);
            });

            $("#add-product-form").slideToggle();
        } catch (error) {
            console.error("Error fetching categories:", error);
            alert("Error loading categories: " + error.message);
        }
    });

    // Handle Add Product Form Submission
    $("#add-product-form").submit(async function (e) {
        e.preventDefault();

        let formData = new FormData();
        formData.append("name", $("#product-name").val().trim());
        formData.append("name_ar", $("#product-name-ar").val().trim());
        formData.append("price", parseFloat($("#product-price").val()));
        formData.append("category_id", $("#product-category").val());
        formData.append("description", $("#product-description").val().trim());
        formData.append("description_ar", $("#product-description-ar").val().trim());
        formData.append("image", $("#product-image")[0].files[0]); // Image Upload

        try {
            const response = await fetch(`${API_BASE}/api/products`, {
                method: "POST",
                credentials: 'include',
                body: formData, // Send FormData for file upload
            });

            const result = await response.json();

            if (response.ok) {
                alert("Product added successfully!");
                $("#add-product-form")[0].reset();
                $("#product-list").append(`
                    <div class="product-card">
                        <img src="${result.image}" width="100">
                        <h4>${result.name} (${result.price} YR)</h4>
                        <button class="remove-product-btn" data-product-id="${result.id}" data-image-path="${result.image}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `);
                $("#add-product-form").slideUp();
            } else {
                alert("Error adding product: " + (result.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Error adding product:", error);
            alert("There was an error adding the product: " + error.message);
        }
    });

    // Handle Product Deletion
    $(document).on("click", ".remove-product-btn", async function () {
        const productId = $(this).data("product-id");
        const imagePath = $(this).data("image-path");

        if (!confirm("Are you sure you want to delete this product?")) return;

        try {
            const response = await fetch(`${API_BASE}/api/products/${productId}`, {
                method: "DELETE",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imagePath }), // Send image path for deletion
            });

            const result = await response.json();

            if (response.ok) {
                alert("Product deleted successfully!");
                $(this).closest(".product-card").remove();
            } else {
                alert("Error deleting product: " + (result.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("There was an error deleting the product: " + error.message);
        }
    });

    $('#product-list').on('submit', '.product-edit-form', async function(e) {
        e.preventDefault();

        const form = $(this);
        const productId = form.data('product-id');

        const updatedData = {
            name: form.find('[name="name"]').val().trim(),
            name_ar: form.find('[name="name_ar"]').val().trim(),
            price: parseFloat(form.find('[name="price"]').val()),
            description: form.find('[name="description"]').val().trim(),
            description_ar: form.find('[name="description_ar"]').val().trim(),
            category_id: form.find('[name="category_id"]').val()
        };

        console.log('🛠 Update payload ready for backend:', updatedData);

        try {
            const response = await fetch(`${API_BASE}/api/products/${productId}`, {
                method: "PATCH",
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                throw new Error("Failed to update product");
            }

            const result = await response.json();
            console.log("✅ Product updated:", result);

            alert("Product updated successfully!");
        } catch (error) {
            console.error("❌ Error updating product:", error);
            alert("Failed to update product.");
        }
    });


    // Close products popup
    $('#close-products-popup').click(function() {
        $('#products-popup').fadeOut(300);
    });

    // Close products popup if clicking outside
    $('#products-popup').click(function(event) {
        if ($(event.target).is('#products-popup')) {
            $('#products-popup').fadeOut(300);
        }
    });

    // Handle "Colors" Button Click
    $('#colors-btn').click(async function() {
        showPopup('colors');  // Show the colors popup

        try {
            // Fetch colors data
            const response = await fetch(`${API_BASE}/api/colors`, {
            credentials: 'include'
            });
            const colors = await response.json();

            const container = $('#color-list');
            container.empty();  // Clear existing content

            // Loop through each color and create HTML elements for display
            colors.forEach(color => {
                const colorBlock = $('<div>').addClass('color-card');

                // HTML content for each color
                colorBlock.html(`
                    <div class="color-content">
                        <h4 class="color-name">${color.color_name_en}</h4>
                        <button class="remove-color-btn" data-color-id="${color.id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `);

                // Append the color block to the container
                container.append(colorBlock);
            });
        } catch (error) {
            console.error('Error fetching colors:', error);
            alert('There was an error fetching the colors.');
        }
    });

    // Handle Remove Color Button Click
    $('#color-list').on('click', '.remove-color-btn', async function() {
        const colorId = $(this).data('color-id');
        const confirmed = confirm('Are you sure you want to delete this color?');

        if (confirmed) {
            try {
                const response = await fetch(`${API_BASE}/api/colors/${colorId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete color');
                }

                // Only remove from UI if server deletion was successful
                $(this).closest('.color-card').fadeOut(300, function() {
                    $(this).remove();
                });
            } catch (error) {
                console.error('Error deleting color:', error);
                alert('Error deleting color: ' + error.message);
            }
        }
    });

    // Toggle add color form
    $(document).on('click', '#add-color-btn', function() {
        $('#add-color-form').slideToggle();
    });

    // Handle add color form submission
    $('#add-color-form').submit(async function(e) {
        e.preventDefault();
        
        const colorData = {
            color_name_en: $('#color-name').val().trim(),
            color_name_ar: $('#color-name-ar').val().trim()
        };
        
        try {
            // Add validation
            if (!colorData.color_name_en || !colorData.color_name_ar) {
                alert('Both English and Arabic names are required');
                return;
            }

            const response = await fetch(`${API_BASE}/api/colors`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(colorData)
            });

            const result = await response.json();
            
            if (response.ok) {
                alert('Color added successfully!');
                $('#add-color-form')[0].reset();
                $('#color-list').append(`<div class="color-card">
                    <div class="color-content">
                        <h4 class="color-name">${colorData.color_name_en} (${colorData.color_name_ar})</h4>
                        <button class="remove-color-btn" data-color-id="${result.id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>`);
                $('#add-color-form').slideUp();
            } else {
                alert('Error adding color: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error adding color:', error);
            alert('There was an error adding the color: ' + error.message);
        }
    });

    // Close colors popup
    $('#close-colors-popup').click(function() {
        $('#colors-popup').fadeOut(300);
    });

    // Close colors popup if clicking outside
    $('#colors-popup').click(function(event) {
        if ($(event.target).is('#colors-popup')) {
            $('#colors-popup').fadeOut(300);
        }
    });

    // Handle "Scents" Button Click
    $('#scents-btn').click(async function() {
        showPopup('scents');  // Show the scents popup

        try {
            // Fetch scents data
            const response = await fetch(`${API_BASE}/api/scents`, {
            credentials: 'include'
            });
            const scents = await response.json();

            const container = $('#scent-list');
            container.empty();  // Clear existing content

            // Loop through each scent and create HTML elements for display
            scents.forEach(scent => {
                const scentBlock = $('<div>').addClass('scent-card');

                // HTML content for each scent
                scentBlock.html(`
                    <div class="scent-content">
                        <h4 class="scent-name">${scent.scent_name_en}</h4>
                        <button class="remove-scent-btn" data-scent-id="${scent.id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `);

                // Append the scent block to the container
                container.append(scentBlock);
            });
        } catch (error) {
            console.error('Error fetching scents:', error);
            alert('There was an error fetching the scents.');
        }
    });

    // Handle Remove Scent Button Click
    $('#scent-list').on('click', '.remove-scent-btn', async function() {
        const scentId = $(this).data('scent-id');
        const confirmed = confirm('Are you sure you want to delete this scent?');

        if (confirmed) {
            try {
                const response = await fetch(`${API_BASE}/api/scents/${scentId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete scent');
                }

                // Only remove from UI if server deletion was successful
                $(this).closest('.scent-card').fadeOut(300, function() {
                    $(this).remove();
                });
            } catch (error) {
                console.error('Error deleting scent:', error);
                alert('Error deleting scent: ' + error.message);
            }
        }
    });

    // Toggle add scent form
    $(document).on('click', '#add-scent-btn', function() {
        $('#add-scent-form').slideToggle();
    });

    // Handle add scent form submission
    $('#add-scent-form').submit(async function(e) {
        e.preventDefault();
        
        const scentData = {
            scent_name_en: $('#scent-name').val().trim(),
            scent_name_ar: $('#scent-name-ar').val().trim()
        };
        
        try {
            // Add validation
            if (!scentData.scent_name_en || !scentData.scent_name_ar) {
                alert('Both English and Arabic names are required');
                return;
            }

            const response = await fetch(`${API_BASE}/api/scents`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scentData)
            });

            const result = await response.json();
            
            if (response.ok) {
                alert('Scent added successfully!');
                $('#add-scent-form')[0].reset();
                $('#scent-list').append(`<div class="scent-card">
                    <div class="scent-content">
                        <h4 class="scent-name">${scentData.scent_name_en} (${scentData.scent_name_ar})</h4>
                        <button class="remove-scent-btn" data-scent-id="${result.id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>`);
                $('#add-scent-form').slideUp();
            } else {
                alert('Error adding scent: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error adding scent:', error);
            alert('There was an error adding the scent: ' + error.message);
        }
    });

    // Close scents popup
    $('#close-scents-popup').click(function() {
        $('#scents-popup').fadeOut(300);
    });

    // Close scents popup if clicking outside
    $('#scents-popup').click(function(event) {
        if ($(event.target).is('#scents-popup')) {
            $('#scents-popup').fadeOut(300);
        }
    });

    // Handle "Users" Button Click
    $('#users-btn').click(async function() {
        showPopup('users');  // Show the users popup

        try {
            // Fetch users data
            const response = await fetch(`${API_BASE}/api/users`, {
            credentials: 'include'
            });
            const users = await response.json();

            const container = $('#user-list');
            container.empty();  // Clear existing content

            // Loop through each user and create HTML elements for display
            users.forEach(user => {
                const userBlock = $('<div>').addClass('user-card');

                // HTML content for each user
                userBlock.html(`
                    <div class="user-content">
                        <div class="user-info">
                            <h4 class="user-name">${user.name}</h4>
                            <p class="user-phone">Phone: ${user.phone}</p>
                            <p class="user-address">Address: ${user.address || 'Not provided'}</p>
                        </div>
                    </div>
                `);

                // Append the user block to the container
                container.append(userBlock);
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('There was an error fetching the users.');
        }
    });

    // Add users popup to showPopup function
    function showPopup(type) {
        if (type === 'orders') {
            $('#orders-popup').fadeIn(300);
        } else if (type === 'categories') {
            $('#categories-popup').fadeIn(300);
        } else if (type === 'products') {
            $('#products-popup').fadeIn(300);
        } else if (type === 'prices') {
            $('#prices-popup').fadeIn(300);
        } else if (type === 'colors') {
            $('#colors-popup').fadeIn(300);
        } else if (type === 'scents') {
            $('#scents-popup').fadeIn(300);
        } else if (type === 'users') {
            $('#users-popup').fadeIn(300);
        }
    }

    // Close users popup
    $('#close-users-popup').click(function() {
        $('#users-popup').fadeOut(300);
    });

    // Close users popup if clicking outside
    $('#users-popup').click(function(event) {
        if ($(event.target).is('#users-popup')) {
            $('#users-popup').fadeOut(300);
        }
    });

    $('#logout-btn').click(async function () {

        try {
            const response = await fetch(`${API_BASE}/logout`, {
                method: "POST",
                credentials: 'include',
            });

            if (response.ok) {
                window.location.href = "index.html"; // or "login.html" if you have a separate login page
            } else {
                alert("Logout failed. Please try again.");
            }
        } catch (error) {
            console.error("Logout Error:", error);
            alert("Something went wrong during logout.");
        }
    });
});


