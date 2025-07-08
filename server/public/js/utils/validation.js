/**
 * Validation utility for user input fields
 * Provides consistent validation and UI feedback across the application
 */

/**
 * Validates text input against dangerous characters and provides visual feedback
 * @param {HTMLInputElement} inputElement - The input element to validate
 * @param {HTMLButtonElement|HTMLButtonElement[]} buttonElements - Button(s) to enable/disable
 * @param {Object} options - Validation options
 * @param {boolean} options.allowEmpty - Whether empty input is considered valid (default: false)
 * @param {string} options.invalidMessage - Custom message for invalid input
 * @returns {boolean} - True if input is valid, false otherwise
 */
export function validateTextInput(inputElement, buttonElements, options = {}) {
  const {
    allowEmpty = false,
    invalidMessage = 'Input contains invalid characters: < > &'
  } = options;

  const text = inputElement.value.trim();
  const hasInvalidChars = /[<>&]/.test(text);
  const isEmpty = !text;
  
  // Determine if input is valid
  const isValid = allowEmpty ? !hasInvalidChars : !isEmpty && !hasInvalidChars;
  
  // Handle button enabling/disabling
  const buttons = Array.isArray(buttonElements) ? buttonElements : [buttonElements];
  buttons.forEach(button => {
    if (button) {
      button.disabled = !isValid;
    }
  });
  
  // Provide visual feedback
  if (hasInvalidChars && text) {
    inputElement.style.borderColor = 'red';
    inputElement.title = invalidMessage;
  } else {
    inputElement.style.borderColor = '';
    inputElement.title = '';
  }
  
  return isValid;
}

export function setupInputValidation(inputElement, buttonElements, options = {}) {
  const validateFn = () => validateTextInput(inputElement, buttonElements, options);
  
  // Set up event listeners for real-time validation
  inputElement.addEventListener('input', validateFn);
  inputElement.addEventListener('keyup', validateFn);
  inputElement.addEventListener('blur', validateFn);
  
  // Perform initial validation
  validateFn();
  
  return validateFn;
}

export function hasDangerousCharacters(text) {
  return /[<>&]/.test(text);
}

/**
 * Validates text and shows alert if invalid
 * @param {string} text - Text to validate
 * @param {string} fieldName - Name of the field for error message (default: "Input")
 * @returns {boolean} - True if valid, false if invalid (and alert shown)
 */
export function validateAndAlert(host, text, fieldName = "Input") {
  if (!text.trim()) {
    createToastHelper(host, `${fieldName} cannot be empty.`, "error", 3000);
    return false;
  }
  
  if (hasDangerousCharacters(text)) {
    createToastHelper(host, `${fieldName} contains invalid characters. Please avoid <, >, & characters.`, "error", 3000);
    return false;
  }
  
  return true;
}
