// ============================================================
// SAFEGUARDIAN DASHBOARD
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================================
    // ELEMENTS
    // ========================================================

    const userName = document.getElementById("userName");
    const userPhone = document.getElementById("userPhone");
    const userEmail = document.getElementById("userEmail");

    const contactsList = document.getElementById("contactsList");
    const addContactButton = document.getElementById("addContactButton");

    const logoutButton = document.getElementById("logoutButton");

    const contactModal = document.getElementById("contactModal");
    const contactForm = document.getElementById("contactForm");
    const closeModalButton = document.getElementById("closeModalButton");

    const contactName = document.getElementById("contactName");
    const contactPhone = document.getElementById("contactPhone");
    const contactRelationship =
        document.getElementById("contactRelationship");

    const sosButton = document.getElementById("sosButton");
    const sosStatus = document.getElementById("sosStatus");

    const latitudeElement = document.getElementById("latitude");
    const longitudeElement = document.getElementById("longitude");
    const locationStatus = document.getElementById("locationStatus");

    const activeSosCard = document.getElementById("activeSosCard");
    const activeSosStatus = document.getElementById("activeSosStatus");
    const activeLocality = document.getElementById("activeLocality");
    const activeTriggeredAt =
        document.getElementById("activeTriggeredAt");
    const resolveButton = document.getElementById("resolveButton");


    // ========================================================
// SOS HISTORY ELEMENT
// ========================================================

