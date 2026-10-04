const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    message.textContent = "Logging in...";

    try {

        const response = await fetch("/api/auth/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                email,
                password
            })

        });

        const data = await response.json();

        if (!response.ok) {

            message.textContent =
                data.message || "Login failed";

            return;
        }

        message.style.color = "green";

        message.textContent =
            "Login successful. Redirecting...";

        setTimeout(() => {

            window.location.href = "/dashboard.html";

        }, 500);

    } catch (error) {

        console.error(error);

        message.style.color = "red";

        message.textContent =
            "Unable to connect to server";
    }
});