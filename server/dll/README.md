# DLL Native Library Setup Guide

Place your Windows DLL file (`.dll`) in this folder (`server/dll/`).

### Recommended File Name:
- `MyProject.dll` or `omr_evaluator.dll`

---

### Example C/C++ DLL Function Export Syntax

If you build your C/C++ DLL with Visual Studio or GCC/MinGW, export functions like this:

```cpp
// omr_evaluator.cpp
#include <iostream>

extern "C" {
    // Exported function to evaluate OMR Sheet Image
    __declspec(dllexport) int EvaluateOMRSheet(const char* imagePath, char* resultJsonBuffer, int maxBufferLen) {
        // 1. Process image file at imagePath
        // 2. Write JSON response into resultJsonBuffer
        // Example: strcpy_s(resultJsonBuffer, maxBufferLen, "{\"1\":\"A\",\"2\":\"B\",\"3\":\"C\",\"4\":\"D\",\"5\":\"A\",\"6\":\"C\",\"7\":\"B\",\"8\":\"D\",\"9\":\"A\",\"10\":\"C\"}");
        return 0; // Return 0 on success
    }
}
```

---

### How Node.js Backend Calls the DLL (via `koffi` FFI)

In `server/index.js`, the Node.js server dynamically loads the `.dll`:

```javascript
import koffi from 'koffi';

// Load native DLL library
const lib = koffi.load('./dll/MyProject.dll');

// Bind exported C function signature
const EvaluateOMRSheet = lib.func('int EvaluateOMRSheet(const char *imagePath, _Out_ char *outJsonBuffer, int maxLen)');

// Execute native C++ function
const outBuffer = Buffer.alloc(1024);
const status = EvaluateOMRSheet('uploads/sheet.jpg', outBuffer, 1024);
const resultJson = koffi.decode(outBuffer, 'String');
console.log('Result from DLL:', resultJson);
```

---

*Note: If no `.dll` file is found in this directory, the backend server automatically runs in simulation/fallback mode so your app continues working seamlessly!*
