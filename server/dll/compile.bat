@echo off
echo ====================================================
echo Building 64-bit Native OMR Evaluator DLL...
echo ====================================================

g++ -shared -static -static-libgcc -static-libstdc++ -o omr_evaluator.dll omr_evaluator.cpp -O3 -Wall

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: omr_evaluator.dll created successfully!
) else (
    echo.
    echo ERROR: Compilation failed.
)
