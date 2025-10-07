class StoreLocator {
    constructor(options) {
        // Store flexible parameters from initialization
        this.mapData = options.mapData;
        this.sidebarCardTemplate = options.sidebarCardTemplate;
        this.infoboxTemplate = options.infoboxTemplate;

        // DOM Elements
        this.mapElement = document.getElementById('map');
        this.listElement = document.getElementById('location-list');
        this.searchInput = document.getElementById('search-box');
        this.geoButton = document.getElementById('use-location-btn');
        this.titleElement = document.getElementById('search-title');
        this.radiusSelect = document.getElementById('radius-select');
        this.resetButton = document.getElementById('reset'); // Add reference to reset button

        // State for autocomplete
        this.autocompleteContainer = null;
        this.debounceTimer = null;

        // State
        this.map = null;
        this.markers = [];
        this.userCoords = null;
        this.userLocationMarker = null; // To hold the "Your Location" marker
    }

    async init() {
        this.updateTitle("All Stores");
        this.createAutocompleteUI(); // Create UI elements for autocomplete
        this.initMap();
        this.buildLocations();
        this.setupEventListeners();
        this.updateResetButtonState(); // Initially disable the reset button

        // Automatically try to use the user's current location on load
        await this.getUserLocation(true); // 'true' makes it fail silently
    }

    // Creates the autocomplete container
    createAutocompleteUI() {
        // Create the container for suggestions
        this.autocompleteContainer = document.createElement('div');
        this.autocompleteContainer.className = 'autocomplete-suggestions';
        this.searchInput.parentNode.insertBefore(this.autocompleteContainer, this.searchInput.nextSibling);
    }

    initMap() {
        this.map = L.map(this.mapElement).setView([39.8283, -98.5795], 5); // Center of US
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            minZoom:3,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

  

    buildLocations() {
        this.mapData.forEach((location, index) => {
            if (!location.hs_id || !location.lat || !location.lng) {
                console.warn(`Skipping location at index ${index} due to missing data.`);
                return;
            }
    
            const addressParts = [location.address, location.city, location.state?.name, location.zip_code];
            const fullAddress = addressParts.filter(part => part).join(', ');
    
            const cardHtml = this.sidebarCardTemplate
                .replace('_index_', index + 1)
                .replace('_name_', location.name)
                .replace('_city_', location.city)
                .replace('_information_', location.information)
                .replace('_image_url_', location.image?.url)
                .replace('_image_alt_text_', location.image?.altText)
                .replace('_address_', fullAddress)
                .replace('_phone_', location.contact_number)
                .replace('_email_', location.email_address);
    
            const cardWrapper = document.createElement('div');
            cardWrapper.innerHTML = cardHtml.trim();
            const cardElement = cardWrapper.querySelector('.location-card');
          
            const phoneTagList = cardElement.querySelector('a#phone');
            if (!location.contact_number) { phoneTagList.remove();}
    
            const emailTagList = cardElement.querySelector('a#email');
            if (!location.email_address) { emailTagList.remove();}
          
            cardElement.dataset.id = location.hs_id;
            // **MODIFIED**: Store the original index for easy resetting later.
            cardElement.dataset.originalIndex = index + 1;
    
            this.listElement.appendChild(cardElement);
    
            const markerIcon = L.divIcon({
                html: `<div class="pin-wrapper"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="#000000" d="M172.268 501.67C26.97 291.031 0 269.413 0 192C0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67c-9.535 13.774-29.93 13.773-39.464 0z"></path></svg><span>${index + 1}</span></div>`,
                className: 'leaflet-div-icon',
                iconSize: [30, 33],
                iconAnchor: [12, 0]
            });
    
            const marker = L.marker([location.lat, location.lng], { icon: markerIcon, id: location.hs_id });
            const popupHtml = this.infoboxTemplate
                .replace('_name_', location.name)
                .replace('_city_', location.city)
                .replace('_address_', fullAddress)
                .replace('_phone_', location.contact_number)
                .replace('_information_', location.information)
                .replace('_image_url_', location.image?.url)
                .replace('_image_alt_text_', location.image?.altText)
                .replace('_email_', location.email_address);
    
            const popupContainer = document.createElement('div');
            popupContainer.innerHTML = popupHtml;
    
            const imageTag = popupContainer.querySelector('img#image_url');
            if (!location.image?.url) { imageTag.remove();}
    
            const nameTag = popupContainer.querySelector('h4#name');
            if (!location.name) { nameTag.remove();}
    
            const addressTag = popupContainer.querySelector('div#address');
            if (!location.address) { addressTag.remove();}
    
            const phoneTag = popupContainer.querySelector('a#phone');
            if (!location.contact_number) { phoneTag.remove();}
    
            const emailTag = popupContainer.querySelector('a#email');
            if (!location.email_address) { emailTag.remove();}
    
            marker.bindPopup(popupContainer);
            marker.addTo(this.map);
            this.markers.push(marker);
        });
    }
    
    sortLocationsByDistance() {
        const cards = Array.from(this.listElement.querySelectorAll('.location-card:not(.hidden)'));
        cards.sort((a, b) => parseFloat(a.dataset.distance) - parseFloat(b.dataset.distance));
        
        // **MODIFIED**: After sorting, loop through the cards to update their index number
        // on both the sidebar and the map pin.
        cards.forEach((card, index) => {
            const newIndex = index + 1;
            
            // Update the index in the sidebar card
            const indexElement = card.querySelector('.index');
            if (indexElement) {
                indexElement.textContent = newIndex;
            }
    
            // Find the corresponding marker and update its index
            const locationId = Number(card.dataset.id);
            const marker = this.markers.find(m => m.options.id === locationId);
            if (marker) {
                // Re-create the marker's icon with the new index number
                marker.setIcon(L.divIcon({
                    html: `<div class="pin-wrapper"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="#000000" d="M172.268 501.67C26.97 291.031 0 269.413 0 192C0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67c-9.535 13.774-29.93 13.773-39.464 0z"></path></svg><span>${newIndex}</span></div>`,
                    className: 'leaflet-div-icon',
                    iconSize: [30, 33],
                    iconAnchor: [12, 0]
                }));
            }
            
            // Re-append the card to the list, which physically moves it in the DOM
            this.listElement.appendChild(card);
        });
    }
    
    setActive(id, scrollIntoView = false) {
        this.listElement.querySelectorAll('.location-card').forEach(c => c.classList.remove('active'));
        const selectedCard = this.listElement.querySelector(`[data-id='${id}']`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            if (scrollIntoView) {
                // **MODIFIED**: This is a more robust way to scroll within the container
                // without scrolling the whole page.
                const list = this.listElement;
                const newScrollTop = selectedCard.offsetTop - (list.clientHeight / 2) + (selectedCard.clientHeight / 2);
    
                list.scrollTo({
                    top: newScrollTop,
                    behavior: 'smooth'
                });
            }
        }
        const selectedMarker = this.markers.find(m => m.options.id == id);
        if (selectedMarker) {
            if (scrollIntoView) {
                this.map.panTo(selectedMarker.getLatLng());
            } else {
                this.map.setView(selectedMarker.getLatLng(), 10);
            }
            selectedMarker.openPopup();
        }
    }
    
    resetApplication() {
        this.resetActiveState();
        this.searchInput.value = '';
        this.radiusSelect.value = 'all';
        this.userCoords = null;
        if (this.userLocationMarker) {
            this.userLocationMarker.remove();
            this.userLocationMarker = null;
        }
        this.updateTitle("All Stores");
        this.geoButton.classList.remove('disabled');
    
        const allCards = Array.from(this.listElement.children);
    
        allCards.forEach(card => {
            card.classList.remove('hidden');
            card.removeAttribute('data-distance');
            const distanceEl = card.querySelector('.distance');
            if (distanceEl) distanceEl.textContent = '';
            
            const marker = this.markers.find(m => m.options.id == card.dataset.id);
            if (marker) marker.addTo(this.map);
        });
    
        // **MODIFIED**: Sort cards back to their original order using the stored data attribute.
        allCards.sort((a, b) => a.dataset.originalIndex - b.dataset.originalIndex);
        
        // **MODIFIED**: Re-append cards and reset their indexes to the original state.
        allCards.forEach(card => {
            const originalIndex = card.dataset.originalIndex;
    
            const indexElement = card.querySelector('.index');
            if (indexElement) {
                indexElement.textContent = originalIndex;
            }
    
            const locationId = Number(card.dataset.id);
            const marker = this.markers.find(m => m.options.id === locationId);
            if (marker) {
                marker.setIcon(L.divIcon({
                    html: `<div class="pin-wrapper"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="#000000" d="M172.268 501.67C26.97 291.031 0 269.413 0 192C0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67c-9.535 13.774-29.93 13.773-39.464 0z"></path></svg><span>${originalIndex}</span></div>`,
                    className: 'leaflet-div-icon',
                    iconSize: [30, 33],
                    iconAnchor: [12, 0]
                }));
            }
    
            this.listElement.appendChild(card);
        });
    
        this.map.setView([39.8283, -98.5795], 5);
        this.updateResetButtonState();
    }
    
    

    setupEventListeners() {
        const updateBtn = document.getElementById('update-btn');

        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                const query = this.searchInput.value;
                if (query.length > 2) {
                    this.fetchAutocompleteSuggestions(query);
                } else {
                    this.hideAutocompleteSuggestions();
                }
            }, 300);
        });

        updateBtn.addEventListener('click', async () => {
            const searchTerm = this.searchInput.value;
            if (!searchTerm) return;
            this.hideAutocompleteSuggestions();
            const coords = await this.geocodeSearchTerm(searchTerm);
            if (coords) {
                this.performSearch(coords, searchTerm);
            } else {
                alert(`Could not find coordinates for "${searchTerm}".`);
            }
        });

        this.radiusSelect.addEventListener('change', () => this.updateListVisibilityAndOrder());

        this.geoButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (this.geoButton.classList.contains('disabled')) return;
            this.getUserLocation();
        });
        
        // Add event listener for the new reset button
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.resetApplication());
        }

        this.listElement.addEventListener('click', (e) => {
            const card = e.target.closest('.location-card');
            if (card) this.setActive(card.dataset.id);
        });

        this.markers.forEach(marker => {
            marker.on('click', (e) => this.setActive(e.target.options.id, true));
        });
        
        this.map.on('popupclose', (e) => {
            if (e.popup?._source?.options) {
                const closedMarkerId = e.popup._source.options.id;
                const correspondingCard = this.listElement.querySelector(`[data-id='${closedMarkerId}']`);
                if (correspondingCard) correspondingCard.classList.remove('active');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target)) {
                this.hideAutocompleteSuggestions();
            }
        });
    }

    async getUserLocation(isSilent = false) {
        this.resetActiveState();
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
            });

            this.userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
            this.updateTitle("You");

            if (this.userLocationMarker) this.userLocationMarker.remove();
            
            this.map.setView([this.userCoords.lat, this.userCoords.lng], 10);
            this.userLocationMarker = L.marker([this.userCoords.lat, this.userCoords.lng], { title: "Your Location" }).addTo(this.map);
            this.updateDistances();
            this.updateListVisibilityAndOrder();
            this.geoButton.classList.add('disabled');
            this.updateResetButtonState();

        } catch (error) {
            if (!isSilent) alert('Could not get your location. Please enable location services.');
            console.error("Geolocation error:", error.message);
        }
    }

    updateDistances() {
        if (!this.userCoords) return;
        this.listElement.querySelectorAll('.location-card').forEach(card => {
            const locationId = Number(card.dataset.id);
            const locationData = this.mapData.find(loc => loc.hs_id === locationId);
            if (locationData) {
                const distance = this.calculateDistance(this.userCoords.lat, this.userCoords.lng, locationData.lat, locationData.lng);
                card.dataset.distance = distance;
                const distanceEl = card.querySelector('.distance');
                if (distanceEl) distanceEl.textContent = `${distance.toFixed(1)} miles away`;
            }
        });
    }

    updateListVisibilityAndOrder() {
        this.resetActiveState();
        if (!this.userCoords) {
             this.updateResetButtonState(); // Handle case where radius is changed with no location set
             return;
        }
        const radiusInMiles = this.radiusSelect.value === 'all' ? 99999 : parseFloat(this.radiusSelect.value);

        this.listElement.querySelectorAll('.location-card').forEach(card => {
            const cardDistance = parseFloat(card.dataset.distance);
            const locationId = Number(card.dataset.id);
            const marker = this.markers.find(m => m.options.id === locationId);

            if (cardDistance <= radiusInMiles) {
                card.classList.remove('hidden');
                if (marker) marker.addTo(this.map);
            } else {
                card.classList.add('hidden');
                if (marker) marker.removeFrom(this.map);
            }
        });
        this.sortLocationsByDistance();
        this.updateResetButtonState();
    }

    

    
    
    updateTitle(text) {
        if (this.titleElement) this.titleElement.innerHTML = `Stores Near <strong>${text}</strong>`;
    }

    async geocodeSearchTerm(term) {
        try {
            const encodedTerm = encodeURIComponent(term);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedTerm}&format=json&limit=1&countrycodes=us`);
            const data = await response.json();
            return data?.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
        } catch (error) {
            console.error("Geocoding API error:", error);
            return null;
        }
    }
    
    async fetchAutocompleteSuggestions(query) {
        const encodedQuery = encodeURIComponent(query);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&countrycodes=us`);
            const suggestions = await response.json();
            this.displayAutocompleteSuggestions(suggestions);
        } catch (error) {
            console.error('Autocomplete fetch error:', error);
        }
    }

    displayAutocompleteSuggestions(suggestions) {
        this.hideAutocompleteSuggestions();
        if (suggestions.length === 0) return;

        const ul = document.createElement('ul');
        suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.textContent = suggestion.display_name;
            li.addEventListener('click', () => {
                this.searchInput.value = suggestion.display_name;
                this.hideAutocompleteSuggestions();
                const coords = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
                this.performSearch(coords, suggestion.display_name.split(',')[0]); 
            });
            ul.appendChild(li);
        });
        this.autocompleteContainer.appendChild(ul);
    }

    hideAutocompleteSuggestions() {
        this.autocompleteContainer.innerHTML = '';
    }

    performSearch(coords, searchTerm) {
        this.resetActiveState();
        this.updateTitle(searchTerm);
        this.userCoords = coords;
        this.updateDistances();
        this.updateListVisibilityAndOrder();
        this.map.setView(coords, 7);
        this.geoButton.classList.remove('disabled');
        this.updateResetButtonState();
    }

    resetActiveState() {
        if (this.map) this.map.closePopup();
        const activeCard = this.listElement.querySelector('.location-card.active');
        if (activeCard) activeCard.classList.remove('active');
    }

    
    
    // NEW METHOD: Manages the disabled state of the reset button
    updateResetButtonState() {
        if (!this.resetButton) return;
        const isSearchActive = this.searchInput.value.trim() !== '';
        const isRadiusActive = this.radiusSelect.value !== 'all';
        const isGeoActive = this.userLocationMarker !== null;
        this.resetButton.disabled = !(isSearchActive || isRadiusActive || isGeoActive);
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3958.8; // Earth radius in miles
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
}

