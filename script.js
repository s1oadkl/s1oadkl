// ========================================
// File Sharing Website - JavaScript (Server Version)
// ========================================

// File storage (from server)
let files = [];

// File type icons
const fileIcons = {
    'image': '🖼️',
    'video': '🎬',
    'audio': '🎵',
    'pdf': '📄',
    'doc': '📝',
    'zip': '📦',
    'default': '📎'
};

// Get appropriate icon based on file extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return fileIcons.image;
    if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes(ext)) return fileIcons.video;
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return fileIcons.audio;
    if (ext === 'pdf') return fileIcons.pdf;
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return fileIcons.doc;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return fileIcons.zip;
    return fileIcons.default;
}

// Format file size
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// ========================================
// Load files from server
// ========================================
async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        files = await response.json();
        renderFiles();
    } catch (error) {
        console.error('ファイルの読み込みに失敗しました:', error);
    }
}

// Render files in grid and list view
function renderFiles() {
    const grid = document.getElementById('filesGrid');
    const list = document.getElementById('filesList');
    const emptyState = document.getElementById('emptyState');

    if (files.length === 0) {
        emptyState.style.display = 'block';
        grid.innerHTML = '';
        grid.appendChild(emptyState.cloneNode(true));
        list.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';

    // Render grid view
    grid.innerHTML = files.map((file) => `
        <div class="file-card">
            <span class="file-icon">${file.icon || getFileIcon(file.name)}</span>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${file.size_formatted || formatSize(file.size)}</div>
            <div class="file-actions">
                <button class="download-btn" onclick="downloadFile('${file.filename}')">⬇️ ダウンロード</button>
                <button class="delete-btn" onclick="deleteFile('${file.filename}')">🗑️ 削除</button>
            </div>
        </div>
    `).join('');

    // Render list view
    list.innerHTML = files.map((file) => `
        <div class="file-list-item">
            <span class="file-icon">${file.icon || getFileIcon(file.name)}</span>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${file.size_formatted || formatSize(file.size)}</div>
            </div>
            <div class="file-actions">
                <button class="download-btn" onclick="downloadFile('${file.filename}')">⬇️</button>
                <button class="delete-btn" onclick="deleteFile('${file.filename}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ========================================
// Upload Handling
// ========================================
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');

// Click to upload
uploadBox.addEventListener('click', (e) => {
    if (e.target.classList.contains('upload-btn')) return;
    fileInput.click();
});

// Drag and drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

// File input change
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
});

// Handle uploaded files
async function handleFiles(fileList) {
    if (fileList.length === 0) return;

    const progressWrapper = document.getElementById('progressWrapper');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressWrapper.classList.add('show');

    // Upload to server
    const formData = new FormData();
    Array.from(fileList).forEach(file => formData.append('files', file));

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.success) {
            showToast(result.message);
            loadFiles(); // Reload files from server
        }
    } catch (error) {
        console.error('アップロードに失敗しました:', error);
        showToast('アップロードに失敗しました');
    }

    // Simulate progress animation
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 100) progress = 100;
        progressFill.style.width = progress + '%';
        progressText.textContent = `アップロード中... ${Math.round(progress)}%`;

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                progressWrapper.classList.remove('show');
                progressFill.style.width = '0%';
            }, 500);
        }
    }, 100);
}

// ========================================
// File Actions
// ========================================
function downloadFile(filename) {
    window.location.href = `/api/download/${filename}`;
}

async function deleteFile(filename) {
    if (confirm('このファイルを削除しますか？')) {
        try {
            const response = await fetch(`/api/delete/${filename}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (result.success) {
                showToast(result.message);
                loadFiles(); // Reload files from server
            }
        } catch (error) {
            console.error('削除に失敗しました:', error);
            showToast('削除に失敗しました');
        }
    }
}

// ========================================
// View Toggle
// ========================================
const viewBtns = document.querySelectorAll('.view-btn');
const filesGrid = document.getElementById('filesGrid');
const filesList = document.getElementById('filesList');

viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        
        // Update active button
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle views
        if (view === 'grid') {
            filesGrid.style.display = 'grid';
            filesList.classList.remove('show');
        } else {
            filesGrid.style.display = 'none';
            filesList.classList.add('show');
        }
    });
});

// ========================================
// Modal Functions
// ========================================
function showModal(link) {
    document.getElementById('shareLink').value = link;
    document.getElementById('shareModal').classList.add('show');
}

function closeModal() {
    document.getElementById('shareModal').classList.remove('show');
}

function copyLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    showToast('リンクをコピーしました！');
    closeModal();
}

// Close modal on outside click
document.getElementById('shareModal').addEventListener('click', (e) => {
    if (e.target.id === 'shareModal') {
        closeModal();
    }
});

// ========================================
// Toast Notification
// ========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ========================================
// Initial Render
// ========================================
loadFiles();