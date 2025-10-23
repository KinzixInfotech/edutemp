"use client"

import React, {
  useCallback,
  useRef,
  useState
} from "react"

export const useFileUpload = (options = {}) => {
  const {
    maxFiles = Infinity,
    maxSize = Infinity,
    accept = "*",
    multiple = false,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
  } = options

  const [state, setState] = useState({
    files: initialFiles.map((file) => ({
      file,
      id: file.id,
      preview: file.url,
    })),
    isDragging: false,
    errors: [],
  })

  const inputRef = useRef(null)

  const validateFile = useCallback(
    (file) => {
      if (file.size > maxSize) {
        return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`
      }

      if (accept !== "*") {
        const acceptedTypes = accept.split(",").map((type) => type.trim())
        const fileType = file.type || ""
        const fileExtension = `.${file.name.split(".").pop()}`

        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return fileExtension.toLowerCase() === type.toLowerCase()
          }
          if (type.endsWith("/*")) {
            const baseType = type.split("/")[0]
            return fileType.startsWith(`${baseType}/`)
          }
          return fileType === type
        })

        if (!isAccepted) {
          return `File "${file.name}" is not an accepted file type.`
        }
      }

      return null
    },
    [accept, maxSize]
  )

  const createPreview = useCallback((file) => {
    if (file instanceof File) {
      return URL.createObjectURL(file)
    }
    return file.url
  }, [])

  const generateUniqueId = useCallback((file) => {
    return `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }, [])

  const clearFiles = useCallback(() => {
    setState((prev) => {
      prev.files.forEach((file) => {
        if (
          file.preview &&
          file.file instanceof File &&
          file.file.type.startsWith("image/")
        ) {
          URL.revokeObjectURL(file.preview)
        }
      })

      if (inputRef.current) {
        inputRef.current.value = ""
      }

      const newState = {
        ...prev,
        files: [],
        errors: [],
      }

      onFilesChange?.(newState.files)
      return newState
    })
  }, [onFilesChange])

  const addFiles = useCallback(
    (newFiles) => {
      if (!newFiles || newFiles.length === 0) return

      const newFilesArray = Array.from(newFiles)
      const errors = []

      setState((prev) => ({ ...prev, errors: [] }))

      if (!multiple) {
        clearFiles()
      }

      if (multiple && maxFiles !== Infinity && state.files.length + newFilesArray.length > maxFiles) {
        errors.push(`You can only upload a maximum of ${maxFiles} files.`)
        setState((prev) => ({ ...prev, errors }))
        return
      }

      const validFiles = []

      newFilesArray.forEach((file) => {
        if (multiple) {
          const isDuplicate = state.files.some(
            (existingFile) =>
              existingFile.file.name === file.name &&
              existingFile.file.size === file.size
          )
          if (isDuplicate) return
        }

        if (file.size > maxSize) {
          errors.push(`File exceeds the maximum size of ${formatBytes(maxSize)}.`)
          return
        }

        const error = validateFile(file)
        if (error) {
          errors.push(error)
        } else {
          validFiles.push({
            file,
            id: generateUniqueId(file),
            preview: createPreview(file),
          })
        }
      })

      if (validFiles.length > 0) {
        onFilesAdded?.(validFiles)

        setState((prev) => {
          const newFiles = !multiple ? validFiles : [...prev.files, ...validFiles]
          onFilesChange?.(newFiles)
          return {
            ...prev,
            files: newFiles,
            errors,
          }
        })
      } else if (errors.length > 0) {
        setState((prev) => ({
          ...prev,
          errors,
        }))
      }

      if (inputRef.current) {
        inputRef.current.value = ""
      }
    },
    [state.files, maxFiles, multiple, maxSize, validateFile, createPreview, generateUniqueId, clearFiles, onFilesChange, onFilesAdded]
  )

  const removeFile = useCallback((id) => {
    setState((prev) => {
      const fileToRemove = prev.files.find((file) => file.id === id)
      if (fileToRemove && fileToRemove.preview && fileToRemove.file instanceof File && fileToRemove.file.type.startsWith("image/")) {
        URL.revokeObjectURL(fileToRemove.preview)
      }

      const newFiles = prev.files.filter((file) => file.id !== id)
      onFilesChange?.(newFiles)

      return {
        ...prev,
        files: newFiles,
        errors: [],
      }
    })
  }, [onFilesChange])

  const clearErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errors: [],
    }))
  }, [])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setState((prev) => ({ ...prev, isDragging: true }))
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.currentTarget.contains(e.relatedTarget)) return

    setState((prev) => ({ ...prev, isDragging: false }))
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setState((prev) => ({ ...prev, isDragging: false }))

    if (inputRef.current?.disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (!multiple) {
        const file = e.dataTransfer.files[0]
        addFiles([file])
      } else {
        addFiles(e.dataTransfer.files)
      }
    }
  }, [addFiles, multiple])

  const handleFileChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
  }, [addFiles])

  const openFileDialog = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }, [])

  const getInputProps = useCallback((props = {}) => {
    return {
      ...props,
      type: "file",
      onChange: handleFileChange,
      accept: props.accept || accept,
      multiple: props.multiple !== undefined ? props.multiple : multiple,
      ref: inputRef,
    }
  }, [accept, multiple, handleFileChange])

  return [
    state,
    {
      addFiles,
      removeFile,
      clearFiles,
      clearErrors,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileChange,
      openFileDialog,
      getInputProps,
    },
  ]
}

export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i]
}
