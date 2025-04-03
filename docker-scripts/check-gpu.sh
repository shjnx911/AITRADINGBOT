#!/bin/bash
set -e

echo "Checking AMD ROCm GPU availability..."

# Check if rocminfo is available
if ! command -v rocminfo &> /dev/null; then
    echo "Error: ROCm is not installed properly. rocminfo command not found."
    exit 1
fi

# Run rocminfo to check GPU availability
ROCM_OUTPUT=$(rocminfo 2>&1)
if echo "$ROCM_OUTPUT" | grep -q "GPU Agent"; then
    echo "ROCm GPU detected:"
    echo "$ROCM_OUTPUT" | grep -A 5 "GPU Agent"
    echo "GPU is available for TensorFlow operations."
else
    echo "Warning: No AMD GPU agents found. Running in CPU-only mode."
    echo "For optimal performance, ensure that ROCm-compatible AMD GPU is available."
fi

# Check if clinfo is available
if command -v clinfo &> /dev/null; then
    echo -e "\nChecking OpenCL devices:"
    CLINFO_OUTPUT=$(clinfo | grep -E "Platform Name|Device Name" 2>&1)
    echo "$CLINFO_OUTPUT"
else
    echo "clinfo not available - skipping OpenCL device check"
fi

# Check TensorFlow GPU detection
if command -v python3 &> /dev/null; then
    echo -e "\nChecking TensorFlow GPU detection:"
    python3 -c "
import tensorflow as tf
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    print(f'TensorFlow detected {len(gpus)} GPU(s):')
    for gpu in gpus:
        print(f' - {gpu}')
    tf.config.experimental.set_memory_growth(gpus[0], True)
    print('GPU memory growth enabled')
else:
    print('No GPUs detected by TensorFlow. Running in CPU mode.')
"
else
    echo "Python not available - skipping TensorFlow GPU check"
fi

echo -e "\nGPU environment check completed."