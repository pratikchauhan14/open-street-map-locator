
# 🌍 Interactive Filterable Map

A powerful and reusable **web-based tool** for displaying and filtering location data with **JavaScript + Leaflet.js**.  
This project provides an efficient way to **visualize datasets** on an interactive map, complete with a **dynamic sidebar and advanced filtering capabilities**.

---

## ✨ Features

- 🗺️ Interactive map powered by **Leaflet.js**  
- ⚡ Real-time filtering (select, checkbox, radio)  
- 📑 Dynamic sidebar listing synced with map filters  
- 🎯 Click-to-pan & highlight functionality  
- 📐 Auto-fitting bounds for filtered results  
- 🧩 Fully customizable templates for list & popup  
- 🔄 Reset button for clearing filters  
- 🌙 Dark mode support (via Tailwind classes)  

---

## 📦 Installation

Include **Leaflet.js** and your compiled `MapManager.js` script:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="path-to-your/MapManager.js"></script>
```

Add the required HTML structure:

```html
<div id="map" class="w-full h-[600px]"></div>
<div id="listing"></div>
<button id="resetFilters">Reset Filters</button>
```

---

## ⚙️ Usage

### 1. Define Filters

```js
const filterConfig = [
  { id: 'countryFilter', key: 'country', type: 'select' },
  { id: 'typeFilter', key: 'type', type: 'radio' },
  { id: 'labelFilter', key: 'label', type: 'select' },
  { id: 'labelColorFilter', key: 'label_color', type: 'select' },
  { id: 'isActiveFilter', key: 'is_active', type: 'checkbox' }
];
```

---

### 2. Define Templates

**Sidebar listing template:**

```js
const customListingTemplate = (location) => {
  const statusColor = location.is_active ? 'bg-green-500' : 'bg-gray-400';
  const statusText = location.is_active ? 'Active' : 'Inactive';

  return `
    <div class="listing-item p-4 border-b hover:bg-gray-100 dark:hover:bg-gray-800">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full ${statusColor}" title="${statusText}"></div>
        <h4 class="font-bold">${location.name}</h4>
      </div>
      <p>${location.content}</p>
      <div class="mt-2 flex gap-2">
        <span class="badge">${location.country}</span>
        <span class="badge bg-blue-100">${location.type}</span>
        <span class="badge" style="background:${location.label_color}">Label: ${location.label}</span>
      </div>
    </div>
  `;
};
```

**Popup (infobox) template:**

```js
const customInfoboxTemplate = (location) => {
  const statusColor = location.is_active ? 'bg-green-500' : 'bg-gray-400';
  const statusText = location.is_active ? 'Active' : 'Inactive';

  return `
    <div class="custom-infobox">
      <img src="${location.imageUrl}" alt="${location.name}" class="w-full object-cover" />
      <div class="p-3">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full ${statusColor}" title="${statusText}"></div>
          <h4 class="font-bold">${location.name}</h4>
        </div>
        <p>${location.content}</p>
        <div class="mt-2 flex gap-2">
          <span class="badge">${location.country}</span>
          <span class="badge bg-blue-100">${location.type}</span>
          <span class="badge" style="background:${location.label_color}">Label: ${location.label}</span>
        </div>
      </div>
    </div>
  `;
};
```

---

### 3. Initialize the Map

```js
const mapOptions = {
  mapId: 'map',
  listingId: 'listing',
  data: mapData, // your JSON data array
  filters: filterConfig,
  listingTemplate: customListingTemplate,
  infoboxTemplate: customInfoboxTemplate,
  initialCenter: [25, 20],
  initialZoom: 2
};

const myMap = new MapManager(mapOptions);
```

---

### 4. Add Reset Button

```js
document.getElementById('resetFilters').addEventListener('click', () => {
  myMap.reset();
});
```

---

## 📊 Data Format

Your `mapData` array should look like:

```js
const mapData = [
  {
    name: "Starbucks Connaught Place",
    country: "India",
    latitude: 28.6315,
    longitude: 77.2167,
    type: "cafe",
    label: "A",
    label_color: "red",
    is_active: true,
    content: "Popular coffee shop in central Delhi",
    imageUrl: "https://example.com/starbucks.jpg"
  },
  {
    name: "Blue Tokai Coffee Roasters",
    country: "India",
    latitude: 28.497,
    longitude: 77.084,
    type: "cafe",
    label: "B",
    label_color: "blue",
    is_active: false,
    content: "Specialty coffee roasters in Gurgaon",
    imageUrl: "https://example.com/bluetokai.jpg"
  }
];
```

---

## 🌐 Live Demo

Deploy easily with **GitHub Pages**:  
👉 [https://pratikchauhan14.github.io/open-street-map-locator](https://pratikchauhan14.github.io/open-street-map-locator)

---

## 🛠️ Customization

- 🎨 **Templates**: Modify `listingTemplate` and `infoboxTemplate` for your own design  
- 📍 **Markers**: Extend `MapManager` to use custom Leaflet icons  
- 🔗 **Data**: Plug in your own API or JSON file  
- 🌍 **Initial Center & Zoom**: Configure via `mapOptions`  

---

## 📩 Contact

For queries or collaborations:  

**Name:** Pratik Chauhan  
**Email:** pratik@2cube.studio  
**Website:** 2cube.studio  

We specialize in **custom data visualization** and **web mapping solutions**.  
