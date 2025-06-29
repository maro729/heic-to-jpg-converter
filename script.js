document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const emailInput = document.getElementById('email-input');
    const convertBtn = document.getElementById('convert-btn');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const downloadLinksDiv = document.getElementById('download-links');
    const emailLink = document.getElementById('email-link');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');

    // Update quality display value when slider changes
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value;
    });

    convertBtn.addEventListener('click', async () => {
        const files = fileInput.files;
        const email = emailInput.value;
        const quality = parseInt(qualitySlider.value, 10) / 100;

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
                
                // 1. Read metadata (only from the first image)
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

                let processedBlob = file; // Default to original file
                let downloadFileName = file.name;

                // Determine file type based on MIME type and extension
                const fileType = file.type.toLowerCase();
                const fileNameLower = file.name.toLowerCase();
                const isHeic = fileType === 'image/heic' || fileType === 'image/heif' || fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif');
                const isJpeg = fileType === 'image/jpeg' || fileType === 'image/jpg' || fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.jpg');

                if (isHeic) {
                    // It's HEIC, convert it
                    try {
                        const conversionResult = await heic2any({
                            blob: file,
                            toType: 'image/jpeg',
                            quality: quality,
                        });
                        processedBlob = conversionResult;
                        downloadFileName = fileNameLower.replace(/\.(heic|heif)$/i, '.jpg');
                    } catch (conversionError) {
                        console.error(`Error converting HEIC file ${file.name}:`, conversionError);
                        alert(`Failed to convert ${file.name}. It might be corrupted or an unsupported HEIC format.`);
                        continue; // Skip to the next file if conversion fails
                    }
                } else if (isJpeg) {
                    // It's already JPG, no conversion needed
                    downloadFileName = file.name; // Keep original name
                } else {
                    // Handle other types or warn the user
                    console.warn(`Skipping unsupported file type: ${file.name} (${file.type})`);
                    alert(`Skipping unsupported file type: ${file.name}. Only HEIC/HEIF and JPG/JPEG are supported.`);
                    continue; // Skip to the next file
                }

                // 3. Create download link
                const url = URL.createObjectURL(processedBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = downloadFileName;
                link.textContent = `Download ${downloadFileName}`;
                downloadLinksDiv.appendChild(link);
            }

            // 4. Create mailto link
            let subject = 'Converted JPG Images';
            if (dateTimeOriginal) {
                const datePart = dateTimeOriginal.split(' ')[0].replace(/:/g, '-');
                subject = `Photos from ${datePart}`;
            }
            
            emailLink.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=Please find the attached JPG images.`;

            // Show results
            resultsDiv.classList.remove('hidden');

        } catch (error) {
            console.error('An error occurred during conversion:', error);
            let errorMessage = 'An error occurred during conversion. This can happen on mobile devices with large images due to memory limits.\n\nTry reducing the JPG quality or converting fewer images at once.';
            if (error.message) {
                errorMessage += `\n\nError details: ${error.message}`;
            }
            alert(errorMessage);
        } finally {
            // Re-enable UI
            loadingDiv.classList.add('hidden');
            convertBtn.disabled = false;
        }
    });
});