const sosHistoryList =
    document.getElementById("sosHistoryList");


    // ========================================================
    // STATE
    // ========================================================

    let currentLatitude = null;
    let currentLongitude = null;

    let holdTimer = null;
    let holdStartTime = null;
    let holdInterval = null;

    let isTriggeringSOS = false;


    // ========================================================
    // HELPER: FORMAT DATE
    // ========================================================

    function formatDate(dateString) {

        if (!dateString) {
            return "Not available";
        }

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleString();
    }


    // ========================================================
    // LOAD USER
    // ========================================================

    async function loadUser() {

        try {

            const response =
                await fetch("/api/auth/me", {
                    method: "GET",
                    credentials: "include"
                });

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const data = await response.json();

            const user = data.user || data;

            userName.textContent =
                user.name || "User";

            userPhone.textContent =
                user.phone || "";

            userEmail.textContent =
                user.email || "";

        } catch (error) {

            console.error(
                "Load user error:",
                error
            );

            userName.textContent =
                "Unable to load user";
        }
    }


    // ========================================================
    // LOAD EMERGENCY CONTACTS
    // ========================================================

    async function loadContacts() {

        try {

            contactsList.textContent =
                "Loading contacts...";

            const response =
                await fetch("/api/contacts", {
                    method: "GET",
                    credentials: "include"
                });

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const data = await response.json();

            console.log(
                "Contacts response:",
                data
            );

            // IMPORTANT:
            // Backend returns:
            // { contacts: [...] }

            const contacts =
                Array.isArray(data.contacts)
                    ? data.contacts
                    : [];

            if (contacts.length === 0) {

                contactsList.innerHTML = `
                    <p>No emergency contacts added.</p>
                `;

                return;
            }

            contactsList.innerHTML = "";

            contacts.forEach(contact => {

                const contactDiv =
                    document.createElement("div");

                contactDiv.className =
                    "contact-item";

                contactDiv.innerHTML = `
                    <strong>
                        ${escapeHtml(contact.name)}
                    </strong>

                    <p>
                        ${escapeHtml(contact.phone)}
                    </p>

                    <p>
                        Relationship:
                        ${escapeHtml(
                            contact.relationship ||
                            "Not specified"
                        )}
                    </p>

                    <button
                        type="button"
                        class="delete-contact-button"
                        data-id="${contact.id}"
                    >
                        Delete
                    </button>

                    <hr>
                `;

                contactsList.appendChild(
                    contactDiv
                );
            });


            // Attach delete events

            const deleteButtons =
                document.querySelectorAll(
                    ".delete-contact-button"
                );

            deleteButtons.forEach(button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const contactId =
                            button.dataset.id;

                        await deleteContact(
                            contactId
                        );
                    }
                );
            });

        } catch (error) {

            console.error(
                "Load contacts error:",
                error
            );

            contactsList.innerHTML = `
                <p>
                    Unable to load contacts.
                </p>
            `;
        }
    }


    // ========================================================
    // DELETE CONTACT
    // ========================================================

    async function deleteContact(contactId) {

        const confirmed =
            confirm(
                "Are you sure you want to delete this emergency contact?"
            );

        if (!confirmed) {
            return;
        }

        try {

            const response =
                await fetch(
                    `/api/contacts/${contactId}`,
                    {
                        method: "DELETE",
                        credentials: "include"
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                alert(
                    data.message ||
                    "Unable to delete contact"
                );

                return;
            }

            await loadContacts();

        } catch (error) {

            console.error(
                "Delete contact error:",
                error
            );

            alert(
                "Unable to delete contact."
            );
        }
    }


    // ========================================================
    // OPEN CONTACT MODAL
    // ========================================================

    if (addContactButton) {

        addContactButton.addEventListener(
            "click",
            () => {

                contactForm.reset();

                contactModal.classList.remove(
                    "hidden"
                );
            }
        );
    }


    // ========================================================
    // CLOSE CONTACT MODAL
    // ========================================================

    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            () => {

                contactModal.classList.add(
                    "hidden"
                );
            }
        );
    }


    // ========================================================
    // ADD CONTACT
    // ========================================================

    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const name =
                    contactName.value.trim();

                const phone =
                    contactPhone.value.trim();

                const relationship =
                    contactRelationship
                        ? contactRelationship.value.trim()
                        : "";


                if (!name || !phone) {

                    alert(
                        "Name and phone number are required."
                    );

                    return;
                }


                try {

                    const response =
                        await fetch(
                            "/api/contacts",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials: "include",

                                body: JSON.stringify({
                                    name,
                                    phone,
                                    relationship:
                                        relationship || null
                                })
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            data.message ||
                            "Unable to add contact."
                        );

                        return;
                    }


                    contactModal.classList.add(
                        "hidden"
                    );

                    contactForm.reset();

                    await loadContacts();

                } catch (error) {

                    console.error(
                        "Add contact error:",
                        error
                    );

                    alert(
                        "Unable to add contact."
                    );
                }
            }
        );
    }


    // ========================================================
    // GET CURRENT LOCATION
    // ========================================================

    function getCurrentLocation() {

        if (!navigator.geolocation) {

            locationStatus.textContent =
                "Geolocation is not supported";

            return;
        }


        locationStatus.textContent =
            "Getting location...";


        navigator.geolocation.getCurrentPosition(

            position => {

                currentLatitude =
                    position.coords.latitude;

                currentLongitude =
                    position.coords.longitude;


                latitudeElement.textContent =
                    currentLatitude.toFixed(7);

                longitudeElement.textContent =
                    currentLongitude.toFixed(7);


                locationStatus.textContent =
                    "Location available";
            },

            error => {

                console.error(
                    "Geolocation error:",
                    error
                );

                locationStatus.textContent =
                    "Unable to get location";
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }


    // ========================================================
    // TRIGGER SOS
    // ========================================================

    async function triggerSOS() {

        if (isTriggeringSOS) {
            return;
        }

        isTriggeringSOS = true;

        sosButton.disabled = true;

        sosStatus.textContent =
            "Activating SOS...";


        try {

            // Refresh location before SOS

            await new Promise(resolve => {

                if (!navigator.geolocation) {
                    resolve();
                    return;
                }

                navigator.geolocation.getCurrentPosition(

                    position => {

                        currentLatitude =
                            position.coords.latitude;

                        currentLongitude =
                            position.coords.longitude;

                        latitudeElement.textContent =
                            currentLatitude.toFixed(7);

                        longitudeElement.textContent =
                            currentLongitude.toFixed(7);

                        locationStatus.textContent =
                            "Location available";

                        resolve();
                    },

                    error => {

                        console.error(
                            "SOS location error:",
                            error
                        );

                        resolve();
                    },

                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            });


            if (
                currentLatitude === null ||
                currentLongitude === null
            ) {

                alert(
                    "Unable to obtain your location. SOS cannot be activated."
                );

                return;
            }


            const response =
                await fetch(
                    "/api/sos",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({

                            latitude:
                                currentLatitude,

                            longitude:
                                currentLongitude,

                            locality:
                                "Current location"
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                if (response.status === 409) {

                    alert(
                        data.message ||
                        "An SOS is already active."
                    );

                    await loadActiveSOS();

                    return;
                }

                throw new Error(
                    data.message ||
                    "Unable to activate SOS"
                );
            }


            console.log(
                "SOS activated:",
                data
            );


            sosStatus.textContent =
                "SOS ACTIVE. Emergency contacts are being notified.";


            await loadActiveSOS();

            await loadSOSHistory();

        } catch (error) {

            console.error(
                "Trigger SOS error:",
                error
            );

            sosStatus.textContent =
                "Unable to activate SOS.";

            alert(
                error.message ||
                "Unable to activate SOS."
            );

        } finally {

            isTriggeringSOS = false;

            sosButton.disabled = false;
        }
    }


    // ========================================================
    // SOS HOLD START
    // ========================================================

    function startSOSHold(event) {

        event.preventDefault();

        if (isTriggeringSOS) {
            return;
        }

        holdStartTime =
            Date.now();


        sosStatus.textContent =
            "Keep holding...";


        sosButton.classList.add(
            "holding"
        );


        holdInterval =
            setInterval(() => {

                const elapsed =
                    Date.now() -
                    holdStartTime;

                const seconds =
                    Math.floor(
                        elapsed / 1000
                    );


                if (seconds < 3) {

                    sosStatus.textContent =
                        `Keep holding... ${3 - seconds}s`;

                }

            }, 100);


        holdTimer =
            setTimeout(() => {

                clearInterval(
                    holdInterval
                );

                holdInterval = null;

                sosButton.classList.remove(
                    "holding"
                );

                triggerSOS();

            }, 3000);
    }


    // ========================================================
    // SOS HOLD CANCEL
    // ========================================================

    function cancelSOSHold() {

        if (holdTimer) {

            clearTimeout(
                holdTimer
            );

            holdTimer = null;
        }


        if (holdInterval) {

            clearInterval(
                holdInterval
            );

            holdInterval = null;
        }


        if (!isTriggeringSOS) {

            sosButton.classList.remove(
                "holding"
            );

            sosStatus.textContent =
                "No active emergency";
        }
    }


    if (sosButton) {

        sosButton.addEventListener(
            "mousedown",
            startSOSHold
        );

        sosButton.addEventListener(
            "mouseup",
            cancelSOSHold
        );

        sosButton.addEventListener(
            "mouseleave",
            cancelSOSHold
        );


        sosButton.addEventListener(
            "touchstart",
            startSOSHold,
            {
                passive: false
            }
        );

        sosButton.addEventListener(
            "touchend",
            cancelSOSHold
        );

        sosButton.addEventListener(
            "touchcancel",
            cancelSOSHold
        );
    }


    // ========================================================
    // LOAD ACTIVE SOS
    // ========================================================

    async function loadActiveSOS() {

        try {

            const response =
                await fetch(
                    "/api/sos/active",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            console.log(
                "Active SOS:",
                data
            );


            if (!data.active) {

                activeSosCard.classList.add(
                    "hidden"
                );

                sosStatus.textContent =
                    "No active emergency";

                return;
            }


            const sos =
                data.sos;


            activeSosCard.classList.remove(
                "hidden"
            );


            activeSosStatus.textContent =
                sos.status || "ACTIVE";


            activeLocality.textContent =
                sos.locality ||
                "Unavailable";


            activeTriggeredAt.textContent =
                formatDate(
                    sos.triggered_at
                );


            sosStatus.textContent =
                "SOS ACTIVE. Emergency contacts are being notified.";


            if (
                sos.latitude !== undefined &&
                sos.longitude !== undefined
            ) {

                latitudeElement.textContent =
                    Number(sos.latitude)
                        .toFixed(7);

                longitudeElement.textContent =
                    Number(sos.longitude)
                        .toFixed(7);

                locationStatus.textContent =
                    "Location available";
            }

        } catch (error) {

            console.error(
                "Load active SOS error:",
                error
            );
        }
    }


    // ========================================================
    // RESOLVE SOS
    // ========================================================

    if (resolveButton) {

        resolveButton.addEventListener(
            "click",
            async () => {

                const password =
                    prompt(
                        "Enter your password to resolve the SOS:"
                    );


                if (!password) {
                    return;
                }


                try {

                    // Get active SOS first

                    const activeResponse =
                        await fetch(
                            "/api/sos/active",
                            {
                                method: "GET",
                                credentials: "include"
                            }
                        );


                    const activeData =
                        await activeResponse.json();


                    if (
                        !activeData.active ||
                        !activeData.sos
                    ) {

                        alert(
                            "No active SOS found."
                        );

                        await loadActiveSOS();

                        return;
                    }


                    const sosId =
                        activeData.sos.id;


                    const response =
                        await fetch(
                            `/api/sos/${sosId}/resolve`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials: "include",

                                body: JSON.stringify({
                                    password
                                })
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        alert(
                            data.message ||
                            "Unable to resolve SOS."
                        );

                        return;
                    }


                    alert(
                        "SOS resolved successfully."
                    );


                    activeSosCard.classList.add(
                        "hidden"
                    );


                    sosStatus.textContent =
                        "No active emergency";


                    await loadSOSHistory();

                } catch (error) {

                    console.error(
                        "Resolve SOS error:",
                        error
                    );

                    alert(
                        "Unable to resolve SOS."
                    );
                }
            }
        );
    }


    // ========================================================
    // LOAD SOS HISTORY
    // ========================================================

    async function loadSOSHistory() {

        try {

            sosHistoryList.innerHTML =
                "Loading SOS history...";


            const response =
                await fetch(
                    "/api/sos/history",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            console.log(
                "SOS history response:",
                data
            );


            // IMPORTANT:
            // Backend returns:
            //
            // {
            //     history: [...]
            // }
            //
            // Therefore use data.history,
            // NOT data directly.

            const history =
                Array.isArray(data.history)
                    ? data.history
                    : [];


            if (history.length === 0) {

                sosHistoryList.innerHTML = `
                    <p>No SOS incidents recorded.</p>
                `;

                return;
            }


            sosHistoryList.innerHTML = "";


            history.forEach(sos => {

                const historyItem =
                    document.createElement("div");

                historyItem.className =
                    "sos-history-item";


                const status =
                    sos.status || "UNKNOWN";


                const statusClass =
                    status.toLowerCase();


                const mapLink =
                    `https://www.google.com/maps?q=${encodeURIComponent(
                        sos.latitude
                    )},${encodeURIComponent(
                        sos.longitude
                    )}`;


                historyItem.innerHTML = `

                    <div class="sos-history-header">

                        <strong>
                            SOS #${sos.id}
                        </strong>

                        <span
                            class="sos-status ${statusClass}"
                        >
                            ${escapeHtml(status)}
                        </span>

                    </div>


                    <p>
                        <strong>Location:</strong>
                        ${escapeHtml(
                            sos.locality ||
                            "Unavailable"
                        )}
                    </p>


                    <p>
                        <strong>Latitude:</strong>
                        ${escapeHtml(
                            String(
                                sos.latitude ??
                                "Unavailable"
                            )
                        )}
                    </p>


                    <p>
                        <strong>Longitude:</strong>
                        ${escapeHtml(
                            String(
                                sos.longitude ??
                                "Unavailable"
                            )
                        )}
                    </p>


                    <p>
                        <strong>Triggered:</strong>
                        ${escapeHtml(
                            formatDate(
                                sos.triggered_at
                            )
                        )}
                    </p>


                    <p>
                        <strong>Resolved:</strong>
                        ${escapeHtml(
                            formatDate(
                                sos.resolved_at
                            )
                        )}
                    </p>


                    <a
                        href="${mapLink}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View Location
                    </a>

                    <hr>
                `;


                sosHistoryList.appendChild(
                    historyItem
                );
            });


        } catch (error) {

            console.error(
                "Load SOS history error:",
                error
            );


            sosHistoryList.innerHTML = `
                <p>
                    Unable to load SOS history.
                </p>
            `;
        }
    }


    // ========================================================
    // LOGOUT
    // ========================================================

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                try {

                    await fetch(
                        "/api/auth/logout",
                        {
                            method: "POST",
                            credentials: "include"
                        }
                    );

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                } finally {

                    window.location.href =
                        "/";
                }
            }
        );
    }


    // ========================================================
    // HTML ESCAPE
    // ========================================================

    function escapeHtml(value) {

        const div =
            document.createElement("div");

        div.textContent =
            value === null ||
            value === undefined
                ? ""
                : String(value);

        return div.innerHTML;
    }


    // ========================================================
    // INITIALIZE DASHBOARD
    // ========================================================

    loadUser();

    loadContacts();

    getCurrentLocation();

    loadActiveSOS();

    loadSOSHistory();

});
