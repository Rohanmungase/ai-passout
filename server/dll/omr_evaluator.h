#ifndef OMR_EVALUATOR_H
#define OMR_EVALUATOR_H

#ifdef _WIN32
    #ifdef BUILDING_OMR_DLL
        #define OMR_API __declspec(dllexport)
    #else
        #define OMR_API __declspec(dllexport)
    #endif
#else
    #define OMR_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Evaluates an OMR Sheet image and exports detected responses in JSON format.
 * 
 * @param imagePath Path to input image file (JPEG, PNG, BMP)
 * @param resultJsonBuffer Output buffer to receive JSON formatted response
 * @param maxBufferLen Maximum byte capacity of resultJsonBuffer
 * @return 0 on Success, negative integer error code on failure.
 */
OMR_API int EvaluateOMRSheet(const char* imagePath, char* resultJsonBuffer, int maxBufferLen);

/**
 * Returns current version of native OMR Engine DLL.
 * 
 * @param versionBuffer Output buffer for version string
 * @param maxBufferLen Maximum byte capacity of versionBuffer
 * @return 0 on Success
 */
OMR_API int GetDllVersion(char* versionBuffer, int maxBufferLen);

#ifdef __cplusplus
}
#endif

#endif // OMR_EVALUATOR_H
