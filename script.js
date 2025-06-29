document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const emailInput = document.getElementById('email-input');
    const convertBtn = document.getElementById('convert-btn');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const downloadLinksDiv = document.getElementById('download-links');
    const emailLink = document.getElementById('email-link');

    convertBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        const email = emailInput.value;

        if (files.length === 0) {
            alert('Please select at least one HEIC file.');
            return;
        }

        if (!email) {
            alert('Please enter a recipient email address.');
            return;
        }

        // Reset UI
        resultsDiv.classList.add('hidden');
        downloadLinksDiv.innerHTML = '';
        loadingDiv.classList.remove('hidden');
        convertBtn.disabled = true;

        try {
            let dateTimeOriginal = null;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // 1. Read metadata to find the creation date (only from the first image)
                if (i === 0) {
                    try {
                        const fileBuffer = await file.arrayBuffer();
                        const ExifReader = window.ExifReader;
                        const tags = ExifReader.load(fileBuffer);
                        dateTimeOriginal = tags['DateTimeOriginal']?.description;
                    } catch (err) {
                        console.warn(`Could not read EXIF data from ${file.name}:`, err);
                    }
                }

                // 2. Convert HEIC to JPG
                const conversionResult = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.9,
                });

                // 3. Create download link
                const url = URL.createObjectURL(conversionResult);
                const link = document.createElement('a');
                link.href = url;
                link.download = file.name.replace(/\.heic$/i, '.jpg');
                link.textContent = `Download ${link.download}`;
                downloadLinksDiv.appendChild(link);
            }

            // 4. Create mailto link
            let subject = 'Converted JPG Images';
            if (dateTimeOriginal) {
                // Format YYYY-MM-DD from 'YYYY:MM:DD HH:MM:SS'
                const datePart = dateTimeOriginal.split(' ')[0].replace(/:/g, '-');
                subject = `Photos from ${datePart}`;
            }
            
            emailLink.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=Please find the attached JPG images.`;

            // Show results
            resultsDiv.classList.remove('hidden');

        } catch (error) {
            console.error('An error occurred during conversion:', error);
            alert('An error occurred during conversion. Please check the console for details.');
        } finally {
            // Re-enable UI
            loadingDiv.classList.add('hidden');
            convertBtn.disabled = false;
        }
    });
});
