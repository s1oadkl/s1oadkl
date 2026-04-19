# ========================================
# File Sharing Server - Python Flask
# ========================================

from flask import Flask, request, jsonify, send_from_directory
import os
import json
from datetime import datetime

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max

# File storage (using JSON for metadata)
STORAGE_FILE = 'files.json'

def load_files():
    if os.path.exists(STORAGE_FILE):
        with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_files(files):
    with open(STORAGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(files, f, ensure_ascii=False, indent=2)

# Get file icon based on extension
def get_file_icon(filename):
    ext = filename.split('.')[-1].lower()
    icons = {
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
        'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬', 'webm': '🎬',
        'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵',
        'pdf': '📄',
        'doc': '📝', 'docx': '📝', 'txt': '📝', 'rtf': '📝',
        'zip': '📦', 'rar': '📦', '7z': '📦'
    }
    return icons.get(ext, '📎')

# Format file size
def format_size(size):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"

# ========================================
# Routes
# ========================================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# Get all files
@app.route('/api/files', methods=['GET'])
def get_files():
    files = load_files()
    return jsonify(files)

# Upload files
@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'ファイルがありません'}), 400
    
    files_list = request.files.getlist('files')
    stored_files = load_files()
    
    for file in files_list:
        if file.filename:
            # Save file
            filename = f"{datetime.now().timestamp()}_{file.filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Get file info
            file_size = os.path.getsize(filepath)
            
            # Add to storage
            file_data = {
                'id': len(stored_files) + 1,
                'name': file.filename,
                'size': file_size,
                'size_formatted': format_size(file_size),
                'type': file.content_type,
                'date': datetime.now().strftime('%Y/%m/%d'),
                'icon': get_file_icon(file.filename),
                'filename': filename
            }
            stored_files.append(file_data)
    
    save_files(stored_files)
    return jsonify({'success': True, 'message': f'{len(files_list)}個のファイルをアップロードしました'})

# Download file
@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)

# Delete file
@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    files = load_files()
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Remove from storage
    files = [f for f in files if f.get('filename') != filename]
    save_files(files)
    
    # Delete file if exists
    if os.path.exists(filepath):
        os.remove(filepath)
    
    return jsonify({'success': True, 'message': 'ファイルを削除しました'})

# ========================================
# Run Server
# ========================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("🚀 サーバーを起動中...")
    print(f"🌐 http://127.0.0.1:{port} でアクセスしてください")
    app.run(host='0.0.0.0', port=port, debug=False)