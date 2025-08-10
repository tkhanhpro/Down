// public/script.js
let apiKey = '';

async function loadApiKey() {
    try {
        const response = await fetch('/get-apikey');
        const data = await response.json();
        apiKey = data.apikey;
        document.getElementById('apikeyDisplay').innerHTML = `Your API Key: ${apiKey} <br><small>(Use this for API calls; limited to 500 requests/month per IP)</small>`;
    } catch (error) {
        document.getElementById('apikeyDisplay').innerHTML = '<p class="error">Error loading API Key</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadApiKey);

document.getElementById('urlForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = document.getElementById('urlInput').value;
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<p>Loading...</p>';
    resultDiv.classList.remove('fade-in');

    try {
        const response = await fetch(`/download?url=${encodeURIComponent(url)}&apikey=${encodeURIComponent(apiKey)}`);
        if (!response.ok) {
            throw new Error(await response.text());
        }
        const data = await response.json();

        if (data.error) {
            resultDiv.innerHTML = `<p class="error">Error: ${data.message}</p>`;
            return;
        }

        // Display the results (adapt based on API response structure)
        let html = `<h2>Platform: ${data.platform}</h2>`;
        html += `<p>Resolved URL: ${data.resolvedUrl}</p>`;

        // Example: If data.data has 'media' array with download links
        if (data.data && data.data.media && Array.isArray(data.data.media)) {
            html += '<h3>Download Links:</h3>';
            data.data.media.forEach((item, index) => {
                html += `<a href="${item.url}" target="_blank">Download Media ${index + 1} (${item.quality || 'Default'})</a>`;
            });
        } else if (data.data && data.data.url) {
            // Fallback if single URL
            html += `<a href="${data.data.url}" target="_blank">Download Media</a>`;
        } else {
            html += '<p>No downloadable media found.</p>';
        }

        resultDiv.innerHTML = html;
        resultDiv.classList.add('fade-in');
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
});
