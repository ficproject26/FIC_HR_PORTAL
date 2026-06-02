@echo off
echo ============================================
echo   HR CRM - Setup Script
echo ============================================
echo.

echo [1/3] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
echo Backend dependencies installed.
echo.

echo [2/3] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
echo Frontend dependencies installed.
echo.

echo [3/3] Setup complete!
echo.
echo ============================================
echo   NEXT STEPS:
echo ============================================
echo.
echo 1. Make sure PostgreSQL is running
echo 2. Create database: CREATE DATABASE hr_crm_db;
echo 3. Run schema: psql -d hr_crm_db -f backend/config/schema.sql
echo 4. Seed data: cd backend ^&^& npm run seed
echo 5. Start backend: double-click start-backend.bat
echo 6. Start frontend: double-click start-frontend.bat
echo.
echo Default login: admin@hrcrm.com / password
echo.
pause
