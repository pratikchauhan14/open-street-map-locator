class GoogleMapManager {
    constructor(options) {
        this.options = {
            initialCenter: { lat: 20, lng: 0 },
            initialZoom: 2,
            useClustering: false, // <-- New flexible option with a default
            ...options,
        };

        if (!this.options.mapId || !this.options.listingId || !this.options.data) {
            console.error("GoogleMapManager Error: 'mapId', 'listingId', and 'data' are required.");
            return;
        }

        this.map = null;
        this.locations = this.options.data;
        this.activeFilters = {};
        this.listingElement = document.getElementById(this.options.listingId);
        this.infowindow = new google.maps.InfoWindow();
        this.markerClusterer = null; // <-- Property to hold the clusterer instance

        this.init();
    }

    init() {
        this._initMap();
        this._addMarkers();
        this._setupEventListeners();
        this._applyFilters();
    }

    _initMap() {
        this.map = new google.maps.Map(document.getElementById(this.options.mapId), {
            center: this.options.initialCenter,
            zoom: this.options.initialZoom,
        });
    }

    _addMarkers() {
        // Create all markers but don't add them to the map directly.
        // The _applyFilters method will decide whether to add them to the map or the clusterer.
        this.locations.forEach(location => {
            const marker = new google.maps.Marker({
                position: { lat: location.latitude, lng: location.longitude },
            });

            marker.addListener('click', () => {
                this.infowindow.setContent(this.options.infoboxTemplate(location));
                this.infowindow.open(this.map, marker);
                this._setActiveListItem(location);
            });

            location.marker = marker;
        });

        // If clustering is enabled, create the clusterer instance.
        if (this.options.useClustering) {
            const markers = this.locations.map(location => location.marker);
            this.markerClusterer = new markerClusterer.MarkerClusterer({ map: this.map, markers: [] }); // Initially empty
        }

        this.infowindow.addListener('closeclick', () => {
            const currentActive = this.listingElement.querySelector('.active');
            if (currentActive) currentActive.classList.remove('active');
        });
    }

    _applyFilters() {
        this.infowindow.close();

        const visibleLocations = this.locations.filter(loc => this._doesLocationMatchFilters(loc));
        this._populateListing(visibleLocations);

        const visibleMarkers = visibleLocations.map(loc => loc.marker);

        // --- CLUSTERING LOGIC ---
        if (this.options.useClustering) {
            // With clustering, we clear and add only the visible markers to the clusterer.
            this.markerClusterer.clearMarkers();
            this.markerClusterer.addMarkers(visibleMarkers);
        } else {
            // Without clustering, we show/hide each marker individually.
            this.locations.forEach(location => {
                const isVisible = visibleLocations.includes(location);
                location.marker.setMap(isVisible ? this.map : null);
            });
        }

        const bounds = new google.maps.LatLngBounds();
        visibleMarkers.forEach(marker => bounds.extend(marker.getPosition()));

        if (visibleLocations.length > 0) {
            this.map.fitBounds(bounds);
        }
    }

    // --- All other methods (_setActiveListItem, reset, _setupEventListeners, etc.) remain unchanged ---
    reset() {
        this.options.filters.forEach(filter => {
            if (filter.type === 'select') {
                document.getElementById(filter.id).selectedIndex = 0;
            } else if (filter.type === 'checkbox') {
                document.getElementById(filter.id).checked = false;
            } else if (filter.type === 'radio') {
                document.querySelector(`input[name="${filter.name}"][value="all"]`).checked = true;
            }
        });
        this._setupEventListeners();
        this._applyFilters();
    }

    _setActiveListItem(location) {
        if (!location.listingElement || !document.body.contains(location.listingElement)) return;
        const currentActive = this.listingElement.querySelector('.active');
        if (currentActive) currentActive.classList.remove('active');
        location.listingElement.classList.add('active');
        location.listingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    _setupEventListeners() {
        this.options.filters.forEach(filter => {
            if (filter.type === 'radio') {
                const radios = document.querySelectorAll(`input[name="${filter.name}"]`);
                this.activeFilters[filter.key] = document.querySelector(`input[name="${filter.name}"]:checked`).value;
                radios.forEach(radio => radio.addEventListener('change', (e) => { this.activeFilters[filter.key] = e.target.value; this._applyFilters(); }));
            } else {
                const el = document.getElementById(filter.id);
                this.activeFilters[filter.key] = el.type === 'checkbox' ? el.checked : el.value;
                el.addEventListener('change', (e) => { this.activeFilters[filter.key] = el.type === 'checkbox' ? e.target.checked : e.target.value; this._applyFilters(); });
            }
        });
    }

    _doesLocationMatchFilters(location) {
        for (const key in this.activeFilters) {
            const filterValue = this.activeFilters[key];
            const locationValue = location[key];
            if (filterValue === 'all') continue;
            if (typeof filterValue === 'boolean') { if (filterValue && !locationValue) return false; continue; }
            if (String(locationValue) !== String(filterValue)) return false;
        }
        return true;
    }

    _populateListing(visibleLocations) {
        this.listingElement.innerHTML = '';
        if (visibleLocations.length === 0) {
            this.listingElement.innerHTML = '<div class="no-results p-4 text-sm text-gray-500">No matching locations found.</div>';
            return;
        }
        visibleLocations.forEach(location => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.options.listingTemplate(location);
            const itemElement = wrapper.firstElementChild;
            location.listingElement = itemElement;
            itemElement.addEventListener('click', () => {
                this.map.panTo(location.marker.getPosition());
                this.map.setZoom(12);
                this.infowindow.setContent(this.options.infoboxTemplate(location));
                this.infowindow.open(this.map, location.marker);
                this._setActiveListItem(location);
            });
            this.listingElement.appendChild(itemElement);
        });
    }
}