class MapManager {
    constructor(options) {

        this.debug = false;

        // --- DEBUG LOG ---
        if (this.debug) console.log('[MapManager] 1. Initializing...');

        this.options = {
            initialCenter: [20, 0],
            initialZoom: 2,
            maxZoom: 30,
            tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; OpenStreetMap contributors',
            popupMaxWords: 15,
            infoboxTemplate: this._defaultInfoboxTemplate.bind(this),
            listingTemplate: this._defaultListingTemplate.bind(this),
            filters: [],
            ...options,
        };

        if (!this.options.mapId || !this.options.listingId || !this.options.data) {
            console.error("[MapManager] CRITICAL ERROR: 'mapId', 'listingId', or 'data' option is missing.");
            return;
        }

        // --- DEBUG LOG ---
        if (this.options.data && Array.isArray(this.options.data)) {
            if (this.debug) console.log(`[MapManager] 2. Data received successfully with ${this.options.data.length} locations.`);
        } else {
            console.error('[MapManager] CRITICAL ERROR: The provided data is not a valid array.', this.options.data);
            return;
        }

        this.map = null;
        this.locations = this.options.data;
        this.activeFilters = {};
        this.listingElement = document.getElementById(this.options.listingId);

        
        this.init();
    }

    init() {
        this._initMap();
        this._addMarkers();
        this._setupEventListeners();
        this._applyFilters(); 
    }

    _initMap() { /* ... (code is unchanged) ... */
        this.map = L.map(this.options.mapId).setView(this.options.initialCenter, this.options.initialZoom);
        L.tileLayer(this.options.tileLayerUrl, { maxZoom: this.options.maxZoom, attribution: this.options.attribution }).addTo(this.map);
    }

    /**
     * Resets all filters to their default values and updates the map.
     */
    reset() {
        if (this.debug) console.log('[MapManager] Resetting all filters...');

        // 1. Reset the actual HTML form elements
        this.options.filters.forEach(filter => {
            if (filter.type === 'select') {
                const selectElement = document.getElementById(filter.id);
                if (selectElement) selectElement.selectedIndex = 0; // Reset to the first option
            } 
            else if (filter.type === 'checkbox') {
                const checkboxElement = document.getElementById(filter.id);
                if (checkboxElement) checkboxElement.checked = false; // Uncheck the box
            } 
            else if (filter.type === 'radio') {
                // Find and check the radio button with the value 'all'
                const defaultRadio = document.querySelector(`input[name="${filter.name}"][value="all"]`);
                if (defaultRadio) defaultRadio.checked = true;
            }
        });

        // 2. Re-read the (now reset) values into our internal state
        this._setupEventListeners();
        
        // 3. Re-apply the filters to update the map and list
        this._applyFilters();
    }

    // _addMarkers() { /* ... (code is unchanged) ... */
    //     this.locations.forEach(location => {
    //         const marker = L.marker([location.latitude, location.longitude]);
    //         marker.bindPopup(this.options.infoboxTemplate(location));
    //         marker.on('popupclose', () => {
    //             if (location.listingElement) location.listingElement.classList.remove('active');
    //         });
    //         location.marker = marker;
    //     });
    // }
    _addMarkers() {
        this.locations.forEach(location => {
            const marker = L.marker([location.latitude, location.longitude]);
            marker.bindPopup(this.options.infoboxTemplate(location));

            // NEW: Listen for when a popup opens (marker is clicked)
            marker.on('popupopen', () => {
                this._setActiveListItem(location);
            });

            marker.on('popupclose', () => {
                if (location.listingElement) {
                    location.listingElement.classList.remove('active');
                }
            });
            location.marker = marker;
        });
    }

    /**
     * NEW HELPER METHOD
     * Handles highlighting and scrolling to the active list item.
     * @param {object} location - The location object to activate.
     */
    _setActiveListItem(location) {
        // Ensure the listing element for this location exists in the DOM
        if (!location.listingElement || !document.body.contains(location.listingElement)) {
            return;
        }

        // Find and remove the .active class from any other item
        const currentActive = this.listingElement.querySelector('.active');
        if (currentActive) {
            currentActive.classList.remove('active');
        }

        // Add the .active class to the correct item
        location.listingElement.classList.add('active');

        // Scroll the item into view
        location.listingElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }

