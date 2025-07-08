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


export function validateAndAlert(text, fieldName = "Input") {
  if (!text.trim()) {
    alert(`${fieldName} cannot be empty.`);
    return false;
  }
  
  if (hasDangerousCharacters(text)) {
    alert(`${fieldName} contains invalid characters. Please avoid <, >, & characters.`);
    return false;
  }
  
  return true;
}
