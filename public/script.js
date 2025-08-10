// public/script.js
document.getElementById('urlForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = document.getElementById('urlInput').value;
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<p class="loading">Loading...</p>';
    resultDiv.style.opacity = 0;

    try {
        const response = await fetch(`/download?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error(await response.text());
        }
        const data = await response.json();

        if (data.error) {
            resultDiv.innerHTML = `<p class="error">Error: ${data.message}</p>`;
            resultDiv.style.opacity = 1;
            return;
        }

        // Display the results (adapt based on API response structure)
        let html = `<h2>Platform: ${data.platform}</h2>`;
        html += `<p>Resolved URL: <a href="${data.resolvedUrl}" target="_blank">${data.resolvedUrl}</a></p>`;

        // Example: If data.data has 'media' array with download links
        if (data.data && data.data.media && Array.isArray(data.data.media)) {
            html += '<h3>Download Links:</h3>';
            data.data.media.forEach((item, index) => {
                html += `<a href="${item.url}" target="_blank">Download ${index + 1} (${item.quality || 'HD'})</a>`;
            });
        } else if (data.data && data.data.url) {
            // Fallback if single URL
            html += `<a href="${data.data.url}" target="_blank">Download Media</a>`;
        } else {
            html += '<p>No downloadable media found.</p>';
        }

        resultDiv.innerHTML = html;
        resultDiv.style.opacity = 1;
        resultDiv.style.transition = 'opacity 0.5s ease-in';
    } catch (error) {
        resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        resultDiv.style.opacity = 1;
    }
});
