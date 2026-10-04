const registerForm =
    document.getElementById("registerForm");

const message =
    document.getElementById("message");


registerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            document.getElementById("name").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;


        // ========================================
        // PASSWORD CHECK
        // ========================================

        if (password.length < 6) {

            message.style.color = "red";

            message.textContent =
                "Password must be at least 6 characters.";

            return;
        }


        if (password !== confirmPassword) {

            message.style.color = "red";

            message.textContent =
                "Passwords do not match.";

            return;
        }


        message.style.color = "";

        message.textContent =
            "Creating account...";


        try {

            const response = await fetch(
                "/api/auth/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        password
                    })
                }
            );


            const data =
                await response.json();


            if (!response.ok) {

                message.style.color = "red";

                message.textContent =
                    data.message ||
                    "Registration failed.";

                return;
            }


            message.style.color =
                "green";

            message.textContent =
                "Registration successful. Redirecting to login...";


            setTimeout(() => {

                window.location.href = "/";

            }, 1000);


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            message.style.color =
                "red";

            message.textContent =
                "Unable to connect to server.";
        }

    }
);