    _setupEventListeners() { /* ... (code is unchanged) ... */
        this.options.filters.forEach(filter => {
            if (filter.type === 'radio') {
                const radioButtons = document.querySelectorAll(`input[name="${filter.name}"]`);
                if (radioButtons.length === 0) return;
                const initiallyChecked = document.querySelector(`input[name="${filter.name}"]:checked`);
                this.activeFilters[filter.key] = initiallyChecked ? initiallyChecked.value : 'all';
                radioButtons.forEach(radio => radio.addEventListener('change', (e) => { this.activeFilters[filter.key] = e.target.value; this._applyFilters(); }));
            } else {
                const filterElement = document.getElementById(filter.id);
                if (!filterElement) return;
                this.activeFilters[filter.key] = filter.type === 'checkbox' ? filterElement.checked : filterElement.value;
                filterElement.addEventListener('change', (e) => { this.activeFilters[filter.key] = filter.type === 'checkbox' ? e.target.checked : e.target.value; this._applyFilters(); });
            }
        });
    }

    _applyFilters() {
        // --- THIS IS THE NEW LINE ---
        this.map.closePopup(); // Close any open infobox before applying filters

        const visibleLocations = this.locations.filter(location => this._doesLocationMatchFilters(location));
        
        this._populateListing(visibleLocations);
        
        const visibleLocationSet = new Set(visibleLocations);
        this.locations.forEach(location => {
            const marker = location.marker;
            if (visibleLocationSet.has(location)) {
                if (!this.map.hasLayer(marker)) this.map.addLayer(marker);
            } else {
                if (this.map.hasLayer(marker)) this.map.removeLayer(marker);
            }
        });

        if (visibleLocations.length > 0) {
            const bounds = L.latLngBounds(visibleLocations.map(loc => loc.marker.getLatLng()));
            this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
    }

    _doesLocationMatchFilters(location) { /* ... (code is unchanged) ... */
        for (const key in this.activeFilters) {
            const filterValue = this.activeFilters[key];
            const locationValue = location[key];
            if (filterValue === 'all') continue;
            if (typeof filterValue === 'boolean') { if (filterValue && !locationValue) return false; continue; }
            if (String(locationValue) !== String(filterValue)) return false;
        }
        return true;
    }

    // _populateListing(visibleLocations) {
    //     // --- DEBUG LOG ---
    //     if (this.debug) console.log(`[MapManager] 5. Populating listing with ${visibleLocations.length} items.`);
    
    //     this.listingElement.innerHTML = '';
    //     if (visibleLocations.length === 0) {
    //         this.listingElement.innerHTML = '<div class="no-results p-4 text-sm text-gray-500">No matching locations found.</div>';
    //         return;
    //     }
    
    //     visibleLocations.forEach(location => {
    //         const itemElementWrapper = document.createElement('div');
    //         itemElementWrapper.innerHTML = this.options.listingTemplate(location);
            
    //         // --- THIS IS THE FIX ---
    //         const itemElement = itemElementWrapper.firstElementChild; 
            
    
    //         location.listingElement = itemElement;
    //         itemElement.addEventListener('click', () => {
    //             const currentActive = this.listingElement.querySelector('.active');
    //             if (currentActive) currentActive.classList.remove('active');
    //             itemElement.classList.add('active');
    //             this.map.setView([location.latitude, location.longitude], 12);
    //             location.marker.openPopup();
    //         });
    //         this.listingElement.appendChild(itemElement);
    //     });
    // }
    _populateListing(visibleLocations) {
        this.listingElement.innerHTML = '';
        if (visibleLocations.length === 0) {
            this.listingElement.innerHTML = '<div class="no-results p-4 text-sm text-gray-500">No matching locations found.</div>';
            return;
        }
    
        visibleLocations.forEach(location => {
            const itemElementWrapper = document.createElement('div');
            itemElementWrapper.innerHTML = this.options.listingTemplate(location);
            const itemElement = itemElementWrapper.firstElementChild; 
    
            location.listingElement = itemElement;
            itemElement.addEventListener('click', () => {
                // SIMPLIFIED: Just move the map and open the popup.
                // The 'popupopen' event will now handle the active state.
                this.map.setView([location.latitude, location.longitude], 12);
                location.marker.openPopup();
            });
            this.listingElement.appendChild(itemElement);
        });
    }

    _defaultInfoboxTemplate(location) { /* ... (code is unchanged) ... */
        return `<div class="popup-content"><h3>${location.name}</h3><p>${this._truncateToWords(location.content, this.options.popupMaxWords)}</p></div>`;
    }
    _defaultListingTemplate(location) { /* ... (code is unchanged) ... */
        return `<div class="listing-item"><h4>${location.name}</h4><p>${location.country}</p></div>`;
    }
    _truncateToWords(content, maxWords) { /* ... (code is unchanged) ... */
        if (!content) return '';
        const words = content.split(' ');
        if (words.length <= maxWords) return content;
        return words.slice(0, maxWords).join(' ') + '...';
    }
}