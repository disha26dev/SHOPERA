let cart = [];
let products = [];
let selectedProduct = null;

const $ = id => document.getElementById(id);
const productContainer = $("product-container");
const cartCount = $("cart-count");
const cartItems = $("cart-items");
const cartTotal = $("cart-total");
const productModal = $("product-modal");
const loginModal = $("login-modal");
const registerModal = $("register-modal");

function emoji(name) {
    if (name.includes("Sneakers")) return "👟";
    if (name.includes("Headphones")) return "🎧";
    if (name.includes("Watch")) return "⌚";
    return "🛍️";
}

function money(value) {
    return Number(value).toLocaleString("en-IN");
}

async function api(url, data) {
    const response = await fetch("https://shopera-backend-g8rr.onrender.com" + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.message || "Request failed.");

    return result;
}

function displayProducts(list) {
    productContainer.innerHTML = "";

    if (!list.length) {
        productContainer.textContent = "No products found.";
        return;
    }

    list.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        const image = document.createElement("div");
        image.className = "product-image";
        image.textContent = emoji(product.name);

        const name = document.createElement("h3");
        name.textContent = product.name;

        const price = document.createElement("p");
        price.className = "price";
        price.textContent = "₹" + money(product.price);

        const description = document.createElement("p");
        description.textContent = product.description || "A great product for everyday use.";

        const add = document.createElement("button");
        add.className = "add-cart";
        add.textContent = "Add to Cart";
        add.onclick = () => addToCart(product);

        const details = document.createElement("button");
        details.textContent = "View Details";
        details.onclick = () => showDetails(product);

        card.append(image, name, price, description, add, details);
        productContainer.appendChild(card);
    });
}

async function loadProducts() {
    try {
        const response = await fetch("https://shopera-backend-g8rr.onrender.com/api/products");

        if (!response.ok) throw new Error();

        products = await response.json();
        displayProducts(products);
    } catch {
        productContainer.textContent = "Products could not load. Please start the backend.";
    }
}

function addToCart(product) {
    const item = cart.find(p => p.id === product.id);

    if (item) {
        item.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: 1
        });
    }

    updateCart();
}

function updateCart() {
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);

    cartTotal.textContent = money(
        cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );

    cartItems.innerHTML = "";

    if (!cart.length) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
        return;
    }

    cart.forEach(item => {
        const row = document.createElement("div");
        row.className = "cart-item";

        const info = document.createElement("div");
        const name = document.createElement("h3");
        name.textContent = emoji(item.name) + " " + item.name;

        const price = document.createElement("p");
        price.textContent = "Price: ₹" + money(item.price);

        const subtotal = document.createElement("p");
        subtotal.textContent = "Subtotal: ₹" + money(item.price * item.quantity);

        info.append(name, price, subtotal);

        const minus = document.createElement("button");
        minus.textContent = "−";
        minus.onclick = () => {
            item.quantity--;
            if (item.quantity <= 0) {
                cart = cart.filter(p => p.id !== item.id);
            }
            updateCart();
        };

        const quantity = document.createElement("span");
        quantity.textContent = " " + item.quantity + " ";

        const plus = document.createElement("button");
        plus.textContent = "+";
        plus.onclick = () => {
            item.quantity++;
            updateCart();
        };

        const remove = document.createElement("button");
        remove.textContent = "Remove";
        remove.onclick = () => {
            cart = cart.filter(p => p.id !== item.id);
            updateCart();
        };

        row.append(info, minus, quantity, plus, remove);
        cartItems.appendChild(row);
    });
}

function showDetails(product) {
    selectedProduct = product;
    $("modal-name").textContent = emoji(product.name) + " " + product.name;
    $("modal-price").textContent = "₹" + money(product.price);
    $("modal-description").textContent = product.description || "A great product for everyday use.";
    productModal.style.display = "flex";
}

$("close-modal").onclick = () => productModal.style.display = "none";

$("modal-add-cart").onclick = () => {
    if (selectedProduct) addToCart(selectedProduct);
    productModal.style.display = "none";
};

$("search-input").addEventListener("input", event => {
    const text = event.target.value.toLowerCase().trim();

    displayProducts(products.filter(product =>
        product.name.toLowerCase().includes(text) ||
        (product.description || "").toLowerCase().includes(text)
    ));
});

$("cart-button").onclick = () => {
    document.querySelector(".cart-section").scrollIntoView({ behavior: "smooth" });
};

$("login-button").onclick = () => {
    registerModal.style.display = "none";
    loginModal.style.display = "flex";
};

$("close-login").onclick = () => loginModal.style.display = "none";

$("register-button").onclick = () => {
    loginModal.style.display = "none";
    registerModal.style.display = "flex";
};

$("close-register").onclick = () => registerModal.style.display = "none";

window.addEventListener("click", event => {
    if (event.target === loginModal ||
        event.target === registerModal ||
        event.target === productModal) {
        event.target.style.display = "none";
    }
});

loginModal.querySelector(".login-submit").onclick = async () => {
    const inputs = loginModal.querySelectorAll("input");
    const email = inputs[0].value.trim();
    const password = inputs[1].value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    try {
        const result = await api("/api/login", { email, password });
        alert("Welcome to SHOPERA, " + result.name + "!");
        loginModal.style.display = "none";
        inputs.forEach(input => input.value = "");
    } catch (error) {
        alert(error.message);
    }
};

registerModal.querySelector(".login-submit").onclick = async () => {
    const inputs = registerModal.querySelectorAll("input");
    const name = inputs[0].value.trim();
    const email = inputs[1].value.trim();
    const password = inputs[2].value;

    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    if (password.length < 6) {
        alert("Password must contain at least 6 characters.");
        return;
    }

    try {
        const result = await api("/api/register", { name, email, password });
        alert(result.message + " You can now log in.");
        registerModal.style.display = "none";
        loginModal.style.display = "flex";
        loginModal.querySelectorAll("input")[0].value = email;
        loginModal.querySelectorAll("input")[1].value = "";
        inputs.forEach(input => input.value = "");
    } catch (error) {
        alert(error.message);
    }
};

$("order-confirmation").style.display = "none";

$("checkout-button").onclick = () => {
    if (!cart.length) {
        alert("Your cart is empty.");
        return;
    }

    const name = $("checkout-name").value.trim();
    const address = $("checkout-address").value.trim();
    const phone = $("checkout-phone").value.trim();

    if (!name || !address || !phone) {
        alert("Please fill in all checkout fields.");
        return;
    }

    if (!/^[0-9+\-\s()]{7,15}$/.test(phone)) {
        alert("Please enter a valid phone number.");
        return;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = cart.map(item =>
        item.name + " × " + item.quantity + " = ₹" + money(item.price * item.quantity)
    ).join("\n");

    if (!confirm("Confirm your order?\n\n" + order +
        "\n\nTotal: ₹" + money(total) +
        "\nName: " + name + "\nAddress: " + address)) return;

    $("order-confirmation").style.display = "block";
    $("order-confirmation").scrollIntoView({ behavior: "smooth" });

    alert("Thank you, " + name + "! Your SHOPERA demo order is confirmed.");

    cart = [];
    updateCart();

    $("checkout-name").value = "";
    $("checkout-address").value = "";
    $("checkout-phone").value = "";
};

loadProducts();
updateCart();