# Dreamina Account Manager - Setup Guide

## Arsitektur Aplikasi

Aplikasi ini terdiri dari dua komponen terpisah:

### 1. Backend Server (Express.js)
- **Port**: 5000
- **Lokasi**: Root directory (`server.js`)
- **Fungsi**: API endpoints, account registration, checking, history management

### 2. Frontend Applications

#### A. React App (Modern UI)
- **Port**: 3000
- **Lokasi**: `my-app/` directory
- **Teknologi**: React + TypeScript + Vite + Tailwind CSS
- **Fungsi**: Modern web interface dengan komponen UI yang lebih baik

#### B. Legacy Web Interface
- **Port**: 5000 (served by backend)
- **Lokasi**: `public/` directory
- **Teknologi**: HTML + Vanilla JavaScript
- **Fungsi**: Interface sederhana yang di-serve langsung oleh Express

## Cara Menjalankan Aplikasi

### Opsi 1: Menjalankan Backend + React Frontend (Recommended)

1. **Start Backend Server**:
   ```bash
   # Di root directory
   npm start
   # atau
   node server.js
   ```
   Backend akan berjalan di: http://localhost:5000

2. **Start React Frontend** (Terminal baru):
   ```bash
   # Masuk ke directory React app
   cd my-app
   
   # Install dependencies (jika belum)
   npm install
   
   # Start development server
   npm run dev
   ```
   Frontend akan berjalan di: http://localhost:3000

3. **Akses Aplikasi**:
   - Buka browser ke: **http://localhost:3000**
   - React app akan otomatis proxy API calls ke backend di port 5000

### Opsi 2: Menjalankan Backend Only (Legacy Interface)

1. **Start Backend Server**:
   ```bash
   npm start
   ```

2. **Akses Aplikasi**:
   - Buka browser ke: **http://localhost:5000**
   - Menggunakan interface HTML sederhana di folder `public/`

## Konfigurasi Port

- **Backend**: Port 5000 (dapat diubah via environment variable `PORT`)
- **React Frontend**: Port 3000 (dikonfigurasi di `my-app/vite.config.ts`)
- **API Proxy**: React app secara otomatis mem-proxy semua `/api/*` requests ke backend

## Troubleshooting

### Error "Port already in use"
- Pastikan tidak ada aplikasi lain yang menggunakan port 3000 atau 5000
- Gunakan `netstat -ano | findstr :3000` untuk cek port usage
- Kill process yang menggunakan port tersebut

### API Connection Issues
- Pastikan backend berjalan di port 5000 sebelum start frontend
- Check console browser untuk error network
- Pastikan tidak ada firewall yang memblokir koneksi

## Development Workflow

1. Selalu jalankan backend terlebih dahulu
2. Kemudian jalankan React frontend di terminal terpisah
3. Gunakan http://localhost:3000 untuk development
4. API calls akan otomatis di-route ke backend di port 5000

## Production Deployment

Untuk production:
1. Build React app: `cd my-app && npm run build`
2. Copy build files ke `public/` directory
3. Jalankan hanya backend server
4. Akses via port backend saja