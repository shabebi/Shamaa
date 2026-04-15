$(document).ready(function() {
    // Get current language from localStorage or default to 'en'
    const currentLang = localStorage.getItem('lang') || 'en';

    // Page detection and AJAX logic remains the same
    const isCategoriesPage = window.location.pathname.includes('categories.html');
    const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    const API_BASE = window.location.origin;
    $('#current-year').text(new Date().getFullYear());

    // Fetch categories for the homepage
    if (isHomePage) {
        $.ajax({
            url: `/api/categories?lang=${currentLang}`, // Add lang parameter
            method: 'GET',
            dataType: 'json',
            success: function(categories) {
                const categoriesHTML = categories.map(category => `
                    <div class="product">
                        <a href="categories.html?category_id=${category.id}">
                            <img src="${category.image_path}" alt="${category.name}">
                            <h3 class="center">${category.name}</h3>
                        </a>
                    </div>
                `).join('');
                $('#categories-container').html(categoriesHTML);
            },
            error: function() {
                $('#categories-container').html('<p class="error">Error loading categories</p>');
            }
        });
    }

    // Fetch products for the categories page
    if (isCategoriesPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category_id');

        if (!categoryId) {
            window.location.href = '/';
            return;
        }

        $.ajax({
            url: `/api/products/${categoryId}?lang=${currentLang}`, // Add lang parameter
            method: 'GET',
            dataType: 'json',
            success: function(products) {
                const productsHTML = products.map(product => `
                    <div class="product" data-product-id="${product.id}">
                        <img src="${product.image}">
                        <div class="product-info">
                            <h3>${product.price} YR</h3>
                            <button class="basket-btn">
                                <i class="fa-solid fa-cart-shopping"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
                $('.container2').html(productsHTML);
            },
            error: function() {
                $('.container2').html('<p class="error">Error loading products</p>');
            }
        });
    }

    async function loadBasketItems() {
        try {
            $("#basket-loading").show();
            $("#basket-items").hide();
            
            const response = await fetch(`${API_BASE}/api/basket?lang=${currentLang}`, { // Add lang parameter
                method: "GET",
                credentials: "include"
            });
            
            if (response.ok) {
                const items = await response.json();
                const basketItemsContainer = $("#basket-items").empty();
            
                let totalPrice = 0;
    
                items.forEach(item => {
                    totalPrice += item.price * item.quantity;
    
                    const itemHTML = `
                        <div class="basket-item" data-item-id="${item.id}">
                            <div class="item-name">${item.name}</div>
                            <div class="item-quantity">${item.quantity}</div>
                            <div class="item-price">${item.price} YR</div>
                            <div class="item-color">${item.color}</div>
                            <div class="item-scent">${item.scent}</div>
                            <button class="remove-item-btn">X</button> <!-- Remove button -->
                        </div>
                    `;
                    basketItemsContainer.append(itemHTML);
                });
                
                $("#total-price").text(totalPrice);

                if (items.length === 0) {
                const currentLang = localStorage.getItem('lang') || 'en';
                const emptyMessage = currentLang === 'ar' ? 'سلتك فارغة' : 'Your basket is empty.';
                basketItemsContainer.html(`<p class="empty-basket">${emptyMessage}</p>`);

                $("#confirm").hide();         // Hide confirm button
                $("#total-container").hide(); // Hide total price
                } else {
                $("#confirm").show();         // Show confirm button
                $("#total-container").show(); // Show total price
                }
            }
            
        } catch (error) {
            console.error("Error loading basket items:", error);
        } finally {
            $("#basket-loading").hide();
            $("#basket-items").fadeIn(300);
        }
    }

    // Basket button functionality
    let selectedProductId = null; // Store the selected product ID globally

    // Handle clicking on the basket button in the product list
    $(document).on("click", ".basket-btn", function (e) {
        e.stopPropagation();
        selectedProductId = $(this).closest(".product").data("product-id"); // Save the product ID
        openProductPopup(selectedProductId);
        $(".popup-overlay").fadeIn(200);
    });

    $(".close-btn").on("click", function() {
        $(".popup-overlay").fadeOut(200);
    });

    // Handle clicking the new basket icon
    $("#basket-icon").on("click", function () {
        // First check authentication
        $.ajax({
        url: `${API_BASE}/profile`,
        method: "GET",
        credentials: "include",
        success: function() {
            loadBasketItems();
            $("#basket-summary-popup").fadeIn(200);
        },
        error: function(xhr) {
            if (xhr.status === 401) {
            alert("Please log in to view your basket.");
            window.location.href = "Sign.html";
            }
        }
        });
    });

    // Close button in the popup
    $("#close-summary-popup").on("click", function() {
        $("#basket-summary-popup").fadeOut(200);
    });

    // Close the popup if clicking outside the content area
    $(document).on("click", function (e) {
        if ($(e.target).closest(".popup-content").length === 0 &&
            $(e.target).closest(".basket-btn").length === 0 &&
            $(e.target).closest("#basket-icon").length === 0) {
            $(".popup-overlay").fadeOut(200);
        }
    });

    const noColorScentProducts = [10, 11, 12, 13, 14, 16, 19, 21, 22, 23, 24, 25, 26, 27, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

    function openProductPopup(productId) {
        // Fetch product details
        $.ajax({
            url: `/api/product/${productId}?lang=${currentLang}`,
            method: "GET",
            success: function (product) {
                $("#product-info").attr("data-product-id", product.id);
                $("#product-name").text(product.name || "No name available");
                $("#product-description").text(product.description || "No description");
                $("#product-price").text((product.price || "N/A") + "YR");

                // Check if this product doesn't need color/scent
                if (noColorScentProducts.includes(product.id)) {
                    $(".form-group:has(#color-dropdown)").hide();
                    $(".form-group:has(#scent-dropdown)").hide();
                    $("#color-dropdown").val("");
                    $("#scent-dropdown").val("");
                } else {
                    $(".form-group:has(#color-dropdown)").show();
                    $(".form-group:has(#scent-dropdown)").show();

                    // Fetch colors
                    $.ajax({
                        url: `/api/colors?lang=${currentLang}`,
                        method: "GET",
                        success: function (colors) {
                            const colorDropdown = $("#color-dropdown").empty();
                            colors.forEach(color => {
                                colorDropdown.append($("<option>").val(color.id).text(color.name));
                            });
                        },
                        error: function () {
                            console.error("Error fetching colors");
                        }
                    });

                    // Fetch scents
                    $.ajax({
                        url: `/api/scents?lang=${currentLang}`,
                        method: "GET",
                        success: function (scents) {
                            const scentDropdown = $("#scent-dropdown").empty();
                            scents.forEach(scent => {
                                scentDropdown.append($("<option>").val(scent.id).text(scent.name));
                            });
                        },
                        error: function () {
                            console.error("Error fetching scents");
                        }
                    });
                }
            },
            error: function () {
                console.error("Error fetching product details");
            }
        });
    }

    // Quantity buttons
    $(document).on("click", "#increase-qty", function () {
        let qty = parseInt($("#quantity").val()) || 1;
        $("#quantity").val(qty + 1);
    });

    $(document).on("click", "#decrease-qty", function () {
        let qty = parseInt($("#quantity").val()) || 1;
        if (qty > 1) {
            $("#quantity").val(qty - 1);
        }
    });

    $(document).on("input", "#quantity", function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    
    $("#submit-btn").on("click", function () {
        const productId = selectedProductId;
        const isNoColorScent = noColorScentProducts.includes(productId);

        // If product does not require color/scent, set them to null
        const colorId = isNoColorScent ? null : $("#color-dropdown").val();
        const scentId = isNoColorScent ? null : $("#scent-dropdown").val();
        const quantity = $("#quantity").val()?.trim() || null;
        const additionalInfo = $("#additional-info").val()?.trim() || "";

        // Validation
        if (!productId || !quantity || quantity <= 0 || (!isNoColorScent && (!colorId || !scentId))) {
            alert("Please select all options!");
            return;
        }

        const orderData = {
            productId,
            colorId: colorId || null,
            scentId: scentId || null,
            quantity: Number(quantity),
            additionalInfo: additionalInfo || ""
            };
        console.log("Order Data:", orderData);

        // Send data to backend
        $.ajax({
            url: `${API_BASE}/api/order`,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(orderData),
            success: function (response) {
                if (response.success) {
                    loadBasketItems();
                    $(".popup-overlay").fadeOut(200);
                } else {
                    alert("Failed to add item!");
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    alert("Please log in to add items to your basket.");
                    window.location.href = "Sign.html";
                } else {
                    alert("Error adding item to basket.");
                }
            }
        });
});


    // Add to your client-side JavaScript
    $(document).on("click", ".remove-item-btn", async function() {
        const itemId = $(this).closest(".basket-item").data("item-id");
        
        try {
        const response = await fetch(`${API_BASE}/api/basket/${itemId}`, {
            method: "DELETE",
            credentials: "include"
        });
        
        if (response.ok) {
            loadBasketItems(); // Refresh the basket list
        }
        } catch (error) {
        console.error("Error removing item:", error);
        }
    });

    $("#confirm").on("click", async function() {
        try {
          const response = await fetch(`${API_BASE}/api/confirm-order`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json"
            }
          });
      
          if (response.ok) {
            const result = await response.json();
            // Redirect to the new page with query params
            window.location.href = `order-confirmed.html?id=${result.orderId}&total=${result.totalPrice}&lang=${currentLang}`;
            
            // Refresh the basket to show it's now empty
            loadBasketItems();
            
            // Close the popup
            $("#basket-summary-popup").fadeOut(200);
          } else {
            const error = await response.json();
            alert(`Error: ${error.error || "Failed to confirm order"}`);
          }
        } catch (error) {
          console.error("Error confirming order:", error);
          alert("Network error while confirming order");
        }
      });
});
