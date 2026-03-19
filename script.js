// ==================== TAB SWITCHING ====================
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                
                // Update buttons
                tabBtns.forEach(b => {
                    b.classList.remove('tab-active', 'text-blue-600');
                    b.classList.add('text-gray-500');
                });
                btn.classList.add('tab-active');
                btn.classList.remove('text-gray-500');
                
                // Update content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tab).classList.add('active');
            });
        });

        // ==================== DOCUMENTS TAB ====================
        const docDropArea = document.getElementById('doc-drop-area');
        const docFileInput = document.getElementById('doc-fileElem');
        const docBrowseBtn = document.getElementById('doc-browse-btn');
        const docToFormatSelect = document.getElementById('doc-to-format');
        const docDropText = docDropArea.querySelector('h3');
        const docResultArea = document.getElementById('doc-result-area');
        const docStatusText = document.getElementById('doc-status-text');
        const docProgressBar = document.getElementById('doc-progress-bar');
        const docProgressBarContainer = document.getElementById('doc-progress-bar-container');
        const docDownloadSection = document.getElementById('doc-download-section');
        const docConvertBtn = document.getElementById('doc-convert-btn');
        const docConvertButtonContainer = document.getElementById('doc-convert-button-container');
        const docResetBtn = document.getElementById('doc-reset-btn');

        let docSelectedFiles = [];
        let docDetectedFormat = '';

        function docGetFileFormat(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const formats = {
                'pdf': 'pdf', 'doc': 'docx', 'docx': 'docx',
                'xls': 'xlsx', 'xlsx': 'xlsx', 'ppt': 'pptx', 'pptx': 'pptx',
                'jpg': 'jpg', 'jpeg': 'jpg', 'png': 'png', 'gif': 'gif', 'bmp': 'bmp', 'webp': 'webp',
                'svg': 'svg', 'txt': 'txt', 'html': 'html', 'htm': 'html',
                'json': 'json', 'xml': 'xml', 'csv': 'csv', 'epub': 'epub'
            };
            return formats[ext] || null;
        }

        function docPreventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        function docHighlight() { docDropArea.classList.add('active'); }
        function docUnhighlight() { docDropArea.classList.remove('active'); }

        function docUpdateStatus(message, showProgress = false, progress = 0) {
            docStatusText.textContent = message;
            docProgressBarContainer.style.display = showProgress ? 'block' : 'none';
            docProgressBar.style.width = `${progress}%`;
        }

        function docShowDownloadLink(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.className = 'bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-lg inline-flex items-center';
            a.innerHTML = `<i class="fas fa-download mr-2"></i> Download ${filename}`;
            docDownloadSection.innerHTML = '';
            docDownloadSection.appendChild(a);
            docResetBtn.style.display = 'inline-block';
        }

        function docResetUI() {
            docFileInput.value = '';
            docSelectedFiles = [];
            docDetectedFormat = '';
            docToFormatSelect.value = '';
            docDropText.textContent = 'Drag & Drop document files here';
            docDropArea.style.display = 'block';
            docConvertButtonContainer.style.display = 'none';
            docResultArea.style.display = 'none';
            docResetBtn.style.display = 'none';
        }

        async function docConvertAndDownload() {
            if (docSelectedFiles.length === 0) {
                docUpdateStatus('Please select a file first.');
                return;
            }

            const toFormat = docToFormatSelect.value;
            if (!docDetectedFormat || !toFormat) {
                docUpdateStatus('Please select a valid output format.');
                return;
            }

            // Check for server-required conversions
            const serverRequired = ['docx', 'xlsx', 'pptx', 'epub'];
            if (serverRequired.includes(toFormat)) {
                docUpdateStatus(`${toFormat.toUpperCase()} conversion requires server-side processing. This feature is coming soon!`);
                return;
            }

            const file = docSelectedFiles[0];
            const outputFilename = `${file.name.split('.').slice(0, -1).join('.')}.${toFormat}`;

            docConvertButtonContainer.style.display = 'none';
            docResultArea.style.display = 'block';
            docUpdateStatus('Preparing conversion...', true, 10);

            try {
                window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
                const { jsPDF } = window.jspdf;

                // ==================== IMAGE TO PDF ====================
                if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(docDetectedFormat) && toFormat === 'pdf') {
                    docUpdateStatus('Converting Image to PDF...', true, 30);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imgData = e.target.result;
                        const pdf = new jsPDF();
                        const imgProps = pdf.getImageProperties(imgData);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                        pdf.addImage(imgData, docDetectedFormat === 'svg' ? 'PNG' : docDetectedFormat.toUpperCase(), 0, 0, pdfWidth, pdfHeight);
                        const blob = pdf.output('blob');
                        docUpdateStatus('Conversion Complete!', true, 100);
                        docShowDownloadLink(blob, outputFilename);
                    };
                    reader.readAsDataURL(file);
                    return;
                }

                // ==================== PDF TO IMAGE ====================
                if (docDetectedFormat === 'pdf' && ['jpg', 'png', 'webp'].includes(toFormat)) {
                    docUpdateStatus(`Converting PDF to ${toFormat.toUpperCase()}...`, true, 30);
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await window['pdfjs-dist/build/pdf'].getDocument({ data: arrayBuffer }).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    const mimeType = toFormat === 'jpg' ? 'image/jpeg' : `image/${toFormat}`;
                    canvas.toBlob(blob => {
                        docUpdateStatus('Conversion Complete!', true, 100);
                        docShowDownloadLink(blob, outputFilename);
                    }, mimeType, 0.95);
                    return;
                }

                // ==================== IMAGE TO IMAGE ====================
                if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(docDetectedFormat) && ['jpg', 'jpeg', 'png', 'webp'].includes(toFormat)) {
                    docUpdateStatus(`Converting ${docDetectedFormat.toUpperCase()} to ${toFormat.toUpperCase()}...`, true, 50);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            // Fill background with white for JPG conversion
                            if (toFormat === 'jpg' || toFormat === 'jpeg') {
                                ctx.fillStyle = '#FFFFFF';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                            }
                            ctx.drawImage(img, 0, 0);
                            const mimeType = toFormat === 'jpg' ? 'image/jpeg' : `image/${toFormat}`;
                            canvas.toBlob(blob => {
                                docUpdateStatus('Conversion Complete!', true, 100);
                                docShowDownloadLink(blob, outputFilename);
                            }, mimeType, 0.92);
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                    return;
                }

                // ==================== TEXT TO PDF ====================
                if (docDetectedFormat === 'txt' && toFormat === 'pdf') {
                    docUpdateStatus('Converting Text to PDF...', true, 50);
                    const text = await file.text();
                    const pdf = new jsPDF();
                    const lines = pdf.splitTextToSize(text, 180);
                    pdf.text(lines, 10, 10);
                    const blob = pdf.output('blob');
                    docUpdateStatus('Conversion Complete!', true, 100);
                    docShowDownloadLink(blob, outputFilename);
                    return;
                }

                // ==================== PDF TO TEXT ====================
                if (docDetectedFormat === 'pdf' && toFormat === 'txt') {
                    docUpdateStatus('Extracting text from PDF...', true, 50);
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await window['pdfjs-dist/build/pdf'].getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
                    }
                    
                    const blob = new Blob([fullText], { type: 'text/plain' });
                    docUpdateStatus('Conversion Complete!', true, 100);
                    docShowDownloadLink(blob, outputFilename);
                    return;
                }

                // ==================== HTML TO PDF ====================
                if (docDetectedFormat === 'html' && toFormat === 'pdf') {
                    docUpdateStatus('Converting HTML to PDF...', true, 50);
                    const text = await file.text();
                    const pdf = new jsPDF();
                    const lines = pdf.splitTextToSize(text.replace(/<[^>]*>/g, ''), 180); // Strip HTML tags
                    pdf.text(lines, 10, 10);
                    const blob = pdf.output('blob');
                    docUpdateStatus('Conversion Complete!', true, 100);
                    docShowDownloadLink(blob, outputFilename);
                    return;
                }

                // ==================== PDF TO HTML ====================
                if (docDetectedFormat === 'pdf' && toFormat === 'html') {
                    docUpdateStatus('Converting PDF to HTML...', true, 50);
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await window['pdfjs-dist/build/pdf'].getDocument({ data: arrayBuffer }).promise;
                    let htmlContent = '<!DOCTYPE html><html><head><title>Converted PDF</title></head><body>';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        htmlContent += `<div class="page"><h2>Page ${i}</h2><p>${pageText}</p></div>`;
                    }
                    htmlContent += String.fromCharCode(60,47,98,111,100,121,62,60,47,104,116,109,108,62); 
                    
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    docUpdateStatus('Conversion Complete!', true, 100);
                    docShowDownloadLink(blob, outputFilename);
                    return;
                }

                // ==================== JSON TO PDF ====================
                if (docDetectedFormat === 'json' && toFormat === 'pdf') {
                    docUpdateStatus('Converting JSON to PDF...', true, 50);
                    const text = await file.text();
                    const json = JSON.stringify(JSON.parse(text), null, 2);
                    const pdf = new jsPDF();
                    const lines = pdf.splitTextToSize(json, 170);
                    pdf.setFontSize(8);
                    pdf.text(lines, 10, 10);
                    const blob = pdf.output('blob');
                    docUpdateStatus('Conversion Complete!', true, 100);
                    docShowDownloadLink(blob, outputFilename);
                    return;
                }

                // ==================== XML TO PDF ====================
                if (docDetectedFormat === 'xml' && toFormat === 'pdf') {
                    docUpdateStatus('Converting XML to PDF...', true, 50);
                    const text = await file.text();
                    const pdf = new jsPDF();
                    const lines = pdf.splitTextToSize(text, 170);
                    pdf.setFontSize(8);
                    pdf.text(lines, 10, 10);
                    const blob = pdf.output('blob');
                    docUpdateStatus('Conversion Complete!', true, 100);
                    docShowDownloadLink(blob, outputFilename);
                    return;
                }

                // ==================== CSV TO PDF ====================
                if (docDetectedFormat === 'csv' && toFormat === 'pdf') {
                    docUpdateStatus('Converting CSV to PDF...', true, 50);
                    const text = await file.text();
                    const rows = text.split('\n').map(row => row.split(','));
                    const pdf = new jsPDF();
                    
                    let y = 10;
                    pdf.setFontSize(10);
                    rows.forEach((row, idx) => {
                        if (y > 280) { pdf.addPage(); y = 10; }
                        pdf.text(row.join(' | '), 10, y);
                        y += 6;
                    });
                    
                    const blob = pdf.output('blob');
                    docUpdateStatus('Conversion Complete!', true, 100);
                    docShowDownloadLink(blob, outputFilename);
                    return;
                }

                // ==================== SVG TO PDF ====================
                if (docDetectedFormat === 'svg' && toFormat === 'pdf') {
                    docUpdateStatus('Converting SVG to PDF...', true, 50);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const pdf = new jsPDF();
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (img.height * pdfWidth) / img.width;
                            pdf.addImage(e.target.result, 'PNG', 0, 0, pdfWidth, pdfHeight);
                            const blob = pdf.output('blob');
                            docUpdateStatus('Conversion Complete!', true, 100);
                            docShowDownloadLink(blob, outputFilename);
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                    return;
                }

                // ==================== SVG TO PNG/JPG ====================
                if (docDetectedFormat === 'svg' && ['jpg', 'jpeg', 'png', 'webp'].includes(toFormat)) {
                    docUpdateStatus(`Converting SVG to ${toFormat.toUpperCase()}...`, true, 50);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            if (toFormat === 'jpg' || toFormat === 'jpeg') {
                                ctx.fillStyle = '#FFFFFF';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                            }
                            ctx.drawImage(img, 0, 0);
                            const mimeType = toFormat === 'jpg' ? 'image/jpeg' : `image/${toFormat}`;
                            canvas.toBlob(blob => {
                                docUpdateStatus('Conversion Complete!', true, 100);
                                docShowDownloadLink(blob, outputFilename);
                            }, mimeType, 0.92);
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                    return;
                }

                // If we reach here, conversion is not supported
                throw new Error(`Conversion from ${docDetectedFormat.toUpperCase()} to ${toFormat.toUpperCase()} is not supported in browser. Some formats require server-side processing.`);
                
            } catch (error) {
                console.error('Conversion failed:', error);
                docUpdateStatus(`Error: ${error.message}`);
                docResetBtn.style.display = 'inline-block';
            }
        }

        function docHandleFiles(files) {
            if (files.length === 0) return;
            docSelectedFiles = Array.from(files);
            const firstFile = docSelectedFiles[0];
            docDetectedFormat = docGetFileFormat(firstFile.name);

            if (!docDetectedFormat) {
                docUpdateStatus('Unsupported file format detected.');
                return;
            }

            docDropText.textContent = `${docSelectedFiles.length} file(s) selected: ${firstFile.name} (${docDetectedFormat.toUpperCase()})`;
            docDropArea.style.display = 'none';
            docConvertButtonContainer.style.display = 'block';
            docResultArea.style.display = 'block';
            docStatusText.textContent = 'File ready. Select output format and click Convert.';
            docProgressBarContainer.style.display = 'none';
            docDownloadSection.innerHTML = '';
            docResetBtn.style.display = 'none';
        }

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            docDropArea.addEventListener(eventName, docPreventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            docDropArea.addEventListener(eventName, docHighlight, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            docDropArea.addEventListener(eventName, docUnhighlight, false);
        });
        docDropArea.addEventListener('drop', (e) => docHandleFiles(e.dataTransfer.files));
        docBrowseBtn.addEventListener('click', () => docFileInput.click());
        docFileInput.addEventListener('change', () => docHandleFiles(docFileInput.files));
        docConvertBtn.addEventListener('click', docConvertAndDownload);
        docResetBtn.addEventListener('click', docResetUI);

        // ==================== IMAGES TAB ====================
        const imgDropzone = document.getElementById('img-dropzone');
        const imgFileInput = document.getElementById('img-fileInput');
        const imgFileList = document.getElementById('img-fileList');
        const imgFormatSel = document.getElementById('img-format');
        const imgQuality = document.getElementById('img-quality');
        const imgQval = document.getElementById('img-qval');
        const imgResizeW = document.getElementById('img-resizeW');
        const imgResizeH = document.getElementById('img-resizeH');
        const imgLockAR = document.getElementById('img-lockAR');
        const imgConvertBtn = document.getElementById('img-convertBtn');
        const imgStatus = document.getElementById('img-status');
        const imgClearAll = document.getElementById('img-clearAll');
        const imgResults = document.getElementById('img-results');
        const imgDownloadAll = document.getElementById('img-downloadAll');

        const IMG_MAX = 50 * 1024 * 1024;
        let imgFiles = [];
        let imgOutputs = [];
        let imgAr = null;

        const humanSize = (bytes) => {
            const u = ['B','KB','MB','GB'];
            let i = 0, n = bytes;
            while (n >= 1024 && i < u.length-1) { n/=1024; i++; }
            return `${n.toFixed(n < 10 && i>0 ? 1:0)} ${u[i]}`;
        };

        imgQuality.addEventListener('input', () => imgQval.textContent = imgQuality.value);

        function imgUpdateResizeByWidth() {
            if (imgLockAR.checked && imgAr && imgResizeW.value) {
                imgResizeH.value = Math.max(1, Math.round(Number(imgResizeW.value) / imgAr));
            }
        }
        function imgUpdateResizeByHeight() {
            if (imgLockAR.checked && imgAr && imgResizeH.value) {
                imgResizeW.value = Math.max(1, Math.round(Number(imgResizeH.value) * imgAr));
            }
        }
        imgResizeW.addEventListener('input', imgUpdateResizeByWidth);
        imgResizeH.addEventListener('input', imgUpdateResizeByHeight);

        function imgToast(msg) { imgStatus.textContent = msg; }
        function imgOk(msg) { imgStatus.textContent = msg; imgStatus.classList.add('text-green-600'); }

        function imgAddFiles(list) {
            const accepted = [];
            for (const f of list) {
                if (!f.type.startsWith('image/')) { imgToast(`Skipped non-image: ${f.name}`); continue; }
                if (f.size > IMG_MAX) { imgToast(`Skipped >50MB: ${f.name}`); continue; }
                const url = URL.createObjectURL(f);
                accepted.push({ file: f, url, w: null, h: null });
            }
            imgFiles = imgFiles.concat(accepted);
            if (imgFiles.length) imgProbeDimensions(accepted);
            imgRenderFileList();
        }

        async function imgProbeDimensions(items) {
            for (const it of items) {
                try {
                    const img = new Image();
                    const p = new Promise((res, rej) => { img.onload = () => res(); img.onerror = rej; });
                    img.src = it.url; await p;
                    it.w = img.naturalWidth; it.h = img.naturalHeight;
                    if (!imgResizeW.value && !imgResizeH.value) {
                        imgAr = it.w / it.h;
                        imgResizeW.placeholder = it.w; imgResizeH.placeholder = it.h;
                    }
                } catch {}
            }
        }

        function imgRenderFileList() {
            imgFileList.innerHTML = '';
            if (!imgFiles.length) { imgFileList.innerHTML = '<li class="text-sm text-gray-500">No files added yet.</li>'; return; }
            for (const [idx, it] of imgFiles.entries()) {
                const li = document.createElement('li');
                li.className = 'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3';
                const img = document.createElement('img');
                img.className = 'thumb';
                img.src = it.url;
                img.alt = it.file.name;
                const meta = document.createElement('div');
                meta.className = 'min-w-0 flex-1';
                meta.innerHTML = `<div class="truncate text-sm font-medium">${it.file.name}</div>
                                  <div class="text-xs text-gray-500">${it.file.type || 'unknown'} · ${humanSize(it.file.size)}${it.w ? ` · ${it.w}×${it.h}` : ''}</div>`;
                const rm = document.createElement('button');
                rm.className = 'ml-auto text-xs rounded-lg border px-2 py-1 hover:bg-gray-50';
                rm.textContent = 'Remove';
                rm.onclick = () => { URL.revokeObjectURL(it.url); imgFiles.splice(idx, 1); imgRenderFileList(); };
                li.append(img, meta, rm);
                imgFileList.appendChild(li);
            }
        }

        ['dragenter', 'dragover'].forEach(evt => imgDropzone.addEventListener(evt, e => { e.preventDefault(); imgDropzone.classList.add('drop-active'); }));
        ['dragleave', 'drop'].forEach(evt => imgDropzone.addEventListener(evt, e => { e.preventDefault(); imgDropzone.classList.remove('drop-active'); }));
        imgDropzone.addEventListener('drop', (e) => imgAddFiles(e.dataTransfer.files));
        imgFileInput.addEventListener('change', (e) => imgAddFiles(e.target.files));

        async function imgConvertBlob(inputFile, outType, quality01, resizeTarget) {
            const url = URL.createObjectURL(inputFile);
            try {
                const bmp = await createImageBitmap(inputFile);
                const canvas = (window.OffscreenCanvas) ? new OffscreenCanvas(bmp.width, bmp.height) : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bmp, 0, 0);

                let targetW = canvas.width, targetH = canvas.height;
                if (resizeTarget && (resizeTarget.w || resizeTarget.h)) {
                    if (resizeTarget.w && resizeTarget.h) { targetW = resizeTarget.w; targetH = resizeTarget.h; }
                    else if (resizeTarget.w) { targetW = resizeTarget.w; targetH = Math.round((canvas.height / canvas.width) * targetW); }
                    else if (resizeTarget.h) { targetH = resizeTarget.h; targetW = Math.round((canvas.width / canvas.height) * targetH); }
                    const c2 = (window.OffscreenCanvas) ? new OffscreenCanvas(targetW, targetH) : Object.assign(document.createElement('canvas'), { width: targetW, height: targetH });
                    const ctx2 = c2.getContext('2d');
                    ctx2.imageSmoothingQuality = 'high';
                    ctx2.drawImage(canvas, 0, 0, targetW, targetH);
                    canvas.width = targetW; canvas.height = targetH;
                    ctx.drawImage(c2, 0, 0);
                }

                const q = outType === 'image/png' ? undefined : Math.min(1, Math.max(0.01, quality01));
                return new Promise((res, rej) => {
                    if (canvas instanceof OffscreenCanvas) canvas.convertToBlob({ type: outType, quality: q }).then(res, rej);
                    else canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), outType, q);
                });
            } finally { URL.revokeObjectURL(url); }
        }

        function imgWithNewExt(name, outType) {
            const map = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' };
            const ext = map[outType] || outType.split('/')[1];
            const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
            return `${base}.${ext}`;
        }

        function imgRenderResult(outBlob, outName) {
            const card = document.createElement('div');
            card.className = 'rounded-xl border border-gray-200 p-3 flex items-center gap-3';

            const left = document.createElement('div');
            left.className = 'flex items-center gap-3 min-w-0';
            const img = document.createElement('img');
            img.className = 'thumb';
            img.src = URL.createObjectURL(outBlob);
            img.alt = outName;
            const meta = document.createElement('div');
            meta.className = 'min-w-0';
            meta.innerHTML = `<div class="text-sm font-medium truncate">${outName}</div><div class="text-xs text-gray-500">${humanSize(outBlob.size)}</div>`;

            const dl = document.createElement('button');
            dl.className = 'ml-auto rounded-lg border px-3 py-2 hover:bg-gray-50';
            dl.innerHTML = '<i class="fas fa-download"></i>';
            dl.onclick = () => saveAs(outBlob, outName);

            left.append(img, meta);
            card.append(left, dl);
            imgResults.appendChild(card);

            imgOutputs.push({ name: outName, blob: outBlob, url: img.src });
            imgDownloadAll.classList.toggle('hidden', imgOutputs.length < 2);
        }

        async function imgHandleConvert() {
            if (!imgFiles.length) { imgToast('Please add some images first.'); return; }
            imgConvertBtn.disabled = true;
            imgResults.innerHTML = '';
            imgOutputs.forEach(o => URL.revokeObjectURL(o.url));
            imgOutputs = [];

            const outType = imgFormatSel.value;
            const q01 = Math.min(1, Math.max(0.01, Number(imgQuality.value) / 100));
            const target = { w: Number(imgResizeW.value) || 0, h: Number(imgResizeH.value) || 0 };

            for (let i = 0; i < imgFiles.length; i++) {
                const it = imgFiles[i];
                imgStatus.textContent = `Converting ${i + 1}/${imgFiles.length}: ${it.file.name}`;
                try {
                    const blob = await imgConvertBlob(it.file, outType, q01, target);
                    const name = imgWithNewExt(it.file.name, outType);
                    imgRenderResult(blob, name);
                } catch (e) {
                    console.error(e);
                    imgToast(`Failed: ${it.file.name}`);
                }
            }
            imgOk('Done! You can download files below.');
            imgConvertBtn.disabled = false;
        }

        async function imgDownloadAllZip() {
            if (!imgOutputs.length) return;
            const zip = new JSZip();
            for (const o of imgOutputs) zip.file(o.name, o.blob);
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, 'converted_images.zip');
        }

        function imgClearAllFiles() {
            for (const f of imgFiles) URL.revokeObjectURL(f.url);
            for (const o of imgOutputs) URL.revokeObjectURL(o.url);
            imgFiles = [];
            imgOutputs = [];
            imgFileList.innerHTML = '';
            imgResults.innerHTML = '';
            imgStatus.textContent = '';
            imgDownloadAll.classList.add('hidden');
            imgResizeW.value = '';
            imgResizeH.value = '';
        }

        imgConvertBtn.addEventListener('click', imgHandleConvert);
        imgDownloadAll.addEventListener('click', imgDownloadAllZip);
        imgClearAll.addEventListener('click', imgClearAllFiles);

        // ==================== VIDEOS TAB ====================
        const vidDropzone = document.getElementById('vid-dropzone');
        const vidFileInput = document.getElementById('vid-fileInput');
        const vidFileList = document.getElementById('vid-fileList');
        const vidFormatSel = document.getElementById('vid-format');
        const vidQuality = document.getElementById('vid-quality');
        const vidQval = document.getElementById('vid-qval');
        const vidConvertBtn = document.getElementById('vid-convertBtn');
        const vidStatus = document.getElementById('vid-status');
        const vidClearAll = document.getElementById('vid-clearAll');
        const vidResults = document.getElementById('vid-results');
        const vidDownloadAll = document.getElementById('vid-downloadAll');

        const VID_MAX = 50 * 1024 * 1024;
        let vidFiles = [];
        let vidOutputs = [];

        vidQuality.addEventListener('input', () => vidQval.textContent = vidQuality.value);

        function vidToast(msg) { vidStatus.textContent = msg; }
        function vidOk(msg) { vidStatus.textContent = msg; vidStatus.classList.add('text-green-600'); }

        function vidAddFiles(list) {
            const accepted = [];
            for (const f of list) {
                if (!f.type.startsWith('video/')) { vidToast(`Skipped non-video: ${f.name}`); continue; }
                if (f.size > VID_MAX) { vidToast(`Skipped >50MB: ${f.name}`); continue; }
                const url = URL.createObjectURL(f);
                accepted.push({ file: f, url });
            }
            vidFiles = vidFiles.concat(accepted);
            vidRenderFileList();
        }

        function vidRenderFileList() {
            vidFileList.innerHTML = '';
            if (!vidFiles.length) { vidFileList.innerHTML = '<li class="text-sm text-gray-500">No files added yet.</li>'; return; }
            for (const [idx, it] of vidFiles.entries()) {
                const li = document.createElement('li');
                li.className = 'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3';
                const video = document.createElement('video');
                video.className = 'thumb';
                video.src = it.url;
                video.muted = true;
                video.preload = 'metadata';
                const meta = document.createElement('div');
                meta.className = 'min-w-0 flex-1';
                meta.innerHTML = `<div class="truncate text-sm font-medium">${it.file.name}</div>
                                  <div class="text-xs text-gray-500">${it.file.type || 'unknown'} · ${humanSize(it.file.size)}</div>`;
                const rm = document.createElement('button');
                rm.className = 'ml-auto text-xs rounded-lg border px-2 py-1 hover:bg-gray-50';
                rm.textContent = 'Remove';
                rm.onclick = () => { URL.revokeObjectURL(it.url); vidFiles.splice(idx, 1); vidRenderFileList(); };
                li.append(video, meta, rm);
                vidFileList.appendChild(li);
            }
        }

        ['dragenter', 'dragover'].forEach(evt => vidDropzone.addEventListener(evt, e => { e.preventDefault(); vidDropzone.classList.add('drop-active'); }));
        ['dragleave', 'drop'].forEach(evt => vidDropzone.addEventListener(evt, e => { e.preventDefault(); vidDropzone.classList.remove('drop-active'); }));
        vidDropzone.addEventListener('drop', (e) => vidAddFiles(e.dataTransfer.files));
        vidFileInput.addEventListener('change', (e) => vidAddFiles(e.target.files));

        async function vidConvertVideo(file, outType, qual) {
            return new Promise((resolve, reject) => {
                const video = document.createElement('video');
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    let mimeType = outType;
                    if (!MediaRecorder.isTypeSupported(outType)) {
                        mimeType = 'video/webm';
                    }

                    const stream = canvas.captureStream(30);
                    const mediaRecorder = new MediaRecorder(stream, {
                        mimeType,
                        videoBitsPerSecond: 1000000 * qual
                    });

                    const chunks = [];
                    mediaRecorder.ondataavailable = e => chunks.push(e.data);
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(chunks, { type: outType });
                        resolve(blob);
                    };

                    mediaRecorder.start();

                    const drawFrame = () => {
                        if (!video.paused && !video.ended) {
                            ctx.drawImage(video, 0, 0);
                            requestAnimationFrame(drawFrame);
                        }
                    };

                    video.ontimeupdate = drawFrame;
                    video.onended = () => mediaRecorder.stop();

                    video.play().catch(reject);
                };

                video.onerror = reject;
                video.src = URL.createObjectURL(file);
                video.load();
            });
        }

        function vidRenderResult(blob, name) {
            const card = document.createElement('div');
            card.className = 'rounded-xl border border-gray-200 p-3 flex items-center gap-3';

            const video = document.createElement('video');
            video.className = 'thumb';
            video.src = URL.createObjectURL(blob);
            video.muted = true;
            video.preload = 'metadata';

            const meta = document.createElement('div');
            meta.className = 'min-w-0 flex-1';
            meta.innerHTML = `<div class="text-sm font-medium truncate">${name}</div><div class="text-xs text-gray-500">${humanSize(blob.size)}</div>`;

            const dl = document.createElement('button');
            dl.className = 'ml-auto rounded-lg border px-3 py-2 hover:bg-gray-50';
            dl.innerHTML = '<i class="fas fa-download"></i>';
            dl.onclick = () => saveAs(blob, name);

            card.append(video, meta, dl);
            vidResults.appendChild(card);

            vidOutputs.push({ name, blob, url: video.src });
            vidDownloadAll.classList.toggle('hidden', vidOutputs.length < 2);
        }

        async function vidHandleConvert() {
            if (!vidFiles.length) { vidToast('Please add some videos first.'); return; }
            vidConvertBtn.disabled = true;
            vidResults.innerHTML = '';
            vidOutputs.forEach(o => URL.revokeObjectURL(o.url));
            vidOutputs = [];

            const outType = vidFormatSel.value;
            const qual = parseFloat(vidQuality.value);

            for (let i = 0; i < vidFiles.length; i++) {
                const it = vidFiles[i];
                vidStatus.textContent = `Converting ${i + 1}/${vidFiles.length}: ${it.file.name}`;
                try {
                    const blob = await vidConvertVideo(it.file, outType, qual);
                    const ext = outType.split('/')[1];
                    const name = it.file.name.replace(/\.[^.]+$/, `.${ext}`);
                    vidRenderResult(blob, name);
                } catch (e) {
                    console.error(e);
                    vidToast(`Failed: ${it.file.name}`);
                }
            }
            vidOk('Done! You can download files below.');
            vidConvertBtn.disabled = false;
        }

        async function vidDownloadAllZip() {
            if (!vidOutputs.length) return;
            const zip = new JSZip();
            for (const o of vidOutputs) zip.file(o.name, o.blob);
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, 'converted_videos.zip');
        }

        function vidClearAllFiles() {
            for (const f of vidFiles) URL.revokeObjectURL(f.url);
            for (const o of vidOutputs) URL.revokeObjectURL(o.url);
            vidFiles = [];
            vidOutputs = [];
            vidFileList.innerHTML = '';
            vidResults.innerHTML = '';
            vidStatus.textContent = '';
            vidDownloadAll.classList.add('hidden');
        }

        vidConvertBtn.addEventListener('click', vidHandleConvert);
        vidDownloadAll.addEventListener('click', vidDownloadAllZip);
        vidClearAll.addEventListener('click', vidClearAllFiles);

        // ==================== POPULAR CONVERSIONS ====================
        document.querySelectorAll('.convert-popular').forEach(button => {
            button.addEventListener('click', function() {
                const toFormat = this.dataset.to;
                // Switch to documents tab
                document.querySelector('[data-tab="documents"]').click();
                docToFormatSelect.value = toFormat;
                document.getElementById('documents').scrollIntoView({ behavior: 'smooth' });
            });
        });

        // ==================== FAQ ====================
        document.querySelectorAll('.faq-question').forEach(button => {
            button.addEventListener('click', () => {
                const answer = button.nextElementSibling;
                const icon = button.querySelector('i');
                answer.classList.toggle('hidden');
                icon.classList.toggle('transform');
                icon.classList.toggle('rotate-180');
            });
        });

        // CTA button
        document.getElementById('cta-btn').addEventListener('click', () => {
            document.querySelector('[data-tab="documents"]').click();
            document.getElementById('documents').scrollIntoView({ behavior: 'smooth' });
        });